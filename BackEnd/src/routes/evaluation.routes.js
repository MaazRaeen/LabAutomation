import { Router } from 'express'
import * as evaluationController from '../controllers/evaluation.controller.js'
import { auth } from '../middleware/auth.js'
import { allowRoles } from '../middleware/role.js'
import { validate } from '../middleware/validate.js'
import {
  createEvaluationSchema,
  updateEvaluationSchema
} from '../schemas/evaluation.schema.js'

const router = Router()

// POST /api/evaluations -> auth, allowRoles('teacher'), validate(createEvaluationSchema), createEvaluation
router.post(
  '/',
  auth,
  allowRoles('teacher'),
  validate(createEvaluationSchema),
  evaluationController.createEvaluation
)

// GET /api/evaluations -> auth, getEvaluations
router.get(
  '/',
  auth,
  evaluationController.getEvaluations
)

// GET /api/evaluations/:id -> auth, getEvaluationById
router.get(
  '/:id',
  auth,
  evaluationController.getEvaluationById
)

// PUT /api/evaluations/:id -> auth, allowRoles('teacher'), validate(updateEvaluationSchema), updateEvaluation
router.put(
  '/:id',
  auth,
  allowRoles('teacher'),
  validate(updateEvaluationSchema),
  evaluationController.updateEvaluation
)

export default router
