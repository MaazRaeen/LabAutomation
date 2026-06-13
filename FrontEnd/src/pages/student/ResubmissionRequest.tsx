import React, { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../store/authStore'
import { RefreshCw, Loader2, Clock, CheckCircle2, XCircle, AlertCircle, Send } from 'lucide-react'
import { toast } from 'react-hot-toast'
import LoadingSpinner from '../../components/LoadingSpinner'

interface Experiment {
  id: string
  title: string
  subject: string
}

interface Assignment {
  id: string
  experiments: Experiment
}

interface ResubmissionRequestItem {
  id: string
  justification: string
  status: 'pending' | 'approved' | 'rejected'
  teacher_note?: string
  created_at: string
  experiments: {
    id: string
    title: string
    subject: string
  }
}

export const ResubmissionRequest: React.FC = () => {
  const { user } = useAuthStore()
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [requests, setRequests] = useState<ResubmissionRequestItem[]>([])
  
  const [experimentId, setExperimentId] = useState('')
  const [justification, setJustification] = useState('')

  const fetchRequestsAndAssignments = async () => {
    if (!user) return
    try {
      // 1. Fetch Assigned Experiments
      const { data: assignmentsData, error: assignmentsError } = await supabase
        .from('experiment_assignments')
        .select(`
          id,
          experiments (
            id,
            title,
            subject
          )
        `)
        .eq('student_id', user.id)

      if (assignmentsError) throw assignmentsError

      if (assignmentsData) {
        const formatted = assignmentsData.map((item: any) => ({
          id: item.id,
          experiments: Array.isArray(item.experiments) ? item.experiments[0] : item.experiments
        })).filter(a => a.experiments) as Assignment[]
        setAssignments(formatted)
      }

      // 2. Fetch Resubmission Requests
      const { data: requestsData, error: requestsError } = await supabase
        .from('resubmission_requests')
        .select(`
          id,
          justification,
          status,
          teacher_note,
          created_at,
          experiments (
            id,
            title,
            subject
          )
        `)
        .eq('student_id', user.id)
        .order('created_at', { ascending: false })

      if (requestsError) throw requestsError

      if (requestsData) {
        const formattedRequests = requestsData.map((item: any) => ({
          id: item.id,
          justification: item.justification,
          status: item.status,
          teacher_note: item.teacher_note,
          created_at: item.created_at,
          experiments: Array.isArray(item.experiments) ? item.experiments[0] : item.experiments
        })).filter(r => r.experiments) as ResubmissionRequestItem[]
        setRequests(formattedRequests)
      }
    } catch (err: any) {
      console.error('Error fetching resubmission request data:', err)
      toast.error('Failed to load resubmission request history')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRequestsAndAssignments()
  }, [user])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    if (!experimentId) {
      toast.error('Please select an experiment')
      return
    }
    if (!justification.trim()) {
      toast.error('Please provide a justification details')
      return
    }

    setSubmitting(true)
    try {
      // Insert request
      const { error } = await supabase
        .from('resubmission_requests')
        .insert({
          student_id: user.id,
          experiment_id: experimentId,
          justification: justification.trim(),
          status: 'pending'
        })

      if (error) throw error

      toast.success('Resubmission request submitted successfully!')
      setJustification('')
      setExperimentId('')
      
      // Refresh requests list
      fetchRequestsAndAssignments()
    } catch (err: any) {
      toast.error(err.message || 'Request submission failed')
      console.error(err)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return <LoadingSpinner className="min-h-[400px]" size={40} />
  }

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-white mb-1">Resubmission Requests</h2>
        <p className="text-slate-400 text-sm">Request permission to submit code or file revisions for graded or locked experiments.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Request Form */}
        <div className="lg:col-span-5 bg-[#1E293B] border border-slate-800 rounded-2xl p-6 md:p-8 shadow-xl self-start">
          <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
            <RefreshCw className="w-5 h-5 text-[#6366F1]" />
            Request Revision
          </h3>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Select Experiment */}
            <div>
              <label className="block text-slate-300 text-sm font-medium mb-2" htmlFor="experimentSelect">
                Select Experiment
              </label>
              <select
                id="experimentSelect"
                value={experimentId}
                onChange={(e) => setExperimentId(e.target.value)}
                className="w-full px-4 py-2.5 bg-[#0F172A] border border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6366F1] focus:border-transparent text-white text-sm transition cursor-pointer"
              >
                <option value="" disabled>Choose an experiment...</option>
                {assignments.map((assignment) => (
                  <option key={assignment.experiments.id} value={assignment.experiments.id}>
                    {assignment.experiments.subject} - {assignment.experiments.title}
                  </option>
                ))}
              </select>
            </div>

            {/* Justification Textarea */}
            <div>
              <label className="block text-slate-300 text-sm font-medium mb-2" htmlFor="justification">
                Justification & Details
              </label>
              <textarea
                id="justification"
                rows={5}
                required
                placeholder="Explain why you need a resubmission. Include any context, details, or reasons..."
                value={justification}
                onChange={(e) => setJustification(e.target.value)}
                className="w-full px-4 py-2.5 bg-[#0F172A] border border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6366F1] focus:border-transparent text-white text-sm transition resize-none"
              />
            </div>

            {/* Submit button */}
            <button
              type="submit"
              disabled={submitting || !experimentId || !justification.trim()}
              className="w-full py-2.5 px-4 bg-[#6366F1] hover:bg-[#5053db] disabled:bg-slate-800 disabled:text-slate-500 disabled:border disabled:border-slate-800 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl active:scale-[0.98] transition flex justify-center items-center text-sm disabled:cursor-not-allowed"
            >
              {submitting ? (
                <>
                  <Loader2 className="animate-spin h-5 w-5 mr-2" />
                  Submitting Request...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Submit Request
                </>
              )}
            </button>
          </form>
        </div>

        {/* History of Requests */}
        <div className="lg:col-span-7 bg-[#1E293B] border border-slate-800 rounded-2xl p-6 md:p-8 shadow-xl">
          <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
            <Clock className="w-5 h-5 text-[#6366F1]" />
            Request History
          </h3>

          <div className="space-y-4">
            {requests.length > 0 ? (
              requests.map((req) => {
                const createdAtFormatted = new Date(req.created_at).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })

                const statusStyles = {
                  pending: {
                    badge: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
                    icon: Clock,
                  },
                  approved: {
                    badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
                    icon: CheckCircle2,
                  },
                  rejected: {
                    badge: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
                    icon: XCircle,
                  },
                }

                const config = statusStyles[req.status] || statusStyles.pending
                const StatusIcon = config.icon

                return (
                  <div 
                    key={req.id} 
                    className="p-5 bg-[#0F172A] border border-slate-800 rounded-xl space-y-3 hover:border-slate-700/80 transition duration-300"
                  >
                    {/* Top Row: Experiment & Status Badge */}
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                      <div>
                        <span className="text-[10px] font-bold text-slate-500 bg-slate-800 px-2 py-0.5 rounded uppercase tracking-wider">
                          {req.experiments?.subject}
                        </span>
                        <h4 className="text-sm font-bold text-white mt-1">
                          {req.experiments?.title}
                        </h4>
                      </div>
                      <span className={`self-start sm:self-auto inline-flex items-center gap-1.5 px-2.5 py-0.5 text-xs font-semibold rounded border uppercase ${config.badge}`}>
                        <StatusIcon className="w-3.5 h-3.5" />
                        {req.status}
                      </span>
                    </div>

                    {/* Justification Text */}
                    <div className="text-xs leading-relaxed text-slate-300 bg-[#1E293B]/40 p-3 rounded-lg border border-slate-850">
                      <p className="font-semibold text-slate-400 text-[10px] uppercase mb-1">Student Justification</p>
                      <p className="whitespace-pre-wrap">{req.justification}</p>
                    </div>

                    {/* Teacher Note / Feedback */}
                    {req.teacher_note && (
                      <div className="text-xs leading-relaxed text-slate-350 bg-[#6366F1]/5 p-3 rounded-lg border border-[#6366F1]/10">
                        <p className="font-bold text-[#6366F1] text-[10px] uppercase mb-1">Teacher Feedback</p>
                        <p className="whitespace-pre-wrap">{req.teacher_note}</p>
                      </div>
                    )}

                    {/* Footer Date */}
                    <div className="text-[10px] font-medium text-slate-500 flex justify-end">
                      Requested on {createdAtFormatted}
                    </div>
                  </div>
                )
              })
            ) : (
              <div className="text-center py-12 text-slate-400 text-sm bg-[#0F172A] border border-slate-800 rounded-xl p-8 shadow-sm">
                <AlertCircle className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                No resubmission requests found. Fill out the form above to submit your first request.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default ResubmissionRequest
