import { Router } from 'express'
import * as resubmissionController from '../controllers/resubmission.controller.js'
import { authenticate } from '../middleware/auth.js'

const router = Router()

router.get('/', authenticate, resubmissionController.getResubmissions)
router.post('/request', authenticate, resubmissionController.requestResubmission)

export default router
