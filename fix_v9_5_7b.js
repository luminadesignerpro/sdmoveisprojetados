/**
 * fix_v9_5_7b.js — aplica fixes com CRLF exato
 */
const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');
let changes = 0;

// ── FIX 1: Frete no PDF modo detalhado (com CRLF) ───────────────────────────
// Detecta a string com \r\n
const idxFrete = html.indexOf('const txtValFrete = valFreteNum > 0 ? (\'R$ \' + formatarValorPtBr(valFreteNum)) : \'\';');
if (idxFrete >= 0) {
  // Pega o contexto completo para encontrar o bloco exato
  const ctx = html.substring(idxFrete - 30, idxFrete + 400);
  console.log('Frete context:', JSON.stringify(ctx.substring(0, 200)));
  
  // Substitui o bloco inteiro de frete detalhado
  const oldFrete = html.substring(idxFrete - 14, idxFrete + 350);
  // Vamos encontrar os delimitadores exatos
  const freteLine1Start = html.lastIndexOf('\n', idxFrete - 1); // início da linha totY -= 13
  const freteBlockEnd = html.indexOf('\n  }', idxFrete); // próximo fechamento de bloco
  
  if (freteLine1Start >= 0 && freteBlockEnd >= 0) {
    const oldBlock = html.substring(freteLine1Start + 1, freteBlockEnd + 4);
    console.log('Old Frete block:', JSON.stringify(oldBlock));
  }
}

// Abordagem mais simples: replace direto pelo padrão sem CRLF exato
// Normaliza temporariamente para LF, faz replace, restaura CRLF
const hasCRLF = html.includes('\r\n');
let h = hasCRLF ? html.replace(/\r\n/g, '\n') : html;

// FIX 1: Frete detalhado
const OLD_FRETE = `    totY -= 13;
    const txtValFrete = valFreteNum > 0 ? ('R$ ' + formatarValorPtBr(valFreteNum)) : '';
    page.drawText('Frete:', { x: rightCardX + 10, y: totY, size: 6.8, font: fontRegular, color: GRAY });
    if (txtValFrete) {
      page.drawText(txtValFrete, { x: rightCardX + rightCardW - 10 - fontBold.widthOfTextAtSize(txtValFrete, 7.2), y: totY, size: 7.2, font: fontBold, color: DARK });
    }
  }`;

const NEW_FRETE = `    if (valFreteNum > 0) {
      totY -= 13;
      const txtValFrete = 'R$ ' + formatarValorPtBr(valFreteNum);
      page.drawText('Frete:', { x: rightCardX + 10, y: totY, size: 6.8, font: fontRegular, color: GRAY });
      page.drawText(txtValFrete, { x: rightCardX + rightCardW - 10 - fontBold.widthOfTextAtSize(txtValFrete, 7.2), y: totY, size: 7.2, font: fontBold, color: DARK });
    }
  }`;

if (h.includes(OLD_FRETE)) {
  h = h.replace(OLD_FRETE, NEW_FRETE);
  changes++;
  console.log('✅ FIX 1: Frete PDF modo detalhado corrigido');
} else {
  console.warn('⚠️  FIX 1: Frete detalhado não encontrado.');
  // Mostra contexto para debug
  const idx = h.indexOf('const txtValFrete = valFreteNum');
  if (idx >= 0) console.log('  Contexto:', JSON.stringify(h.substring(idx - 20, idx + 300)));
}

// FIX 2: Botões do card histórico
const OLD_BTNS = `      <div class="hist-btns" style="margin-top:10px;">
        <button class="btn btn-primary btn-sm" onclick="editarOs('\${o.id}')">✏️ Editar</button>
        \${btnPdf}
        \${btnVerAssinatura}
        \${btnStatusEnvio}
        \${btnAcaoAprovacao}
        <button class="btn btn-danger btn-sm" onclick="deletarOs('\${o.id}')">✕</button>
      </div>`;

const NEW_BTNS = `      <div class="hist-btns" style="margin-top:10px;">
        <button class="btn btn-primary btn-sm" onclick="editarOs('\${o.id}')">✏️ Editar</button>
        \${btnPdf}
        <button class="btn btn-gold btn-sm" onclick="enviarPdfOsDoHistorico('\${o.id}')" style="background:rgba(201,168,76,0.18);border:1.5px solid #c9a84c;color:#e8d27a;font-weight:800;" title="Enviar PDF via WhatsApp">📤 Enviar PDF</button>
        \${btnVerAssinatura}
        <button class="btn btn-sm" onclick="reenviarAssinaturaOs('\${o.id}')" style="background:rgba(99,102,241,0.18);border:1.5px solid #818cf8;color:#c4b5fd;font-weight:800;" title="Reenviar link de assinatura">🔄 Reenviar Assinatura</button>
        \${btnStatusEnvio}
        \${btnAcaoAprovacao}
        <button class="btn btn-danger btn-sm" onclick="deletarOs('\${o.id}')">✕</button>
      </div>`;

if (h.includes(OLD_BTNS)) {
  h = h.replace(OLD_BTNS, NEW_BTNS);
  changes++;
  console.log('✅ FIX 2: Botões Enviar PDF e Reenviar Assinatura adicionados ao card');
} else {
  console.warn('⚠️  FIX 2: hist-btns não encontrado. Verificando...');
  const idx = h.indexOf('hist-btns');
  if (idx >= 0) console.log('  Contexto:', JSON.stringify(h.substring(idx - 50, idx + 500)));
}

// FIX 3: Verificar se as funções já foram injetadas (do script anterior)
if (!h.includes('function enviarPdfOsDoHistorico')) {
  const INJECT_AFTER = 'function deletarOs(id) {';
  const NEW_FUNS = `function enviarPdfOsDoHistorico(id) {
  const o = historico.find(x => String(x.id) === String(id));
  if (!o) { alert('Ordem de Serviço não encontrada.'); return; }
  if (confirm('Deseja abrir esta O.S. para enviar o PDF via WhatsApp?')) {
    editarOs(id);
    setTimeout(() => {
      const btn = document.getElementById('btn-pdf-orc');
      if (btn) btn.click();
    }, 600);
  }
}

async function reenviarAssinaturaOs(id) {
  const o = historico.find(x => String(x.id) === String(id));
  if (!o) { alert('Ordem de Serviço não encontrada.'); return; }
  const dadosOs = o.dados || {};
  const telCli = (dadosOs.tel || dadosOs.telefone || o.tel || '').replace(/\\D/g, '');
  const nomeCli = dadosOs.nome || o.nome || '';
  const numOs = o.numero || '0001';
  if (!telCli) { alert('Este cliente não tem WhatsApp cadastrado.'); return; }
  if (!confirm('Reenviar link de assinatura para ' + (nomeCli || 'o cliente') + ' via WhatsApp?')) return;
  const lic = (typeof obterLicencaAtiva === 'function') ? obterLicencaAtiva() : { id: 'sdmoveis', nome: 'SD Móveis Projetados' };
  const empParamUrl = '&empresa=' + encodeURIComponent(lic.id || 'sdmoveis') + '&empNome=' + encodeURIComponent(lic.nome || 'SD Móveis Projetados') + '&empTipo=' + encodeURIComponent(lic.tipoContrato || 'moveis');
  let linkAssinatura = '';
  if (o.contrato_id) {
    linkAssinatura = window.location.origin + '/assinar.html?id=' + o.contrato_id + empParamUrl;
  }
  if (!linkAssinatura) {
    const payload = { n: numOs, c: nomeCli, t: (dadosOs.tel || o.tel || ''), v: dadosOs.total || o.total || '' };
    const jsonStr = JSON.stringify(payload);
    const u8 = new TextEncoder().encode(jsonStr);
    let binStr = '';
    for (let i = 0; i < u8.length; i++) binStr += String.fromCharCode(u8[i]);
    const dParam = btoa(binStr).replace(/\\+/g, '-').replace(/\\//g, '_').replace(/=+$/, '');
    linkAssinatura = window.location.origin + '/assinar.html?d=' + dParam + empParamUrl;
  }
  const nomeEmpUpper = (lic.nome || 'SD MÓVEIS PROJETADOS').toUpperCase();
  const msg = '*' + nomeEmpUpper + ' – ASSINATURA DIGITAL* ✍️\\n\\nOlá' + (nomeCli ? ', ' + nomeCli : '') + '! Segue o link para assinar a Ordem de Serviço *' + numOs + '*:\\n\\n✍️ *Assinar Online:*\\n' + linkAssinatura + '\\n\\nToque no link, revise e assine com o dedo na tela.';
  const zapNum = telCli.startsWith('55') ? telCli : '55' + telCli;
  window.open('https://wa.me/' + zapNum + '?text=' + encodeURIComponent(msg), '_blank');
  const idx2 = historico.findIndex(x => String(x.id) === String(id));
  if (idx2 !== -1) {
    historico[idx2].enviado_assinatura = true;
    historico[idx2].enviado_assinatura_em = new Date().toISOString();
    if (typeof save === 'function') save(K.hist, historico);
    if (typeof renderHistorico === 'function') renderHistorico();
  }
}

function deletarOs(id) {`;

  if (h.includes(INJECT_AFTER)) {
    h = h.replace(INJECT_AFTER, NEW_FUNS);
    changes++;
    console.log('✅ FIX 3: Funções reenvio injetadas');
  } else {
    console.warn('⚠️  FIX 3: deletarOs não encontrado');
  }
} else {
  console.log('ℹ️  FIX 3: Funções reenvio já existem (injetadas anteriormente)');
}

// Restaura CRLF se necessário
if (hasCRLF) h = h.replace(/\n/g, '\r\n');

if (changes > 0) {
  fs.writeFileSync('index.html', h, 'utf8');
  console.log('\n✅ Total:', changes, 'correções aplicadas');
  console.log('index.html size:', fs.statSync('index.html').size);
} else {
  console.error('\n❌ Nenhuma correção aplicada.');
}
