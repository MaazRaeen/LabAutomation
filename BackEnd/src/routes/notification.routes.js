import { Router } from 'express'
import * as notificationController from '../controllers/notification.controller.js'
import { authenticate } from '../middleware/auth.js'

const router = Router()

router.get('/', authenticate, notificationController.getNotifications)
router.patch('/:id/read', authenticate, notificationController.markAsRead)

export default router
