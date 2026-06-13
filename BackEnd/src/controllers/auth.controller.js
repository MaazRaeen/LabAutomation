import { supabaseAdmin } from '../config/supabase.js'

export const register = async (req, res, next) => {
  try {
    res.json({ message: 'Auth register route' })
  } catch (error) {
    next(error)
  }
}

export const login = async (req, res, next) => {
  try {
    res.json({ message: 'Auth login route' })
  } catch (error) {
    next(error)
  }
}

// 1. getMe(req, res)
// Returns req.user (already attached by auth middleware)
// Response: { user: req.user }
export const getMe = async (req, res, next) => {
  try {
    return res.status(200).json({ user: req.user })
  } catch (error) {
    next(error)
  }
}

// 2. updateProfile(req, res)
// Validates body with updateProfileSchema
// Updates profiles table where id = req.user.id
// Fields: full_name, department, enrollment_no
// Returns updated profile row
export const updateProfile = async (req, res, next) => {
  try {
    const { full_name, department, enrollment_no } = req.body

    const { data: updatedProfile, error } = await supabaseAdmin
      .from('profiles')
      .update({ full_name, department, enrollment_no })
      .eq('id', req.user.id)
      .select()
      .single()

    if (error) {
      return next(error)
    }

    return res.status(200).json(updatedProfile)
  } catch (error) {
    next(error)
  }
}

// 3. getAllUsers(req, res) [admin only]
// Fetches all rows from profiles table
// Supports query params: role (filter), search (partial match on full_name)
// Returns { users: [...] }
export const getAllUsers = async (req, res, next) => {
  try {
    const { role, search } = req.query
    let query = supabaseAdmin.from('profiles').select('*')

    if (role) {
      query = query.eq('role', role)
    }

    if (search) {
      query = query.ilike('full_name', `%${search}%`)
    }

    const { data: users, error } = await query

    if (error) {
      return next(error)
    }

    return res.status(200).json({ users })
  } catch (error) {
    next(error)
  }
}

// 4. updateUserRole(req, res) [admin only]
// Params: userId
// Body: { role: 'student' | 'teacher' | 'admin' }
// Updates profiles.role for the given userId
// Logs to audit_logs: action='role_updated', actor=req.user.id, target=userId
// Returns updated profile
export const updateUserRole = async (req, res, next) => {
  try {
    const { userId } = req.params
    const { role } = req.body

    if (!role || !['student', 'teacher', 'admin'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role. Must be student, teacher, or admin.' })
    }

    // Update profiles.role
    const { data: updatedProfile, error } = await supabaseAdmin
      .from('profiles')
      .update({ role })
      .eq('id', userId)
      .select()
      .single()

    if (error) {
      return next(error)
    }

    // Log to audit_logs table
    const { error: logError } = await supabaseAdmin
      .from('audit_logs')
      .insert({
        actor_id: req.user.id,
        action: 'role_updated',
        target_table: 'profiles',
        target_id: userId,
        metadata: { role }
      })

    if (logError) {
      console.error('Failed to log role update to audit_logs:', logError)
    }

    return res.status(200).json(updatedProfile)
  } catch (error) {
    next(error)
  }
}
