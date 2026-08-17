-- Migration: Seed Full Philippine DOLE Statutory Leave Types and Initialize Balances
-- DOLE Labor Code & Philippine Republic Acts:
-- 1. Vacation Leave / Service Incentive Leave (Art. 95) - 15 days
-- 2. Sick Leave - 15 days
-- 3. Maternity Leave (RA 11210) - 105 days
-- 4. Paternity Leave (RA 8187) - 7 days
-- 5. Solo Parent Leave (RA 8972 / RA 11861) - 7 days
-- 6. Magna Carta for Women / Gynecological Leave (RA 9710) - 60 days
-- 7. VAWC Leave (RA 9262) - 10 days
-- 8. Bereavement Leave - 5 days
-- 9. Emergency / Calamity Leave - 3 days

-- Ensure unique constraint exists for org_id and code
CREATE UNIQUE INDEX IF NOT EXISTS idx_leave_types_org_code ON public.leave_types (org_id, code);

DO $$
DECLARE
  org RECORD;
  v_year integer := EXTRACT(YEAR FROM now());
BEGIN
  FOR org IN SELECT id FROM public.organizations LOOP
    -- 1. Vacation Leave
    IF EXISTS (SELECT 1 FROM public.leave_types WHERE org_id = org.id AND code = 'VL') THEN
      UPDATE public.leave_types SET days_allowed = 15, is_paid = true WHERE org_id = org.id AND code = 'VL';
    ELSE
      INSERT INTO public.leave_types (org_id, name, code, days_allowed, is_paid, requires_attachment, color)
      VALUES (org.id, 'Vacation Leave', 'VL', 15, true, false, '#10b981');
    END IF;

    -- 2. Sick Leave
    IF EXISTS (SELECT 1 FROM public.leave_types WHERE org_id = org.id AND code = 'SL') THEN
      UPDATE public.leave_types SET days_allowed = 15, is_paid = true, requires_attachment = true WHERE org_id = org.id AND code = 'SL';
    ELSE
      INSERT INTO public.leave_types (org_id, name, code, days_allowed, is_paid, requires_attachment, color)
      VALUES (org.id, 'Sick Leave', 'SL', 15, true, true, '#ef4444');
    END IF;

    -- 3. Maternity Leave (RA 11210)
    IF EXISTS (SELECT 1 FROM public.leave_types WHERE org_id = org.id AND code = 'ML') THEN
      UPDATE public.leave_types SET days_allowed = 105, is_paid = true, requires_attachment = true WHERE org_id = org.id AND code = 'ML';
    ELSE
      INSERT INTO public.leave_types (org_id, name, code, days_allowed, is_paid, requires_attachment, color)
      VALUES (org.id, 'Maternity Leave (RA 11210)', 'ML', 105, true, true, '#ec4899');
    END IF;

    -- 4. Paternity Leave (RA 8187)
    IF EXISTS (SELECT 1 FROM public.leave_types WHERE org_id = org.id AND code = 'PL') THEN
      UPDATE public.leave_types SET days_allowed = 7, is_paid = true, requires_attachment = true WHERE org_id = org.id AND code = 'PL';
    ELSE
      INSERT INTO public.leave_types (org_id, name, code, days_allowed, is_paid, requires_attachment, color)
      VALUES (org.id, 'Paternity Leave (RA 8187)', 'PL', 7, true, true, '#3b82f6');
    END IF;

    -- 5. Solo Parent Leave (RA 8972)
    IF EXISTS (SELECT 1 FROM public.leave_types WHERE org_id = org.id AND code = 'SPL') THEN
      UPDATE public.leave_types SET days_allowed = 7, is_paid = true, requires_attachment = true WHERE org_id = org.id AND code = 'SPL';
    ELSE
      INSERT INTO public.leave_types (org_id, name, code, days_allowed, is_paid, requires_attachment, color)
      VALUES (org.id, 'Solo Parent Leave (RA 8972)', 'SPL', 7, true, true, '#8b5cf6');
    END IF;

    -- 6. Special Leave for Women (RA 9710)
    IF EXISTS (SELECT 1 FROM public.leave_types WHERE org_id = org.id AND code = 'SLW') THEN
      UPDATE public.leave_types SET days_allowed = 60, is_paid = true, requires_attachment = true WHERE org_id = org.id AND code = 'SLW';
    ELSE
      INSERT INTO public.leave_types (org_id, name, code, days_allowed, is_paid, requires_attachment, color)
      VALUES (org.id, 'Magna Carta for Women (RA 9710)', 'SLW', 60, true, true, '#f43f5e');
    END IF;

    -- 7. VAWC Leave (RA 9262)
    IF EXISTS (SELECT 1 FROM public.leave_types WHERE org_id = org.id AND code = 'VAWC') THEN
      UPDATE public.leave_types SET days_allowed = 10, is_paid = true, requires_attachment = true WHERE org_id = org.id AND code = 'VAWC';
    ELSE
      INSERT INTO public.leave_types (org_id, name, code, days_allowed, is_paid, requires_attachment, color)
      VALUES (org.id, 'VAWC Leave (RA 9262)', 'VAWC', 10, true, true, '#a855f7');
    END IF;

    -- 8. Bereavement Leave
    IF EXISTS (SELECT 1 FROM public.leave_types WHERE org_id = org.id AND code = 'BL') THEN
      UPDATE public.leave_types SET days_allowed = 5, is_paid = true, requires_attachment = true WHERE org_id = org.id AND code = 'BL';
    ELSE
      INSERT INTO public.leave_types (org_id, name, code, days_allowed, is_paid, requires_attachment, color)
      VALUES (org.id, 'Bereavement Leave', 'BL', 5, true, true, '#64748b');
    END IF;

    -- 9. Emergency / Calamity Leave
    IF EXISTS (SELECT 1 FROM public.leave_types WHERE org_id = org.id AND code = 'ECL') THEN
      UPDATE public.leave_types SET days_allowed = 3, is_paid = true WHERE org_id = org.id AND code = 'ECL';
    ELSE
      INSERT INTO public.leave_types (org_id, name, code, days_allowed, is_paid, requires_attachment, color)
      VALUES (org.id, 'Emergency / Calamity Leave', 'ECL', 3, true, false, '#f59e0b');
    END IF;
  END LOOP;

  -- Auto-allocate statutory leave balances for all employees for the current year
  INSERT INTO public.leave_balances (employee_id, leave_type_id, year, allocated_days, used_days)
  SELECT 
    e.id AS employee_id,
    lt.id AS leave_type_id,
    v_year AS year,
    lt.days_allowed AS allocated_days,
    0 AS used_days
  FROM public.employees e
  JOIN public.leave_types lt ON lt.org_id = e.org_id
  ON CONFLICT (employee_id, leave_type_id, year) 
  DO UPDATE SET allocated_days = EXCLUDED.allocated_days;
END $$;
