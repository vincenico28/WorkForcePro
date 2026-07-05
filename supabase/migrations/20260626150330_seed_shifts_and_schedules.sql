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
