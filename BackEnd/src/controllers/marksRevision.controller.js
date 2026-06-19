import { supabaseAdmin } from '../config/supabase.js'
import { logAudit } from '../services/audit.js'
import { createNotification } from '../services/notification.js'

/**
 * createRevisionRequest(req, res, next)
 * - Teacher only
 * - Fetch evaluation, store original_marks
 * - Insert into marks_revision_requests with status='pending'
 * - Notify admin: 'Teacher {name} has requested marks revision for student {student_name}'
 * - Log audit
 * - Return { request }
 */
export const createRevisionRequest = async (req, res, next) => {
  try {
    const teacherId = req.user.id
    const { evaluation_id, requested_marks, justification } = req.body

    // 1. Fetch evaluation
    const { data: evaluation, error: evalError } = await supabaseAdmin
      .from('evaluations')
      .select('*, submission:code_submissions(student_id, student:profiles!code_submissions_student_id_fkey(full_name), experiments(title))')
      .eq('id', evaluation_id)
      .single()

    if (evalError || !evaluation) {
      return res.status(404).json({ error: 'Evaluation not found' })
    }

    // 2. Verify teacher is the evaluator
    if (evaluation.teacher_id !== teacherId) {
      return res.status(403).json({
        error: 'Forbidden: You are not the evaluator of this submission'
      })
    }

    // 3. Insert marks revision request
    const { data: request, error: insertError } = await supabaseAdmin
      .from('marks_revision_requests')
      .insert({
        evaluation_id,
        teacher_id: teacherId,
        original_marks: evaluation.marks,
        requested_marks,
        justification,
        status: 'pending'
      })
      .select()
      .single()

    if (insertError) {
      return next(insertError)
    }

    // 4. Notify admin(s)
    const teacherName = req.user.full_name || 'Teacher'
    const studentName = evaluation.submission?.student?.full_name || 'Student'

    const { data: admins, error: adminError } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('role', 'admin')

    if (!adminError && admins && admins.length > 0) {
      await Promise.all(admins.map(admin =>
        createNotification(
          admin.id,
          `Teacher ${teacherName} has requested marks revision for student ${studentName}`
        ).catch(err => console.error('Failed to notify admin:', err))
      ))
    }

    // 5. Log audit
    await logAudit(
      teacherId,
      'marks_revision_requested',
      'marks_revision_requests',
      request.id,
      { evaluation_id, requested_marks }
    ).catch(err => console.error('Failed to log audit:', err))

    return res.status(201).json({ request })
  } catch (error) {
    next(error)
  }
}

/**
 * getRevisionRequests(req, res, next)
 * - Teacher: own requests
 * - Admin: all requests with full joins
 * - Return { requests: [...] }
 */
export const getRevisionRequests = async (req, res, next) => {
  try {
    const userId = req.user.id
    const userRole = req.user.role
    const { status } = req.query

    let query = supabaseAdmin.from('marks_revision_requests')

    if (userRole === 'teacher') {
      query = query
        .select('*, evaluation:evaluations(*, submission:code_submissions(student:profiles!code_submissions_student_id_fkey(full_name, enrollment_no), experiments(title)))')
        .eq('teacher_id', userId)
    } else if (userRole === 'admin') {
      query = query
        .select('*, teacher:profiles(full_name), evaluation:evaluations(*, submission:code_submissions(student:profiles!code_submissions_student_id_fkey(full_name, enrollment_no), experiments(title)))')
    } else {
      return res.status(403).json({ error: 'Forbidden: Invalid role' })
    }

    if (status) {
      query = query.eq('status', status)
    }

    query = query.order('created_at', { ascending: false })

    const { data: requests, error: fetchError } = await query

    if (fetchError) {
      return next(fetchError)
    }

    return res.status(200).json({ requests: requests || [] })
  } catch (error) {
    next(error)
  }
}

/**
 * reviewRevisionRequest(req, res, next)
 * - Admin only
 * - Params: requestId / id
 * - Body: { status: 'approved'|'rejected', admin_note }
 * - If approved: UPDATE evaluations SET marks = requested_marks WHERE id = evaluation_id
 * - Update marks_revision_requests
 * - Notify teacher + student of outcome
 * - Log audit: action='marks_revision_approved/rejected'
 * - Return updated request
 */
export const reviewRevisionRequest = async (req, res, next) => {
  try {
    const adminId = req.user.id
    const requestId = req.params.id || req.params.requestId
    const { status, admin_note } = req.body

    // 1. Fetch request with evaluation and linked student/experiment data
    const { data: request, error: fetchError } = await supabaseAdmin
      .from('marks_revision_requests')
      .select('*, evaluation:evaluations(marks, teacher_id, submission:code_submissions(student_id, student:profiles!code_submissions_student_id_fkey(full_name), experiments(title)))')
      .eq('id', requestId)
      .single()

    if (fetchError || !request) {
      return res.status(404).json({ error: 'Marks revision request not found' })
    }

    // 2. Update status and admin note
    const { data: updatedRequest, error: updateError } = await supabaseAdmin
      .from('marks_revision_requests')
      .update({
        status,
        admin_note
      })
      .eq('id', requestId)
      .select()
      .single()

    if (updateError) {
      return next(updateError)
    }

    // 3. If approved, update marks in evaluations table
    if (status === 'approved') {
      const { error: evalUpdateError } = await supabaseAdmin
        .from('evaluations')
        .update({ marks: request.requested_marks })
        .eq('id', request.evaluation_id)

      if (evalUpdateError) {
        return next(evalUpdateError)
      }
    }

    // 4. Notify teacher + student
    const studentName = request.evaluation?.submission?.student?.full_name || 'Student'
    const experimentTitle = request.evaluation?.submission?.experiments?.title || 'Experiment'
    const noteStr = admin_note ? `. Note: ${admin_note}` : ''

    // Notify teacher
    if (request.teacher_id) {
      await createNotification(
        request.teacher_id,
        `Your marks revision request for student ${studentName} was ${status}${noteStr}`
      ).catch(err => console.error('Failed to notify teacher:', err))
    }

    // Notify student
    const studentId = request.evaluation?.submission?.student_id
    if (studentId) {
      const msg = status === 'approved'
        ? `Your marks for ${experimentTitle} have been revised from ${request.original_marks} to ${request.requested_marks}${noteStr}`
        : `The marks revision request for ${experimentTitle} was rejected${noteStr}`
      await createNotification(studentId, msg)
        .catch(err => console.error('Failed to notify student:', err))
    }

    // 5. Log audit
    await logAudit(
      adminId,
      `marks_revision_${status}`,
      'marks_revision_requests',
      requestId,
      { status, admin_note, evaluation_id: request.evaluation_id }
    ).catch(err => console.error('Failed to log audit:', err))

    return res.status(200).json(updatedRequest)
  } catch (error) {
    next(error)
  }
}

// Compatibility aliases
export const getMarksRevisions = getRevisionRequests
export const requestMarksRevision = createRevisionRequest
