import { Router } from 'express'
import multer from 'multer'
import * as labRecordController from '../controllers/labRecord.controller.js'
import { auth } from '../middleware/auth.js'
import { allowRoles } from '../middleware/role.js'
import { validate } from '../middleware/validate.js'
import {
  uploadLabRecordSchema,
  verifyLabRecordSchema,
  batchVerifyLabRecordsSchema
} from '../schemas/labRecord.schema.js'

const router = Router()

// Configure multer memory storage with 20MB limit
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 20 * 1024 * 1024 // 20MB limit
  }
})

// POST /api/lab-records -> auth, allowRoles('student'), multer, validate, uploadLabRecord
router.post(
  '/',
  auth,
  allowRoles('student'),
  upload.single('file'),
  validate(uploadLabRecordSchema),
  labRecordController.uploadLabRecord
)

// GET /api/lab-records -> auth, getLabRecords
router.get(
  '/',
  auth,
  labRecordController.getLabRecords
)

// PATCH /api/lab-records/:recordId/verify -> auth, allowRoles('teacher'), validate, verifyLabRecord
router.patch(
  '/:recordId/verify',
  auth,
  allowRoles('teacher'),
  validate(verifyLabRecordSchema),
  labRecordController.verifyLabRecord
)

// POST /api/lab-records/batch-verify -> auth, allowRoles('teacher'), validate, batchVerifyLabRecords
router.post(
  '/batch-verify',
  auth,
  allowRoles('teacher'),
  validate(batchVerifyLabRecordsSchema),
  labRecordController.batchVerifyLabRecords
)

export default router
