import { supabaseAdmin } from '../src/config/supabase.js'

async function run() {
  const { data, error } = await supabaseAdmin.auth.admin.listUsers()
  if (error) {
    console.error('Error listing users:', error)
  } else {
    data.users.forEach(u => {
      console.log(`Email: ${u.email}, Role: ${u.user_metadata?.role || 'none'}`)
    })
  }
}
run()
