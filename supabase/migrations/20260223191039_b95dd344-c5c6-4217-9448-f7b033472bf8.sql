
-- Fuel logs table
CREATE TABLE public.fuel_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES public.employees(id),
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id),
  trip_id UUID REFERENCES public.trips(id),
  liters NUMERIC NOT NULL,
  price_per_liter NUMERIC NOT NULL DEFAULT 0,
  total_cost NUMERIC NOT NULL DEFAULT 0,
  odometer NUMERIC,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.fuel_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to fuel_logs" ON public.fuel_logs FOR ALL USING (true) WITH CHECK (true);

-- Tool inventory table
CREATE TABLE public.tool_inventory (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES public.employees(id),
  name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  condition TEXT NOT NULL DEFAULT 'good',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.tool_inventory ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to tool_inventory" ON public.tool_inventory FOR ALL USING (true) WITH CHECK (true);
