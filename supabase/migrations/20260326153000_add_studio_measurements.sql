-- Studio Measurements for Promob Integration
CREATE TABLE public.studio_measurements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_name TEXT,
  ambiente TEXT,
  dimensions JSONB,
  items JSONB,
  image_url TEXT,
  simulation_url TEXT,
  status TEXT DEFAULT 'pending_promob',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.studio_measurements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to studio_measurements" ON public.studio_measurements FOR ALL USING (true) WITH CHECK (true);
