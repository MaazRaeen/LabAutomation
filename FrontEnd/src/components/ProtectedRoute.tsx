import React from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'

interface ProtectedRouteProps {
  roles?: ('student' | 'teacher' | 'admin')[]
  children?: React.ReactNode
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ roles, children }) => {
  const { user, role, session, loading } = useAuthStore()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-[#4F46E5] border-t-transparent rounded-full animate-spin"></div>
          <p className="text-[#6B7280] font-medium text-sm">Verifying session...</p>
        </div>
      </div>
    )
  }

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
