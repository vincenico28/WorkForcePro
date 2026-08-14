-- Migration: Fix Supabase Security Linter Warnings for get_role_by_email
-- Revokes public and authenticated execution permissions from the SECURITY DEFINER function

CREATE OR REPLACE FUNCTION public.get_role_by_email(p_email TEXT)
RETURNS TEXT
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_role TEXT;
BEGIN
    SELECT role INTO v_role
    FROM public.employees
    WHERE email = p_email
    LIMIT 1;
    
    RETURN v_role;
END;
$$ LANGUAGE plpgsql;

-- Revoke all execute permissions from external API roles
REVOKE EXECUTE ON FUNCTION public.get_role_by_email(TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_role_by_email(TEXT) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_role_by_email(TEXT) FROM authenticated;
