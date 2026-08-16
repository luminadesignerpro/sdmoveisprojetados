const pg = require('pg');

const connectionString = "postgresql://postgres.ducfogpyomhrmhyfzdxf:nglwscakhhdhelhbqkyb@aws-0-sa-east-1.pooler.supabase.com:6543/postgres";

async function run() {
  const client = new pg.Client({ connectionString });
  await client.connect();
  const res = await client.query(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'products'
    ORDER BY column_name;
  `);
  console.log('--- COLUMNS IN PRODUCTS TABLE ---');
  console.log(res.rows.map(r => `${r.column_name}: ${r.data_type}`));
  await client.end();
}

run().catch(console.error);
