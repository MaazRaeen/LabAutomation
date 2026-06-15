import { supabaseAdmin } from '../config/supabase.js'
import { deleteFiles } from '../services/supabaseStorage.js'


// 1. createExperiment(req, res)
// - Teacher only (role check handled by middleware)
// - Inserts into experiments with created_by = req.user.id
// - Logs audit: action='experiment_created'
// - Returns created experiment
export const createExperiment = async (req, res, next) => {
  try {
    const {
      title,
      subject,
      description,
      deadline,
      instructions_url,
      target_semester,
      target_session,
      target_section
    } = req.body

    const targetSemVal = target_semester === 'all' || !target_semester ? null : target_semester
    const targetSessVal = target_session === 'all' || !target_session ? null : target_session.trim()
    const targetSectVal = target_section === 'all' || !target_section ? null : target_section.trim()

    const { data: experiment, error } = await supabaseAdmin
      .from('experiments')
      .insert({
        title,
        subject,
        description,
        deadline,
        instructions_url,
        created_by: req.user.id,
        target_semester: targetSemVal,
        target_session: targetSessVal,
        target_section: targetSectVal
      })
      .select()
      .single()

    if (error) {
      return next(error)
    }

    // Auto-assign students based on semester, session, and section
    let studentQuery = supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('role', 'student')

    if (targetSemVal) {
      studentQuery = studentQuery.eq('semester', targetSemVal)
    }
    if (targetSessVal) {
      studentQuery = studentQuery.eq('session', targetSessVal)
    }
    if (targetSectVal) {
      studentQuery = studentQuery.eq('section', targetSectVal)
    }

    const { data: students, error: studentError } = await studentQuery

    if (studentError) {
      console.error('Failed to fetch students for auto-assignment:', studentError)
    } else if (students && students.length > 0) {
      const assignments = students.map((student) => ({
        experiment_id: experiment.id,
        student_id: student.id,
        status: 'pending'
      }))

      const { error: assignError } = await supabaseAdmin
        .from('experiment_assignments')
        .insert(assignments)

      if (assignError) {
        console.error('Failed to auto-assign experiment to students:', assignError)
      }
    }

    // Log to audit_logs
    const { error: logError } = await supabaseAdmin
      .from('audit_logs')
      .insert({
        actor_id: req.user.id,
        action: 'experiment_created',
        target_table: 'experiments',
        target_id: experiment.id
      })

    if (logError) {
      console.error('Failed to log experiment creation to audit_logs:', logError)
    }

    return res.status(201).json(experiment)
  } catch (error) {
    next(error)
  }
}

// 2. getMyExperiments(req, res)
// - Teacher: fetch experiments where created_by = req.user.id
// - Student: fetch experiments via experiment_assignments where student_id = req.user.id, join experiments
// - Admin: fetch all experiments
// - Returns { experiments: [...] }
export const getMyExperiments = async (req, res, next) => {
  try {
    const userRole = req.user.role
    const userId = req.user.id

    if (userRole === 'admin') {
      const { data: experiments, error } = await supabaseAdmin
        .from('experiments')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) return next(error)
      return res.status(200).json({ experiments: experiments || [] })
    }

    if (userRole === 'teacher') {
      const { data: experiments, error } = await supabaseAdmin
        .from('experiments')
        .select('*')
        .eq('created_by', userId)
        .order('created_at', { ascending: false })

      if (error) return next(error)
      return res.status(200).json({ experiments: experiments || [] })
    }

    if (userRole === 'student') {
      const { data, error } = await supabaseAdmin
        .from('experiment_assignments')
        .select('status, assigned_at, experiments(*)')
        .eq('student_id', userId)

      if (error) return next(error)

      const experiments = (data || [])
        .filter((item) => item.experiments)
        .map((item) => ({
          ...item.experiments,
          assignment_status: item.status,
          assigned_at: item.assigned_at
        }))

      return res.status(200).json({ experiments })
    }

    return res.status(403).json({ error: 'Forbidden: Invalid role' })
  } catch (error) {
    next(error)
  }
}

// 3. getExperimentById(req, res)
// - Fetch single experiment by id
// - Students can only access if assigned
// - Teachers can access if they created it
// - Admin can access all
export const getExperimentById = async (req, res, next) => {
  try {
    const { id } = req.params
    const userId = req.user.id
    const userRole = req.user.role

    const { data: experiment, error } = await supabaseAdmin
      .from('experiments')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !experiment) {
      return res.status(404).json({ error: 'Experiment not found' })
    }

    if (userRole === 'admin') {
      return res.status(200).json(experiment)
    }

    if (userRole === 'teacher') {
      if (experiment.created_by !== userId) {
        return res.status(403).json({ error: 'Forbidden: You did not create this experiment' })
      }
      return res.status(200).json(experiment)
    }

    if (userRole === 'student') {
      const { data: assignment, error: assignmentError } = await supabaseAdmin
        .from('experiment_assignments')
        .select('status, assigned_at')
        .eq('experiment_id', id)
        .eq('student_id', userId)
        .single()

      if (assignmentError || !assignment) {
        return res.status(403).json({ error: 'Forbidden: You are not assigned to this experiment' })
      }

      return res.status(200).json({
        ...experiment,
        assignment_status: assignment.status,
        assigned_at: assignment.assigned_at
      })
    }

    return res.status(403).json({ error: 'Forbidden: Invalid role' })
  } catch (error) {
    next(error)
  }
}

// 4. updateExperiment(req, res)
// - Teacher only, must be creator
// - Update experiment fields (partial update)
// - Returns updated experiment
export const updateExperiment = async (req, res, next) => {
  try {
    const { id } = req.params
    const userId = req.user.id

    const { data: experiment, error: fetchError } = await supabaseAdmin
      .from('experiments')
      .select('created_by')
      .eq('id', id)
      .single()

    if (fetchError || !experiment) {
      return res.status(404).json({ error: 'Experiment not found' })
    }

    if (experiment.created_by !== userId) {
      return res.status(403).json({ error: 'Forbidden: You are not the creator of this experiment' })
    }

    const { data: updatedExperiment, error: updateError } = await supabaseAdmin
      .from('experiments')
      .update(req.body)
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      return next(updateError)
    }

    return res.status(200).json(updatedExperiment)
  } catch (error) {
    next(error)
  }
}

// 5. archiveExperiment(req, res)
// - Teacher or Admin
// - Sets is_archived = true
// - Logs audit
// - Returns updated experiment
export const archiveExperiment = async (req, res, next) => {
  try {
    const { id } = req.params
    const userId = req.user.id
    const userRole = req.user.role

    const { data: experiment, error: fetchError } = await supabaseAdmin
      .from('experiments')
      .select('created_by')
      .eq('id', id)
      .single()

    if (fetchError || !experiment) {
      return res.status(404).json({ error: 'Experiment not found' })
    }

    if (userRole === 'teacher' && experiment.created_by !== userId) {
      return res.status(403).json({ error: 'Forbidden: You are not the creator of this experiment' })
    }

    const { data: updatedExperiment, error: updateError } = await supabaseAdmin
      .from('experiments')
      .update({ is_archived: true })
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      return next(updateError)
    }

    // Log to audit_logs
    const { error: logError } = await supabaseAdmin
      .from('audit_logs')
      .insert({
        actor_id: userId,
        action: 'experiment_archived',
        target_table: 'experiments',
        target_id: id
      })

    if (logError) {
      console.error('Failed to log experiment archiving to audit_logs:', logError)
    }

    return res.status(200).json(updatedExperiment)
  } catch (error) {
    next(error)
  }
}

// 6. assignExperiment(req, res)
// - Teacher only
// - Bulk insert into experiment_assignments: { experiment_id, student_id, status='pending' } for each student_id in array
// - Skip duplicates (use upsert with onConflict ignore)
// - Returns count of assignments created
export const assignExperiment = async (req, res, next) => {
  try {
    const { id } = req.params // Experiment ID from URL path
    const { student_ids } = req.body
    const userId = req.user.id

    // Check if the experiment exists and belongs to the teacher
    const { data: experiment, error: fetchError } = await supabaseAdmin
      .from('experiments')
      .select('created_by')
      .eq('id', id)
      .single()

    if (fetchError || !experiment) {
      return res.status(404).json({ error: 'Experiment not found' })
    }

    if (experiment.created_by !== userId && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden: You are not the creator of this experiment' })
    }

    if (!Array.isArray(student_ids) || student_ids.length === 0) {
      return res.status(400).json({ error: 'student_ids must be a non-empty array' })
    }

    const rowsToInsert = student_ids.map((studentId) => ({
      experiment_id: id,
      student_id: studentId,
      status: 'pending'
    }))

    const { data, error } = await supabaseAdmin
      .from('experiment_assignments')
      .upsert(rowsToInsert, {
        onConflict: 'experiment_id,student_id',
        ignoreDuplicates: true
      })
      .select()

    if (error) {
      return next(error)
    }

    const count = data ? data.length : 0

    return res.status(200).json({ count })
  } catch (error) {
    next(error)
  }
}

// Keep original name for compatibility if needed
export const getExperiments = getMyExperiments

// 7. deleteExperiment(req, res)
// - Teacher (must be creator) or Admin
// - Fetches related submissions & lab records to get their file URLs
// - Deletes all files from storage (instructions, submissions, lab-records)
// - Deletes the experiment from the DB (cascading to assignments, submissions, evaluations, etc.)
// - Logs to audit_logs
export const deleteExperiment = async (req, res, next) => {
  try {
    const { id } = req.params
    const userId = req.user.id
    const userRole = req.user.role

    // 1. Fetch experiment to verify existence and ownership
    const { data: experiment, error: fetchError } = await supabaseAdmin
      .from('experiments')
      .select('created_by, instructions_url, title')
      .eq('id', id)
      .single()

    if (fetchError || !experiment) {
      return res.status(404).json({ error: 'Experiment not found' })
    }

    // Access control check: Must be the creator (teacher) or an admin
    if (userRole === 'teacher' && experiment.created_by !== userId) {
      return res.status(403).json({ error: 'Forbidden: You are not the creator of this experiment' })
    }

    // 2. Fetch all code submissions associated with this experiment
    const { data: submissions, error: subError } = await supabaseAdmin
      .from('code_submissions')
      .select('file_url')
      .eq('experiment_id', id)

    if (subError) {
      return next(subError)
    }

    // 3. Fetch all lab records associated with this experiment
    const { data: labRecords, error: lrError } = await supabaseAdmin
      .from('lab_records')
      .select('file_url')
      .eq('experiment_id', id)

    if (lrError) {
      return next(lrError)
    }

    // Helper to parse path from public URL
    const extractStoragePath = (publicUrl, bucketName) => {
      if (!publicUrl) return null
      const marker = `/public/${bucketName}/`
      const index = publicUrl.indexOf(marker)
      if (index === -1) return null
      return decodeURIComponent(publicUrl.substring(index + marker.length))
    }

    // 4. Collect and delete all files in storage
    const instructionsPaths = []
    if (experiment.instructions_url) {
      const path = extractStoragePath(experiment.instructions_url, 'instructions')
      if (path) instructionsPaths.push(path)
    }

    const submissionPaths = (submissions || [])
      .map(s => extractStoragePath(s.file_url, 'submissions'))
      .filter(Boolean)

    const labRecordPaths = (labRecords || [])
      .map(lr => extractStoragePath(lr.file_url, 'lab-records'))
      .filter(Boolean)

    // Run storage deletions
    if (instructionsPaths.length > 0) {
      await deleteFiles('instructions', instructionsPaths).catch(err =>
        console.error('Failed to delete instructions file from storage:', err)
      )
    }

    if (submissionPaths.length > 0) {
      await deleteFiles('submissions', submissionPaths).catch(err =>
        console.error('Failed to delete submission files from storage:', err)
      )
    }

    if (labRecordPaths.length > 0) {
      await deleteFiles('lab-records', labRecordPaths).catch(err =>
        console.error('Failed to delete lab record files from storage:', err)
      )
    }

    // 5. Delete experiment from the database
    // (This triggers ON DELETE CASCADE for assignments, submissions, evaluations, lab records, resubmissions, revisions)
    const { error: deleteError } = await supabaseAdmin
      .from('experiments')
      .delete()
      .eq('id', id)

    if (deleteError) {
      return next(deleteError)
    }

    // 6. Log to audit_logs
    const { error: logError } = await supabaseAdmin
      .from('audit_logs')
      .insert({
        actor_id: userId,
        action: 'experiment_deleted',
        target_table: 'experiments',
        target_id: id,
        metadata: { title: experiment.title }
      })

    if (logError) {
      console.error('Failed to log experiment deletion to audit_logs:', logError)
    }

    return res.status(200).json({ message: 'Experiment and all related details deleted permanently' })
  } catch (error) {
    next(error)
  }
}

