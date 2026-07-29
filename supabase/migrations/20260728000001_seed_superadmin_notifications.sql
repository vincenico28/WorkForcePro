-- Seed notifications for Super Admin so they appear in the UI
INSERT INTO notifications (id, employee_id, title, message, type, category, is_read, created_at)
SELECT 
  gen_random_uuid(), 
  id, 
  'Welcome to WorkforcePro', 
  'Your super admin account has been set up successfully.', 
  'success', 
  'system', 
  false, 
  now()
FROM employees 
WHERE role = 'super_admin'
UNION ALL
SELECT 
  gen_random_uuid(), 
  id, 
  'System Update', 
  'The system has been updated to version 2.0 with new gamification features.', 
  'info', 
  'system', 
  false, 
  now() - interval '1 day'
FROM employees 
WHERE role = 'super_admin'
UNION ALL
SELECT 
  gen_random_uuid(), 
  id, 
  'Pending Approvals', 
  'You have 3 new timesheet entries awaiting your approval.', 
  'warning', 
  'timesheet', 
  false, 
  now() - interval '2 days'
FROM employees 
WHERE role = 'super_admin'
ON CONFLICT DO NOTHING;
