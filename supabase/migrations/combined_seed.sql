INSERT INTO leave_types (id, org_id, name, code, days_allowed) VALUES
('b1000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Annual Leave', 'AL', 15),
('b1000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'Sick Leave', 'SL', 10),
('b1000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'Maternity Leave', 'ML', 90),
('b1000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', 'Paternity Leave', 'PL', 14),
('b1000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001', 'Unpaid Leave', 'UL', 30),
('b1000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000001', 'Bereavement', 'BL', 5)
ON CONFLICT DO NOTHING;

INSERT INTO departments (id, org_id, name, code) VALUES
('d1000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Engineering', 'ENG'),
('d1000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'Human Resources', 'HR'),
('d1000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'Sales', 'SAL'),
('d1000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', 'Marketing', 'MKT')
ON CONFLICT DO NOTHING;

INSERT INTO employees (id, org_id, first_name, last_name, email, role, status) VALUES
('e1000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Demo', 'Admin', 'admin@example.com', 'admin', 'active'),
('e1000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'Demo', 'SuperAdmin', 'superadmin@example.com', 'super_admin', 'active'),
('e1000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'John', 'Doe', 'john@example.com', 'employee', 'active'),
('e1000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', 'Jane', 'Smith', 'jane@example.com', 'employee', 'active'),
('e1000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001', 'Bob', 'Johnson', 'bob@example.com', 'employee', 'active'),
('e1000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000001', 'Alice', 'Williams', 'alice@example.com', 'employee', 'active'),
('e1000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000001', 'Charlie', 'Brown', 'charlie@example.com', 'employee', 'active'),
('e1000000-0000-0000-0000-000000000008', '00000000-0000-0000-0000-000000000001', 'Diana', 'Miller', 'diana@example.com', 'employee', 'active'),
('e1000000-0000-0000-0000-000000000009', '00000000-0000-0000-0000-000000000001', 'Edward', 'Davis', 'edward@example.com', 'employee', 'active'),
('e1000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000001', 'Fiona', 'Garcia', 'fiona@example.com', 'employee', 'active'),
('e1000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000001', 'George', 'Martinez', 'george@example.com', 'employee', 'active'),
('e1000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-000000000001', 'Hannah', 'Rodriguez', 'hannah@example.com', 'employee', 'active')
ON CONFLICT DO NOTHING;

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
/*
# Seed Historical Attendance Records

Populates realistic attendance data for all employees over the past 14 working days.
Distribution: ~80% present, ~14% late, ~6% absent.
*/

DO $$
DECLARE
  emp_record RECORD;
  work_date DATE;
  ci TIMESTAMPTZ;
  co TIMESTAMPTZ;
  rec_status TEXT;
  total_h NUMERIC;
  rnd FLOAT;
  org_uuid UUID;
BEGIN
  SELECT id INTO org_uuid FROM organizations WHERE slug = 'nexus-tech' LIMIT 1;
  
  IF org_uuid IS NULL THEN
    RAISE NOTICE 'Organization not found, skipping attendance seed';
    RETURN;
  END IF;

  FOR emp_record IN 
    SELECT id FROM employees WHERE org_id = org_uuid AND status IN ('active', 'on_leave')
  LOOP
    FOR work_date IN 
      SELECT d::date
      FROM generate_series(
        (CURRENT_DATE - INTERVAL '21 days')::date,
        (CURRENT_DATE - INTERVAL '1 day')::date,
        '1 day'::interval
      ) AS d
      WHERE EXTRACT(DOW FROM d) NOT IN (0, 6)
    LOOP
      rnd := random();

      IF rnd < 0.06 THEN
        -- Absent
        INSERT INTO attendance_records (employee_id, date, status, created_at, updated_at)
        VALUES (emp_record.id, work_date, 'absent', NOW(), NOW())
        ON CONFLICT (employee_id, date) DO NOTHING;

      ELSIF rnd < 0.20 THEN
        -- Late: 9:15–10:30 AM clock-in
        ci := (work_date::timestamp + INTERVAL '9 hours 15 minutes') AT TIME ZONE 'UTC'
              + ((random() * 75) * INTERVAL '1 minute');
        co := (work_date::timestamp + INTERVAL '17 hours') AT TIME ZONE 'UTC'
              + ((random() * 120) * INTERVAL '1 minute');
        total_h := EXTRACT(EPOCH FROM (co - ci)) / 3600.0 - 1.0;

        INSERT INTO attendance_records (
          employee_id, date, clock_in, clock_out, status,
          total_hours, overtime_hours, created_at, updated_at
        )
        VALUES (
          emp_record.id, work_date, ci, co, 'late',
          ROUND(total_h::numeric, 2), GREATEST(0, ROUND((total_h - 8.0)::numeric, 2)),
          NOW(), NOW()
        )
        ON CONFLICT (employee_id, date) DO NOTHING;

      ELSE
        -- Present: 7:45–9:00 AM clock-in
        ci := (work_date::timestamp + INTERVAL '7 hours 45 minutes') AT TIME ZONE 'UTC'
              + ((random() * 75) * INTERVAL '1 minute');
        co := (work_date::timestamp + INTERVAL '17 hours') AT TIME ZONE 'UTC'
              + ((random() * 120) * INTERVAL '1 minute');
        total_h := EXTRACT(EPOCH FROM (co - ci)) / 3600.0 - 1.0;

        INSERT INTO attendance_records (
          employee_id, date, clock_in, clock_out, status,
          total_hours, overtime_hours, created_at, updated_at
        )
        VALUES (
          emp_record.id, work_date, ci, co, 'present',
          ROUND(total_h::numeric, 2), GREATEST(0, ROUND((total_h - 8.0)::numeric, 2)),
          NOW(), NOW()
        )
        ON CONFLICT (employee_id, date) DO NOTHING;
      END IF;
    END LOOP;
  END LOOP;

  RAISE NOTICE 'Attendance seed complete';
END $$;
/*
# Seed Shifts and Schedules

Creates shift templates and generates schedules for all employees.
*/

-- Create shifts
INSERT INTO shifts (id, org_id, name, start_time, end_time, break_duration, color, is_overnight, is_active)
SELECT s.id::uuid, o.id, s.name, s.start_time::time, s.end_time::time, s.break_duration, s.color, s.is_overnight, true
FROM organizations o
CROSS JOIN (
  VALUES
    ('a1000000-0000-0000-0000-000000000001', 'Morning Shift', '08:00', '17:00', 60, '#6366F1', false),
    ('a1000000-0000-0000-0000-000000000002', 'Afternoon Shift', '13:00', '22:00', 60, '#8B5CF6', false),
    ('a1000000-0000-0000-0000-000000000003', 'Night Shift', '22:00', '07:00', 60, '#3B82F6', true),
    ('a1000000-0000-0000-0000-000000000004', 'Flexible Hours', '09:00', '18:00', 60, '#10B981', false)
) AS s(id, name, start_time, end_time, break_duration, color, is_overnight)
WHERE o.slug = 'nexus-tech'
ON CONFLICT (id) DO NOTHING;

-- Generate schedules for employees
INSERT INTO schedules (id, employee_id, shift_id, date, status, created_at, updated_at)
SELECT
  gen_random_uuid(),
  e.id,
  CASE (row_number() OVER (PARTITION BY e.id ORDER BY e.id) + EXTRACT(DOW FROM d)) % 4
    WHEN 0 THEN 'a1000000-0000-0000-0000-000000000001'::uuid
    WHEN 1 THEN 'a1000000-0000-0000-0000-000000000002'::uuid
    WHEN 2 THEN 'a1000000-0000-0000-0000-000000000003'::uuid
    ELSE 'a1000000-0000-0000-0000-000000000004'::uuid
  END,
  d,
  CASE WHEN d < CURRENT_DATE THEN 'confirmed' ELSE 'scheduled' END,
  NOW(),
  NOW()
FROM employees e
CROSS JOIN generate_series((CURRENT_DATE - INTERVAL '7 days')::date, (CURRENT_DATE + INTERVAL '14 days')::date, '1 day'::interval) AS d
WHERE e.status IN ('active', 'on_leave')
  AND EXTRACT(DOW FROM d) NOT IN (0, 6)
  AND random() < 0.85
ON CONFLICT DO NOTHING;
/*
# Seed Announcements

Adds realistic company announcements with various types.
*/

INSERT INTO announcements (id, org_id, author_id, title, content, type, target_roles, is_pinned, published_at, created_at)
SELECT
  a.id::uuid,
  o.id,
  a.author_id::uuid,
  a.title,
  a.content,
  a.type,
  ARRAY[]::text[],
  a.is_pinned,
  NOW() - (a.days_ago || ' days')::interval,
  NOW() - (a.days_ago || ' days')::interval
FROM organizations o
CROSS JOIN (
  VALUES
    ('b2000000-0000-0000-0000-000000000001', 'e1000000-0000-0000-0000-000000000001', 'Q3 Company All-Hands', 'Join us on July 15th at 2 PM PST for our quarterly all-hands meeting. We''ll cover Q2 performance, product roadmap updates, and Q3 strategic priorities. All employees are required to attend.', 'event', true, 2),
    ('b2000000-0000-0000-0000-000000000002', 'e1000000-0000-0000-0000-000000000001', 'Updated Remote Work Policy', 'Effective July 1st, our hybrid work policy has been updated. Employees are now required to be in office 3 days per week (Tue-Thu). Please review the full policy document on the intranet. Questions? Reach out to HR.', 'policy', false, 5),
    ('b2000000-0000-0000-0000-000000000004', 'e1000000-0000-0000-0000-000000000002', 'IT System Maintenance', 'Scheduled maintenance will occur this Saturday from 2 AM to 6 AM PST. Email and internal tools may be temporarily unavailable. Plan accordingly and save critical work before Friday evening.', 'urgent', false, 1),
    ('b2000000-0000-0000-0000-000000000005', 'e1000000-0000-0000-0000-000000000002', 'New Employee Benefits Portal', 'We''ve launched a new self-service benefits portal! You can now view and update your health insurance, 401(k) contributions, and other benefits at benefits.nexustech.com. Login with your company credentials.', 'general', false, 7),
    ('b2000000-0000-0000-0000-000000000003', 'e1000000-0000-0000-0000-000000000001', 'Summer Company Retreat', 'Mark your calendars! Our annual summer retreat is scheduled for August 12-14 at Lake Tahoe. Activities include team building, workshops, and outdoor adventures. RSVP by July 20th.', 'event', false, 3),
    ('b2000000-0000-0000-0000-000000000006', 'e1000000-0000-0000-0000-000000000004', 'Engineering Team Expansion', 'Exciting news! We''re hiring 5 new engineers this quarter to support our growing product roadmap. If you have referrals, please submit them through the employee referral portal.', 'general', false, 4)
) AS a(id, author_id, title, content, type, is_pinned, days_ago)
WHERE o.slug = 'nexus-tech'
ON CONFLICT (id) DO NOTHING;
/*
# Seed Timesheet Entries

Generates sample timesheet entries for the past 2 weeks based on existing attendance data.
*/

INSERT INTO timesheet_entries (id, employee_id, date, start_time, end_time, break_minutes, overtime_hours, is_approved, source, attendance_id, created_at, updated_at)
SELECT
  gen_random_uuid(),
  ar.employee_id,
  ar.date,
  ar.clock_in::time,
  COALESCE(ar.clock_out::time, '17:00'::time),
  60,
  COALESCE(ar.overtime_hours, 0),
  CASE WHEN ar.clock_out IS NOT NULL THEN random() < 0.7 ELSE false END,
  'clock_in',
  ar.id,
  NOW(),
  NOW()
FROM attendance_records ar
WHERE ar.status IN ('present', 'late')
  AND ar.clock_in IS NOT NULL
  AND ar.date >= CURRENT_DATE - INTERVAL '14 days'
ON CONFLICT DO NOTHING;
