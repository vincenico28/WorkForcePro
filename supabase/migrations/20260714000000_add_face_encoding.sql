-- Migration to add face recognition support for employees
ALTER TABLE employees ADD COLUMN IF NOT EXISTS face_encoding jsonb;
