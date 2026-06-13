import { supabaseAdmin } from '../config/supabase.js'
import { uploadFile } from '../services/supabaseStorage.js'
import { logAudit } from '../services/audit.js'
import { createNotification } from '../services/notification.js'

/**
 * uploadLabRecord(req, res, next)
 * - Student only
 * - Accepts file via multer: PDF, DOCX, JPG, PNG (max 20MB)
 * - Upload to Supabase Storage bucket 'lab-records' at: lab-records/{student_id}/{experiment_id}/{timestamp}_{filename}
 * - Check if student already has a record for this experiment (if yes, upsert — update file_url, status back to 'submitted', update timestamp)
 * - Insert/update lab_records: { student_id, experiment_id, file_url, status='submitted' }
 * - Log audit
 * - Return { lab_record }
 */
export const uploadLabRecord = async (req, res, next) => {
  try {
    const studentId = req.user.id
    const { experiment_id } = req.body

    // Ensure a file is uploaded
    if (!req.file) {
      return res.status(400).json({ error: 'Lab record file is required' })
    }

    // Double check extensions (PDF, DOCX, JPG, PNG)
    const filename = req.file.originalname
    const allowedExtensions = ['.pdf', '.docx', '.jpg', '.jpeg', '.png']
    const ext = filename.substring(filename.lastIndexOf('.')).toLowerCase()

    if (!allowedExtensions.includes(ext)) {
      return res.status(400).json({
        error: 'Invalid file type. Allowed extensions are: .pdf, .docx, .jpg, .jpeg, .png'
      })
    }

    // Check if the student is assigned to this experiment
    const { data: assignment, error: assignmentError } = await supabaseAdmin
      .from('experiment_assignments')
      .select('*, experiments(is_archived)')
      .eq('student_id', studentId)
      .eq('experiment_id', experiment_id)
      .single()

    if (assignmentError || !assignment) {
      return res.status(403).json({ error: 'You are not assigned to this experiment' })
    }

    if (assignment.experiments?.is_archived) {
      return res.status(400).json({ error: 'Cannot submit to an archived experiment' })
    }

    // Upload file to Supabase Storage
    const timestamp = Date.now()
    const storagePath = `${studentId}/${experiment_id}/${timestamp}_${filename}`

    let fileUrl
    try {
      fileUrl = await uploadFile('lab-records', storagePath, req.file.buffer, req.file.mimetype)
    } catch (uploadError) {
      return next(uploadError)
    }

    // Check if student already has a record for this experiment
    const { data: existingRecord, error: findError } = await supabaseAdmin
      .from('lab_records')
      .select('id')
      .eq('student_id', studentId)
      .eq('experiment_id', experiment_id)
      .maybeSingle()

    if (findError) {
      return next(findError)
    }

    let record
    if (existingRecord) {
      // Update existing record
      const { data: updatedRecord, error: updateError } = await supabaseAdmin
        .from('lab_records')
        .update({
          file_url: fileUrl,
          status: 'submitted',
          submitted_at: new Date().toISOString()
        })
        .eq('id', existingRecord.id)
        .select()
        .single()

      if (updateError) {
        return next(updateError)
      }
      record = updatedRecord
    } else {
      // Insert new record
      const { data: newRecord, error: insertError } = await supabaseAdmin
        .from('lab_records')
        .insert({
          student_id: studentId,
          experiment_id: experiment_id,
          file_url: fileUrl,
          status: 'submitted'
        })
        .select()
        .single()

      if (insertError) {
        return next(insertError)
      }
      record = newRecord
    }

    // Update assignment status to 'submitted'
    await supabaseAdmin
      .from('experiment_assignments')
      .update({ status: 'submitted' })
      .eq('student_id', studentId)
      .eq('experiment_id', experiment_id)

    // Log audit
    await logAudit(
      studentId,
      'lab_record_submitted',
      'lab_records',
      record.id,
      { experiment_id }
    ).catch(err => console.error('Failed to log audit:', err))

    return res.status(201).json({ lab_record: record })
  } catch (error) {
    next(error)
  }
}

/**
 * getLabRecords(req, res, next)
 * - Student: fetch their own lab_records joined with experiments (title, subject)
 * - Teacher: fetch lab_records for their experiments joined with student profile (full_name, enrollment_no)
 * - Admin: fetch all
 * - Supports filter: status, experiment_id
 * - Returns { lab_records: [...] }
 */
export const getLabRecords = async (req, res, next) => {
  try {
    const userId = req.user.id
    const userRole = req.user.role

    let query

    if (userRole === 'student') {
      query = supabaseAdmin
        .from('lab_records')
        .select('*, experiments(title, subject)')
        .eq('student_id', userId)
    } else if (userRole === 'teacher') {
      query = supabaseAdmin
        .from('lab_records')
        .select('*, experiments!inner(title, subject, created_by), student:profiles(full_name, enrollment_no)')
        .eq('experiments.created_by', userId)
    } else if (userRole === 'admin') {
      query = supabaseAdmin
        .from('lab_records')
        .select('*, experiments(title, subject), student:profiles(full_name, enrollment_no)')
    } else {
      return res.status(403).json({ error: 'Forbidden: Invalid role' })
    }

    // Filters
    if (req.query.status) {
      query = query.eq('status', req.query.status)
    }

    if (req.query.experiment_id) {
      query = query.eq('experiment_id', req.query.experiment_id)
    }

    // Sort by latest submitted
    query = query.order('submitted_at', { ascending: false })

    const { data: records, error: fetchError } = await query

    if (fetchError) {
      return next(fetchError)
    }

    return res.status(200).json({ lab_records: records || [] })
  } catch (error) {
    next(error)
  }
}

/**
 * verifyLabRecord(req, res, next)
 * - Teacher only
 * - Params: recordId
 * - Body: { status: 'verified' | 'pending' }
 * - Check teacher owns the experiment linked to this record
 * - Update lab_records.status
 * - Create notification for student: 'Your lab record for {experiment.title} has been {status}'
 * - Log audit: action='lab_record_verified'
 * - Return updated record
 */
export const verifyLabRecord = async (req, res, next) => {
  try {
    const { recordId } = req.params
    const { status } = req.body
    const teacherId = req.user.id

    // Fetch the record and associated experiment to check ownership
    const { data: record, error: fetchError } = await supabaseAdmin
      .from('lab_records')
      .select('*, experiments(title, created_by)')
      .eq('id', recordId)
      .single()

    if (fetchError || !record) {
      return res.status(404).json({ error: 'Lab record not found' })
    }

    // Check teacher ownership
    if (!record.experiments || record.experiments.created_by !== teacherId) {
      return res.status(403).json({ error: 'Forbidden: You do not own the experiment linked to this record' })
    }

    // Update status
    const { data: updatedRecord, error: updateError } = await supabaseAdmin
      .from('lab_records')
      .update({ status })
      .eq('id', recordId)
      .select()
      .single()

    if (updateError) {
      return next(updateError)
    }

    // Create notification
    const experimentTitle = record.experiments?.title || 'Experiment'
    await createNotification(
      record.student_id,
      `Your lab record for ${experimentTitle} has been ${status}`
    ).catch(err => console.error('Failed to create notification:', err))

    // Log audit
    await logAudit(
      teacherId,
      'lab_record_verified',
      'lab_records',
      recordId,
      { status }
    ).catch(err => console.error('Failed to log audit:', err))

    return res.status(200).json({ lab_record: updatedRecord })
  } catch (error) {
    next(error)
  }
}

/**
 * batchVerifyLabRecords(req, res, next)
 * - Teacher only
 * - Body: { record_ids: uuid[], status: 'verified' }
 * - Update all matching records where experiment is owned by teacher
 * - Send notification to each student
 * - Return { updated_count }
 */
export const batchVerifyLabRecords = async (req, res, next) => {
  try {
    const { record_ids, status } = req.body
    const teacherId = req.user.id

    // Fetch matching records and associated experiments
    const { data: records, error: fetchError } = await supabaseAdmin
      .from('lab_records')
      .select('*, experiments(title, created_by)')
      .in('id', record_ids)

    if (fetchError) {
      return next(fetchError)
    }

    if (!records || records.length === 0) {
      return res.status(200).json({ updated_count: 0 })
    }

    // Filter by experiments owned by the teacher
    const ownedRecords = records.filter(
      (r) => r.experiments && r.experiments.created_by === teacherId
    )

    if (ownedRecords.length === 0) {
      return res.status(200).json({ updated_count: 0 })
    }

    const ownedRecordIds = ownedRecords.map((r) => r.id)

    // Batch update
    const { error: updateError } = await supabaseAdmin
      .from('lab_records')
      .update({ status })
      .in('id', ownedRecordIds)

    if (updateError) {
      return next(updateError)
    }

    // Send notifications and log audits
    const notificationPromises = ownedRecords.map((record) => {
      const experimentTitle = record.experiments?.title || 'Experiment'
      return createNotification(
        record.student_id,
        `Your lab record for ${experimentTitle} has been ${status}`
      ).catch((err) => console.error('Batch notification failed:', err))
    })

    const auditPromises = ownedRecords.map((record) => {
      return logAudit(
        teacherId,
        'lab_record_verified',
        'lab_records',
        record.id,
        { status, is_batch: true }
      ).catch((err) => console.error('Batch audit log failed:', err))
    })

    await Promise.all([...notificationPromises, ...auditPromises])

    return res.status(200).json({ updated_count: ownedRecordIds.length })
  } catch (error) {
    next(error)
  }
}
