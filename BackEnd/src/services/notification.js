import { supabaseAdmin } from '../config/supabase.js'

export const createNotification = async (userId, title, message, type = 'general') => {
  const msgContent = message || title
  const { data, error } = await supabaseAdmin
    .from('notifications')
    .insert({
      user_id: userId,
      message: msgContent,
      is_read: false,
    })
    .select()
    .single()

  if (error) throw error
  return data
}
