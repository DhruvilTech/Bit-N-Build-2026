import { AssignmentModel } from '../models/assignment.model.js';
import { emitResponseDelayed } from '../utils/socket.js';
import { evaluateResponseDelayAlert } from './alert.service.js';
import { recordAuditLog } from './auditLog.service.js';
import NotificationService from './notification.service.js';

/**
 * Check if a single assignment is delayed past its SLA and trigger delay notifications
 */
export const checkAssignmentDelay = async (assignment, now = new Date()) => {
  // If assignment is in terminal or arrived state, it is never marked delayed
  if (['ARRIVED', 'COMPLETED', 'CANCELLED'].includes(assignment.status)) {
    return { isDelayed: false, newlyDelayed: false };
  }

  if (!assignment.expectedArrivalAt) {
    return { isDelayed: false, newlyDelayed: false };
  }

  const expectedTime = new Date(assignment.expectedArrivalAt).getTime();
  const currentTime = now.getTime();

  // Condition: currentTime > expectedArrivalAt
  if (currentTime > expectedTime) {
    const delayMinutes = Math.max(1, Math.round((currentTime - expectedTime) / (60 * 1000)));

    const isNewlyDelayed = !assignment.isDelayed;

    assignment.isDelayed = true;
    assignment.delayMinutes = delayMinutes;

    if (isNewlyDelayed) {
      assignment.delayDetectedAt = now;
      await assignment.save();

      // Emit real-time response:delayed event (single logical event)
      emitResponseDelayed({
        assignmentId: assignment.assignmentId,
        incidentId: assignment.incidentId,
        teamId: assignment.teamId,
        delayMinutes,
        detectedAt: now.toISOString(),
      });

      // Trigger Alert Engine
      await evaluateResponseDelayAlert(assignment, delayMinutes);

      // Operational Event Notification
      NotificationService.dispatchEventNotification('RESPONSE_DELAY', {
        title: `RESPONSE DELAY: ${assignment.teamId || assignment.resourceId || 'Unit'}`,
        message: `Transit delay detected for Incident #${assignment.incidentId}. Exceeded expected ETA by +${delayMinutes} min.`,
        entityType: 'RESOURCE',
        entityId: assignment.resourceId || assignment.teamId,
        incidentId: assignment.incidentId,
        assignmentId: assignment.assignmentId,
        metadata: {
          incidentId: assignment.incidentId,
          assignmentId: assignment.assignmentId,
          delayMinutes,
        },
        cooldownSeconds: 120,
      }).catch((e) => console.warn('[Notification] Response delay dispatch note:', e.message));

      // Audit Log
      await recordAuditLog({
        action: 'RESPONSE_DELAY_DETECTED',
        entityType: 'ASSIGNMENT',
        entityId: assignment.assignmentId,
        metadata: {
          incidentId: assignment.incidentId,
          teamId: assignment.teamId,
          delayMinutes,
          expectedArrivalAt: assignment.expectedArrivalAt,
        },
      });

      return { isDelayed: true, newlyDelayed: true, delayMinutes };
    } else {
      // Already marked delayed: update delayMinutes in DB without generating duplicate alerts/events
      await assignment.save();
      return { isDelayed: true, newlyDelayed: false, delayMinutes };
    }
  }

  return { isDelayed: false, newlyDelayed: false };
};

/**
 * Scan all active assignments across the system for SLA delays
 */
export const scanActiveAssignmentsForDelays = async (now = new Date()) => {
  try {
    const activeAssignments = await AssignmentModel.find({
      status: { $in: ['ASSIGNED', 'DISPATCHED', 'EN_ROUTE'] },
      expectedArrivalAt: { $ne: null },
    });

    const results = [];
    for (const assignment of activeAssignments) {
      const delayResult = await checkAssignmentDelay(assignment, now);
      if (delayResult.isDelayed) {
        results.push({
          assignmentId: assignment.assignmentId,
          incidentId: assignment.incidentId,
          delayMinutes: delayResult.delayMinutes,
          newlyDelayed: delayResult.newlyDelayed,
        });
      }
    }

    return results;
  } catch (error) {
    console.error('[Delay Engine] Error scanning active assignments for delays:', error.message);
    return [];
  }
};
