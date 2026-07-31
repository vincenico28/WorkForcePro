-- Create a function to auto-notify HR/Admins on New Leave Requests
CREATE OR REPLACE FUNCTION notify_admins_new_leave_request()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  emp_name text;
  emp_org_id uuid;
BEGIN
  -- Get the name and org_id of the employee who requested the leave
  SELECT first_name || ' ' || last_name, org_id INTO emp_name, emp_org_id 
  FROM public.employees 
  WHERE id = NEW.employee_id;

  -- Insert notifications for all admins and hr_managers in the same org
  INSERT INTO public.notifications (employee_id, title, message, type, category)
  SELECT 
    e.id,
    'New Leave Request',
    emp_name || ' has submitted a new leave request from ' || NEW.start_date || ' to ' || NEW.end_date || '.',
    'info',
    'leave'
  FROM public.employees e
  WHERE e.role IN ('admin', 'hr_manager', 'super_admin')
    AND e.org_id = emp_org_id
    AND e.id != NEW.employee_id; -- Don't notify the person who created it if they are an admin
    
  RETURN NEW;
END;
$$;

-- Revoke execute from public to prevent API abuse
REVOKE EXECUTE ON FUNCTION notify_admins_new_leave_request() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trigger_notify_new_leave ON public.leave_requests;
CREATE TRIGGER trigger_notify_new_leave
AFTER INSERT ON public.leave_requests
FOR EACH ROW EXECUTE FUNCTION notify_admins_new_leave_request();
