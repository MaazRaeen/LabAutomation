import { Router } from 'express'
import * as progressController from '../controllers/progress.controller.js'
import { auth } from '../middleware/auth.js'
import { allowRoles } from '../middleware/role.js'

const router = Router()

// GET /api/progress/me - Get own student progress details
router.get(
  '/me',
  auth,
  allowRoles('student'),
  progressController.getStudentProgress
)

// GET /api/progress/batch - Get batch statistics for teachers/admins
router.get(
  '/batch',
  auth,
  allowRoles('teacher', 'admin'),
  progressController.getBatchProgress
)

// GET /api/progress/:studentId - Get specific student progress
router.get(
  '/:studentId',
  auth,
  allowRoles('teacher', 'admin'),
  progressController.getStudentProgress
)

// Fallback compatibility route
router.get(
  '/',
  auth,
  progressController.getProgress
)

export default router
