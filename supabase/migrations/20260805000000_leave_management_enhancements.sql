-- 1. Function to auto-reject stale pending leaves (older than 7 days)
CREATE OR REPLACE FUNCTION auto_reject_stale_leaves()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.leave_requests
  SET 
    status = 'rejected',
    review_notes = 'Automatically rejected due to no action within 7 days',
    updated_at = now()
  WHERE status = 'pending' 
    AND created_at < now() - INTERVAL '7 days';
END;
$$;

-- 2. Function to initialize yearly leave balances for all employees
CREATE OR REPLACE FUNCTION initialize_yearly_leave_balances()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_year integer := EXTRACT(YEAR FROM now());
BEGIN
  -- Insert a leave_balances row for every employee and every leave type in their org
  -- ON CONFLICT (employee_id, leave_type_id, year) DO NOTHING
  INSERT INTO public.leave_balances (employee_id, leave_type_id, year, allocated_days)
  SELECT 
    e.id AS employee_id,
    lt.id AS leave_type_id,
    v_year AS year,
    lt.days_allowed AS allocated_days
  FROM public.employees e
  JOIN public.leave_types lt ON lt.org_id = e.org_id
  ON CONFLICT (employee_id, leave_type_id, year) DO NOTHING;
END;
$$;

-- 3. Seed standard leave types for existing organizations
DO $$ 
DECLARE
  org RECORD;
BEGIN
  FOR org IN SELECT id FROM public.organizations LOOP
    -- Vacation Leave
    IF NOT EXISTS (SELECT 1 FROM public.leave_types WHERE org_id = org.id AND code = 'VL') THEN
      INSERT INTO public.leave_types (org_id, name, code, days_allowed, is_paid, requires_attachment, color)
      VALUES (org.id, 'Vacation Leave', 'VL', 15, true, false, '#10b981');
    END IF;

    -- Sick Leave
    IF NOT EXISTS (SELECT 1 FROM public.leave_types WHERE org_id = org.id AND code = 'SL') THEN
      INSERT INTO public.leave_types (org_id, name, code, days_allowed, is_paid, requires_attachment, color)
      VALUES (org.id, 'Sick Leave', 'SL', 10, true, true, '#ef4444');
    END IF;

    -- Maternity Leave
    IF NOT EXISTS (SELECT 1 FROM public.leave_types WHERE org_id = org.id AND code = 'ML') THEN
      INSERT INTO public.leave_types (org_id, name, code, days_allowed, is_paid, requires_attachment, color)
      VALUES (org.id, 'Maternity Leave', 'ML', 105, true, true, '#f472b6');
    END IF;

    -- Paternity Leave
    IF NOT EXISTS (SELECT 1 FROM public.leave_types WHERE org_id = org.id AND code = 'PL') THEN
      INSERT INTO public.leave_types (org_id, name, code, days_allowed, is_paid, requires_attachment, color)
      VALUES (org.id, 'Paternity Leave', 'PL', 7, true, true, '#3b82f6');
    END IF;

    -- Bereavement Leave
    IF NOT EXISTS (SELECT 1 FROM public.leave_types WHERE org_id = org.id AND code = 'BL') THEN
      INSERT INTO public.leave_types (org_id, name, code, days_allowed, is_paid, requires_attachment, color)
      VALUES (org.id, 'Bereavement Leave', 'BL', 5, true, true, '#6b7280');
    END IF;
  END LOOP;
END $$;
