import { Router } from 'express'
import * as submissionController from '../controllers/submission.controller.js'
import { authenticate } from '../middleware/auth.js'

const router = Router()

router.get('/', authenticate, submissionController.getSubmissions)
router.post('/', authenticate, submissionController.createSubmission)

export default router
