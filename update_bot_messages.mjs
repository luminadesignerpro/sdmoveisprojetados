// Script para atualizar as mensagens do bot no Supabase
const SUPABASE_URL = 'https://nglwscakhhdhelhbqkyb.supabase.co';
const SUPABASE_KEY = 'sb_publishable_3fJ0EGv8wuNn1J95sj1G1A_21WFWOR2';

async function updateBotMessages() {
    console.log('Buscando configuração atual...');
    
    const getRes = await fetch(`${SUPABASE_URL}/rest/v1/atendimento_config?chave=eq.menu_principal`, {
        headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`,
        },
    });

    if (!getRes.ok) {
        console.error('Erro ao buscar configuração:', await getRes.text());
        return;
    }

    const data = await getRes.json();
    if (data.length === 0) {
        console.log('Configuração menu_principal não encontrada.');
        return;
    }

    const config = data[0].conteudo;
    console.log('Configuração atual:', JSON.stringify(config, null, 2));

    // Atualiza os textos
    if (config.responses) {
        config.responses["2"] = config.responses["2"].replace('Claro!', 'Perfeito!');
        config.responses["4"] = config.responses["4"].replace('humano', 'atendente');
    }

    console.log('Nova configuração:', JSON.stringify(config, null, 2));

    const updateRes = await fetch(`${SUPABASE_URL}/rest/v1/atendimento_config?chave=eq.menu_principal`, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`,
            'Prefer': 'return=representation',
        },
        body: JSON.stringify({ conteudo: config }),
    });

    if (updateRes.ok) {
        console.log('✅ Configuração do bot atualizada no banco de dados!');
    } else {
        console.error('❌ Erro ao atualizar:', await updateRes.text());
    }
}

updateBotMessages().catch(console.error);
