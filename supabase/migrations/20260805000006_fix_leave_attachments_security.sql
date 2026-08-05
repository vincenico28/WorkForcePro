-- Fix Security Warning: Public Bucket Allows Listing
-- Public buckets do not need a SELECT policy on storage.objects for users to read files via getPublicUrl.
-- Keeping the SELECT policy allows any client to list ALL files in the bucket, exposing private compliance documents.

DROP POLICY IF EXISTS "Leave Attachments Public Read" ON storage.objects;
