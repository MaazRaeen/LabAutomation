import { supabaseAdmin } from '../config/supabase.js'
import { logAudit } from '../services/audit.js'
import { createNotification } from '../services/notification.js'

/**
 * createEvaluation(req, res, next)
 * - Teacher only
 * - Verify the submission belongs to an experiment created by req.user
 * - Check no evaluation exists yet for this submission (prevent duplicate)
 * - Insert into evaluations: { submission_id, teacher_id: req.user.id, marks, max_marks, remarks }
 * - Create notification for student:
 *   'Your submission for {experiment.title} has been evaluated. Marks: {marks}/{max_marks}'
 * - Log audit: action='evaluation_created', metadata: { marks, submission_id }
 * - Return { evaluation }
 */
export const createEvaluation = async (req, res, next) => {
  try {
    const teacherId = req.user.id
    const { submission_id, marks, max_marks, remarks, is_draft } = req.body

    // 1. Fetch submission and linked experiment to verify teacher owns it
    const { data: submission, error: subError } = await supabaseAdmin
      .from('code_submissions')
      .select('*, experiments(title, created_by)')
      .eq('id', submission_id)
      .single()

    if (subError || !submission) {
      return res.status(404).json({ error: 'Code submission not found' })
    }

    if (!submission.experiments || submission.experiments.created_by !== teacherId) {
      return res.status(403).json({
        error: 'Forbidden: You do not own the experiment linked to this submission'
      })
    }

    // Verify late submission status
    if (submission.is_late && submission.late_status !== 'approved') {
      return res.status(400).json({
        error: 'Cannot grade a late submission that has not been approved.'
      })
    }

    // 2. Prevent duplicate evaluations
    const { data: existingEvaluation, error: evalError } = await supabaseAdmin
      .from('evaluations')
      .select('id')
      .eq('submission_id', submission_id)
      .maybeSingle()

    if (evalError) {
      return next(evalError)
    }

    if (existingEvaluation) {
      return res.status(400).json({ error: 'This submission has already been evaluated' })
    }

    const maxMarksVal = max_marks !== undefined ? max_marks : 10
    const isDraftVal = is_draft === true

    // 3. Insert new evaluation
    const { data: evaluation, error: insertError } = await supabaseAdmin
      .from('evaluations')
      .insert({
        submission_id,
        teacher_id: teacherId,
        marks,
        max_marks: maxMarksVal,
        remarks,
        is_draft: isDraftVal
      })
      .select()
      .single()

    if (insertError) {
      return next(insertError)
    }

    // 4. Notify student and update student record if it's finalized (not draft)
    if (!isDraftVal) {
      const experimentTitle = submission.experiments.title || 'Experiment'
      await createNotification(
        submission.student_id,
        `Your submission for ${experimentTitle} has been evaluated. Marks: ${marks}/${maxMarksVal}`
      ).catch(err => console.error('Failed to create notification:', err))

      // Update experiment_assignments.status to 'verified'
      const { error: assignmentUpdateError } = await supabaseAdmin
        .from('experiment_assignments')
        .update({ status: 'verified' })
        .eq('student_id', submission.student_id)
        .eq('experiment_id', submission.experiment_id)

      if (assignmentUpdateError) {
        console.error('Failed to update assignment status to verified:', assignmentUpdateError)
      }
    }

    // 5. Log audit
    const auditAction = isDraftVal ? 'evaluation_draft_created' : 'evaluation_created'
    await logAudit(
      teacherId,
      auditAction,
      'evaluations',
      evaluation.id,
      { marks, submission_id }
    ).catch(err => console.error('Failed to log audit:', err))

    return res.status(201).json({ evaluation })
  } catch (error) {
    next(error)
  }
}

/**
 * updateEvaluation(req, res, next)
 * - Teacher only, must be the evaluator
 * - Params: id
 * - Update marks/remarks
 * - If marks changed: require a marks_revision_request to go through admin (block direct update if marks differ)
 * - If only remarks changed: allow direct update
 * - Log audit
 * - Return updated evaluation
 */
export const updateEvaluation = async (req, res, next) => {
  try {
    const { id } = req.params
    const { marks, remarks, is_draft } = req.body
    const teacherId = req.user.id

    // 1. Fetch existing evaluation
    const { data: evaluation, error: fetchError } = await supabaseAdmin
      .from('evaluations')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !evaluation) {
      return res.status(404).json({ error: 'Evaluation not found' })
    }

    // 2. Ensure current teacher is the original evaluator
    if (evaluation.teacher_id !== teacherId) {
      return res.status(403).json({
        error: 'Forbidden: You are not the evaluator of this submission'
      })
    }

    const wasDraft = evaluation.is_draft
    const requestIsDraft = is_draft !== undefined ? is_draft : wasDraft

    // 3. Block direct update if marks differ AND the evaluation is NOT a draft
    if (!wasDraft && marks !== undefined && marks !== evaluation.marks) {
      return res.status(400).json({
        error: 'Direct marks update is not allowed. Please submit a marks revision request to the administrator.'
      })
    }

    const updateData = {}
    if (remarks !== undefined) updateData.remarks = remarks
    if (marks !== undefined) updateData.marks = marks
    if (is_draft !== undefined) updateData.is_draft = is_draft

    let updatedEvaluation = evaluation

    // 4. Allow updating fields if present
    if (Object.keys(updateData).length > 0) {
      const { data, error: updateError } = await supabaseAdmin
        .from('evaluations')
        .update(updateData)
        .eq('id', id)
        .select()
        .single()

      if (updateError) {
        return next(updateError)
      }
      updatedEvaluation = data
    }

    // 5. If transitioning from draft to finalized (not draft), notify student and update assignment status
    if (wasDraft && !requestIsDraft) {
      // Fetch submission details to get student_id & experiment_id
      const { data: submission, error: subError } = await supabaseAdmin
        .from('code_submissions')
        .select('*, experiments(title)')
        .eq('id', evaluation.submission_id)
        .single()

      if (!subError && submission) {
        const experimentTitle = submission.experiments?.title || 'Experiment'
        const marksVal = marks !== undefined ? marks : evaluation.marks
        const maxMarksVal = evaluation.max_marks

        await createNotification(
          submission.student_id,
          `Your submission for ${experimentTitle} has been evaluated. Marks: ${marksVal}/${maxMarksVal}`
        ).catch(err => console.error('Failed to create notification:', err))

        // Update assignment status to verified
        const { error: assignmentUpdateError } = await supabaseAdmin
          .from('experiment_assignments')
          .update({ status: 'verified' })
          .eq('student_id', submission.student_id)
          .eq('experiment_id', submission.experiment_id)

        if (assignmentUpdateError) {
          console.error('Failed to update assignment status to verified:', assignmentUpdateError)
        }
      }
    }

    // 6. Log audit
    const auditAction = (wasDraft && !requestIsDraft) ? 'evaluation_finalized' : 'evaluation_updated'
    await logAudit(
      teacherId,
      auditAction,
      'evaluations',
      id,
      { 
        remarks_updated: remarks !== undefined, 
        marks_updated: marks !== undefined,
        finalized: (wasDraft && !requestIsDraft)
      }
    ).catch(err => console.error('Failed to log audit:', err))

    return res.status(200).json({ evaluation: updatedEvaluation })
  } catch (error) {
    next(error)
  }
}

/**
 * getEvaluations(req, res, next)
 * - Teacher: fetch evaluations where teacher_id = req.user.id, join submission + student profile + experiment
 * - Student: fetch evaluations for their submissions, join experiment
 * - Admin: fetch all with full joins
 * - Supports filters: experiment_id, student_id (admin/teacher only)
 * - Returns { evaluations: [...] }
 */
export const getEvaluations = async (req, res, next) => {
  try {
    const userId = req.user.id
    const userRole = req.user.role

    let query

    if (userRole === 'student') {
      query = supabaseAdmin
        .from('evaluations')
        .select('*, submission:code_submissions!inner(*, experiments(title, subject))')
        .eq('code_submissions.student_id', userId)
    } else if (userRole === 'teacher') {
      query = supabaseAdmin
        .from('evaluations')
        .select('*, submission:code_submissions!inner(*, student:profiles(full_name, enrollment_no), experiments(title, subject))')
        .eq('teacher_id', userId)
    } else if (userRole === 'admin') {
      query = supabaseAdmin
        .from('evaluations')
        .select('*, submission:code_submissions!inner(*, student:profiles(full_name, enrollment_no), experiments(title, subject)), teacher:profiles(full_name)')
    } else {
      return res.status(403).json({ error: 'Forbidden: Invalid role' })
    }

    // Filter by experiment_id
    if (req.query.experiment_id) {
      query = query.eq('code_submissions.experiment_id', req.query.experiment_id)
    }

    // Filter by student_id (for teachers and admins only)
    if (req.query.student_id && (userRole === 'teacher' || userRole === 'admin')) {
      query = query.eq('code_submissions.student_id', req.query.student_id)
    }

    // Sort by latest evaluation date
    query = query.order('evaluated_at', { ascending: false })

    const { data: evaluations, error: fetchError } = await query

    if (fetchError) {
      return next(fetchError)
    }

    return res.status(200).json({ evaluations: evaluations || [] })
  } catch (error) {
    next(error)
  }
}

/**
 * getEvaluationById(req, res, next)
 * - Fetch single evaluation with access control
 * - Full join: evaluation + submission + experiment + student + teacher profile
 * - Returns full object
 */
export const getEvaluationById = async (req, res, next) => {
  try {
    const { id } = req.params
    const userId = req.user.id
    const userRole = req.user.role

    // Fetch single evaluation with relations
    const { data: evaluation, error: fetchError } = await supabaseAdmin
      .from('evaluations')
      .select('*, submission:code_submissions(*, student:profiles(*), experiments(*)), teacher:profiles(*)')
      .eq('id', id)
      .single()

    if (fetchError || !evaluation) {
      return res.status(404).json({ error: 'Evaluation not found' })
    }

    // Access control checks
    const isStudent = userRole === 'student' && evaluation.submission?.student_id === userId
    const isEvaluator = userRole === 'teacher' && evaluation.teacher_id === userId
    const isCreatorOfExperiment = userRole === 'teacher' && evaluation.submission?.experiments?.created_by === userId
    const isAdmin = userRole === 'admin'

    if (!isStudent && !isEvaluator && !isCreatorOfExperiment && !isAdmin) {
      return res.status(403).json({
        error: 'Forbidden: Access denied to this evaluation'
      })
    }

    return res.status(200).json(evaluation)
  } catch (error) {
    next(error)
  }
}
