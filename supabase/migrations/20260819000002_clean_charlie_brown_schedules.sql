-- 1. Delete all schedules for Charlie Brown
DELETE FROM public.schedules
WHERE employee_id IN (
    SELECT id FROM public.employees 
    WHERE first_name ILIKE '%Charlie%' 
       OR last_name ILIKE '%Brown%'
       OR email ILIKE '%charlie%'
);

-- 2. Delete any approved leave requests for Charlie Brown that may render as 'L' badges
DELETE FROM public.leave_requests
WHERE employee_id IN (
    SELECT id FROM public.employees 
    WHERE first_name ILIKE '%Charlie%' 
       OR last_name ILIKE '%Brown%'
       OR email ILIKE '%charlie%'
);

-- 3. Return confirmation
SELECT e.id, e.first_name, e.last_name, e.email, COUNT(s.id) AS remaining_schedules
FROM public.employees e
LEFT JOIN public.schedules s ON s.employee_id = e.id
WHERE e.first_name ILIKE '%Charlie%' OR e.last_name ILIKE '%Brown%'
GROUP BY e.id, e.first_name, e.last_name, e.email;
