import React, { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { apiPut } from '../../lib/api'
import { useAuthStore } from '../../store/authStore'
import { Loader2, CheckCircle2, XCircle, AlertCircle, X, Calendar } from 'lucide-react'
import { toast } from 'react-hot-toast'
import LoadingSpinner from '../../components/LoadingSpinner'

interface RevisionRequest {
  id: string
  original_marks: number
  requested_marks: number
  justification: string
  status: 'pending' | 'approved' | 'rejected'
  admin_note?: string
  created_at: string
  evaluation_id: string
  teacher: {
    id: string
    full_name: string
    enrollment_no: string
  }
  student: {
    full_name: string
    enrollment_no: string
  }
  experiment: {
    id: string
    title: string
    subject: string
  }
}

export const MarksRevision: React.FC = () => {
  const { user } = useAuthStore()
  const [loading, setLoading] = useState(true)
  const [requests, setRequests] = useState<RevisionRequest[]>([])
  
  // Modal State
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedRequest, setSelectedRequest] = useState<RevisionRequest | null>(null)
  const [actionType, setActionType] = useState<'approve' | 'reject' | null>(null)
  const [note, setNote] = useState('')
  const [savingAction, setSavingAction] = useState(false)

  const fetchRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('marks_revision_requests')
        .select(`
          id,
          original_marks,
          requested_marks,
          justification,
          status,
          admin_note,
          created_at,
          evaluation_id,
          teacher:profiles!marks_revision_requests_teacher_id_fkey (
            id,
            full_name,
            enrollment_no
          ),
          evaluations!inner (
            id,
            code_submissions!inner (
              id,
              student:profiles!code_submissions_student_id_fkey (
                full_name,
                enrollment_no
              ),
              experiments!inner (
                id,
                title,
                subject
              )
            )
          )
        `)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })

      if (error) throw error

      if (data) {
        const formatted = data.map((item: any) => {
          const evalObj = item.evaluations
          const subObj = evalObj?.code_submissions
          return {
            id: item.id,
            original_marks: item.original_marks,
            requested_marks: item.requested_marks,
            justification: item.justification,
            status: item.status,
            admin_note: item.admin_note,
            created_at: item.created_at,
            evaluation_id: item.evaluation_id,
            teacher: Array.isArray(item.teacher) ? item.teacher[0] : item.teacher,
            student: Array.isArray(subObj?.student) ? subObj.student[0] : subObj?.student,
            experiment: Array.isArray(subObj?.experiments) ? subObj.experiments[0] : subObj?.experiments
          }
        }).filter(r => r.teacher && r.student && r.experiment) as RevisionRequest[]

        setRequests(formatted)
      }
    } catch (err: any) {
      console.error('Error fetching marks revisions:', err)
      toast.error('Failed to load pending revisions list')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRequests()
  }, [user])

  const handleOpenActionModal = (req: RevisionRequest, type: 'approve' | 'reject') => {
    setSelectedRequest(req)
    setActionType(type)
    setNote('')
    setModalOpen(true)
  }

  const handleConfirmAction = async () => {
    if (!selectedRequest || !actionType) return
    setSavingAction(true)
    try {
      const targetStatus = actionType === 'approve' ? 'approved' : 'rejected'

      // PUT /api/marks-revisions/:id/review — backend handles:
      //   - evaluation marks update (if approved)
      //   - revision request status + admin_note update
      //   - teacher notification
      //   - audit log
      await apiPut(`/api/marks-revisions/${selectedRequest.id}/review`, {
        status: targetStatus,
        admin_note: note.trim() || null,
      })

      toast.success(`Marks revision request successfully ${targetStatus}!`)
      setModalOpen(false)
      setSelectedRequest(null)
      setActionType(null)
      setNote('')
      fetchRequests()
    } catch (err: any) {
      toast.error(err.message || 'Operation failed')
      console.error(err)
    } finally {
      setSavingAction(false)
    }
  }

  if (loading) {
    return <LoadingSpinner className="min-h-[400px]" size={40} />
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-white mb-1">Marks Revision Requests</h2>
        <p className="text-slate-400 text-sm">Review, approve, or reject student marks adjustments requested by teachers.</p>
      </div>

      {/* Requests Table */}
      <div className="bg-[#1E293B] border border-slate-800 rounded-xl shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          {requests.length > 0 ? (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-xs font-semibold text-slate-400 uppercase bg-[#182235]/40">
                  <th className="px-6 py-4">Student</th>
                  <th className="px-6 py-4">Requested By (Teacher)</th>
                  <th className="px-6 py-4">Experiment Details</th>
                  <th className="px-6 py-4">Revision Justification</th>
                  <th className="px-6 py-4">Requested At</th>
                  <th className="px-6 py-4 text-center">Marks Shift</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-sm">
                {requests.map((req) => {
                  const requestedTime = new Date(req.created_at).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })

                  return (
                    <tr key={req.id} className="hover:bg-slate-800/20 transition-colors">
                      {/* Student Name */}
                      <td className="px-6 py-4">
                        <div className="font-semibold text-white">
                          {req.student?.full_name}
                        </div>
                        <div className="text-xs text-slate-500 font-medium font-mono">
                          {req.student?.enrollment_no}
                        </div>
                      </td>

                      {/* Teacher Name */}
                      <td className="px-6 py-4 font-medium text-slate-300">
                        {req.teacher?.full_name}
                      </td>

                      {/* Experiment Title */}
                      <td className="px-6 py-4">
                        <div className="font-semibold text-slate-300">
                          {req.experiment?.title}
                        </div>
                        <div className="text-xs text-slate-500 font-medium">
                          {req.experiment?.subject}
                        </div>
                      </td>

                      {/* Justification Details */}
                      <td className="px-6 py-4 max-w-[200px]">
                        <p className="text-slate-350 text-xs leading-relaxed line-clamp-2" title={req.justification}>
                          {req.justification}
                        </p>
                      </td>

                      {/* Requested At */}
                      <td className="px-6 py-4 text-slate-400">
                        <div className="flex items-center gap-1.5 text-xs">
                          <Calendar className="w-3.5 h-3.5 text-slate-500" />
                          <span>{requestedTime}</span>
                        </div>
                      </td>

                      {/* Marks Awarded Shift */}
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-1.5 font-bold">
                          <span className="text-rose-400 text-xs line-through">{req.original_marks}</span>
                          <span className="text-slate-400 text-[10px]">→</span>
                          <span className="text-emerald-400 text-sm">{req.requested_marks}</span>
                        </div>
                      </td>

                      {/* Action buttons */}
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleOpenActionModal(req, 'reject')}
                            className="px-2.5 py-1.5 border border-rose-500/20 hover:border-rose-500 bg-rose-500/10 hover:bg-rose-500 text-rose-450 hover:text-white rounded-lg text-xs font-bold transition cursor-pointer"
                          >
                            Reject
                          </button>
                          <button
                            onClick={() => handleOpenActionModal(req, 'approve')}
                            className="px-2.5 py-1.5 bg-[#6366F1] hover:bg-[#5053db] hover:shadow text-white rounded-lg text-xs font-bold transition cursor-pointer"
                          >
                            Approve
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          ) : (
            <div className="px-6 py-16 text-center text-slate-400 text-sm">
              <AlertCircle className="w-12 h-12 text-slate-600 mx-auto mb-4" />
              <p className="font-bold text-white mb-1 font-semibold">No Pending Revisions</p>
              <p className="text-slate-400 text-xs">There are currently no pending grade revision requests waiting for approval.</p>
            </div>
          )}
        </div>
      </div>

      {/* Confirmation & Note Modal */}
      {modalOpen && selectedRequest && actionType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fadeIn">
          {/* Overlay backdrop */}
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm" 
            onClick={() => !savingAction && setModalOpen(false)}
          ></div>

          {/* Modal Content */}
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
              {actionType} Marks Revision
            </h3>
            <p className="text-slate-400 text-xs mb-6">
              Review and finalize this marks adjustment request. You can provide an optional feedback note.
            </p>

            {/* Details Box */}
            <div className="bg-[#0F172A] border border-slate-850 p-4 rounded-xl space-y-2 text-xs mb-5">
              <div className="flex justify-between">
                <span className="text-slate-500 font-semibold uppercase">Student</span>
                <span className="text-white font-bold">{selectedRequest.student?.full_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-semibold uppercase">Requested By</span>
                <span className="text-slate-350 font-medium">{selectedRequest.teacher?.full_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-semibold uppercase">Marks Shift</span>
                <div className="font-bold flex gap-1">
                  <span className="text-rose-400 line-through">{selectedRequest.original_marks}</span>
                  <span>→</span>
                  <span className="text-emerald-400">{selectedRequest.requested_marks}</span>
                </div>
              </div>
              <div className="pt-2 border-t border-slate-800 flex flex-col gap-1 text-slate-300">
                <span className="text-slate-500 font-semibold uppercase">Teacher Justification:</span>
                <p className="text-slate-400 leading-relaxed bg-[#1E293B]/40 p-2.5 rounded border border-slate-850 max-h-24 overflow-y-auto whitespace-pre-wrap">
                  {selectedRequest.justification}
                </p>
              </div>
            </div>

            {/* Admin Note textarea */}
            <div className="space-y-2 mb-6">
              <label className="block text-slate-300 text-xs font-semibold uppercase tracking-wider" htmlFor="adminNote">
                Admin Note / Remarks
              </label>
              <textarea
                id="adminNote"
                rows={3}
                placeholder={actionType === 'reject' ? 'Explain the rejection reason... (Optional)' : 'e.g. Approved. Revision completed. (Optional)'}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full px-4 py-2.5 bg-[#0F172A] border border-slate-800 rounded-lg text-sm text-slate-200 placeholder-slate-650 focus:outline-none focus:ring-2 focus:ring-[#6366F1] focus:border-transparent transition resize-none"
                disabled={savingAction}
              />
            </div>

            {/* Actions Footer */}
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
                onClick={handleConfirmAction}
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

export default MarksRevision
