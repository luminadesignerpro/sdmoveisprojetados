-- Garante que a tabela whatsapp_conversations tem todas as colunas necessárias
ALTER TABLE public.whatsapp_conversations
  ADD COLUMN IF NOT EXISTS phone_number TEXT,
  ADD COLUMN IF NOT EXISTS contact_name TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS lead_status TEXT DEFAULT 'lead',
  ADD COLUMN IF NOT EXISTS last_message_at TIMESTAMPTZ DEFAULT now(),
  ADD COLUMN IF NOT EXISTS lead_score INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ai_summary TEXT;

-- Garante índice único na phone_number para evitar duplicatas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'whatsapp_conversations' 
    AND indexname = 'whatsapp_conversations_phone_number_key'
  ) THEN
    ALTER TABLE public.whatsapp_conversations ADD CONSTRAINT whatsapp_conversations_phone_number_key UNIQUE (phone_number);
  END IF;
END$$;

-- Garante que a tabela whatsapp_messages tem external_id
ALTER TABLE public.whatsapp_messages
  ADD COLUMN IF NOT EXISTS external_id TEXT,
  ADD COLUMN IF NOT EXISTS message_type TEXT DEFAULT 'text';

-- RLS aberto (projeto privado)
ALTER TABLE public.whatsapp_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all whatsapp_conversations" ON public.whatsapp_conversations;
CREATE POLICY "Allow all whatsapp_conversations" ON public.whatsapp_conversations FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all whatsapp_messages" ON public.whatsapp_messages;
CREATE POLICY "Allow all whatsapp_messages" ON public.whatsapp_messages FOR ALL USING (true) WITH CHECK (true);
