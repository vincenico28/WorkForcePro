-- Sync Leave to Schedule Trigger
-- Automatically sets schedule status to 'on_leave' when a leave is approved.

CREATE OR REPLACE FUNCTION public.sync_leave_to_schedule()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_date date;
BEGIN
    IF TG_OP = 'UPDATE' THEN
        -- Status changed to approved
        IF OLD.status != 'approved' AND NEW.status = 'approved' THEN
            FOR v_date IN SELECT generate_series(NEW.start_date::date, NEW.end_date::date, '1 day'::interval) LOOP
                IF EXISTS (SELECT 1 FROM public.schedules WHERE employee_id = NEW.employee_id AND date = v_date) THEN
                    UPDATE public.schedules 
                    SET status = 'on_leave', notes = 'On Leave'
                    WHERE employee_id = NEW.employee_id AND date = v_date;
                ELSE
                    INSERT INTO public.schedules (employee_id, date, status, notes)
                    VALUES (NEW.employee_id, v_date, 'on_leave', 'On Leave');
                END IF;
            END LOOP;
        
        -- Status changed from approved to cancelled/rejected (revert)
        ELSIF OLD.status = 'approved' AND NEW.status IN ('cancelled', 'rejected') THEN
            FOR v_date IN SELECT generate_series(NEW.start_date::date, NEW.end_date::date, '1 day'::interval) LOOP
                UPDATE public.schedules 
                SET status = 'scheduled', notes = NULL
                WHERE employee_id = NEW.employee_id AND date = v_date AND status = 'on_leave';
            END LOOP;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach the trigger
DROP TRIGGER IF EXISTS trg_sync_leave_to_schedule ON public.leave_requests;
CREATE TRIGGER trg_sync_leave_to_schedule
AFTER UPDATE OF status
ON public.leave_requests
FOR EACH ROW
EXECUTE FUNCTION public.sync_leave_to_schedule();
