import { Router } from 'express'
import * as marksRevisionController from '../controllers/marksRevision.controller.js'
import { auth } from '../middleware/auth.js'
import { allowRoles } from '../middleware/role.js'
import { validate } from '../middleware/validate.js'
import {
  createRevisionSchema,
  reviewRevisionSchema
} from '../schemas/marksRevision.schema.js'

const router = Router()

// GET /api/marks-revisions - Get marks revision requests (Teacher, Admin)
router.get(
  '/',
  auth,
  allowRoles('teacher', 'admin'),
  marksRevisionController.getRevisionRequests
)

// POST /api/marks-revisions (and POST /api/marks-revisions/request) - Teacher requests a revision
router.post(
  '/',
  auth,
  allowRoles('teacher'),
  validate(createRevisionSchema),
  marksRevisionController.createRevisionRequest
)

router.post(
  '/request',
  auth,
  allowRoles('teacher'),
  validate(createRevisionSchema),
  marksRevisionController.createRevisionRequest
)

// PUT /api/marks-revisions/:id/review - Admin reviews a revision request
router.put(
  '/:id/review',
  auth,
  allowRoles('admin'),
  validate(reviewRevisionSchema),
  marksRevisionController.reviewRevisionRequest
)

export default router
