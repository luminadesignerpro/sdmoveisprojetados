const SUPABASE_URL = 'https://nglwscakhhdhelhbqkyb.supabase.co';
const SUPABASE_KEY = 'sb_publishable_3fJ0EGv8wuNn1J95sj1G1A_21WFWOR2';

async function testSimple() {
    console.log('Simplificando opção 2 para teste...');
    const res = await fetch(`${SUPABASE_URL}/rest/v1/atendimento_config?chave=eq.menu_principal`, {
        headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`,
        },
    });
    const data = await res.json();
    const config = data[0].conteudo;
    
    config.responses["2"] = "Perfeito! Vou verificar o andamento do seu projeto. 📋 Por favor, me informe seu *nome completo* ou o *número do contrato*.";

    await fetch(`${SUPABASE_URL}/rest/v1/atendimento_config?chave=eq.menu_principal`, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`,
        },
        body: JSON.stringify({ conteudo: config }),
    });
    console.log('✅ Opção 2 simplificada!');
}
testSimple();
