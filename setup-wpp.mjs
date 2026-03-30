import * as readline from 'readline';
import * as fs from 'fs';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const envContent = fs.readFileSync('.env', 'utf-8');
const match = envContent.match(/VITE_SUPABASE_URL=['"]?(.*?)['"]?\n/);
const SUPABASE_URL = match ? match[1].trim() : '';

const API_URL = 'https://api-whatsapp-sdmoveis.onrender.com';
const INSTANCE_NAME = 'SD-Moveis';

console.log('\n=========================================');
console.log('🤖 ASSISTENTE DE INTEGRAÇÃO SD MÓVEIS 🤖');
console.log('=========================================\n');

rl.question('👉 Digite a Senha (API_KEY) que você acabou de criar no Render:\n> ', async (apiKey) => {
  if (!apiKey || apiKey.trim() === '') {
    console.log('❌ Senha inválida. Tente novamente.');
    rl.close();
    return;
  }
  
  const key = apiKey.trim();
  console.log('\n⏳ Conectando com a sua Evoluton API na nuvem...');
  
  try {
    // 1. Criar Instância
    const response = await fetch(`${API_URL}/instance/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': key
      },
      body: JSON.stringify({
        instanceName: INSTANCE_NAME,
        qrcode: true,
        integration: 'WHATSAPP-BAILEYS'
      })
    });
    
    const data = await response.json();
    
    if (response.ok || data.error === 'Instance SD-Moveis already exists') {
      console.log('✅ Instância "SD-Moveis" preparada com sucesso na nuvem!');
      
      console.log('\n⏳ Vinculando o seu Banco de Dados (Supabase) à API...');
      
      if (SUPABASE_URL) {
        await fetch(`${API_URL}/webhook/set/${INSTANCE_NAME}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'apikey': key },
          body: JSON.stringify({
             webhook: {
                 enabled: true,
                 url: `${SUPABASE_URL}/functions/v1/whatsapp-webhook`,
                 byEvents: false,
                 base64: false,
                 events: ["MESSAGES_UPSERT", "SEND_MESSAGE"]
             }
          }
        )});
        console.log('✅ Servidor sincronizado! Respostas cairão direto no CRM.');
      }
      
      console.log('\n⏳ Gerando o seu QRCode exclusivo...');
      // 2. Fetch QR Code 
      const qrResponse = await fetch(`${API_URL}/instance/connect/${INSTANCE_NAME}`, {
        headers: { 'apikey': key }
      });
      
      const qrData = await qrResponse.json();
      
      if (qrData.base64) {
        console.log('\n======================================================');
        console.log('🎉 SUCESSO! O SEU QR CODE FOI GERADO COM SUCESSO!');
        console.log('======================================================\n');
        
        fs.writeFileSync('qrcode.html', `<html><body style="display:flex;justify-content:center;align-items:center;height:100vh;background:#f0f0f0;"><div style="text-align:center;padding:20px;background:white;border-radius:10px;box-shadow:0 4px 10px rgba(0,0,0,0.1);"><h1 style="font-family:sans-serif;color:#25D366;">Escaneie com seu WhatsApp</h1><img src="` + qrData.base64 + `" width="400" /></div></body></html>`);
        console.log('👉 ✅ Um arquivo "qrcode.html" foi criado na pasta do seu projeto!');
        console.log('👉 Duplo clique em "qrcode.html" para abrir no navegador e ler com o seu celular!');
        
        console.log('\n2. AGORA RODE ESTES ÚLTIMOS DOIS COMANDOS NO SEU TERMINAL PARA LIGAR O SUPABASE A ESSA API:');
        console.log(`npx supabase secrets set EVOLUTION_API_URL="${API_URL}"`);
        console.log(`npx supabase secrets set EVOLUTION_API_KEY="${key}"`);
      } else {
        console.log('\n✅ Instância conectada! O Status dela é:', qrData.instance?.state || qrData.state);
      }
    } else {
      console.log('❌ Ocorreu um erro ao falar com o Render:', data);
    }
  } catch (error) {
    console.error('❌ Erro de conexão. Verifique se o Render já terminou de ligar (Live). Erro:', error.message);
  }
  
  rl.close();
});
