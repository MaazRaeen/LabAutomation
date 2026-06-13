import * as progressControllers from '../src/controllers/progress.controller.js'
import * as notificationControllers from '../src/controllers/notification.controller.js'
import * as adminControllers from '../src/controllers/admin.controller.js'

async function runTests() {
  console.log('--- Starting Progress, Notifications, and Admin Analytics Verification Tests ---')

  // 1. Progress Controller checks
  console.log('\n--- Progress Controller Checks ---')
  const expectedProgressFuncs = ['getStudentProgress', 'getBatchProgress', 'getProgress']
  const missingProgress = expectedProgressFuncs.filter(
    fn => typeof progressControllers[fn] !== 'function'
  )
  if (missingProgress.length === 0) {
    console.log('✅ Passed: All progress controller functions exported correctly')
  } else {
    console.error('❌ Failed: Missing progress controller functions:', missingProgress)
  }

  // 2. Notification Controller checks
  console.log('\n--- Notification Controller Checks ---')
  const expectedNotificationFuncs = ['getNotifications', 'markAsRead']
  const missingNotification = expectedNotificationFuncs.filter(
    fn => typeof notificationControllers[fn] !== 'function'
  )
  if (missingNotification.length === 0) {
    console.log('✅ Passed: All notification controller functions exported correctly')
  } else {
    console.error('❌ Failed: Missing notification controller functions:', missingNotification)
  }

  // 3. Admin Controller checks
  console.log('\n--- Admin Controller Checks ---')
  const expectedAdminFuncs = ['getUsers', 'deleteUser', 'getSystemStats', 'getAuditLogs']
  const missingAdmin = expectedAdminFuncs.filter(
    fn => typeof adminControllers[fn] !== 'function'
  )
  if (missingAdmin.length === 0) {
    console.log('✅ Passed: All admin controller functions exported correctly')
  } else {
    console.error('❌ Failed: Missing admin controller functions:', missingAdmin)
  }

  console.log('\n--- All verification checks completed! ---')
}

runTests().catch(console.error)
