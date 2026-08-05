import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: resolve(__dirname, '../../../../../../../Workforce-ManagementPro-main/.env.local') })

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseServiceKey, { auth: { autoRefreshToken: false, persistSession: false } })

async function runTests() {
  console.log('Testing Leave Sync Trigger...')
  // 1. Get an employee
  const { data: employees } = await supabase.from('employees').select('id').limit(1)
  const empId = employees[0].id
  
  // 2. Get a leave type
  const { data: leaveTypes } = await supabase.from('leave_types').select('id').limit(1)
  const leaveTypeId = leaveTypes[0].id
  
  // 3. Create a pending leave request
  const startDate = '2027-01-01'
  const endDate = '2027-01-02'
  const { data: leave, error: err1 } = await supabase.from('leave_requests').insert({
    employee_id: empId,
    leave_type_id: leaveTypeId,
    start_date: startDate,
    end_date: endDate,
    total_days: 2,
    status: 'pending'
  }).select().single()
  
  if (err1) { console.error('Error creating leave:', err1); return; }
  console.log('Leave created:', leave.id)
  
  // 4. Update to approved
  const { error: err2 } = await supabase.from('leave_requests').update({ status: 'approved' }).eq('id', leave.id)
  if (err2) { console.error('Error approving leave:', err2); return; }
  console.log('Leave approved.')
  
  // 5. Check schedules
  const { data: schedules, error: err3 } = await supabase.from('schedules').select('*').eq('employee_id', empId).in('date', [startDate, endDate])
  console.log('Schedules found:', schedules?.length)
  schedules?.forEach(s => console.log(`  Date: ${s.date}, Status: ${s.status}, Notes: ${s.notes}`))
  
  // 6. Reject the leave (revert)
  await supabase.from('leave_requests').update({ status: 'rejected' }).eq('id', leave.id)
  console.log('Leave rejected.')
  
  // 7. Check schedules again
  const { data: schedules2 } = await supabase.from('schedules').select('*').eq('employee_id', empId).in('date', [startDate, endDate])
  console.log('Schedules found (after revert):', schedules2?.length)
  schedules2?.forEach(s => console.log(`  Date: ${s.date}, Status: ${s.status}, Notes: ${s.notes}`))
  
  // Cleanup
  await supabase.from('schedules').delete().eq('employee_id', empId).in('date', [startDate, endDate])
  await supabase.from('leave_requests').delete().eq('id', leave.id)
  console.log('Cleanup complete.')
}

runTests().catch(console.error)
