// Diagnóstico completo da Evolution API
const API_URL = 'https://api-whatsapp-sdmoveis.onrender.com';
const API_KEY = 'Mv06061991';
const INSTANCE = 'SD-Moveis';

async function diagnose() {
  console.log('=== DIAGNÓSTICO EVOLUTION API ===\n');

  // 1. API está viva?
  try {
    const r = await fetch(API_URL);
    const d = await r.json();
    console.log('1. API Status:', d.status === 200 ? '✅ ONLINE' : '❌ OFFLINE');
    console.log('   Versão:', d.version);
  } catch (e) {
    console.log('1. API Status: ❌ OFFLINE -', e.message);
    return;
  }

  // 2. Instâncias existentes
  try {
    const r = await fetch(`${API_URL}/instance/fetchInstances`, {
      headers: { apikey: API_KEY }
    });
    const d = await r.json();
    console.log('\n2. Instâncias encontradas:', JSON.stringify(d, null, 2));
  } catch (e) {
    console.log('\n2. Erro ao buscar instâncias:', e.message);
  }

  // 3. Estado da conexão
  try {
    const r = await fetch(`${API_URL}/instance/connectionState/${INSTANCE}`, {
      headers: { apikey: API_KEY }
    });
    const status = r.status;
    const d = await r.text();
    console.log(`\n3. Estado da conexão (HTTP ${status}):`, d);
  } catch (e) {
    console.log('\n3. Erro ao verificar conexão:', e.message);
  }

  // 4. Webhook configurado?
  try {
    const r = await fetch(`${API_URL}/webhook/find/${INSTANCE}`, {
      headers: { apikey: API_KEY }
    });
    const status = r.status;
    const d = await r.text();
    console.log(`\n4. Webhook (HTTP ${status}):`, d);
  } catch (e) {
    console.log('\n4. Erro ao buscar webhook:', e.message);
  }

  // 5. Tentar criar instância
  try {
    const r = await fetch(`${API_URL}/instance/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: API_KEY },
      body: JSON.stringify({ instanceName: INSTANCE, token: API_KEY, qrcode: true })
    });
    const status = r.status;
    const d = await r.text();
    console.log(`\n5. Criar instância (HTTP ${status}):`, d);
  } catch (e) {
    console.log('\n5. Erro ao criar instância:', e.message);
  }

  // 6. Tentar conectar (QR Code)
  try {
    const r = await fetch(`${API_URL}/instance/connect/${INSTANCE}`, {
      headers: { apikey: API_KEY }
    });
    const status = r.status;
    const d = await r.text();
    const parsed = JSON.parse(d);
    if (parsed.base64 || parsed.qrcode?.base64) {
      console.log(`\n6. QR Code (HTTP ${status}): ✅ QR CODE GERADO COM SUCESSO`);
    } else {
      console.log(`\n6. QR Code (HTTP ${status}):`, d.substring(0, 300));
    }
  } catch (e) {
    console.log('\n6. Erro ao conectar:', e.message);
  }

  console.log('\n=== FIM DO DIAGNÓSTICO ===');
}

diagnose();
