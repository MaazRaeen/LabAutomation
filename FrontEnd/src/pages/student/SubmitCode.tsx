import React, { useEffect, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../store/authStore'
import { FileCode, Loader2, Upload, AlertCircle } from 'lucide-react'
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

export const SubmitCode: React.FC = () => {
  const { user } = useAuthStore()
  const [searchParams] = useSearchParams()
  const queryExperimentId = searchParams.get('experimentId')
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [assignments, setAssignments] = useState<Assignment[]>([])
  
  const [experimentId, setExperimentId] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [language, setLanguage] = useState('')
  const [dragActive, setDragActive] = useState(false)

  useEffect(() => {
    if (!user) return

    const fetchAssignments = async () => {
      try {
        const { data, error } = await supabase
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

        if (error) throw error

        if (data) {
          const formatted = data.map((item: any) => ({
            id: item.id,
            status: item.status,
            experiments: Array.isArray(item.experiments) ? item.experiments[0] : item.experiments
          })) as Assignment[]

          setAssignments(formatted)

          // Pre-select experiment from search params or select the first pending/late one
          if (queryExperimentId) {
            setExperimentId(queryExperimentId)
          } else {
            const active = formatted.find(a => a.status === 'pending' || a.status === 'late')
            if (active && active.experiments) {
              setExperimentId(active.experiments.id)
            } else if (formatted.length > 0 && formatted[0].experiments) {
              setExperimentId(formatted[0].experiments.id)
            }
          }
        }
      } catch (err) {
        console.error('Error fetching assignments for submit:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchAssignments()
  }, [user, queryExperimentId])

  const detectLanguage = (fileName: string): string => {
    const ext = fileName.split('.').pop()?.toLowerCase()
    switch (ext) {
      case 'py': return 'python'
      case 'java': return 'java'
      case 'c': return 'c'
      case 'cpp': return 'cpp'
      case 'js': return 'javascript'
      case 'ts': return 'typescript'
      case 'html': return 'html'
      case 'css': return 'css'
      case 'pdf': return 'pdf'
      case 'doc':
      case 'docx': return 'document'
      case 'txt': return 'text'
      default: return ext || 'other'
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      setFile(selectedFile)
      const detected = detectLanguage(selectedFile.name)
      setLanguage(detected)
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
      const detected = detectLanguage(droppedFile.name)
      setLanguage(detected)
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
      toast.error('Please select or upload a code file')
      return
    }
    if (!language) {
      toast.error('Could not detect file type. Please upload a valid file.')
      return
    }

    setSubmitting(true)
    try {
      const activeAssignment = assignments.find(a => a.experiments?.id === experimentId)
      if (!activeAssignment || !activeAssignment.experiments) {
        throw new Error('Experiment assignment not found.')
      }

      const experiment = activeAssignment.experiments
      const isLate = new Date() > new Date(experiment.deadline)

      // 1. Upload to Supabase Storage bucket 'submissions'
      const fileExt = file.name.split('.').pop()
      const filePath = `${user.id}/${experimentId}_${Date.now()}.${fileExt}`

      const { error: uploadError } = await supabase.storage
        .from('submissions')
        .upload(filePath, file)

      if (uploadError) {
        throw new Error(`Upload failed: ${uploadError.message}. Ensure 'submissions' bucket is created in Supabase.`)
      }

      // Retrieve public URL
      const { data: urlData } = supabase.storage
        .from('submissions')
        .getPublicUrl(filePath)
      const publicUrl = urlData?.publicUrl

      if (!publicUrl) {
        throw new Error('Could not retrieve public URL for uploaded submission.')
      }

      // 2. Fetch maximum current version to calculate next version increment
      const { data: existingSubmissions, error: versionError } = await supabase
        .from('code_submissions')
        .select('version')
        .eq('experiment_id', experimentId)
        .eq('student_id', user.id)
        .order('version', { ascending: false })
        .limit(1)

      if (versionError) throw versionError

      const nextVersion = existingSubmissions && existingSubmissions.length > 0
        ? existingSubmissions[0].version + 1
        : 1

      // 3. Create code submission DB row
      const { error: dbError } = await supabase
        .from('code_submissions')
        .insert({
          experiment_id: experimentId,
          student_id: user.id,
          file_url: publicUrl,
          language: language,
          is_late: isLate,
          version: nextVersion,
        })

      if (dbError) throw dbError

      // 4. Update the assignment status
      const { error: updateError } = await supabase
        .from('experiment_assignments')
        .update({
          status: isLate ? 'late' : 'submitted',
        })
        .eq('experiment_id', experimentId)
        .eq('student_id', user.id)

      if (updateError) throw updateError

      const timestamp = new Date().toLocaleString()
      toast.success(`Work submitted successfully (v${nextVersion}) at ${timestamp}`)
      navigate('/student/experiments')
    } catch (err: any) {
      toast.error(err.message || 'Submission failed')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return <LoadingSpinner className="min-h-[400px]" size={40} />
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fadeIn">
      <div>
        <h2 className="text-2xl font-bold text-white mb-1">Submit Lab Work</h2>
        <p className="text-slate-400 text-sm">Upload your lab submission file for evaluation (source code, PDF, text, doc, etc.).</p>
      </div>

      <div className="bg-[#1E293B] border border-slate-800 rounded-2xl p-6 md:p-8 shadow-xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Dropdown select */}
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
                  {assignment.experiments.subject} - {assignment.experiments.title} ({assignment.status})
                </option>
              ))}
            </select>
          </div>

          {/* Drag and Drop Zone */}
          <div>
            <label className="block text-slate-300 text-sm font-medium mb-2">
              Submission File
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
                onChange={handleFileChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />

              {file ? (
                <div className="text-center space-y-3">
                  <FileCode className="w-16 h-16 text-[#6366F1] mx-auto animate-bounce" />
                  <p className="text-sm font-semibold text-white">{file.name}</p>
                  <p className="text-xs text-slate-400">
                    {(file.size / 1024).toFixed(2)} KB
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setFile(null)
                      setLanguage('')
                    }}
                    className="text-xs text-rose-400 hover:underline font-semibold"
                  >
                    Remove file
                  </button>
                </div>
              ) : (
                <div className="text-center space-y-3 pointer-events-none">
                  <Upload className="w-12 h-12 text-slate-500 mx-auto" />
                  <p className="text-sm text-slate-300 font-semibold">
                    Drag and drop your file here, or click to browse
                  </p>
                  <p className="text-xs text-slate-500">
                    Accepts code files, PDF, Word documents, text, and other formats.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Autodetected Language/Type Field */}
          {language && (
            <div className="bg-[#6366F1]/5 border border-[#6366F1]/20 rounded-lg p-4 flex items-start gap-3">
              <FileCode className="w-5 h-5 text-[#6366F1] shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">File Type / Language</h4>
                <p className="text-sm text-[#6366F1] font-bold capitalize mt-0.5">{language}</p>
              </div>
            </div>
          )}

          {/* Warning check */}
          {experimentId && assignments.find(a => a.experiments?.id === experimentId)?.status === 'late' && (
            <div className="bg-rose-500/10 border border-rose-500/20 rounded-lg p-4 flex items-start gap-3 text-rose-400 text-xs">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Deadline Overdue</p>
                <p className="mt-0.5 text-rose-400/80">This experiment's deadline has passed. Submitting now will mark your assignment status as LATE.</p>
              </div>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={submitting || !file}
            className="w-full py-2.5 px-4 bg-[#6366F1] hover:bg-[#5053db] disabled:bg-slate-800 disabled:text-slate-500 disabled:border disabled:border-slate-800 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl active:scale-[0.98] transition flex justify-center items-center text-sm disabled:cursor-not-allowed"
          >
            {submitting ? (
              <>
                <Loader2 className="animate-spin h-5 w-5 mr-2" />
                Uploading & Submitting...
              </>
            ) : (
              'Submit Work'
            )}
          </button>
        </form>
      </div>
    </div>
  )
}

export default SubmitCode
