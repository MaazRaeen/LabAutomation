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
          <h2 className="text-3xl font-black text-[#111827] mb-1">Admin Dashboard</h2>
          <p className="text-[#6B7280] text-sm">System statistics, user logs, and management tools.</p>
        </div>
        <button
          onClick={() => fetchDashboardData(true)}
          disabled={refreshing}
          className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-[#6B7280] hover:text-[#111827] bg-white border border-[#E5E7EB] hover:bg-[#F8FAFC] rounded-lg transition cursor-pointer self-start sm:self-auto disabled:opacity-50 shadow-sm"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Stats Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Students */}
        <div className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-2xl p-6 shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1 flex items-center gap-4 group">
          <div className="p-3 bg-[#EEF2FF] rounded-xl text-[#4F46E5] group-hover:scale-110 transition duration-300">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-[#6B7280] font-semibold uppercase tracking-wider">Total Students</p>
            <p className="text-3xl font-black text-[#111827] mt-1">{stats.totalStudents}</p>
          </div>
        </div>

        {/* Total Teachers */}
        <div className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-2xl p-6 shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1 flex items-center gap-4 group">
          <div className="p-3 bg-[#E0F2FE] rounded-xl text-[#0284C7] group-hover:scale-110 transition duration-300">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-[#6B7280] font-semibold uppercase tracking-wider">Total Teachers</p>
            <p className="text-3xl font-black text-[#111827] mt-1">{stats.totalTeachers}</p>
          </div>
        </div>

        {/* Total Submissions */}
        <div className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-2xl p-6 shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1 flex items-center gap-4 group">
          <div className="p-3 bg-[#D1FAE5] rounded-xl text-[#10B981] group-hover:scale-110 transition duration-300">
            <Code className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-[#6B7280] font-semibold uppercase tracking-wider">Submissions Evaluated</p>
            <p className="text-3xl font-black text-[#111827] mt-1">{stats.totalSubmissions}</p>
          </div>
        </div>

        {/* Pending Mark Revisions */}
        <Link 
          to="/admin/revisions"
          className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-2xl p-6 shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1 flex items-center gap-4 group cursor-pointer hover:border-[#4F46E5]"
        >
          <div className="p-3 bg-[#FEF3C7] rounded-xl text-[#D97706] group-hover:scale-110 transition duration-300">
            <Edit3 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-[#6B7280] font-semibold uppercase tracking-wider">Pending Revisions</p>
            <p className="text-3xl font-black text-[#111827] mt-1">{stats.pendingRevisions}</p>
          </div>
        </Link>
      </div>

      {/* Grid: Audit Logs & Quick Links */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Recent Audit Logs */}
        <div className="lg:col-span-8 bg-[#FFFFFF] border border-[#E5E7EB] rounded-[24px] shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-[#E5E7EB] flex items-center justify-between">
            <h3 className="text-base font-bold text-[#111827] flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-[#4F46E5]" />
              System Audit Logs
            </h3>
            <span className="text-[10px] text-[#6B7280] font-bold bg-[#F8FAFC] border border-[#E5E7EB] px-2 py-0.5 rounded uppercase tracking-wider">
              Last 20 operations
            </span>
          </div>

          <div className="overflow-x-auto">
            {logs.length > 0 ? (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#E5E7EB] text-xs font-semibold text-[#6B7280] uppercase bg-[#F8FAFC]">
                    <th className="px-6 py-3.5">Actor</th>
                    <th className="px-6 py-3.5">Action</th>
                    <th className="px-6 py-3.5">Table</th>
                    <th className="px-6 py-3.5">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E7EB]/60 text-sm">
                  {logs.map((log) => {
                    const timeFormatted = new Date(log.created_at).toLocaleString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                    })

                    return (
                      <tr key={log.id} className="hover:bg-[#F8FAFC]/80 transition-colors">
                        <td className="px-6 py-3">
                          <div className="font-bold text-[#111827]">
                            {log.actor?.full_name || 'System / DB Trigger'}
                          </div>
                          <div className="text-xs text-[#6B7280] font-semibold">
                            {log.actor?.email || 'N/A'}
                          </div>
                        </td>
                        <td className="px-6 py-3">
                          <span className="text-xs font-mono bg-[#EEF2FF] border border-[#EEF2FF] px-2 py-0.5 rounded text-[#4F46E5] font-semibold">
                            {log.action}
                          </span>
                        </td>
                        <td className="px-6 py-3 font-semibold text-[#111827] capitalize">
                          {log.target_table.replace('_', ' ')}
                        </td>
                        <td className="px-6 py-3 text-[#6B7280] text-xs">
                          {timeFormatted}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            ) : (
              <div className="px-6 py-12 text-center text-[#6B7280] text-sm">
                <ShieldAlert className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                No audit log records found in the database.
              </div>
            )}
          </div>
        </div>

        {/* Quick Links Panel */}
        <div className="lg:col-span-4 bg-[#FFFFFF] border border-[#E5E7EB] rounded-[24px] p-6 md:p-8 shadow-sm self-start space-y-6">
          <h3 className="text-base font-bold text-[#111827] uppercase tracking-wider pb-3 border-b border-[#E5E7EB]">
            System Shortcuts
          </h3>

          <div className="space-y-4">
            <Link 
              to="/admin/users"
              className="flex items-center justify-between p-4 bg-[#F8FAFC] border border-[#E5E7EB] hover:border-[#4F46E5] rounded-xl transition group cursor-pointer"
            >
              <div>
                <h4 className="text-sm font-bold text-[#111827] group-hover:text-[#4F46E5] transition">Manage Users</h4>
                <p className="text-[#6B7280] text-xs mt-1">Review accounts, roles & active status.</p>
              </div>
              <ArrowRight className="w-4 h-4 text-[#6B7280] group-hover:translate-x-1 group-hover:text-[#4F46E5] transition-all" />
            </Link>

            <Link 
              to="/admin/reports"
              className="flex items-center justify-between p-4 bg-[#F8FAFC] border border-[#E5E7EB] hover:border-[#4F46E5] rounded-xl transition group cursor-pointer"
            >
              <div>
                <h4 className="text-sm font-bold text-[#111827] group-hover:text-[#4F46E5] transition">System Reports</h4>
                <p className="text-[#6B7280] text-xs mt-1">Export marksheets and view visual summaries.</p>
              </div>
              <ArrowRight className="w-4 h-4 text-[#6B7280] group-hover:translate-x-1 group-hover:text-[#4F46E5] transition-all" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard
