-- Add email and password columns to employees table
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS password TEXT;

-- We don't use Supabase Auth for employees to keep it simple, 
-- but these columns are needed for the built-in login logic in TimeTrackingPanel and UserManagement.
