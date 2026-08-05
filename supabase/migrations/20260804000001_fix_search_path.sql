-- Fix for "Function Search Path Mutable" security warning
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
  -- We only want to sync when clock_out is present
  IF NEW.clock_out IS NOT NULL THEN
    v_start_time := NEW.clock_in::time;
    v_end_time := NEW.clock_out::time;
    
    -- Calculate break minutes if both exist
    IF NEW.break_start IS NOT NULL AND NEW.break_end IS NOT NULL THEN
      v_break_minutes := EXTRACT(EPOCH FROM (NEW.break_end - NEW.break_start)) / 60;
    ELSE
      -- Default break deduction if no explicitly logged break
      v_break_minutes := 60;
    END IF;

    -- Upsert the timesheet entry
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

  RETURN NEW;
END;
$$;
