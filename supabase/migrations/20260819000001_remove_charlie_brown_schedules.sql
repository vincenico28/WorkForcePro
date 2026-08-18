-- Remove all schedule records for Charlie Brown
DELETE FROM public.schedules
WHERE employee_id IN (
    SELECT id 
    FROM public.employees 
    WHERE (first_name ILIKE '%Charlie%' AND last_name ILIKE '%Brown%')
       OR id = 'e1000000-0000-0000-0000-000000000007'
);
