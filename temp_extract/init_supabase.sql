-- 1. Enable pgcrypto for UUID generation
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. Generic function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 3. Core Users & Employees
CREATE TABLE public.app_users (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'EMPLOYEE',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.app_users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to app_users" ON public.app_users FOR ALL USING (true) WITH CHECK (true);
CREATE TRIGGER update_app_users_updated_at BEFORE UPDATE ON public.app_users FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.employees (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT,
  phone TEXT,
  hourly_rate NUMERIC NOT NULL DEFAULT 15.00,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to employees" ON public.employees FOR ALL USING (true) WITH CHECK (true);

-- 4. Clients and Projects
CREATE TABLE public.clients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  address TEXT,
  document TEXT,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to clients" ON public.clients FOR ALL USING (true) WITH CHECK (true);
CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON public.clients FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.client_projects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID REFERENCES public.clients(id),
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'pending',
  value NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.client_projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to client_projects" ON public.client_projects FOR ALL USING (true) WITH CHECK (true);
CREATE TRIGGER update_client_projects_updated_at BEFORE UPDATE ON public.client_projects FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5. Suppliers and Products
CREATE TABLE public.suppliers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  cnpj TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  category TEXT DEFAULT 'Geral',
  notes TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to suppliers" ON public.suppliers FOR ALL USING (true) WITH CHECK (true);
CREATE TRIGGER update_suppliers_updated_at BEFORE UPDATE ON public.suppliers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  sku TEXT,
  category TEXT DEFAULT 'Geral',
  unit TEXT DEFAULT 'un',
  cost_price NUMERIC NOT NULL DEFAULT 0,
  sell_price NUMERIC NOT NULL DEFAULT 0,
  stock_quantity NUMERIC NOT NULL DEFAULT 0,
  min_stock NUMERIC NOT NULL DEFAULT 0,
  supplier_id UUID REFERENCES public.suppliers(id),
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to products" ON public.products FOR ALL USING (true) WITH CHECK (true);
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 6. Financial Operations
CREATE TABLE public.cash_register (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL DEFAULT 'entrada',
  category TEXT NOT NULL DEFAULT 'Geral',
  description TEXT NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  payment_method TEXT DEFAULT 'dinheiro',
  reference_id UUID,
  reference_type TEXT,
  date TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.cash_register ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to cash_register" ON public.cash_register FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE public.accounts_payable (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  supplier_id UUID REFERENCES public.suppliers(id),
  description TEXT NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  due_date DATE NOT NULL,
  paid BOOLEAN NOT NULL DEFAULT false,
  paid_at TIMESTAMPTZ,
  category TEXT DEFAULT 'Geral',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.accounts_payable ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to accounts_payable" ON public.accounts_payable FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE public.accounts_receivable (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID REFERENCES public.clients(id),
  project_id UUID REFERENCES public.client_projects(id),
  description TEXT NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  due_date DATE NOT NULL,
  received BOOLEAN NOT NULL DEFAULT false,
  received_at TIMESTAMPTZ,
  category TEXT DEFAULT 'Geral',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.accounts_receivable ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to accounts_receivable" ON public.accounts_receivable FOR ALL USING (true) WITH CHECK (true);

-- 7. Employee Time Tracking & Requests
CREATE TABLE public.time_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  clock_in TIMESTAMPTZ NOT NULL DEFAULT now(),
  clock_out TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.time_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to time_entries" ON public.time_entries FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE public.advance_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.advance_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to advance_requests" ON public.advance_requests FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE public.employee_adjustments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'overtime',
  description TEXT,
  amount NUMERIC NOT NULL DEFAULT 0,
  hours NUMERIC NOT NULL DEFAULT 0,
  reference_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.employee_adjustments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to employee_adjustments" ON public.employee_adjustments FOR ALL USING (true) WITH CHECK (true);

-- 8. Vehicles and Trips
CREATE TABLE public.vehicles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  plate TEXT NOT NULL,
  model TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to vehicles" ON public.vehicles FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE public.trips (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vehicle_id UUID REFERENCES public.vehicles(id),
  employee_id UUID REFERENCES public.employees(id),
  start_time TIMESTAMPTZ NOT NULL DEFAULT now(),
  end_time TIMESTAMPTZ,
  start_km NUMERIC,
  end_km NUMERIC,
  status TEXT DEFAULT 'in_progress',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to trips" ON public.trips FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE public.trip_locations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_id UUID REFERENCES public.trips(id) ON DELETE CASCADE,
  latitude NUMERIC,
  longitude NUMERIC,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.trip_locations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to trip_locations" ON public.trip_locations FOR ALL USING (true) WITH CHECK (true);

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
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.fuel_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to fuel_logs" ON public.fuel_logs FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE public.trip_checklists (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_id UUID REFERENCES public.trips(id),
  item TEXT,
  is_ok BOOLEAN,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.trip_checklists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to trip_checklists" ON public.trip_checklists FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE public.trip_incidents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_id UUID REFERENCES public.trips(id),
  description TEXT,
  severity TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.trip_incidents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to trip_incidents" ON public.trip_incidents FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE public.trip_photos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_id UUID REFERENCES public.trips(id),
  photo_url TEXT,
  type TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.trip_photos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to trip_photos" ON public.trip_photos FOR ALL USING (true) WITH CHECK (true);

-- 9. Other Project Tables
CREATE TABLE public.project_costs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES public.client_projects(id),
  description TEXT,
  amount NUMERIC,
  date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.project_costs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to project_costs" ON public.project_costs FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE public.project_gallery (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES public.client_projects(id),
  image_url TEXT,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.project_gallery ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to project_gallery" ON public.project_gallery FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE public.project_installments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES public.client_projects(id),
  installment_number INTEGER,
  amount NUMERIC,
  due_date DATE,
  paid BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.project_installments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to project_installments" ON public.project_installments FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE public.project_production_steps (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES public.client_projects(id),
  step_name TEXT,
  status TEXT DEFAULT 'pending',
  sort_order INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.project_production_steps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to project_production_steps" ON public.project_production_steps FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE public.project_timeline (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES public.client_projects(id),
  event_name TEXT,
  event_date DATE,
  sort_order INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.project_timeline ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to project_timeline" ON public.project_timeline FOR ALL USING (true) WITH CHECK (true);

-- 10. Orders and Contracts
CREATE TABLE public.service_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_number SERIAL,
  client_id UUID REFERENCES public.clients(id),
  project_id UUID REFERENCES public.client_projects(id),
  description TEXT,
  status TEXT NOT NULL DEFAULT 'aberta',
  priority TEXT NOT NULL DEFAULT 'normal',
  assigned_to UUID REFERENCES public.employees(id),
  estimated_date TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  total_value NUMERIC NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.service_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to service_orders" ON public.service_orders FOR ALL USING (true) WITH CHECK (true);
CREATE TRIGGER update_service_orders_updated_at BEFORE UPDATE ON public.service_orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.contracts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contract_number SERIAL,
  client_id UUID REFERENCES public.clients(id),
  project_id UUID REFERENCES public.client_projects(id),
  title TEXT NOT NULL,
  content TEXT,
  value NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'rascunho',
  signed_at TIMESTAMPTZ,
  valid_until TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to contracts" ON public.contracts FOR ALL USING (true) WITH CHECK (true);
CREATE TRIGGER update_contracts_updated_at BEFORE UPDATE ON public.contracts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.tool_inventory (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES public.employees(id),
  name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  condition TEXT NOT NULL DEFAULT 'good',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.tool_inventory ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to tool_inventory" ON public.tool_inventory FOR ALL USING (true) WITH CHECK (true);

-- 11. Quality Control
CREATE TABLE public.quality_checklists (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES public.client_projects(id),
  inspector_name TEXT,
  date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.quality_checklists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to quality_checklists" ON public.quality_checklists FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE public.quality_check_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  checklist_id UUID REFERENCES public.quality_checklists(id),
  item_name TEXT,
  is_ok BOOLEAN,
  observation TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.quality_check_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to quality_check_items" ON public.quality_check_items FOR ALL USING (true) WITH CHECK (true);

-- 12. WhatsApp Integrations
CREATE TABLE public.whatsapp_conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_phone TEXT NOT NULL UNIQUE,
  client_name TEXT,
  last_message TEXT,
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  unread_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.whatsapp_conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to whatsapp_conversations" ON public.whatsapp_conversations FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE public.whatsapp_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID REFERENCES public.whatsapp_conversations(id),
  sender TEXT NOT NULL,
  content TEXT NOT NULL,
  status TEXT DEFAULT 'sent',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to whatsapp_messages" ON public.whatsapp_messages FOR ALL USING (true) WITH CHECK (true);
