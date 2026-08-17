-- Migration: Enhance Attendance, Timesheet, and Payroll Synchronization
-- Ensures overtime_hours, break_minutes, notes, and attendance_id are strictly synchronized
-- between attendance_records and timesheet_entries.

CREATE OR REPLACE FUNCTION public.sync_attendance_to_timesheet()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_start_time TIME;
  v_end_time TIME;
  v_break_minutes INTEGER := 60;
  v_overtime NUMERIC(4,2) := 0;
BEGIN
  -- Handle DELETION of an attendance record
  IF TG_OP = 'DELETE' THEN
    DELETE FROM public.timesheet_entries WHERE attendance_id = OLD.id;
    RETURN OLD;
  END IF;

  -- Handle INSERT or UPDATE of an attendance record with clock_out
  IF NEW.clock_out IS NOT NULL THEN
    v_start_time := NEW.clock_in::time;
    v_end_time := NEW.clock_out::time;
    
    -- Calculate break minutes if explicitly recorded, otherwise default to 60 mins standard
    IF NEW.break_start IS NOT NULL AND NEW.break_end IS NOT NULL THEN
      v_break_minutes := GREATEST(0, ROUND(EXTRACT(EPOCH FROM (NEW.break_end - NEW.break_start)) / 60)::integer);
    ELSE
      v_break_minutes := 60;
    END IF;

    -- Ensure overtime_hours is properly transferred
    v_overtime := COALESCE(NEW.overtime_hours, 0);

    -- 1. Try to update existing timesheet entry linked by attendance_id
    UPDATE public.timesheet_entries 
    SET 
      start_time = v_start_time,
      end_time = v_end_time,
      break_minutes = v_break_minutes,
      overtime_hours = v_overtime,
      date = NEW.date,
      notes = COALESCE(NEW.notes, notes),
      updated_at = now()
    WHERE attendance_id = NEW.id;

    -- 2. If not found, insert a new synchronized timesheet entry
    IF NOT FOUND THEN
      INSERT INTO public.timesheet_entries (
        employee_id,
        date,
        start_time,
        end_time,
        break_minutes,
        overtime_hours,
        source,
        attendance_id,
        notes,
        created_at,
        updated_at
      ) VALUES (
        NEW.employee_id,
        NEW.date,
        v_start_time,
        v_end_time,
        v_break_minutes,
        v_overtime,
        'clock_in',
        NEW.id,
        NEW.notes,
        now(),
        now()
      )
      ON CONFLICT (employee_id, date, start_time) 
      DO UPDATE SET 
        end_time = EXCLUDED.end_time,
        break_minutes = EXCLUDED.break_minutes,
        overtime_hours = EXCLUDED.overtime_hours,
        source = 'clock_in',
        attendance_id = EXCLUDED.attendance_id,
        notes = COALESCE(EXCLUDED.notes, timesheet_entries.notes),
        updated_at = now();
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Re-attach trigger to attendance_records
DROP TRIGGER IF EXISTS trg_sync_attendance_to_timesheet ON public.attendance_records;
CREATE TRIGGER trg_sync_attendance_to_timesheet
AFTER INSERT OR UPDATE OF clock_out, clock_in, date, overtime_hours, break_start, break_end OR DELETE ON public.attendance_records
FOR EACH ROW
EXECUTE FUNCTION public.sync_attendance_to_timesheet();

-- Revoke direct RPC execution privileges from public/anon/authenticated
REVOKE EXECUTE ON FUNCTION public.sync_attendance_to_timesheet() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.sync_attendance_to_timesheet() FROM anon;
REVOKE EXECUTE ON FUNCTION public.sync_attendance_to_timesheet() FROM authenticated;

