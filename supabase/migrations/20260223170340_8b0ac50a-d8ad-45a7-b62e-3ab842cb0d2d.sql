
-- Employees table
CREATE TABLE public.employees (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT,
  phone TEXT,
  hourly_rate NUMERIC NOT NULL DEFAULT 15.00,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Employees are viewable by authenticated users"
  ON public.employees FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Employees can be managed by authenticated users"
  ON public.employees FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- Time entries table
CREATE TABLE public.time_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  clock_in TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  clock_out TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.time_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Time entries are viewable by authenticated users"
  ON public.time_entries FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Time entries can be managed by authenticated users"
  ON public.time_entries FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- Advance requests (vale/adiantamento)
CREATE TABLE public.advance_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.advance_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Advance requests are viewable by authenticated users"
  ON public.advance_requests FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Advance requests can be managed by authenticated users"
  ON public.advance_requests FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- Employee adjustments (horas extras, vale combustível, etc.)
CREATE TABLE public.employee_adjustments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'overtime',
  description TEXT,
  amount NUMERIC NOT NULL DEFAULT 0,
  hours NUMERIC NOT NULL DEFAULT 0,
  reference_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.employee_adjustments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Adjustments are viewable by authenticated users"
  ON public.employee_adjustments FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Adjustments can be managed by authenticated users"
  ON public.employee_adjustments FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);
