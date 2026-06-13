import { z } from 'zod'

export const updateProfileSchema = z.object({
  full_name: z.string().min(2, { message: 'Full name must be at least 2 characters' }),
  department: z.string().min(1, { message: 'Department is required' }),
  enrollment_no: z.string().optional()
})
