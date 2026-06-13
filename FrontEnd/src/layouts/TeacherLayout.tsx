import React from 'react'
import { LayoutDashboard, BookOpen, Code2, CheckSquare, FileSpreadsheet, RefreshCw, Edit3 } from 'lucide-react'
import DashboardLayout from './DashboardLayout'

export const TeacherLayout: React.FC = () => {
  const navItems = [
    { label: 'Dashboard', path: '/teacher/dashboard', icon: LayoutDashboard },
    { label: 'Experiments', path: '/teacher/experiments', icon: BookOpen },
    { label: 'Submissions', path: '/teacher/submissions', icon: Code2 },
    { label: 'Lab Verification', path: '/teacher/verification', icon: CheckSquare },
    { label: 'Evaluations', path: '/teacher/evaluations', icon: FileSpreadsheet },
    { label: 'Resubmissions', path: '/teacher/resubmissions', icon: RefreshCw },
    { label: 'Marks Revision', path: '/teacher/revisions', icon: Edit3 },
  ]

  return <DashboardLayout navItems={navItems} title="Teacher Portal" />
}

export default TeacherLayout
