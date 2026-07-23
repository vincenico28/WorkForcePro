import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const env = fs.readFileSync('.env', 'utf-8')
const supabaseUrl = env.match(/VITE_SUPABASE_URL=(.+)/)[1].trim()
const supabaseKey = env.match(/VITE_SUPABASE_ANON_KEY=(.+)/)[1].trim()

const supabase = createClient(supabaseUrl, supabaseKey)

async function run() {
  const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
    email: 'admin1@workforcepro.com', // use admin this time
    password: 'admin123'
  })
  if (authErr) console.error("Login failed:", authErr.message)

  const { data, error } = await supabase.storage.createBucket('leave_attachments', {
    public: true,
    fileSizeLimit: 10485760, // 10MB
  })
  if (error) {
    if (error.message.includes('already exists') || error.message.includes('Duplicate')) {
      console.log('Bucket already exists')
    } else {
      console.error('Failed to create bucket:', error)
    }
  } else {
    console.log('Created leave_attachments bucket successfully')
  }
}
run()
