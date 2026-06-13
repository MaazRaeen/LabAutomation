import { Router } from 'express'
import * as labRecordController from '../controllers/labRecord.controller.js'
import { authenticate } from '../middleware/auth.js'

const router = Router()

router.get('/', authenticate, labRecordController.getLabRecords)
router.post('/upload', authenticate, labRecordController.uploadLabRecord)

export default router
