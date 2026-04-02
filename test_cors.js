// Verifica headers CORS da API Evolution
const EVOLUTION_API_URL = 'https://api-whatsapp-sdmoveis.onrender.com';
const EVOLUTION_API_KEY = 'Mv06061991';

async function checkCORS() {
  // Simula um preflight OPTIONS request como o browser faria
  const res = await fetch(`${EVOLUTION_API_URL}/instance/connect/SD-Moveis`, {
    method: 'OPTIONS',
    headers: {
      'Origin': 'https://sdmoveisprojetados.vercel.app',
      'Access-Control-Request-Method': 'GET',
      'Access-Control-Request-Headers': 'apikey'
    }
  });
  console.log('OPTIONS status:', res.status);
  console.log('CORS headers:');
  res.headers.forEach((val, key) => {
    if (key.toLowerCase().includes('access-control') || key.toLowerCase().includes('cors')) {
      console.log(` ${key}: ${val}`);
    }
  });
}
checkCORS();
