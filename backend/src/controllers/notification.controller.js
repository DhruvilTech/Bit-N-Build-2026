import NotificationService from '../services/notification.service.js';
import { successResponse } from '../utils/response.js';

export const getNotifications = async (req, res, next) => {
  try {
    const userId = req.user._id?.toString() || req.user.userId || req.user.id;
    const userRole = req.user.role;
    const { isRead, limit = 50, page = 1 } = req.query;

    const parsedIsRead =
      isRead === 'true' ? true : isRead === 'false' ? false : undefined;

    const result = await NotificationService.getUserNotifications(userId, userRole, {
      isRead: parsedIsRead,
      limit: Number(limit),
      page: Number(page),
    });

    return successResponse(res, 'Notifications retrieved successfully', result, 200);
  } catch (error) {
    next(error);
  }
};

export const markNotificationRead = async (req, res, next) => {
  try {
    const { id } = req.params;
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
