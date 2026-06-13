import { z } from 'zod'

export const submitCodeSchema = z.object({
  experiment_id: z.string().uuid({ message: 'Invalid experiment ID format' })
})
