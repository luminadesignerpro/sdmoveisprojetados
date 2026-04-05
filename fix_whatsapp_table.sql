-- Fix column name mismatch in whatsapp_conversations table
DO $$ 
BEGIN
    -- Rename client_phone to phone_number if it exists
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='whatsapp_conversations' AND column_name='client_phone') THEN
        ALTER TABLE public.whatsapp_conversations RENAME COLUMN client_phone TO phone_number;
    END IF;

    -- Ensure contact_name exists (webhook uses contact_name, init_supabase used client_name)
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='whatsapp_conversations' AND column_name='client_name') THEN
        ALTER TABLE public.whatsapp_conversations RENAME COLUMN client_name TO contact_name;
    END IF;
END $$;
