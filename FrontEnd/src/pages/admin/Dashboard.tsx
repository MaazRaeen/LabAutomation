import React, { useEffect, useState } from 'react'
import { useAuthStore } from '../../store/authStore'
import { apiGet } from '../../lib/api'
import { Users, Code, Edit3, ClipboardList, ShieldAlert, ArrowRight, RefreshCw } from 'lucide-react'
import { Link } from 'react-router-dom'
import { toast } from 'react-hot-toast'
import LoadingSpinner from '../../components/LoadingSpinner'

interface AuditLog {
  id: string
  action: string
  target_table: string
  created_at: string
  actor?: {
    full_name: string
    email?: string
  }
}

export const Dashboard: React.FC = () => {
  const { user } = useAuthStore()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalTeachers: 0,
    totalSubmissions: 0,
    pendingRevisions: 0,
  })
  const [logs, setLogs] = useState<AuditLog[]>([])

  const fetchDashboardData = async (isRefresh = false) => {
    if (!user) return
    if (isRefresh) setRefreshing(true)
    else setLoading(true)

    try {
      // Fetch system stats from backend (service role bypasses RLS for accurate counts)
      const statsData = await apiGet('/api/admin/stats')
      setStats({
        totalStudents: statsData.stats?.total_students ?? 0,
        totalTeachers: statsData.stats?.total_teachers ?? 0,
        totalSubmissions: statsData.stats?.total_submissions ?? 0,
        pendingRevisions: statsData.stats?.pending_marks_revisions ?? 0,
      })

      // Fetch recent 20 audit logs from backend
      const logsData = await apiGet('/api/admin/audit-logs?limit=20&page=1')
      const rawLogs = logsData.logs || []
      const formattedLogs: AuditLog[] = rawLogs.map((item: any) => ({
        id: item.id,
        action: item.action,
        target_table: item.target_table,
        created_at: item.created_at,
        actor: Array.isArray(item.actor) ? item.actor[0] : item.actor,
      }))
      setLogs(formattedLogs)
    } catch (err: any) {
      console.error('Error fetching admin dashboard data:', err)
      toast.error('Failed to load dashboard statistics')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchDashboardData()
  }, [user])

  if (loading) {
    return <LoadingSpinner className="min-h-[400px]" size={40} />
  }

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white mb-1">Admin Dashboard</h2>
          <p className="text-slate-400 text-sm">System statistics, user logs, and management tools.</p>
        </div>
        <button
          onClick={() => fetchDashboardData(true)}
          disabled={refreshing}
          className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:text-white bg-[#1E293B] border border-slate-800 rounded-lg hover:border-slate-700 transition cursor-pointer self-start sm:self-auto disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Stats Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Students */}
        <div className="bg-[#1E293B] border border-slate-800 rounded-xl p-6 shadow-lg hover:border-slate-700/80 transition flex items-center gap-4 group">
          <div className="p-3 bg-[#6366F1]/10 rounded-lg text-[#6366F1] group-hover:scale-110 transition duration-300">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Total Students</p>
            <p className="text-2xl font-bold text-white mt-1">{stats.totalStudents}</p>
          </div>
        </div>

        {/* Total Teachers */}
        <div className="bg-[#1E293B] border border-slate-800 rounded-xl p-6 shadow-lg hover:border-slate-700/80 transition flex items-center gap-4 group">
          <div className="p-3 bg-teal-500/10 rounded-lg text-teal-400 group-hover:scale-110 transition duration-300">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Total Teachers</p>
            <p className="text-2xl font-bold text-white mt-1">{stats.totalTeachers}</p>
          </div>
        </div>

        {/* Total Submissions */}
        <div className="bg-[#1E293B] border border-slate-800 rounded-xl p-6 shadow-lg hover:border-slate-700/80 transition flex items-center gap-4 group">
          <div className="p-3 bg-emerald-500/10 rounded-lg text-emerald-400 group-hover:scale-110 transition duration-300">
            <Code className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Submissions Evaluated</p>
            <p className="text-2xl font-bold text-white mt-1">{stats.totalSubmissions}</p>
          </div>
        </div>

        {/* Pending Mark Revisions */}
        <Link 
          to="/admin/revisions"
          className="bg-[#1E293B] border border-slate-800 rounded-xl p-6 shadow-lg hover:border-[#6366F1] transition flex items-center gap-4 group cursor-pointer"
        >
          <div className="p-3 bg-amber-500/10 rounded-lg text-amber-500 group-hover:scale-110 transition duration-300">
            <Edit3 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Pending Revisions</p>
            <p className="text-2xl font-bold text-white mt-1">{stats.pendingRevisions}</p>
          </div>
        </Link>
      </div>

      {/* Grid: Audit Logs & Quick Links */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Recent Audit Logs */}
        <div className="lg:col-span-8 bg-[#1E293B] border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-800 flex items-center justify-between">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-[#6366F1]" />
              System Audit Logs
            </h3>
            <span className="text-[10px] text-slate-500 font-semibold bg-[#0F172A] border border-slate-800 px-2 py-0.5 rounded uppercase tracking-wider">
              Last 20 operations
            </span>
          </div>

          <div className="overflow-x-auto">
            {logs.length > 0 ? (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-xs font-semibold text-slate-400 uppercase bg-[#182235]/40">
                    <th className="px-6 py-3.5">Actor</th>
                    <th className="px-6 py-3.5">Action</th>
                    <th className="px-6 py-3.5">Table</th>
                    <th className="px-6 py-3.5">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-sm">
                  {logs.map((log) => {
                    const timeFormatted = new Date(log.created_at).toLocaleString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                    })

                    return (
                      <tr key={log.id} className="hover:bg-slate-800/20 transition-colors">
                        <td className="px-6 py-3">
                          <div className="font-semibold text-white">
                            {log.actor?.full_name || 'System / DB Trigger'}
                          </div>
                          <div className="text-xs text-slate-500 font-medium">
                            {log.actor?.email || 'N/A'}
                          </div>
                        </td>
                        <td className="px-6 py-3">
                          <span className="text-xs font-mono bg-[#0F172A] border border-slate-800 px-2 py-0.5 rounded text-indigo-400">
                            {log.action}
                          </span>
                        </td>
                        <td className="px-6 py-3 font-semibold text-slate-300 capitalize">
                          {log.target_table.replace('_', ' ')}
                        </td>
                        <td className="px-6 py-3 text-slate-400 text-xs">
                          {timeFormatted}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            ) : (
              <div className="px-6 py-12 text-center text-slate-450 text-sm">
                <ShieldAlert className="w-12 h-12 text-slate-650 mx-auto mb-4" />
                No audit log records found in the database.
              </div>
            )}
          </div>
        </div>

        {/* Quick Links Panel */}
        <div className="lg:col-span-4 bg-[#1E293B] border border-slate-800 rounded-2xl p-6 md:p-8 shadow-xl self-start space-y-6">
          <h3 className="text-base font-bold text-white uppercase tracking-wider pb-3 border-b border-slate-800">
            System Shortcuts
          </h3>

          <div className="space-y-4">
            <Link 
              to="/admin/users"
              className="flex items-center justify-between p-4 bg-[#0F172A] border border-slate-800 hover:border-[#6366F1] rounded-xl transition group cursor-pointer"
            >
              <div>
                <h4 className="text-sm font-bold text-white group-hover:text-[#6366F1] transition">Manage Users</h4>
                <p className="text-slate-500 text-xs mt-1">Review accounts, roles & active status.</p>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-500 group-hover:translate-x-1 group-hover:text-[#6366F1] transition-all" />
            </Link>

            <Link 
              to="/admin/reports"
              className="flex items-center justify-between p-4 bg-[#0F172A] border border-slate-800 hover:border-[#6366F1] rounded-xl transition group cursor-pointer"
            >
              <div>
                <h4 className="text-sm font-bold text-white group-hover:text-[#6366F1] transition">System Reports</h4>
                <p className="text-slate-500 text-xs mt-1">Export marksheets and view visual summaries.</p>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-500 group-hover:translate-x-1 group-hover:text-[#6366F1] transition-all" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard
