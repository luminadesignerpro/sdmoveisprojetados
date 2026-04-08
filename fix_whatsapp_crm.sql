-- Fix WhatsApp CRM: add external_id for deduplication (run once in Supabase SQL editor)
-- This prevents duplicate messages when the Evolution API fires the webhook twice

ALTER TABLE whatsapp_messages 
  ADD COLUMN IF NOT EXISTS external_id TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS whatsapp_messages_external_id_unique 
  ON whatsapp_messages (external_id) 
  WHERE external_id IS NOT NULL;

-- Also add lead_score and ai_summary columns if not already present
ALTER TABLE whatsapp_conversations
  ADD COLUMN IF NOT EXISTS lead_score INTEGER DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS ai_summary TEXT DEFAULT NULL;

-- Verify
SELECT column_name, data_type FROM information_schema.columns 
WHERE table_name IN ('whatsapp_messages', 'whatsapp_conversations')
ORDER BY table_name, column_name;
