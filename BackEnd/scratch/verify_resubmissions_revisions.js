import { createResubmissionSchema, reviewResubmissionSchema } from '../src/schemas/resubmission.schema.js'
import { createRevisionSchema, reviewRevisionSchema } from '../src/schemas/marksRevision.schema.js'
import * as resubmissionControllers from '../src/controllers/resubmission.controller.js'
import * as marksRevisionControllers from '../src/controllers/marksRevision.controller.js'

async function runTests() {
  console.log('--- Starting Resubmission and Marks Revision Verification Tests ---')

  // 1. Resubmission Schema Validations
  console.log('\n--- Resubmission Schema Tests ---')
  try {
    createResubmissionSchema.parse({
      experiment_id: 'not-a-uuid',
      justification: 'This is a test justification longer than 10 characters.'
    })
    console.error('❌ Failed: Should have rejected invalid UUID for experiment_id')
  } catch (err) {
    console.log('✅ Passed: Rejected invalid UUID as expected')
  }

  try {
    createResubmissionSchema.parse({
      experiment_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      justification: 'short'
    })
    console.error('❌ Failed: Should have rejected short justification (< 10 characters)')
  } catch (err) {
    console.log('✅ Passed: Rejected short justification as expected')
  }

  try {
    createResubmissionSchema.parse({
      experiment_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      justification: 'a'.repeat(501)
    })
    console.error('❌ Failed: Should have rejected long justification (> 500 characters)')
  } catch (err) {
    console.log('✅ Passed: Rejected long justification as expected')
  }

  try {
    createResubmissionSchema.parse({
      experiment_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      justification: 'This is a completely valid justification for resubmission.'
    })
    console.log('✅ Passed: Accepted valid createResubmission payload')
  } catch (err) {
    console.error('❌ Failed: Rejected valid createResubmission payload:', err.message)
  }

  try {
    reviewResubmissionSchema.parse({
      status: 'pending',
      teacher_note: 'Not yet reviewed'
    })
    console.error('❌ Failed: Should have rejected status=pending in reviewResubmissionSchema')
  } catch (err) {
    console.log('✅ Passed: Rejected invalid status as expected')
  }

  try {
    reviewResubmissionSchema.parse({
      status: 'approved',
      teacher_note: 'Approved for resubmission.'
    })
    console.log('✅ Passed: Accepted valid reviewResubmission payload')
  } catch (err) {
    console.error('❌ Failed: Rejected valid reviewResubmission payload:', err.message)
  }

  // 2. Marks Revision Schema Validations
  console.log('\n--- Marks Revision Schema Tests ---')
  try {
    createRevisionSchema.parse({
      evaluation_id: 'not-a-uuid',
      requested_marks: 8,
      justification: 'Justification must be at least 10 chars.'
    })
    console.error('❌ Failed: Should have rejected invalid UUID for evaluation_id')
  } catch (err) {
    console.log('✅ Passed: Rejected invalid UUID as expected')
  }

  try {
    createRevisionSchema.parse({
      evaluation_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      requested_marks: 12,
      justification: 'Justification must be at least 10 chars.'
    })
    console.error('❌ Failed: Should have rejected requested_marks > 10')
  } catch (err) {
    console.log('✅ Passed: Rejected marks > 10 as expected')
  }

  try {
    createRevisionSchema.parse({
      evaluation_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      requested_marks: -1,
      justification: 'Justification must be at least 10 chars.'
    })
    console.error('❌ Failed: Should have rejected requested_marks < 0')
  } catch (err) {
    console.log('✅ Passed: Rejected marks < 0 as expected')
  }

  try {
    createRevisionSchema.parse({
      evaluation_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      requested_marks: 8,
      justification: 'short'
    })
    console.error('❌ Failed: Should have rejected short justification (< 10 characters)')
  } catch (err) {
    console.log('✅ Passed: Rejected short justification as expected')
  }

  try {
    createRevisionSchema.parse({
      evaluation_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      requested_marks: 9.5,
      justification: 'Valid justification length is easy.'
    })
    console.log('✅ Passed: Accepted valid requested_marks (decimal)')
  } catch (err) {
    console.error('❌ Failed: Rejected valid requested_marks:', err.message)
  }

  try {
    reviewRevisionSchema.parse({
      status: 'pending',
      admin_note: 'No response'
    })
    console.error('❌ Failed: Should have rejected status=pending in reviewRevisionSchema')
  } catch (err) {
    console.log('✅ Passed: Rejected invalid status as expected')
  }

  try {
    reviewRevisionSchema.parse({
      status: 'rejected',
      admin_note: 'Rejected because reason is unclear.'
    })
    console.log('✅ Passed: Accepted valid reviewRevision payload')
  } catch (err) {
    console.error('❌ Failed: Rejected valid reviewRevision payload:', err.message)
  }

  // 3. Controller function checks
  console.log('\n--- Controller Export Checks ---')
  const expectedResubmissionFuncs = [
    'createResubmissionRequest',
    'getResubmissionRequests',
    'reviewResubmissionRequest',
    'getResubmissions',
    'requestResubmission'
  ]
  const missingResubmission = expectedResubmissionFuncs.filter(
    fn => typeof resubmissionControllers[fn] !== 'function'
  )
  if (missingResubmission.length === 0) {
    console.log('✅ Passed: All resubmission controller functions exported correctly')
  } else {
    console.error('❌ Failed: Missing resubmission controller functions:', missingResubmission)
  }

  const expectedMarksRevisionFuncs = [
    'createRevisionRequest',
    'getRevisionRequests',
    'reviewRevisionRequest',
    'getMarksRevisions',
    'requestMarksRevision'
  ]
  const missingMarksRevision = expectedMarksRevisionFuncs.filter(
    fn => typeof marksRevisionControllers[fn] !== 'function'
  )
  if (missingMarksRevision.length === 0) {
    console.log('✅ Passed: All marks revision controller functions exported correctly')
  } else {
    console.error('❌ Failed: Missing marks revision controller functions:', missingMarksRevision)
  }

  console.log('\n--- All verification checks completed! ---')
}

runTests().catch(console.error)
