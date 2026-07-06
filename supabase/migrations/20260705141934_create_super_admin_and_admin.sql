-- ============================================================
-- Seed Super Admin and Admin Accounts (Dynamic Schema Helper)
-- ============================================================

DO $$
DECLARE
  v_instance_id uuid;
  v_has_instance_id_col boolean;
BEGIN
  -- 1. Clean up any existing attempts first to avoid duplicate email constraint errors
  DELETE FROM public.employees WHERE email IN ('superadmin@workforcepro.com', 'admin@workforcepro.com');
  DELETE FROM auth.users WHERE email IN ('superadmin@workforcepro.com', 'admin@workforcepro.com');

  -- 2. Check if instance_id column exists in auth.users
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'auth' AND table_name = 'users' AND column_name = 'instance_id'
  ) INTO v_has_instance_id_col;

  -- 3. Get existing instance_id if possible, otherwise default to '00000000-0000-0000-0000-000000000000'
  IF v_has_instance_id_col THEN
    SELECT instance_id INTO v_instance_id FROM auth.users WHERE instance_id IS NOT NULL LIMIT 1;
    IF v_instance_id IS NULL THEN
      v_instance_id := '00000000-0000-0000-0000-000000000000'::uuid;
    END IF;
  END IF;

  -- Ensure the default organization exists
  IF NOT EXISTS (SELECT 1 FROM public.organizations WHERE slug = 'nexus-tech') THEN
    INSERT INTO public.organizations (id, name, slug)
    VALUES ('00000000-0000-0000-0000-000000000001', 'Nexus Tech', 'nexus-tech')
    ON CONFLICT (id) DO NOTHING;
  END IF;

  -- 4. Insert Super Admin User
  IF v_has_instance_id_col THEN
    INSERT INTO auth.users (
      id, instance_id, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at, aud, role
    )
    VALUES (
      'd0000000-0000-0000-0000-000000000001', v_instance_id, 'superadmin@workforcepro.com',
      '$2a$10$chKU4XZeE0ZIPRqXvcP77u3LxB4Czq2jl6JD8xvCkPS2ChqEN.JR6', now(),
      '{"provider": "email", "providers": ["email"]}'::jsonb,
      '{"first_name": "Super", "last_name": "Admin"}'::jsonb,
      now(), now(), 'authenticated', 'authenticated'
    );
  ELSE
    INSERT INTO auth.users (
      id, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at, aud, role
    )
    VALUES (
      'd0000000-0000-0000-0000-000000000001', 'superadmin@workforcepro.com',
      '$2a$10$chKU4XZeE0ZIPRqXvcP77u3LxB4Czq2jl6JD8xvCkPS2ChqEN.JR6', now(),
      '{"provider": "email", "providers": ["email"]}'::jsonb,
      '{"first_name": "Super", "last_name": "Admin"}'::jsonb,
      now(), now(), 'authenticated', 'authenticated'
    );
  END IF;

  -- 5. Insert Admin User
  IF v_has_instance_id_col THEN
    INSERT INTO auth.users (
      id, instance_id, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at, aud, role
    )
    VALUES (
      'd0000000-0000-0000-0000-000000000002', v_instance_id, 'admin@workforcepro.com',
      '$2a$10$chKU4XZeE0ZIPRqXvcP77u3LxB4Czq2jl6JD8xvCkPS2ChqEN.JR6', now(),
      '{"provider": "email", "providers": ["email"]}'::jsonb,
      '{"first_name": "System", "last_name": "Admin"}'::jsonb,
      now(), now(), 'authenticated', 'authenticated'
    );
  ELSE
    INSERT INTO auth.users (
      id, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at, aud, role
    )
    VALUES (
      'd0000000-0000-0000-0000-000000000002', 'admin@workforcepro.com',
      '$2a$10$chKU4XZeE0ZIPRqXvcP77u3LxB4Czq2jl6JD8xvCkPS2ChqEN.JR6', now(),
      '{"provider": "email", "providers": ["email"]}'::jsonb,
      '{"first_name": "System", "last_name": "Admin"}'::jsonb,
      now(), now(), 'authenticated', 'authenticated'
    );
  END IF;

  -- 6. Insert Identities
  INSERT INTO auth.identities (
    user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
  )
  VALUES (
    'd0000000-0000-0000-0000-000000000001',
    jsonb_build_object('sub', 'd0000000-0000-0000-0000-000000000001', 'email', 'superadmin@workforcepro.com', 'email_verified', true),
    'email', 'd0000000-0000-0000-0000-000000000001', now(), now(), now()
  );

  INSERT INTO auth.identities (
    user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
  )
  VALUES (
    'd0000000-0000-0000-0000-000000000002',
    jsonb_build_object('sub', 'd0000000-0000-0000-0000-000000000002', 'email', 'admin@workforcepro.com', 'email_verified', true),
    'email', 'd0000000-0000-0000-0000-000000000002', now(), now(), now()
  );

  -- 7. Insert Employee Profiles
  INSERT INTO public.employees (
    id, user_id, org_id, first_name, last_name, email, role, position, employment_type, status, hire_date
  )
  VALUES (
    'e0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
    'Super', 'Admin', 'superadmin@workforcepro.com', 'super_admin', 'Chief Executive Officer', 'full_time', 'active', '2026-01-01'
  );

  INSERT INTO public.employees (
    id, user_id, org_id, first_name, last_name, email, role, position, employment_type, status, hire_date
  )
  VALUES (
    'e0000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001',
    'System', 'Admin', 'admin@workforcepro.com', 'admin', 'HR Director', 'full_time', 'active', '2026-01-01'
  );

END $$;
