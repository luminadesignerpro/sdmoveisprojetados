import https from 'https';

const API_KEY = 'AIzaSyBhVXKicVDJWP3QmcNueqICcWwlSA5DF0M';

const options = {
  hostname: 'generativelanguage.googleapis.com',
  path: `/v1beta/models?key=${API_KEY}`,
  method: 'GET',
};

const req = https.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => {
    if (res.statusCode === 200) {
      const json = JSON.parse(data);
      const models = json.models.map(m => m.name).filter(n => n.includes('gemini'));
      console.log('✅ Chave VÁLIDA! Modelos disponíveis:');
      models.forEach(m => console.log(' -', m));
    } else {
      console.log('❌ Chave inválida ou sem acesso:', res.statusCode, data);
    }
  });
});
req.on('error', (e) => console.error('Erro:', e.message));
req.end();
