-- ====================================================================
-- CLEANUP WHATSAPP DUPLICATES - RUN IN SUPABASE SQL EDITOR
-- ====================================================================
-- This script cleans duplicate conversations and messages caused by
-- inconsistent phone number formatting (searching by last 8 digits)
-- ====================================================================

-- ====================================================================
-- 1. IDENTIFY DUPLICATES BY PHONE NUMBER
-- ====================================================================
-- Check for duplicate conversations
SELECT phone_number, COUNT(*) as count, array_agg(id) as ids
FROM whatsapp_conversations
WHERE phone_number IS NOT NULL
GROUP BY phone_number
HAVING COUNT(*) > 1
ORDER BY count DESC;

-- ====================================================================
-- 2. CLEAN UP DUPLICATE CONVERSATIONS (KEEP MOST RECENT)
-- ====================================================================
DO $$ 
DECLARE
  dup_count INTEGER := 0;
BEGIN
  -- Delete older duplicates, keeping the one with most recent activity
  DELETE FROM whatsapp_conversations
  WHERE id IN (
    SELECT c1.id
    FROM whatsapp_conversations c1
    INNER JOIN whatsapp_conversations c2 ON c1.phone_number = c2.phone_number
    WHERE c1.id > c2.id  -- Delete the newer ID, keeping older
      AND c1.phone_number IS NOT NULL
      AND (c1.last_message_at IS NULL OR c2.last_message_at > c1.last_message_at)
  );

  GET DIAGNOSTICS dup_count = ROW_COUNT;
  RAISE NOTICE '[Cleanup] Removed % duplicate conversations', dup_count;
END $$;

-- ====================================================================
-- 3. ADD UNIQUE CONSTRAINT IF NOT EXISTS
-- ====================================================================
-- This prevents future duplicates
ALTER TABLE whatsapp_conversations 
ADD CONSTRAINT phone_number_unique UNIQUE (phone_number) 
ON CONFLICT DO NOTHING;

-- ====================================================================
-- 4. VERIFY PHONE NUMBER FORMAT CONSISTENCY
-- ====================================================================
-- Check for numbers without 55 prefix (should all start with 55)
SELECT COUNT(*) as count_without_55_prefix
FROM whatsapp_conversations
WHERE phone_number NOT LIKE '55%'
  AND phone_number IS NOT NULL;

-- Update any numbers missing 55 prefix
UPDATE whatsapp_conversations
SET phone_number = '55' || phone_number
WHERE phone_number NOT LIKE '55%'
  AND phone_number IS NOT NULL
  AND LENGTH(phone_number) = 11;

-- ====================================================================
-- 5. CLEAN UP DUPLICATE MESSAGES
-- ====================================================================
DO $$ 
DECLARE
  msg_dup_count INTEGER := 0;
BEGIN
  -- Find and remove exact duplicates (same conversation, direction, content, timestamp)
  WITH duplicates AS (
    SELECT 
      m1.id,
      ROW_NUMBER() OVER (
        PARTITION BY m1.conversation_id, m1.direction, m1.content, DATE_TRUNC('second', m1.created_at)
        ORDER BY m1.created_at DESC
      ) as rn
    FROM whatsapp_messages m1
  )
  DELETE FROM whatsapp_messages 
  WHERE id IN (SELECT id FROM duplicates WHERE rn > 1);

  GET DIAGNOSTICS msg_dup_count = ROW_COUNT;
  RAISE NOTICE '[Cleanup] Removed % duplicate messages', msg_dup_count;
END $$;

-- ====================================================================
-- 6. VERIFY EXTERNAL_ID UNIQUENESS
-- ====================================================================
-- Check for duplicate external_ids
SELECT external_id, COUNT(*) as count
FROM whatsapp_messages
WHERE external_id IS NOT NULL
GROUP BY external_id
HAVING COUNT(*) > 1;

-- ====================================================================
-- 7. REBUILD INDEXES FOR PERFORMANCE
-- ====================================================================
REINDEX INDEX IF EXISTS whatsapp_conversations_phone_number_unique;
REINDEX INDEX IF EXISTS whatsapp_messages_external_id_idx;
REINDEX INDEX IF EXISTS whatsapp_messages_conversation_id_idx;

-- ====================================================================
-- 8. SUMMARY STATS
-- ====================================================================
SELECT 
  (SELECT COUNT(*) FROM whatsapp_conversations) as total_conversations,
  (SELECT COUNT(*) FROM whatsapp_messages) as total_messages,
  (SELECT COUNT(DISTINCT conversation_id) FROM whatsapp_messages) as conversations_with_messages,
  (SELECT COUNT(*) FROM whatsapp_messages WHERE direction = 'inbound') as inbound_messages,
  (SELECT COUNT(*) FROM whatsapp_messages WHERE direction = 'outbound') as outbound_messages;

-- ====================================================================
-- DONE - Data is now clean and consistent!
-- ====================================================================
