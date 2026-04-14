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
    console.log('[' + new Date().toLocaleString() + '] 🔄 Iniciando Sincronização Geral...');
    
    Firebird.attach(fbOptions, function(err, db) {
        if (err) {
            lastSyncStatus = "Erro de Conexão: " + err.message;
            return console.error('Erro Firebird (O arquivo DADOS.FDB existe?):', err.message);
        }
        
        // --- 1. SINCRONIZAR ORDENS DE SERVIÇO ---
        db.query('SELECT * FROM ORDEM_SERVICO', async function(err, result) {
            if (err) {
                console.error('Erro ao ler OS:', err.message);
            } else if (result) {
                console.log('📦 Sincronizando ' + result.length + ' OS...');
                for (const row of result) {
                    try {
                        await supabase.from('service_orders').upsert({
                            order_number: row.NUMERO || row.ID,
                            client_name: row.CLIENTE,
                            description: row.SERVICO || row.DESCRICAO || 'OS Importada do FPQ',
                            total_value: row.VALOR_TOTAL || row.VALOR || 0,
                            status: (row.SITUACAO || 'aberta').toLowerCase(),
                            estimated_date: row.DATA || new Date().toISOString()
                        }, { onConflict: 'order_number' });
                    } catch (e) {
                        console.error('Erro ao subir OS individual:', e.message);
                    }
                }
            }
        });

        // --- 2. SINCRONIZAR VENDAS (PROJETOS) --- 
        // Tenta buscar na tabela de VENDAS ou PEDIDOS
        db.query('SELECT * FROM VENDAS', async function(err, result) {
            if (err) {
                console.log('Tabela VENDAS não encontrada, tentando PEDIDOS...');
                db.query('SELECT * FROM PEDIDOS', async function(err2, result2) {
                    if (err2) {
                        console.error('Nenhuma tabela de vendas encontrada (VENDAS/PEDIDOS)');
                    } else if (result2) {
                        await processSales(result2);
                    }
                });
            } else if (result) {
                await processSales(result);
            }
            db.detach();
        });
    });
}

async function processSales(sales) {
    console.log('💰 Sincronizando ' + sales.length + ' Vendas para projetos...');
    for (const row of sales) {
        try {
            await supabase.from('client_projects').upsert({
                title: row.DESCRICAO || 'Venda/Projeto - ' + (row.ID || row.NUMERO),
                client_name: row.CLIENTE,
                value: row.VALOR_TOTAL || row.TOTAL || 0,
                status: 'assinado',
                deadline: row.DATA_ENTREGA || row.DATA || new Date().toISOString(),
                project_type: 'Móveis Projetados (Importado)'
            }, { onConflict: 'title, client_name' });
        } catch (e) {
            console.error('Erro ao subir Venda individual:', e.message);
        }
    }
    lastSyncStatus = "Sucesso: OS e Vendas Sincronizadas";
    lastSyncTime = new Date().toISOString();
    console.log('✅ Sincronização Completa!');
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

