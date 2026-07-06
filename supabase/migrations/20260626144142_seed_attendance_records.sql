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
        (CURRENT_DATE - INTERVAL '180 days')::date,
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
