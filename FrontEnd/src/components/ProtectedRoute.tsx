import React from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'

interface ProtectedRouteProps {
  roles?: ('student' | 'teacher' | 'admin')[]
  children?: React.ReactNode
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ roles, children }) => {
  const { user, role, session } = useAuthStore()

  if (!session || !user) {
    return <Navigate to="/login" replace />
  }

  if (roles && (!role || !roles.includes(role))) {
    if (role === 'student') return <Navigate to="/student/dashboard" replace />
    if (role === 'teacher') return <Navigate to="/teacher/dashboard" replace />
    if (role === 'admin') return <Navigate to="/admin/dashboard" replace />
    return <Navigate to="/login" replace />
  }

  return children ? <>{children}</> : <Outlet />
}

export default ProtectedRoute
