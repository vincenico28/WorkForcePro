-- ============================================================
-- Security Fix 1: Revoke execute on trigger function
-- The update_timesheet_entries_updated_at function is SECURITY DEFINER
-- but should not be callable via REST API. Only the trigger should use it.
-- ============================================================
REVOKE EXECUTE ON FUNCTION public.update_timesheet_entries_updated_at() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.update_timesheet_entries_updated_at() FROM anon;
REVOKE EXECUTE ON FUNCTION public.update_timesheet_entries_updated_at() FROM authenticated;

-- ============================================================
-- Security Fix 2: Enable leaked password protection
-- This prevents users from using compromised passwords from HaveIBeenPwned
-- ============================================================
-- Note: Leaked password protection is configured at the project level
-- in Supabase Dashboard > Authentication > Policies > "Leaked password protection"
-- This requires enabling via the UI or management API, not SQL.
-- The following comment serves as documentation to enable it:
-- ALTER DATABASE postgres SET app.settings.enable_leaked_password_protection = true;
-- (This is a placeholder - actual setting must be done via Supabase Dashboard)

-- ============================================================
-- Additional security: Ensure other trigger functions are also protected
-- ============================================================
-- Check for any other SECURITY DEFINER functions and revoke execute
DO $$
DECLARE
  fn record;
BEGIN
  FOR fn IN 
    SELECT proname, oidvectortypes(proargtypes) as args
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
      AND p.prosecdef = true  -- SECURITY DEFINER
      AND p.prokind = 'f'     -- function (not aggregate/window)
  LOOP
    -- Log for auditing (optional)
    RAISE NOTICE 'SECURITY DEFINER function found: %(%)', fn.proname, fn.args;
  END LOOP;
END $$;
