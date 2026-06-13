import { Router } from 'express'
import * as adminController from '../controllers/admin.controller.js'
import { authenticate } from '../middleware/auth.js'
import { authorize } from '../middleware/role.js'

const router = Router()

router.get('/users', authenticate, authorize(['admin']), adminController.getUsers)
router.delete('/users/:id', authenticate, authorize(['admin']), adminController.deleteUser)

export default router
