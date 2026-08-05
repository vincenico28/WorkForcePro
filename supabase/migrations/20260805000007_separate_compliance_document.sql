-- Separate Compliance Document Field
-- Allows tracking the follow-up compliance document separately from the original attachment.

ALTER TABLE public.leave_requests
  ADD COLUMN IF NOT EXISTS compliance_document_url text;
