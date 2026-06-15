import { supabaseAdmin } from '../src/config/supabase.js'
import { deleteExperiment } from '../src/controllers/experiment.controller.js'

async function run() {
  console.log('=== VERIFY EXPERIMENT DELETION ===')

  // 1. Get a teacher and student profile
  const { data: teacher, error: tErr } = await supabaseAdmin
    .from('profiles')
    .select('id')
    .eq('role', 'teacher')
    .limit(1)
    .single()

  const { data: student, error: sErr } = await supabaseAdmin
    .from('profiles')
    .select('id')
    .eq('role', 'student')
    .limit(1)
    .single()

  if (tErr || sErr || !teacher || !student) {
    console.error('Failed to get teacher/student profile for verification. Error:', { tErr, sErr })
    process.exit(1)
  }

  console.log(`Using Teacher ID: ${teacher.id}, Student ID: ${student.id}`)

  // 2. Create a dummy experiment
  const { data: experiment, error: expErr } = await supabaseAdmin
    .from('experiments')
    .insert({
      title: 'TEMP DELETE ME EXPERIMENT',
      subject: 'Verification subject',
      description: 'Test description',
      deadline: new Date(Date.now() + 86400000).toISOString(),
      created_by: teacher.id,
      instructions_url: 'https://dwjikwgtshgpuwoxogtj.supabase.co/storage/v1/object/public/instructions/test-user/test-file.pdf'
    })
    .select()
    .single()

  if (expErr || !experiment) {
    console.error('Failed to create dummy experiment:', expErr)
    process.exit(1)
  }
  console.log(`Created experiment with ID: ${experiment.id}`)

  // 3. Create dummy assignment
  const { data: assignment, error: assignErr } = await supabaseAdmin
    .from('experiment_assignments')
    .insert({
      experiment_id: experiment.id,
      student_id: student.id,
      status: 'pending'
    })
    .select()
    .single()

  if (assignErr) {
    console.error('Failed to create dummy assignment:', assignErr)
    process.exit(1)
  }
  console.log(`Created assignment with ID: ${assignment.id}`)

  // 4. Create dummy code submission
  const { data: submission, error: subErr } = await supabaseAdmin
    .from('code_submissions')
    .insert({
      experiment_id: experiment.id,
      student_id: student.id,
      file_url: 'https://dwjikwgtshgpuwoxogtj.supabase.co/storage/v1/object/public/submissions/test-user/test-file.py',
      language: 'Python',
      version: 1
    })
    .select()
    .single()

  if (subErr) {
    console.error('Failed to create dummy submission:', subErr)
    process.exit(1)
  }
  console.log(`Created submission with ID: ${submission.id}`)

  // 5. Create dummy evaluation
  const { data: evaluation, error: evalErr } = await supabaseAdmin
    .from('evaluations')
    .insert({
      submission_id: submission.id,
      teacher_id: teacher.id,
      marks: 8,
      remarks: 'Good job'
    })
    .select()
    .single()

  if (evalErr) {
    console.error('Failed to create dummy evaluation:', evalErr)
    process.exit(1)
  }
  console.log(`Created evaluation with ID: ${evaluation.id}`)

  // 6. Invoke deleteExperiment controller via mock req/res
  const req = {
    params: { id: experiment.id },
    user: { id: teacher.id, role: 'teacher' }
  }

  let resStatus = null
  let resJson = null
  const res = {
    status: (code) => {
      resStatus = code
      return {
        json: (val) => {
          resJson = val
        }
      }
    }
  }

  const next = (err) => {
    if (err) {
      console.error('Controller next called with error:', err)
    }
  }

  console.log('Invoking deleteExperiment controller...')
  await deleteExperiment(req, res, next)

  console.log(`Response status: ${resStatus}`)
  console.log(`Response JSON:`, resJson)

  // 7. Verify deletion
  const { data: deletedExp } = await supabaseAdmin
    .from('experiments')
    .select('id')
    .eq('id', experiment.id)
    .maybeSingle()

  const { data: deletedAssign } = await supabaseAdmin
    .from('experiment_assignments')
    .select('id')
    .eq('id', assignment.id)
    .maybeSingle()

  const { data: deletedSub } = await supabaseAdmin
    .from('code_submissions')
    .select('id')
    .eq('id', submission.id)
    .maybeSingle()

  const { data: deletedEval } = await supabaseAdmin
    .from('evaluations')
    .select('id')
    .eq('id', evaluation.id)
    .maybeSingle()

  if (!deletedExp && !deletedAssign && !deletedSub && !deletedEval) {
    console.log('✅ SUCCESS: All database records deleted cascadingly and permanently!')
  } else {
    console.error('❌ FAILURE: Some database records still exist:', {
      deletedExp,
      deletedAssign,
      deletedSub,
      deletedEval
    })
  }
}

run().catch(console.error)
