-- Migration: Repair Approved Leave Schedules & Protect On-Leave Status
-- 1. Sync all existing approved leaves into schedules as 'on_leave'
DO $$
DECLARE
    rec RECORD;
    v_date date;
BEGIN
    FOR rec IN 
        SELECT employee_id, start_date, end_date 
        FROM public.leave_requests 
        WHERE status = 'approved'
    LOOP
        FOR v_date IN 
            SELECT generate_series(rec.start_date::date, rec.end_date::date, '1 day'::interval) 
        LOOP
            INSERT INTO public.schedules (employee_id, date, status, notes)
            VALUES (rec.employee_id, v_date, 'on_leave', 'Approved Leave')
            ON CONFLICT (employee_id, date) 
            DO UPDATE SET status = 'on_leave', notes = 'Approved Leave', shift_id = NULL;
        END LOOP;
    END LOOP;
END $$;
