import { z } from 'zod'

export const createExperimentSchema = z.object({
  title: z.string().min(3, { message: 'Title must be at least 3 characters long' }),
  subject: z.string().min(1, { message: 'Subject is required' }),
  description: z.string().min(1, { message: 'Description is required' }),
  deadline: z.string().datetime({ message: 'Deadline must be a valid ISO 8601 date string' }),
  instructions_url: z.string().optional(),
  target_semester: z.string().optional().nullable(),
  target_session: z.string().optional().nullable(),
  target_section: z.string().optional().nullable()
})

export const assignExperimentSchema = z.object({
  student_ids: z.array(
    z.string().uuid({ message: 'Each student ID must be a valid UUID' })
  ).min(1, { message: 'At least one student ID must be provided' }),
  experiment_id: z.string().uuid({ message: 'Invalid experiment ID format' })
})

export const updateExperimentSchema = createExperimentSchema.partial()
