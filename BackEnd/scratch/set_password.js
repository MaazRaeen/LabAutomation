import { supabaseAdmin } from '../src/config/supabase.js'

async function run() {
  const { data, error } = await supabaseAdmin.auth.admin.listUsers()
  if (error) {
    console.error('Error listing users:', error)
    return
  }

  for (const u of data.users) {
    if (u.email === 'parul@gmail.com' || u.email === 'maazraeen21@gmail.com') {
      const { data: updateData, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
        u.id,
        { password: 'parul123@' }
      )
      if (updateError) {
        console.error(`Error updating password for ${u.email}:`, updateError)
      } else {
        console.log(`Successfully reset password for ${u.email} to "parul123@"`)
      }
    }
  }
}
run()
