import React, { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { apiPut } from '../../lib/api'
import { useAuthStore } from '../../store/authStore'
import { RefreshCw, Loader2, Search, Filter, AlertCircle, CheckCircle2, XCircle, X } from 'lucide-react'
import { toast } from 'react-hot-toast'
import LoadingSpinner from '../../components/LoadingSpinner'

interface ResubmissionRequest {
  id: string
  justification: string
  status: 'pending' | 'approved' | 'rejected'
  teacher_note?: string
  created_at: string
  student_id: string
  experiment_id: string
  experiment: {
    id: string
    title: string
    subject: string
  }
  student: {
    id: string
    full_name: string
    enrollment_no: string
    department: string
  }
}

export const Resubmissions: React.FC = () => {
  const { user } = useAuthStore()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [requests, setRequests] = useState<ResubmissionRequest[]>([])

  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all')

  // Modal State
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedRequest, setSelectedRequest] = useState<ResubmissionRequest | null>(null)
  const [actionType, setActionType] = useState<'approve' | 'reject' | null>(null)
  const [note, setNote] = useState('')
  const [savingAction, setSavingAction] = useState(false)

  const fetchRequests = async (isRefresh = false) => {
    if (!user) return
    if (isRefresh) setRefreshing(true)
    else setLoading(true)

    try {
      const { data, error } = await supabase
        .from('resubmission_requests')
        .select(`
          id,
          justification,
          status,
          teacher_note,
          created_at,
          student_id,
          experiment_id,
          experiments!inner (
            id,
            title,
            subject,
            created_by
          ),
          profiles!resubmission_requests_student_id_fkey (
            id,
            full_name,
            enrollment_no,
            department
          )
        `)
        .eq('experiments.created_by', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error

      if (data) {
        const formatted = data.map((item: any) => ({
          id: item.id,
          justification: item.justification,
          status: item.status,
          teacher_note: item.teacher_note,
          created_at: item.created_at,
          student_id: item.student_id,
          experiment_id: item.experiment_id,
          experiment: Array.isArray(item.experiments) ? item.experiments[0] : item.experiments,
          student: Array.isArray(item.profiles) ? item.profiles[0] : item.profiles
        })).filter(r => r.experiment && r.student) as ResubmissionRequest[]
        setRequests(formatted)
      }
    } catch (err: any) {
      console.error('Error fetching resubmission requests:', err)
      toast.error('Failed to load resubmissions')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchRequests()
  }, [user])

  const handleOpenActionModal = (req: ResubmissionRequest, type: 'approve' | 'reject') => {
    setSelectedRequest(req)
    setActionType(type)
    setNote(req.teacher_note || '')
    setModalOpen(true)
  }

  const handleActionConfirm = async () => {
    if (!selectedRequest || !actionType) return
    setSavingAction(true)
    try {
      const newStatus = actionType === 'approve' ? 'approved' : 'rejected'

      // PUT /api/resubmissions/:id/review — backend handles:
      //   - status update + teacher_note
      //   - assignment reset to 'pending' if approved
      //   - student notification
      //   - audit log
      await apiPut(`/api/resubmissions/${selectedRequest.id}/review`, {
        status: newStatus,
        teacher_note: note.trim() || null,
      })

      toast.success(`Request successfully ${newStatus}!`)
      setModalOpen(false)
      setSelectedRequest(null)
      setActionType(null)
      setNote('')
      fetchRequests(false)
    } catch (err: any) {
      toast.error(err.message || 'Operation failed')
      console.error(err)
    } finally {
      setSavingAction(false)
    }
  }

  const filteredRequests = requests.filter(r => {
    const searchLower = searchQuery.toLowerCase()
    const matchesSearch = 
      r.student.full_name?.toLowerCase().includes(searchLower) ||
      r.student.enrollment_no?.toLowerCase().includes(searchLower) ||
      r.experiment.title?.toLowerCase().includes(searchLower) ||
      r.experiment.subject?.toLowerCase().includes(searchLower)

    const matchesStatus = statusFilter === 'all' || r.status === statusFilter

    return matchesSearch && matchesStatus
  })

  if (loading) {
    return <LoadingSpinner className="min-h-[400px]" size={40} />
  }

  return (
    <div className="space-y-6 relative animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white mb-1">Resubmission Requests</h2>
          <p className="text-slate-400 text-sm">Review, approve, or reject student requests to resubmit their lab assignments.</p>
        </div>
        <button
          onClick={() => fetchRequests(true)}
          disabled={refreshing}
          className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:text-white bg-[#1E293B] border border-slate-800 rounded-lg hover:border-slate-700 transition cursor-pointer self-start sm:self-auto disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-[#1E293B] border border-slate-800 p-5 rounded-xl space-y-4 shadow-lg">
        <div className="flex items-center gap-2 text-slate-300 text-xs font-bold uppercase tracking-wider">
          <Filter className="w-4 h-4 text-[#6366F1]" />
          <span>Filter Requests</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-center">
          {/* Search Input */}
          <div className="relative lg:col-span-2">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search student, enrollment, or experiment..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-[#0F172A] border border-slate-800 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#6366F1] focus:border-transparent transition"
            />
          </div>

          {/* Status Tab buttons */}
          <div className="lg:col-span-2 flex bg-[#0F172A] border border-slate-800 rounded-lg p-0.5 w-full">
            {(['all', 'pending', 'approved', 'rejected'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all uppercase tracking-wider cursor-pointer whitespace-nowrap ${
                  statusFilter === status
                    ? 'bg-[#6366F1] text-white shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Requests Table */}
      <div className="bg-[#1E293B] border border-slate-800 rounded-xl shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          {filteredRequests.length > 0 ? (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-xs font-semibold text-slate-400 uppercase bg-[#182235]/40">
                  <th className="px-6 py-4">Student</th>
                  <th className="px-6 py-4">Experiment</th>
                  <th className="px-6 py-4">Justification</th>
                  <th className="px-6 py-4">Requested At</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-sm">
                {filteredRequests.map((req) => {
                  const requestedAtFormatted = new Date(req.created_at).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })

                  const statusStyles = {
                    pending: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
                    approved: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
                    rejected: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
                  }

                  const isPending = req.status === 'pending'

                  return (
                    <tr key={req.id} className="hover:bg-slate-800/20 transition-colors">
                      {/* Student details */}
                      <td className="px-6 py-4">
                        <div className="font-semibold text-white">
                          {req.student?.full_name || 'Unknown'}
                        </div>
                        <div className="text-xs text-slate-500 font-medium">
                          {req.student?.enrollment_no || 'N/A'} • {req.student?.department || 'N/A'}
                        </div>
                      </td>

                      {/* Experiment details */}
                      <td className="px-6 py-4">
                        <div className="font-medium text-slate-300">
                          {req.experiment?.title || 'Untitled'}
                        </div>
                        <div className="text-xs text-slate-500 font-medium">
                          {req.experiment?.subject || 'N/A'}
                        </div>
                      </td>

                      {/* Justification summary */}
                      <td className="px-6 py-4 max-w-[240px]">
                        <p className="text-slate-300 line-clamp-2 text-xs leading-relaxed" title={req.justification}>
                          {req.justification}
                        </p>
                      </td>

                      {/* Requested At */}
                      <td className="px-6 py-4 text-slate-450">
                        {requestedAtFormatted}
                      </td>

                      {/* Status */}
                      <td className="px-6 py-4">
                        <span className={`inline-block px-2.5 py-0.5 text-xs font-semibold rounded border uppercase ${statusStyles[req.status]}`}>
                          {req.status}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 text-right">
                        {isPending ? (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleOpenActionModal(req, 'reject')}
                              className="px-2.5 py-1.5 border border-rose-500/20 hover:border-rose-500 bg-rose-500/10 hover:bg-rose-500 text-rose-450 hover:text-white rounded-lg text-xs font-bold transition cursor-pointer"
                            >
                              Reject
                            </button>
                            <button
                              onClick={() => handleOpenActionModal(req, 'approve')}
                              className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 hover:shadow text-white rounded-lg text-xs font-bold transition cursor-pointer"
                            >
                              Approve
                            </button>
                          </div>
                        ) : (
                          <div className="text-xs text-slate-500 italic font-medium pr-2">
                            {req.teacher_note ? (
                              <span className="truncate max-w-[120px] block" title={req.teacher_note}>
                                {req.teacher_note}
                              </span>
                            ) : (
                              'Processed'
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          ) : (
            <div className="px-6 py-16 text-center text-slate-400 text-sm">
              <AlertCircle className="w-12 h-12 text-slate-600 mx-auto mb-4" />
              No resubmission requests found matching current criteria.
            </div>
          )}
        </div>
      </div>

      {/* Confirmation & Note Modal */}
      {modalOpen && selectedRequest && actionType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Overlay backdrop */}
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fadeIn" 
            onClick={() => !savingAction && setModalOpen(false)}
          ></div>

          {/* Modal Container */}
          <div className="relative w-full max-w-md bg-[#1E293B] border border-slate-800 rounded-2xl shadow-2xl p-6 md:p-8 text-slate-100 z-10 animate-scaleUp">
            <button
              onClick={() => !savingAction && setModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white disabled:opacity-50"
              disabled={savingAction}
            >
              <X className="w-5 h-5" />
            </button>

            {/* Modal Title */}
            <h3 className="text-lg font-bold text-white mb-2 capitalize">
              {actionType} Resubmission Request
            </h3>
            <p className="text-slate-400 text-xs mb-6">
              Confirm your decision. An optional review note can be sent back to the student.
            </p>

            {/* Request Summary details */}
            <div className="bg-[#0F172A] border border-slate-850 p-4 rounded-xl space-y-2.5 text-xs mb-5">
              <div className="flex justify-between">
                <span className="text-slate-500 font-semibold uppercase">Student</span>
                <span className="text-white font-bold">
                  {selectedRequest.student?.full_name} ({selectedRequest.student?.enrollment_no})
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-semibold uppercase">Experiment</span>
                <span className="text-slate-300 font-semibold max-w-[200px] truncate" title={selectedRequest.experiment?.title}>
                  {selectedRequest.experiment?.title}
                </span>
              </div>
              <div className="pt-2 border-t border-slate-800 flex flex-col gap-1 text-slate-350">
                <span className="text-slate-500 font-semibold uppercase">Justification:</span>
                <p className="text-slate-300 leading-relaxed bg-[#1E293B]/35 p-2 rounded border border-slate-850 whitespace-pre-wrap max-h-24 overflow-y-auto">
                  {selectedRequest.justification}
                </p>
              </div>
            </div>

            {/* Note text field */}
            <div className="space-y-2 mb-6">
              <label className="block text-slate-350 text-xs font-semibold uppercase tracking-wider" htmlFor="actionNote">
                Feedback Note / Teacher Note
              </label>
              <textarea
                id="actionNote"
                rows={3}
                placeholder={actionType === 'reject' ? 'Explain the rejection reason... (Optional)' : 'e.g. Approved. You can resubmit now. (Optional)'}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full px-4 py-2.5 bg-[#0F172A] border border-slate-800 rounded-lg text-sm text-slate-200 placeholder-slate-650 focus:outline-none focus:ring-2 focus:ring-[#6366F1] focus:border-transparent transition resize-none"
                disabled={savingAction}
              />
            </div>

            {/* Action buttons */}
            <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="px-4 py-2 border border-slate-800 hover:border-slate-700 rounded-lg text-xs font-semibold text-slate-450 hover:text-white transition cursor-pointer"
                disabled={savingAction}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleActionConfirm}
                className={`px-4 py-2 text-white font-bold rounded-lg text-xs transition flex items-center gap-1.5 cursor-pointer shadow-md ${
                  actionType === 'approve'
                    ? 'bg-emerald-600 hover:bg-emerald-500'
                    : 'bg-rose-600 hover:bg-rose-500'
                }`}
                disabled={savingAction}
              >
                {savingAction ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    {actionType === 'approve' ? (
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    ) : (
                      <XCircle className="w-3.5 h-3.5" />
                    )}
                    <span className="capitalize">{actionType}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Resubmissions
