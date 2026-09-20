import Notification from '../models/notification.model.js';
import { emitNotificationNew, emitNotificationRead } from '../utils/socket.js';
import { recordAuditLog } from './auditLog.service.js';

export class NotificationService {
  /**
   * Check if a duplicate notification exists within a cooldown window
   */
  static async shouldDeduplicate({
    type,
    entityId,
    targetRole = 'ALL',
    userId = null,
    cooldownSeconds = 120,
  }) {
    if (!cooldownSeconds || cooldownSeconds <= 0) return false;

    const windowStart = new Date(Date.now() - cooldownSeconds * 1000);
    const query = {
      type,
      createdAt: { $gte: windowStart },
    };

    if (entityId) {
      query.entityId = entityId;
    }

    if (userId) {
      query.$or = [{ userId }, { recipient: userId }];
    } else if (targetRole) {
      query.targetRole = targetRole;
    }

    const existing = await Notification.findOne(query).select('_id notificationId createdAt').lean();
    return !!existing;
  }

  /**
   * Create and persist a single notification with deduplication and real-time emission
   */
  static async createNotification({
    userId = null,
    recipient = null,
    targetRole = 'ALL',
    type,
    title,
    message,
    severity = 'MEDIUM',
    priority = 'MEDIUM',
    entityType = 'SYSTEM',
    entityId = null,
    incidentId = null,
    alertId = null,
    assignmentId = null,
    expiresAt = null,
    metadata = {},
    cooldownSeconds = 0,
  }) {
    const finalUserId = recipient || userId || null;

    // Deduplication check for spammy operational alerts (e.g. ETA delays, shortages)
    if (cooldownSeconds > 0) {
      const isDuplicate = await this.shouldDeduplicate({
        type,
        entityId: entityId || incidentId || alertId || assignmentId,
        targetRole,
        userId: finalUserId,
        cooldownSeconds,
      });

      if (isDuplicate) {
        return null;
      }
    }

    const notificationId = `NTF-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const notification = await Notification.create({
      notificationId,
      recipient: finalUserId,
      userId: finalUserId,
      targetRole: finalUserId ? null : targetRole,
      type,
      title,
      message,
      severity,
      priority,
      entityType,
      entityId: entityId ? String(entityId) : null,
      incidentId: incidentId ? String(incidentId) : null,
      alertId: alertId ? String(alertId) : null,
      assignmentId: assignmentId ? String(assignmentId) : null,
      expiresAt,
      metadata,
    });

    const notifObj = notification.toObject ? notification.toObject() : notification;

    // Real-time broadcast to secure Socket.IO rooms
    try {
      emitNotificationNew(notifObj);
    } catch (socketErr) {
      console.warn('[NotificationService] Socket emission deferred:', socketErr.message);
    }

    return notification;
  }

  /**
   * Create multiple notifications in bulk
   */
  static async createBulkNotifications(notifications = []) {
    const created = [];
    for (const item of notifications) {
      try {
        const notif = await this.createNotification(item);
        if (notif) created.push(notif);
      } catch (err) {
        console.warn('[NotificationService] Bulk notification item failed:', err.message);
      }
    }
    return created;
  }

  /**
   * Resolve operational recipients based on event type and RBAC rules
   */
  static resolveRecipients(eventType, context = {}) {
    switch (eventType) {
      case 'INCIDENT_CRITICAL':
      case 'ALERT_ESCALATED':
        return [
          { targetRole: 'ADMIN', priority: 'CRITICAL', severity: 'CRITICAL' },
          { targetRole: 'OPERATOR', priority: 'HIGH', severity: 'CRITICAL' },
        ];

      case 'INCIDENT_CREATED':
      case 'INCIDENT_UPDATED':
      case 'INCIDENT_ASSIGNED':
      case 'INCIDENT_DISPATCHED':
      case 'INCIDENT_RESOLVED':
        return [{ targetRole: 'OPERATOR', priority: 'MEDIUM', severity: 'MEDIUM' }];

      case 'RESOURCE_ASSIGNED':
      case 'RESOURCE_DISPATCHED':
      case 'RESOURCE_ARRIVED':
        return [
          { targetRole: 'OPERATOR', priority: 'MEDIUM', severity: 'MEDIUM' },
          ...(context.userId ? [{ userId: context.userId, priority: 'HIGH', severity: 'HIGH' }] : []),
          ...(context.targetRole ? [{ targetRole: context.targetRole, priority: 'MEDIUM', severity: 'MEDIUM' }] : []),
        ];

      case 'RESPONSE_DELAY':
      case 'ETA_EXCEEDED':
      case 'RESOURCE_DELAYED':
        return [
          { targetRole: 'OPERATOR', priority: 'HIGH', severity: 'HIGH', cooldownSeconds: 120 },
          { targetRole: 'FIELD_COORDINATOR', priority: 'HIGH', severity: 'HIGH', cooldownSeconds: 120 },
        ];

      case 'RESOURCE_SHORTAGE':
        return [
          { targetRole: 'OPERATOR', priority: 'HIGH', severity: 'HIGH', cooldownSeconds: 180 },
          { targetRole: 'ADMIN', priority: 'HIGH', severity: 'HIGH', cooldownSeconds: 180 },
        ];

      case 'HOSPITAL_CAPACITY_WARNING':
        return [
          { targetRole: 'MEDICAL_COORDINATOR', priority: 'HIGH', severity: 'HIGH', cooldownSeconds: 180 },
          { targetRole: 'OPERATOR', priority: 'MEDIUM', severity: 'HIGH', cooldownSeconds: 180 },
        ];

      case 'AI_ANALYSIS_COMPLETED':
      case 'AI_ANALYSIS_FAILED':
        return [{ targetRole: 'OPERATOR', priority: 'LOW', severity: 'MEDIUM' }];

      case 'ALERT_CREATED':
      case 'ALERT_ACKNOWLEDGED':
        return [{ targetRole: 'OPERATOR', priority: 'MEDIUM', severity: 'MEDIUM' }];

      default:
        return [{ targetRole: 'ALL', priority: 'MEDIUM', severity: 'MEDIUM' }];
    }
  }

  /**
   * Dispatch an operational event notification across resolved recipients safely
   */
  static async dispatchEventNotification(eventType, {
    title,
    message,
    entityType = 'SYSTEM',
    entityId = null,
    incidentId = null,
    alertId = null,
    assignmentId = null,
    metadata = {},
    cooldownSeconds = 0,
    context = {},
  } = {}) {
    try {
      const targets = this.resolveRecipients(eventType, context);
      const created = [];

      for (const target of targets) {
        const notif = await this.createNotification({
          userId: target.userId || null,
          targetRole: target.targetRole || 'ALL',
          type: eventType,
          title,
          message,
          severity: target.severity || 'MEDIUM',
          priority: target.priority || 'MEDIUM',
          entityType,
          entityId: entityId || incidentId || alertId || assignmentId,
          incidentId,
          alertId,
          assignmentId,
          metadata,
          cooldownSeconds: target.cooldownSeconds || cooldownSeconds || 0,
        });
        if (notif) created.push(notif);
      }

      return created;
    } catch (err) {
      console.warn(`[NotificationService] Failed to dispatch event ${eventType}:`, err.message);
      return [];
    }
  }

  /**
   * Send notification to a specific user
   */
  static async notifyUser(userId, payload) {
    return this.createNotification({
      ...payload,
      userId,
      recipient: userId,
      targetRole: null,
    });
  }

  /**
   * Broadcast notification to all users holding a specific operational role
   */
  static async notifyRole(targetRole, payload) {
    return this.createNotification({
      ...payload,
      userId: null,
      recipient: null,
      targetRole,
    });
  }

  /**
   * Fetch paginated notifications for an authenticated user based on userId and role
   */
  static async getUserNotifications(userId, userRole, { isRead, type, severity, limit = 20, page = 1 } = {}) {
    const safeLimit = Math.min(100, Math.max(1, Number(limit) || 20));
    const safePage = Math.max(1, Number(page) || 1);
    const skip = (safePage - 1) * safeLimit;

    const baseRecipientQuery = {
      $or: [
        { userId },
        { recipient: userId },
        { targetRole: userRole },
        { targetRole: 'ALL' },
      ],
    };

    const query = { ...baseRecipientQuery };

    if (typeof isRead === 'boolean') {
      if (isRead) {
        query.$or = [
          { userId, isRead: true },
          { recipient: userId, isRead: true },
          { targetRole: userRole, 'readBy.userId': userId },
          { targetRole: 'ALL', 'readBy.userId': userId },
        ];
      } else {
        query.isRead = false;
        query['readBy.userId'] = { $ne: userId };
      }
    }

    if (type) {
      query.type = type;
    }

    if (severity) {
      query.severity = severity;
    }

    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(safeLimit)
        .lean(),
      Notification.countDocuments(query),
      this.getUnreadCount(userId, userRole),
    ]);

    // Format read status per user for role-targeted notifications
    const formatted = notifications.map((n) => {
      const isDirectRead = (n.userId && String(n.userId) === String(userId)) ||
                           (n.recipient && String(n.recipient) === String(userId));
      const isRoleRead = Array.isArray(n.readBy) && n.readBy.some((r) => String(r.userId) === String(userId));
      return {
        ...n,
        isRead: Boolean((isDirectRead && n.isRead) || isRoleRead),
      };
    });

    return {
      notifications: formatted,
      pagination: {
        page: safePage,
        limit: safeLimit,
        total,
        pages: Math.ceil(total / safeLimit) || 1,
      },
      unreadCount,
    };
  }

  /**
   * Compute unread notification count for an authenticated user
   */
  static async getUnreadCount(userId, userRole) {
    const count = await Notification.countDocuments({
      $or: [
        { userId, isRead: false },
        { recipient: userId, isRead: false },
        {
          targetRole: { $in: [userRole, 'ALL'] },
          'readBy.userId': { $ne: userId },
        },
      ],
    });
    return count;
  }

  /**
   * Mark a single notification as read by authenticated user
   */
  static async markAsRead(notificationId, user) {
    const userId = user._id?.toString() || user.userId || user.id;
    const userRole = user.role;

    const notification = await Notification.findOne({
      $or: [
        { notificationId },
        { _id: notificationId.match(/^[0-9a-fA-F]{24}$/) ? notificationId : null },
      ],
    });

    if (!notification) {
      const error = new Error('Notification not found');
      error.statusCode = 404;
      throw error;
    }

    // Direct user notification: verify ownership
    const isDirectUser =
      (notification.userId && String(notification.userId) === String(userId)) ||
      (notification.recipient && String(notification.recipient) === String(userId));

    if (isDirectUser) {
      notification.isRead = true;
      notification.readAt = new Date();
      await notification.save();
    } else if (
      notification.targetRole === 'ALL' ||
      notification.targetRole === userRole ||
      userRole === 'ADMIN'
    ) {
      // Role broadcast: add to readBy array if not already present
      const alreadyRead = notification.readBy.some((r) => String(r.userId) === String(userId));
      if (!alreadyRead) {
        notification.readBy.push({ userId, readAt: new Date() });
        await notification.save();
      }
    } else {
      const error = new Error('Unauthorized to access this notification');
      error.statusCode = 403;
      throw error;
    }

    const unreadCount = await this.getUnreadCount(userId, userRole);

    try {
      emitNotificationRead({
        notificationId: notification.notificationId,
        userId,
        unreadCount,
      });
    } catch (socketErr) {
      console.warn('[NotificationService] Socket emission deferred:', socketErr.message);
    }

    return {
      success: true,
      notificationId: notification.notificationId,
      unreadCount,
    };
  }

  /**
   * Mark all unread notifications as read for authenticated user
   */
  static async markAllAsRead(user) {
    const userId = user._id?.toString() || user.userId || user.id;
    const userRole = user.role;
    const now = new Date();

    // 1. Mark direct notifications
    await Notification.updateMany(
      {
        $or: [{ userId }, { recipient: userId }],
        isRead: false,
      },
      { $set: { isRead: true, readAt: now } }
    );

    // 2. Mark role broadcasts by adding userId to readBy
    await Notification.updateMany(
      {
        targetRole: { $in: [userRole, 'ALL'] },
        'readBy.userId': { $ne: userId },
      },
      {
        $push: { readBy: { userId, readAt: now } },
      }
    );

    try {
      emitNotificationRead({
        all: true,
        userId,
        unreadCount: 0,
      });
    } catch (socketErr) {
      console.warn('[NotificationService] Socket emission deferred:', socketErr.message);
    }

    return {
      success: true,
      unreadCount: 0,
    };
  }

  /**
   * Delete or archive a notification with ownership validation
   */
  static async deleteNotification(notificationId, user) {
    const userId = user._id?.toString() || user.userId || user.id;
    const userRole = user.role;

    const notification = await Notification.findOne({
      $or: [
        { notificationId },
        { _id: notificationId.match(/^[0-9a-fA-F]{24}$/) ? notificationId : null },
      ],
    });

    if (!notification) {
      const error = new Error('Notification not found');
      error.statusCode = 404;
      throw error;
    }

    // Ownership check: must be direct recipient, target role user, or admin
    const isDirectUser =
      (notification.userId && String(notification.userId) === String(userId)) ||
      (notification.recipient && String(notification.recipient) === String(userId));
    const isAuthorizedRole = notification.targetRole === userRole || notification.targetRole === 'ALL';

    if (!isDirectUser && !isAuthorizedRole && userRole !== 'ADMIN') {
      const error = new Error('Unauthorized to delete this notification');
      error.statusCode = 403;
      throw error;
    }

    await Notification.deleteOne({ _id: notification._id });

    const unreadCount = await this.getUnreadCount(userId, userRole);

    return {
      success: true,
      notificationId: notification.notificationId,
      unreadCount,
    };
  }
}

export default NotificationService;
