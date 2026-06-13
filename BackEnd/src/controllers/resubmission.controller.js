import { supabaseAdmin } from '../config/supabase.js'
import { logAudit } from '../services/audit.js'
import { createNotification } from '../services/notification.js'

/**
 * createResubmissionRequest(req, res, next)
 * - Student only
 * - Check no pending request already exists for this experiment+student combo
 * - Insert into resubmission_requests with status='pending'
 * - Notify teacher of the experiment: 'Student {full_name} has requested resubmission for {experiment.title}'
 * - Log audit
 * - Return { request }
 */
export const createResubmissionRequest = async (req, res, next) => {
  try {
    const studentId = req.user.id
    const { experiment_id, justification } = req.body

    // 1. Check if experiment exists
    const { data: experiment, error: expError } = await supabaseAdmin
      .from('experiments')
      .select('title, created_by')
      .eq('id', experiment_id)
      .single()

    if (expError || !experiment) {
      return res.status(404).json({ error: 'Experiment not found' })
    }

    // 2. Check no pending request already exists for this combo
    const { data: existing, error: existError } = await supabaseAdmin
      .from('resubmission_requests')
      .select('id')
      .eq('experiment_id', experiment_id)
      .eq('student_id', studentId)
      .eq('status', 'pending')
      .maybeSingle()

    if (existError) {
      return next(existError)
    }

    if (existing) {
      return res.status(400).json({ error: 'A pending resubmission request already exists for this experiment' })
    }

    // 3. Insert resubmission request
    const { data: request, error: insertError } = await supabaseAdmin
      .from('resubmission_requests')
      .insert({
        student_id: studentId,
        experiment_id,
        justification,
        status: 'pending'
      })
      .select()
      .single()

    if (insertError) {
      return next(insertError)
    }

    // 4. Notify teacher
    if (experiment.created_by) {
      await createNotification(
        experiment.created_by,
        `Student ${req.user.full_name} has requested resubmission for ${experiment.title}`
      ).catch(err => console.error('Failed to notify teacher:', err))
    }

    // 5. Log audit
    await logAudit(
      studentId,
      'resubmission_requested',
      'resubmission_requests',
      request.id,
      { experiment_id }
    ).catch(err => console.error('Failed to log audit:', err))

    return res.status(201).json({ request })
  } catch (error) {
    next(error)
  }
}

/**
 * getResubmissionRequests(req, res, next)
 * - Student: own requests
 * - Teacher: requests for their experiments, join student profile
 * - Admin: all requests
 * - Filter by status if provided
 * - Return { requests: [...] }
 */
export const getResubmissionRequests = async (req, res, next) => {
  try {
    const userId = req.user.id
    const userRole = req.user.role
    const { status } = req.query

    let query = supabaseAdmin.from('resubmission_requests')

    if (userRole === 'student') {
      query = query
        .select('*, experiment:experiments(title)')
        .eq('student_id', userId)
    } else if (userRole === 'teacher') {
      query = query
        .select('*, student:profiles(full_name, enrollment_no), experiment:experiments!inner(title, created_by)')
        .eq('experiment.created_by', userId)
    } else if (userRole === 'admin') {
      query = query
        .select('*, student:profiles(full_name, enrollment_no), experiment:experiments(title, created_by)')
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
 * reviewResubmissionRequest(req, res, next)
 * - Teacher only
 * - Params: requestId / id
 * - Body: { status: 'approved'|'rejected', teacher_note }
 * - Verify experiment belongs to teacher
 * - Update resubmission_requests
 * - If approved: update experiment_assignments.status back to 'pending' (allows new submission)
 * - Notify student: 'Your resubmission request for {title} was {status}. Note: {teacher_note}'
 * - Log audit
 * - Return updated request
 */
export const reviewResubmissionRequest = async (req, res, next) => {
  try {
    const teacherId = req.user.id
    const requestId = req.params.id || req.params.requestId
    const { status, teacher_note } = req.body

    // 1. Fetch request with linked experiment to verify teacher ownership
    const { data: request, error: fetchError } = await supabaseAdmin
      .from('resubmission_requests')
      .select('*, experiment:experiments(title, created_by)')
      .eq('id', requestId)
      .single()

    if (fetchError || !request) {
      return res.status(404).json({ error: 'Resubmission request not found' })
    }

    if (!request.experiment || request.experiment.created_by !== teacherId) {
      return res.status(403).json({
        error: 'Forbidden: You do not own the experiment linked to this request'
      })
    }

    // 2. Update resubmission request
    const { data: updatedRequest, error: updateError } = await supabaseAdmin
      .from('resubmission_requests')
      .update({
        status,
        teacher_note
      })
      .eq('id', requestId)
      .select()
      .single()

    if (updateError) {
      return next(updateError)
    }

    // 3. If approved, update experiment_assignment status back to pending
    if (status === 'approved') {
      const { error: assignError } = await supabaseAdmin
        .from('experiment_assignments')
        .update({ status: 'pending' })
        .eq('experiment_id', request.experiment_id)
        .eq('student_id', request.student_id)

      if (assignError) {
        return next(assignError)
      }
    }

    // 4. Notify student
    const experimentTitle = request.experiment.title || 'Experiment'
    const noteStr = teacher_note ? `. Note: ${teacher_note}` : ''
    await createNotification(
      request.student_id,
      `Your resubmission request for ${experimentTitle} was ${status}${noteStr}`
    ).catch(err => console.error('Failed to notify student:', err))

    // 5. Log audit
    await logAudit(
      teacherId,
      `resubmission_${status}`,
      'resubmission_requests',
      requestId,
      { status, teacher_note }
    ).catch(err => console.error('Failed to log audit:', err))

    return res.status(200).json(updatedRequest)
  } catch (error) {
    next(error)
  }
}

// Compatibility aliases
export const getResubmissions = getResubmissionRequests
export const requestResubmission = createResubmissionRequest

