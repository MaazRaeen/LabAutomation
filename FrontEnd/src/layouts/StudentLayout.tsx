import React from 'react'
import { LayoutDashboard, BookOpen, Code2, FileText, BarChart3, Bell, RefreshCw } from 'lucide-react'
import DashboardLayout from './DashboardLayout'

export const StudentLayout: React.FC = () => {
  const navItems = [
    { label: 'Dashboard', path: '/student/dashboard', icon: LayoutDashboard },
    { label: 'My Experiments', path: '/student/experiments', icon: BookOpen },
    { label: 'Submit Code', path: '/student/submit', icon: Code2 },
    { label: 'Lab Records', path: '/student/records', icon: FileText },
    { label: 'Resubmissions', path: '/student/resubmissions', icon: RefreshCw },
    { label: 'My Progress', path: '/student/progress', icon: BarChart3 },
    { label: 'Notifications', path: '/student/notifications', icon: Bell },
  ]

  return <DashboardLayout navItems={navItems} title="Student Portal" />
}

export default StudentLayout
