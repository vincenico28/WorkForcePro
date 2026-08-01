-- Drop the broad SELECT policy that causes the security warning
DROP POLICY IF EXISTS "Public branding access" ON storage.objects;
