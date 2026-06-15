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
        <h2 className="text-3xl font-black text-[#111827] mb-1">Marks Revision Requests</h2>
        <p className="text-[#6B7280] text-sm">Review, approve, or reject student marks adjustments requested by teachers.</p>
      </div>

      {/* Requests Table */}
      <div className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-3xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          {requests.length > 0 ? (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#E5E7EB] text-xs font-semibold text-[#6B7280] uppercase bg-[#F8FAFC]">
                  <th className="px-6 py-4">Student</th>
                  <th className="px-6 py-4">Requested By (Teacher)</th>
                  <th className="px-6 py-4">Experiment Details</th>
                  <th className="px-6 py-4">Revision Justification</th>
                  <th className="px-6 py-4">Requested At</th>
                  <th className="px-6 py-4 text-center">Marks Shift</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB]/60 text-sm">
                {requests.map((req) => {
                  const requestedTime = new Date(req.created_at).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })

                  return (
                    <tr key={req.id} className="hover:bg-[#F8FAFC]/80 transition-colors">
                      {/* Student Name */}
                      <td className="px-6 py-4">
                        <div className="font-bold text-[#111827]">
                          {req.student?.full_name}
                        </div>
                        <div className="text-xs text-[#6B7280] font-semibold font-mono">
                          {req.student?.enrollment_no}
                        </div>
                      </td>

                      {/* Teacher Name */}
                      <td className="px-6 py-4 font-bold text-[#111827]">
                        {req.teacher?.full_name}
                      </td>

                      {/* Experiment Title */}
                      <td className="px-6 py-4">
                        <div className="font-bold text-[#111827]">
                          {req.experiment?.title}
                        </div>
                        <div className="text-xs text-[#6B7280] font-semibold">
                          {req.experiment?.subject}
                        </div>
                      </td>

                      {/* Justification Details */}
                      <td className="px-6 py-4 max-w-[200px]">
                        <p className="text-[#6B7280] text-xs leading-relaxed line-clamp-2 font-medium" title={req.justification}>
                          {req.justification}
                        </p>
                      </td>

                      {/* Requested At */}
                      <td className="px-6 py-4 text-[#6B7280]">
                        <div className="flex items-center gap-1.5 text-xs font-semibold">
                          <Calendar className="w-3.5 h-3.5 text-[#6B7280]" />
                          <span>{requestedTime}</span>
                        </div>
                      </td>

                      {/* Marks Awarded Shift */}
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-1.5 font-bold">
                          <span className="text-[#EF4444] text-xs line-through">{req.original_marks}</span>
                          <span className="text-[#6B7280] text-[10px]">→</span>
                          <span className="text-[#10B981] text-sm">{req.requested_marks}</span>
                        </div>
                      </td>

                      {/* Action buttons */}
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleOpenActionModal(req, 'reject')}
                            className="px-2.5 py-1.5 border border-[#FEE2E2] bg-[#FEE2E2] hover:bg-[#EF4444] text-[#EF4444] hover:text-white rounded-lg text-xs font-bold transition cursor-pointer"
                          >
                            Reject
                          </button>
                          <button
                            onClick={() => handleOpenActionModal(req, 'approve')}
                            className="px-2.5 py-1.5 bg-[#4F46E5] hover:bg-[#4338CA] hover:shadow text-white rounded-lg text-xs font-bold transition cursor-pointer"
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
            <div className="px-6 py-16 text-center text-[#6B7280] text-sm">
              <AlertCircle className="w-12 h-12 text-[#6B7280]/60 mx-auto mb-4" />
              <p className="font-bold text-[#111827] mb-1 text-base">No Pending Revisions</p>
              <p className="text-[#6B7280] text-xs font-medium">There are currently no pending grade revision requests waiting for approval.</p>
            </div>
          )}
        </div>
      </div>

      {/* Confirmation & Note Modal */}
      {modalOpen && selectedRequest && actionType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fadeIn">
          {/* Overlay backdrop */}
          <div 
            className="absolute inset-0 bg-black/40 backdrop-blur-xs" 
            onClick={() => !savingAction && setModalOpen(false)}
          ></div>

          {/* Modal Content */}
          <div className="relative w-full max-w-md bg-[#FFFFFF] border border-[#E5E7EB] rounded-3xl shadow-2xl p-6 md:p-8 text-[#111827] z-10 animate-scaleUp">
            <button
              onClick={() => !savingAction && setModalOpen(false)}
              className="absolute top-4 right-4 text-[#6B7280] hover:text-[#111827] disabled:opacity-50"
              disabled={savingAction}
            >
              <X className="w-5 h-5" />
            </button>

            {/* Modal Title */}
            <h3 className="text-xl font-extrabold text-[#111827] mb-2 capitalize">
              {actionType} Marks Revision
            </h3>
            <p className="text-[#6B7280] text-xs font-medium mb-6">
              Review and finalize this marks adjustment request. You can provide an optional feedback note.
            </p>

            {/* Details Box */}
            <div className="bg-[#F8FAFC] border border-[#E5E7EB] p-4 rounded-2xl space-y-2 text-xs mb-5">
              <div className="flex justify-between">
                <span className="text-[#6B7280] font-semibold uppercase">Student</span>
                <span className="text-[#111827] font-bold">{selectedRequest.student?.full_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#6B7280] font-semibold uppercase">Requested By</span>
                <span className="text-[#111827] font-semibold">{selectedRequest.teacher?.full_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#6B7280] font-semibold uppercase">Marks Shift</span>
                <div className="font-bold flex gap-1">
                  <span className="text-[#EF4444] line-through">{selectedRequest.original_marks}</span>
                  <span className="text-[#6B7280]">→</span>
                  <span className="text-[#10B981]">{selectedRequest.requested_marks}</span>
                </div>
              </div>
              <div className="pt-2 border-t border-[#E5E7EB] flex flex-col gap-1">
                <span className="text-[#6B7280] font-semibold uppercase">Teacher Justification:</span>
                <p className="text-[#111827] bg-[#FFFFFF] border border-[#E5E7EB] p-2.5 rounded-lg max-h-24 overflow-y-auto whitespace-pre-wrap leading-relaxed font-medium">
                  {selectedRequest.justification}
                </p>
              </div>
            </div>

            {/* Admin Note textarea */}
            <div className="space-y-2 mb-6">
              <label className="block text-[#6B7280] text-xs font-bold uppercase tracking-wider" htmlFor="adminNote">
                Admin Note / Remarks
              </label>
              <textarea
                id="adminNote"
                rows={3}
                placeholder={actionType === 'reject' ? 'Explain the rejection reason... (Optional)' : 'e.g. Approved. Revision completed. (Optional)'}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full px-4 py-2.5 bg-white border border-[#E5E7EB] rounded-xl text-sm text-[#111827] placeholder-[#6B7280]/50 focus:outline-none focus:ring-2 focus:ring-[#4F46E5] focus:border-transparent transition resize-none"
                disabled={savingAction}
              />
            </div>

            {/* Actions Footer */}
            <div className="flex justify-end gap-3 pt-4 border-t border-[#E5E7EB]">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="px-4 py-2 border border-[#E5E7EB] hover:border-[#E5E7EB] rounded-lg text-xs font-bold text-[#6B7280] hover:text-[#111827] hover:bg-[#F8FAFC] transition cursor-pointer"
                disabled={savingAction}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmAction}
                className={`px-4 py-2 text-white font-bold rounded-lg text-xs transition flex items-center gap-1.5 cursor-pointer shadow-sm ${
                  actionType === 'approve'
                    ? 'bg-[#10B981] hover:bg-[#059669]'
                    : 'bg-[#EF4444] hover:bg-[#DC2626]'
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
