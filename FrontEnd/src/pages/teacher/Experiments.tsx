import React, { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../store/authStore'
import { Calendar, Edit2, Archive, Eye, X, Upload, Loader2, Plus, Search, HelpCircle, FileText, CheckCircle, RefreshCw, Trash2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-hot-toast'
import LoadingSpinner from '../../components/LoadingSpinner'
import { apiDelete } from '../../lib/api'


interface Experiment {
  id: string
  title: string
  subject: string
  description: string
  instructions_url?: string
  deadline: string
  is_archived: boolean
  created_at: string
  target_semester?: string
  target_session?: string
  target_section?: string
}

export const Experiments: React.FC = () => {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [experiments, setExperiments] = useState<Experiment[]>([])
  
  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('')
  const [showArchived, setShowArchived] = useState<boolean>(false)

  // Modal form state
  const [modalOpen, setModalOpen] = useState(false)
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create')
  const [editingId, setEditingId] = useState<string | null>(null)
  
  // Form fields
  const [title, setTitle] = useState('')
  const [subject, setSubject] = useState('')
  const [description, setDescription] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [existingInstructionsUrl, setExistingInstructionsUrl] = useState('')
  const [deadline, setDeadline] = useState('')
  const [targetSemester, setTargetSemester] = useState('all')
  const [targetSession, setTargetSession] = useState('all')
  const [targetSection, setTargetSection] = useState('all')
  
  const [submitting, setSubmitting] = useState(false)

  const fetchExperiments = async (isRefresh = false) => {
    if (!user) return
    if (isRefresh) setRefreshing(true)
    else setLoading(true)

    try {
      const { data, error } = await supabase
        .from('experiments')
        .select('*')
        .eq('created_by', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      if (data) {
        setExperiments(data)
      }
    } catch (err: any) {
      console.error('Error fetching experiments:', err)
      toast.error(err.message || 'Failed to fetch experiments')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchExperiments()
  }, [user])

  const formatDateTimeLocal = (dateStr: string) => {
    if (!dateStr) return ''
    const date = new Date(dateStr)
    const pad = (num: number) => String(num).padStart(2, '0')
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
  }

  const openCreateModal = () => {
    setModalMode('create')
    setEditingId(null)
    setTitle('')
    setSubject('')
    setDescription('')
    setFile(null)
    setExistingInstructionsUrl('')
    setTargetSemester('all')
    setTargetSession('all')
    setTargetSection('all')
    
    // Set default deadline to 7 days from now, at 23:59
    const defaultDate = new Date()
    defaultDate.setDate(defaultDate.getDate() + 7)
    defaultDate.setHours(23, 59, 0, 0)
    setDeadline(formatDateTimeLocal(defaultDate.toISOString()))
    
    setModalOpen(true)
  }

  const openEditModal = (exp: Experiment) => {
    setModalMode('edit')
    setEditingId(exp.id)
    setTitle(exp.title)
    setSubject(exp.subject)
    setDescription(exp.description)
    setFile(null)
    setExistingInstructionsUrl(exp.instructions_url || '')
    setDeadline(formatDateTimeLocal(exp.deadline))
    setTargetSemester(exp.target_semester || 'all')
    setTargetSession(exp.target_session || 'all')
    setTargetSection(exp.target_section || 'all')
    setModalOpen(true)
  }

  const handleArchiveToggle = async (exp: Experiment) => {
    const updatedStatus = !exp.is_archived
    const actionText = updatedStatus ? 'archived' : 'restored'
    try {
      const { error } = await supabase
        .from('experiments')
        .update({ is_archived: updatedStatus })
        .eq('id', exp.id)

      if (error) throw error
      
      setExperiments(prev =>
        prev.map(item => item.id === exp.id ? { ...item, is_archived: updatedStatus } : item)
      )
      toast.success(`Experiment successfully ${actionText}`)
    } catch (err: any) {
      console.error(`Error toggling archive status:`, err)
      toast.error(err.message || `Failed to change experiment status`)
    }
  }

  const handleDelete = async (exp: Experiment) => {
    if (!window.confirm(`Are you absolutely sure you want to permanently delete the experiment "${exp.title}"? This will delete all student submissions, grades, and associated files permanently.`)) {
      return
    }

    try {
      await apiDelete(`/api/experiments/${exp.id}`)
      toast.success('Experiment and all details deleted permanently')
      fetchExperiments()
    } catch (err: any) {
      console.error('Error deleting experiment:', err)
      toast.error(err.message || 'Failed to delete experiment')
    }
  }


  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    if (!title.trim() || !subject.trim() || !description.trim() || !deadline) {
      toast.error('Please fill in all required fields.')
      return
    }

    setSubmitting(true)
    try {
      let instructionsUrl = existingInstructionsUrl

      // Upload file if new one is selected
      if (file) {
        const bucketName = 'instructions'
        const fileExt = file.name.split('.').pop()
        const filePath = `${user.id}/${Date.now()}.${fileExt}`

        let { error: uploadError } = await supabase.storage
          .from(bucketName)
          .upload(filePath, file)

        // Try creating the bucket if not found
        if (uploadError && uploadError.message.includes('not found')) {
          const { error: createError } = await supabase.storage.createBucket(bucketName, { public: true })
          if (!createError) {
            const { error: retryError } = await supabase.storage
              .from(bucketName)
              .upload(filePath, file)
            uploadError = retryError
          } else {
            throw new Error(`Upload bucket creation failed: ${createError.message}`)
          }
        }

        if (uploadError) {
          throw new Error(`Upload failed: ${uploadError.message}`)
        }

        const { data: urlData } = supabase.storage
          .from(bucketName)
          .getPublicUrl(filePath)
        
        if (urlData?.publicUrl) {
          instructionsUrl = urlData.publicUrl
        }
      }

      const targetSemVal = targetSemester === 'all' ? null : targetSemester
      const targetSessVal = targetSession === 'all' || !targetSession.trim() ? null : targetSession.trim()
      const targetSectVal = targetSection === 'all' || !targetSection.trim() ? null : targetSection.trim()

      if (modalMode === 'create') {
        // 1. Insert experiment
        const { data: newExp, error: createError } = await supabase
          .from('experiments')
          .insert({
            title: title.trim(),
            subject: subject.trim(),
            description: description.trim(),
            instructions_url: instructionsUrl || null,
            deadline: new Date(deadline).toISOString(),
            created_by: user.id,
            is_archived: false,
            target_semester: targetSemVal,
            target_session: targetSessVal,
            target_section: targetSectVal,
          })
          .select()
          .single()

        if (createError) throw createError

        // 2. Fetch targeted student profiles and assign
        const query = supabase
          .from('profiles')
          .select('id')
          .eq('role', 'student')

        if (targetSemVal) query.eq('semester', targetSemVal)
        if (targetSessVal) query.eq('session', targetSessVal)
        if (targetSectVal) query.eq('section', targetSectVal)

        const { data: students, error: studentsError } = await query

        if (studentsError) throw studentsError

        if (students && students.length > 0) {
          const assignments = students.map(student => ({
            experiment_id: newExp.id,
            student_id: student.id,
            status: 'pending'
          }))

          const { error: assignError } = await supabase
            .from('experiment_assignments')
            .insert(assignments)

          if (assignError) {
            console.error('Error assigning experiment to students:', assignError)
            toast.error('Experiment created, but assigning to students failed.')
          }
        }

        toast.success('Experiment created successfully')
      } else {
        // Update experiment
        if (!editingId) return
        const { error: updateError } = await supabase
          .from('experiments')
          .update({
            title: title.trim(),
            subject: subject.trim(),
            description: description.trim(),
            instructions_url: instructionsUrl || null,
            deadline: new Date(deadline).toISOString(),
            target_semester: targetSemVal,
            target_session: targetSessVal,
            target_section: targetSectVal,
          })
          .eq('id', editingId)

        if (updateError) throw updateError

        // Sync student assignments
        // A. Fetch current assignments
        const { data: currentAssignments, error: curError } = await supabase
          .from('experiment_assignments')
          .select('id, student_id, status')
          .eq('experiment_id', editingId)

        if (curError) throw curError

        // B. Fetch targeted student profiles
        const query = supabase
          .from('profiles')
          .select('id')
          .eq('role', 'student')

        if (targetSemVal) query.eq('semester', targetSemVal)
        if (targetSessVal) query.eq('session', targetSessVal)
        if (targetSectVal) query.eq('section', targetSectVal)

        const { data: targetStudents, error: targetError } = await query
        if (targetError) throw targetError

        if (targetStudents) {
          const assignedStudentIds = new Set(currentAssignments?.map(a => a.student_id) || [])
          
          // C. Add assignments for students who match now but didn't have one before
          const newStudentAssignments = targetStudents
            .filter(s => !assignedStudentIds.has(s.id))
            .map(s => ({
              experiment_id: editingId,
              student_id: s.id,
              status: 'pending'
            }))

          if (newStudentAssignments.length > 0) {
            const { error: insertErr } = await supabase
              .from('experiment_assignments')
              .insert(newStudentAssignments)
            if (insertErr) throw insertErr
          }

          // D. Delete assignments that are still 'pending' but no longer match targeted criteria
          const targetStudentIds = new Set(targetStudents.map(s => s.id))
          const assignmentsToDelete = (currentAssignments || [])
            .filter(a => a.status === 'pending' && !targetStudentIds.has(a.student_id))
            .map(a => a.id)

          if (assignmentsToDelete.length > 0) {
            const { error: deleteErr } = await supabase
              .from('experiment_assignments')
              .delete()
              .in('id', assignmentsToDelete)
            if (deleteErr) throw deleteErr
          }
        }

        toast.success('Experiment updated successfully')
      }

      setModalOpen(false)
      fetchExperiments()
    } catch (err: any) {
      console.error('Error saving experiment:', err)
      toast.error(err.message || 'Failed to save experiment')
    } finally {
      setSubmitting(false)
    }
  }

  // Filter and Search experiments logic
  const filteredExperiments = experiments.filter(exp => {
    const matchesSearch = 
      exp.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
      exp.subject.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesArchive = showArchived ? exp.is_archived : !exp.is_archived

    return matchesSearch && matchesArchive
  })

  if (loading) {
    return <LoadingSpinner className="min-h-[400px]" size={40} />
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header and Controls */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white mb-1">Experiments Directory</h2>
          <p className="text-slate-400 text-sm">Create, update, and manage student lab experiments and deadlines.</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchExperiments(true)}
            disabled={refreshing}
            className="flex items-center justify-center p-2.5 bg-[#1E293B] border border-slate-800 rounded-lg hover:border-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
            title="Refresh Experiments"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
          
          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 px-4 py-2 bg-[#6366F1] hover:bg-[#5053db] rounded-lg text-xs font-bold text-white shadow-lg hover:shadow-xl hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create Experiment</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-4 bg-[#1E293B] border border-slate-800 p-4 rounded-xl">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search experiments by title or subject..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-[#0F172A] border border-slate-800 rounded-lg text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#6366F1] focus:border-transparent transition"
          />
        </div>
        
        <div className="flex items-center shrink-0 gap-2 w-full sm:w-auto">
          <label className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Show:</label>
          <div className="flex bg-[#0F172A] border border-slate-800 rounded-lg p-0.5 w-full sm:w-auto">
            <button
              onClick={() => setShowArchived(false)}
              className={`flex-1 sm:flex-none px-4 py-1.5 text-xs font-semibold rounded-md transition-all uppercase tracking-wider cursor-pointer whitespace-nowrap ${
                !showArchived
                  ? 'bg-[#6366F1] text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Active
            </button>
            <button
              onClick={() => setShowArchived(true)}
              className={`flex-1 sm:flex-none px-4 py-1.5 text-xs font-semibold rounded-md transition-all uppercase tracking-wider cursor-pointer whitespace-nowrap ${
                showArchived
                  ? 'bg-[#6366F1] text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Archived
            </button>
          </div>
        </div>
      </div>

      {/* Experiments Grid */}
      {filteredExperiments.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredExperiments.map((exp) => {
            const isDeadlinePassed = new Date(exp.deadline) < new Date()
            const deadlineFormatted = new Date(exp.deadline).toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })

            return (
              <div
                key={exp.id}
                className={`bg-[#1E293B] border border-slate-800/80 rounded-xl p-5 hover:border-slate-700/80 hover:shadow-xl transition-all duration-300 flex flex-col justify-between group relative ${
                  exp.is_archived ? 'opacity-75' : ''
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex flex-col gap-1.5 items-start">
                      <span className="text-xs font-semibold text-slate-400 bg-slate-800 px-2.5 py-1 rounded">
                        {exp.subject}
                      </span>
                      
                      <div className="text-[10px] text-slate-400 font-semibold bg-slate-900/40 px-2 py-0.5 rounded-md border border-slate-800 flex flex-wrap gap-x-1.5 gap-y-0.5">
                        <span>Sem: {exp.target_semester || 'All'}</span>
                        <span className="text-slate-700">•</span>
                        <span>Sess: {exp.target_session || 'All'}</span>
                        <span className="text-slate-700">•</span>
                        <span>Sect: {exp.target_section || 'All'}</span>
                      </div>
                    </div>
                    
                    <span className={`px-2 py-0.5 text-[10px] font-bold rounded border uppercase ${
                      exp.is_archived 
                        ? 'bg-slate-700/30 text-slate-400 border-slate-600/30'
                        : isDeadlinePassed
                          ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                          : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                    }`}>
                      {exp.is_archived 
                        ? 'Archived' 
                        : isDeadlinePassed 
                          ? 'Deadline Overdue' 
                          : 'Active'
                      }
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-white group-hover:text-[#6366F1] transition-colors mb-2 line-clamp-1">
                    {exp.title}
                  </h3>
                  
                  <p className="text-xs text-slate-400 line-clamp-3 mb-5 leading-relaxed">
                    {exp.description}
                  </p>
                </div>

                <div className="space-y-4">
                  {/* Deadline Info */}
                  <div className="pt-4 border-t border-slate-800/60 flex items-center gap-2 text-xs text-slate-400">
                    <Calendar className="w-4 h-4 shrink-0 text-slate-500" />
                    <span>Deadline: <strong className={isDeadlinePassed && !exp.is_archived ? 'text-rose-400' : 'text-slate-300'}>{deadlineFormatted}</strong></span>
                  </div>

                  {/* Actions Bar */}
                  <div className="flex items-center gap-2 pt-2">
                    <button
                      onClick={() => navigate(`/teacher/submissions?experimentId=${exp.id}`)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-slate-800 hover:bg-slate-750 text-slate-200 hover:text-white border border-slate-700 hover:border-slate-600 rounded-lg text-xs font-bold transition cursor-pointer"
                      title="View student submissions"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Submissions</span>
                    </button>
                    
                    <button
                      onClick={() => openEditModal(exp)}
                      className="p-2 bg-slate-800 hover:bg-[#6366F1]/10 text-slate-400 hover:text-[#6366F1] border border-slate-700 hover:border-[#6366F1]/20 rounded-lg transition cursor-pointer"
                      title="Edit experiment details"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => handleArchiveToggle(exp)}
                      className={`p-2 border rounded-lg transition cursor-pointer ${
                        exp.is_archived
                          ? 'bg-emerald-500/10 hover:bg-emerald-500/25 border-emerald-500/20 text-emerald-400'
                          : 'bg-slate-800 hover:bg-rose-500/10 border-slate-700 hover:border-rose-500/20 text-slate-400 hover:text-rose-400'
                      }`}
                      title={exp.is_archived ? 'Restore experiment' : 'Archive experiment'}
                    >
                      <Archive className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => handleDelete(exp)}
                      className="p-2 bg-slate-800 hover:bg-rose-600/10 text-slate-400 hover:text-rose-500 border border-slate-700 hover:border-rose-600/20 rounded-lg transition cursor-pointer"
                      title="Delete experiment permanently"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="bg-[#1E293B] border border-slate-800 rounded-xl p-12 text-center text-slate-400 text-sm max-w-xl mx-auto shadow-md">
          <HelpCircle className="w-12 h-12 text-slate-600 mx-auto mb-4" />
          No experiments found matching your selection.
        </div>
      )}

      {/* Modal - Create/Edit Form */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => !submitting && setModalOpen(false)}></div>

          <div className="relative w-full max-w-lg bg-[#1E293B] border border-slate-800 rounded-2xl shadow-2xl p-6 md:p-8 text-slate-100 z-10 animate-scaleUp">
            <button
              onClick={() => !submitting && setModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white disabled:opacity-50"
              disabled={submitting}
            >
              <X className="w-6 h-6" />
            </button>

            <h3 className="text-xl font-bold text-white mb-6">
              {modalMode === 'create' ? 'Create New Experiment' : 'Edit Experiment'}
            </h3>

            <form onSubmit={handleFormSubmit} className="space-y-5">
              {/* Title Input */}
              <div>
                <label className="block text-slate-300 text-xs font-semibold uppercase tracking-wider mb-2" htmlFor="title">
                  Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  id="title"
                  required
                  placeholder="e.g. Implement DFS and BFS"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-4 py-2.5 bg-[#0F172A] border border-slate-800 rounded-lg text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-[#6366F1] focus:border-transparent transition"
                  disabled={submitting}
                />
              </div>

              {/* Subject Input */}
              <div>
                <label className="block text-slate-300 text-xs font-semibold uppercase tracking-wider mb-2" htmlFor="subject">
                  Subject <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  id="subject"
                  required
                  placeholder="e.g. Data Structures & Algorithms"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full px-4 py-2.5 bg-[#0F172A] border border-slate-800 rounded-lg text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-[#6366F1] focus:border-transparent transition"
                  disabled={submitting}
                />
              </div>

              {/* Description Input */}
              <div>
                <label className="block text-slate-300 text-xs font-semibold uppercase tracking-wider mb-2" htmlFor="description">
                  Description / Guidelines <span className="text-rose-500">*</span>
                </label>
                <textarea
                  id="description"
                  required
                  rows={4}
                  placeholder="Write instructions, objectives, input-output constraints..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-4 py-2.5 bg-[#0F172A] border border-slate-800 rounded-lg text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-[#6366F1] focus:border-transparent transition resize-none"
                  disabled={submitting}
                />
              </div>

              {/* Upload PDF/DOCX instructions */}
              <div>
                <label className="block text-slate-300 text-xs font-semibold uppercase tracking-wider mb-2">
                  Instructions Document (PDF / DOCX)
                </label>
                
                {existingInstructionsUrl && !file && (
                  <div className="bg-[#6366F1]/5 border border-[#6366F1]/20 rounded-lg px-4 py-3 flex items-center justify-between gap-3 text-xs mb-2.5">
                    <div className="flex items-center gap-2 text-slate-300">
                      <FileText className="w-4 h-4 text-[#6366F1]" />
                      <a href={existingInstructionsUrl} target="_blank" rel="noreferrer" className="hover:underline font-medium truncate max-w-[200px]">
                        View current instructions
                      </a>
                    </div>
                    <button
                      type="button"
                      onClick={() => setExistingInstructionsUrl('')}
                      className="text-[10px] text-rose-400 hover:underline font-bold"
                      disabled={submitting}
                    >
                      Delete
                    </button>
                  </div>
                )}

                <div className="relative border-2 border-dashed border-slate-800 hover:border-slate-700 bg-[#0F172A] rounded-xl px-4 py-5 flex flex-col items-center justify-center transition-colors min-h-[90px] cursor-pointer">
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx"
                    onChange={(e) => {
                      const selectedFile = e.target.files?.[0]
                      if (selectedFile) setFile(selectedFile)
                    }}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    disabled={submitting}
                  />

                  {file ? (
                    <div className="text-center space-y-1.5 w-full px-2">
                      <CheckCircle className="w-5 h-5 text-emerald-400 mx-auto" />
                      <p className="text-xs font-semibold text-white truncate">{file.name}</p>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          setFile(null)
                        }}
                        className="text-[10px] text-rose-400 hover:underline font-semibold"
                        disabled={submitting}
                      >
                        Remove file
                      </button>
                    </div>
                  ) : (
                    <div className="text-center space-y-1 text-slate-500 pointer-events-none">
                      <Upload className="w-5 h-5 text-slate-500 mx-auto mb-0.5" />
                      <p className="text-xs text-slate-400 font-semibold">
                        Drag and drop file, or click to upload
                      </p>
                      <p className="text-[10px] text-slate-600">
                        Only PDF, DOCX allowed (Max 50MB)
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Targeted Assignment Fields */}
              <div className="border-t border-slate-800/80 pt-4 mt-2">
                <h4 className="text-xs font-bold text-[#6366F1] uppercase tracking-wider mb-3">Target Students</h4>
                
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-slate-400 text-[10px] font-semibold uppercase tracking-wider mb-1.5" htmlFor="targetSemester">
                      Semester
                    </label>
                    <select
                      id="targetSemester"
                      value={targetSemester}
                      onChange={(e) => setTargetSemester(e.target.value)}
                      className="w-full px-2.5 py-2 bg-[#0F172A] border border-slate-800 rounded-lg text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#6366F1] focus:border-transparent transition cursor-pointer"
                      disabled={submitting}
                    >
                      <option value="all">All Semesters</option>
                      <option value="1st">1st</option>
                      <option value="2nd">2nd</option>
                      <option value="3rd">3rd</option>
                      <option value="4th">4th</option>
                      <option value="5th">5th</option>
                      <option value="6th">6th</option>
                      <option value="7th">7th</option>
                      <option value="8th">8th</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-400 text-[10px] font-semibold uppercase tracking-wider mb-1.5" htmlFor="targetSession">
                      Session
                    </label>
                    <input
                      type="text"
                      id="targetSession"
                      placeholder="e.g. 2023-27 (or all)"
                      value={targetSession}
                      onChange={(e) => setTargetSession(e.target.value)}
                      className="w-full px-2.5 py-2 bg-[#0F172A] border border-slate-800 rounded-lg text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-[#6366F1] focus:border-transparent transition"
                      disabled={submitting}
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 text-[10px] font-semibold uppercase tracking-wider mb-1.5" htmlFor="targetSection">
                      Section
                    </label>
                    <input
                      type="text"
                      id="targetSection"
                      placeholder="e.g. CS J (or all)"
                      value={targetSection}
                      onChange={(e) => setTargetSection(e.target.value)}
                      className="w-full px-2.5 py-2 bg-[#0F172A] border border-slate-800 rounded-lg text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-[#6366F1] focus:border-transparent transition"
                      disabled={submitting}
                    />
                  </div>
                </div>
              </div>

              {/* Deadline Picker */}
              <div>
                <label className="block text-slate-300 text-xs font-semibold uppercase tracking-wider mb-2" htmlFor="deadline">
                  Submission Deadline <span className="text-rose-500">*</span>
                </label>
                <input
                  type="datetime-local"
                  id="deadline"
                  required
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  className="w-full px-4 py-2.5 bg-[#0F172A] border border-slate-800 rounded-lg text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#6366F1] focus:border-transparent transition"
                  disabled={submitting}
                />
              </div>

              {/* Actions Footer */}
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800 mt-6">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 border border-slate-800 hover:border-slate-700 rounded-lg text-xs font-semibold text-slate-400 hover:text-white transition cursor-pointer"
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#6366F1] hover:bg-[#5053db] disabled:bg-slate-850 disabled:text-slate-500 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-lg"
                  disabled={submitting}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>Save Experiment</span>
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

export default Experiments
