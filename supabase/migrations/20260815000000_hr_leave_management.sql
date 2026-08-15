-- HR Leave Management Standardizations

-- 1. Add duration_type to leave_requests
ALTER TABLE public.leave_requests ADD COLUMN IF NOT EXISTS duration_type text DEFAULT 'full_day' CHECK (duration_type IN ('full_day', 'half_day_am', 'half_day_pm'));

-- 2. Update the leave balance trigger to handle multi-stage pending statuses and cancelled status
CREATE OR REPLACE FUNCTION public.update_leave_balance_on_request_change()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_year integer;
BEGIN
    IF TG_OP = 'DELETE' THEN
        v_year := EXTRACT(YEAR FROM OLD.start_date);
    ELSE
        v_year := EXTRACT(YEAR FROM NEW.start_date);
    END IF;

    IF TG_OP = 'INSERT' THEN
        IF NEW.status IN ('pending', 'pending_supervisor', 'pending_hr') THEN
            UPDATE public.leave_balances 
            SET pending_days = pending_days + NEW.total_days 
            WHERE employee_id = NEW.employee_id AND leave_type_id = NEW.leave_type_id AND year = v_year;
        ELSIF NEW.status = 'approved' THEN
            UPDATE public.leave_balances 
            SET used_days = used_days + NEW.total_days 
            WHERE employee_id = NEW.employee_id AND leave_type_id = NEW.leave_type_id AND year = v_year;
        END IF;

    ELSIF TG_OP = 'UPDATE' THEN
        -- Status changed from a pending state to approved
        IF OLD.status IN ('pending', 'pending_supervisor', 'pending_hr') AND NEW.status = 'approved' THEN
            UPDATE public.leave_balances 
            SET pending_days = pending_days - OLD.total_days,
                used_days = used_days + NEW.total_days 
            WHERE employee_id = NEW.employee_id AND leave_type_id = NEW.leave_type_id AND year = v_year;
            
        -- Status changed from a pending state to rejected or cancelled
        ELSIF OLD.status IN ('pending', 'pending_supervisor', 'pending_hr') AND NEW.status IN ('rejected', 'cancelled') THEN
            UPDATE public.leave_balances 
            SET pending_days = pending_days - OLD.total_days 
            WHERE employee_id = NEW.employee_id AND leave_type_id = NEW.leave_type_id AND year = v_year;
            
        -- Status changed from approved to cancelled
        ELSIF OLD.status = 'approved' AND NEW.status = 'cancelled' THEN
            UPDATE public.leave_balances 
            SET used_days = used_days - OLD.total_days 
            WHERE employee_id = NEW.employee_id AND leave_type_id = NEW.leave_type_id AND year = v_year;
            
        -- Edge case: Status changed from rejected/cancelled back to a pending state
        ELSIF OLD.status IN ('rejected', 'cancelled') AND NEW.status IN ('pending', 'pending_supervisor', 'pending_hr') THEN
            UPDATE public.leave_balances 
            SET pending_days = pending_days + NEW.total_days 
            WHERE employee_id = NEW.employee_id AND leave_type_id = NEW.leave_type_id AND year = v_year;
            
        -- Edge case: total_days changed while still in a pending state
        ELSIF OLD.status IN ('pending', 'pending_supervisor', 'pending_hr') AND NEW.status IN ('pending', 'pending_supervisor', 'pending_hr') AND OLD.total_days != NEW.total_days THEN
            UPDATE public.leave_balances 
            SET pending_days = pending_days - OLD.total_days + NEW.total_days
            WHERE employee_id = NEW.employee_id AND leave_type_id = NEW.leave_type_id AND year = v_year;
        END IF;

    ELSIF TG_OP = 'DELETE' THEN
        IF OLD.status IN ('pending', 'pending_supervisor', 'pending_hr') THEN
            UPDATE public.leave_balances 
            SET pending_days = pending_days - OLD.total_days 
            WHERE employee_id = OLD.employee_id AND leave_type_id = OLD.leave_type_id AND year = v_year;
        ELSIF OLD.status = 'approved' THEN
            UPDATE public.leave_balances 
            SET used_days = used_days - OLD.total_days 
            WHERE employee_id = OLD.employee_id AND leave_type_id = OLD.leave_type_id AND year = v_year;
        END IF;
    END IF;

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- 3. Update auto_reject_stale_leaves to include the new pending statuses
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
  WHERE status IN ('pending', 'pending_supervisor', 'pending_hr') 
    AND compliance_requested = true 
    AND compliance_due_date < now();

  -- Reject standard requests that have been pending for 7 days
  UPDATE public.leave_requests
  SET 
    status = 'rejected',
    review_notes = 'Automatically rejected due to no action within 7 days.',
    updated_at = now()
  WHERE status IN ('pending', 'pending_supervisor', 'pending_hr') 
    AND compliance_requested = false
    AND created_at < now() - INTERVAL '7 days';
END;
$$;
