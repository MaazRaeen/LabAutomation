import React from 'react'
import { LayoutDashboard, Users, Code2, History, BarChart3 } from 'lucide-react'
import DashboardLayout from './DashboardLayout'

export const AdminLayout: React.FC = () => {
  const navItems = [
    { label: 'Dashboard', path: '/admin/dashboard', icon: LayoutDashboard },
    { label: 'User Management', path: '/admin/users', icon: Users },
    { label: 'All Submissions', path: '/admin/submissions', icon: Code2 },
    { label: 'Audit Logs', path: '/admin/audit-logs', icon: History },
    { label: 'Reports', path: '/admin/reports', icon: BarChart3 },
  ]

  return <DashboardLayout navItems={navItems} title="Admin Portal" />
}

export default AdminLayout
