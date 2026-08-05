-- Security Fix: Revoke execute privileges from trigger function
-- Trigger functions should only be called by the database internally, never via the REST API.

REVOKE EXECUTE ON FUNCTION public.update_leave_balance_on_request_change() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.update_leave_balance_on_request_change() FROM anon;
REVOKE EXECUTE ON FUNCTION public.update_leave_balance_on_request_change() FROM authenticated;
