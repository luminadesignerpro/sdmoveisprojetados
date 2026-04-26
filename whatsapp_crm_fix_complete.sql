-- ====================================================================
-- COMPLETE WHATSAPP CRM FIX - RUN IN SUPABASE SQL EDITOR
-- ====================================================================
-- This script fixes all known issues in the WhatsApp CRM system:
-- 1. Duplicate messages prevention via external_id
-- 2. Correct column naming (phone_number, contact_name)
-- 3. Proper data types and constraints
-- 4. Cleanup of duplicate entries
-- ====================================================================

-- ====================================================================
-- 1. ENSURE WHATSAPP_CONVERSATIONS TABLE STRUCTURE
-- ====================================================================
ALTER TABLE public.whatsapp_conversations 
  ADD COLUMN IF NOT EXISTS phone_number TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS contact_name TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS lead_status TEXT DEFAULT 'lead',
  ADD COLUMN IF NOT EXISTS last_message_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_message TEXT,
  ADD COLUMN IF NOT EXISTS unread_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS lead_score INTEGER,
  ADD COLUMN IF NOT EXISTS ai_summary TEXT;

-- ====================================================================
-- 2. ENSURE WHATSAPP_MESSAGES TABLE STRUCTURE
-- ====================================================================
ALTER TABLE public.whatsapp_messages
  ADD COLUMN IF NOT EXISTS direction TEXT CHECK (direction IN ('inbound', 'outbound')),
  ADD COLUMN IF NOT EXISTS message_type TEXT DEFAULT 'text',
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'sent',
  ADD COLUMN IF NOT EXISTS external_id TEXT;

-- ====================================================================
-- 3. ENSURE UNIQUE CONSTRAINT ON EXTERNAL_ID (PREVENTS DUPLICATES)
-- ====================================================================
-- Drop and recreate to handle NULL values properly
DROP INDEX IF EXISTS whatsapp_messages_external_id_idx;
CREATE UNIQUE INDEX IF NOT EXISTS whatsapp_messages_external_id_idx 
  ON whatsapp_messages (external_id) 
  WHERE external_id IS NOT NULL;

-- ====================================================================
-- 4. CLEANUP DUPLICATE MESSAGES (Keep most recent, remove older)
-- ====================================================================
DO $$ 
DECLARE
  dup_count INTEGER := 0;
BEGIN
  -- Find and remove exact duplicates (same conversation, direction, content, same second)
  WITH duplicates AS (
    SELECT 
      wm1.id,
      ROW_NUMBER() OVER (
        PARTITION BY wm1.conversation_id, wm1.direction, wm1.content, DATE_TRUNC('second', wm1.created_at)
        ORDER BY wm1.created_at DESC
      ) as rn
    FROM whatsapp_messages wm1
  )
  DELETE FROM whatsapp_messages 
  WHERE id IN (SELECT id FROM duplicates WHERE rn > 1);

  GET DIAGNOSTICS dup_count = ROW_COUNT;
  RAISE NOTICE '[Cleanup] Removed % duplicate messages', dup_count;
END $$;

-- ====================================================================
-- 5. MIGRATE OLD COLUMN NAMES IF THEY EXIST
-- ====================================================================
DO $$ 
BEGIN
    -- Migrate client_phone to phone_number
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name='whatsapp_conversations' AND column_name='client_phone') THEN
        UPDATE public.whatsapp_conversations 
        SET phone_number = client_phone 
        WHERE phone_number IS NULL AND client_phone IS NOT NULL;
        ALTER TABLE public.whatsapp_conversations DROP COLUMN client_phone;
        RAISE NOTICE '[Migration] Migrated client_phone → phone_number';
    END IF;

    -- Migrate client_name to contact_name
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name='whatsapp_conversations' AND column_name='client_name') THEN
        UPDATE public.whatsapp_conversations 
        SET contact_name = client_name 
        WHERE contact_name IS NULL AND client_name IS NOT NULL;
        ALTER TABLE public.whatsapp_conversations DROP COLUMN client_name;
        RAISE NOTICE '[Migration] Migrated client_name → contact_name';
    END IF;
END $$;

-- ====================================================================
-- 6. ADD UNIQUE CONSTRAINT ON PHONE_NUMBER
-- ====================================================================
DO $$ 
BEGIN
    IF NOT EXISTS (
      SELECT constraint_name FROM information_schema.constraint_column_usage 
      WHERE table_name = 'whatsapp_conversations' AND column_name = 'phone_number'
    ) THEN
      ALTER TABLE public.whatsapp_conversations 
      ADD CONSTRAINT whatsapp_conversations_phone_number_unique UNIQUE (phone_number);
      RAISE NOTICE '[Constraint] Added UNIQUE constraint on phone_number';
    END IF;
END $$;

-- ====================================================================
-- 7. ATENDIMENTO_CONFIG TABLE (Required for menu system)
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.atendimento_config (
    id BIGSERIAL PRIMARY KEY,
    chave TEXT UNIQUE NOT NULL,
    conteudo JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.atendimento_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to atendimento_config" ON public.atendimento_config 
  FOR ALL USING (true) WITH CHECK (true);

-- Insert default config if not exists
INSERT INTO public.atendimento_config (chave, conteudo)
VALUES (
  'menu_principal',
  '{
    "greeting": "Olá! 👋 Bem-vindo à SD Móveis!\nComo posso te ajudar?\n\n1️⃣ Orçamento\n2️⃣ Acompanhar projeto\n3️⃣ Pós-venda\n4️⃣ Falar com atendente",
    "responses": {
      "1": "Ótimo! Para fazer um orçamento, preciso saber:\n- Qual ambiente? (cozinha, quarto, sala, etc)\n- Aproximadamente qual o tamanho?",
      "2": "Qual é o seu nome ou número do projeto para consultarmos?",
      "3": "Qual é a sua dúvida sobre seu móvel? Estou aqui para ajudar!",
      "4": "Conectando com um atendente... Por favor, aguarde um momento."
    }
  }'::jsonb
)
ON CONFLICT (chave) DO NOTHING;

-- ====================================================================
-- 8. VERIFY FINAL SCHEMA
-- ====================================================================
SELECT 
  'whatsapp_conversations' as table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name IN ('whatsapp_conversations', 'whatsapp_messages')
ORDER BY table_name, ordinal_position;
