-- Migration: Add Branding Engine

-- 1. Add primary_color to organizations table
ALTER TABLE public.organizations 
ADD COLUMN IF NOT EXISTS primary_color text DEFAULT NULL;

-- 2. Create 'branding' storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public) 
VALUES ('branding', 'branding', true)
ON CONFLICT (id) DO NOTHING;

-- 3. Set up Storage RLS for branding bucket
-- Allow public read access to branding images
DROP POLICY IF EXISTS "Public branding access" ON storage.objects;
CREATE POLICY "Public branding access" ON storage.objects
FOR SELECT USING (bucket_id = 'branding');

-- Allow super admins to upload branding images
DROP POLICY IF EXISTS "Super Admins can upload branding" ON storage.objects;
CREATE POLICY "Super Admins can upload branding" ON storage.objects
FOR INSERT TO authenticated WITH CHECK (
  bucket_id = 'branding' 
  AND (
    EXISTS (
      SELECT 1 FROM public.employees 
      WHERE user_id = auth.uid() 
      AND role = 'super_admin'
    )
  )
);

-- Allow super admins to update branding images
DROP POLICY IF EXISTS "Super Admins can update branding" ON storage.objects;
CREATE POLICY "Super Admins can update branding" ON storage.objects
FOR UPDATE TO authenticated USING (
  bucket_id = 'branding' 
  AND (
    EXISTS (
      SELECT 1 FROM public.employees 
      WHERE user_id = auth.uid() 
      AND role = 'super_admin'
    )
  )
);

-- Allow super admins to delete branding images
DROP POLICY IF EXISTS "Super Admins can delete branding" ON storage.objects;
CREATE POLICY "Super Admins can delete branding" ON storage.objects
FOR DELETE TO authenticated USING (
  bucket_id = 'branding' 
  AND (
    EXISTS (
      SELECT 1 FROM public.employees 
      WHERE user_id = auth.uid() 
      AND role = 'super_admin'
    )
  )
);
