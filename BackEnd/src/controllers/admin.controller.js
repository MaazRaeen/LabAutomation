import { supabaseAdmin } from '../config/supabase.js'

export const getUsers = async (req, res, next) => {
  try {
    res.json({ message: 'Admin: Get users' })
  } catch (error) {
    next(error)
  }
}

export const deleteUser = async (req, res, next) => {
  try {
    res.json({ message: 'Admin: Delete user' })
  } catch (error) {
    next(error)
  }
}

/**
 * getSystemStats(req, res, next)
 * - Admin only
 * - Return total student count, total teacher count, total experiments, total submissions,
 *   pending marks revisions, pending resubmission requests, lab records pending verification count.
 */
export const getSystemStats = async (req, res, next) => {
  try {
    const queries = [
      supabaseAdmin.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'student'),
      supabaseAdmin.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'teacher'),
      supabaseAdmin.from('experiments').select('*', { count: 'exact', head: true }),
      supabaseAdmin.from('code_submissions').select('*', { count: 'exact', head: true }),
      supabaseAdmin.from('marks_revision_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      supabaseAdmin.from('resubmission_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      supabaseAdmin.from('lab_records').select('*', { count: 'exact', head: true }).eq('status', 'pending')
    ]

    const results = await Promise.all(queries)

    // Check for any errors
    for (const r of results) {
      if (r.error) throw r.error
    }

    const stats = {
      total_students: results[0].count || 0,
      total_teachers: results[1].count || 0,
      total_experiments: results[2].count || 0,
      total_submissions: results[3].count || 0,
      pending_marks_revisions: results[4].count || 0,
      pending_resubmissions: results[5].count || 0,
      pending_lab_records: results[6].count || 0
    }

    return res.status(200).json({ stats })
  } catch (error) {
    next(error)
  }
}

/**
 * getAuditLogs(req, res, next)
 * - Admin only
 * - Supports filters: actor_id, action, target_table, date range (from/to)
 * - Paginated: page + limit query params
 * - Join with profiles for actor full_name
 */
export const getAuditLogs = async (req, res, next) => {
  try {
    let page = parseInt(req.query.page) || 1
    let limit = parseInt(req.query.limit) || 20
    if (page < 1) page = 1
    if (limit < 1) limit = 1

    const fromIndex = (page - 1) * limit
    const toIndex = fromIndex + limit - 1

    let query = supabaseAdmin
      .from('audit_logs')
      .select('*, actor:profiles(full_name, role)', { count: 'exact' })

    if (req.query.actor_id) {
      query = query.eq('actor_id', req.query.actor_id)
    }
    if (req.query.action) {
      query = query.eq('action', req.query.action)
    }
    if (req.query.target_table) {
      query = query.eq('target_table', req.query.target_table)
    }
    if (req.query.from) {
      query = query.gte('created_at', req.query.from)
    }
    if (req.query.to) {
      query = query.lte('created_at', req.query.to)
    }

    // Sort by latest first
    query = query.order('created_at', { ascending: false })

    // Paginate
    query = query.range(fromIndex, toIndex)

    const { data: logs, count, error } = await query

    if (error) return next(error)

    return res.status(200).json({
      logs: logs || [],
      total: count || 0,
      page,
      limit
    })
  } catch (error) {
    next(error)
  }
}
