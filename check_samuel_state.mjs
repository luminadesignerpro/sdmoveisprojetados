const SUPABASE_URL = 'https://nglwscakhhdhelhbqkyb.supabase.co';
const SUPABASE_KEY = 'sb_publishable_3fJ0EGv8wuNn1J95sj1G1A_21WFWOR2';

async function checkState() {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/whatsapp_conversations?phone_number=ilike.*2237*&select=ai_summary`, {
        headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
    });
    const d = await res.json();
    console.log('Current State for Samuel:', d[0]?.ai_summary);
}
checkState();
