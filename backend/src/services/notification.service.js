import Notification from '../models/notification.model.js';
import { emitNotificationNew, emitNotificationRead } from '../utils/socket.js';
import { recordAuditLog } from './auditLog.service.js';

export class NotificationService {
  /**
   * Create and persist a single notification
   */
  static async createNotification({
    userId = null,
    targetRole = 'ALL',
    type,
    title,
    message,
    severity = 'MEDIUM',
    entityType = 'SYSTEM',
    entityId = null,
    metadata = {},
  }) {
    const notificationId = `NTF-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const notification = await Notification.create({
      notificationId,
      userId,
      targetRole,
      type,
      title,
      message,
      severity,
      entityType,
      entityId,
      metadata,
    });

    // Real-time broadcast
    emitNotificationNew(notification.toObject ? notification.toObject() : notification);

    return notification;
  }

  /**
   * Send notification to a specific user
   */
  static async notifyUser(userId, payload) {
    return this.createNotification({
      ...payload,
      userId,
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
      targetRole,
    });
  }

  /**
   * Fetch paginated notifications for an authenticated user based on userId and role
   */
  static async getUserNotifications(userId, userRole, { isRead, limit = 50, page = 1 } = {}) {
    const query = {
      $or: [
        { userId },
        { targetRole: userRole },
        { targetRole: 'ALL' },
      ],
    };

    if (typeof isRead === 'boolean') {
      if (isRead) {
        query.$or = [
          { userId, isRead: true },
          { targetRole: userRole, 'readBy.userId': userId },
          { targetRole: 'ALL', 'readBy.userId': userId },
        ];
      } else {
        query.isRead = false;
        query['readBy.userId'] = { $ne: userId };
      }
    }

    const skip = (Math.max(1, page) - 1) * limit;

    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      Notification.countDocuments(query),
      this.getUnreadCount(userId, userRole),
    ]);

    // Format read status per user for role-targeted notifications
    const formatted = notifications.map((n) => {
      const isDirectRead = n.userId && String(n.userId) === String(userId) && n.isRead;
      const isRoleRead = Array.isArray(n.readBy) && n.readBy.some((r) => String(r.userId) === String(userId));
      return {
        ...n,
        isRead: Boolean(isDirectRead || isRoleRead),
      };
    });

    return {
      notifications: formatted,
      total,
      unreadCount,
      page: Number(page),
      limit: Number(limit),
    };
  }

  /**
   * Compute unread notification count for an authenticated user
   */
  static async getUnreadCount(userId, userRole) {
    const count = await Notification.countDocuments({
      $or: [
        { userId, isRead: false },
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
      $or: [{ notificationId }, { _id: notificationId.match(/^[0-9a-fA-F]{24}$/) ? notificationId : null }],
    });

    if (!notification) {
      const error = new Error('Notification not found');
      error.statusCode = 404;
      throw error;
    }

    // Direct user notification
    if (notification.userId && String(notification.userId) === String(userId)) {
      notification.isRead = true;
      notification.readAt = new Date();
      await notification.save();
    } else {
      // Role broadcast: add to readBy array if not already present
      const alreadyRead = notification.readBy.some((r) => String(r.userId) === String(userId));
      if (!alreadyRead) {
        notification.readBy.push({ userId, readAt: new Date() });
        await notification.save();
      }
    }

    const unreadCount = await this.getUnreadCount(userId, userRole);

    emitNotificationRead({
      notificationId: notification.notificationId,
      userId,
      unreadCount,
    });

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
      { userId, isRead: false },
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

    emitNotificationRead({
      all: true,
      userId,
      unreadCount: 0,
    });

    return {
      success: true,
      unreadCount: 0,
    };
  }
}

export default NotificationService;
