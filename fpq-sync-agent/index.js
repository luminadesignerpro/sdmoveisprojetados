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
    console.log('[' + new Date().toLocaleString() + '] 🔄 Iniciando Sincronização em tempo real...');
    
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

        // --- 2. SINCRONIZAR CONTRATOS ---
        // Tenta buscar na tabela de CONTRATOS ou VENDAS
        db.query('SELECT * FROM CONTRATOS', async function(err, result) {
            if (!err && result) {
                console.log('📄 Sincronizando ' + result.length + ' Contratos...');
                for (const row of result) {
                    try {
                        await supabase.from('contracts').upsert({
                            contract_number: row.NUMERO || row.ID,
                            title: row.DESCRICAO || 'Contrato FPQ - ' + (row.ID || row.NUMERO),
                            value: row.VALOR_TOTAL || row.TOTAL || 0,
                            status: (row.SITUACAO || 'assinado').toLowerCase(),
                            created_at: row.DATA || new Date().toISOString()
                        }, { onConflict: 'contract_number' });
                    } catch (e) {
                        console.error('Erro ao subir Contrato individual:', e.message);
                    }
                }
            } else {
                console.log('Tabela CONTRATOS não encontrada, usando VENDAS como base.');
            }
        });

        // --- 3. SINCRONIZAR VENDAS (PROJETOS) --- 
        db.query('SELECT * FROM VENDAS', async function(err, result) {
            if (err) {
                db.query('SELECT * FROM PEDIDOS', async function(err2, result2) {
                    if (!err2 && result2) await processSales(result2);
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
    lastSyncStatus = "Sucesso: OS, Contratos e Vendas Sincronizadas";
    lastSyncTime = new Date().toISOString();
    console.log('✅ Sincronização Completa!');
}

const PROMOB_PROJECTS_DIR = process.env.PROMOB_PROJECTS_DIR || path.join(process.env.USERPROFILE, 'Documents', 'Promob', 'Projects');

async function syncPromobProject(filename) {
    if (!filename.endsWith('.promob')) return;
    
    const projectName = path.basename(filename, '.promob');
    console.log('📐 Detectado Projeto Promob: ' + projectName);
    
    try {
        await supabase.from('client_projects').upsert({
            title: projectName,
            client_name: 'Cliente Promob Local',
            project_type: 'Promob Plus (Importado)',
            status: 'producao',
            updated_at: new Date().toISOString()
        }, { onConflict: 'title, client_name' });
        console.log('✅ Projeto Promob sincronizado!');
    } catch (e) {
        console.error('Erro ao sincronizar Promob:', e.message);
    }
}

// Watcher para a pasta do Promob
if (fs.existsSync(PROMOB_PROJECTS_DIR)) {
    console.log('👀 Monitorando Projetos Promob em: ' + PROMOB_PROJECTS_DIR);
    fs.watch(PROMOB_PROJECTS_DIR, (eventType, filename) => {
        if (filename && eventType === 'rename') { 
            syncPromobProject(filename);
        }
    });
}

// Watcher para PDF (OS e Vendas)
const PDF_WATCH_DIR = process.env.PDF_WATCH_DIR || 'C:\\OSMARCENARIA5.9\\Export';

if (!fs.existsSync(PDF_WATCH_DIR)) {
    try {
        fs.mkdirSync(PDF_WATCH_DIR, { recursive: true });
        console.log('📁 Criada pasta de exportação PDF: ' + PDF_WATCH_DIR);
    } catch (e) {
        console.warn('⚠️ Não foi possível criar/acessar pasta PDF: ' + PDF_WATCH_DIR);
    }
}

async function uploadAndSyncPdf(filePath) {
    if (!filePath.toLowerCase().endsWith('.pdf')) return;
    
    const fileName = path.basename(filePath);
    console.log('📄 Processando PDF: ' + fileName);
    
    // Pequeno delay para garantir que o FPQ terminou de escrever o arquivo
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    try {
        const fileBuffer = fs.readFileSync(filePath);
        const storagePath = `automated/${Date.now()}_${fileName}`;
        
        const { data: uploadData, error: uploadError } = await supabase.storage
            .from('documents')
            .upload(storagePath, fileBuffer, { contentType: 'application/pdf', upsert: true });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage.from('documents').getPublicUrl(storagePath);
        console.log('✅ PDF no Storage: ' + publicUrl);

        const match = fileName.match(/\d+/);
        const refId = match ? match[0] : null;

        if (refId) {
            if (fileName.toUpperCase().includes('OS')) {
                await supabase.from('service_orders').update({ pdf_url: publicUrl }).eq('order_number', refId);
                console.log(`🔗 PDF vinculado à OS #${refId}`);
            } else if (fileName.toUpperCase().includes('CONTRATO')) {
                await supabase.from('contracts').update({ pdf_url: publicUrl }).eq('contract_number', refId);
                console.log(`🔗 PDF vinculado ao Contrato #${refId}`);
            } else {
                await supabase.from('client_projects').update({ pdf_url: publicUrl }).ilike('title', `%${refId}%`);
                console.log(`🔗 PDF vinculado ao Projeto #${refId}`);
            }
        }
    } catch (e) {
        console.error('❌ Erro no sync do PDF:', e.message);
    }
}

if (fs.existsSync(PDF_WATCH_DIR)) {
    console.log('👀 Monitorando PDFs (Recursivo) em: ' + PDF_WATCH_DIR);
    fs.watch(PDF_WATCH_DIR, { recursive: true }, (eventType, filename) => {
        if (filename && eventType === 'rename') {
            const fullPath = path.join(PDF_WATCH_DIR, filename);
            if (fs.existsSync(fullPath)) {
                uploadAndSyncPdf(fullPath);
            }
        }
    });
}

// Servidor de Heartbeat
const server = http.createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Content-Type', 'application/json');

    if (req.url === '/status') {
        res.writeHead(200);
        res.end(JSON.stringify({
            status: 'online',
            lastSyncStatus,
            lastSyncTime,
            version: '1.4.0',
            watchers: {
                promob: fs.existsSync(PROMOB_PROJECTS_DIR),
                pdf: fs.existsSync(PDF_WATCH_DIR)
            }
        }));
    } else {
        res.writeHead(404);
        res.end();
    }
});

const HTTP_PORT = 3001;
server.listen(HTTP_PORT, () => {
    console.log(`Servidor de status em http://localhost:${HTTP_PORT}/status`);
});

// Intervalo reduzido para 60 segundos para parecer "direto"
const interval = 60000; 
console.log('Sincronização agendada a cada 60 segundos.');
syncData();
setInterval(syncData, interval);

