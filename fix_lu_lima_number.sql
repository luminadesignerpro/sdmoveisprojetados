-- ============================================
-- FIX: Corrigir número da Lu Lima no CRM
-- ============================================

-- 1. PRIMEIRO: Ver todas as conversas com números potencialmente errados
SELECT id, contact_name, phone_number, LENGTH(phone_number) as digits, 
       last_message_at, status
FROM whatsapp_conversations
ORDER BY last_message_at DESC;

-- 2. Verificar especificamente a conversa da Lu Lima
SELECT id, contact_name, phone_number, last_message_at
FROM whatsapp_conversations
WHERE contact_name ILIKE '%lu%' OR contact_name ILIKE '%lima%' OR phone_number LIKE '%18367588012778%';

-- 3. Ver números que parecem inválidos (mais de 13 dígitos ou que não começam com 55)
SELECT id, contact_name, phone_number, LENGTH(phone_number) as digits
FROM whatsapp_conversations
WHERE LENGTH(phone_number) > 13 OR (LENGTH(phone_number) >= 10 AND phone_number NOT LIKE '55%');

-- ============================================
-- AÇÃO: Atualizar o número da Lu Lima 
-- SUBSTITUA 'NUMERO_CORRETO' pelo número real
-- Formato: 55 + DDD + NUMERO (ex: 5585999887766)
-- ============================================

-- DESCOMENTE E ALTERE a linha abaixo com o número correto:
-- UPDATE whatsapp_conversations 
-- SET phone_number = '55XXXXXXXXXXX'
-- WHERE phone_number = '18367588012778';

-- Para manter as mensagens existentes vinculadas, NÃO delete a conversa.
-- Apenas corrija o número.
