-- Adicionar colunas faltantes para o CRM WhatsApp e Integração Local
ALTER TABLE public.whatsapp_messages ADD COLUMN IF NOT EXISTS external_id TEXT;
ALTER TABLE public.whatsapp_conversations ADD COLUMN IF NOT EXISTS lead_score INTEGER DEFAULT 0;
ALTER TABLE public.whatsapp_conversations ADD COLUMN IF NOT EXISTS ai_summary TEXT;

-- Garantir que a tabela de configuração de atendimento exista
CREATE TABLE IF NOT EXISTS public.atendimento_config (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    chave TEXT UNIQUE NOT NULL,
    conteudo JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ativar RLS se necessário
ALTER TABLE public.atendimento_config ENABLE ROW LEVEL SECURITY;

-- Política de acesso total (para este projeto específico)
DROP POLICY IF EXISTS "Acesso total atendimento_config" ON public.atendimento_config;
CREATE POLICY "Acesso total atendimento_config" ON public.atendimento_config FOR ALL USING (true) WITH CHECK (true);
