const SUPABASE_URL = 'https://nglwscakhhdhelhbqkyb.supabase.co';
const SUPABASE_KEY = 'sb_publishable_3fJ0EGv8wuNn1J95sj1G1A_21WFWOR2';

async function check() {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/atendimento_config?chave=eq.menu_principal`, {
        headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`,
        },
    });
    const data = await res.json();
    console.log(JSON.stringify(data[0].conteudo, null, 2));
}
check();
