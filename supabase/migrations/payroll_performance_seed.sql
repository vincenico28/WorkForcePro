DO $$
DECLARE
  emp_record RECORD;
  work_date DATE;
  total_h NUMERIC;
BEGIN
  -- 1. Update departments and salary_info for all seeded employees
  UPDATE employees
  SET 
    department_id = CASE (CAST(substr(id::text, 36, 1) AS integer) % 4)
      WHEN 0 THEN 'd1000000-0000-0000-0000-000000000001'::uuid
      WHEN 1 THEN 'd1000000-0000-0000-0000-000000000002'::uuid
      WHEN 2 THEN 'd1000000-0000-0000-0000-000000000003'::uuid
      ELSE 'd1000000-0000-0000-0000-000000000004'::uuid
    END,
    salary_info = jsonb_build_object(
      'base', 60000 + (CAST(substr(id::text, 36, 1) AS integer) * 5000),
      'currency', 'USD',
      'pay_period', 'bi-weekly'
    ),
    position = CASE (CAST(substr(id::text, 36, 1) AS integer) % 3)
      WHEN 0 THEN 'Senior Specialist'
      WHEN 1 THEN 'Associate'
      ELSE 'Lead Analyst'
    END
  WHERE email LIKE '%@example.com';

  -- 2. Seed Performance Reviews for all employees except Super Admin
  FOR emp_record IN SELECT id FROM employees WHERE id != 'e1000000-0000-0000-0000-000000000002'
  LOOP
    INSERT INTO performance_reviews (
      employee_id, reviewer_id, review_period_start, review_period_end, 
      overall_rating, goals_met, communication_rating, teamwork_rating, technical_rating, 
      strengths, improvements, goals, status, submitted_at, created_at, updated_at
    )
    VALUES (
      emp_record.id,
      'e1000000-0000-0000-0000-000000000002'::uuid,
      (CURRENT_DATE - INTERVAL '1 year')::date, CURRENT_DATE::date,
      ROUND((3.5 + (random() * 1.5))::numeric, 1), 
      ROUND((3.5 + (random() * 1.5))::numeric, 1), 
      ROUND((3.5 + (random() * 1.5))::numeric, 1), 
      ROUND((3.5 + (random() * 1.5))::numeric, 1), 
      ROUND((3.5 + (random() * 1.5))::numeric, 1),
      'Consistently meets deadlines, great team player, strong technical skills.',
      'Could improve on communicating blockers earlier.',
      'Lead a cross-functional project, complete advanced certification.',
      'completed',
      now() - interval '3 days',
      now() - interval '3 days',
      now() - interval '3 days'
    );
  END LOOP;

  -- 3. Seed Timesheet Entries (for Payroll) for the current month
  FOR emp_record IN SELECT id FROM employees WHERE role = 'employee'
  LOOP
    FOR work_date IN 
      SELECT d::date
      FROM generate_series(
        (date_trunc('month', CURRENT_DATE))::date,
        (CURRENT_DATE - INTERVAL '1 day')::date,
        '1 day'::interval
      ) AS d
      WHERE EXTRACT(DOW FROM d) NOT IN (0, 6)
    LOOP
      total_h := 8.0 + (random() * 2);
      
      INSERT INTO timesheet_entries (
        employee_id, date, start_time, end_time, break_minutes, 
        overtime_hours, is_approved, approved_by, source
      )
      VALUES (
        emp_record.id, 
        work_date, 
        '09:00:00', 
        ('09:00:00'::time + (total_h || ' hours')::interval + '60 minutes'::interval)::time,
        60, 
        GREATEST(0, ROUND((total_h - 8.0)::numeric, 2)),
        true,
        'e1000000-0000-0000-0000-000000000002'::uuid,
        'manual'
      )
      ON CONFLICT (employee_id, date, start_time) DO NOTHING;
    END LOOP;
  END LOOP;

END $$;
