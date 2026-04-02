-- SQL to turbocharge WhatsApp conversations with AI Lead Scoring
ALTER TABLE public.whatsapp_conversations 
ADD COLUMN IF NOT EXISTS lead_score NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS ai_summary TEXT;

-- Update status to support 'hot' leads
-- (Check if status column exists first, usually it does)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='whatsapp_conversations' AND column_name='status') THEN
        ALTER TABLE public.whatsapp_conversations ADD COLUMN status TEXT DEFAULT 'active';
    END IF;
END $$;
