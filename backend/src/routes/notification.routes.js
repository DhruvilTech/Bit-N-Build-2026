import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import {
  getNotifications,
  getUnreadCount,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
} from '../controllers/notification.controller.js';

const router = Router();

// All notification routes require authentication
router.use(authenticate);

router.get('/unread-count', getUnreadCount);
router.get('/', getNotifications);
router.patch('/read-all', markAllNotificationsRead);
router.patch('/:id/read', markNotificationRead);
router.delete('/:id', deleteNotification);

export default router;
