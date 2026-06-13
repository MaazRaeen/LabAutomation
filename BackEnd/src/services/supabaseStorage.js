import { supabaseAdmin } from '../config/supabase.js'

export const uploadFile = async (bucket, filePath, fileBuffer, mimeType) => {
  const { data, error } = await supabaseAdmin.storage
    .from(bucket)
    .upload(filePath, fileBuffer, {
      contentType: mimeType,
      upsert: true,
    })

  if (error) throw error

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
