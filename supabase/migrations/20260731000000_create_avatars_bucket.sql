-- Create the storage bucket for employee avatars
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Storage Policies for 'avatars'

-- 1. (Removed) Public buckets do not need a SELECT policy for object URL access.
-- The broad SELECT policy was removed to prevent clients from listing all files,
-- fixing the Supabase security warning.

-- 2. Allow authenticated users to insert their own avatars (or HR to insert)
-- We will just allow any authenticated user to upload to avatars for simplicity in this capstone,
-- normally you'd restrict by user_id or HR roles.
CREATE POLICY "Authenticated users can upload avatars"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK ( bucket_id = 'avatars' );

-- 3. Allow authenticated users to update avatars
CREATE POLICY "Authenticated users can update avatars"
ON storage.objects FOR UPDATE
TO authenticated
USING ( bucket_id = 'avatars' );

-- 4. Allow authenticated users to delete avatars
CREATE POLICY "Authenticated users can delete avatars"
ON storage.objects FOR DELETE
TO authenticated
USING ( bucket_id = 'avatars' );
