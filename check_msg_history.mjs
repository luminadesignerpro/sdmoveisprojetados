const SUPABASE_URL = 'https://nglwscakhhdhelhbqkyb.supabase.co';
const SUPABASE_KEY = 'sb_publishable_3fJ0EGv8wuNn1J95sj1G1A_21WFWOR2';

async function checkHistory() {
    // Busca a conversa do Samuel David (pelo JID dele se possível, ou pelo nome)
    const convRes = await fetch(`${SUPABASE_URL}/rest/v1/whatsapp_conversations?contact_name=ilike.*Samuel*&order=last_message_at.desc&limit=1`, {
        headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
    });
    const convs = await convRes.json();
    if (convs.length === 0) { console.log('Conversa não encontrada'); return; }
    
    const convId = convs[0].id;
    console.log('Conversation ID:', convId);

    const msgRes = await fetch(`${SUPABASE_URL}/rest/v1/whatsapp_messages?conversation_id=eq.${convId}&order=created_at.desc&limit=5`, {
        headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
    });
    const msgs = await msgRes.json();
    console.log('Last messages:', JSON.stringify(msgs, null, 2));
}
checkHistory();
