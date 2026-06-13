import { Router } from 'express'
import multer from 'multer'
import * as submissionController from '../controllers/submission.controller.js'
import { auth } from '../middleware/auth.js'
import { allowRoles } from '../middleware/role.js'
import { validate } from '../middleware/validate.js'
import { submitCodeSchema } from '../schemas/submission.schema.js'

const router = Router()

// Configure multer memory storage with 10MB limit
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
})

// POST /api/submissions -> auth, allowRoles('student'), multer, validate, submitCode
router.post(
  '/',
  auth,
  allowRoles('student'),
  upload.single('code_file'),
  validate(submitCodeSchema),
  submissionController.submitCode
)

// GET /api/submissions -> auth, getMySubmissions
router.get(
  '/',
  auth,
  submissionController.getMySubmissions
)

// GET /api/submissions/:id -> auth, getSubmissionById
router.get(
  '/:id',
  auth,
  submissionController.getSubmissionById
)

export default router
