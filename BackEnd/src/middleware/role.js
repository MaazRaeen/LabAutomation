/**
 * Usage example:
 *   router.get('/admin/users', auth, allowRoles('admin'), controller)
 *   router.post('/experiments', auth, allowRoles('teacher', 'admin'), controller)
 */

export const allowRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden: insufficient role' })
    }

    next()
  }
}

// Keep previous authorize name for compatibility if needed
export const authorize = (allowedRoles = []) => allowRoles(...allowedRoles)

export default allowRoles
