import { z } from 'zod'

export const createRevisionSchema = z.object({
  evaluation_id: z.string().uuid({ message: 'Invalid evaluation ID format. Must be a valid UUID.' }),
  requested_marks: z.number({ invalid_type_error: 'Requested marks must be a number' })
    .min(0, { message: 'Requested marks must be at least 0' })
    .max(10, { message: 'Requested marks cannot exceed 10' }),
  justification: z.string()
    .min(10, { message: 'Justification must be at least 10 characters long' })
})

export const reviewRevisionSchema = z.object({
  status: z.enum(['approved', 'rejected'], { errorMap: () => ({ message: 'Status must be either approved or rejected' }) }),
  admin_note: z.string().nullable().optional()
})
