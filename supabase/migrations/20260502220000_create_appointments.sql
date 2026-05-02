
-- Tabela de Agendamentos
CREATE TABLE IF NOT EXISTS public.appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
    project_id UUID REFERENCES public.client_projects(id) ON DELETE SET NULL,
    type TEXT NOT NULL DEFAULT 'visita_tecnica',
    title TEXT NOT NULL,
    description TEXT,
    preferred_date DATE NOT NULL,
    preferred_time TEXT NOT NULL DEFAULT '09:00',
    status TEXT NOT NULL DEFAULT 'pendente',
    admin_notes TEXT,
    client_name TEXT,
    client_address TEXT,
    client_phone TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

-- Política de acesso total (sem autenticação obrigatória para o app funcionar)
CREATE POLICY "Allow all access to appointments"
    ON public.appointments
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_appointments_updated_at
    BEFORE UPDATE ON public.appointments
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
