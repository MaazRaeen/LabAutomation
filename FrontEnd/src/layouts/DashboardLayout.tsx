import React, { useState } from 'react'
import { Link, NavLink, useNavigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { supabase } from '../lib/supabase'
import { Menu, X, LogOut, User as UserIcon } from 'lucide-react'
import { toast } from 'react-hot-toast'
import NotificationBell from '../components/NotificationBell'

interface NavItem {
  label: string
  path: string
  icon: React.ComponentType<{ className?: string }>
}

interface DashboardLayoutProps {
  navItems: NavItem[]
  title: string
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ navItems, title }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { user, role, logout } = useAuthStore()
  const navigate = useNavigate()

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      logout()
      toast.success('Signed out successfully')
      navigate('/login')
    } catch (err: any) {
      toast.error(err.message || 'Logout failed')
    }
  }

  const userEmail = user?.email || 'User'
  const userFullName = user?.user_metadata?.full_name || userEmail.split('@')[0]
  const displayRole = role ? role.charAt(0).toUpperCase() + role.slice(1) : ''

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#111827] flex">
      {/* Sidebar for Desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-[#FFFFFF] border-r border-[#E5E7EB] shrink-0">
        <div className="h-16 flex items-center px-6 border-b border-[#E5E7EB]">
          <Link to="/" className="text-xl font-bold text-[#111827] tracking-wide flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-[#4F46E5] flex items-center justify-center text-sm font-black text-white">L</span>
            <span>LabEval Pro</span>
          </Link>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          {navItems.map((item, index) => {
            const Icon = item.icon
            return (
              <NavLink
                key={index}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 text-sm font-semibold rounded-xl transition-all duration-200 ${
                    isActive
                      ? 'bg-[#EEF2FF] text-[#4F46E5]'
                      : 'text-[#6B7280] hover:text-[#4F46E5] hover:bg-[#EEF2FF]/60'
                  }`
                }
              >
                <Icon className="w-5 h-5 shrink-0" />
                <span>{item.label}</span>
              </NavLink>
            )
          })}
        </nav>

        <div className="p-4 border-t border-[#E5E7EB]">
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-[#F8FAFC] border border-[#E5E7EB]/80">
            <div className="w-8 h-8 rounded-full bg-[#EEF2FF] flex items-center justify-center text-[#4F46E5] shrink-0 border border-[#EEF2FF]">
              <UserIcon className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-[#111827] truncate">{userFullName}</p>
              <p className="text-[10px] text-[#6B7280] font-semibold truncate">{displayRole}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile Drawer (off-canvas overlay) */}
      <div className={`fixed inset-0 z-40 md:hidden transition-opacity duration-300 ${sidebarOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
        <div className="absolute inset-0 bg-black/40 animate-fadeIn" onClick={() => setSidebarOpen(false)}></div>
        
        <div className={`absolute inset-y-0 left-0 w-64 bg-[#FFFFFF] border-r border-[#E5E7EB] flex flex-col transition-transform duration-300 transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <div className="h-16 flex items-center justify-between px-6 border-b border-[#E5E7EB]">
            <Link to="/" className="text-xl font-bold text-[#111827] tracking-wide flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-[#4F46E5] flex items-center justify-center text-sm font-black text-white">L</span>
              <span>LabEval Pro</span>
            </Link>
            <button className="text-[#6B7280] hover:text-[#111827]" onClick={() => setSidebarOpen(false)}>
              <X className="w-6 h-6" />
            </button>
          </div>

          <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
            {navItems.map((item, index) => {
              const Icon = item.icon
              return (
                <NavLink
                  key={index}
                  to={item.path}
                  onClick={() => setSidebarOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-4 py-3 text-sm font-semibold rounded-xl transition-all ${
                      isActive
                        ? 'bg-[#EEF2FF] text-[#4F46E5]'
                        : 'text-[#6B7280] hover:text-[#4F46E5] hover:bg-[#EEF2FF]/60'
                    }`
                  }
                >
                  <Icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </NavLink>
              )
            })}
          </nav>

          <div className="p-4 border-t border-[#E5E7EB]">
            <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-[#F8FAFC] border border-[#E5E7EB]/80">
              <div className="w-8 h-8 rounded-full bg-[#EEF2FF] flex items-center justify-center text-[#4F46E5] shrink-0 border border-[#EEF2FF]">
                <UserIcon className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-[#111827] truncate">{userFullName}</p>
                <p className="text-[10px] text-[#6B7280] font-semibold truncate">{displayRole}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-[#FFFFFF] border-b border-[#E5E7EB] flex items-center justify-between px-6 z-10">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 -ml-2 text-[#6B7280] hover:text-[#111827] md:hidden"
            >
              <Menu className="w-6 h-6" />
            </button>
            <h1 className="text-lg font-bold text-[#111827] tracking-wide hidden md:block">
              {title}
            </h1>
          </div>

          <div className="flex items-center gap-4">
            <NotificationBell />
            <span className="hidden sm:inline-block text-xs font-bold text-[#4F46E5] bg-[#EEF2FF] border border-[#EEF2FF]/80 rounded-full px-2.5 py-0.5">
              {displayRole}
            </span>
            <div className="h-6 w-px bg-[#E5E7EB] hidden sm:block"></div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-[#6B7280] hover:text-[#EF4444] hover:bg-[#EF4444]/10 rounded-lg transition-colors border border-[#E5E7EB] hover:border-[#EF4444]/20 cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto bg-[#F8FAFC] p-6">
          <div className="max-w-7xl mx-auto animate-fadeIn">
            <React.Suspense fallback={<div className="text-center py-10 text-[#6B7280]">Loading...</div>}>
              <Outlet />
            </React.Suspense>
          </div>
        </main>
      </div>
    </div>
  )
}

export default DashboardLayout
