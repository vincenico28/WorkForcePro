-- Migration: Automatic Announcement Broadcast to Notifications & Schedules Constraint Verification
-- 1. Ensure schedules employee_id + date unique constraint exists
CREATE UNIQUE INDEX IF NOT EXISTS schedules_employee_id_date_key ON public.schedules (employee_id, date);

-- 2. Function to auto-broadcast announcement notifications to all active employees
CREATE OR REPLACE FUNCTION public.broadcast_announcement_to_notifications()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.notifications (
    employee_id,
    title,
    message,
    type,
    category,
    action_url,
    is_read,
    created_at
  )
  SELECT 
    e.id AS employee_id,
    '📢 New Announcement: ' || NEW.title,
    CASE 
      WHEN length(NEW.content) > 120 THEN substring(NEW.content from 1 for 117) || '...'
      ELSE NEW.content
    END,
    CASE 
      WHEN NEW.type = 'urgent' THEN 'warning'
      ELSE 'info'
    END,
    'announcement',
    '/app/announcements',
    false,
    now()
  FROM public.employees e
  WHERE e.org_id = NEW.org_id
    AND e.status = 'active';

  RETURN NEW;
END;
$$;

-- 3. Revoke public/anon/authenticated execute on the trigger function (Triggers run automatically without exposing RPC)
REVOKE EXECUTE ON FUNCTION public.broadcast_announcement_to_notifications() FROM PUBLIC, anon, authenticated;

-- 4. Create trigger on announcements
DROP TRIGGER IF EXISTS trg_broadcast_announcement ON public.announcements;
CREATE TRIGGER trg_broadcast_announcement
AFTER INSERT ON public.announcements
FOR EACH ROW
EXECUTE FUNCTION public.broadcast_announcement_to_notifications();
