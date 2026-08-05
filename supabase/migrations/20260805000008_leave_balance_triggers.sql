-- Auto-Update Leave Balances Trigger
-- Updates pending_days and used_days based on leave_requests lifecycle.

CREATE OR REPLACE FUNCTION public.update_leave_balance_on_request_change()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_year integer;
BEGIN
    -- Determine the year of the request (using start_date)
    IF TG_OP = 'DELETE' THEN
        v_year := EXTRACT(YEAR FROM OLD.start_date);
    ELSE
        v_year := EXTRACT(YEAR FROM NEW.start_date);
    END IF;

    -- Ensure a leave_balances record exists for this year before updating (it should normally exist via initialization)
    -- If it doesn't, we just do nothing, though ideally it should be initialized.
    
    IF TG_OP = 'INSERT' THEN
        IF NEW.status = 'pending' THEN
            UPDATE public.leave_balances 
            SET pending_days = pending_days + NEW.total_days 
            WHERE employee_id = NEW.employee_id AND leave_type_id = NEW.leave_type_id AND year = v_year;
        ELSIF NEW.status = 'approved' THEN
            UPDATE public.leave_balances 
            SET used_days = used_days + NEW.total_days 
            WHERE employee_id = NEW.employee_id AND leave_type_id = NEW.leave_type_id AND year = v_year;
        END IF;

    ELSIF TG_OP = 'UPDATE' THEN
        -- Status changed from pending to approved
        IF OLD.status = 'pending' AND NEW.status = 'approved' THEN
            UPDATE public.leave_balances 
            SET pending_days = pending_days - OLD.total_days,
                used_days = used_days + NEW.total_days 
            WHERE employee_id = NEW.employee_id AND leave_type_id = NEW.leave_type_id AND year = v_year;
            
        -- Status changed from pending to rejected or cancelled
        ELSIF OLD.status = 'pending' AND NEW.status IN ('rejected', 'cancelled') THEN
            UPDATE public.leave_balances 
            SET pending_days = pending_days - OLD.total_days 
            WHERE employee_id = NEW.employee_id AND leave_type_id = NEW.leave_type_id AND year = v_year;
            
        -- Status changed from approved to cancelled
        ELSIF OLD.status = 'approved' AND NEW.status = 'cancelled' THEN
            UPDATE public.leave_balances 
            SET used_days = used_days - OLD.total_days 
            WHERE employee_id = NEW.employee_id AND leave_type_id = NEW.leave_type_id AND year = v_year;
            
        -- Edge case: Status changed from rejected/cancelled back to pending (if allowed)
        ELSIF OLD.status IN ('rejected', 'cancelled') AND NEW.status = 'pending' THEN
            UPDATE public.leave_balances 
            SET pending_days = pending_days + NEW.total_days 
            WHERE employee_id = NEW.employee_id AND leave_type_id = NEW.leave_type_id AND year = v_year;
        END IF;

    ELSIF TG_OP = 'DELETE' THEN
        IF OLD.status = 'pending' THEN
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

-- Attach the trigger
DROP TRIGGER IF EXISTS trg_update_leave_balance ON public.leave_requests;
CREATE TRIGGER trg_update_leave_balance
AFTER INSERT OR UPDATE OF status, total_days OR DELETE
ON public.leave_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_leave_balance_on_request_change();
