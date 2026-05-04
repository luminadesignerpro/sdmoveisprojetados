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

/**
 * Helper para buscar ou criar um cliente no Supabase pelo nome
 */
async function getOrCreateClient(name) {
    if (!name) return null;
    const cleanName = name.trim();
    
    try {
        const { data: existing } = await supabase.from('clients').select('id').ilike('name', cleanName).limit(1);
        if (existing && existing.length > 0) return existing[0].id;
        
        const { data: newClient, error } = await supabase.from('clients').insert({ name: cleanName, status: 'ativo' }).select('id').single();
        if (error) throw error;
        return newClient.id;
    } catch (e) {
        console.error(`Erro ao resolver cliente ${cleanName}:`, e.message);
        return null;
    }
}

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
                        const clientId = await getOrCreateClient(row.CLIENTE);
                        await supabase.from('service_orders').upsert({
                            order_number: row.NUMERO || row.ID,
                            client_id: clientId,
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
        db.query('SELECT * FROM CONTRATOS', async function(err, result) {
            if (!err && result) {
                console.log('📄 Sincronizando ' + result.length + ' Contratos...');
                for (const row of result) {
                    try {
                        const clientId = await getOrCreateClient(row.CLIENTE);
                        await supabase.from('contracts').upsert({
                            contract_number: row.NUMERO || row.ID,
                            client_id: clientId,
                            title: row.DESCRICAO || 'Contrato FPQ - ' + (row.ID || row.NUMERO),
                            value: row.VALOR_TOTAL || row.TOTAL || 0,
                            status: (row.SITUACAO || 'assinado').toLowerCase(),
                            created_at: row.DATA || new Date().toISOString()
                        }, { onConflict: 'contract_number' });
                    } catch (e) {
                        console.error('Erro ao subir Contrato individual:', e.message);
                    }
                }
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
            const clientId = await getOrCreateClient(row.CLIENTE);
            await supabase.from('client_projects').upsert({
                name: row.DESCRICAO || 'Venda/Projeto - ' + (row.ID || row.NUMERO),
                client_id: clientId,
                value: row.VALOR_TOTAL || row.TOTAL || 0,
                status: 'assinado',
                deadline: row.DATA_ENTREGA || row.DATA || new Date().toISOString(),
                project_type: 'Móveis Projetados (Importado)'
            }, { onConflict: 'name, client_id' });
        } catch (e) {
            console.error('Erro ao subir Venda individual:', e.message);
        }
    }
    lastSyncStatus = "Sucesso: Sincronização Completa";
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

// Watcher para arquivos do FPQ (OS e Orçamentos)
const PDF_WATCH_DIR = process.env.PDF_WATCH_DIR || 'C:\\OSMARCENARIA5.9\\Export';
const ORCAMENTOS_DIR = path.join(PDF_WATCH_DIR, 'ORÇAMENTOS');
const WATCH_DIRS = [PDF_WATCH_DIR, ORCAMENTOS_DIR].filter(d => {
    if (!fs.existsSync(d)) {
        try { fs.mkdirSync(d, { recursive: true }); } catch(e) {}
        return fs.existsSync(d);
    }
    return true;
});

// Rastreia arquivos já processados para evitar duplicatas no mesmo minuto
const processedFiles = new Set();

/**
 * Extrai número da OS e nome do cliente do nome do arquivo FPQ
 * Suporta formatos: "OS_000965_SAMUEL DAVID.pdf", "000965 - SAMUEL DAVID.pdf",
 *                   "OS 965 SAMUEL.fpq", "ORCAMENTO_965_CLIENTE.pdf", etc.
 */
function parseFileName(fileName) {
    const nameWithoutExt = path.basename(fileName, path.extname(fileName));
    
    // Extrai número (sequência de 1+ dígitos)
    const numMatch = nameWithoutExt.match(/(\d{3,6})/);
    const orderNumber = numMatch ? parseInt(numMatch[1]) : null;
    
    // Extrai nome do cliente (texto após o número e separadores)
    let clientName = 'FPQ - ' + nameWithoutExt;
    const afterNum = nameWithoutExt.replace(/^[^a-zA-ZÀ-ÿ]*\d+[^a-zA-ZÀ-ÿ]*/, '').trim();
    if (afterNum.length > 2) clientName = afterNum;
    
    // Detecta tipo
    const upper = nameWithoutExt.toUpperCase();
    const isOS = upper.includes('OS') || upper.includes('ORDEM') || upper.includes('SERVICO') || upper.includes('SERVIÇO');
    const isOrcamento = upper.includes('ORC') || upper.includes('ORÇAMENTO') || upper.includes('ORCAMENTO') || upper.includes('BUDGET');
    
    return { orderNumber, clientName, isOS, isOrcamento, nameWithoutExt };
}

async function processFpqFile(filePath) {
    const fileName = path.basename(filePath);
    const ext = path.extname(fileName).toLowerCase();
    
    // Ignora arquivos temporários ou do sistema
    if (fileName.startsWith('~') || fileName.startsWith('.') || fileName.endsWith('.tmp')) return;
    
    // Evita processar o mesmo arquivo duas vezes em 30 segundos
    const key = filePath + '_' + Math.floor(Date.now() / 30000);
    if (processedFiles.has(key)) return;
    processedFiles.add(key);
    setTimeout(() => processedFiles.delete(key), 30000);
    
    // Aguarda o FPQ terminar de escrever
    await new Promise(resolve => setTimeout(resolve, 2500));
    
    if (!fs.existsSync(filePath)) return;
    
    const { orderNumber, clientName, isOS, isOrcamento, nameWithoutExt } = parseFileName(fileName);
    
    console.log(`📂 Arquivo FPQ detectado: ${fileName}`);
    console.log(`   → OS#: ${orderNumber} | Cliente: ${clientName} | Tipo: ${isOS ? 'OS' : isOrcamento ? 'Orçamento' : 'Geral'}`);
    
    try {
        let pdfUrl = null;
        
        // Se for PDF, faz upload para o Storage
        if (ext === '.pdf') {
            const fileBuffer = fs.readFileSync(filePath);
            const storagePath = `automated/${Date.now()}_${fileName}`;
            
            const { error: uploadError } = await supabase.storage
                .from('documents')
                .upload(storagePath, fileBuffer, { contentType: 'application/pdf', upsert: true });
            
            if (!uploadError) {
                const { data: { publicUrl } } = supabase.storage.from('documents').getPublicUrl(storagePath);
                pdfUrl = publicUrl;
                console.log('✅ PDF enviado: ' + publicUrl);
            }
        }
        
        // Cria/atualiza a OS no Supabase
        const clientId = await getOrCreateClient(clientName);
        const osData = {
            client_id: clientId,
            description: `Importado automaticamente do FPQ System - ${nameWithoutExt}`,
            status: 'aberta',
            priority: 'normal',
            ...(orderNumber && { order_number: orderNumber }),
            ...(pdfUrl && { pdf_url: pdfUrl }),
            estimated_date: new Date().toISOString().split('T')[0]
        };
        
        if (orderNumber) {
            // Tenta atualizar primeiro, se não existir, cria
            const { data: existing } = await supabase
                .from('service_orders')
                .select('id')
                .eq('order_number', orderNumber)
                .limit(1);
            
            if (existing && existing.length > 0) {
                await supabase.from('service_orders')
                    .update({ ...(pdfUrl && { pdf_url: pdfUrl }), client_id: clientId })
                    .eq('order_number', orderNumber);
                console.log(`🔄 OS #${orderNumber} atualizada`);
            } else {
                const { error } = await supabase.from('service_orders').insert(osData);
                if (error) console.error('Erro ao inserir OS:', error.message);
                else console.log(`✅ Nova OS #${orderNumber} criada no sistema!`);
            }
        } else {
            // Sem número, cria nova OS com título do arquivo
            osData.description = nameWithoutExt;
            const { error } = await supabase.from('service_orders').insert(osData);
            if (error) console.error('Erro ao inserir OS sem número:', error.message);
            else console.log(`✅ Nova OS criada: ${nameWithoutExt}`);
        }
        
        lastSyncStatus = `Sucesso: ${fileName} sincronizado`;
        lastSyncTime = new Date().toISOString();
    } catch (e) {
        console.error('❌ Erro ao processar arquivo FPQ:', e.message);
        lastSyncStatus = 'Erro: ' + e.message;
    }
}

// Inicia os watchers em todas as pastas configuradas
WATCH_DIRS.forEach(dir => {
    console.log('👀 Monitorando pasta FPQ (recursivo): ' + dir);
    fs.watch(dir, { recursive: true }, (eventType, filename) => {
        if (filename && (eventType === 'rename' || eventType === 'change')) {
            const fullPath = path.join(dir, filename);
            if (fs.existsSync(fullPath) && !fs.statSync(fullPath).isDirectory()) {
                processFpqFile(fullPath);
            }
        }
    });
});

if (WATCH_DIRS.length === 0) {
    console.warn('⚠️ Nenhuma pasta de monitoramento encontrada. Verifique PDF_WATCH_DIR no .env');
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

