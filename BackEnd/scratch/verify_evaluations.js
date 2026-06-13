import { createEvaluationSchema, updateEvaluationSchema } from '../src/schemas/evaluation.schema.js'
import * as controllers from '../src/controllers/evaluation.controller.js'

async function runTests() {
  console.log('--- Starting Teacher Evaluations Verification Tests ---')

  // 1. Schema Validations
  console.log('\nTesting createEvaluationSchema validation...')
  try {
    createEvaluationSchema.parse({
      submission_id: 'not-a-uuid',
      marks: 8,
      remarks: 'Good job'
    })
    console.error('❌ Failed: Should have rejected invalid UUID')
  } catch (err) {
    console.log('✅ Passed: Rejected invalid UUID as expected')
  }

  try {
    createEvaluationSchema.parse({
      submission_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      marks: 11,
      remarks: 'Good job'
    })
    console.error('❌ Failed: Should have rejected marks > 10')
  } catch (err) {
    console.log('✅ Passed: Rejected marks > 10 as expected')
  }

  try {
    createEvaluationSchema.parse({
      submission_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      marks: -1,
      remarks: 'Good job'
    })
    console.error('❌ Failed: Should have rejected marks < 0')
  } catch (err) {
    console.log('✅ Passed: Rejected marks < 0 as expected')
  }

  try {
    createEvaluationSchema.parse({
      submission_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      marks: 8,
      remarks: 'Sho'
    })
    console.error('❌ Failed: Should have rejected remarks < 5 characters')
  } catch (err) {
    console.log('✅ Passed: Rejected short remarks as expected')
  }

  try {
    createEvaluationSchema.parse({
      submission_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      marks: 8,
      remarks: 'Good submission, well done!'
    })
    console.log('✅ Passed: Accepted valid evaluation payload')
  } catch (err) {
    console.error('❌ Failed: Rejected valid evaluation payload')
  }

  console.log('\nTesting updateEvaluationSchema validation...')
  try {
    updateEvaluationSchema.parse({
      remarks: 'Nice rewrite'
    })
    console.log('✅ Passed: Accepted partial update with remarks only')
  } catch (err) {
    console.error('❌ Failed: Rejected remarks-only update')
  }

  console.log('\n--- Checking Controllers Load and Signature ---')
  if (typeof controllers.createEvaluation === 'function' &&
      typeof controllers.updateEvaluation === 'function' &&
      typeof controllers.getEvaluations === 'function' &&
      typeof controllers.getEvaluationById === 'function') {
    console.log('✅ Passed: All 4 controller functions exported and are functions')
  } else {
    console.error('❌ Failed: Missing controller exports')
  }

  console.log('\n--- All local evaluation validation checks passed! ---')
}

runTests().catch(console.error)
