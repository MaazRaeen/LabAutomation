import { Router } from 'express'
import * as resubmissionController from '../controllers/resubmission.controller.js'
import { auth } from '../middleware/auth.js'
import { allowRoles } from '../middleware/role.js'
import { validate } from '../middleware/validate.js'
import {
  createResubmissionSchema,
  reviewResubmissionSchema
} from '../schemas/resubmission.schema.js'

const router = Router()

// GET /api/resubmissions - Get resubmission requests (Student, Teacher, Admin role-specific logic)
router.get(
  '/',
  auth,
  resubmissionController.getResubmissionRequests
)

// POST /api/resubmissions (and POST /api/resubmissions/request) - Student creates a resubmission request
router.post(
  '/',
  auth,
  allowRoles('student'),
  validate(createResubmissionSchema),
  resubmissionController.createResubmissionRequest
)

router.post(
  '/request',
  auth,
  allowRoles('student'),
  validate(createResubmissionSchema),
  resubmissionController.createResubmissionRequest
)

// PUT /api/resubmissions/:id/review - Teacher reviews a resubmission request
router.put(
  '/:id/review',
  auth,
  allowRoles('teacher'),
  validate(reviewResubmissionSchema),
  resubmissionController.reviewResubmissionRequest
)

export default router
