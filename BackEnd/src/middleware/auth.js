import { supabaseAdmin } from '../config/supabase.js'

export const auth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const token = authHeader.split(' ')[1]
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)

    if (error || !user) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    // Fetch user profile from database
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, role, department, enrollment_no')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    // Attach profile fields to request
    req.user = {
      id: profile.id,
      full_name: profile.full_name,
      role: profile.role,
      department: profile.department,
      enrollment_no: profile.enrollment_no,
    }

    next()
  } catch (err) {
    console.error('Authentication middleware error:', err)
    return res.status(401).json({ error: 'Unauthorized' })
  }
}

export const authenticate = auth // Keep named export for compatibility
export default auth
