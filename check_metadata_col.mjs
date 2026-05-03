const SUPABASE_URL = 'https://nglwscakhhdhelhbqkyb.supabase.co';
const SUPABASE_KEY = 'sb_publishable_3fJ0EGv8wuNn1J95sj1G1A_21WFWOR2';

async function runSql() {
    // Note: We don't have exec_sql RPC usually unless we created it.
    // I'll try to just check if I can use the metadata column if it already exists or just use an existing column.
    // Let's check if 'metadata' exists.
    const res = await fetch(`${SUPABASE_URL}/rest/v1/whatsapp_conversations?select=metadata&limit=1`, {
        headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
    });
    if (res.ok) {
        console.log('Column metadata already exists or check failed gracefully.');
    } else {
        console.log('Column metadata might not exist. Status:', res.status);
    }
}
runSql();
