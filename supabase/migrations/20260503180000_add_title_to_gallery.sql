
-- Add title column to project_gallery
ALTER TABLE public.project_gallery ADD COLUMN IF NOT EXISTS title TEXT;

-- Ensure RLS is still correct (should be handled by previous migrations, but safe to repeat)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'project_gallery' AND policyname = 'Authenticated users can manage project_gallery'
    ) THEN
        CREATE POLICY "Authenticated users can manage project_gallery" 
        ON public.project_gallery 
        FOR ALL 
        TO authenticated 
        USING (true) 
        WITH CHECK (true);
    END IF;
END $$;
