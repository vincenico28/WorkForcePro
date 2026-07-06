-- Fix missing boolean flags in auth.users that can cause "Database error finding users"
DO $$
BEGIN
  UPDATE auth.users 
  SET is_sso_user = false 
  WHERE is_sso_user IS NULL;
EXCEPTION
  WHEN undefined_column THEN NULL;
END $$;

DO $$
BEGIN
  UPDATE auth.users 
  SET is_anonymous = false 
  WHERE is_anonymous IS NULL;
EXCEPTION
  WHEN undefined_column THEN NULL;
END $$;

DO $$
BEGIN
  UPDATE auth.users 
  SET is_super_admin = false 
  WHERE is_super_admin IS NULL;
EXCEPTION
  WHEN undefined_column THEN NULL;
END $$;

-- Ensure identities have the correct format if they are broken
-- Sometimes missing phone or email can cause issues.
