import { Router } from 'express'
import * as experimentController from '../controllers/experiment.controller.js'
import { authenticate } from '../middleware/auth.js'
import { authorize } from '../middleware/role.js'

const router = Router()

router.get('/', authenticate, experimentController.getExperiments)
router.post('/', authenticate, authorize(['teacher', 'admin']), experimentController.createExperiment)

export default router
