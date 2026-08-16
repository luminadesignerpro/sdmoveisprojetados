const https = require('https');

const sql = "ALTER TABLE public.itens_projeto ADD COLUMN IF NOT EXISTS unit TEXT NOT NULL DEFAULT 'un', ADD COLUMN IF NOT EXISTS width NUMERIC NOT NULL DEFAULT 0, ADD COLUMN IF NOT EXISTS height NUMERIC NOT NULL DEFAULT 0, ADD COLUMN IF NOT EXISTS total_m2 NUMERIC NOT NULL DEFAULT 0, ADD COLUMN IF NOT EXISTS price_table TEXT NOT NULL DEFAULT 'avista', ADD COLUMN IF NOT EXISTS price_avista NUMERIC, ADD COLUMN IF NOT EXISTS price_aprazo NUMERIC, ADD COLUMN IF NOT EXISTS price_atacado NUMERIC;";

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
  r.on('end', () => {
    console.log('Status:', r.statusCode);
    console.log('Response:', d);
    if (r.statusCode >= 200 && r.statusCode < 300) {
      console.log('✅ Migration executada com sucesso!');
    } else {
      console.log('❌ Falhou. Verifique as colunas manualmente no Supabase.');
    }
  });
});
req.on('error', e => console.error('Erro:', e.message));
req.write(body);
req.end();
