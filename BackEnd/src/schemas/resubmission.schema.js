import { z } from 'zod'

export const createResubmissionSchema = z.object({
  experiment_id: z.string().uuid({ message: 'Invalid experiment ID format. Must be a valid UUID.' }),
  justification: z.string()
    .min(10, { message: 'Justification must be at least 10 characters long' })
    .max(500, { message: 'Justification cannot exceed 500 characters' })
})

export const reviewResubmissionSchema = z.object({
  status: z.enum(['approved', 'rejected'], { errorMap: () => ({ message: 'Status must be either approved or rejected' }) }),
  teacher_note: z.string().optional()
})
