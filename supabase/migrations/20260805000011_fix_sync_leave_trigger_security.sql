-- Security Fix: Revoke execute privileges from trigger function
-- Trigger functions should only be called by the database internally, never via the REST API.

REVOKE EXECUTE ON FUNCTION public.sync_leave_to_schedule() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.sync_leave_to_schedule() FROM anon;
REVOKE EXECUTE ON FUNCTION public.sync_leave_to_schedule() FROM authenticated;
