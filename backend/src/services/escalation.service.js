import Escalation from '../models/escalation.model.js';
import Incident from '../models/incident.model.js';
import { ESCALATION_RULES, ESCALATION_LEVELS } from '../config/escalation.config.js';
import NotificationService from './notification.service.js';
import { emitEscalationCreated, emitEscalationAcknowledged, emitEscalationResolved } from '../utils/socket.js';
import { recordAuditLog } from './auditLog.service.js';
import { ForbiddenError, NotFoundError } from '../utils/errors.js';

export class EscalationService {
  /**
   * Evaluate an incident against all configured escalation rules.
   * Ensures strict duplicate prevention.
   */
  static async evaluateIncident(incidentDoc, context = {}) {
    if (!incidentDoc) return [];

    const incidentId = incidentDoc.incidentId || incidentDoc._id?.toString();
    const createdEscalations = [];

    for (const rule of ESCALATION_RULES) {
      try {
        const matches = rule.evaluate(incidentDoc, context);
        if (!matches) continue;

        // Check if an active escalation already exists for this rule or level on this incident
        const existingActive = await Escalation.findOne({
          incidentId,
          $or: [
            { ruleId: rule.ruleId, status: { $in: ['PENDING', 'ACKNOWLEDGED'] } },
            { level: rule.level, status: { $in: ['PENDING', 'ACKNOWLEDGED'] } },
          ],
        });

        if (existingActive) {
          // Already escalated at this level/rule and still pending or acknowledged
          continue;
        }

        // Trigger escalation
        const escalation = await this.triggerEscalation({
          incidentId,
          incidentMongoId: incidentDoc._id,
          level: rule.level,
          ruleId: rule.ruleId,
          reason: rule.reason,
          targetRole: rule.targetRole,
          triggerSource: 'AUTOMATED_ENGINE',
          metadata: {
            incidentPriority: incidentDoc.priority,
            incidentSeverity: incidentDoc.severity,
            incidentStatus: incidentDoc.status,
            ...context,
          },
        });

        createdEscalations.push(escalation);
      } catch (err) {
        console.error(`[EscalationService] Error evaluating rule ${rule.ruleId} for incident ${incidentId}:`, err);
      }
    }

    return createdEscalations;
  }

  /**
   * Background scan: evaluate all active incidents
   */
  static async evaluateAllActiveIncidents() {
    try {
      const activeIncidents = await Incident.find({
        status: { $nin: ['RESOLVED', 'CANCELLED'] },
      }).lean();

      let totalTriggered = 0;
      for (const incident of activeIncidents) {
        const escalations = await this.evaluateIncident(incident);
        totalTriggered += escalations.length;
      }

      return totalTriggered;
    } catch (err) {
      console.error('[EscalationService] Batch evaluation failed:', err);
      return 0;
    }
  }

  /**
   * Trigger an escalation and broadcast to role/console
   */
  static async triggerEscalation({
    incidentId,
    incidentMongoId = null,
    level,
    ruleId,
    reason,
    targetRole,
    triggerSource = 'AUTOMATED_ENGINE',
    metadata = {},
  }) {
    const escalationId = `ESC-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const escalation = await Escalation.create({
      escalationId,
      incidentId,
      incident: incidentMongoId,
      level,
      ruleId,
      reason,
      status: 'PENDING',
      targetRole,
      triggerSource,
      metadata,
    });

    // 1. Dispatch role notification
    try {
      await NotificationService.notifyRole(targetRole, {
        type: 'ESCALATION',
        title: `LEVEL ${level} ESCALATION: ${incidentId}`,
        message: reason,
        severity: level === 3 ? 'CRITICAL' : 'HIGH',
        entityType: 'ESCALATION',
        entityId: escalationId,
        metadata: {
          incidentId,
          level,
          ruleId,
        },
      });
    } catch (notifErr) {
      console.warn('[EscalationService] Notification dispatch failed:', notifErr.message);
    }

    // 2. Append incident timeline event
    try {
      await Incident.updateOne(
        { $or: [{ incidentId }, { _id: incidentMongoId }] },
        {
          $push: {
            timeline: {
              event: 'ESCALATED',
              description: `Level ${level} escalation triggered: ${reason}`,
              actor: 'SYSTEM',
              timestamp: new Date(),
            },
          },
        }
      );
    } catch (timelineErr) {
      console.warn('[EscalationService] Incident timeline update failed:', timelineErr.message);
    }

    // 3. Emit real-time WebSocket event
    emitEscalationCreated(escalation.toObject ? escalation.toObject() : escalation);

    // 4. Record Audit Log
    try {
      await recordAuditLog({
        user: { id: 'SYSTEM', name: 'Escalation Engine', role: 'SYSTEM' },
        action: 'ESCALATION_CREATED',
        entityType: 'ESCALATION',
        entityId: escalationId,
        metadata: { incidentId, level, ruleId, reason, targetRole },
      });
    } catch (auditErr) {
      console.warn('[EscalationService] Audit log recording failed:', auditErr.message);
    }

    return escalation;
  }

  /**
   * Verify whether user's role is authorized to acknowledge/resolve given escalation level
   */
  static assertRoleAuthorization(userRole, escalationLevel) {
    if (userRole === 'ADMIN') return true;

    if (escalationLevel === 1) {
      if (['OPERATOR', 'FIELD_COORDINATOR', 'MEDICAL_COORDINATOR'].includes(userRole)) {
        return true;
      }
    }

    if (escalationLevel === 2) {
      if (['FIELD_COORDINATOR', 'MEDICAL_COORDINATOR'].includes(userRole)) {
        return true;
      }
    }

    throw new ForbiddenError(
      `Role ${userRole} is not authorized to act on Level ${escalationLevel} escalations.`
    );
  }

  /**
   * Acknowledge an escalation
   */
  static async acknowledgeEscalation(escalationId, user) {
    const escalation = await Escalation.findOne({
      $or: [{ escalationId }, { _id: escalationId.match(/^[0-9a-fA-F]{24}$/) ? escalationId : null }],
    });

    if (!escalation) {
      throw new NotFoundError('Escalation record not found');
    }

    if (escalation.status === 'RESOLVED') {
      const err = new Error('Escalation is already resolved');
      err.statusCode = 400;
      throw err;
    }

    // RBAC Authorization check
    this.assertRoleAuthorization(user.role, escalation.level);

    escalation.status = 'ACKNOWLEDGED';
    escalation.acknowledgedAt = new Date();
    escalation.acknowledgedBy = {
      userId: user._id?.toString() || user.userId || user.id,
      name: user.name,
      role: user.role,
    };

    await escalation.save();

    // Socket.IO broadcast
    emitEscalationAcknowledged(escalation.toObject ? escalation.toObject() : escalation);

    // Audit Log
    await recordAuditLog({
      user,
      action: 'ESCALATION_ACKNOWLEDGED',
      entityType: 'ESCALATION',
      entityId: escalation.escalationId,
      metadata: { incidentId: escalation.incidentId, level: escalation.level },
    });

    return escalation;
  }

  /**
   * Resolve an escalation
   */
  static async resolveEscalation(escalationId, user, resolutionNotes = '') {
    const escalation = await Escalation.findOne({
      $or: [{ escalationId }, { _id: escalationId.match(/^[0-9a-fA-F]{24}$/) ? escalationId : null }],
    });

    if (!escalation) {
      throw new NotFoundError('Escalation record not found');
    }

    // RBAC Authorization check
    this.assertRoleAuthorization(user.role, escalation.level);

    escalation.status = 'RESOLVED';
    escalation.resolvedAt = new Date();
    escalation.resolvedBy = {
      userId: user._id?.toString() || user.userId || user.id,
      name: user.name,
      role: user.role,
    };
    if (resolutionNotes) {
      escalation.metadata = {
        ...escalation.metadata,
        resolutionNotes,
      };
    }

    await escalation.save();

    // Socket.IO broadcast
    emitEscalationResolved(escalation.toObject ? escalation.toObject() : escalation);

    // Audit Log
    await recordAuditLog({
      user,
      action: 'ESCALATION_RESOLVED',
      entityType: 'ESCALATION',
      entityId: escalation.escalationId,
      metadata: { incidentId: escalation.incidentId, level: escalation.level, resolutionNotes },
    });

    return escalation;
  }

  /**
   * Get active (PENDING or ACKNOWLEDGED) escalations
   */
  static async getActiveEscalations(filters = {}) {
    const query = {
      status: { $in: ['PENDING', 'ACKNOWLEDGED'] },
      ...filters,
    };

    return await Escalation.find(query)
      .sort({ level: -1, triggeredAt: -1 })
      .populate('incident')
      .lean();
  }

  /**
   * Get all escalations for a specific incident
   */
  static async getIncidentEscalations(incidentId) {
    return await Escalation.find({ incidentId })
      .sort({ triggeredAt: -1 })
      .lean();
  }

  /**
   * Query all escalations with pagination
   */
  static async getAllEscalations(query = {}, { page = 1, limit = 50 } = {}) {
    const skip = (Math.max(1, page) - 1) * limit;

    const [escalations, total] = await Promise.all([
      Escalation.find(query)
        .sort({ triggeredAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      Escalation.countDocuments(query),
    ]);

    return {
      escalations,
      total,
      page: Number(page),
      limit: Number(limit),
    };
  }
}

export default EscalationService;
