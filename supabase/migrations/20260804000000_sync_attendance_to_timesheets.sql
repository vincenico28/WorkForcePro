-- Migration: Sync Attendance Records to Timesheets

-- 1. Create the trigger function
CREATE OR REPLACE FUNCTION sync_attendance_to_timesheet()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql;

-- 2. Attach the trigger to attendance_records
DROP TRIGGER IF EXISTS trg_sync_attendance_to_timesheet ON public.attendance_records;
CREATE TRIGGER trg_sync_attendance_to_timesheet
AFTER INSERT OR UPDATE OF clock_out ON public.attendance_records
FOR EACH ROW
EXECUTE FUNCTION sync_attendance_to_timesheet();

-- 3. Backfill existing data
-- This will run the logic for all existing attendance records that have a clock_out
DO $$
DECLARE
  rec RECORD;
  v_start_time TIME;
  v_end_time TIME;
  v_break_minutes INTEGER;
BEGIN
  FOR rec IN SELECT * FROM public.attendance_records WHERE clock_out IS NOT NULL LOOP
    v_start_time := rec.clock_in::time;
    v_end_time := rec.clock_out::time;
    
    IF rec.break_start IS NOT NULL AND rec.break_end IS NOT NULL THEN
      v_break_minutes := EXTRACT(EPOCH FROM (rec.break_end - rec.break_start)) / 60;
    ELSE
      v_break_minutes := 60;
    END IF;

    INSERT INTO public.timesheet_entries (
      employee_id,
      date,
      start_time,
      end_time,
      break_minutes,
      source,
      attendance_id
    ) VALUES (
      rec.employee_id,
      rec.date,
      v_start_time,
      v_end_time,
      v_break_minutes,
      'clock_in',
      rec.id
    )
    ON CONFLICT (employee_id, date, start_time) DO NOTHING;
  END LOOP;
END;
$$;
