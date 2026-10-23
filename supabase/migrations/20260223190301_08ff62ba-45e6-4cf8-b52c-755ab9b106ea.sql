
-- Drop restrictive policies and create permissive ones for all main tables

-- employees
DROP POLICY IF EXISTS "Employees are viewable by authenticated users" ON public.employees;
DROP POLICY IF EXISTS "Employees can be managed by authenticated users" ON public.employees;
CREATE POLICY "Allow all access to employees" ON public.employees FOR ALL USING (true) WITH CHECK (true);

-- time_entries
DROP POLICY IF EXISTS "Time entries are viewable by authenticated users" ON public.time_entries;
DROP POLICY IF EXISTS "Time entries can be managed by authenticated users" ON public.time_entries;
CREATE POLICY "Allow all access to time_entries" ON public.time_entries FOR ALL USING (true) WITH CHECK (true);

-- advance_requests
DROP POLICY IF EXISTS "Advance requests are viewable by authenticated users" ON public.advance_requests;
DROP POLICY IF EXISTS "Advance requests can be managed by authenticated users" ON public.advance_requests;
CREATE POLICY "Allow all access to advance_requests" ON public.advance_requests FOR ALL USING (true) WITH CHECK (true);

-- employee_adjustments
DROP POLICY IF EXISTS "Adjustments are viewable by authenticated users" ON public.employee_adjustments;
DROP POLICY IF EXISTS "Adjustments can be managed by authenticated users" ON public.employee_adjustments;
CREATE POLICY "Allow all access to employee_adjustments" ON public.employee_adjustments FOR ALL USING (true) WITH CHECK (true);

-- trips
DROP POLICY IF EXISTS "Allow all for authenticated" ON public.trips;
CREATE POLICY "Allow all access to trips" ON public.trips FOR ALL USING (true) WITH CHECK (true);

-- trip_checklists
DROP POLICY IF EXISTS "Allow all for authenticated" ON public.trip_checklists;
CREATE POLICY "Allow all access to trip_checklists" ON public.trip_checklists FOR ALL USING (true) WITH CHECK (true);

-- trip_incidents
DROP POLICY IF EXISTS "Allow all for authenticated" ON public.trip_incidents;
CREATE POLICY "Allow all access to trip_incidents" ON public.trip_incidents FOR ALL USING (true) WITH CHECK (true);

-- trip_locations
DROP POLICY IF EXISTS "Allow all for authenticated" ON public.trip_locations;
CREATE POLICY "Allow all access to trip_locations" ON public.trip_locations FOR ALL USING (true) WITH CHECK (true);

-- trip_photos
DROP POLICY IF EXISTS "Allow all for authenticated" ON public.trip_photos;
CREATE POLICY "Allow all access to trip_photos" ON public.trip_photos FOR ALL USING (true) WITH CHECK (true);

-- vehicles
DROP POLICY IF EXISTS "Allow all for authenticated" ON public.vehicles;
CREATE POLICY "Allow all access to vehicles" ON public.vehicles FOR ALL USING (true) WITH CHECK (true);

-- clients
DROP POLICY IF EXISTS "Allow all for authenticated" ON public.clients;
CREATE POLICY "Allow all access to clients" ON public.clients FOR ALL USING (true) WITH CHECK (true);

-- client_projects
DROP POLICY IF EXISTS "Allow all for authenticated" ON public.client_projects;
CREATE POLICY "Allow all access to client_projects" ON public.client_projects FOR ALL USING (true) WITH CHECK (true);

-- project_costs
DROP POLICY IF EXISTS "Allow all for authenticated" ON public.project_costs;
CREATE POLICY "Allow all access to project_costs" ON public.project_costs FOR ALL USING (true) WITH CHECK (true);

-- project_gallery
DROP POLICY IF EXISTS "Allow all for authenticated" ON public.project_gallery;
CREATE POLICY "Allow all access to project_gallery" ON public.project_gallery FOR ALL USING (true) WITH CHECK (true);

-- project_installments
DROP POLICY IF EXISTS "Allow all for authenticated" ON public.project_installments;
CREATE POLICY "Allow all access to project_installments" ON public.project_installments FOR ALL USING (true) WITH CHECK (true);

-- project_production_steps
DROP POLICY IF EXISTS "Allow all for authenticated" ON public.project_production_steps;
CREATE POLICY "Allow all access to project_production_steps" ON public.project_production_steps FOR ALL USING (true) WITH CHECK (true);

-- project_timeline
DROP POLICY IF EXISTS "Allow all for authenticated" ON public.project_timeline;
CREATE POLICY "Allow all access to project_timeline" ON public.project_timeline FOR ALL USING (true) WITH CHECK (true);

-- quality_checklists
DROP POLICY IF EXISTS "Allow all for authenticated" ON public.quality_checklists;
CREATE POLICY "Allow all access to quality_checklists" ON public.quality_checklists FOR ALL USING (true) WITH CHECK (true);

-- quality_check_items
DROP POLICY IF EXISTS "Allow all for authenticated" ON public.quality_check_items;
CREATE POLICY "Allow all access to quality_check_items" ON public.quality_check_items FOR ALL USING (true) WITH CHECK (true);

-- whatsapp_conversations
DROP POLICY IF EXISTS "Allow all for authenticated" ON public.whatsapp_conversations;
CREATE POLICY "Allow all access to whatsapp_conversations" ON public.whatsapp_conversations FOR ALL USING (true) WITH CHECK (true);

-- whatsapp_messages
DROP POLICY IF EXISTS "Allow all for authenticated" ON public.whatsapp_messages;
CREATE POLICY "Allow all access to whatsapp_messages" ON public.whatsapp_messages FOR ALL USING (true) WITH CHECK (true);
