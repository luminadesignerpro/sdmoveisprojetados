const EVOLUTION_API_URL = 'https://api-whatsapp-sdmoveis.onrender.com';
const EVOLUTION_API_KEY = 'Mv06061991';

async function test() {
  console.log('=== 1. Testando conexão com a API ===');
  try {
    const res = await fetch(`${EVOLUTION_API_URL}/instance/connectionState/SD-Moveis`, {
      headers: { 'apikey': EVOLUTION_API_KEY }
    });
    const data = await res.json();
    console.log('Status:', res.status, JSON.stringify(data));
  } catch(e) { console.error('ERRO:', e.message); }

  console.log('\n=== 2. Testando /instance/connect/SD-Moveis ===');
  try {
    const res = await fetch(`${EVOLUTION_API_URL}/instance/connect/SD-Moveis`, {
      headers: { 'apikey': EVOLUTION_API_KEY }
    });
    const text = await res.text();
    console.log('Status:', res.status);
    // Truncate if too long (base64)
    console.log('Response (primeiros 300 chars):', text.substring(0, 300));
  } catch(e) { console.error('ERRO:', e.message); }
}
test();
