import { supabase, ORG_ID } from '../src/lib/supabase'

async function run() {
  const { data: employees } = await supabase.from('employees').select('id')
  if (!employees) return

  const sampleNotifs = [
    {
      title: 'Welcome to WorkforcePro',
      message: 'Explore the dashboard and start managing your tasks efficiently.',
      type: 'info',
      category: 'system',
      is_read: false
    },
    {
      title: 'Leave Request Approved',
      message: 'Your recent leave request has been approved by HR.',
      type: 'success',
      category: 'leave',
      is_read: false
    },
    {
      title: 'Missing Attendance',
      message: 'You have a missing clock-out record for yesterday. Please update.',
      type: 'warning',
      category: 'attendance',
      is_read: true
    }
  ]

  for (const emp of employees) {
    for (const notif of sampleNotifs) {
      await supabase.from('notifications').insert({
        ...notif,
        employee_id: emp.id
      })
    }
  }
  console.log('Done inserting notifications')
}

run()
