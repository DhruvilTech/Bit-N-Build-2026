import { AuditLogModel } from '../models/auditLog.model.js';

/**
 * Cleanly extracts diff between two objects for audit trail (only changed fields)
 */
export const extractDiff = (prevObj = {}, nextObj = {}) => {
  if (!prevObj || !nextObj) {
    return {
      previousValue: prevObj || null,
      newValue: nextObj || null,
    };
  }

  const prev = typeof prevObj.toObject === 'function' ? prevObj.toObject() : prevObj;
  const next = typeof nextObj.toObject === 'function' ? nextObj.toObject() : nextObj;

  const diffPrev = {};
  const diffNext = {};

  const keys = new Set([...Object.keys(prev), ...Object.keys(next)]);
  for (const k of keys) {
    if (['_id', '__v', 'updatedAt', 'createdAt'].includes(k)) continue;
    const valPrev = JSON.stringify(prev[k]);
    const valNext = JSON.stringify(next[k]);
    if (valPrev !== valNext) {
      diffPrev[k] = prev[k];
      diffNext[k] = next[k];
    }
  }

  return {
    previousValue: Object.keys(diffPrev).length > 0 ? diffPrev : null,
    newValue: Object.keys(diffNext).length > 0 ? diffNext : null,
  };
};

/**
 * Record an audit log entry in the cryptographic ledger
 */
export const recordAuditLog = async ({
  user,
  action,
  entityType = 'SYSTEM',
  entityId,
  previousValue = null,
  newValue = null,
  metadata = {},
  simulationId = null,
  ipAddress = null,
  userAgent = null,
  source = 'SYSTEM',
}) => {
  try {
    const userId = user ? (user.id || user._id?.toString()) : null;
    const userName = user ? (user.name || user.email || 'SYSTEM') : 'SYSTEM';
    const userRole = user ? (user.role || 'SYSTEM') : 'SYSTEM';

    const log = await AuditLogModel.create({
      userId,
      userName,
      userRole,
      action,
      entityType,
      entityId: String(entityId || 'N/A'),
      previousValue,
      newValue,
      simulationId,
      ipAddress,
      userAgent,
      source,
      metadata,
      timestamp: new Date(),
    });

    return log;
  } catch (error) {
    // Non-blocking: never fail a primary operation because of audit log write failure
    console.error('[AuditLog] Failed to record audit log:', error.message);
    return null;
  }
};

/**
 * Unified AuditService object
 */
export class AuditService {
  static async log(params) {
    return recordAuditLog(params);
  }

  static async logCreate({ user, entityType, entityId, data = null, metadata = {}, simulationId = null, req = null }) {
    return recordAuditLog({
      user,
      action: `${entityType}_CREATED`,
      entityType,
      entityId,
      previousValue: null,
      newValue: data,
      metadata,
      simulationId,
      ipAddress: req?.ip || req?.connection?.remoteAddress,
      userAgent: req?.headers?.['user-agent'],
      source: simulationId ? 'SIMULATION' : (user ? 'USER' : 'SYSTEM'),
    });
  }

  static async logUpdate({ user, entityType, entityId, previousValue = null, newValue = null, metadata = {}, simulationId = null, req = null }) {
    const diff = extractDiff(previousValue, newValue);
    return recordAuditLog({
      user,
      action: `${entityType}_UPDATED`,
      entityType,
      entityId,
      previousValue: diff.previousValue,
      newValue: diff.newValue,
      metadata,
      simulationId,
      ipAddress: req?.ip || req?.connection?.remoteAddress,
      userAgent: req?.headers?.['user-agent'],
      source: simulationId ? 'SIMULATION' : (user ? 'USER' : 'SYSTEM'),
    });
  }

  static async logDelete({ user, entityType, entityId, metadata = {}, req = null }) {
    return recordAuditLog({
      user,
      action: `${entityType}_DELETED`,
      entityType,
      entityId,
      metadata,
      ipAddress: req?.ip || req?.connection?.remoteAddress,
      userAgent: req?.headers?.['user-agent'],
      source: user ? 'USER' : 'SYSTEM',
    });
  }

  static async logAction({ user, action, entityType, entityId, previousValue = null, newValue = null, metadata = {}, simulationId = null, req = null }) {
    return recordAuditLog({
      user,
      action,
      entityType,
      entityId,
      previousValue,
      newValue,
      metadata,
      simulationId,
      ipAddress: req?.ip || req?.connection?.remoteAddress,
      userAgent: req?.headers?.['user-agent'],
      source: simulationId ? 'SIMULATION' : (user ? 'USER' : 'SYSTEM'),
    });
  }
}

export const getAuditLogs = async (filters = {}, pagination = {}) => {
  const query = {};

  if (filters.action) query.action = filters.action;
  if (filters.entityType) query.entityType = filters.entityType;
  if (filters.entityId) query.entityId = filters.entityId;
  if (filters.userId) query.userId = filters.userId;
  if (filters.userRole) query.userRole = filters.userRole;
  if (filters.simulationId) query.simulationId = filters.simulationId;

  if (filters.search) {
    query.$or = [
      { action: { $regex: filters.search, $options: 'i' } },
      { userName: { $regex: filters.search, $options: 'i' } },
      { entityId: { $regex: filters.search, $options: 'i' } },
    ];
  }

  const page = parseInt(pagination.page || '1', 10);
  const limit = parseInt(pagination.limit || '50', 10);
  const skip = (page - 1) * limit;

  const [logs, total] = await Promise.all([
    AuditLogModel.find(query).sort({ timestamp: -1 }).skip(skip).limit(limit),
    AuditLogModel.countDocuments(query),
  ]);

  return {
    logs,
    total,
    pagination: {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit) || 1,
    },
  };
};

export default {
  recordAuditLog,
  AuditService,
  getAuditLogs,
  extractDiff,
};
