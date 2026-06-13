import { supabaseAdmin } from '../config/supabase.js'

export const createNotification = async (userId, title, message, type = 'general') => {
  const { data, error } = await supabaseAdmin
    .from('notifications')
    .insert({
      user_id: userId,
      title,
      message,
      type,
      is_read: false,
    })
    .select()
    .single()

  if (error) throw error
  return data
}
