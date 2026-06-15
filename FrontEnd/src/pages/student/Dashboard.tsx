import React, { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../store/authStore'
import { BookOpen, CheckCircle, Clock, AlertTriangle, ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import LoadingSpinner from '../../components/LoadingSpinner'

interface Experiment {
  id: string
  title: string
  subject: string
  deadline: string
  description: string
}

interface Assignment {
  id: string
  assigned_at: string
  status: 'pending' | 'submitted' | 'late' | 'verified'
  experiments: Experiment
}

export const Dashboard: React.FC = () => {
  const { user } = useAuthStore()
  const [loading, setLoading] = useState(true)
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [stats, setStats] = useState({
    total: 0,
    submitted: 0,
    pending: 0,
    late: 0,
  })

  useEffect(() => {
    if (!user) return

    const fetchDashboardData = async () => {
      try {
        const { data, error } = await supabase
          .from('experiment_assignments')
          .select(`
            id,
            assigned_at,
            status,
            experiments (
              id,
              title,
              subject,
              deadline,
              description
            )
          `)
          .eq('student_id', user.id)

        if (error) throw error

        if (data) {
          const formattedData = data.map((item: any) => ({
            id: item.id,
            assigned_at: item.assigned_at,
            status: item.status,
            experiments: Array.isArray(item.experiments) ? item.experiments[0] : item.experiments
          })) as Assignment[]

          setAssignments(formattedData)

          const total = formattedData.length
          const submitted = formattedData.filter(
            (a) => a.status === 'submitted' || a.status === 'verified'
          ).length
          const pending = formattedData.filter((a) => a.status === 'pending').length
          const late = formattedData.filter((a) => a.status === 'late').length

          setStats({ total, submitted, pending, late })
        }
      } catch (err) {
        console.error('Error fetching student dashboard details:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchDashboardData()
  }, [user])

  if (loading) {
    return <LoadingSpinner className="min-h-[400px]" size={40} />
  }

  const recentAssignments = assignments.slice(0, 5)
  const todayFormatted = new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
  const userFullName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Student'

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Premium Academic Hero Banner */}
      <div 
        className="relative overflow-hidden rounded-[24px] p-8 text-white shadow-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-6"
        style={{ background: 'linear-gradient(135deg, #4338CA 0%, #1E3A8A 100%)' }}
      >
        <div className="space-y-2 z-10">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 text-[11px] font-bold tracking-wider uppercase bg-white/10 border border-white/20 rounded-full text-indigo-100">
            {todayFormatted}
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            Welcome back, {userFullName}!
          </h2>
          <p className="text-indigo-200/90 text-sm max-w-xl font-medium">
            Monitor your assigned laboratory experiments, verify codes, and track academic evaluation statuses seamlessly.
          </p>
        </div>

        {/* Status Chips inside Banner */}
        <div className="flex flex-wrap gap-2.5 z-10">
          <span className="px-3.5 py-1.5 bg-white/10 hover:bg-white/15 border border-white/10 rounded-xl text-xs font-bold text-white transition cursor-default">
            📢 {stats.pending} Labs Pending
          </span>
          <span className="px-3.5 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/25 border border-emerald-500/20 rounded-xl text-xs font-bold text-emerald-200 transition cursor-default">
            ✓ {stats.submitted} Completed
          </span>
          <span className="px-3.5 py-1.5 bg-indigo-500/20 hover:bg-indigo-500/25 border border-indigo-500/20 rounded-xl text-xs font-bold text-indigo-200 transition cursor-default">
            📚 {stats.total} Total Assigned
          </span>
        </div>

        {/* Decorative subtle circles in background */}
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-white/5 rounded-full blur-xl pointer-events-none"></div>
        <div className="absolute -bottom-12 -left-12 w-64 h-64 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none"></div>
      </div>

      {/* Stats Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-2xl p-6 shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1 flex items-center gap-4 group">
          <div className="p-3 bg-[#EEF2FF] rounded-xl text-[#4F46E5] group-hover:scale-110 transition duration-300">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-[#6B7280] font-semibold uppercase tracking-wider">Total Labs</p>
            <p className="text-3xl font-black text-[#111827] mt-1">{stats.total}</p>
          </div>
        </div>

        <div className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-2xl p-6 shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1 flex items-center gap-4 group">
          <div className="p-3 bg-[#FEF3C7] rounded-xl text-[#D97706] group-hover:scale-110 transition duration-300">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-[#6B7280] font-semibold uppercase tracking-wider">Pending</p>
            <p className="text-3xl font-black text-[#111827] mt-1">{stats.pending}</p>
          </div>
        </div>

        <div className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-2xl p-6 shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1 flex items-center gap-4 group">
          <div className="p-3 bg-[#D1FAE5] rounded-xl text-[#10B981] group-hover:scale-110 transition duration-300">
            <CheckCircle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-[#6B7280] font-semibold uppercase tracking-wider">Submitted</p>
            <p className="text-3xl font-black text-[#111827] mt-1">{stats.submitted}</p>
          </div>
        </div>

        <div className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-2xl p-6 shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1 flex items-center gap-4 group">
          <div className="p-3 bg-[#FEE2E2] rounded-xl text-[#EF4444] group-hover:scale-110 transition duration-300">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-[#6B7280] font-semibold uppercase tracking-wider">Late</p>
            <p className="text-3xl font-black text-[#111827] mt-1">{stats.late}</p>
          </div>
        </div>
      </div>

      {/* Recent Experiments Panel */}
      <div className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-[24px] shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-[#E5E7EB] flex items-center justify-between">
          <h3 className="text-lg font-bold text-[#111827]">Recent Experiments</h3>
          <Link
            to="/student/experiments"
            className="text-xs font-bold text-[#4F46E5] hover:text-[#4338CA] transition flex items-center gap-1 cursor-pointer"
          >
            View all
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          {recentAssignments.length > 0 ? (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#E5E7EB] text-xs font-semibold text-[#6B7280] uppercase bg-[#F8FAFC]">
                  <th className="px-6 py-4">Title</th>
                  <th className="px-6 py-4">Subject</th>
                  <th className="px-6 py-4">Deadline</th>
                  <th className="px-6 py-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB]/60 text-sm">
                {recentAssignments.map((assignment) => {
                  const deadlineDate = assignment.experiments?.deadline
                    ? new Date(assignment.experiments.deadline).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : 'No deadline'

                  const statusStyles: Record<string, string> = {
                    pending: 'bg-[#FEF3C7] text-[#D97706] border-[#FEF3C7]',
                    submitted: 'bg-[#EEF2FF] text-[#4F46E5] border-[#EEF2FF]',
                    verified: 'bg-[#D1FAE5] text-[#10B981] border-[#D1FAE5]',
                    late: 'bg-[#FEE2E2] text-[#EF4444] border-[#FEE2E2]',
                  }

                  const displayStatus = assignment.status ? assignment.status.toUpperCase() : ''

                  return (
                    <tr key={assignment.id} className="hover:bg-[#F8FAFC]/80 transition-colors">
                      <td className="px-6 py-4 font-bold text-[#111827]">
                        {assignment.experiments?.title || 'Untitled Experiment'}
                      </td>
                      <td className="px-6 py-4 text-[#6B7280] font-semibold">
                        {assignment.experiments?.subject || 'General'}
                      </td>
                      <td className="px-6 py-4 text-[#6B7280] font-medium">
                        {deadlineDate}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-block px-2.5 py-0.5 text-xs font-bold rounded-full border ${statusStyles[assignment.status] || 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                          {displayStatus}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          ) : (
            <div className="px-6 py-12 text-center text-[#6B7280] text-sm">
              No experiments have been assigned to you yet.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Dashboard
