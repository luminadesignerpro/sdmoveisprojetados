-- COMPREHENSIVE WHATSAPP CRM SCHEMA FIX
-- Run this in your Supabase SQL Editor

-- 1. FIX WHATSAPP_CONVERSATIONS TABLE
ALTER TABLE public.whatsapp_conversations 
  ADD COLUMN IF NOT EXISTS phone_number TEXT,
  ADD COLUMN IF NOT EXISTS contact_name TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS lead_status TEXT DEFAULT 'lead',
  ADD COLUMN IF NOT EXISTS last_message_at TIMESTAMPTZ DEFAULT now(),
  ADD COLUMN IF NOT EXISTS last_message TEXT,
  ADD COLUMN IF NOT EXISTS unread_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS lead_score NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ai_summary TEXT;

-- Migration from old column names if they exist
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='whatsapp_conversations' AND column_name='client_phone') THEN
        UPDATE public.whatsapp_conversations SET phone_number = client_phone WHERE phone_number IS NULL;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='whatsapp_conversations' AND column_name='client_name') THEN
        UPDATE public.whatsapp_conversations SET contact_name = client_name WHERE contact_name IS NULL;
    END IF;
END $$;

-- 2. FIX WHATSAPP_MESSAGES TABLE
ALTER TABLE public.whatsapp_messages
  ADD COLUMN IF NOT EXISTS direction TEXT, -- 'inbound' or 'outbound'
  ADD COLUMN IF NOT EXISTS message_type TEXT DEFAULT 'text', -- 'text', 'ai', 'image', 'document'
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'sent',
  ADD COLUMN IF NOT EXISTS external_id TEXT;

-- Migration for 'sender' to 'direction' logic
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='whatsapp_messages' AND column_name='sender') THEN
        -- If sender was 'me' or similar, it's outbound
        UPDATE public.whatsapp_messages SET direction = 'outbound' WHERE sender ILIKE '%me%' AND direction IS NULL;
        UPDATE public.whatsapp_messages SET direction = 'inbound' WHERE sender NOT ILIKE '%me%' AND direction IS NULL;
    END IF;
END $$;

-- 3. ENSURE UNIQUE INDEXES FOR DEDUPLICATION
CREATE UNIQUE INDEX IF NOT EXISTS whatsapp_messages_external_id_idx 
  ON whatsapp_messages (external_id) 
  WHERE external_id IS NOT NULL;

-- 4. ATENDIMENTO CONFIG TABLE (Required for the menu logic)
CREATE TABLE IF NOT EXISTS public.atendimento_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chave TEXT UNIQUE NOT NULL,
    conteudo JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Insert default menu if missing
INSERT INTO public.atendimento_config (chave, conteudo)
VALUES ('menu_principal', '{
    "greeting": "Olá! 👋 Bem-vindo à *SD Móveis Projetados*!\nComo posso te ajudar hoje?\n\n1️⃣ Orçamento\n2️⃣ Acompanhar projeto\n3️⃣ Pós-venda\n4️⃣ Falar com atendente",
    "responses": {
        "1": "Ótimo! Para orçamentos, por favor me envie fotos do ambiente e as medidas aproximadas. 📸📏",
        "2": "Vou verificar o status do seu projeto. Pode me passar seu nome completo ou número do pedido? 🔍",
        "3": "Sentimos muito por qualquer inconveniente. Um atendente humano irá te chamar em breve para resolver seu caso. 🛠️",
        "4": "Entendido. Um de nossos especialistas entrará em contato em alguns minutos. Aguarde, por favor. 👨‍💻"
    }
}')
ON CONFLICT (chave) DO NOTHING;

-- 5. ENABLE REALTIME
-- Check if the publication exists first
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;
END $$;

-- Add tables to realtime
ALTER PUBLICATION supabase_realtime ADD TABLE whatsapp_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE whatsapp_conversations;

-- Verify
SELECT table_name, column_name, data_type 
FROM information_schema.columns 
WHERE table_name IN ('whatsapp_messages', 'whatsapp_conversations')
ORDER BY table_name, column_name;
