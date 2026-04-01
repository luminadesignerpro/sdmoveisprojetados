import * as readline from 'readline';
import * as fs from 'fs';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const envContent = fs.readFileSync('.env', 'utf-8');
const matchUrl = envContent.match(/VITE_SUPABASE_URL=['"]?(.*?)['"]?\n/);
const matchRef = envContent.match(/VITE_SUPABASE_PROJECT_ID=['"]?(.*?)['"]?\n/);
const SUPABASE_URL = matchUrl ? matchUrl[1].trim() : '';
const SUPABASE_REF = matchRef ? matchRef[1].trim() : '';

const API_URL = 'https://api-whatsapp-sdmoveis.onrender.com';
const INSTANCE_NAME = 'SD-Moveis';

console.log('\n=========================================');
console.log('🤖 ASSISTENTE DE INTEGRAÇÃO SD MÓVEIS (V2) 🤖');
console.log('=========================================\n');

rl.question('👉 1. Digite a Senha (API_KEY) do seu RENDER:\n> ', async (apiKey) => {
  if (!apiKey || apiKey.trim() === '') {
    console.log('❌ Senha inválida. Tente novamente.');
    rl.close();
    return;
  }
  
  rl.question('👉 2. Digite a Senha do seu Banco de Dados (Supabase):\n(Aquela que você usou na criação do projeto)\n> ', async (dbPassword) => {
    
    const key = apiKey.trim();
    const dbPass = dbPassword.trim();

    console.log('\n⏳ Conectando e Configurando Persistência Infinita...');
    
    try {
      // 1. Criar/Atualizar Instância com Banco de Dados para não desconectar mais
      const response = await fetch(`${API_URL}/instance/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': key
        },
        body: JSON.stringify({
          instanceName: INSTANCE_NAME,
          qrcode: true,
          integration: 'WHATSAPP-BAILEYS',
          chatPersistence: true, // Garante que as mensagens fiquem salvas
          database: {
            enabled: true,
            type: 'postgres',
            host: `db.${SUPABASE_REF}.supabase.co`,
            port: 5432,
            user: 'postgres',
            password: dbPass,
            database: 'postgres',
            ssl: true
          }
        })
      });
      
      const data = await response.json();
      
      if (response.ok || data.error === 'Instance SD-Moveis already exists') {
        console.log('✅ Instância com Persistência em Banco de Dados configurada!');
        
        console.log('\n⏳ Vinculando Webhook do Fluxo AI...');
        
        if (SUPABASE_URL) {
          const webhookRes = await fetch(`${API_URL}/webhook/set/${INSTANCE_NAME}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'apikey': key },
            body: JSON.stringify({
               enabled: true,
               url: `${SUPABASE_URL}/functions/v1/whatsapp-webhook`,
               webhook_by_events: false,
               base64: false,
               events: ["MESSAGES_UPSERT", "CONNECTION_UPDATE", "MESSAGES_UPDATE", "SEND_MESSAGE"]
            })
          });
          
          if (webhookRes.ok) {
            console.log('✅ Webhook do Fluxo AI sincronizado com sucesso!');
          }
        }
        
        console.log('\n⏳ Gerando o seu QRCode exclusivo...');
        // 2. Fetch QR Code 
        const qrResponse = await fetch(`${API_URL}/instance/connect/${INSTANCE_NAME}`, {
          headers: { 'apikey': key }
        });
        
        const qrData = await qrResponse.json();
        
        if (qrData.base64 || qrData.qrcode?.base64) {
          const qrCodeBase64 = qrData.base64 || qrData.qrcode?.base64;
          console.log('\n======================================================');
          console.log('🎉 SUCESSO! O SEU QR CODE FOI GERADO COM SUCESSO!');
          console.log('======================================================\n');
          
          fs.writeFileSync('qrcode.html', `<html><body style="display:flex;justify-content:center;align-items:center;height:100vh;background:#f0f0f0;"><div style="text-align:center;padding:20px;background:white;border-radius:10px;box-shadow:0 4px 10px rgba(0,0,0,0.1);"><h1 style="font-family:sans-serif;color:#25D366;">Escaneie com seu WhatsApp</h1><p>Escaneie e aguarde alguns segundos. O login ficará salvo no Supabase!</p><img src="` + qrCodeBase64 + `" width="400" /></div></body></html>`);
          console.log('👉 ✅ Um arquivo "qrcode.html" foi criado na pasta do seu projeto!');
          console.log('👉 Abra o arquivo "qrcode.html" no seu computador e leia o QR Code!');
          
          console.log('\n⚠️ NÃO ESQUEÇA DE RODAR ESTES COMANDOS NO TERMINAL DEPOIS:');
          console.log(`npx supabase secrets set EVOLUTION_API_URL="${API_URL}"`);
          console.log(`npx supabase secrets set EVOLUTION_API_KEY="${key}"`);
        } else {
          console.log('\n✅ Instância conectada! O Status dela é:', qrData.instance?.state || qrData.state || 'Conectado');
        }
      } else {
        console.log('❌ Ocorreu um erro ao falar com o Render:', data);
      }
    } catch (error) {
      console.error('❌ Erro de conexão. Erro:', error.message);
    }
    
    rl.close();
  });
});
