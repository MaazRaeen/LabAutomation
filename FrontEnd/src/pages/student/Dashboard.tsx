import React, { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../store/authStore'
import { BookOpen, CheckCircle, Clock, AlertTriangle, ArrowRight, Loader2 } from 'lucide-react'
import { Link } from 'react-router-dom'

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
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-[#6366F1] animate-spin" />
      </div>
    )
  }

  const recentAssignments = assignments.slice(0, 5)

  return (
    <div className="space-y-8 animate-fadeIn">
      <div>
        <h2 className="text-2xl font-bold text-white mb-1">Overview</h2>
        <p className="text-slate-400 text-sm">Track your laboratory experiments, deadlines, and evaluations.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-[#1E293B] border border-slate-800 rounded-xl p-6 shadow-lg flex items-center gap-4">
          <div className="p-3 bg-[#6366F1]/10 rounded-lg text-[#6366F1]">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Total Labs</p>
            <p className="text-2xl font-bold text-white mt-1">{stats.total}</p>
          </div>
        </div>

        <div className="bg-[#1E293B] border border-slate-800 rounded-xl p-6 shadow-lg flex items-center gap-4">
          <div className="p-3 bg-amber-500/10 rounded-lg text-amber-500">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Pending</p>
            <p className="text-2xl font-bold text-white mt-1">{stats.pending}</p>
          </div>
        </div>

        <div className="bg-[#1E293B] border border-slate-800 rounded-xl p-6 shadow-lg flex items-center gap-4">
          <div className="p-3 bg-emerald-500/10 rounded-lg text-emerald-500">
            <CheckCircle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Submitted</p>
            <p className="text-2xl font-bold text-white mt-1">{stats.submitted}</p>
          </div>
        </div>

        <div className="bg-[#1E293B] border border-slate-800 rounded-xl p-6 shadow-lg flex items-center gap-4">
          <div className="p-3 bg-rose-500/10 rounded-lg text-rose-500">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Late</p>
            <p className="text-2xl font-bold text-white mt-1">{stats.late}</p>
          </div>
        </div>
      </div>

      <div className="bg-[#1E293B] border border-slate-800 rounded-xl shadow-lg overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-800 flex items-center justify-between">
          <h3 className="text-lg font-bold text-white">Recent Experiments</h3>
          <Link
            to="/student/experiments"
            className="text-xs font-semibold text-[#6366F1] hover:text-[#5053db] transition flex items-center gap-1"
          >
            View all
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          {recentAssignments.length > 0 ? (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-xs font-semibold text-slate-400 uppercase bg-[#182235]/40">
                  <th className="px-6 py-4">Title</th>
                  <th className="px-6 py-4">Subject</th>
                  <th className="px-6 py-4">Deadline</th>
                  <th className="px-6 py-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-sm">
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
                    pending: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
                    submitted: 'bg-[#6366F1]/10 text-[#6366F1] border-[#6366F1]/20',
                    verified: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
                    late: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
                  }

                  const displayStatus = assignment.status ? assignment.status.toUpperCase() : ''

                  return (
                    <tr key={assignment.id} className="hover:bg-slate-800/20 transition-colors">
                      <td className="px-6 py-4 font-semibold text-white">
                        {assignment.experiments?.title || 'Untitled Experiment'}
                      </td>
                      <td className="px-6 py-4 text-slate-300">
                        {assignment.experiments?.subject || 'General'}
                      </td>
                      <td className="px-6 py-4 text-slate-400">
                        {deadlineDate}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-block px-2.5 py-0.5 text-xs font-bold rounded-full border ${statusStyles[assignment.status] || 'bg-slate-500/10 text-slate-400 border-slate-500/20'}`}>
                          {displayStatus}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          ) : (
            <div className="px-6 py-12 text-center text-slate-400 text-sm">
              No experiments have been assigned to you yet.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Dashboard
