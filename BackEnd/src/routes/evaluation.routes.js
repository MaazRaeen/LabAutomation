import { Router } from 'express'
import * as evaluationController from '../controllers/evaluation.controller.js'
import { authenticate } from '../middleware/auth.js'
import { authorize } from '../middleware/role.js'

const router = Router()

router.get('/', authenticate, evaluationController.getEvaluations)
router.post('/', authenticate, authorize(['teacher', 'admin']), evaluationController.createEvaluation)

export default router
