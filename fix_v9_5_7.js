/**
 * fix_v9_5_7.js
 * Aplica correções v9.5.7:
 * 1. PDF Resumo Financeiro: "Frete:" oculto quando valor = 0
 * 2. Card histórico OS: adiciona botões "📤 Enviar PDF" e "🔄 Reenviar Assinatura" 
 */

const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');
let changes = 0;

// ── FIX 1A: Frete no PDF modo DETALHADO ─────────────────────────────────────
// Antes: sempre desenhava o label "Frete:" + valor condicional
// Depois: só desenha se valFreteNum > 0
const OLD_FRETE_DETALHADO = `    totY -= 13;
    const txtValFrete = valFreteNum > 0 ? ('R$ ' + formatarValorPtBr(valFreteNum)) : '';
    page.drawText('Frete:', { x: rightCardX + 10, y: totY, size: 6.8, font: fontRegular, color: GRAY });
    if (txtValFrete) {
      page.drawText(txtValFrete, { x: rightCardX + rightCardW - 10 - fontBold.widthOfTextAtSize(txtValFrete, 7.2), y: totY, size: 7.2, font: fontBold, color: DARK });
    }
  }`;

const NEW_FRETE_DETALHADO = `    if (valFreteNum > 0) {
      totY -= 13;
      const txtValFrete = 'R$ ' + formatarValorPtBr(valFreteNum);
      page.drawText('Frete:', { x: rightCardX + 10, y: totY, size: 6.8, font: fontRegular, color: GRAY });
      page.drawText(txtValFrete, { x: rightCardX + rightCardW - 10 - fontBold.widthOfTextAtSize(txtValFrete, 7.2), y: totY, size: 7.2, font: fontBold, color: DARK });
    }
  }`;

if (html.includes(OLD_FRETE_DETALHADO)) {
  html = html.replace(OLD_FRETE_DETALHADO, NEW_FRETE_DETALHADO);
  changes++;
  console.log('✅ FIX 1: Frete no PDF modo detalhado - oculto quando zero');
} else {
  console.warn('⚠️  FIX 1: Trecho Frete detalhado não encontrado exatamente.');
}

// ── FIX 2: Card histórico - adicionar botões Enviar PDF e Reenviar Assinatura ──
// Localiza o bloco de botões do card e adiciona os novos botões
const OLD_HIST_BTNS = `      <div class="hist-btns" style="margin-top:10px;">
        <button class="btn btn-primary btn-sm" onclick="editarOs('\${o.id}')">✏️ Editar</button>
        \${btnPdf}
        \${btnVerAssinatura}
        \${btnStatusEnvio}
        \${btnAcaoAprovacao}
        <button class="btn btn-danger btn-sm" onclick="deletarOs('\${o.id}')">✕</button>
      </div>`;

const NEW_HIST_BTNS = `      <div class="hist-btns" style="margin-top:10px;">
        <button class="btn btn-primary btn-sm" onclick="editarOs('\${o.id}')">✏️ Editar</button>
        \${btnPdf}
        <button class="btn btn-gold btn-sm" onclick="enviarPdfOsDoHistorico('\${o.id}')" style="background:rgba(201,168,76,0.18);border:1.5px solid var(--gold);color:var(--gold-light);font-weight:800;" title="Enviar PDF via WhatsApp">📤 Enviar PDF</button>
        \${btnVerAssinatura}
        <button class="btn btn-sm" onclick="reenviarAssinaturaOs('\${o.id}')" style="background:rgba(99,102,241,0.18);border:1.5px solid #818cf8;color:#c4b5fd;font-weight:800;" title="Reenviar link de assinatura digital pelo WhatsApp">🔄 Reenviar Assinatura</button>
        \${btnStatusEnvio}
        \${btnAcaoAprovacao}
        <button class="btn btn-danger btn-sm" onclick="deletarOs('\${o.id}')">✕</button>
      </div>`;

if (html.includes(OLD_HIST_BTNS)) {
  html = html.replace(OLD_HIST_BTNS, NEW_HIST_BTNS);
  changes++;
  console.log('✅ FIX 2: Botões "Enviar PDF" e "Reenviar Assinatura" adicionados ao card');
} else {
  console.warn('⚠️  FIX 2: Bloco hist-btns não encontrado exatamente. Tentando alternativa...');
  // Tenta encontrar variação
  const alt = html.indexOf('btn btn-primary btn-sm" onclick="editarOs');
  if (alt >= 0) {
    console.log('  Contexto encontrado em:', alt);
    console.log(html.substring(alt-200, alt+500));
  }
}

// ── FIX 3: Adicionar funções enviarPdfOsDoHistorico e reenviarAssinaturaOs ──
// Injeta após a função deletarOs
const INJECT_AFTER = `function deletarOs(id) {`;
const NEW_FUNCTIONS = `function enviarPdfOsDoHistorico(id) {
  const o = historico.find(x => String(x.id) === String(id));
  if (!o) { alert('Ordem de Serviço não encontrada.'); return; }
  // Carrega a OS no formulário para gerar o PDF com todos os dados
  const dadosOs = o.dados || o;
  const telCli = (dadosOs.tel || dadosOs.telefone || o.tel || '').replace(/\\D/g, '');
  if (!telCli) {
    alert('Este cliente não tem WhatsApp cadastrado.');
    return;
  }
  // Usa editarOs para carregar a OS e depois enviar via botão Enviar PDF
  if (confirm('Deseja abrir esta O.S. para enviar o PDF via WhatsApp?')) {
    editarOs(id);
    setTimeout(() => {
      const btn = document.getElementById('btn-pdf-orc');
      if (btn) btn.click();
    }, 500);
  }
}

async function reenviarAssinaturaOs(id) {
  const o = historico.find(x => String(x.id) === String(id));
  if (!o) { alert('Ordem de Serviço não encontrada.'); return; }
  const dadosOs = o.dados || {};
  const telCli = (dadosOs.tel || dadosOs.telefone || o.tel || '').replace(/\\D/g, '');
  const nomeCli = dadosOs.nome || o.nome || '';
  const numOs = o.numero || '0001';

  if (!telCli) {
    alert('Este cliente não tem WhatsApp cadastrado.');
    return;
  }

  if (!confirm(\`Reenviar link de assinatura para \${nomeCli || 'o cliente'} via WhatsApp?\`)) return;

  // Tenta buscar link existente do Supabase
  const lic = (typeof obterLicencaAtiva === 'function') ? obterLicencaAtiva() : { id: 'sdmoveis', nome: 'SD Móveis Projetados' };
  const empParamUrl = \`&empresa=\${encodeURIComponent(lic.id || 'sdmoveis')}&empNome=\${encodeURIComponent(lic.nome || 'SD Móveis Projetados')}&empTipo=\${encodeURIComponent(lic.tipoContrato || 'moveis')}\`;

  let linkAssinatura = '';

  // Tenta pegar o contrato do Supabase primeiro
  try {
    if (o.contrato_id) {
      linkAssinatura = window.location.origin + '/assinar.html?id=' + o.contrato_id + empParamUrl;
    }
  } catch(e) {}

  if (!linkAssinatura) {
    // Gera link compacto autônomo
    const payload = {
      n: numOs,
      c: nomeCli,
      t: (dadosOs.tel || o.tel || ''),
      v: dadosOs.total || o.total || ''
    };
    const jsonStr = JSON.stringify(payload);
    const u8 = new TextEncoder().encode(jsonStr);
    let binStr = '';
    for (let i = 0; i < u8.length; i++) binStr += String.fromCharCode(u8[i]);
    const dParam = btoa(binStr).replace(/\\+/g, '-').replace(/\\//g, '_').replace(/=+$/, '');
    linkAssinatura = window.location.origin + '/assinar.html?d=' + dParam + empParamUrl;
  }

  const nomeEmpUpper = (lic.nome || 'SD MÓVEIS PROJETADOS').toUpperCase();
  const msg = \`*\${nomeEmpUpper} – ASSINATURA DIGITAL* ✍️\\n\\nOlá\${nomeCli ? ', ' + nomeCli : ''}! Segue o link para assinar a Ordem de Serviço *\${numOs}*:\\n\\n✍️ *Assinar Online:*\\n\${linkAssinatura}\\n\\nToque no link, revise e assine com o dedo na tela.\`;

  const zapNum = telCli.startsWith('55') ? telCli : '55' + telCli;
  window.open('https://wa.me/' + zapNum + '?text=' + encodeURIComponent(msg), '_blank');

  // Atualiza o status de envio
  const idx = historico.findIndex(x => String(x.id) === String(id));
  if (idx !== -1) {
    historico[idx].enviado_assinatura = true;
    historico[idx].enviado_assinatura_em = new Date().toISOString();
    if (typeof save === 'function') save(K.hist, historico);
    if (typeof renderHistorico === 'function') renderHistorico();
  }
}

function deletarOs(id) {`;

if (html.includes(INJECT_AFTER)) {
  html = html.replace(INJECT_AFTER, NEW_FUNCTIONS);
  changes++;
  console.log('✅ FIX 3: Funções enviarPdfOsDoHistorico e reenviarAssinaturaOs injetadas');
} else {
  console.warn('⚠️  FIX 3: Ponto de injeção "function deletarOs" não encontrado.');
}

// ── Salva ────────────────────────────────────────────────────────────────────
if (changes > 0) {
  fs.writeFileSync('index.html', html, 'utf8');
  console.log(`\n✅ ${changes} correções aplicadas. index.html salvo.`);
  console.log('index.html size:', fs.statSync('index.html').size);
} else {
  console.error('\n❌ Nenhuma correção aplicada. Arquivo NÃO modificado.');
}
