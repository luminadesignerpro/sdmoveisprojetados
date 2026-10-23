-- Create itens_projeto table to store items from Service Orders
CREATE TABLE IF NOT EXISTS public.itens_projeto (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  service_order_id UUID REFERENCES public.service_orders(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  unit_value NUMERIC NOT NULL DEFAULT 0,
  quantity NUMERIC NOT NULL DEFAULT 1,
  total_value NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.itens_projeto ENABLE ROW LEVEL SECURITY;

-- Allow all access for now (consistent with the rest of the project's policies)
DROP POLICY IF EXISTS "Allow all access to itens_projeto" ON public.itens_projeto;
CREATE POLICY "Allow all access to itens_projeto" ON public.itens_projeto FOR ALL USING (true) WITH CHECK (true);

-- Add full-text search index if needed, or just standard indexes
CREATE INDEX IF NOT EXISTS idx_itens_projeto_service_order_id ON public.itens_projeto(service_order_id);
