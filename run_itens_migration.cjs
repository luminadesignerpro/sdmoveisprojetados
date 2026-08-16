const https = require('https');

// SQL para adicionar colunas à tabela itens_projeto
const alterStatements = [
  "ALTER TABLE public.itens_projeto ADD COLUMN IF NOT EXISTS unit TEXT NOT NULL DEFAULT 'un'",
  "ALTER TABLE public.itens_projeto ADD COLUMN IF NOT EXISTS width NUMERIC NOT NULL DEFAULT 0",
  "ALTER TABLE public.itens_projeto ADD COLUMN IF NOT EXISTS height NUMERIC NOT NULL DEFAULT 0",
  "ALTER TABLE public.itens_projeto ADD COLUMN IF NOT EXISTS total_m2 NUMERIC NOT NULL DEFAULT 0",
  "ALTER TABLE public.itens_projeto ADD COLUMN IF NOT EXISTS price_table TEXT NOT NULL DEFAULT 'avista'",
  "ALTER TABLE public.itens_projeto ADD COLUMN IF NOT EXISTS price_avista NUMERIC",
  "ALTER TABLE public.itens_projeto ADD COLUMN IF NOT EXISTS price_aprazo NUMERIC",
  "ALTER TABLE public.itens_projeto ADD COLUMN IF NOT EXISTS price_atacado NUMERIC",
];

function makeRequest(sql) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ sql });
    const opts = {
      hostname: 'nglwscakhhdhelhbqkyb.supabase.co',
      path: '/rest/v1/rpc/exec_sql',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': 'sb_publishable_3fJ0EGv8wuNn1J95sj1G1A_21WFWOR2',
        'Authorization': 'Bearer sb_publishable_3fJ0EGv8wuNn1J95sj1G1A_21WFWOR2',
        'Content-Length': Buffer.byteLength(body)
      }
    };
    const req = https.request(opts, r => {
      let d = '';
      r.on('data', c => d += c);
      r.on('end', () => resolve({ status: r.statusCode, body: d }));
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function run() {
  console.log('Testando acesso à tabela...');
  const test = await makeRequest('SELECT column_name FROM information_schema.columns WHERE table_name = \'itens_projeto\' ORDER BY column_name');
  console.log('Status:', test.status);
  if (test.status === 200) {
    console.log('Colunas existentes:', test.body);
  } else {
    console.log('Resposta:', test.body);
  }
}

run().catch(console.error);
