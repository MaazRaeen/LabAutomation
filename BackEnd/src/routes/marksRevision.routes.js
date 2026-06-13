import { Router } from 'express'
import * as marksRevisionController from '../controllers/marksRevision.controller.js'
import { authenticate } from '../middleware/auth.js'

const router = Router()

router.get('/', authenticate, marksRevisionController.getMarksRevisions)
router.post('/request', authenticate, marksRevisionController.requestMarksRevision)

export default router
