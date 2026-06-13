import { z } from 'zod'

export const uploadLabRecordSchema = z.object({
  experiment_id: z.string().uuid({ message: 'Invalid experiment ID format' })
})

export const verifyLabRecordSchema = z.object({
  status: z.enum(['verified', 'pending'], {
    errorMap: () => ({ message: "Status must be either 'verified' or 'pending'" })
  })
})

export const batchVerifyLabRecordsSchema = z.object({
  record_ids: z.array(
    z.string().uuid({ message: 'Each record ID must be a valid UUID' })
  ).min(1, { message: 'At least one record ID must be provided' }),
  status: z.literal('verified', {
    errorMap: () => ({ message: "Status must be 'verified'" })
  })
})
