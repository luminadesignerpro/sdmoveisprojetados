const EVOLUTION_API_URL = 'https://api-whatsapp-sdmoveis.onrender.com';
const EVOLUTION_API_KEY = 'Mv06061991';

async function test() {
  try {
    const res = await fetch(EVOLUTION_API_URL + '/instance/connect/SD-Moveis', {
      headers: { 'apikey': EVOLUTION_API_KEY }
    });
    const text = await res.text();
    console.log('Status:', res.status);
    console.log('Response:', text);
  } catch (err) {
    console.error('Error:', err);
  }
}
test();
