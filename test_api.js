const EVOLUTION_API_URL = 'https://api-whatsapp-sdmoveis.onrender.com';
const EVOLUTION_API_KEY = 'Mv06061991';
const DB_PASSWORD = 'Mv@1307202031011985';
const SUPABASE_PROJECT_ID = 'nglwscakhhdhelhbqkyb';

async function test() {
  try {
    console.log('Sending create request...');
    const res = await fetch(EVOLUTION_API_URL + '/instance/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': EVOLUTION_API_KEY },
      body: JSON.stringify({
        instanceName: 'SD-Moveis',
        qrcode: true,
        integration: 'WHATSAPP-BAILEYS',
        database: {
          enabled: true,
          type: 'postgres',
          host: `db.${SUPABASE_PROJECT_ID}.supabase.co`,
          port: 5432,
          user: 'postgres',
          password: DB_PASSWORD,
          database: 'postgres',
          ssl: true
        }
      })
    });
    const text = await res.text();
    console.log('Status:', res.status);
    console.log('Response:', text);
  } catch (err) {
    console.error('Error:', err);
  }
}
test();
