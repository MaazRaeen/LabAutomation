import { Router } from 'express'
import * as notificationController from '../controllers/notification.controller.js'
import { auth } from '../middleware/auth.js'

const router = Router()

// GET /api/notifications - Fetch user notifications
router.get('/', auth, notificationController.getNotifications)

// PATCH /api/notifications/read - Mark multiple notifications (or all if empty) as read
router.patch('/read', auth, notificationController.markAsRead)

// PATCH /api/notifications/:id/read - Legacy route for marking single notification as read
router.patch('/:id/read', auth, notificationController.markAsRead)

export default router
