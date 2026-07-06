DO $$
DECLARE
  org_uuid UUID := '00000000-0000-0000-0000-000000000001';
  dept_id UUID;
  emp_record RECORD;
  work_date DATE;
  leave_date DATE;
  ci TIMESTAMPTZ;
  co TIMESTAMPTZ;
  total_h NUMERIC;
  rnd FLOAT;
  status_val TEXT;
  lt_id UUID;
  req_status TEXT;
  emp_count INT;
BEGIN
  -- 1. Ensure Base Organization Exists
  INSERT INTO organizations (id, name, slug)
  VALUES (org_uuid, 'Nexus Tech', 'nexus-tech')
  ON CONFLICT (id) DO NOTHING;

  -- 2. Ensure Departments Exist
  INSERT INTO departments (id, org_id, name, code) VALUES
    ('a1000000-0000-0000-0000-000000000001', org_uuid, 'Engineering', 'ENG'),
    ('a1000000-0000-0000-0000-000000000002', org_uuid, 'Human Resources', 'HR'),
    ('a1000000-0000-0000-0000-000000000003', org_uuid, 'Sales', 'SLS'),
    ('a1000000-0000-0000-0000-000000000004', org_uuid, 'Marketing', 'MKT')
  ON CONFLICT (id) DO NOTHING;

  -- 3. Ensure Leave Types Exist
  INSERT INTO leave_types (id, org_id, name, code, days_allowed) VALUES
    ('b1000000-0000-0000-0000-000000000001', org_uuid, 'Annual Leave', 'AL', 15),
    ('b1000000-0000-0000-0000-000000000002', org_uuid, 'Sick Leave', 'SL', 10),
    ('b1000000-0000-0000-0000-000000000003', org_uuid, 'Maternity Leave', 'ML', 90),
    ('b1000000-0000-0000-0000-000000000004', org_uuid, 'Paternity Leave', 'PL', 14),
    ('b1000000-0000-0000-0000-000000000005', org_uuid, 'Unpaid Leave', 'UL', 30),
    ('b1000000-0000-0000-0000-000000000006', org_uuid, 'Bereavement', 'BL', 5)
  ON CONFLICT (id) DO NOTHING;

  -- 4. Check if we have employees, if not create some dummy ones
  SELECT COUNT(*) INTO emp_count FROM employees WHERE status = 'active';
  
  IF emp_count < 11 THEN
    FOR i IN 1..(11 - emp_count) LOOP
      IF i % 4 = 0 THEN dept_id := 'a1000000-0000-0000-0000-000000000001';
      ELSIF i % 4 = 1 THEN dept_id := 'a1000000-0000-0000-0000-000000000002';
      ELSIF i % 4 = 2 THEN dept_id := 'a1000000-0000-0000-0000-000000000003';
      ELSE dept_id := 'a1000000-0000-0000-0000-000000000004';
      END IF;

      INSERT INTO employees (id, org_id, department_id, first_name, last_name, email, role, status, hire_date)
      VALUES (
        gen_random_uuid(), org_uuid, dept_id, 
        'DemoUser', i::text, 'demo' || i || '@workforcepro.com', 
        'employee', 'active', CURRENT_DATE - (random() * 365 || ' days')::interval
      );
    END LOOP;
  END IF;

  -- 5. Seed Attendance for the past 180 days for all active employees
  FOR emp_record IN SELECT id FROM employees WHERE status IN ('active', 'on_leave')
  LOOP
    FOR work_date IN 
      SELECT d::date
      FROM generate_series(
        (CURRENT_DATE - INTERVAL '180 days')::date,
        CURRENT_DATE,
        '1 day'::interval
      ) AS d
      WHERE EXTRACT(DOW FROM d) NOT IN (0, 6)
    LOOP
      rnd := random();
      
      IF rnd < 0.05 THEN
        status_val := 'absent';
        INSERT INTO attendance_records (employee_id, date, status, created_at, updated_at)
        VALUES (emp_record.id, work_date, status_val, now(), now())
        ON CONFLICT (employee_id, date) DO UPDATE SET status = 'absent', clock_in = NULL, clock_out = NULL, total_hours = NULL, overtime_hours = 0;
        
      ELSIF rnd < 0.10 THEN
        status_val := 'half_day';
        ci := (work_date::timestamp + INTERVAL '9 hours') AT TIME ZONE 'UTC' + ((random() * 30) * INTERVAL '1 minute');
        co := (work_date::timestamp + INTERVAL '13 hours') AT TIME ZONE 'UTC' + ((random() * 30) * INTERVAL '1 minute');
        total_h := 4.0;
        
        INSERT INTO attendance_records (employee_id, date, clock_in, clock_out, status, total_hours, overtime_hours, created_at, updated_at)
        VALUES (emp_record.id, work_date, ci, co, status_val, total_h, 0, now(), now())
        ON CONFLICT (employee_id, date) DO UPDATE SET status = EXCLUDED.status, clock_in = EXCLUDED.clock_in, clock_out = EXCLUDED.clock_out, total_hours = EXCLUDED.total_hours, overtime_hours = EXCLUDED.overtime_hours;

      ELSIF rnd < 0.25 THEN
        status_val := 'late';
        ci := (work_date::timestamp + INTERVAL '9 hours 30 minutes') AT TIME ZONE 'UTC' + ((random() * 60) * INTERVAL '1 minute');
        co := (work_date::timestamp + INTERVAL '17 hours') AT TIME ZONE 'UTC' + ((random() * 60) * INTERVAL '1 minute');
        total_h := EXTRACT(EPOCH FROM (co - ci)) / 3600.0 - 1.0;
        
        INSERT INTO attendance_records (employee_id, date, clock_in, clock_out, status, total_hours, overtime_hours, created_at, updated_at)
        VALUES (emp_record.id, work_date, ci, co, status_val, ROUND(total_h::numeric, 2), ROUND(GREATEST(0, total_h - 8)::numeric, 2), now(), now())
        ON CONFLICT (employee_id, date) DO UPDATE SET status = EXCLUDED.status, clock_in = EXCLUDED.clock_in, clock_out = EXCLUDED.clock_out, total_hours = EXCLUDED.total_hours, overtime_hours = EXCLUDED.overtime_hours;

      ELSE
        status_val := 'present';
        ci := (work_date::timestamp + INTERVAL '8 hours') AT TIME ZONE 'UTC' + ((random() * 45) * INTERVAL '1 minute');
        co := (work_date::timestamp + INTERVAL '17 hours') AT TIME ZONE 'UTC' + ((random() * 60) * INTERVAL '1 minute');
        total_h := EXTRACT(EPOCH FROM (co - ci)) / 3600.0 - 1.0;
        
        INSERT INTO attendance_records (employee_id, date, clock_in, clock_out, status, total_hours, overtime_hours, created_at, updated_at)
        VALUES (emp_record.id, work_date, ci, co, status_val, ROUND(total_h::numeric, 2), ROUND(GREATEST(0, total_h - 8)::numeric, 2), now(), now())
        ON CONFLICT (employee_id, date) DO UPDATE SET status = EXCLUDED.status, clock_in = EXCLUDED.clock_in, clock_out = EXCLUDED.clock_out, total_hours = EXCLUDED.total_hours, overtime_hours = EXCLUDED.overtime_hours;
      END IF;
    END LOOP;

    -- 6. Seed 3-5 Leave Requests per employee spread over the last 120 days
    FOR i IN 1..(3 + floor(random() * 3))
    LOOP
      leave_date := (CURRENT_DATE - (random() * 120 || ' days')::interval)::date;
      rnd := random();
      
      IF rnd < 0.7 THEN req_status := 'approved';
      ELSIF rnd < 0.9 THEN req_status := 'rejected';
      ELSE req_status := 'pending';
      END IF;
      
      lt_id := ('b1000000-0000-0000-0000-00000000000' || (1 + floor(random() * 6)))::uuid;
      
      INSERT INTO leave_requests (
        employee_id, leave_type_id, start_date, end_date, total_days, reason, status, created_at, updated_at
      )
      VALUES (
        emp_record.id, lt_id, leave_date, (leave_date + (floor(random() * 3) || ' days')::interval)::date,
        1 + floor(random() * 3), 'Generated leave request for analytics', req_status,
        leave_date - INTERVAL '7 days', leave_date - INTERVAL '6 days'
      );
    END LOOP;
  END LOOP;
END $$;
