import React, { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../store/authStore'
import { Calendar, Clock, HelpCircle, X, Play } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import LoadingSpinner from '../../components/LoadingSpinner'

interface Experiment {
  id: string
  title: string
  subject: string
  deadline: string
  description: string
  instructions_url?: string
}

interface Assignment {
  id: string
  assigned_at: string
  status: 'pending' | 'submitted' | 'late' | 'verified'
  experiments: Experiment
}

type FilterStatus = 'all' | 'pending' | 'submitted' | 'late'

export const Experiments: React.FC = () => {
  const { user } = useAuthStore()
  const [loading, setLoading] = useState(true)
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [filter, setFilter] = useState<FilterStatus>('all')
  const [selectedExperiment, setSelectedExperiment] = useState<Experiment | null>(null)
  const [selectedAssignmentStatus, setSelectedAssignmentStatus] = useState<string>('')
  const navigate = useNavigate()

  useEffect(() => {
    if (!user) return

    const fetchExperiments = async () => {
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
              description,
              instructions_url
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
        }
      } catch (err) {
        console.error('Error fetching student experiments:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchExperiments()
  }, [user])

  const getCountdown = (deadlineStr: string) => {
    const deadline = new Date(deadlineStr)
    const now = new Date()
    const diffTime = deadline.getTime() - now.getTime()
    if (diffTime < 0) {
      return 'Deadline passed'
    }
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
    const diffHours = Math.floor((diffTime % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
    if (diffDays > 0) {
      return `${diffDays}d ${diffHours}h remaining`
    }
    const diffMinutes = Math.floor((diffTime % (1000 * 60 * 60)) / (1000 * 60))
    return `${diffHours}h ${diffMinutes}m remaining`
  }

  const filteredAssignments = assignments.filter((a) => {
    if (filter === 'all') return true
    if (filter === 'submitted') return a.status === 'submitted' || a.status === 'verified'
    return a.status === filter
  })

  if (loading) {
    return <LoadingSpinner className="min-h-[400px]" size={40} />
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white mb-1">My Experiments</h2>
          <p className="text-slate-400 text-sm">View, inspect and submit code for assigned lab experiments.</p>
        </div>

        <div className="flex bg-[#1E293B] border border-slate-800 rounded-lg p-1 shrink-0 self-start md:self-auto">
          {(['all', 'pending', 'submitted', 'late'] as FilterStatus[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-all uppercase tracking-wider cursor-pointer ${
                filter === tab
                  ? 'bg-[#6366F1] text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {filteredAssignments.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAssignments.map((assignment) => {
            const exp = assignment.experiments
            const deadlineFormatted = new Date(exp.deadline).toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })
            const countdownText = getCountdown(exp.deadline)

            const statusStyles: Record<string, string> = {
              pending: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
              submitted: 'bg-[#6366F1]/10 text-[#6366F1] border-[#6366F1]/20',
              verified: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
              late: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
            }

            return (
              <div
                key={assignment.id}
                onClick={() => {
                  setSelectedExperiment(exp)
                  setSelectedAssignmentStatus(assignment.status)
                }}
                className="bg-[#1E293B] border border-slate-800/80 rounded-xl p-5 hover:border-slate-700/80 hover:shadow-xl transition-all duration-300 flex flex-col justify-between cursor-pointer group"
              >
                <div>
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <span className="text-xs font-semibold text-slate-400 bg-slate-800 px-2.5 py-1 rounded">
                      {exp.subject}
                    </span>
                    <span className={`px-2 py-0.5 text-[10px] font-bold rounded border uppercase ${statusStyles[assignment.status]}`}>
                      {assignment.status}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-white group-hover:text-[#6366F1] transition-colors mb-2 line-clamp-1">
                    {exp.title}
                  </h3>
                  <p className="text-xs text-slate-400 line-clamp-2 mb-4 leading-relaxed">
                    {exp.description}
                  </p>
                </div>

                <div className="pt-4 border-t border-slate-800/60 flex flex-col gap-2.5">
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <Calendar className="w-4 h-4 shrink-0 text-slate-500" />
                    <span>Deadline: {deadlineFormatted}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <Clock className="w-4 h-4 shrink-0 text-slate-500" />
                    <span className={countdownText === 'Deadline passed' ? 'text-rose-400 font-medium' : 'text-slate-400'}>
                      {countdownText}
                    </span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="bg-[#1E293B] border border-slate-800 rounded-xl p-12 text-center text-slate-400 text-sm max-w-xl mx-auto shadow-md">
          <HelpCircle className="w-12 h-12 text-slate-600 mx-auto mb-4" />
          No experiments found matching the "{filter}" filter.
        </div>
      )}

      {selectedExperiment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSelectedExperiment(null)}></div>

          <div className="relative w-full max-w-lg bg-[#1E293B] border border-slate-800 rounded-2xl shadow-2xl p-6 md:p-8 text-slate-100 z-10 animate-scaleUp">
            <button
              onClick={() => setSelectedExperiment(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="w-6 h-6" />
            </button>

            <span className="text-xs font-semibold text-[#6366F1] bg-[#6366F1]/10 border border-[#6366F1]/20 px-2.5 py-1 rounded-md mb-4 inline-block">
              {selectedExperiment.subject}
            </span>

            <h3 className="text-xl font-bold text-white mb-4 pr-6">
              {selectedExperiment.title}
            </h3>

            <div className="space-y-4 mb-6">
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Description</h4>
                <p className="text-sm text-slate-300 leading-relaxed max-h-40 overflow-y-auto pr-2">
                  {selectedExperiment.description}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-800">
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Deadline</h4>
                  <p className="text-xs font-medium text-slate-300">
                    {new Date(selectedExperiment.deadline).toLocaleString()}
                  </p>
                </div>
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Time Remaining</h4>
                  <p className="text-xs font-medium text-slate-300">
                    {getCountdown(selectedExperiment.deadline)}
                  </p>
                </div>
              </div>

              {selectedExperiment.instructions_url && (
                <div className="pt-4 border-t border-slate-800">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Resources</h4>
                  <a
                    href={selectedExperiment.instructions_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-[#6366F1] hover:underline font-semibold"
                  >
                    View instructions document
                  </a>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
              <button
                onClick={() => setSelectedExperiment(null)}
                className="px-4 py-2 border border-slate-700 hover:border-slate-600 rounded-lg text-xs font-semibold text-slate-300 hover:text-white transition cursor-pointer"
              >
                Close
              </button>
              {(selectedAssignmentStatus === 'pending' || selectedAssignmentStatus === 'late') && (
                <button
                  onClick={() => {
                    setSelectedExperiment(null)
                    navigate(`/student/submit?experimentId=${selectedExperiment.id}`)
                  }}
                  className="px-4 py-2 bg-[#6366F1] hover:bg-[#5053db] rounded-lg text-xs font-bold text-white transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  Submit Code
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Experiments
