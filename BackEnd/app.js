import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'

// Middleware imports
import { errorHandler } from './src/middleware/errorHandler.js'

// Route imports
import authRoutes from './src/routes/auth.routes.js'
import experimentRoutes from './src/routes/experiment.routes.js'
import submissionRoutes from './src/routes/submission.routes.js'
import labRecordRoutes from './src/routes/labRecord.routes.js'
import evaluationRoutes from './src/routes/evaluation.routes.js'
import resubmissionRoutes from './src/routes/resubmission.routes.js'
import marksRevisionRoutes from './src/routes/marksRevision.routes.js'
import adminRoutes from './src/routes/admin.routes.js'
import notificationRoutes from './src/routes/notification.routes.js'
import progressRoutes from './src/routes/progress.routes.js'

const app = express()

// Global middlewares
app.use(helmet())
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}))
app.use(morgan('dev'))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() })
})

// Route registrations
app.use('/api', authRoutes)
app.use('/api/experiments', experimentRoutes)
app.use('/api/submissions', submissionRoutes)
app.use('/api/lab-records', labRecordRoutes)
app.use('/api/evaluations', evaluationRoutes)
app.use('/api/resubmissions', resubmissionRoutes)
app.use('/api/marks-revisions', marksRevisionRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api/notifications', notificationRoutes)
app.use('/api/progress', progressRoutes)

// Fallback for unmatched routes
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' })
})

// Global Error Handler
app.use(errorHandler)

export default app
