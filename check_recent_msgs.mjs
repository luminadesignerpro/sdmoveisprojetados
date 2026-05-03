const SUPABASE_URL = 'https://nglwscakhhdhelhbqkyb.supabase.co';
const SUPABASE_KEY = 'sb_publishable_3fJ0EGv8wuNn1J95sj1G1A_21WFWOR2';

async function checkMsgs() {
    const convId = '7d91be3b-533a-4b79-bbd8-ad49e2e86035';
    const res = await fetch(`${SUPABASE_URL}/rest/v1/whatsapp_messages?conversation_id=eq.${convId}&order=created_at.desc&limit=10`, {
        headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
    });
    const msgs = await res.json();
    console.log('Recent messages:', msgs.map(m => `${m.direction}: ${m.content}`));
}
checkMsgs();
