import { z } from 'zod'

export const createEvaluationSchema = z.object({
  submission_id: z.string().uuid({ message: 'Invalid submission ID format' }),
  marks: z.number()
    .min(0, { message: 'Marks must be at least 0' })
    .max(10, { message: 'Marks cannot exceed 10' }),
  max_marks: z.number().default(10),
  remarks: z.string()
    .min(5, { message: 'Remarks must be at least 5 characters long' })
    .max(1000, { message: 'Remarks cannot exceed 1000 characters' }),
  is_draft: z.boolean().optional()
})

export const updateEvaluationSchema = createEvaluationSchema.partial()
