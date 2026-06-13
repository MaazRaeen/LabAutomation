import { supabaseAdmin } from '../config/supabase.js'

export const logAudit = async (userId, action, tableName, recordId, details = {}) => {
  const { data, error } = await supabaseAdmin
    .from('audit_logs')
    .insert({
      user_id: userId,
      action,
      table_name: tableName,
      record_id: recordId,
      details,
    })
    .select()
    .single()

  if (error) throw error
  return data
}
