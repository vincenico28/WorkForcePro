-- Leave Compliance Feature

-- 1. Add compliance columns to leave_requests
ALTER TABLE public.leave_requests ADD COLUMN IF NOT EXISTS compliance_requested boolean DEFAULT false;
ALTER TABLE public.leave_requests ADD COLUMN IF NOT EXISTS compliance_due_date timestamptz;

-- 2. Create RPC for supervisors to request compliance
CREATE OR REPLACE FUNCTION public.request_leave_compliance(
  p_leave_id uuid, 
  p_due_date timestamptz, 
  p_notes text
)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_employee_id uuid;
BEGIN
  -- Get the employee ID for this leave
  SELECT employee_id INTO v_employee_id FROM public.leave_requests WHERE id = p_leave_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Leave request not found';
  END IF;

  -- Update the leave request
  UPDATE public.leave_requests
  SET 
    compliance_requested = true,
    compliance_due_date = p_due_date,
    review_notes = p_notes,
    updated_at = now()
  WHERE id = p_leave_id;

  -- Insert a notification for the employee
  INSERT INTO public.notifications (
    employee_id, 
    title, 
    message, 
    type, 
    action_url
  ) VALUES (
    v_employee_id,
    'Action Required: Leave Compliance Document',
    'Your supervisor has requested a compliance document for your pending leave request. Due by ' || to_char(p_due_date, 'YYYY-MM-DD') || '.',
    'warning',
    '/app/leaves'
  );
END;
$$;

-- 3. Update auto_reject_stale_leaves to handle compliance due dates
CREATE OR REPLACE FUNCTION public.auto_reject_stale_leaves()
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  -- Reject requests that missed the compliance due date
  UPDATE public.leave_requests
  SET 
    status = 'rejected',
    review_notes = 'Automatically rejected due to missing compliance document by due date.',
    updated_at = now()
  WHERE status = 'pending' 
    AND compliance_requested = true 
    AND compliance_due_date < now();

  -- Reject standard requests that have been pending for 7 days
  UPDATE public.leave_requests
  SET 
    status = 'rejected',
    review_notes = 'Automatically rejected due to no action within 7 days.',
    updated_at = now()
  WHERE status = 'pending' 
    AND compliance_requested = false
    AND created_at < now() - INTERVAL '7 days';
END;
$$;
