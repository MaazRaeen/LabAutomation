import React, { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { apiPostFormData } from '../../lib/api'
import { useAuthStore } from '../../store/authStore'
import { FileText, Loader2, Upload, AlertCircle, ExternalLink, CheckCircle2, Clock } from 'lucide-react'
import { toast } from 'react-hot-toast'
import LoadingSpinner from '../../components/LoadingSpinner'

interface Experiment {
  id: string
  title: string
  subject: string
  deadline: string
}

interface Assignment {
  id: string
  status: string
  experiments: Experiment
}

interface LabRecord {
  id: string
  file_url: string
  status: 'submitted' | 'pending' | 'verified'
  submitted_at: string
  experiments: {
    id: string
    title: string
    subject: string
  }
}

export const LabRecords: React.FC = () => {
  const { user } = useAuthStore()
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [records, setRecords] = useState<LabRecord[]>([])
  
  const [experimentId, setExperimentId] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [dragActive, setDragActive] = useState(false)

  const fetchRecordsAndAssignments = async () => {
    if (!user) return
    try {
      // 1. Fetch Assigned Experiments
      const { data: assignmentsData, error: assignmentsError } = await supabase
        .from('experiment_assignments')
        .select(`
          id,
          status,
          experiments (
            id,
            title,
            subject,
            deadline
          )
        `)
        .eq('student_id', user.id)

      if (assignmentsError) throw assignmentsError

      if (assignmentsData) {
        const formatted = assignmentsData.map((item: any) => ({
          id: item.id,
          status: item.status,
          experiments: Array.isArray(item.experiments) ? item.experiments[0] : item.experiments
        })).filter(a => a.experiments) as Assignment[]
        setAssignments(formatted)
      }

      // 2. Fetch Previously Uploaded Lab Records
      const { data: recordsData, error: recordsError } = await supabase
        .from('lab_records')
        .select(`
          id,
          file_url,
          status,
          submitted_at,
          experiments (
            id,
            title,
            subject
          )
        `)
        .eq('student_id', user.id)
        .order('submitted_at', { ascending: false })

      if (recordsError) throw recordsError

      if (recordsData) {
        const formattedRecords = recordsData.map((item: any) => ({
          id: item.id,
          file_url: item.file_url,
          status: item.status,
          submitted_at: item.submitted_at,
          experiments: Array.isArray(item.experiments) ? item.experiments[0] : item.experiments
        })).filter(r => r.experiments) as LabRecord[]
        setRecords(formattedRecords)
      }
    } catch (err: any) {
      console.error('Error fetching lab records data:', err)
      toast.error('Failed to load page data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRecordsAndAssignments()
  }, [user])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      setFile(selectedFile)
    }
  }

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    const droppedFile = e.dataTransfer.files?.[0]
    if (droppedFile) {
      setFile(droppedFile)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!user) return
    if (!experimentId) {
      toast.error('Please select an experiment')
      return
    }
    if (!file) {
      toast.error('Please select a file to upload')
      return
    }

    setSubmitting(true)
    try {
      // Send file + experiment_id to the backend as multipart form data.
      // The backend handles storage upload, DB insert, audit logging, and notifications.
      const formData = new FormData()
      formData.append('file', file)
      formData.append('experiment_id', experimentId)

      await apiPostFormData('/api/lab-records', formData)

      toast.success('Lab record uploaded successfully!')
      setFile(null)
      setExperimentId('')

      // Refresh records list
      fetchRecordsAndAssignments()
    } catch (err: any) {
      toast.error(err.message || 'Upload failed')
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
        <h2 className="text-2xl font-bold text-white mb-1">Lab Records</h2>
        <p className="text-slate-400 text-sm">Upload, review and track the verification status of your lab record files.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Upload Form */}
        <div className="lg:col-span-5 bg-[#1E293B] border border-slate-800 rounded-2xl p-6 md:p-8 shadow-xl self-start">
          <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
            <Upload className="w-5 h-5 text-[#6366F1]" />
            Upload New Record
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

            {/* Drag & Drop Upload */}
            <div>
              <label className="block text-slate-300 text-sm font-medium mb-2">
                File Record (PDF, DOCX, Image)
              </label>
              <div
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                className={`relative border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center transition-colors min-h-[200px] cursor-pointer ${
                  dragActive
                    ? 'border-[#6366F1] bg-[#6366F1]/5'
                    : 'border-slate-700 hover:border-slate-600 bg-[#0F172A]'
                }`}
              >
                <input
                  type="file"
                  id="fileUpload"
                  accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                  onChange={handleFileChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />

                {file ? (
                  <div className="text-center space-y-3">
                    <FileText className="w-16 h-16 text-[#6366F1] mx-auto animate-bounce" />
                    <p className="text-sm font-semibold text-white truncate max-w-[200px] mx-auto">{file.name}</p>
                    <p className="text-xs text-slate-400">
                      {(file.size / 1024).toFixed(2)} KB
                    </p>
                    <button
                      type="button"
                      onClick={() => setFile(null)}
                      className="text-xs text-rose-400 hover:underline font-semibold"
                    >
                      Remove file
                    </button>
                  </div>
                ) : (
                  <div className="text-center space-y-3 pointer-events-none">
                    <Upload className="w-12 h-12 text-slate-500 mx-auto" />
                    <p className="text-sm text-slate-300 font-semibold">
                      Drag and drop your record here, or click to browse
                    </p>
                    <p className="text-xs text-slate-500">
                      Supports PDF, Word Documents, and Images.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Action button */}
            <button
              type="submit"
              disabled={submitting || !file || !experimentId}
              className="w-full py-2.5 px-4 bg-[#6366F1] hover:bg-[#5053db] disabled:bg-slate-800 disabled:text-slate-500 disabled:border disabled:border-slate-800 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl active:scale-[0.98] transition flex justify-center items-center text-sm disabled:cursor-not-allowed"
            >
              {submitting ? (
                <>
                  <Loader2 className="animate-spin h-5 w-5 mr-2" />
                  Uploading...
                </>
              ) : (
                'Upload Record'
              )}
            </button>
          </form>
        </div>

        {/* Upload History */}
        <div className="lg:col-span-7 bg-[#1E293B] border border-slate-800 rounded-2xl p-6 md:p-8 shadow-xl">
          <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
            <FileText className="w-5 h-5 text-[#6366F1]" />
            Upload History
          </h3>

          <div className="overflow-x-auto">
            {records.length > 0 ? (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-xs font-semibold text-slate-400 uppercase bg-[#182235]/40">
                    <th className="px-4 py-3">Experiment</th>
                    <th className="px-4 py-3">Submitted At</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">File</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-sm">
                  {records.map((rec) => {
                    const submittedAtFormatted = new Date(rec.submitted_at).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })

                    const statusStyles: Record<string, string> = {
                      submitted: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
                      pending: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
                      verified: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
                    }

                    const StatusIcon = rec.status === 'verified' ? CheckCircle2 : Clock

                    return (
                      <tr key={rec.id} className="hover:bg-slate-800/20 transition-colors">
                        <td className="px-4 py-4">
                          <div className="font-semibold text-white">
                            {rec.experiments?.title}
                          </div>
                          <div className="text-xs text-slate-500 font-medium">
                            {rec.experiments?.subject}
                          </div>
                        </td>
                        <td className="px-4 py-4 text-slate-300">
                          {submittedAtFormatted}
                        </td>
                        <td className="px-4 py-4">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-semibold rounded border uppercase ${statusStyles[rec.status]}`}>
                            <StatusIcon className="w-3 h-3" />
                            {rec.status}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-right">
                          <a
                            href={rec.file_url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-[#6366F1] hover:text-[#5053db] hover:underline font-semibold text-xs cursor-pointer"
                          >
                            <span>Open</span>
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            ) : (
              <div className="text-center py-12 text-slate-400 text-sm">
                <AlertCircle className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                No uploaded records found. Select an experiment above to submit your first record file.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default LabRecords
