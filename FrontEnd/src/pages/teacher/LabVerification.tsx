import React, { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { apiPatch, apiPost } from '../../lib/api'
import { useAuthStore } from '../../store/authStore'
import { CheckSquare, Loader2, Eye, CheckCircle2, Search, Filter, RefreshCw, AlertCircle } from 'lucide-react'
import { toast } from 'react-hot-toast'
import LoadingSpinner from '../../components/LoadingSpinner'

interface LabRecord {
  id: string
  file_url: string
  status: 'submitted' | 'pending' | 'verified'
  submitted_at: string
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

export const LabVerification: React.FC = () => {
  const { user } = useAuthStore()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [records, setRecords] = useState<LabRecord[]>([])
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [batchVerifying, setBatchVerifying] = useState(false)

  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'submitted' | 'pending' | 'verified'>('all')

  const fetchRecords = async (isRefresh = false) => {
    if (!user) return
    if (isRefresh) setRefreshing(true)
    else setLoading(true)

    try {
      const { data, error } = await supabase
        .from('lab_records')
        .select(`
          id,
          file_url,
          status,
          submitted_at,
          experiments!inner (
            id,
            title,
            subject,
            created_by
          ),
          profiles!lab_records_student_id_fkey (
            id,
            full_name,
            enrollment_no,
            department
          )
        `)
        .eq('experiments.created_by', user.id)
        .order('submitted_at', { ascending: false })

      if (error) throw error

      if (data) {
        const formatted = data.map((item: any) => ({
          id: item.id,
          file_url: item.file_url,
          status: item.status,
          submitted_at: item.submitted_at,
          experiment: Array.isArray(item.experiments) ? item.experiments[0] : item.experiments,
          student: Array.isArray(item.profiles) ? item.profiles[0] : item.profiles
        })).filter(r => r.experiment && r.student) as LabRecord[]
        setRecords(formatted)
      }
    } catch (err: any) {
      console.error('Error fetching verification records:', err)
      toast.error('Failed to load lab records')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchRecords()
  }, [user])

  const handleToggleSelect = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    )
  }

  const handleVerifySingle = async (id: string) => {
    try {
      // PATCH via backend — body must match verifyLabRecordSchema: { status }
      await apiPatch(`/api/lab-records/${id}/verify`, { status: 'verified' })
      toast.success('Lab record marked as verified')
      setSelectedIds(prev => prev.filter(item => item !== id))
      fetchRecords(false)
    } catch (err: any) {
      toast.error(err.message || 'Verification failed')
    }
  }

  const handleVerifySelected = async () => {
    if (selectedIds.length === 0) return
    setBatchVerifying(true)
    try {
      // POST /api/lab-records/batch-verify — body must match batchVerifyLabRecordsSchema: { record_ids, status }
      await apiPost('/api/lab-records/batch-verify', { record_ids: selectedIds, status: 'verified' })
      toast.success(`Successfully verified ${selectedIds.length} records`)
      setSelectedIds([])
      fetchRecords(false)
    } catch (err: any) {
      toast.error(err.message || 'Batch verification failed')
    } finally {
      setBatchVerifying(false)
    }
  }

  const filteredRecords = records.filter(r => {
    const searchLower = searchQuery.toLowerCase()
    const matchesSearch = 
      r.student.full_name?.toLowerCase().includes(searchLower) ||
      r.student.enrollment_no?.toLowerCase().includes(searchLower) ||
      r.experiment.title?.toLowerCase().includes(searchLower) ||
      r.experiment.subject?.toLowerCase().includes(searchLower)

    const matchesStatus = statusFilter === 'all' || r.status === statusFilter

    return matchesSearch && matchesStatus
  })

  // Determine if all filtered records are selected
  // We only enable selecting records that are NOT already verified
  const checkableRecords = filteredRecords.filter(r => r.status !== 'verified')
  const allCheckableSelected = checkableRecords.length > 0 && checkableRecords.every(r => selectedIds.includes(r.id))

  const handleToggleSelectAll = () => {
    if (allCheckableSelected) {
      // Unselect only the currently checkable records
      const checkableIds = checkableRecords.map(r => r.id)
      setSelectedIds(prev => prev.filter(id => !checkableIds.includes(id)))
    } else {
      // Select all checkable records
      const checkableIds = checkableRecords.map(r => r.id)
      setSelectedIds(prev => {
        const unique = new Set([...prev, ...checkableIds])
        return Array.from(unique)
      })
    }
  }

  if (loading) {
    return <LoadingSpinner className="min-h-[400px]" size={40} />
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white mb-1">Lab Record Verification</h2>
          <p className="text-slate-400 text-sm">Review, inspect, and approve students' submitted lab records.</p>
        </div>
        <button
          onClick={() => fetchRecords(true)}
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
          <span>Filter Records</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-center">
          {/* Search Input */}
          <div className="relative lg:col-span-2">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search student name, enrollment, or experiment..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-[#0F172A] border border-slate-800 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#6366F1] focus:border-transparent transition"
            />
          </div>

          {/* Status Tab buttons */}
          <div className="lg:col-span-2 flex bg-[#0F172A] border border-slate-800 rounded-lg p-0.5 w-full">
            {(['all', 'submitted', 'pending', 'verified'] as const).map((status) => (
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

      {/* Batch Action Bar */}
      {selectedIds.length > 0 && (
        <div className="bg-[#6366F1]/10 border border-[#6366F1]/20 rounded-xl px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4 animate-scaleUp">
          <div className="flex items-center gap-2 text-sm text-slate-200">
            <CheckSquare className="w-5 h-5 text-[#6366F1]" />
            <span>
              Selected <strong className="text-white font-bold">{selectedIds.length}</strong> record{selectedIds.length > 1 ? 's' : ''} for verification.
            </span>
          </div>
          <button
            onClick={handleVerifySelected}
            disabled={batchVerifying}
            className="w-full sm:w-auto px-4 py-2 bg-[#6366F1] hover:bg-[#5053db] disabled:bg-slate-800 text-white font-bold rounded-lg text-xs transition flex items-center justify-center gap-1.5 cursor-pointer shadow-md disabled:cursor-not-allowed"
          >
            {batchVerifying ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Verifying...</span>
              </>
            ) : (
              <>
                <CheckSquare className="w-4 h-4" />
                <span>Verify Selected</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* Records Table */}
      <div className="bg-[#1E293B] border border-slate-800 rounded-xl shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          {filteredRecords.length > 0 ? (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-xs font-semibold text-slate-400 uppercase bg-[#182235]/40">
                  <th className="w-12 px-6 py-4">
                    {checkableRecords.length > 0 && (
                      <input
                        type="checkbox"
                        checked={allCheckableSelected}
                        onChange={handleToggleSelectAll}
                        className="w-4 h-4 rounded bg-[#0F172A] border-slate-700 text-[#6366F1] focus:ring-[#6366F1] focus:ring-offset-0 focus:ring-0 cursor-pointer"
                      />
                    )}
                  </th>
                  <th className="px-6 py-4">Student</th>
                  <th className="px-6 py-4">Experiment</th>
                  <th className="px-6 py-4">Submitted At</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-sm">
                {filteredRecords.map((rec) => {
                  const submittedAtFormatted = new Date(rec.submitted_at).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })

                  const statusStyles: Record<string, string> = {
                    submitted: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
                    pending: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
                    verified: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
                  }

                  const isVerified = rec.status === 'verified'

                  return (
                    <tr key={rec.id} className="hover:bg-slate-800/20 transition-colors">
                      {/* Checkbox */}
                      <td className="px-6 py-4">
                        {!isVerified && (
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(rec.id)}
                            onChange={() => handleToggleSelect(rec.id)}
                            className="w-4 h-4 rounded bg-[#0F172A] border-slate-700 text-[#6366F1] focus:ring-[#6366F1] focus:ring-offset-0 focus:ring-0 cursor-pointer"
                          />
                        )}
                      </td>

                      {/* Student details */}
                      <td className="px-6 py-4">
                        <div className="font-semibold text-white">
                          {rec.student?.full_name || 'Unknown Student'}
                        </div>
                        <div className="text-xs text-slate-500 font-medium">
                          {rec.student?.enrollment_no || 'N/A'} • {rec.student?.department || 'N/A'}
                        </div>
                      </td>

                      {/* Experiment details */}
                      <td className="px-6 py-4">
                        <div className="font-medium text-slate-300">
                          {rec.experiment?.title || 'Untitled Experiment'}
                        </div>
                        <div className="text-xs text-slate-500 font-medium">
                          {rec.experiment?.subject || 'N/A'}
                        </div>
                      </td>

                      {/* Submitted At */}
                      <td className="px-6 py-4 text-slate-450">
                        {submittedAtFormatted}
                      </td>

                      {/* Status badge */}
                      <td className="px-6 py-4">
                        <span className={`inline-block px-2.5 py-0.5 text-xs font-semibold rounded border uppercase ${statusStyles[rec.status]}`}>
                          {rec.status}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2.5">
                          <a
                            href={rec.file_url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#1E293B] border border-slate-700 hover:border-slate-600 rounded-lg text-xs font-bold text-slate-300 hover:text-white transition cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>View File</span>
                          </a>

                          {!isVerified ? (
                            <button
                              onClick={() => handleVerifySingle(rec.id)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 hover:shadow text-white rounded-lg text-xs font-bold transition cursor-pointer"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Verify</span>
                            </button>
                          ) : (
                            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 text-emerald-400 text-xs font-semibold select-none">
                              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                              <span>Verified</span>
                            </div>
                          )}
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
              No lab records found matching the current search/filter criteria.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default LabVerification
