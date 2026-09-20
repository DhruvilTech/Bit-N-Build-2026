import NotificationService from '../services/notification.service.js';
import { successResponse, errorResponse } from '../utils/response.js';

export const getNotifications = async (req, res, next) => {
  try {
    const userId = req.user._id?.toString() || req.user.userId || req.user.id;
    const userRole = req.user.role;
    const { isRead, unread, limit = 20, page = 1, type, severity } = req.query;

    let parsedIsRead = undefined;
    if (unread === 'true') {
      parsedIsRead = false;
    } else if (isRead === 'true') {
      parsedIsRead = true;
    } else if (isRead === 'false') {
      parsedIsRead = false;
    }

    const result = await NotificationService.getUserNotifications(userId, userRole, {
      isRead: parsedIsRead,
      type: type || undefined,
      severity: severity || undefined,
      limit: Number(limit),
      page: Number(page),
    });

    return successResponse(res, 'Notifications retrieved successfully', result, 200);
  } catch (error) {
    next(error);
  }
};

export const getUnreadCount = async (req, res, next) => {
  try {
    const userId = req.user._id?.toString() || req.user.userId || req.user.id;
    const userRole = req.user.role;

    const count = await NotificationService.getUnreadCount(userId, userRole);
    return successResponse(res, 'Unread notification count retrieved', { count }, 200);
  } catch (error) {
    next(error);
  }
};

export const markNotificationRead = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!id) {
      return errorResponse(res, 'Notification ID is required', 400);
    }

    const result = await NotificationService.markAsRead(id, req.user);
    return successResponse(res, 'Notification marked as read', result, 200);
  } catch (error) {
    next(error);
  }
};

export const markAllNotificationsRead = async (req, res, next) => {
  try {
    const result = await NotificationService.markAllAsRead(req.user);
    return successResponse(res, 'All notifications marked as read', result, 200);
  } catch (error) {
    next(error);
  }
};

export const deleteNotification = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!id) {
      return errorResponse(res, 'Notification ID is required', 400);
    }

    const result = await NotificationService.deleteNotification(id, req.user);
    return successResponse(res, 'Notification deleted successfully', result, 200);
  } catch (error) {
    next(error);
  }
};
