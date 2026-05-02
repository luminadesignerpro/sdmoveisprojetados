// Testa inserção de um novo agendamento
const SUPABASE_URL = 'https://nglwscakhhdhelhbqkyb.supabase.co';
const SUPABASE_KEY = 'sb_publishable_3fJ0EGv8wuNn1J95sj1G1A_21WFWOR2';

async function test() {
    console.log('Testando INSERT na tabela appointments...');

    const payload = {
        client_id: null,
        project_id: null,
        type: 'visita_tecnica',
        title: 'Teste de Agendamento',
        description: null,
        preferred_date: '2026-05-10',
        preferred_time: '09:00',
        status: 'pendente',
        client_name: 'Cliente Teste',
        client_address: 'Rua Teste, 123',
        client_phone: '85999999999',
    };

    const res = await fetch(`${SUPABASE_URL}/rest/v1/appointments`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`,
            'Prefer': 'return=representation',
        },
        body: JSON.stringify(payload),
    });

    const text = await res.text();
    console.log('Status:', res.status);
    console.log('Resposta:', text);

    if (res.status === 201 || res.status === 200) {
        console.log('\n✅ INSERT funcionou! O problema não é o banco de dados.');
        console.log('Limpando o registro de teste...');
        
        const data = JSON.parse(text);
        const id = data[0]?.id;
        if (id) {
            await fetch(`${SUPABASE_URL}/rest/v1/appointments?id=eq.${id}`, {
                method: 'DELETE',
                headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
            });
            console.log('Registro de teste removido.');
        }
    } else {
        console.log('\n❌ Erro no INSERT. Detalhes acima.');
    }
}

test().catch(console.error);
