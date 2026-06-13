import React, { useState } from 'react'
import { Link, NavLink, useNavigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { supabase } from '../lib/supabase'
import { Menu, X, LogOut, User as UserIcon } from 'lucide-react'
import { toast } from 'react-hot-toast'

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
    <div className="min-h-screen bg-[#0F172A] text-slate-100 flex">
      {/* Sidebar for Desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-[#0F172A] border-r border-slate-800 shrink-0">
        <div className="h-16 flex items-center px-6 border-b border-slate-800">
          <Link to="/" className="text-xl font-bold text-white tracking-wide flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-[#6366F1] flex items-center justify-center text-sm font-black">L</span>
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
                  `flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-colors duration-200 ${
                    isActive
                      ? 'bg-[#6366F1] text-white font-semibold'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                  }`
                }
              >
                <Icon className="w-5 h-5 shrink-0" />
                <span>{item.label}</span>
              </NavLink>
            )
          })}
        </nav>

        <div className="p-4 border-t border-slate-800">
          <div className="flex items-center gap-3 px-2 py-1.5 rounded-lg bg-slate-800/40">
            <div className="w-8 h-8 rounded-full bg-[#6366F1]/20 flex items-center justify-center text-[#6366F1] shrink-0 border border-[#6366F1]/30">
              <UserIcon className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-white truncate">{userFullName}</p>
              <p className="text-[10px] text-slate-500 font-medium truncate">{displayRole}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile Drawer (off-canvas overlay) */}
      <div className={`fixed inset-0 z-40 md:hidden transition-opacity duration-300 ${sidebarOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
        <div className="absolute inset-0 bg-black/60 animate-fadeIn" onClick={() => setSidebarOpen(false)}></div>
        
        <div className={`absolute inset-y-0 left-0 w-64 bg-[#0F172A] border-r border-slate-800 flex flex-col transition-transform duration-300 transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <div className="h-16 flex items-center justify-between px-6 border-b border-slate-800">
            <Link to="/" className="text-xl font-bold text-white tracking-wide flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-[#6366F1] flex items-center justify-center text-sm font-black">L</span>
              <span>LabEval Pro</span>
            </Link>
            <button className="text-slate-400 hover:text-white" onClick={() => setSidebarOpen(false)}>
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
                    `flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                      isActive
                        ? 'bg-[#6366F1] text-white'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                    }`
                  }
                >
                  <Icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </NavLink>
              )
            })}
          </nav>

          <div className="p-4 border-t border-slate-800">
            <div className="flex items-center gap-3 px-2 py-1.5 rounded-lg bg-slate-800/40">
              <div className="w-8 h-8 rounded-full bg-[#6366F1]/20 flex items-center justify-center text-[#6366F1] shrink-0">
                <UserIcon className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-white truncate">{userFullName}</p>
                <p className="text-[10px] text-slate-500 font-medium truncate">{displayRole}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-[#0F172A] border-b border-slate-800 flex items-center justify-between px-6 z-10">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 -ml-2 text-slate-400 hover:text-white md:hidden"
            >
              <Menu className="w-6 h-6" />
            </button>
            <h1 className="text-lg font-semibold text-white tracking-wide hidden md:block">
              {title}
            </h1>
          </div>

          <div className="flex items-center gap-4">
            <span className="hidden sm:inline-block text-xs font-medium text-[#6366F1] bg-[#6366F1]/10 border border-[#6366F1]/20 rounded-full px-2.5 py-0.5">
              {displayRole}
            </span>
            <div className="h-6 w-px bg-slate-800 hidden sm:block"></div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors border border-slate-800 hover:border-rose-500/20 cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto bg-[#0F172A] p-6">
          <div className="max-w-7xl mx-auto">
            <React.Suspense fallback={<div className="text-center py-10 text-slate-400">Loading...</div>}>
              <Outlet />
            </React.Suspense>
          </div>
        </main>
      </div>
    </div>
  )
}

export default DashboardLayout
