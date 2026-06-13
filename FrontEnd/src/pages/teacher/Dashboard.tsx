import React, { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../store/authStore'
import { BookOpen, Clock, CheckSquare, Award, ArrowRight, Loader2, RefreshCw } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'

interface RecentSubmission {
  id: string
  submitted_at: string
  is_late: boolean
  version: number
  experiment: {
    id: string
    title: string
  }
  student: {
    full_name: string
    enrollment_no: string
  }
  evaluations: Array<{
    id: string
  }>
}

export const Dashboard: React.FC = () => {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [recentSubmissions, setRecentSubmissions] = useState<RecentSubmission[]>([])
  const [stats, setStats] = useState({
    totalExperiments: 0,
    pendingSubmissions: 0,
    pendingVerifications: 0,
    evaluationsDone: 0,
  })

  const fetchDashboardData = async (isRefresh = false) => {
    if (!user) return
    if (isRefresh) setRefreshing(true)
    else setLoading(true)

    try {
      // 1. Total Experiments Created by Teacher
      const { count: expCount, error: expError } = await supabase
        .from('experiments')
        .select('id', { count: 'exact', head: true })
        .eq('created_by', user.id)

      if (expError) throw expError

      // 2. Evaluations Done by Teacher
      const { count: evalCount, error: evalError } = await supabase
        .from('evaluations')
        .select('id', { count: 'exact', head: true })
        .eq('teacher_id', user.id)

      if (evalError) throw evalError

      // 3. Lab Files Pending Verification
      // Fetch status of lab records for teacher's experiments
      const { data: labRecords, error: labError } = await supabase
        .from('lab_records')
        .select(`
          id,
          status,
          experiments!inner (
            created_by
          )
        `)
        .eq('experiments.created_by', user.id)
        .in('status', ['pending', 'submitted'])

      if (labError) throw labError
      const pendingVerificationsCount = labRecords ? labRecords.length : 0

      // 4. Fetch all submissions for the teacher's experiments to calculate pending reviews
      // and display the recent submissions list
      const { data: submissionsData, error: subsError } = await supabase
        .from('code_submissions')
        .select(`
          id,
          submitted_at,
          is_late,
          version,
          experiments!inner (
            id,
            title,
            created_by
          ),
          profiles!code_submissions_student_id_fkey (
            full_name,
            enrollment_no
          ),
          evaluations (
            id
          )
        `)
        .eq('experiments.created_by', user.id)
        .order('submitted_at', { ascending: false })

      if (subsError) throw subsError

      let pendingReviewsCount = 0
      const formattedSubmissions: RecentSubmission[] = []

      if (submissionsData) {
        submissionsData.forEach((item: any) => {
          const isEvaluated = item.evaluations && item.evaluations.length > 0
          if (!isEvaluated) {
            pendingReviewsCount++
          }

          formattedSubmissions.push({
            id: item.id,
            submitted_at: item.submitted_at,
            is_late: item.is_late,
            version: item.version,
            experiment: Array.isArray(item.experiments) ? item.experiments[0] : item.experiments,
            student: Array.isArray(item.profiles) ? item.profiles[0] : item.profiles,
            evaluations: item.evaluations || [],
          })
        })
      }

      setStats({
        totalExperiments: expCount || 0,
        pendingSubmissions: pendingReviewsCount,
        pendingVerifications: pendingVerificationsCount,
        evaluationsDone: evalCount || 0,
      })

      // Show top 5 recent submissions
      setRecentSubmissions(formattedSubmissions.slice(0, 5))
    } catch (err) {
      console.error('Error fetching teacher dashboard data:', err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchDashboardData()
  }, [user])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-[#6366F1] animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white mb-1">Teacher Dashboard</h2>
          <p className="text-slate-400 text-sm">Monitor experiments, evaluate student code, and verify lab files.</p>
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
        {/* Total Experiments */}
        <div className="bg-[#1E293B] border border-slate-800 rounded-xl p-6 shadow-lg hover:border-slate-700/80 transition-all duration-300 flex items-center gap-4 group">
          <div className="p-3 bg-[#6366F1]/10 rounded-lg text-[#6366F1] group-hover:scale-110 transition-transform duration-300">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Total Labs Created</p>
            <p className="text-2xl font-bold text-white mt-1">{stats.totalExperiments}</p>
          </div>
        </div>

        {/* Pending Submissions */}
        <div className="bg-[#1E293B] border border-slate-800 rounded-xl p-6 shadow-lg hover:border-slate-700/80 transition-all duration-300 flex items-center gap-4 group">
          <div className="p-3 bg-amber-500/10 rounded-lg text-amber-500 group-hover:scale-110 transition-transform duration-300">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Submissions to Review</p>
            <p className="text-2xl font-bold text-white mt-1">{stats.pendingSubmissions}</p>
          </div>
        </div>

        {/* Pending Verifications */}
        <div className="bg-[#1E293B] border border-slate-800 rounded-xl p-6 shadow-lg hover:border-slate-700/80 transition-all duration-300 flex items-center gap-4 group">
          <div className="p-3 bg-teal-500/10 rounded-lg text-teal-400 group-hover:scale-110 transition-transform duration-300">
            <CheckSquare className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Lab Files to Verify</p>
            <p className="text-2xl font-bold text-white mt-1">{stats.pendingVerifications}</p>
          </div>
        </div>

        {/* Evaluations Done */}
        <div className="bg-[#1E293B] border border-slate-800 rounded-xl p-6 shadow-lg hover:border-slate-700/80 transition-all duration-300 flex items-center gap-4 group">
          <div className="p-3 bg-emerald-500/10 rounded-lg text-emerald-400 group-hover:scale-110 transition-transform duration-300">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Evaluations Completed</p>
            <p className="text-2xl font-bold text-white mt-1">{stats.evaluationsDone}</p>
          </div>
        </div>
      </div>

      {/* Recent Submissions Table */}
      <div className="bg-[#1E293B] border border-slate-800 rounded-xl shadow-lg overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-800 flex items-center justify-between">
          <h3 className="text-lg font-bold text-white">Recent Student Submissions</h3>
          <Link
            to="/teacher/submissions"
            className="text-xs font-semibold text-[#6366F1] hover:text-[#5053db] transition flex items-center gap-1 cursor-pointer"
          >
            View all submissions
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          {recentSubmissions.length > 0 ? (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-xs font-semibold text-slate-400 uppercase bg-[#182235]/40">
                  <th className="px-6 py-4">Student</th>
                  <th className="px-6 py-4">Experiment</th>
                  <th className="px-6 py-4">Submitted At</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-sm">
                {recentSubmissions.map((sub) => {
                  const submittedAtFormatted = new Date(sub.submitted_at).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })

                  const isEvaluated = sub.evaluations && sub.evaluations.length > 0

                  return (
                    <tr key={sub.id} className="hover:bg-slate-800/20 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-semibold text-white">
                          {sub.student?.full_name || 'Unknown Student'}
                        </div>
                        <div className="text-xs text-slate-500 font-medium">
                          {sub.student?.enrollment_no || 'N/A'}
                        </div>
                      </td>
                      <td className="px-6 py-4 font-medium text-slate-300">
                        {sub.experiment?.title || 'Untitled Experiment'}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-slate-300">{submittedAtFormatted}</div>
                        {sub.is_late && (
                          <span className="inline-block text-[10px] font-bold text-rose-400 bg-rose-500/10 px-1.5 py-0.2 rounded border border-rose-500/20 mt-1">
                            LATE
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {isEvaluated ? (
                          <span className="inline-block px-2.5 py-0.5 text-xs font-bold rounded-full border bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                            Evaluated
                          </span>
                        ) : (
                          <span className="inline-block px-2.5 py-0.5 text-xs font-bold rounded-full border bg-amber-500/10 text-amber-400 border-amber-500/20 animate-pulse">
                            Pending Review
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => navigate(`/teacher/submissions?submissionId=${sub.id}`)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                            isEvaluated
                              ? 'bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white'
                              : 'bg-[#6366F1] text-white hover:bg-[#5053db] hover:shadow-md'
                          }`}
                        >
                          {isEvaluated ? 'Review Marks' : 'Evaluate'}
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          ) : (
            <div className="px-6 py-12 text-center text-slate-400 text-sm">
              No student submissions found.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Dashboard
