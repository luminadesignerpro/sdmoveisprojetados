-- SQL to create ar_measurements table in Supabase
-- Run this in the Supabase SQL Editor
CREATE TABLE IF NOT EXISTS public.ar_measurements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES public.client_projects(id),
  client_id UUID REFERENCES public.clients(id),
  title TEXT NOT NULL,
  data JSONB NOT NULL,
  total_value NUMERIC NOT NULL DEFAULT 0,
  screenshot_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ar_measurements ENABLE ROW LEVEL SECURITY;

-- Allow all access 
DROP POLICY IF EXISTS "Allow all access to ar_measurements" ON public.ar_measurements;
CREATE POLICY "Allow all access to ar_measurements" ON public.ar_measurements FOR ALL USING (true) WITH CHECK (true);
