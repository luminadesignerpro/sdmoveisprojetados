
-- HARDENING RLS POLICIES
-- Reverte políticas "Allow All" para "Authenticated Only" em todas as tabelas críticas

DO $$
DECLARE
    t text;
    tables text[] := ARRAY[
        'employees', 'time_entries', 'advance_requests', 'employee_adjustments',
        'trips', 'trip_checklists', 'trip_incidents', 'trip_locations', 'trip_photos',
        'vehicles', 'clients', 'client_projects', 'project_costs', 'project_gallery',
        'project_installments', 'project_production_steps', 'project_timeline',
        'quality_checklists', 'quality_check_items', 'whatsapp_conversations',
        'whatsapp_messages', 'suppliers', 'products', 'service_orders',
        'cash_register', 'accounts_payable', 'accounts_receivable', 'contracts',
        'atendimento_config'
    ];
BEGIN
    FOREACH t IN ARRAY tables LOOP
        -- Remove políticas permissivas antigas
        EXECUTE format('DROP POLICY IF EXISTS "Allow all access to %s" ON public.%s', t, t);
        EXECUTE format('DROP POLICY IF EXISTS "Allow all for authenticated" ON public.%s', t, t);
        EXECUTE format('DROP POLICY IF EXISTS "Allow all %s" ON public.%s', t, t);
        
        -- Garante que RLS está ativo
        EXECUTE format('ALTER TABLE public.%s ENABLE ROW LEVEL SECURITY', t);
        
        -- Cria nova política restrita para usuários autenticados
        EXECUTE format('
            CREATE POLICY "Authenticated users can manage %s" 
            ON public.%s 
            FOR ALL 
            TO authenticated 
            USING (true) 
            WITH CHECK (true)', t, t);
            
        RAISE NOTICE 'RLS Restrito aplicado à tabela: %', t;
    END LOOP;
END $$;
