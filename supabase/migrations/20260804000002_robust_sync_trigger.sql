-- Migration: Robust Sync Between Attendance and Timesheets
-- Ensures that if an attendance record is modified or deleted, the timesheet stays perfectly accurate.

CREATE OR REPLACE FUNCTION sync_attendance_to_timesheet()
RETURNS TRIGGER 
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  v_start_time TIME;
  v_end_time TIME;
  v_break_minutes INTEGER := 0;
BEGIN
  -- Handle DELETION of an attendance record
  IF TG_OP = 'DELETE' THEN
    DELETE FROM public.timesheet_entries WHERE attendance_id = OLD.id;
    RETURN OLD;
  END IF;

  -- Handle INSERT or UPDATE of an attendance record
  IF NEW.clock_out IS NOT NULL THEN
    v_start_time := NEW.clock_in::time;
    v_end_time := NEW.clock_out::time;
    
    -- Calculate break minutes if both exist
    IF NEW.break_start IS NOT NULL AND NEW.break_end IS NOT NULL THEN
      v_break_minutes := EXTRACT(EPOCH FROM (NEW.break_end - NEW.break_start)) / 60;
    ELSE
      v_break_minutes := 60;
    END IF;

    -- First try to update the existing timesheet linked to this attendance record
    UPDATE public.timesheet_entries 
    SET 
      start_time = v_start_time,
      end_time = v_end_time,
      break_minutes = v_break_minutes,
      date = NEW.date
    WHERE attendance_id = NEW.id;

    -- If it doesn't exist, insert it
    IF NOT FOUND THEN
      INSERT INTO public.timesheet_entries (
        employee_id,
        date,
        start_time,
        end_time,
        break_minutes,
        source,
        attendance_id
      ) VALUES (
        NEW.employee_id,
        NEW.date,
        v_start_time,
        v_end_time,
        v_break_minutes,
        'clock_in',
        NEW.id
      )
      ON CONFLICT (employee_id, date, start_time) 
      DO UPDATE SET 
        end_time = EXCLUDED.end_time,
        break_minutes = EXCLUDED.break_minutes,
        source = 'clock_in',
        attendance_id = EXCLUDED.attendance_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Recreate the trigger to also fire on DELETE
DROP TRIGGER IF EXISTS trg_sync_attendance_to_timesheet ON public.attendance_records;
CREATE TRIGGER trg_sync_attendance_to_timesheet
AFTER INSERT OR UPDATE OF clock_out, clock_in, date OR DELETE ON public.attendance_records
FOR EACH ROW
EXECUTE FUNCTION sync_attendance_to_timesheet();
