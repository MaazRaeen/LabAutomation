import { Router } from 'express'
import * as adminController from '../controllers/admin.controller.js'
import { auth } from '../middleware/auth.js'
import { allowRoles } from '../middleware/role.js'

const router = Router()

// GET /api/admin/users - List users (Admin only)
router.get('/users', auth, allowRoles('admin'), adminController.getUsers)

// DELETE /api/admin/users/:id - Delete user (Admin only)
router.delete('/users/:id', auth, allowRoles('admin'), adminController.deleteUser)

// GET /api/admin/stats - System-wide stats overview (Admin only)
router.get('/stats', auth, allowRoles('admin'), adminController.getSystemStats)

// GET /api/admin/audit-logs - View audit logs with filters & pagination (Admin only)
router.get('/audit-logs', auth, allowRoles('admin'), adminController.getAuditLogs)

export default router
