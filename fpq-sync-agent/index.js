const Firebird = require('node-firebird');
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const fs = require('fs');
const http = require('http');

// Garante que o .env seja lido da pasta onde o executável está
const envPath = path.join(process.cwd(), '.env');
require('dotenv').config({ path: envPath });

console.log('========================================');
console.log('  SD MÓVEIS - SINCRONIZADOR FPQ v2.0  ');
console.log('========================================');
console.log('Lendo configuração de: ' + envPath);

// ─────────────────────────────────────────────
// CAMINHOS POSSÍVEIS DO BANCO FIREBIRD (DADOS.FDB)
// O agente vai tentar cada um até encontrar o arquivo
// ─────────────────────────────────────────────
const FIREBIRD_CANDIDATES = [
  process.env.FIREBIRD_DATABASE,                          // do .env (prioridade máxima)
  'C:\\OSMARCENARIA5.9\\DADOS.FDB',
  'C:\\FpqSystem\\DADOS.FDB',
  'C:\\FPQ\\DADOS.FDB',
  'C:\\Program Files\\OSMARCENARIA5.9\\DADOS.FDB',
  'C:\\Program Files (x86)\\OSMARCENARIA5.9\\DADOS.FDB',
  path.join(process.env.USERPROFILE || 'C:\\Users\\User', 'Desktop', 'DADOS.FDB'),
  path.join(process.env.USERPROFILE || 'C:\\Users\\User', 'Documents', 'DADOS.FDB'),
].filter(Boolean);

// Encontra o primeiro caminho que existe
function findFirebirdDatabase() {
  for (const candidate of FIREBIRD_CANDIDATES) {
    if (fs.existsSync(candidate)) {
      console.log('✅ Banco Firebird encontrado em: ' + candidate);
      return candidate;
    }
  }
  console.warn('⚠️  Banco DADOS.FDB não encontrado em nenhum caminho padrão.');
  console.warn('   Caminhos testados:');
  FIREBIRD_CANDIDATES.forEach(c => console.warn('   - ' + c));
  console.warn('   Defina FIREBIRD_DATABASE no arquivo .env com o caminho correto.');
  return FIREBIRD_CANDIDATES[0]; // usa o .env mesmo que não exista, para dar erro descritivo
}

const FIREBIRD_DATABASE = findFirebirdDatabase();

const fbOptions = {
  host: '127.0.0.1',
  port: 3050,
  database: FIREBIRD_DATABASE,
  user: process.env.FIREBIRD_USER || 'SYSDBA',
  password: process.env.FIREBIRD_PASSWORD || 'masterkey',
  lowercase_keys: false
};

console.log('🔗 Configuração Firebird:');
console.log('   Banco : ' + fbOptions.database);
console.log('   Usuário: ' + fbOptions.user);

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// ─────────────────────────────────────────────
// PASTAS MONITORADAS PELO FILE WATCHER
// O FPQ pode exportar PDFs/arquivos em qualquer uma delas
// ─────────────────────────────────────────────
const PDF_WATCH_CANDIDATES = [
  process.env.PDF_WATCH_DIR,                                                          // .env (prioridade)
  'C:\\OSMARCENARIA5.9\\Export',
  'C:\\OSMARCENARIA5.9',
  'C:\\FpqSystem\\Export',
  'C:\\FPQ\\Export',
  path.join(process.env.USERPROFILE || 'C:\\Users\\User', 'Desktop', 'SD MOVEIS vercel 2026'),
  path.join(process.env.USERPROFILE || 'C:\\Users\\User', 'Desktop'),
  path.join(process.env.USERPROFILE || 'C:\\Users\\User', 'Documents'),
].filter(Boolean);

// Monta lista de pastas que existem (ou tenta criar)
const WATCH_DIRS = [];
for (const dir of PDF_WATCH_CANDIDATES) {
  if (fs.existsSync(dir)) {
    if (!WATCH_DIRS.includes(dir)) WATCH_DIRS.push(dir);
  } else {
    try {
      fs.mkdirSync(dir, { recursive: true });
      if (!WATCH_DIRS.includes(dir)) WATCH_DIRS.push(dir);
      console.log('📁 Pasta criada para monitoramento: ' + dir);
    } catch (e) {
      // pasta inválida, ignora
    }
  }
}

// Pasta adicional de orçamentos dentro do Export
const ORCAMENTOS_DIR = path.join(process.env.PDF_WATCH_DIR || 'C:\\OSMARCENARIA5.9\\Export', 'ORÇAMENTOS');
if (!WATCH_DIRS.includes(ORCAMENTOS_DIR)) {
  if (!fs.existsSync(ORCAMENTOS_DIR)) {
    try { fs.mkdirSync(ORCAMENTOS_DIR, { recursive: true }); } catch (e) {}
  }
  if (fs.existsSync(ORCAMENTOS_DIR)) WATCH_DIRS.push(ORCAMENTOS_DIR);
}

console.log('\n👀 Pastas monitoradas (' + WATCH_DIRS.length + '):');
WATCH_DIRS.forEach(d => console.log('   - ' + d));

let lastSyncStatus = "Nunca sincronizado";
let lastSyncTime = null;
let syncCount = 0;

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────
async function getOrCreateClient(name) {
  if (!name) return null;
  const cleanName = name.trim();
  try {
    const { data: existing } = await supabase
      .from('clients')
      .select('id')
      .ilike('name', cleanName)
      .limit(1);
    if (existing && existing.length > 0) return existing[0].id;

    const { data: newClient, error } = await supabase
      .from('clients')
      .insert({ name: cleanName, status: 'ativo' })
      .select('id')
      .single();
    if (error) throw error;
    return newClient.id;
  } catch (e) {
    console.error(`Erro ao resolver cliente "${cleanName}":`, e.message);
    return null;
  }
}

// Executa uma query Firebird e retorna Promise<rows[]>
function fbQuery(db, sql) {
  return new Promise((resolve, reject) => {
    db.query(sql, (err, result) => {
      if (err) reject(err);
      else resolve(result || []);
    });
  });
}

// Tenta uma lista de queries SQL e retorna o primeiro que funcionar
async function fbQueryFirstSuccess(db, queries) {
  for (const sql of queries) {
    try {
      const rows = await fbQuery(db, sql);
      console.log(`   ✅ Query OK: ${sql.substring(0, 60)}...`);
      return rows;
    } catch (e) {
      console.log(`   ⚠️  Query falhou (${sql.substring(0, 40)}...): ${e.message}`);
    }
  }
  return [];
}

// ─────────────────────────────────────────────
// SYNC PRINCIPAL (Firebird → Supabase)
// ─────────────────────────────────────────────
async function syncData() {
  syncCount++;
  console.log('\n[' + new Date().toLocaleString() + '] 🔄 SYNC #' + syncCount + ' iniciando...');

  return new Promise((resolve) => {
    Firebird.attach(fbOptions, async function (err, db) {
      if (err) {
        const msg = `Erro de conexão Firebird: ${err.message}`;
        lastSyncStatus = msg;
        console.error('❌ ' + msg);
        console.error('   Banco configurado: ' + fbOptions.database);
        if (!fs.existsSync(fbOptions.database)) {
          console.error('   ⚠️  ARQUIVO NÃO ENCONTRADO! Verifique o caminho FIREBIRD_DATABASE no .env');
        }
        resolve();
        return;
      }

      console.log('   ✅ Conectado ao Firebird!');

      try {
        // 1. ORDENS DE SERVIÇO — tenta nomes alternativos de tabela
        const osRows = await fbQueryFirstSuccess(db, [
          'SELECT * FROM ORDEM_SERVICO',
          'SELECT * FROM ORDENS_SERVICO',
          'SELECT * FROM OS',
          'SELECT * FROM ORDENSSERVICO',
        ]);
        if (osRows.length > 0) {
          console.log('📦 Sincronizando ' + osRows.length + ' OS...');
          for (const row of osRows) {
            try {
              const clientId = await getOrCreateClient(row.CLIENTE || row.NOME_CLIENTE || row.NM_CLIENTE);
              const orderNum = row.NUMERO || row.NUM_OS || row.ID || row.CODIGO;
              await supabase.from('service_orders').upsert({
                order_number: orderNum,
                client_id: clientId,
                description: row.SERVICO || row.DESCRICAO || row.DS_SERVICO || 'OS Importada do FPQ',
                total_value: parseFloat(row.VALOR_TOTAL || row.VALOR || row.VL_TOTAL || 0),
                status: (row.SITUACAO || row.STATUS || 'aberta').toLowerCase(),
                estimated_date: row.DATA || row.DT_EMISSAO || new Date().toISOString().split('T')[0],
                updated_at: new Date().toISOString()
              }, { onConflict: 'order_number' });
            } catch (e) {
              console.error('   Erro OS individual:', e.message);
            }
          }
        }

        // 2. CONTRATOS — tenta nomes alternativos
        const contractRows = await fbQueryFirstSuccess(db, [
          'SELECT * FROM CONTRATOS',
          'SELECT * FROM CONTRATO',
          'SELECT * FROM PEDIDOS',
          'SELECT * FROM PEDIDO',
        ]);
        if (contractRows.length > 0) {
          console.log('📄 Sincronizando ' + contractRows.length + ' Contratos/Pedidos...');
          for (const row of contractRows) {
            try {
              const clientId = await getOrCreateClient(row.CLIENTE || row.NOME_CLIENTE);
              const contractNum = row.NUMERO || row.NUM_PEDIDO || row.ID || row.CODIGO;
              await supabase.from('contracts').upsert({
                contract_number: contractNum,
                client_id: clientId,
                title: row.DESCRICAO || row.DS_PEDIDO || 'Contrato FPQ - ' + contractNum,
                value: parseFloat(row.VALOR_TOTAL || row.TOTAL || row.VL_TOTAL || 0),
                status: (row.SITUACAO || row.STATUS || 'assinado').toLowerCase(),
                created_at: row.DATA || row.DT_EMISSAO || new Date().toISOString(),
                updated_at: new Date().toISOString()
              }, { onConflict: 'contract_number' });
            } catch (e) {
              console.error('   Erro Contrato individual:', e.message);
            }
          }
        }

        // 3. VENDAS / PROJETOS — tenta nomes alternativos
        const salesRows = await fbQueryFirstSuccess(db, [
          'SELECT * FROM VENDAS',
          'SELECT * FROM VENDA',
          'SELECT * FROM PROJETOS',
          'SELECT * FROM PROJETO',
          'SELECT * FROM ORCAMENTOS',
          'SELECT * FROM ORCAMENTO',
        ]);
        if (salesRows.length > 0) {
          console.log('💰 Sincronizando ' + salesRows.length + ' Vendas/Projetos...');
          for (const row of salesRows) {
            try {
              const clientId = await getOrCreateClient(row.CLIENTE || row.NOME_CLIENTE);
              const title = row.DESCRICAO || row.DS_VENDA || 'Venda/Projeto - ' + (row.ID || row.NUMERO || row.CODIGO);
              await supabase.from('client_projects').upsert({
                title,
                client_id: clientId,
                value: parseFloat(row.VALOR_TOTAL || row.TOTAL || row.VL_TOTAL || 0),
                status: 'assinado',
                deadline: row.DATA_ENTREGA || row.DT_ENTREGA || row.DATA || new Date().toISOString().split('T')[0],
                project_type: 'Móveis Projetados (FPQ)',
                updated_at: new Date().toISOString()
              }, { onConflict: 'title, client_id' });
            } catch (e) {
              console.error('   Erro Venda individual:', e.message);
            }
          }
        }

        // 4. FINANCEIRO / PARCELAS — tenta nomes alternativos
        const finRows = await fbQueryFirstSuccess(db, [
          'SELECT * FROM RECEBER',
          'SELECT * FROM CONTAS_RECEBER',
          'SELECT * FROM FINANCEIRO',
          'SELECT * FROM PARCELAS',
          'SELECT * FROM CONTAS',
        ]);
        if (finRows.length > 0) {
          console.log('💳 Sincronizando ' + finRows.length + ' Parcelas...');
          for (const row of finRows) {
            try {
              const firebirdSaleId = row.ID_VENDA || row.ID_PEDIDO || row.ID_OS || row.NUM_PEDIDO;
              if (!firebirdSaleId) continue;

              const { data: projects } = await supabase
                .from('client_projects')
                .select('id')
                .ilike('title', `%${firebirdSaleId}%`)
                .limit(1);

              const projectId = projects && projects.length > 0 ? projects[0].id : null;
              if (projectId) {
                await supabase.from('project_installments').upsert({
                  project_id: projectId,
                  installment_number: row.PARCELA || row.NUMERO || row.NUM_PARCELA || 1,
                  amount: parseFloat(row.VALOR || row.VALOR_PARCELA || row.VL_PARCELA || 0),
                  due_date: row.VENCIMENTO || row.DATA_VENCIMENTO || row.DT_VENCIMENTO || new Date().toISOString().split('T')[0],
                  paid: !!(row.DATA_PAGAMENTO || row.DT_PAGAMENTO || row.PAGO || row.SITUACAO === 'P')
                }, { onConflict: 'project_id, installment_number' });
              }
            } catch (e) {
              console.error('   Erro Parcela individual:', e.message);
            }
          }
        }

        lastSyncStatus = `Sucesso: ${new Date().toLocaleTimeString()} - ${osRows.length} OS, ${contractRows.length} contratos, ${salesRows.length} projetos`;
        lastSyncTime = new Date().toISOString();
        console.log('✅ SYNC COMPLETO!\n');
      } catch (globalErr) {
        lastSyncStatus = 'Erro geral: ' + globalErr.message;
        console.error('❌ Erro geral no sync:', globalErr.message);
      } finally {
        try { db.detach(); } catch (e) {}
        resolve();
      }
    });
  });
}

// ─────────────────────────────────────────────
// FILE WATCHER — Captura arquivos exportados pelo FPQ
// ─────────────────────────────────────────────
const processedFiles = new Set();

function parseFileName(fileName) {
  const nameWithoutExt = path.basename(fileName, path.extname(fileName));
  const numMatch = nameWithoutExt.match(/(\d{3,6})/);
  const orderNumber = numMatch ? parseInt(numMatch[1]) : null;

  let clientName = 'FPQ - ' + nameWithoutExt;
  const afterNum = nameWithoutExt.replace(/^[^a-zA-ZÀ-ÿ]*\d+[^a-zA-ZÀ-ÿ]*/, '').trim();
  if (afterNum.length > 2) clientName = afterNum;

  const upper = nameWithoutExt.toUpperCase();
  const isOS = upper.includes('OS') || upper.includes('ORDEM') || upper.includes('SERVICO') || upper.includes('SERVIÇO');
  const isOrcamento = upper.includes('ORC') || upper.includes('ORÇAMENTO') || upper.includes('ORCAMENTO') || upper.includes('BUDGET');

  return { orderNumber, clientName, isOS, isOrcamento, nameWithoutExt };
}

async function processFpqFile(filePath) {
  const fileName = path.basename(filePath);
  const ext = path.extname(fileName).toLowerCase();

  if (fileName.startsWith('~') || fileName.startsWith('.') || fileName.endsWith('.tmp')) return;
  if (!['.pdf', '.fpq', '.txt', '.xml', '.csv'].includes(ext)) return;

  const key = filePath + '_' + Math.floor(Date.now() / 30000);
  if (processedFiles.has(key)) return;
  processedFiles.add(key);
  setTimeout(() => processedFiles.delete(key), 30000);

  // Aguarda o FPQ terminar de escrever o arquivo
  await new Promise(resolve => setTimeout(resolve, 2500));
  if (!fs.existsSync(filePath)) return;

  const { orderNumber, clientName, isOS, isOrcamento, nameWithoutExt } = parseFileName(fileName);
  console.log(`\n📂 Arquivo FPQ detectado: ${fileName}`);
  console.log(`   → OS#: ${orderNumber} | Cliente: ${clientName} | Tipo: ${isOS ? 'OS' : isOrcamento ? 'Orçamento' : 'Geral'}`);

  try {
    let pdfUrl = null;

    // Upload do PDF para o Supabase Storage
    if (ext === '.pdf') {
      const fileBuffer = fs.readFileSync(filePath);
      const storagePath = `automated/${Date.now()}_${fileName}`;
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(storagePath, fileBuffer, { contentType: 'application/pdf', upsert: true });
      if (!uploadError) {
        const { data: { publicUrl } } = supabase.storage.from('documents').getPublicUrl(storagePath);
        pdfUrl = publicUrl;
        console.log('   ✅ PDF enviado ao Storage: ' + publicUrl);
      } else {
        console.warn('   ⚠️  Erro no upload do PDF:', uploadError.message);
      }
    }

    const clientId = await getOrCreateClient(clientName);
    const osData = {
      client_id: clientId,
      description: `Importado automaticamente do FPQ System - ${nameWithoutExt}`,
      status: 'aberta',
      priority: 'normal',
      estimated_date: new Date().toISOString().split('T')[0],
      updated_at: new Date().toISOString(),
      ...(orderNumber && { order_number: orderNumber }),
      ...(pdfUrl && { pdf_url: pdfUrl }),
    };

    if (orderNumber) {
      const { data: existing } = await supabase
        .from('service_orders')
        .select('id')
        .eq('order_number', orderNumber)
        .limit(1);

      if (existing && existing.length > 0) {
        await supabase.from('service_orders')
          .update({ ...(pdfUrl && { pdf_url: pdfUrl }), client_id: clientId, updated_at: new Date().toISOString() })
          .eq('order_number', orderNumber);
        console.log(`   🔄 OS #${orderNumber} atualizada no Supabase!`);
      } else {
        const { error } = await supabase.from('service_orders').insert(osData);
        if (error) console.error('   ❌ Erro ao inserir OS:', error.message);
        else console.log(`   ✅ Nova OS #${orderNumber} criada no Supabase!`);
      }
    } else {
      osData.description = nameWithoutExt;
      const { error } = await supabase.from('service_orders').insert(osData);
      if (error) console.error('   ❌ Erro ao inserir OS:', error.message);
      else console.log(`   ✅ Nova OS criada: ${nameWithoutExt}`);
    }

    lastSyncStatus = `Arquivo: ${fileName} sincronizado às ${new Date().toLocaleTimeString()}`;
    lastSyncTime = new Date().toISOString();
  } catch (e) {
    console.error('❌ Erro ao processar arquivo FPQ:', e.message);
    lastSyncStatus = 'Erro no arquivo: ' + e.message;
  }
}

// Inicia watchers em todas as pastas válidas
if (WATCH_DIRS.length > 0) {
  WATCH_DIRS.forEach(dir => {
    try {
      fs.watch(dir, { recursive: true }, (eventType, filename) => {
        if (filename && (eventType === 'rename' || eventType === 'change')) {
          const fullPath = path.join(dir, filename);
          try {
            if (fs.existsSync(fullPath) && !fs.statSync(fullPath).isDirectory()) {
              processFpqFile(fullPath);
            }
          } catch (e) { /* ignora erros de stat */ }
        }
      });
      console.log('👀 Monitorando: ' + dir);
    } catch (e) {
      console.warn('⚠️  Não foi possível monitorar ' + dir + ': ' + e.message);
    }
  });
} else {
  console.warn('⚠️  Nenhuma pasta de monitoramento encontrada.');
}

// Watcher para projetos Promob
const PROMOB_PROJECTS_DIR = process.env.PROMOB_PROJECTS_DIR || 
  path.join(process.env.USERPROFILE || 'C:\\Users\\User', 'Documents', 'Promob', 'Projects');

if (fs.existsSync(PROMOB_PROJECTS_DIR)) {
  console.log('👀 Monitorando Promob: ' + PROMOB_PROJECTS_DIR);
  fs.watch(PROMOB_PROJECTS_DIR, (eventType, filename) => {
    if (filename && eventType === 'rename' && filename.endsWith('.promob')) {
      const projectName = path.basename(filename, '.promob');
      supabase.from('client_projects').upsert({
        title: projectName,
        client_name: 'Cliente Promob Local',
        project_type: 'Promob Plus (Importado)',
        status: 'producao',
        updated_at: new Date().toISOString()
      }, { onConflict: 'title, client_name' })
      .then(() => console.log('✅ Projeto Promob sincronizado: ' + projectName))
      .catch(e => console.error('Erro Promob:', e.message));
    }
  });
}

// ─────────────────────────────────────────────
// SERVIDOR DE STATUS (http://localhost:3001/status)
// ─────────────────────────────────────────────
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
      version: '2.0.0',
      syncCount,
      config: {
        firebirdDatabase: fbOptions.database,
        firebirdFound: fs.existsSync(fbOptions.database),
        watchDirs: WATCH_DIRS,
        promobDir: PROMOB_PROJECTS_DIR
      }
    }));
  } else if (req.url === '/sync') {
    // Permite forçar sync via GET http://localhost:3001/sync
    syncData().catch(console.error);
    res.writeHead(200);
    res.end(JSON.stringify({ message: 'Sync manual iniciado!' }));
  } else {
    res.writeHead(404);
    res.end();
  }
});

const HTTP_PORT = process.env.HTTP_PORT || 3001;
server.listen(HTTP_PORT, () => {
  console.log('\n🌐 Servidor de status: http://localhost:' + HTTP_PORT + '/status');
  console.log('🌐 Sync manual:        http://localhost:' + HTTP_PORT + '/sync');
});

// ─────────────────────────────────────────────
// EXECUÇÃO
// ─────────────────────────────────────────────
const SYNC_INTERVAL_MS = parseInt(process.env.SYNC_INTERVAL_MS || '60000');
console.log('\n⏱️  Sincronização automática a cada ' + (SYNC_INTERVAL_MS / 1000) + ' segundos');
console.log('=========================================\n');

// Primeira execução imediata
syncData().catch(console.error);

// Execuções periódicas
setInterval(() => syncData().catch(console.error), SYNC_INTERVAL_MS);
