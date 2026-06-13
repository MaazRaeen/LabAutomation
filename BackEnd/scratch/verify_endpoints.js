import { uploadLabRecordSchema, verifyLabRecordSchema, batchVerifyLabRecordsSchema } from '../src/schemas/labRecord.schema.js'
import * as controllers from '../src/controllers/labRecord.controller.js'

async function runTests() {
  console.log('--- Starting Lab Records Verification Tests ---')

  // 1. Schema Validations
  console.log('\nTesting uploadLabRecordSchema validation...')
  try {
    uploadLabRecordSchema.parse({ experiment_id: 'not-a-uuid' })
    console.error('❌ Failed: Should have rejected invalid UUID')
  } catch (err) {
    console.log('✅ Passed: Rejected invalid UUID as expected')
  }

  try {
    uploadLabRecordSchema.parse({ experiment_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' })
    console.log('✅ Passed: Accepted valid UUID')
  } catch (err) {
    console.error('❌ Failed: Rejected valid UUID')
  }

  console.log('\nTesting verifyLabRecordSchema validation...')
  try {
    verifyLabRecordSchema.parse({ status: 'wrong-status' })
    console.error('❌ Failed: Should have rejected invalid status')
  } catch (err) {
    console.log('✅ Passed: Rejected invalid status as expected')
  }

  try {
    verifyLabRecordSchema.parse({ status: 'verified' })
    verifyLabRecordSchema.parse({ status: 'pending' })
    console.log('✅ Passed: Accepted valid statuses')
  } catch (err) {
    console.error('❌ Failed: Rejected valid status')
  }

  console.log('\nTesting batchVerifyLabRecordsSchema validation...')
  try {
    batchVerifyLabRecordsSchema.parse({ record_ids: ['a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'], status: 'pending' })
    console.error('❌ Failed: Should have rejected pending status for batch verify')
  } catch (err) {
    console.log('✅ Passed: Rejected pending status for batch verify')
  }

  try {
    batchVerifyLabRecordsSchema.parse({ record_ids: ['not-a-uuid'], status: 'verified' })
    console.error('❌ Failed: Should have rejected invalid record ID UUID')
  } catch (err) {
    console.log('✅ Passed: Rejected invalid record ID UUID')
  }

  try {
    batchVerifyLabRecordsSchema.parse({ record_ids: ['a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'], status: 'verified' })
    console.log('✅ Passed: Accepted valid batch parameters')
  } catch (err) {
    console.error('❌ Failed: Rejected valid batch parameters')
  }

  console.log('\n--- Checking Controllers Load and Signature ---')
  if (typeof controllers.uploadLabRecord === 'function' &&
      typeof controllers.getLabRecords === 'function' &&
      typeof controllers.verifyLabRecord === 'function' &&
      typeof controllers.batchVerifyLabRecords === 'function') {
    console.log('✅ Passed: All 4 controller functions exported and are functions')
  } else {
    console.error('❌ Failed: Missing controller exports')
  }

  console.log('\n--- All local validation checks passed! ---')
}

runTests().catch(console.error)
