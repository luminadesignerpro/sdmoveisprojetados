// Testar com formato correto da v1.8.4
const API_URL = 'https://api-whatsapp-sdmoveis.onrender.com';
const API_KEY = 'Mv06061991';
const INSTANCE = 'SD-Moveis';
const TEST_PHONE = '558599700812';

async function testCorrectFormat() {
  console.log('=== TESTE COM FORMATO CORRETO ===\n');

  // Formato 1: textMessage (o que o servidor pediu)
  console.log('Formato 1: { number, textMessage: { text } }');
  try {
    const r = await fetch(`${API_URL}/message/sendText/${INSTANCE}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: API_KEY },
      body: JSON.stringify({
        number: TEST_PHONE,
        textMessage: { text: '✅ Teste SD Moveis - formato textMessage' },
        options: { delay: 1000, presence: 'composing' }
      })
    });
    const d = await r.text();
    console.log(`   HTTP ${r.status}:`, d.substring(0, 400));
  } catch (e) {
    console.log('   ERRO:', e.message);
  }

  // Formato 2: só textMessage
  console.log('\nFormato 2: { number, textMessage: { text }, options }');
  try {
    const r = await fetch(`${API_URL}/message/sendText/${INSTANCE}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: API_KEY },
      body: JSON.stringify({
        number: TEST_PHONE,
        textMessage: { text: '✅ Teste 2 SD Moveis' }
      })
    });
    const d = await r.text();
    console.log(`   HTTP ${r.status}:`, d.substring(0, 400));
  } catch (e) {
    console.log('   ERRO:', e.message);
  }

  console.log('\n=== FIM ===');
}

testCorrectFormat();
