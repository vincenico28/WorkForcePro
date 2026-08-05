-- Fix Supabase Security Linter Warnings: Signed-In Users Can Execute SECURITY DEFINER Function
-- Solution: Switch functions to SECURITY INVOKER so they respect RLS policies of the calling user.

-- 1. Patch auto_reject_stale_leaves to SECURITY INVOKER
CREATE OR REPLACE FUNCTION public.auto_reject_stale_leaves()
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
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

-- 2. Patch initialize_yearly_leave_balances to SECURITY INVOKER
CREATE OR REPLACE FUNCTION public.initialize_yearly_leave_balances()
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
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
