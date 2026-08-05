-- Create the leave_attachments bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('leave_attachments', 'leave_attachments', true)
ON CONFLICT (id) DO NOTHING;

-- Set up policies for the bucket
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Leave Attachments Public Read' AND tablename = 'objects' AND schemaname = 'storage') THEN
        CREATE POLICY "Leave Attachments Public Read" 
        ON storage.objects FOR SELECT 
        USING (bucket_id = 'leave_attachments');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Leave Attachments Authenticated Insert' AND tablename = 'objects' AND schemaname = 'storage') THEN
        CREATE POLICY "Leave Attachments Authenticated Insert" 
        ON storage.objects FOR INSERT 
        TO authenticated 
        WITH CHECK (bucket_id = 'leave_attachments');
    END IF;
END $$;
