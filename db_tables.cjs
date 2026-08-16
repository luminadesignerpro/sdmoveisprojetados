const pg = require('pg');

const connectionStrings = [
  "postgresql://postgres.nglwscakhhdhelhbqkyb:nglwscakhhdhelhbqkyb@aws-0-sa-east-1.pooler.supabase.com:6543/postgres",
  "postgresql://postgres.nglwscakhhdhelhbqkyb:nglwscakhhdhelhbqkyb@aws-0-sa-east-1.pooler.supabase.com:5432/postgres",
  "postgresql://postgres:nglwscakhhdhelhbqkyb@db.nglwscakhhdhelhbqkyb.supabase.co:5432/postgres"
];

async function run() {
  let connected = false;
  for (const connectionString of connectionStrings) {
    try {
      console.log('Tentando:', connectionString);
      const client = new pg.Client({ connectionString, connectionTimeoutMillis: 5000 });
      await client.connect();
      const res = await client.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
        ORDER BY table_name;
      `);
      console.log('--- TABLES IN DATABASE ---');
      console.log(res.rows.map(r => r.table_name));
      await client.end();
      connected = true;
      break;
    } catch (e) {
      console.error('Falhou:', e.message);
    }
  }
}

run().catch(console.error);
