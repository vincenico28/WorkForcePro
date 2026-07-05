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
