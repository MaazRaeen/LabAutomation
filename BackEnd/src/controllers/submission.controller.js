import { supabaseAdmin } from '../config/supabase.js'
import { uploadFile } from '../services/supabaseStorage.js'

/**
 * submitCode(req, res, next)
 * - Student only
 * - Accepts file via multer (single file, field name: 'code_file')
 * - Allowed extensions: .py .java .c .cpp .js .ts
 * - Detect language from extension (map: .py→Python, .java→Java, .c→C, .cpp→C++, .js→JavaScript, .ts→TypeScript)
 * - Check if experiment is assigned to this student (query experiment_assignments)
 * - Check deadline: if now() > experiment.deadline, set is_late = true
 * - Upload file to Supabase Storage bucket 'submissions' at path: submissions/{student_id}/{experiment_id}/{timestamp}_{filename}
 * - Get latest version: SELECT MAX(version) FROM code_submissions WHERE student_id AND experiment_id
 * - Insert into code_submissions: { experiment_id, student_id, file_url, language, is_late, version: latest+1 }
 * - Update experiment_assignments.status to 'submitted' (or 'late' if is_late)
 * - Log audit
 * - Return { submission, is_late, message }
 */
export const submitCode = async (req, res, next) => {
  try {
    const studentId = req.user.id
    const { experiment_id } = req.body

    // Ensure a file is uploaded
    if (!req.file) {
      return res.status(400).json({ error: 'Code file is required' })
    }

    // Allowed extensions check
    const extensionMap = {
      '.py': 'Python',
      '.java': 'Java',
      '.c': 'C',
      '.cpp': 'C++',
      '.js': 'JavaScript',
      '.ts': 'TypeScript'
    }

    const filename = req.file.originalname
    const parts = filename.split('.')
    const fileExt = parts.length > 1 ? '.' + parts.pop().toLowerCase() : ''
    const language = extensionMap[fileExt]

    if (!language) {
      return res.status(400).json({
        error: 'Invalid file extension. Allowed extensions are: .py, .java, .c, .cpp, .js, .ts'
      })
    }

    // Check if the experiment is assigned to the student
    const { data: assignment, error: assignmentError } = await supabaseAdmin
      .from('experiment_assignments')
      .select('*, experiments(deadline, is_archived)')
      .eq('student_id', studentId)
      .eq('experiment_id', experiment_id)
      .single()

    if (assignmentError || !assignment) {
      return res.status(403).json({ error: 'You are not assigned to this experiment' })
    }

    if (assignment.experiments.is_archived) {
      return res.status(400).json({ error: 'Cannot submit to an archived experiment' })
    }

    // Check if submission is late
    const now = new Date()
    const deadline = new Date(assignment.experiments.deadline)
    const is_late = now > deadline

    // Upload file to Supabase Storage
    const timestamp = Date.now()
    const storagePath = `submissions/${studentId}/${experiment_id}/${timestamp}_${filename}`

    let fileUrl
    try {
      fileUrl = await uploadFile('submissions', storagePath, req.file.buffer, req.file.mimetype)
    } catch (uploadError) {
      return next(uploadError)
    }

    // Get the latest submission version to increment it
    const { data: versionData, error: versionError } = await supabaseAdmin
      .from('code_submissions')
      .select('version')
      .eq('student_id', studentId)
      .eq('experiment_id', experiment_id)
      .order('version', { ascending: false })
      .limit(1)

    if (versionError) {
      return next(versionError)
    }

    const latestVersion = versionData && versionData.length > 0 ? versionData[0].version : 0
    const nextVersion = latestVersion + 1

    // Insert new submission record
    const { data: submission, error: insertError } = await supabaseAdmin
      .from('code_submissions')
      .insert({
        experiment_id,
        student_id: studentId,
        file_url: fileUrl,
        language,
        is_late,
        version: nextVersion
      })
      .select()
      .single()

    if (insertError) {
      return next(insertError)
    }

    // Update assignment status
    const newStatus = is_late ? 'late' : 'submitted'
    const { error: assignmentUpdateError } = await supabaseAdmin
      .from('experiment_assignments')
      .update({ status: newStatus })
      .eq('student_id', studentId)
      .eq('experiment_id', experiment_id)

    if (assignmentUpdateError) {
      console.error('Failed to update experiment assignment status:', assignmentUpdateError)
    }

    // Log to audit_logs
    const { error: auditError } = await supabaseAdmin
      .from('audit_logs')
      .insert({
        actor_id: studentId,
        action: 'code_submitted',
        target_table: 'code_submissions',
        target_id: submission.id,
        metadata: { is_late, version: nextVersion }
      })

    if (auditError) {
      console.error('Failed to log submission to audit_logs:', auditError)
    }

    return res.status(201).json({
      submission,
      is_late,
      message: 'Code submitted successfully'
    })
  } catch (error) {
    next(error)
  }
}

/**
 * getMySubmissions(req, res, next)
 * - Student: fetch code_submissions where student_id = req.user.id
 * - Teacher: fetch all submissions for experiments created by teacher, join profiles for student name
 * - Admin: fetch all
 * - Supports query params: experiment_id, is_late (boolean filter)
 * - Returns { submissions: [...] }
 */
export const getMySubmissions = async (req, res, next) => {
  try {
    const userRole = req.user.role
    const userId = req.user.id

    let query

    if (userRole === 'student') {
      query = supabaseAdmin
        .from('code_submissions')
        .select('*, experiments(title, subject), student:profiles(full_name)')
        .eq('student_id', userId)
    } else if (userRole === 'teacher') {
      query = supabaseAdmin
        .from('code_submissions')
        .select('*, experiments!inner(title, subject, created_by), student:profiles(full_name)')
        .eq('experiments.created_by', userId)
    } else if (userRole === 'admin') {
      query = supabaseAdmin
        .from('code_submissions')
        .select('*, experiments(title, subject), student:profiles(full_name)')
    } else {
      return res.status(403).json({ error: 'Forbidden: Invalid role' })
    }

    // Apply filters
    if (req.query.experiment_id) {
      query = query.eq('experiment_id', req.query.experiment_id)
    }

    if (req.query.is_late !== undefined) {
      const isLateBool = req.query.is_late === 'true'
      query = query.eq('is_late', isLateBool)
    }

    // Sort by latest submissions first
    query = query.order('submitted_at', { ascending: false })

    const { data: submissions, error: fetchError } = await query

    if (fetchError) {
      return next(fetchError)
    }

    return res.status(200).json({ submissions: submissions || [] })
  } catch (error) {
    next(error)
  }
}

/**
 * getSubmissionById(req, res, next)
 * - Fetch single submission with access control same as above
 * - Returns submission + experiment details + student profile
 */
export const getSubmissionById = async (req, res, next) => {
  try {
    const { id } = req.params
    const userId = req.user.id
    const userRole = req.user.role

    const { data: submission, error: fetchError } = await supabaseAdmin
      .from('code_submissions')
      .select('*, experiments(*), student:profiles(*)')
      .eq('id', id)
      .single()

    if (fetchError || !submission) {
      return res.status(404).json({ error: 'Submission not found' })
    }

    // Access Control Check
    const isStudent = userRole === 'student' && submission.student_id === userId
    const isTeacher = userRole === 'teacher' && submission.experiments && submission.experiments.created_by === userId
    const isAdmin = userRole === 'admin'

    if (!isStudent && !isTeacher && !isAdmin) {
      return res.status(403).json({ error: 'Forbidden: Access denied to this submission' })
    }

    return res.status(200).json({
      submission: {
        ...submission,
        experiment: submission.experiments,
        student: submission.student
      },
      experiment: submission.experiments,
      student: submission.student
    })
  } catch (error) {
    next(error)
  }
}
