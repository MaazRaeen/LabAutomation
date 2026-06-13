import { supabaseAdmin } from '../src/config/supabase.js'

async function check() {
  try {
    const { data, error } = await supabaseAdmin
      .from('lab_records')
      .select('*')
      .limit(1)

    if (error) {
      console.error('Error fetching lab records:', error)
    } else {
      console.log('Columns in lab_records table:', data.length > 0 ? Object.keys(data[0]) : 'No records exist yet')
    }
  } catch (err) {
    console.error('Catch error:', err)
  }
}

check()
