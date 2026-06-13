import { Router } from 'express'
import * as authController from '../controllers/auth.controller.js'
import { auth } from '../middleware/auth.js'
import { allowRoles } from '../middleware/role.js'
import { validate } from '../middleware/validate.js'
import { updateProfileSchema } from '../schemas/auth.schema.js'

const router = Router()

// Public test routes (kept for compatibility)
router.post('/register', authController.register)
router.post('/login', authController.login)

// Auth/Profile routes (mounted at /api, so prepended with /auth)
router.get('/auth/me', auth, authController.getMe)
router.put('/auth/profile', auth, validate(updateProfileSchema), authController.updateProfile)

// Admin user management routes (mounted at /api, so prepended with /admin)
router.get('/admin/users', auth, allowRoles('admin'), authController.getAllUsers)
router.put('/admin/users/:userId/role', auth, allowRoles('admin'), authController.updateUserRole)

export default router
