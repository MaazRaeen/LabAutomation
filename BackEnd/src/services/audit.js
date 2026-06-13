import { supabaseAdmin } from '../config/supabase.js'

export const logAudit = async (userId, action, tableName, recordId, details = {}) => {
  const { data, error } = await supabaseAdmin
    .from('audit_logs')
    .insert({
      actor_id: userId,
      action,
      target_table: tableName,
      target_id: recordId,
      metadata: details,
    })
    .select()
    .single()

  if (error) throw error
  return data
}
