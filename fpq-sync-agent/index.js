const Firebird = require('node-firebird');
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const fs = require('fs');
const http = require('http');

// Garante que o .env seja lido da pasta onde o executável está
const envPath = path.join(process.cwd(), '.env');
require('dotenv').config({ path: envPath });

console.log('--- SD MÓVEIS - SINCRONIZADOR ATIVO ---');
console.log('Procurando .env em: ' + envPath);

const fbOptions = {
    host: '127.0.0.1',
    port: 3050,
    database: process.env.FIREBIRD_DATABASE || 'C:\\OSMARCENARIA5.9\\DADOS.FDB',
    user: process.env.FIREBIRD_USER || 'SYSDBA',
    password: process.env.FIREBIRD_PASSWORD || 'masterkey',
    lowercase_keys: false
};

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

let lastSyncStatus = "Nunca sincronizado";
let lastSyncTime = null;

async function syncData() {
    console.log('[' + new Date().toLocaleString() + '] Sincronizando: FPQ -> Supabase...');
    Firebird.attach(fbOptions, function(err, db) {
        if (err) {
            lastSyncStatus = "Erro: " + err.message;
            return console.error('Erro Firebird (O arquivo DADOS.FDB existe?):', err.message);
        }
        
        db.query('SELECT * FROM ORDEM_SERVICO', async function(err, result) {
            if (err) { 
                lastSyncStatus = "Erro na Query: " + err.message;
                console.error('Erro Query:', err.message); 
                db.detach(); 
                return; 
            }
            
            console.log('Enviando ' + result.length + ' ordens...');
            try {
                for (const row of result) {
                    await supabase.from('service_orders').upsert({
                        order_number: row.NUMERO,
                        order_date: row.DATA,
                        client_name: row.CLIENTE,
                        total_amount: row.VALOR_TOTAL,
                        status: row.SITUACAO
                    }, { onConflict: 'order_number' });
                }
                lastSyncStatus = "Sucesso";
                lastSyncTime = new Date().toISOString();
                console.log('Sincronização OK!');
            } catch (supaErr) {
                lastSyncStatus = "Erro Supabase: " + supaErr.message;
                console.error('Erro Supabase:', supaErr);
            }
            db.detach();
        });
    });
}

// Servidor de Heartbeat para o Painel Web
const server = http.createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Content-Type', 'application/json');

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    if (req.url === '/status') {
        res.writeHead(200);
        res.end(JSON.stringify({
            status: 'online',
            lastSyncStatus,
            lastSyncTime,
            version: '1.2.0'
        }));
    } else {
        res.writeHead(404);
        res.end();
    }
});

const HTTP_PORT = 3001;
server.listen(HTTP_PORT, () => {
    console.log(`Servidor de status rodando em http://localhost:${HTTP_PORT}/status`);
});

const interval = parseInt(process.env.SYNC_INTERVAL_MS) || 300000;
console.log('Intervalo: ' + (interval/60000) + ' minutos.');
syncData();
setInterval(syncData, interval);

