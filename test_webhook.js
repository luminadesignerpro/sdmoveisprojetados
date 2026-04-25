// Testar se o webhook do Supabase aceita chamadas externas (sem auth)
const SUPABASE_URL = 'https://nglwscakhhdhelhbqkyb.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5nbHdzY2FraGhkaGVsaGJxa3liIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQzOTQ2MTcsImV4cCI6MjA1OTk3MDYxN30.bMSFqFj9lscMxT-mSJcthrNliIoNhJ-u6QiS24GQEEQ';

async function testWebhook() {
  console.log('=== TESTE DO WEBHOOK ===\n');

  // Teste 1: Chamar SEM autenticação (como a Evolution API faz)
  console.log('Teste 1: Chamando webhook SEM auth header...');
  try {
    const r1 = await fetch(`${SUPABASE_URL}/functions/v1/whatsapp-webhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event: 'MESSAGES_UPSERT',
        data: {
          key: { remoteJid: '5585999990000@s.whatsapp.net', fromMe: false, id: 'test123' },
          message: { conversation: 'Teste webhook sem auth' },
          pushName: 'Teste Bot'
        }
      })
    });
    const d1 = await r1.text();
    console.log(`   HTTP ${r1.status}:`, d1.substring(0, 300));
  } catch (e) {
    console.log('   ERRO:', e.message);
  }

  // Teste 2: Chamar COM autenticação (anon key)
  console.log('\nTeste 2: Chamando webhook COM auth header...');
  try {
    const r2 = await fetch(`${SUPABASE_URL}/functions/v1/whatsapp-webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ANON_KEY}`
      },
      body: JSON.stringify({
        event: 'MESSAGES_UPSERT',
        data: {
          key: { remoteJid: '5585999990000@s.whatsapp.net', fromMe: false, id: 'test456' },
          message: { conversation: 'Teste webhook com auth' },
          pushName: 'Teste Bot Auth'
        }
      })
    });
    const d2 = await r2.text();
    console.log(`   HTTP ${r2.status}:`, d2.substring(0, 300));
  } catch (e) {
    console.log('   ERRO:', e.message);
  }

  // Verificar configuração atual do webhook na Evolution API
  console.log('\nTeste 3: Verificar webhook atual na Evolution API...');
  try {
    const r3 = await fetch('https://api-whatsapp-sdmoveis.onrender.com/webhook/find/SD-Moveis', {
      headers: { apikey: 'Mv06061991' }
    });
    const d3 = await r3.text();
    console.log(`   HTTP ${r3.status}:`, d3);
  } catch (e) {
    console.log('   ERRO:', e.message);
  }

  console.log('\n=== FIM ===');
}

testWebhook();
