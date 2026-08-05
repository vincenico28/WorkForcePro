-- Update Performance Review Ratings to Specific Categories

-- 1. Add new specific rating columns
ALTER TABLE public.performance_reviews
  ADD COLUMN IF NOT EXISTS job_knowledge_rating numeric(3,1),
  ADD COLUMN IF NOT EXISTS work_quality_rating numeric(3,1),
  ADD COLUMN IF NOT EXISTS attendance_rating numeric(3,1),
  ADD COLUMN IF NOT EXISTS initiative_rating numeric(3,1);

-- 2. Drop old generalized rating columns
ALTER TABLE public.performance_reviews 
  DROP COLUMN IF EXISTS goals_met,
  DROP COLUMN IF EXISTS communication_rating,
  DROP COLUMN IF EXISTS technical_rating;

-- 3. (Optional) Initialize new columns for existing rows with average values
-- Since this is an MVP, we can just leave them as NULL or set them to overall_rating
UPDATE public.performance_reviews
SET 
  job_knowledge_rating = COALESCE(overall_rating, 3.5),
  work_quality_rating = COALESCE(overall_rating, 3.5),
  attendance_rating = COALESCE(overall_rating, 3.5),
  initiative_rating = COALESCE(overall_rating, 3.5),
  teamwork_rating = COALESCE(teamwork_rating, COALESCE(overall_rating, 3.5))
WHERE job_knowledge_rating IS NULL;
