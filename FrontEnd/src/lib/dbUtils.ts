import { supabase } from './supabase'

/**
 * Inserts a new system notification for a specific user.
 * @param userId - The recipient student or teacher's profile UUID.
 * @param message - The text alert body.
 */
export const createNotification = async (userId: string, message: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from('notifications')
      .insert({
        user_id: userId,
        message,
        is_read: false,
      })

    if (error) throw error
  } catch (err) {
    console.error('Failed to create notification:', err)
  }
}

/**
 * Inserts a system audit log.
 * @param actorId - The profile UUID of the user triggering the action.
 * @param action - Descriptive action key (e.g. 'submit_evaluation').
 * @param targetTable - The database table targeted by the action.
 * @param targetId - The target row UUID.
 * @param metadata - Optional key-value metadata.
 */
export const logAudit = async (
  actorId: string,
  action: string,
  targetTable: string,
  targetId: string,
  metadata: any = {}
): Promise<void> => {
  try {
    const { error } = await supabase
      .from('audit_logs')
      .insert({
        actor_id: actorId,
        action,
        target_table: targetTable,
        target_id: targetId,
        metadata,
      })

    if (error) throw error
  } catch (err) {
    console.error('Failed to log audit event:', err)
  }
}
