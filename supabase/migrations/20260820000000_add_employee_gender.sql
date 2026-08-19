-- Add gender column to employees table if not exists
ALTER TABLE public.employees 
ADD COLUMN IF NOT EXISTS gender TEXT DEFAULT 'unspecified';

-- Set a comment for documentation
COMMENT ON COLUMN public.employees.gender IS 'Employee gender: male, female, other, unspecified';
