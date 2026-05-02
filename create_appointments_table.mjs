// Script para criar a tabela appointments no Supabase via REST API
const SUPABASE_URL = 'https://nglwscakhhdhelhbqkyb.supabase.co';
const SUPABASE_KEY = 'sb_publishable_3fJ0EGv8wuNn1J95sj1G1A_21WFWOR2';

const sql = `
CREATE TABLE IF NOT EXISTS public.appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID,
    project_id UUID,
    type TEXT NOT NULL DEFAULT 'visita_tecnica',
    title TEXT NOT NULL,
    description TEXT,
    preferred_date DATE NOT NULL,
    preferred_time TEXT NOT NULL DEFAULT '09:00',
    status TEXT NOT NULL DEFAULT 'pendente',
    admin_notes TEXT,
    client_name TEXT,
    client_address TEXT,
    client_phone TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'appointments' 
        AND policyname = 'Allow all access to appointments'
    ) THEN
        CREATE POLICY "Allow all access to appointments"
            ON public.appointments
            FOR ALL
            USING (true)
            WITH CHECK (true);
    END IF;
END $$;
`;

async function run() {
    console.log('Criando tabela appointments no Supabase...');
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`,
        },
        body: JSON.stringify({ sql }),
    });

    if (res.ok) {
        console.log('✅ Tabela criada com sucesso!');
    } else {
        const text = await res.text();
        console.log('Status:', res.status);
        console.log('Resposta:', text);
        
        // Tentar via query direta
        console.log('\nTentando via insert de teste para verificar se a tabela já existe...');
        const testRes = await fetch(`${SUPABASE_URL}/rest/v1/appointments?limit=1`, {
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`,
            }
        });
        console.log('Status da verificação:', testRes.status);
        const testText = await testRes.text();
        console.log('Resposta:', testText);
        
        if (testRes.status === 200) {
            console.log('✅ Tabela appointments já existe e está acessível!');
        } else {
            console.log('❌ Tabela não existe. Necessário criar manualmente no Supabase SQL Editor.');
            console.log('\n== EXECUTE ESTE SQL NO SUPABASE SQL EDITOR ==');
            console.log(sql);
        }
    }
}

run().catch(console.error);
