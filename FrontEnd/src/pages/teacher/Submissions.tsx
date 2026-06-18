import React, { useEffect, useState, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { apiGet, apiPost, apiPut } from '../../lib/api'
import { useAuthStore } from '../../store/authStore'
import {
  Search,
  Calendar,
  Code2,
  Loader2,
  Play,
  CheckCircle2,
  XCircle,
  AlertCircle,
  X,
  ChevronRight,
  Download,
  RefreshCw,
  User,
  BookOpen,
  History,
  Save,
  FileText,
  Check,
  Edit,
  Award,
  Terminal,
  Clock
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import LoadingSpinner from '../../components/LoadingSpinner'

// Import PrismJS for syntax highlighting
import Prism from 'prismjs'
import 'prismjs/themes/prism-tomorrow.css'
import 'prismjs/components/prism-python'
import 'prismjs/components/prism-java'
import 'prismjs/components/prism-c'
import 'prismjs/components/prism-cpp'

interface Profile {
  full_name: string
  enrollment_no: string
}

interface Experiment {
  id: string
  title: string
  subject: string
  created_by?: string
}

interface Evaluation {
  id: string
  marks: number
  max_marks: number
  remarks: string
  is_draft: boolean
  evaluated_at: string
}

interface Submission {
  id: string
  experiment_id: string
  student_id: string
  file_url: string
  language: string
  submitted_at: string
  is_late: boolean
  version: number
  experiments: Experiment
  student: Profile
  evaluations?: Evaluation[] | Evaluation | null
  late_reason?: string
  late_status?: 'pending' | 'approved' | 'rejected'
  late_reviewed_by?: string
  late_reviewed_at?: string
  late_teacher_comment?: string
  reviewer?: { full_name: string } | { full_name: string }[] | null
}

export const Submissions: React.FC = () => {
  const { user } = useAuthStore()
  const [searchParams, setSearchParams] = useSearchParams()
  const urlSubmissionId = searchParams.get('submissionId')
  const urlExperimentId = searchParams.get('experimentId')

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  
  // Data lists
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [experiments, setExperiments] = useState<Experiment[]>([])

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedExperimentFilter, setSelectedExperimentFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [dateFilter, setDateFilter] = useState('all')

  // Selected submission detail workspace
  const [selectedSub, setSelectedSub] = useState<Submission | null>(null)
  const [submissionHistory, setSubmissionHistory] = useState<Submission[]>([])
  const [activeVersionSub, setActiveVersionSub] = useState<Submission | null>(null)
  
  // Code review loader
  const [codeText, setCodeText] = useState('')
  const [codeLoading, setCodeLoading] = useState(false)
  const [codeError, setCodeError] = useState('')

  // Grading form states
  const [marks, setMarks] = useState<number | ''>('')
  const [remarks, setRemarks] = useState('')
  const [isSubmittingGrade, setIsSubmittingGrade] = useState(false)

  // Late submission review states
  const [lateComment, setLateComment] = useState('')
  const [isReviewingLate, setIsReviewingLate] = useState(false)

  // Marks revision modal states
  const [revisionModalOpen, setRevisionModalOpen] = useState(false)
  const [requestedMarks, setRequestedMarks] = useState<number | ''>('')
  const [justification, setJustification] = useState('')
  const [submittingRevision, setSubmittingRevision] = useState(false)

  const codePreRef = useRef<HTMLPreElement>(null)

  // 1. Fetch experiments and submissions on load
  const loadInitialData = async (isRefresh = false) => {
    if (!user) return
    if (isRefresh) setRefreshing(true)
    else setLoading(true)

    try {
      // Fetch submissions
      const subResult = await apiGet('/api/submissions')
      const fetchedSubmissions = subResult.submissions || []
      setSubmissions(fetchedSubmissions)

      // Fetch teacher's experiments for filter list
      const { data: exps, error: expError } = await supabase
        .from('experiments')
        .select('id, title, subject')
        .eq('created_by', user.id)
        .order('title', { ascending: true })

      if (expError) throw expError
      setExperiments(exps || [])

      // Set URL experimentId query parameter if available
      if (urlExperimentId) {
        setSelectedExperimentFilter(urlExperimentId)
      }
    } catch (err: any) {
      console.error('Error fetching submissions dashboard:', err)
      toast.error(err.message || 'Failed to fetch dashboard data')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    loadInitialData()
  }, [user])

  // Watch URL submissionId changes to open details panel
  useEffect(() => {
    if (submissions.length > 0 && urlSubmissionId) {
      const foundSub = submissions.find(s => s.id === urlSubmissionId)
      if (foundSub) {
        handleSelectSubmission(foundSub)
      }
    }
  }, [urlSubmissionId, submissions])

  // Trigger syntax highlighting on code view changes
  useEffect(() => {
    if (codePreRef.current && codeText) {
      Prism.highlightAllUnder(codePreRef.current)
    }
  }, [codeText, activeVersionSub])

  // Helper to extract file extension / language
  const getLanguageClass = (lang: string) => {
    const map: Record<string, string> = {
      'Python': 'language-python',
      'JavaScript': 'language-javascript',
      'TypeScript': 'language-typescript',
      'C': 'language-c',
      'C++': 'language-cpp',
      'Java': 'language-java'
    }
    return map[lang] || 'language-plaintext'
  }

  // Group submissions by student/experiment to list the latest version in the table
  const latestSubmissionsMap = new Map<string, Submission>()
  submissions.forEach(sub => {
    const key = `${sub.student_id}_${sub.experiment_id}`
    const existing = latestSubmissionsMap.get(key)
    if (!existing || sub.version > existing.version) {
      latestSubmissionsMap.set(key, sub)
    }
  })

  // List of only latest submissions
  const latestSubmissions = Array.from(latestSubmissionsMap.values())

  // Apply filters
  const filteredSubmissions = latestSubmissions.filter(sub => {
    // Student Search (name or enrollment number)
    const fullName = sub.student?.full_name || ''
    const enrollment = sub.student?.enrollment_no || ''
    const matchesSearch =
      fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      enrollment.toLowerCase().includes(searchQuery.toLowerCase())

    // Experiment Filter
    const matchesExperiment = selectedExperimentFilter === 'all' || sub.experiment_id === selectedExperimentFilter

    // Status Filter (Pending, Under Review (Draft), Graded (Final))
    const evalData = Array.isArray(sub.evaluations) 
      ? sub.evaluations[0] 
      : sub.evaluations
    
    let subStatus = 'pending'
    if (evalData) {
      subStatus = evalData.is_draft ? 'draft' : 'graded'
    }

    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'pending' && subStatus === 'pending') ||
      (statusFilter === 'draft' && subStatus === 'draft') ||
      (statusFilter === 'graded' && subStatus === 'graded')

    // Date Filter
    let matchesDate = true
    if (dateFilter !== 'all') {
      const submittedDate = new Date(sub.submitted_at)
      const now = new Date()
      const diffTime = Math.abs(now.getTime() - submittedDate.getTime())
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

      if (dateFilter === 'today') {
        matchesDate = submittedDate.toDateString() === now.toDateString()
      } else if (dateFilter === 'week') {
        matchesDate = diffDays <= 7
      } else if (dateFilter === 'month') {
        matchesDate = diffDays <= 30
      }
    }

    return matchesSearch && matchesExperiment && matchesStatus && matchesDate
  })

  // Load a selected submission's details
  const handleSelectSubmission = async (sub: Submission) => {
    setSelectedSub(sub)
    setCodeError('')
    setCodeText('')

    try {
      // 1. Fetch submission history for this student & experiment
      const { data: history, error: histError } = await supabase
        .from('code_submissions')
        .select('*, experiments(*), student:profiles!code_submissions_student_id_fkey(*), evaluations(*), reviewer:profiles!code_submissions_late_reviewed_by_fkey(full_name)')
        .eq('student_id', sub.student_id)
        .eq('experiment_id', sub.experiment_id)
        .order('version', { ascending: false })

      if (histError) throw histError

      if (history) {
        // Format history
        const formattedHistory = history.map((item: any) => ({
          ...item,
          experiments: Array.isArray(item.experiments) ? item.experiments[0] : item.experiments,
          student: Array.isArray(item.student) ? item.student[0] : item.student,
          evaluations: item.evaluations || null
        })) as Submission[]

        setSubmissionHistory(formattedHistory)
        
        // Default active version to the latest version in the database
        const latestVersionSub = formattedHistory[0]
        setActiveVersionSub(latestVersionSub)

        // Initialize grading fields based on latest evaluation if present
        const evalData = Array.isArray(latestVersionSub.evaluations) 
          ? latestVersionSub.evaluations[0] 
          : latestVersionSub.evaluations
        
        if (evalData) {
          setMarks(evalData.marks)
          setRemarks(evalData.remarks)
        } else {
          setMarks('')
          setRemarks('')
        }

        // Trigger loading the code content
        loadCodeFile(latestVersionSub.file_url)
      }
    } catch (err: any) {
      console.error('Error fetching submission details:', err)
      toast.error('Failed to load submission details.')
    }
  }

  // Switch between submission versions in code review panel
  const handleSwitchVersion = (versionSub: Submission) => {
    setActiveVersionSub(versionSub)
    loadCodeFile(versionSub.file_url)

    // Re-populate grading fields from this version's evaluation if it exists
    const evalData = Array.isArray(versionSub.evaluations) 
      ? versionSub.evaluations[0] 
      : versionSub.evaluations
    
    if (evalData) {
      setMarks(evalData.marks)
      setRemarks(evalData.remarks)
    } else {
      // Fallback to selectedSub overall evaluation if any
      const parentEval = Array.isArray(selectedSub?.evaluations)
        ? selectedSub?.evaluations[0]
        : selectedSub?.evaluations
      if (parentEval) {
        setMarks(parentEval.marks)
        setRemarks(parentEval.remarks)
      } else {
        setMarks('')
        setRemarks('')
      }
    }
  }

  // Load code contents from storage URL
  const loadCodeFile = async (url: string) => {
    const filename = url.split('/').pop() || ''
    const ext = filename.split('.').pop()?.toLowerCase() || ''
    const isDoc = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'].includes(ext)

    if (isDoc) {
      // Skip downloading document binary code
      setCodeLoading(false)
      setCodeError('')
      setCodeText('')
      return
    }

    try {
      setCodeLoading(true)
      setCodeError('')
      setCodeText('')

      // Extract path relative to storage bucket 'submissions'
      let pathPart = ''
      if (url.includes('/public/submissions/')) {
        pathPart = url.split('/public/submissions/')[1]
      }

      if (pathPart) {
        const { data, error } = await supabase.storage.from('submissions').download(pathPart)
        if (error) throw error
        const text = await data.text()
        setCodeText(text)
      } else {
        // Fallback standard fetch
        const res = await fetch(url)
        if (!res.ok) throw new Error('CORS or network error fetching document contents.')
        const text = await res.text()
        setCodeText(text)
      }
    } catch (err: any) {
      console.error('Error downloading code:', err)
      setCodeError('Unable to render code inline. It may be a binary format or CORS restricted. Please download the file below to review.')
    } finally {
      setCodeLoading(false)
    }
  }


  // Grade Form Validation and Submission
  const handleSaveGrade = async (finalize: boolean) => {
    if (!activeVersionSub) return
    if (marks === '' || marks < 0 || marks > 10) {
      toast.error('Please assign marks between 0 and 10.')
      return
    }
    if (!remarks.trim() || remarks.trim().length < 5) {
      toast.error('Please provide feedback remarks (at least 5 characters).')
      return
    }

    setIsSubmittingGrade(true)
    try {
      const evalData = Array.isArray(activeVersionSub.evaluations) 
        ? activeVersionSub.evaluations[0] 
        : activeVersionSub.evaluations

      let responseEval
      if (evalData) {
        // Update existing evaluation
        responseEval = await apiPut(`/api/evaluations/${evalData.id}`, {
          marks: Number(marks),
          remarks: remarks.trim(),
          is_draft: !finalize
        })
        toast.success(finalize ? 'Evaluation finalized!' : 'Draft evaluation saved.')
      } else {
        // Create new evaluation
        responseEval = await apiPost('/api/evaluations', {
          submission_id: activeVersionSub.id,
          marks: Number(marks),
          remarks: remarks.trim(),
          is_draft: !finalize
        })
        toast.success(finalize ? 'Evaluation finalized successfully!' : 'Draft evaluation saved successfully.')
      }

      // Refresh data
      await loadInitialData(false)
      
      // Update selected states to keep details workspace in sync
      const updatedSub = submissions.find(s => s.id === selectedSub?.id)
      if (updatedSub) {
        setSelectedSub(updatedSub)
      }
      
      // Re-trigger select to sync evaluations fields
      if (activeVersionSub) {
        const updatedVersion = {
          ...activeVersionSub,
          evaluations: responseEval.evaluation
        }
        setActiveVersionSub(updatedVersion)
      }
    } catch (err: any) {
      console.error('Error saving evaluation:', err)
      toast.error(err.message || 'Failed to save grade.')
    } finally {
      setIsSubmittingGrade(false)
    }
  }

  // Approve or Reject Late Submission
  const handleReviewLateSubmission = async (status: 'approved' | 'rejected') => {
    if (!activeVersionSub) return
    setIsReviewingLate(true)
    try {
      const response = await apiPost(`/api/submissions/${activeVersionSub.id}/review-late`, {
        status,
        comment: lateComment.trim()
      })

      toast.success(status === 'approved' ? 'Late submission approved!' : 'Late submission rejected.')
      
      // Clear review comment state
      setLateComment('')

      // Reload submissions list to sync lists
      await loadInitialData(false)

      // Re-trigger details query for the active version to update details
      const { data: updatedVersion, error } = await supabase
        .from('code_submissions')
        .select('*, experiments(*), student:profiles!code_submissions_student_id_fkey(*), evaluations(*), reviewer:profiles!code_submissions_late_reviewed_by_fkey(full_name)')
        .eq('id', activeVersionSub.id)
        .single()

      if (!error && updatedVersion) {
        const formatted = {
          ...updatedVersion,
          experiments: Array.isArray(updatedVersion.experiments) ? updatedVersion.experiments[0] : updatedVersion.experiments,
          student: Array.isArray(updatedVersion.student) ? updatedVersion.student[0] : updatedVersion.student,
          evaluations: updatedVersion.evaluations || null
        } as Submission
        setActiveVersionSub(formatted)
        
        // Also update selectedSub to sync with submission history changes
        setSelectedSub(prev => {
          if (!prev) return null
          return {
            ...prev,
            late_status: formatted.late_status,
            late_reason: formatted.late_reason,
            late_reviewed_at: formatted.late_reviewed_at,
            late_teacher_comment: formatted.late_teacher_comment,
            reviewer: formatted.reviewer
          }
        })
      }
    } catch (err: any) {
      console.error('Error reviewing late submission:', err)
      toast.error(err.message || 'Failed to submit review.')
    } finally {
      setIsReviewingLate(false)
    }
  }

  // Open Marks Revision modal
  const handleOpenRevisionModal = () => {
    const evalData = Array.isArray(activeVersionSub?.evaluations) 
      ? activeVersionSub?.evaluations[0] 
      : activeVersionSub?.evaluations

    if (!evalData) return
    setRequestedMarks(evalData.marks)
    setJustification('')
    setRevisionModalOpen(true)
  }

  // Submit Marks Revision Request to Backend
  const handleSubmitRevision = async () => {
    const evalData = Array.isArray(activeVersionSub?.evaluations) 
      ? activeVersionSub?.evaluations[0] 
      : activeVersionSub?.evaluations

    if (!evalData) return

    if (requestedMarks === '' || requestedMarks < 0 || requestedMarks > 10) {
      toast.error('Requested marks must be between 0 and 10.')
      return
    }
    if (requestedMarks === evalData.marks) {
      toast.error('Requested marks must be different from current marks.')
      return
    }
    if (!justification.trim() || justification.trim().length < 10) {
      toast.error('Please provide a justification (at least 10 characters).')
      return
    }

    setSubmittingRevision(true)
    try {
      await apiPost('/api/marks-revisions', {
        evaluation_id: evalData.id,
        requested_marks: Number(requestedMarks),
        justification: justification.trim()
      })
      toast.success('Marks revision request submitted to administrator!')
      setRevisionModalOpen(false)
    } catch (err: any) {
      console.error('Error submitting marks revision:', err)
      toast.error(err.message || 'Failed to submit revision request')
    } finally {
      setSubmittingRevision(false)
    }
  }

  const handleCloseWorkspace = () => {
    setSelectedSub(null)
    setActiveVersionSub(null)
    setSearchParams({})
  }

  if (loading) {
    return <LoadingSpinner className="min-h-[400px]" size={40} />
  }

  // Calculate high-level status stats
  const totalCount = latestSubmissions.length
  let pendingCount = 0
  let draftCount = 0
  let gradedCount = 0

  latestSubmissions.forEach(sub => {
    const evalData = Array.isArray(sub.evaluations) 
      ? sub.evaluations[0] 
      : sub.evaluations
    if (!evalData) {
      pendingCount++
    } else if (evalData.is_draft) {
      draftCount++
    } else {
      gradedCount++
    }
  })

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-[#111827] mb-1">Submissions Directory</h2>
          <p className="text-[#6B7280] text-sm">Review, execute, and grade student experiment code submissions.</p>
        </div>
        
        <button
          onClick={() => loadInitialData(true)}
          disabled={refreshing}
          className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-[#6B7280] hover:text-[#111827] bg-white border border-[#E5E7EB] hover:bg-[#F8FAFC] rounded-lg transition cursor-pointer self-start sm:self-auto disabled:opacity-50 shadow-sm"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Metrics Header */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-white border border-[#E5E7EB] rounded-2xl p-4 shadow-sm">
        <div className="text-center py-2 border-r border-[#E5E7EB]/60 last:border-0">
          <p className="text-xs text-[#6B7280] font-semibold uppercase tracking-wider">Total Submissions</p>
          <p className="text-2xl font-black text-[#111827] mt-0.5">{totalCount}</p>
        </div>
        <div className="text-center py-2 border-r border-[#E5E7EB]/60 last:border-0">
          <p className="text-xs text-[#6B7280] font-semibold uppercase tracking-wider">Pending Review</p>
          <p className="text-2xl font-black text-[#D97706] mt-0.5">{pendingCount}</p>
        </div>
        <div className="text-center py-2 border-r border-[#E5E7EB]/60 last:border-0">
          <p className="text-xs text-[#6B7280] font-semibold uppercase tracking-wider">Under Review (Draft)</p>
          <p className="text-2xl font-black text-amber-500 mt-0.5">{draftCount}</p>
        </div>
        <div className="text-center py-2 last:border-0">
          <p className="text-xs text-[#6B7280] font-semibold uppercase tracking-wider">Graded & Completed</p>
          <p className="text-2xl font-black text-[#10B981] mt-0.5">{gradedCount}</p>
        </div>
      </div>

      {/* Main Split Layout */}
      <div className={`grid grid-cols-1 lg:grid-cols-12 gap-6 items-start transition-all`}>
        {/* Left pane: Submissions Directory (Full width if no submission is active) */}
        <div className={`space-y-4 ${selectedSub ? 'lg:col-span-5' : 'lg:col-span-12'}`}>
          {/* Advanced Filter and Search Panel */}
          <div className="bg-white border border-[#E5E7EB] rounded-2xl p-4 shadow-sm space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 gap-3">
              {/* Student Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF]" />
                <input
                  type="text"
                  placeholder="Search student or enrollment..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-[#F8FAFC] border border-[#E5E7EB] focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5] rounded-xl text-xs text-[#111827] focus:outline-none transition"
                />
              </div>

              {/* Experiment Dropdown */}
              <div className="relative">
                <select
                  value={selectedExperimentFilter}
                  onChange={(e) => setSelectedExperimentFilter(e.target.value)}
                  className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E5E7EB] rounded-xl text-xs text-[#111827] focus:outline-none transition cursor-pointer"
                >
                  <option value="all">All Experiments</option>
                  {experiments.map(exp => (
                    <option key={exp.id} value={exp.id}>{exp.title}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* Grading Status Filter */}
              <div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E5E7EB] rounded-xl text-xs text-[#111827] focus:outline-none transition cursor-pointer"
                >
                  <option value="all">All Statuses</option>
                  <option value="pending">Pending Review</option>
                  <option value="draft">Under Review (Draft)</option>
                  <option value="graded">Graded (Final)</option>
                </select>
              </div>

              {/* Date Filter */}
              <div>
                <select
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E5E7EB] rounded-xl text-xs text-[#111827] focus:outline-none transition cursor-pointer"
                >
                  <option value="all">Any Date</option>
                  <option value="today">Submitted Today</option>
                  <option value="week">Last 7 Days</option>
                  <option value="month">Last 30 Days</option>
                </select>
              </div>
            </div>
          </div>

          {/* Submissions List */}
          <div className="bg-white border border-[#E5E7EB] rounded-2xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              {filteredSubmissions.length > 0 ? (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[#E5E7EB] text-[10px] font-bold text-[#6B7280] uppercase bg-[#F8FAFC]">
                      <th className="px-4 py-3">Student</th>
                      {!selectedSub && <th className="px-4 py-3">Experiment</th>}
                      <th className="px-4 py-3">Submitted</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Marks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5E7EB]/50 text-xs">
                    {filteredSubmissions.map((sub) => {
                      const submittedAtFormatted = new Date(sub.submitted_at).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })

                      const evalData = Array.isArray(sub.evaluations) 
                        ? sub.evaluations[0] 
                        : sub.evaluations

                      const isSelected = selectedSub?.id === sub.id

                      return (
                        <tr
                          key={sub.id}
                          onClick={() => handleSelectSubmission(sub)}
                          className={`hover:bg-[#F8FAFC] cursor-pointer transition ${
                            isSelected ? 'bg-[#EEF2FF] border-l-2 border-[#4F46E5]' : ''
                          }`}
                        >
                          <td className="px-4 py-3">
                            <div className="font-bold text-[#111827] truncate max-w-[120px]">
                              {sub.student?.full_name || 'Student'}
                            </div>
                            <div className="text-[10px] text-[#6B7280] font-semibold">
                              {sub.student?.enrollment_no || 'N/A'}
                            </div>
                          </td>

                          {!selectedSub && (
                            <td className="px-4 py-3 font-semibold text-[#111827] max-w-[160px] truncate">
                              {sub.experiments?.title}
                            </td>
                          )}

                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="font-medium text-[#111827]">{submittedAtFormatted}</div>
                            {sub.is_late && (
                              <div className="flex flex-col items-start gap-0.5 mt-0.5">
                                <span className="inline-block text-[8px] font-extrabold text-rose-500 bg-rose-50 border border-rose-100 px-1 py-0.2 rounded">
                                  LATE
                                </span>
                                {sub.late_status === 'pending' && (
                                  <span className="inline-block text-[8px] font-bold text-amber-600 bg-amber-50 border border-amber-100 px-1 py-0.2 rounded">
                                    PENDING APPROVAL
                                  </span>
                                )}
                                {sub.late_status === 'approved' && (
                                  <span className="inline-block text-[8px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 px-1 py-0.2 rounded">
                                    APPROVED
                                  </span>
                                )}
                                {sub.late_status === 'rejected' && (
                                  <span className="inline-block text-[8px] font-bold text-rose-600 bg-rose-50 border border-rose-150 px-1 py-0.2 rounded">
                                    REJECTED
                                  </span>
                                )}
                              </div>
                            )}
                          </td>

                          <td className="px-4 py-3 whitespace-nowrap">
                            {sub.is_late && sub.late_status === 'rejected' ? (
                              <span className="inline-block px-2 py-0.5 text-[10px] font-bold rounded-full bg-rose-100 text-rose-700 border border-rose-100">
                                Rejected
                              </span>
                            ) : sub.is_late && sub.late_status === 'pending' ? (
                              <span className="inline-block px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-100 text-amber-700 border border-amber-100">
                                Pending Review
                              </span>
                            ) : !evalData ? (
                              <span className="inline-block px-2 py-0.5 text-[10px] font-bold rounded-full bg-[#FEF3C7] text-[#D97706] border border-[#FEF3C7]">
                                Pending
                              </span>
                            ) : evalData.is_draft ? (
                              <span className="inline-block px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-100 text-amber-700 border border-amber-100">
                                Draft
                              </span>
                            ) : (
                              <span className="inline-block px-2 py-0.5 text-[10px] font-bold rounded-full bg-[#D1FAE5] text-[#10B981] border border-[#D1FAE5]">
                                Graded
                              </span>
                            )}
                          </td>

                          <td className="px-4 py-3 text-right font-black text-[#111827] whitespace-nowrap">
                            {evalData ? `${evalData.marks}/10` : '-'}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              ) : (
                <div className="p-8 text-center text-[#6B7280]">
                  No submissions found.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right pane: Review & Grading Workspace */}
        {selectedSub ? (
          <div className="lg:col-span-7 bg-white border border-[#E5E7EB] rounded-2xl p-6 shadow-md space-y-6 animate-scaleUp">
            {/* Detail Panel Header */}
            <div className="flex items-start justify-between pb-4 border-b border-[#E5E7EB]">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-[#4F46E5] font-extrabold bg-[#EEF2FF] px-2 py-0.5 rounded border border-[#EEF2FF] uppercase">
                    {activeVersionSub?.experiments?.subject || 'Lab'}
                  </span>
                  <h3 className="text-lg font-bold text-[#111827]">
                    {activeVersionSub?.experiments?.title}
                  </h3>
                </div>
                
                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-[#6B7280] font-medium">
                  <span className="flex items-center gap-1">
                    <User className="w-3.5 h-3.5 text-[#9CA3AF]" />
                    <strong>{activeVersionSub?.student?.full_name}</strong> ({activeVersionSub?.student?.enrollment_no})
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-[#9CA3AF]" />
                    v{activeVersionSub?.version} - {activeVersionSub?.is_late ? 'Late Submission' : 'On Time'}
                  </span>
                </div>
              </div>

              <button
                onClick={handleCloseWorkspace}
                className="p-1 hover:bg-[#F3F4F6] rounded-lg text-[#9CA3AF] hover:text-[#111827] transition cursor-pointer"
                title="Close review panel"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Version & Workspace Layout */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {/* Left Column: Version History Sidebar */}
              <div className="md:col-span-1 space-y-4">
                <div className="flex items-center gap-1.5 text-xs text-[#6B7280] font-bold uppercase tracking-wider">
                  <History className="w-4 h-4" />
                  <span>Version History</span>
                </div>
                
                <div className="flex md:flex-col gap-2 overflow-x-auto md:overflow-x-visible pb-2 md:pb-0">
                  {submissionHistory.map((vSub) => {
                    const isActive = activeVersionSub?.id === vSub.id
                    const vEval = Array.isArray(vSub.evaluations) 
                      ? vSub.evaluations[0] 
                      : vSub.evaluations
                    
                    let statusLabel = 'Unfinished'
                    if (vEval) {
                      statusLabel = vEval.is_draft ? 'Draft' : 'Graded'
                    }

                    return (
                      <button
                        key={vSub.id}
                        onClick={() => handleSwitchVersion(vSub)}
                        className={`flex flex-col items-start w-full px-3 py-2 text-left rounded-xl transition cursor-pointer shrink-0 md:shrink border ${
                          isActive
                            ? 'bg-[#4F46E5] text-white border-[#4F46E5] shadow-sm'
                            : 'bg-[#F8FAFC] hover:bg-[#F3F4F6] text-[#4B5563] border-[#E5E7EB]'
                        }`}
                      >
                        <div className="flex justify-between items-center w-full">
                          <span className="font-bold text-xs">Version {vSub.version}</span>
                          {vSub.is_late && (
                            <span className={`text-[8px] font-extrabold px-1 rounded ${
                              isActive ? 'bg-white/20 text-white' : 'bg-rose-50 text-rose-500'
                            }`}>
                              LATE
                            </span>
                          )}
                        </div>
                        <span className={`text-[9px] font-semibold mt-1 opacity-80 ${isActive ? 'text-white/80' : 'text-[#6B7280]'}`}>
                          {new Date(vSub.submitted_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                        </span>
                        <div className="flex items-center justify-between w-full mt-1.5 pt-1 border-t border-black/10 md:border-dashed">
                          <span className={`text-[9px] font-bold ${isActive ? 'text-white/90' : 'text-[#4F46E5]'}`}>
                            {statusLabel}
                          </span>
                          {vEval && (
                            <span className="text-[10px] font-black">{vEval.marks}/10</span>
                          )}
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Right Column: Code viewer & Console Tabs */}
              <div className="md:col-span-3 space-y-4">


                {/* Tab content workspace */}
                <div className="bg-slate-950 border border-slate-900 rounded-2xl min-h-[300px] overflow-hidden flex flex-col relative">
                  
                  {/* Tab 1: Source Code Viewer */}
                    <div className="flex-1 flex flex-col p-4">
                      {codeLoading ? (
                        <div className="flex-1 flex flex-col items-center justify-center py-20 text-slate-500 text-xs">
                          <Loader2 className="w-8 h-8 animate-spin text-[#4F46E5] mb-2" />
                          <span>Retrieving file contents...</span>
                        </div>
                      ) : (() => {
                        const filename = activeVersionSub?.file_url.split('/').pop() || ''
                        const ext = filename.split('.').pop()?.toLowerCase() || ''

                        if (ext === 'pdf') {
                          return (
                            <div className="flex-1 flex flex-col min-h-[500px]">
                              {/* File info bar inside editor */}
                              <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-800/80 text-[10px] font-mono text-slate-500">
                                <span>Format: <strong className="text-slate-300">PDF Document</strong></span>
                                <a
                                  href={activeVersionSub?.file_url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-[#4F46E5] hover:underline flex items-center gap-1"
                                >
                                  <Download className="w-3 h-3" /> View PDF
                                </a>
                              </div>
                              <iframe
                                src={activeVersionSub?.file_url}
                                className="w-full h-[500px] bg-white rounded-xl border border-slate-800 shadow-inner"
                                title="PDF Document Preview"
                              />
                            </div>
                          )
                        }

                        if (['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'].includes(ext)) {
                          const officeUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(activeVersionSub?.file_url || '')}`
                          return (
                            <div className="flex-1 flex flex-col min-h-[500px]">
                              {/* File info bar inside editor */}
                              <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-800/80 text-[10px] font-mono text-slate-500">
                                <span>Format: <strong className="text-slate-300">Office Document ({ext.toUpperCase()})</strong></span>
                                <a
                                  href={activeVersionSub?.file_url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-[#4F46E5] hover:underline flex items-center gap-1"
                                >
                                  <Download className="w-3 h-3" /> Download Document
                                </a>
                              </div>
                              <iframe
                                src={officeUrl}
                                className="w-full h-[500px] bg-white rounded-xl border border-slate-800 shadow-inner"
                                title="Office Document Preview"
                              />
                            </div>
                          )
                        }

                        if (codeError) {
                          return (
                            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 space-y-4">
                              <FileText className="w-16 h-16 text-rose-500/25" />
                              <p className="text-slate-400 text-xs leading-relaxed max-w-sm">
                                {codeError}
                              </p>
                              <a
                                href={activeVersionSub?.file_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#4F46E5] hover:bg-[#4338CA] text-white rounded-lg text-xs font-bold transition shadow"
                              >
                                <Download className="w-3.5 h-3.5" />
                                <span>Download File ({activeVersionSub?.language})</span>
                              </a>
                            </div>
                          )
                        }

                        return (
                          <div className="flex-1 overflow-auto max-h-[400px]">
                            {/* File info bar inside editor */}
                            <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-800/80 text-[10px] font-mono text-slate-500">
                              <span>Format: <strong className="text-slate-300">{activeVersionSub?.language}</strong></span>
                              <a
                                href={activeVersionSub?.file_url}
                                target="_blank"
                                rel="noreferrer"
                                className="text-[#4F46E5] hover:underline flex items-center gap-1"
                              >
                                <Download className="w-3 h-3" /> Download Source
                              </a>
                            </div>
                            
                            {/* Prism Syntax code block */}
                            <pre ref={codePreRef} className="text-xs font-mono !bg-transparent !p-0 !m-0 overflow-visible">
                              <code className={getLanguageClass(activeVersionSub?.language || '')}>
                                {codeText}
                              </code>
                            </pre>
                          </div>
                        )
                      })()}
                    </div>

                </div>
              </div>
            </div>

            {/* Assessment & Grading Section */}
            {activeVersionSub?.is_late && activeVersionSub.late_status === 'pending' ? (
              /* Render Late Submission Approval Card */
              <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-4 md:p-6 space-y-4 animate-fadeIn">
                <div className="flex items-center gap-2 border-b border-amber-500/10 pb-3">
                  <Clock className="w-5 h-5 text-amber-500" />
                  <h4 className="font-bold text-[#111827] text-sm">Late Submission Review</h4>
                  <span className="ml-auto inline-flex px-2 py-0.5 text-[10px] font-bold text-amber-600 bg-amber-50 border border-amber-100 rounded">
                    PENDING APPROVAL
                  </span>
                </div>
                
                <div className="text-xs space-y-2 text-[#4B5563]">
                  <p className="font-semibold text-slate-700">Student's Late Reason:</p>
                  <div className="bg-amber-50/50 border border-amber-200/50 p-3 rounded-xl italic">
                    "{activeVersionSub.late_reason || 'No reason provided.'}"
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-[#4B5563] text-xs font-bold uppercase tracking-wider" htmlFor="lateComment">
                    Teacher Review Comment
                  </label>
                  <textarea
                    id="lateComment"
                    rows={3}
                    placeholder="Provide review notes explaining your approval/rejection decision..."
                    value={lateComment}
                    onChange={(e) => setLateComment(e.target.value)}
                    className="w-full px-3.5 py-2 bg-white border border-[#E5E7EB] rounded-xl text-xs text-[#111827] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#4F46E5] focus:border-transparent transition resize-none"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-3 border-t border-[#E5E7EB]">
                  <button
                    type="button"
                    onClick={() => handleReviewLateSubmission('rejected')}
                    disabled={isReviewingLate}
                    className="px-4 py-2 border border-rose-200 hover:bg-rose-50 text-xs font-bold text-rose-600 rounded-lg transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {isReviewingLate ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
                    <span>Reject Submission</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleReviewLateSubmission('approved')}
                    disabled={isReviewingLate}
                    className="px-4 py-2 bg-[#10B981] hover:bg-[#059669] text-xs font-bold text-white rounded-lg transition flex items-center gap-1.5 cursor-pointer shadow-sm disabled:opacity-50"
                  >
                    {isReviewingLate ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                    <span>Approve Submission</span>
                  </button>
                </div>
              </div>
            ) : (
              /* Render standard grading / evaluation section */
              <div className="bg-[#F8FAFC] border border-[#E5E7EB] rounded-2xl p-4 md:p-6 space-y-4 animate-fadeIn">
                
                {/* Approval Status Banner (If late & approved/rejected) */}
                {activeVersionSub?.is_late && activeVersionSub.late_status === 'approved' && (
                  <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-xl flex items-start gap-2.5 text-xs text-emerald-800">
                    <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
                    <div>
                      <p className="font-bold">Late Submission Approved</p>
                      <p className="mt-0.5 opacity-90 leading-relaxed">
                        This late submission was approved by {activeVersionSub.reviewer ? (Array.isArray(activeVersionSub.reviewer) ? activeVersionSub.reviewer[0]?.full_name : (activeVersionSub.reviewer as any).full_name) : 'the instructor'} on {activeVersionSub.late_reviewed_at ? new Date(activeVersionSub.late_reviewed_at).toLocaleString() : 'N/A'}.
                      </p>
                      {activeVersionSub.late_teacher_comment && (
                        <p className="mt-1 font-semibold italic text-emerald-700">Comment: "{activeVersionSub.late_teacher_comment}"</p>
                      )}
                    </div>
                  </div>
                )}

                {activeVersionSub?.is_late && activeVersionSub.late_status === 'rejected' && (
                  <div className="bg-rose-50 border border-rose-100 p-4 rounded-xl flex items-start gap-2.5 text-xs text-rose-800">
                    <XCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                    <div>
                      <p className="font-bold">Late Submission Rejected</p>
                      <p className="mt-0.5 opacity-90 leading-relaxed">
                        This late submission was rejected by {activeVersionSub.reviewer ? (Array.isArray(activeVersionSub.reviewer) ? activeVersionSub.reviewer[0]?.full_name : (activeVersionSub.reviewer as any).full_name) : 'the instructor'} on {activeVersionSub.late_reviewed_at ? new Date(activeVersionSub.late_reviewed_at).toLocaleString() : 'N/A'}.
                      </p>
                      {activeVersionSub.late_teacher_comment && (
                        <p className="mt-1 font-semibold italic text-rose-700">Reason: "{activeVersionSub.late_teacher_comment}"</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Main Grading Controls (Hide if rejected) */}
                {activeVersionSub?.late_status === 'rejected' ? (
                  <div className="text-center py-6 text-[#9CA3AF] text-xs font-bold">
                    This late submission was rejected. Grading is disabled.
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-2 border-b border-[#E5E7EB] pb-3">
                      <Award className="w-5 h-5 text-[#4F46E5]" />
                      <h4 className="font-bold text-[#111827] text-sm">Grading Assessment</h4>
                      
                      {/* Grading form status tag */}
                      <span className="ml-auto">
                        {(() => {
                          const evalData = Array.isArray(activeVersionSub?.evaluations) 
                            ? activeVersionSub?.evaluations[0] 
                            : activeVersionSub?.evaluations
                          
                          if (!evalData) {
                            return (
                              <span className="inline-flex px-2 py-0.5 text-[10px] font-bold text-[#D97706] bg-[#FEF3C7] border border-[#FEF3C7] rounded">
                                PENDING
                              </span>
                            )
                          }
                          if (evalData.is_draft) {
                            return (
                              <span className="inline-flex px-2 py-0.5 text-[10px] font-bold text-amber-600 bg-amber-50 border border-amber-100 rounded">
                                DRAFT SAVED
                              </span>
                            )
                          }
                          return (
                            <span className="inline-flex px-2 py-0.5 text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 rounded">
                              FINALIZED & PUBLISHED
                            </span>
                          )
                        })()}
                      </span>
                    </div>

                    {/* Revision Status Notice */}
                    {(() => {
                      const evalData = Array.isArray(activeVersionSub?.evaluations) 
                        ? activeVersionSub?.evaluations[0] 
                        : activeVersionSub?.evaluations
                      
                      if (evalData && !evalData.is_draft) {
                        return (
                          <div className="bg-[#EEF2FF] border border-[#EEF2FF] p-3.5 rounded-xl flex items-start gap-2.5 text-xs text-[#4F46E5]">
                            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                            <div>
                              <p className="font-bold">Grade Finalized</p>
                              <p className="mt-0.5 opacity-90 leading-relaxed">
                                Marks are published to the student portal and locked. To change marks, click <strong>Request Marks Revision</strong> below to submit an adjustment request to the administrator.
                              </p>
                            </div>
                          </div>
                        )
                      }
                      return null
                    })()}

                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                      {/* Marks selection field */}
                      <div className="sm:col-span-1 space-y-2">
                        <label className="block text-[#4B5563] text-xs font-bold uppercase tracking-wider" htmlFor="marks">
                          Marks (out of 10)
                        </label>
                        <input
                          type="number"
                          id="marks"
                          min="0"
                          max="10"
                          placeholder="0-10"
                          value={marks}
                          onChange={(e) => {
                            const val = e.target.value === '' ? '' : Math.min(10, Math.max(0, Number(e.target.value)))
                            setMarks(val)
                          }}
                          disabled={activeVersionSub?.evaluations ? !Array.isArray(activeVersionSub.evaluations) && !activeVersionSub.evaluations.is_draft : false}
                          className="w-full px-3 py-2 bg-white border border-[#E5E7EB] disabled:bg-[#F3F4F6] disabled:text-[#9CA3AF] rounded-xl text-sm font-bold text-center text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#4F46E5] focus:border-transparent transition"
                        />
                      </div>

                      {/* Remarks feedback textarea */}
                      <div className="sm:col-span-3 space-y-2">
                        <label className="block text-[#4B5563] text-xs font-bold uppercase tracking-wider" htmlFor="remarks">
                          Detailed Feedback & Remarks
                        </label>
                        <textarea
                          id="remarks"
                          rows={3}
                          placeholder="Enter code critique, logic suggestions, formatting reviews..."
                          value={remarks}
                          onChange={(e) => setRemarks(e.target.value)}
                          className="w-full px-3.5 py-2 bg-white border border-[#E5E7EB] rounded-xl text-xs text-[#111827] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#4F46E5] focus:border-transparent transition resize-none"
                        />
                      </div>
                    </div>

                    {/* Assessment Actions footer */}
                    <div className="flex justify-end gap-3 pt-3 border-t border-[#E5E7EB]">
                {(() => {
                  const evalData = Array.isArray(activeVersionSub?.evaluations) 
                    ? activeVersionSub?.evaluations[0] 
                    : activeVersionSub?.evaluations

                  if (evalData && !evalData.is_draft) {
                    // Finalized assessment buttons
                    return (
                      <>
                        <button
                          type="button"
                          onClick={() => handleSaveGrade(false)} // This updates remarks but ignores marks changes (allowed by backend)
                          disabled={isSubmittingGrade}
                          className="px-4 py-2 border border-[#E5E7EB] hover:bg-[#F8FAFC] text-xs font-bold text-[#4B5563] rounded-lg transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                        >
                          <Save className="w-3.5 h-3.5" />
                          <span>Update Remarks</span>
                        </button>
                        
                        <button
                          type="button"
                          onClick={handleOpenRevisionModal}
                          className="px-4 py-2 bg-[#4F46E5] hover:bg-[#4338CA] text-xs font-bold text-white rounded-lg transition flex items-center gap-1.5 cursor-pointer shadow-sm"
                        >
                          <Edit className="w-3.5 h-3.5" />
                          <span>Request Marks Revision</span>
                        </button>
                      </>
                    )
                  }

                  // Draft / Unsubmitted assessment buttons
                  return (
                    <>
                      <button
                        type="button"
                        onClick={() => handleSaveGrade(false)} // Save Draft
                        disabled={isSubmittingGrade}
                        className="px-4 py-2 border border-[#E5E7EB] hover:bg-[#F8FAFC] text-xs font-bold text-[#4B5563] rounded-lg transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        {isSubmittingGrade ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Save className="w-3.5 h-3.5" />
                        )}
                        <span>Save Draft</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleSaveGrade(true)} // Finalize
                        disabled={isSubmittingGrade}
                        className="px-4 py-2 bg-[#10B981] hover:bg-[#059669] text-xs font-bold text-white rounded-lg transition flex items-center gap-1.5 cursor-pointer shadow-sm disabled:opacity-50"
                      >
                        {isSubmittingGrade ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Check className="w-3.5 h-3.5" />
                        )}
                        <span>Finalize & Publish Grade</span>
                      </button>
                    </>
                  )
                })()}
              </div>
            </>
          )}
        </div>
      )}
    </div>
        ) : (
          /* Workspace Blank State */
          <div className="lg:col-span-7 bg-white border border-[#E5E7EB] rounded-2xl p-16 text-center shadow-sm flex flex-col items-center justify-center min-h-[400px]">
            <Code2 className="w-16 h-16 text-[#E5E7EB] mb-4" />
            <h3 className="text-base font-bold text-[#111827] mb-1">Assessment Workspace</h3>
            <p className="text-xs text-[#6B7280] max-w-sm leading-relaxed mb-6">
              Select a student submission from the directory list on the left to start code review and grade lab assignments.
            </p>
            
            {/* Quick Tips */}
            <div className="bg-[#F8FAFC] border border-[#E5E7EB] p-4 rounded-2xl max-w-md w-full grid grid-cols-2 gap-4 text-xs font-medium text-[#6B7280] text-left">
              <div className="space-y-1">
                <span className="text-[#4F46E5] font-bold block uppercase tracking-wider text-[9px]">Syntax Highlighter</span>
                <p className="text-[10px] leading-relaxed">Inline editor supports 6 languages with line numbers.</p>
              </div>
              <div className="space-y-1 border-l border-[#E5E7EB] pl-3">
                <span className="text-amber-500 font-bold block uppercase tracking-wider text-[9px]">Draft Grades</span>
                <p className="text-[10px] leading-relaxed">Save drafts safely before publishing finalized marks.</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal: Marks Revision Request form */}
      {revisionModalOpen && activeVersionSub && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fadeIn">
          {/* Overlay backdrop */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-xs"
            onClick={() => !submittingRevision && setRevisionModalOpen(false)}
          ></div>

          {/* Modal Content */}
          <div className="relative w-full max-w-md bg-[#FFFFFF] border border-[#E5E7EB] rounded-3xl shadow-2xl p-6 md:p-8 text-[#111827] z-10 animate-scaleUp">
            <button
              onClick={() => !submittingRevision && setRevisionModalOpen(false)}
              className="absolute top-4 right-4 text-[#6B7280] hover:text-[#111827] disabled:opacity-50"
              disabled={submittingRevision}
            >
              <X className="w-5 h-5" />
            </button>

            {/* Modal Title */}
            <h3 className="text-xl font-extrabold text-[#111827] mb-2">
              Request Marks Revision
            </h3>
            <p className="text-[#6B7280] text-xs font-medium mb-6">
              You are requesting to modify a finalized grade. This request will be sent to the administrator for verification.
            </p>

            {/* Details Box */}
            <div className="bg-[#F8FAFC] border border-[#E5E7EB] p-4 rounded-2xl space-y-2 text-xs mb-5">
              <div className="flex justify-between">
                <span className="text-[#6B7280] font-semibold uppercase">Student</span>
                <span className="text-[#111827] font-bold">{activeVersionSub.student?.full_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#6B7280] font-semibold uppercase">Experiment</span>
                <span className="text-[#111827] font-semibold truncate max-w-[200px]">{activeVersionSub.experiments?.title}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#6B7280] font-semibold uppercase">Current Marks</span>
                <span className="text-rose-500 font-bold">
                  {(() => {
                    const evalData = Array.isArray(activeVersionSub.evaluations) 
                      ? activeVersionSub.evaluations[0] 
                      : activeVersionSub.evaluations
                    return evalData ? evalData.marks : 0
                  })()} / 10
                </span>
              </div>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); handleSubmitRevision(); }} className="space-y-4">
              {/* Requested Marks input */}
              <div className="space-y-2">
                <label className="block text-[#6B7280] text-xs font-bold uppercase tracking-wider" htmlFor="requestedMarks">
                  Requested Marks (out of 10) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  id="requestedMarks"
                  min="0"
                  max="10"
                  required
                  placeholder="0-10"
                  value={requestedMarks}
                  onChange={(e) => setRequestedMarks(e.target.value === '' ? '' : Math.min(10, Math.max(0, Number(e.target.value))))}
                  disabled={submittingRevision}
                  className="w-32 px-4 py-2 bg-white border border-[#E5E7EB] rounded-xl text-sm font-bold text-center text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#4F46E5] focus:border-transparent transition"
                />
              </div>

              {/* Justification remarks textarea */}
              <div className="space-y-2">
                <label className="block text-[#6B7280] text-xs font-bold uppercase tracking-wider" htmlFor="justification">
                  Revision Justification <span className="text-rose-500">*</span>
                </label>
                <textarea
                  id="justification"
                  rows={3}
                  required
                  placeholder="Explain why you need to revise this grade (at least 10 characters)..."
                  value={justification}
                  onChange={(e) => setJustification(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white border border-[#E5E7EB] rounded-xl text-xs text-[#111827] placeholder-[#6B7280]/50 focus:outline-none focus:ring-2 focus:ring-[#4F46E5] focus:border-transparent transition resize-none"
                  disabled={submittingRevision}
                />
              </div>

              {/* Actions Footer */}
              <div className="flex justify-end gap-3 pt-4 border-t border-[#E5E7EB] mt-6">
                <button
                  type="button"
                  onClick={() => setRevisionModalOpen(false)}
                  className="px-4 py-2 border border-[#E5E7EB] rounded-lg text-xs font-bold text-[#6B7280] hover:text-[#111827] hover:bg-[#F8FAFC] transition cursor-pointer"
                  disabled={submittingRevision}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#4F46E5] hover:bg-[#4338CA] text-white font-bold rounded-lg text-xs transition flex items-center gap-1.5 cursor-pointer shadow-sm disabled:opacity-50"
                  disabled={submittingRevision}
                >
                  {submittingRevision ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Submitting...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Submit Request</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}

export default Submissions
