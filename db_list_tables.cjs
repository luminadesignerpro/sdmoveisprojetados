const pg = require('pg');

const stringsToTry = [
    "postgresql://postgres.ducfogpyomhrmhyfzdxf:nglwscakhhdhelhbqkyb@aws-0-sa-east-1.pooler.supabase.com:6543/postgres",
    "postgresql://postgres.ducfogpyomhrmhyfzdxf:nglwscakhhdhelhbqkyb@aws-0-sa-east-1.pooler.supabase.com:5432/postgres",
    "postgresql://postgres:nglwscakhhdhelhbqkyb@db.ducfogpyomhrmhyfzdxf.supabase.co:5432/postgres",
    "postgresql://postgres:nglwscakhhdhelhbqkyb@db.ducfogpyomhrmhyfzdxf.supabase.co:6543/postgres"
];

async function run() {
  for (const connectionString of stringsToTry) {
    try {
      console.log('Tentando:', connectionString.replace(/([:]).*?([@])/, "$1***$2"));
      const client = new pg.Client({ connectionString, connectionTimeoutMillis: 5000 });
      await client.connect();
      console.log('Conectado!');
      const res = await client.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
        ORDER BY table_name;
      `);
      console.log('--- TABLES IN DATABASE ---');
      console.log(res.rows.map(r => r.table_name));
      await client.end();
      return;
    } catch (e) {
      console.error('Falhou:', e.message);
    }
  }
}

run().catch(console.error);
