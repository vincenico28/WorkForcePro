-- Create a generic function to log audits
CREATE OR REPLACE FUNCTION log_audit_event()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  current_user_id uuid;
  current_emp_id uuid;
  action_type text;
BEGIN
  -- Get the ID of the user performing the action
  current_user_id := auth.uid();
  
  -- Attempt to get their employee ID
  SELECT id INTO current_emp_id FROM public.employees WHERE user_id = current_user_id LIMIT 1;
  
  IF TG_OP = 'INSERT' THEN
    action_type := 'CREATE';
    INSERT INTO public.audit_logs (user_id, employee_id, action, resource_type, resource_id, changes)
    VALUES (current_user_id, current_emp_id, action_type, TG_TABLE_NAME, NEW.id::text, row_to_json(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    action_type := 'UPDATE';
    INSERT INTO public.audit_logs (user_id, employee_id, action, resource_type, resource_id, changes)
    VALUES (current_user_id, current_emp_id, action_type, TG_TABLE_NAME, NEW.id::text, jsonb_build_object('old', row_to_json(OLD), 'new', row_to_json(NEW)));
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    action_type := 'DELETE';
    INSERT INTO public.audit_logs (user_id, employee_id, action, resource_type, resource_id, changes)
    VALUES (current_user_id, current_emp_id, action_type, TG_TABLE_NAME, OLD.id::text, row_to_json(OLD));
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$$;

-- Revoke execute from public to prevent API abuse
REVOKE EXECUTE ON FUNCTION log_audit_event() FROM PUBLIC, anon, authenticated;

-- Apply Audit triggers to important tables
DROP TRIGGER IF EXISTS audit_leaves ON leave_requests;
CREATE TRIGGER audit_leaves
AFTER INSERT OR UPDATE OR DELETE ON leave_requests
FOR EACH ROW EXECUTE FUNCTION log_audit_event();

DROP TRIGGER IF EXISTS audit_schedules ON schedules;
CREATE TRIGGER audit_schedules
AFTER INSERT OR UPDATE OR DELETE ON schedules
FOR EACH ROW EXECUTE FUNCTION log_audit_event();

DROP TRIGGER IF EXISTS audit_timesheets ON timesheet_entries;
CREATE TRIGGER audit_timesheets
AFTER INSERT OR UPDATE OR DELETE ON timesheet_entries
FOR EACH ROW EXECUTE FUNCTION log_audit_event();


-- Create a function to auto-notify on Leave Request Updates
CREATE OR REPLACE FUNCTION notify_leave_status_change()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Only trigger on updates where status changed
  IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.notifications (employee_id, title, message, type)
    VALUES (
      NEW.employee_id,
      'Leave Request ' || INITCAP(NEW.status),
      'Your leave request from ' || NEW.start_date || ' to ' || NEW.end_date || ' has been ' || NEW.status || '.',
      CASE 
        WHEN NEW.status = 'approved' THEN 'success'
        WHEN NEW.status = 'rejected' THEN 'error'
        ELSE 'info'
      END
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Revoke execute from public to prevent API abuse
REVOKE EXECUTE ON FUNCTION notify_leave_status_change() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trigger_notify_leave ON leave_requests;
CREATE TRIGGER trigger_notify_leave
AFTER UPDATE ON leave_requests
FOR EACH ROW EXECUTE FUNCTION notify_leave_status_change();
