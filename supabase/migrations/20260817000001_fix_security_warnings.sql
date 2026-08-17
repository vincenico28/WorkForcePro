-- Migration: Fix Supabase Security Linter Warnings for Trigger & Database Functions
-- Revokes direct REST/RPC execute privileges on internal trigger functions from anon and public roles.

-- 1. Secure sync_attendance_to_timesheet trigger function
REVOKE EXECUTE ON FUNCTION public.sync_attendance_to_timesheet() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.sync_attendance_to_timesheet() FROM anon;
REVOKE EXECUTE ON FUNCTION public.sync_attendance_to_timesheet() FROM authenticated;

-- 2. Secure update_leave_balance_on_request_change trigger function
REVOKE EXECUTE ON FUNCTION public.update_leave_balance_on_request_change() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.update_leave_balance_on_request_change() FROM anon;
REVOKE EXECUTE ON FUNCTION public.update_leave_balance_on_request_change() FROM authenticated;

-- 3. Secure update_timesheet_entries_updated_at trigger function if present
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_timesheet_entries_updated_at') THEN
    REVOKE EXECUTE ON FUNCTION public.update_timesheet_entries_updated_at() FROM PUBLIC;
    REVOKE EXECUTE ON FUNCTION public.update_timesheet_entries_updated_at() FROM anon;
    REVOKE EXECUTE ON FUNCTION public.update_timesheet_entries_updated_at() FROM authenticated;
  END IF;
END $$;
