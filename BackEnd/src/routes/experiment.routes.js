import { Router } from 'express'
import * as experimentController from '../controllers/experiment.controller.js'
import { auth } from '../middleware/auth.js'
import { allowRoles } from '../middleware/role.js'
import { validate } from '../middleware/validate.js'
import {
  createExperimentSchema,
  updateExperimentSchema,
  assignExperimentSchema
} from '../schemas/experiment.schema.js'

const router = Router()

// 1. POST /api/experiments - Teacher only
router.post(
  '/',
  auth,
  allowRoles('teacher'),
  validate(createExperimentSchema),
  experimentController.createExperiment
)

// 2. GET /api/experiments - All roles (filtered by role inside controller)
router.get(
  '/',
  auth,
  experimentController.getMyExperiments
)

// 3. GET /api/experiments/:id - Access controlled inside controller
router.get(
  '/:id',
  auth,
  experimentController.getExperimentById
)

// 4. PUT /api/experiments/:id - Teacher only (must be creator, checked in controller)
router.put(
  '/:id',
  auth,
  allowRoles('teacher'),
  validate(updateExperimentSchema),
  experimentController.updateExperiment
)

// 5. PATCH /api/experiments/:id/archive - Teacher (creator) or Admin
router.patch(
  '/:id/archive',
  auth,
  allowRoles('teacher', 'admin'),
  experimentController.archiveExperiment
)

// 6. POST /api/experiments/:id/assign - Teacher only (must be creator, checked in controller)
router.post(
  '/:id/assign',
  auth,
  allowRoles('teacher'),
  (req, res, next) => {
    req.body.experiment_id = req.params.id
    next()
  },
  validate(assignExperimentSchema),
  experimentController.assignExperiment
)

export default router
