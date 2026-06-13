import { Router } from 'express'
import * as progressController from '../controllers/progress.controller.js'
import { authenticate } from '../middleware/auth.js'

const router = Router()

router.get('/', authenticate, progressController.getProgress)

export default router
