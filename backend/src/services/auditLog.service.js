import { AuditLogModel } from '../models/auditLog.model.js';

export const recordAuditLog = async ({
  user,
  action,
  entityType,
  entityId,
  metadata = {},
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
      entityId: String(entityId),
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

export const getAuditLogs = async (filters = {}, pagination = {}) => {
  const query = {};

  if (filters.action) query.action = filters.action;
  if (filters.entityType) query.entityType = filters.entityType;
  if (filters.entityId) query.entityId = filters.entityId;
  if (filters.userId) query.userId = filters.userId;
  if (filters.userRole) query.userRole = filters.userRole;

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
