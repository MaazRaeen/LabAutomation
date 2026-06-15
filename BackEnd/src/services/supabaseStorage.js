import { supabaseAdmin } from '../config/supabase.js'

export const uploadFile = async (bucket, filePath, fileBuffer, mimeType) => {
  let { data, error } = await supabaseAdmin.storage
    .from(bucket)
    .upload(filePath, fileBuffer, {
      contentType: mimeType,
      upsert: true,
    })

  if (error) {
    const isBucketNotFound = error.statusCode === '404' || 
                             error.message?.toLowerCase().includes('not found') || 
                             error.message?.toLowerCase().includes('bucket_not_found')
    
    if (isBucketNotFound) {
      // Attempt to create public bucket
      const { error: createError } = await supabaseAdmin.storage.createBucket(bucket, {
        public: true
      })
      
      if (!createError || createError.message?.toLowerCase().includes('already exists')) {
        // Retry the upload
        const retryResult = await supabaseAdmin.storage
          .from(bucket)
          .upload(filePath, fileBuffer, {
            contentType: mimeType,
            upsert: true,
          })
        if (retryResult.error) throw retryResult.error
        data = retryResult.data
      } else {
        throw createError
      }
    } else {
      throw error
    }
  }

  const { data: { publicUrl } } = supabaseAdmin.storage
    .from(bucket)
    .getPublicUrl(filePath)

  return publicUrl
}

export const deleteFile = async (bucket, filePath) => {
  const { data, error } = await supabaseAdmin.storage
    .from(bucket)
    .remove([filePath])

  if (error) throw error
  return data
}

export const deleteFiles = async (bucket, filePaths) => {
  if (!filePaths || filePaths.length === 0) return []
  const { data, error } = await supabaseAdmin.storage
    .from(bucket)
    .remove(filePaths)

  if (error) throw error
  return data
}

