import React, { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../store/authStore'
import { Search, HelpCircle, Loader2, Eye, Award, CheckCircle2, ChevronRight, X, FileCode, CheckSquare, Filter, RefreshCw } from 'lucide-react'
import { toast } from 'react-hot-toast'

interface Evaluation {
  id: string
  marks: number
  max_marks: number
  remarks?: string
  evaluated_at: string
}

interface Submission {
  id: string
  file_url: string
  language: string
  submitted_at: string
  is_late: boolean
  version: number
  experiment_id: string
  student_id: string
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
  evaluations: Evaluation[]
}

interface TeacherExperiment {
  id: string
  title: string
  subject: string
}

export const Submissions: React.FC = () => {
  const { user } = useAuthStore()
  const [searchParams, setSearchParams] = useSearchParams()
  const queryExperimentId = searchParams.get('experimentId')
  const querySubmissionId = searchParams.get('submissionId')

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [experiments, setExperiments] = useState<TeacherExperiment[]>([])

  // Filters
  const [selectedExperimentId, setSelectedExperimentId] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'evaluated'>('all')
  const [searchQuery, setSearchQuery] = useState<string>('')

  // Drawer / Side panel state
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null)
  
  // Evaluation form state
  const [marks, setMarks] = useState<string>('')
  const [remarks, setRemarks] = useState<string>('')
  const [savingEvaluation, setSavingEvaluation] = useState(false)

  const fetchData = async (isRefresh = false) => {
    if (!user) return
    if (isRefresh) setRefreshing(true)
    else setLoading(true)

    try {
      // 1. Fetch teacher's experiments for the dropdown filter
      const { data: exps, error: expsError } = await supabase
        .from('experiments')
        .select('id, title, subject')
        .eq('created_by', user.id)
        .order('created_at', { ascending: false })

      if (expsError) throw expsError
      setExperiments(exps || [])

      // 2. Fetch all student submissions for the teacher's experiments
      const { data: subs, error: subsError } = await supabase
        .from('code_submissions')
        .select(`
          id,
          file_url,
          language,
          submitted_at,
          is_late,
          version,
          experiment_id,
          student_id,
          experiments!inner (
            id,
            title,
            subject,
            created_by
          ),
          profiles!code_submissions_student_id_fkey (
            id,
            full_name,
            enrollment_no,
            department
          ),
          evaluations (
            id,
            marks,
            max_marks,
            remarks,
            evaluated_at
          )
        `)
        .eq('experiments.created_by', user.id)
        .order('submitted_at', { ascending: false })

      if (subsError) throw subsError

      if (subs) {
        const formatted: Submission[] = subs.map((item: any) => ({
          id: item.id,
          file_url: item.file_url,
          language: item.language,
          submitted_at: item.submitted_at,
          is_late: item.is_late,
          version: item.version,
          experiment_id: item.experiment_id,
          student_id: item.student_id,
          experiment: Array.isArray(item.experiments) ? item.experiments[0] : item.experiments,
          student: Array.isArray(item.profiles) ? item.profiles[0] : item.profiles,
          evaluations: item.evaluations || [],
        }))

        setSubmissions(formatted)

        // Handle URL parameters if present
        if (queryExperimentId) {
          setSelectedExperimentId(queryExperimentId)
          // Clean up the URL search params so it doesn't lock the filter on page refreshes
          searchParams.delete('experimentId')
          setSearchParams(searchParams)
        }

        if (querySubmissionId) {
          const matchedSub = formatted.find(s => s.id === querySubmissionId)
          if (matchedSub) {
            handleOpenEvaluation(matchedSub)
          }
          // Clean up the URL query param
          searchParams.delete('submissionId')
          setSearchParams(searchParams)
        }
      }
    } catch (err: any) {
      console.error('Error fetching submissions page data:', err)
      toast.error(err.message || 'Failed to fetch submissions')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [user])

  const handleOpenEvaluation = (sub: Submission) => {
    setSelectedSubmission(sub)
    const existingEval = sub.evaluations && sub.evaluations.length > 0 ? sub.evaluations[0] : null
    
    if (existingEval) {
      setMarks(String(existingEval.marks))
      setRemarks(existingEval.remarks || '')
    } else {
      setMarks('')
      setRemarks('')
    }
    setDrawerOpen(true)
  }

  const handleSaveEvaluation = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !selectedSubmission) return

    const parsedMarks = parseInt(marks)
    if (isNaN(parsedMarks) || parsedMarks < 0 || parsedMarks > 10) {
      toast.error('Please enter a valid mark between 0 and 10.')
      return
    }

    setSavingEvaluation(true)
    try {
      const existingEval = selectedSubmission.evaluations && selectedSubmission.evaluations.length > 0
        ? selectedSubmission.evaluations[0]
        : null

      if (existingEval) {
        // Update
        const { error: evalError } = await supabase
          .from('evaluations')
          .update({
            marks: parsedMarks,
            remarks: remarks.trim(),
            evaluated_at: new Date().toISOString()
          })
          .eq('id', existingEval.id)

        if (evalError) throw evalError
      } else {
        // Insert
        const { error: evalError } = await supabase
          .from('evaluations')
          .insert({
            submission_id: selectedSubmission.id,
            teacher_id: user.id,
            marks: parsedMarks,
            max_marks: 10,
            remarks: remarks.trim()
          })

        if (evalError) throw evalError
      }

      // Update experiment assignment to verified
      const { error: assignError } = await supabase
        .from('experiment_assignments')
        .update({ status: 'verified' })
        .eq('experiment_id', selectedSubmission.experiment_id)
        .eq('student_id', selectedSubmission.student_id)

      if (assignError) {
        console.error('Error updating assignment status:', assignError)
      }

      toast.success('Evaluation saved successfully!')
      setDrawerOpen(false)
      fetchData()
    } catch (err: any) {
      console.error('Error saving evaluation:', err)
      toast.error(err.message || 'Failed to save evaluation')
    } finally {
      setSavingEvaluation(false)
    }
  }

  // Submissions search & filters logic
  const filteredSubmissions = submissions.filter(sub => {
    const matchesExperiment = selectedExperimentId === 'all' || sub.experiment_id === selectedExperimentId
    
    const isEvaluated = sub.evaluations && sub.evaluations.length > 0
    const matchesStatus = 
      statusFilter === 'all' || 
      (statusFilter === 'evaluated' && isEvaluated) || 
      (statusFilter === 'pending' && !isEvaluated)
    
    const searchLower = searchQuery.toLowerCase()
    const matchesSearch = 
      sub.student?.full_name?.toLowerCase().includes(searchLower) ||
      sub.student?.enrollment_no?.toLowerCase().includes(searchLower) ||
      sub.experiment?.title?.toLowerCase().includes(searchLower) ||
      sub.language?.toLowerCase().includes(searchLower)

    return matchesExperiment && matchesStatus && matchesSearch
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-[#6366F1] animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6 relative animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white mb-1">Code Submissions</h2>
          <p className="text-slate-400 text-sm">Review student code, download submissions, and grade their experiments.</p>
        </div>
        <button
          onClick={() => fetchData(true)}
          disabled={refreshing}
          className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:text-white bg-[#1E293B] border border-slate-800 rounded-lg hover:border-slate-700 transition cursor-pointer self-start sm:self-auto disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Advanced Filters Bar */}
      <div className="bg-[#1E293B] border border-slate-800 p-5 rounded-xl space-y-4">
        <div className="flex items-center gap-2 text-slate-300 text-xs font-bold uppercase tracking-wider">
          <Filter className="w-4 h-4 text-[#6366F1]" />
          <span>Filter Submissions</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search student or experiment..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-[#0F172A] border border-slate-800 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#6366F1] focus:border-transparent transition"
            />
          </div>

          {/* Experiment Select */}
          <div>
            <select
              value={selectedExperimentId}
              onChange={(e) => setSelectedExperimentId(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-[#0F172A] border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#6366F1] focus:border-transparent transition cursor-pointer"
            >
              <option value="all">All Experiments</option>
              {experiments.map((exp) => (
                <option key={exp.id} value={exp.id}>
                  {exp.subject} - {exp.title}
                </option>
              ))}
            </select>
          </div>

          {/* Status Tab buttons */}
          <div className="lg:col-span-2 flex bg-[#0F172A] border border-slate-800 rounded-lg p-0.5 w-full">
            {(['all', 'pending', 'evaluated'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`flex-1 px-4 py-1.5 text-xs font-semibold rounded-md transition-all uppercase tracking-wider cursor-pointer whitespace-nowrap ${
                  statusFilter === status
                    ? 'bg-[#6366F1] text-white shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {status === 'all' ? 'All' : status === 'pending' ? 'Pending Review' : 'Evaluated'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Submissions Table */}
      <div className="bg-[#1E293B] border border-slate-800 rounded-xl shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          {filteredSubmissions.length > 0 ? (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-xs font-semibold text-slate-400 uppercase bg-[#182235]/40">
                  <th className="px-6 py-4">Student Name</th>
                  <th className="px-6 py-4">Experiment Title</th>
                  <th className="px-6 py-4">Language</th>
                  <th className="px-6 py-4">Submitted At</th>
                  <th className="px-6 py-4">Late</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-sm">
                {filteredSubmissions.map((sub) => {
                  const submittedAtFormatted = new Date(sub.submitted_at).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })

                  const isEvaluated = sub.evaluations && sub.evaluations.length > 0
                  const currentEval = isEvaluated ? sub.evaluations[0] : null

                  return (
                    <tr key={sub.id} className="hover:bg-slate-800/20 transition-colors">
                      {/* Student details */}
                      <td className="px-6 py-4">
                        <div className="font-semibold text-white">
                          {sub.student?.full_name || 'Unknown Student'}
                        </div>
                        <div className="text-xs text-slate-500 font-medium">
                          {sub.student?.enrollment_no || 'No enrollment'}
                        </div>
                      </td>

                      {/* Experiment details */}
                      <td className="px-6 py-4">
                        <div className="font-medium text-slate-300">
                          {sub.experiment?.title || 'Untitled Experiment'}
                        </div>
                        <div className="text-xs text-slate-500 font-medium">
                          {sub.experiment?.subject || 'N/A'}
                        </div>
                      </td>

                      {/* Language */}
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700 capitalize">
                          <FileCode className="w-3.5 h-3.5 text-slate-400" />
                          {sub.language}
                        </span>
                      </td>

                      {/* Submitted At */}
                      <td className="px-6 py-4 text-slate-400">
                        {submittedAtFormatted}
                        <div className="text-[10px] text-slate-500 mt-0.5">Version {sub.version}</div>
                      </td>

                      {/* Late Badge */}
                      <td className="px-6 py-4">
                        {sub.is_late ? (
                          <span className="inline-block text-[10px] font-bold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">
                            LATE
                          </span>
                        ) : (
                          <span className="inline-block text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                            ON TIME
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2.5">
                          <a
                            href={sub.file_url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#1E293B] border border-slate-700 hover:border-slate-600 rounded-lg text-xs font-bold text-slate-300 hover:text-white transition cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>View File</span>
                          </a>
                          
                          <button
                            onClick={() => handleOpenEvaluation(sub)}
                            className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                              isEvaluated
                                ? 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20'
                                : 'bg-[#6366F1] text-white hover:bg-[#5053db] hover:shadow-md'
                            }`}
                          >
                            {isEvaluated ? (
                              <>
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Graded: {currentEval?.marks}/10</span>
                              </>
                            ) : (
                              <>
                                <Award className="w-3.5 h-3.5" />
                                <span>Evaluate</span>
                              </>
                            )}
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
              <HelpCircle className="w-12 h-12 text-slate-600 mx-auto mb-4" />
              No student submissions found matching the criteria.
            </div>
          )}
        </div>
      </div>

      {/* Side Panel Drawer - Evaluation */}
      {drawerOpen && selectedSubmission && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Overlay backdrop */}
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fadeIn" 
            onClick={() => !savingEvaluation && setDrawerOpen(false)}
          ></div>

          {/* Drawer content body */}
          <div className="relative w-full max-w-md bg-[#1E293B] border-l border-slate-800 h-full p-6 md:p-8 flex flex-col justify-between text-slate-100 z-10 animate-slideLeft shadow-2xl">
            <div>
              {/* Drawer Header */}
              <div className="flex items-center justify-between pb-5 border-b border-slate-800 mb-6">
                <div>
                  <h3 className="text-lg font-bold text-white">Evaluate Submission</h3>
                  <p className="text-slate-400 text-xs mt-0.5">Grade work and write remarks for students.</p>
                </div>
                <button
                  onClick={() => !savingEvaluation && setDrawerOpen(false)}
                  className="text-slate-400 hover:text-white disabled:opacity-50"
                  disabled={savingEvaluation}
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Submission Details Summary */}
              <div className="bg-[#0F172A] border border-slate-800 rounded-xl p-4 space-y-3 mb-6 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500 font-semibold uppercase">Student</span>
                  <span className="text-white font-bold text-right">
                    {selectedSubmission.student?.full_name} ({selectedSubmission.student?.enrollment_no})
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-semibold uppercase">Experiment</span>
                  <span className="text-slate-300 font-semibold text-right max-w-[200px] truncate">
                    {selectedSubmission.experiment?.title}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-semibold uppercase">File Details</span>
                  <span className="text-slate-300 font-medium capitalize">
                    {selectedSubmission.language} (v{selectedSubmission.version})
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-semibold uppercase">Submitted</span>
                  <span className="text-slate-300 font-medium">
                    {new Date(selectedSubmission.submitted_at).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-semibold uppercase">Status</span>
                  <span>
                    {selectedSubmission.is_late ? (
                      <span className="text-rose-400 font-bold">LATE</span>
                    ) : (
                      <span className="text-emerald-400 font-bold">ON TIME</span>
                    )}
                  </span>
                </div>
                <div className="pt-2.5 border-t border-slate-800 flex justify-end">
                  <a
                    href={selectedSubmission.file_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-[#6366F1] hover:underline font-bold"
                  >
                    <span>Inspect student file</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>

              {/* Evaluation Form */}
              <form onSubmit={handleSaveEvaluation} className="space-y-5">
                {/* Marks (0-10) */}
                <div>
                  <label className="block text-slate-300 text-xs font-semibold uppercase tracking-wider mb-2" htmlFor="marks">
                    Marks Awarded (Out of 10) <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      id="marks"
                      min={0}
                      max={10}
                      required
                      placeholder="e.g. 8"
                      value={marks}
                      onChange={(e) => setMarks(e.target.value)}
                      className="w-full px-4 py-2.5 bg-[#0F172A] border border-slate-800 rounded-lg text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-[#6366F1] focus:border-transparent transition"
                      disabled={savingEvaluation}
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-slate-500 font-bold">/ 10</span>
                  </div>
                </div>

                {/* Remarks Textarea */}
                <div>
                  <label className="block text-slate-300 text-xs font-semibold uppercase tracking-wider mb-2" htmlFor="remarks">
                    Teacher Remarks / Feedback
                  </label>
                  <textarea
                    id="remarks"
                    rows={6}
                    placeholder="Provide constructive feedback, highlight issues, or list improvements..."
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    className="w-full px-4 py-2.5 bg-[#0F172A] border border-slate-800 rounded-lg text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-[#6366F1] focus:border-transparent transition resize-none"
                    disabled={savingEvaluation}
                  />
                </div>
              </form>
            </div>

            {/* Actions Footer */}
            <div className="flex gap-3 pt-5 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="flex-1 py-2.5 border border-slate-800 hover:border-slate-700 rounded-lg text-xs font-semibold text-slate-400 hover:text-white transition cursor-pointer"
                disabled={savingEvaluation}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveEvaluation}
                className="flex-1 py-2.5 bg-[#6366F1] hover:bg-[#5053db] disabled:bg-slate-850 disabled:text-slate-500 text-white font-bold rounded-lg text-xs transition flex justify-center items-center gap-1.5 cursor-pointer shadow-lg"
                disabled={savingEvaluation}
              >
                {savingEvaluation ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <CheckSquare className="w-4 h-4" />
                    <span>Submit Evaluation</span>
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

export default Submissions
