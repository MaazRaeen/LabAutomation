import { supabaseAdmin } from '../config/supabase.js'

/**
 * getStudentProgress(req, res, next)
 * - Params: optional studentId
 * - Access control: student can only view own progress
 * - Fetch and return summary, evaluations, and assignments
 */
export const getStudentProgress = async (req, res, next) => {
  try {
    const studentId = req.params.studentId || req.user.id

    // Access control: student can only view own progress
    if (req.user.role === 'student' && studentId !== req.user.id) {
      return res.status(403).json({ error: 'Forbidden: Students can only view their own progress' })
    }

    // 1. Fetch assignments counts
    const { data: assignments, error: assignError } = await supabaseAdmin
      .from('experiment_assignments')
      .select('status')
      .eq('student_id', studentId)

    if (assignError) return next(assignError)

    const total = assignments.length
    const submitted = assignments.filter(a => a.status === 'submitted').length
    const late = assignments.filter(a => a.status === 'late').length
    const pending = assignments.filter(a => a.status === 'pending').length
    const verified = assignments.filter(a => a.status === 'verified').length

    // 2. Fetch evaluations
    const { data: evaluations, error: evalError } = await supabaseAdmin
      .from('evaluations')
      .select('marks, max_marks, evaluated_at, submission:code_submissions!inner(student_id, experiment:experiments(title))')
      .eq('code_submissions.student_id', studentId)

    if (evalError) return next(evalError)

    const formattedEvaluations = (evaluations || []).map(ev => ({
      marks: ev.marks,
      max_marks: ev.max_marks,
      evaluated_at: ev.evaluated_at,
      experiment_title: ev.submission?.experiment?.title || 'Unknown'
    }))

    // 3. Compute stats
    let average_marks = 0
    let highest_marks = 0
    let lowest_marks = 0

    if (evaluations && evaluations.length > 0) {
      const marksList = evaluations.map(ev => ev.marks)
      const sum = marksList.reduce((acc, m) => acc + m, 0)
      average_marks = Number((sum / evaluations.length).toFixed(2))
      highest_marks = Math.max(...marksList)
      lowest_marks = Math.min(...marksList)
    }

    // Completion rate (submitted + late + verified counts as completed)
    const completedCount = assignments.filter(a => ['submitted', 'late', 'verified'].includes(a.status)).length
    const completion_rate = total > 0 ? Math.round((completedCount / total) * 100) : 0

    // 4. Fetch resubmission requests
    const { data: resubmissions, error: resubError } = await supabaseAdmin
      .from('resubmission_requests')
      .select('status')
      .eq('student_id', studentId)

    if (resubError) return next(resubError)

    const resubSummary = {
      pending: resubmissions.filter(r => r.status === 'pending').length,
      approved: resubmissions.filter(r => r.status === 'approved').length,
      rejected: resubmissions.filter(r => r.status === 'rejected').length
    }

    const summary = {
      assignments: {
        total,
        submitted,
        late,
        pending,
        verified
      },
      computed: {
        average_marks,
        highest_marks,
        lowest_marks,
        completion_rate
      },
      resubmission_requests: resubSummary
    }

    return res.status(200).json({
      summary,
      evaluations: formattedEvaluations,
      assignments
    })
  } catch (error) {
    next(error)
  }
}

/**
 * getBatchProgress(req, res, next)
 * - Teacher or Admin only
 * - Optional filters: experiment_id
 * - Returns one row per student with stats
 */
export const getBatchProgress = async (req, res, next) => {
  try {
    const { experiment_id } = req.query

    // 1. Fetch all students
    const { data: students, error: studentError } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, enrollment_no')
      .eq('role', 'student')

    if (studentError) return next(studentError)

    // 2. Fetch assignments
    let assignQuery = supabaseAdmin.from('experiment_assignments').select('student_id, status')
    if (experiment_id) {
      assignQuery = assignQuery.eq('experiment_id', experiment_id)
    }
    const { data: assignments, error: assignError } = await assignQuery

    if (assignError) return next(assignError)

    // 3. Fetch evaluations
    let evalQuery = supabaseAdmin
      .from('evaluations')
      .select('marks, submission:code_submissions!inner(student_id, experiment_id)')
    if (experiment_id) {
      evalQuery = evalQuery.eq('code_submissions.experiment_id', experiment_id)
    }
    const { data: evaluations, error: evalError } = await evalQuery

    if (evalError) return next(evalError)

    // 4. Aggregate stats per student
    const batchList = students.map(student => {
      const studentAssignments = (assignments || []).filter(a => a.student_id === student.id)
      const studentEvaluations = (evaluations || []).filter(e => e.submission?.student_id === student.id)

      if (experiment_id && studentAssignments.length === 0) {
        return null
      }

      const total_assigned = studentAssignments.length
      const submitted = studentAssignments.filter(a => ['submitted', 'verified'].includes(a.status)).length
      const late = studentAssignments.filter(a => a.status === 'late').length
      const avg_marks = studentEvaluations.length > 0
        ? Number((studentEvaluations.reduce((sum, e) => sum + e.marks, 0) / studentEvaluations.length).toFixed(2))
        : 0

      return {
        full_name: student.full_name,
        enrollment_no: student.enrollment_no,
        total_assigned,
        submitted,
        late,
        avg_marks
      }
    }).filter(Boolean)

    return res.status(200).json({ students: batchList })
  } catch (error) {
    next(error)
  }
}

// Compatibility alias
export const getProgress = getStudentProgress
