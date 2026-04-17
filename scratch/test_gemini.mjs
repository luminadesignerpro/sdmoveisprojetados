import https from 'https';

const API_KEY = 'AIzaSyBhVXKicVDJWP3QmcNueqICcWwlSA5DF0M';
const body = JSON.stringify({
  contents: [{ parts: [{ text: 'Say hello' }] }]
});

const options = {
  hostname: 'generativelanguage.googleapis.com',
  path: `/v1beta/models/gemini-flash-latest:generateContent?key=${API_KEY}`,
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(body)
  }
};

const req = https.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => {
    console.log('Status HTTP:', res.statusCode);
    if (res.statusCode === 200) {
      const json = JSON.parse(data);
      console.log('✅ Chave FUNCIONANDO! Resposta:', json.candidates[0].content.parts[0].text);
    } else {
      const json = JSON.parse(data);
      console.log('❌ Chave com ERRO:', json.error?.message || data);
    }
  });
});

req.on('error', (e) => console.error('Erro de rede:', e.message));
req.write(body);
req.end();
