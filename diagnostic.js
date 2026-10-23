// WHATSAPP CRM DIAGNOSTIC TOOL
// Run this with "node diagnostic.js" in your terminal

const EVOLUTION_URL = 'https://api-whatsapp-sdmoveis.onrender.com';
const EVOLUTION_KEY = 'YOUR_EVOLUTION_KEY_HERE'; 
const INSTANCE = 'SD-Moveis';

async function diagnose() {
    console.log('🔍 Iniciando Diagnóstico do CRM WhatsApp...\n');

    // 1. Check Evolution API Base URL
    console.log(`1. Testando conexão com Evolution API (${EVOLUTION_URL})...`);
    try {
        const res = await fetch(`${EVOLUTION_URL}/instance/fetchInstances`, {
            headers: { apikey: EVOLUTION_KEY }
        });
        if (res.ok) {
            const data = await res.json();
            console.log('✅ Conexão com Evolution API: OK!');
            console.log(`📋 Instâncias encontradas: ${data.length}`);
            
            const myInstance = data.find(i => i.instanceName === INSTANCE);
            if (myInstance) {
                console.log(`✅ Instância "${INSTANCE}" existe! Status: ${myInstance.status}`);
            } else {
                console.log(`⚠️ Instância "${INSTANCE}" NÃO ENCONTRADA no servidor.`);
            }
        } else {
            console.log(`❌ Erro na API (Status ${res.status}). Verifique a API_KEY.`);
        }
    } catch (err) {
        console.log(`❌ Falha total ao conectar na Evolution API: ${err.message}`);
    }

    // 2. Check Instance State
    console.log(`\n2. Verificando estado da instância "${INSTANCE}"...`);
    try {
        const res = await fetch(`${EVOLUTION_URL}/instance/connectionState/${INSTANCE}`, {
            headers: { apikey: EVOLUTION_KEY }
        });
        const data = await res.json();
        const state = data?.instance?.state || data?.state || 'undefined';
        if (state === 'open') {
            console.log('✅ WhatsApp está CONECTADO e pronto para uso!');
        } else {
            console.log(`⚠️ WhatsApp está ${state.toUpperCase()}. Você precisa escanear o QR Code.`);
        }
    } catch (err) {
        console.log(`❌ Erro ao verificar estado: ${err.message}`);
    }

    // 3. Webhook Scan
    console.log(`\n3. Verificando se o Webhook está configurado...`);
    try {
        const res = await fetch(`${EVOLUTION_URL}/webhook/find/${INSTANCE}`, {
            headers: { apikey: EVOLUTION_KEY }
        });
        const data = await res.json();
        if (data && data.enabled) {
            console.log(`✅ Webhook ATIVO! URL: ${data.url}`);
        } else {
            console.log('⚠️ Webhook está DESATIVADO ou não configurado.');
        }
    } catch (err) {
        console.log(`❌ Erro ao verificar Webhook: ${err.message}`);
    }

    console.log('\n--- FIM DO DIAGNÓSTICO ---');
    console.log('💡 DICA: Se "open" mudar para "close" toda hora, você precisa configurar o Banco de Dados PostgreSql na instância para persistência infinita!');
}

diagnose();
