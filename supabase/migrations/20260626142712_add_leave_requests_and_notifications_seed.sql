/*
# Seed Leave Requests and Notifications

Adds demo data for leave requests and notifications so the app shows
realistic data immediately after login.

1. New Data
- 8 leave_requests across seeded employees (mix of pending/approved/rejected)
- 12 notifications for seeded employees (various types and categories)

2. Notes
- Uses existing employee IDs and leave type IDs from the core schema seed
- Notifications are for specific seeded employees (not the demo auth user)
- Leave requests are visible to all authenticated users per existing RLS
*/

-- Leave Requests seed data
INSERT INTO leave_requests (id, employee_id, leave_type_id, start_date, end_date, total_days, reason, status, created_at, updated_at)
VALUES
  (
    'c1000000-0000-0000-0000-000000000001',
    'e1000000-0000-0000-0000-000000000003',
    'b1000000-0000-0000-0000-000000000001',
    '2026-07-07', '2026-07-11', 5,
    'Annual family vacation',
    'pending',
    now() - interval '2 days', now() - interval '2 days'
  ),
  (
    'c1000000-0000-0000-0000-000000000002',
    'e1000000-0000-0000-0000-000000000005',
    'b1000000-0000-0000-0000-000000000002',
    '2026-06-27', '2026-06-28', 2,
    'Doctor appointment and recovery',
    'pending',
    now() - interval '1 day', now() - interval '1 day'
  ),
  (
    'c1000000-0000-0000-0000-000000000003',
    'e1000000-0000-0000-0000-000000000009',
    'b1000000-0000-0000-0000-000000000001',
    '2026-07-14', '2026-07-18', 5,
    'International conference attendance',
    'pending',
    now() - interval '3 hours', now() - interval '3 hours'
  ),
  (
    'c1000000-0000-0000-0000-000000000004',
    'e1000000-0000-0000-0000-000000000007',
    'b1000000-0000-0000-0000-000000000004',
    '2026-08-01', '2026-10-30', 65,
    'Maternity leave — expecting August 2026',
    'approved',
    now() - interval '10 days', now() - interval '8 days'
  ),
  (
    'c1000000-0000-0000-0000-000000000005',
    'e1000000-0000-0000-0000-000000000004',
    'b1000000-0000-0000-0000-000000000002',
    '2026-06-23', '2026-06-24', 2,
    'Not feeling well',
    'approved',
    now() - interval '5 days', now() - interval '4 days'
  ),
  (
    'c1000000-0000-0000-0000-000000000006',
    'e1000000-0000-0000-0000-000000000010',
    'b1000000-0000-0000-0000-000000000001',
    '2026-06-09', '2026-06-13', 5,
    'Wedding anniversary trip',
    'approved',
    now() - interval '20 days', now() - interval '19 days'
  ),
  (
    'c1000000-0000-0000-0000-000000000007',
    'e1000000-0000-0000-0000-000000000012',
    'b1000000-0000-0000-0000-000000000002',
    '2026-06-03', '2026-06-04', 2,
    'Flu symptoms',
    'rejected',
    now() - interval '25 days', now() - interval '24 days'
  ),
  (
    'c1000000-0000-0000-0000-000000000008',
    'e1000000-0000-0000-0000-000000000002',
    'b1000000-0000-0000-0000-000000000006',
    '2026-07-04', '2026-07-04', 1,
    'Personal matters',
    'pending',
    now() - interval '6 hours', now() - interval '6 hours'
  )
ON CONFLICT (id) DO NOTHING;

-- Notifications seed data
INSERT INTO notifications (id, employee_id, title, message, type, category, is_read, created_at)
VALUES
  (
    'f1000000-0000-0000-0000-000000000001',
    'e1000000-0000-0000-0000-000000000001',
    'Leave request requires approval',
    'Elena Rodriguez has submitted a 5-day vacation leave request starting Jul 7.',
    'info', 'leave', false,
    now() - interval '2 days'
  ),
  (
    'f1000000-0000-0000-0000-000000000002',
    'e1000000-0000-0000-0000-000000000001',
    'New announcement posted',
    'Benefits Enrollment Deadline is this Friday — ensure all employees are notified.',
    'warning', 'announcement', false,
    now() - interval '1 day'
  ),
  (
    'f1000000-0000-0000-0000-000000000003',
    'e1000000-0000-0000-0000-000000000001',
    'Payroll processed successfully',
    'June 2026 payroll has been processed for 15 employees. Total: $124,500.',
    'success', 'system', true,
    now() - interval '3 days'
  ),
  (
    'f1000000-0000-0000-0000-000000000004',
    'e1000000-0000-0000-0000-000000000003',
    'Leave request approved',
    'Your sick leave for Jun 23–24 has been approved by Sarah Chen.',
    'success', 'leave', true,
    now() - interval '4 days'
  ),
  (
    'f1000000-0000-0000-0000-000000000005',
    'e1000000-0000-0000-0000-000000000005',
    'Attendance reminder',
    'You haven''t clocked in today. Please remember to clock in before 9:30 AM.',
    'warning', 'attendance', false,
    now() - interval '1 hour'
  ),
  (
    'f1000000-0000-0000-0000-000000000006',
    'e1000000-0000-0000-0000-000000000002',
    'Performance review due',
    'Q2 2026 performance reviews are due by July 15. Please complete reviews for your team.',
    'info', 'system', false,
    now() - interval '2 hours'
  ),
  (
    'f1000000-0000-0000-0000-000000000007',
    'e1000000-0000-0000-0000-000000000004',
    'Shift schedule updated',
    'Your schedule for the week of Jul 7–11 has been updated. Please review.',
    'info', 'schedule', false,
    now() - interval '5 hours'
  ),
  (
    'f1000000-0000-0000-0000-000000000008',
    'e1000000-0000-0000-0000-000000000007',
    'Leave request submitted',
    'Your maternity leave request (Aug 1 – Oct 30) is pending approval from HR.',
    'info', 'leave', true,
    now() - interval '10 days'
  ),
  (
    'f1000000-0000-0000-0000-000000000009',
    'e1000000-0000-0000-0000-000000000009',
    'Welcome to WorkForce Pro!',
    'Your account has been set up. Complete your profile and explore the features.',
    'success', 'system', true,
    now() - interval '30 days'
  ),
  (
    'f1000000-0000-0000-0000-000000000010',
    'e1000000-0000-0000-0000-000000000010',
    'Overtime hours logged',
    'You have 8 overtime hours logged this week. Manager review required.',
    'warning', 'attendance', false,
    now() - interval '1 day'
  ),
  (
    'f1000000-0000-0000-0000-000000000011',
    'e1000000-0000-0000-0000-000000000012',
    'Leave request rejected',
    'Your sick leave request for Jun 3–4 has been rejected. Please contact HR.',
    'error', 'leave', false,
    now() - interval '24 days'
  ),
  (
    'f1000000-0000-0000-0000-000000000012',
    'e1000000-0000-0000-0000-000000000001',
    'Monthly report ready',
    'June 2026 workforce analytics report is ready for review.',
    'success', 'system', false,
    now() - interval '4 hours'
  )
ON CONFLICT (id) DO NOTHING;
