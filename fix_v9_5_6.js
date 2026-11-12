/**
 * fix_v9_5_6.js
 * Aplica todas as correções v9.5.6:
 * 1. Remove itens do gerarParametroD (link WhatsApp enorme)
 * 2. Visualizador PDF: detecta Android e pula PDF.js → fallback direto
 * 3. Badges 2º ambiente: overflow hidden + wrap corrigido
 * 4. SW version bump
 * 5. SW register version bump
 */

const fs = require('fs');

// ── Lê os arquivos ──────────────────────────────────────────────────────────
let html = fs.readFileSync('index.html', 'utf8');
let sw   = fs.readFileSync('sw.js', 'utf8');

let changes = 0;

// ── FIX 1: gerarParametroD — remover itens (campo "i") do payload ──────────
// A inclusão dos itens no dParam gera URLs gigantes quando ntfy/Supabase falham.
// O link de PDF já usa ?p= (ntfy) ou ?id= (Supabase). Se ambos falharem, a API
// vai regenerar o PDF a partir dos dados compactos (sem itens).
const OLD_ITENS_BLOCK = `    if (d.itens && d.itens.length) {
      payloadCompacto.i = d.itens.map(it => [
        it.desc || "",
        it.qtd || 1,
        it.larg || "",
        it.alt || "",
        it.m2 || "",
        it.v_unit || "",
        it.total || "",
        it.cor || "",
        it.bizt || "",
        it.ambiente || ""
      ]);
    }
    const jsonStr = JSON.stringify(payloadCompacto);`;

const NEW_ITENS_BLOCK = `    // NÃO incluímos itens no dParam para manter a URL curta.
    // O PDF é obtido via ?p= (ntfy) ou ?id= (Supabase).
    const jsonStr = JSON.stringify(payloadCompacto);`;

if (html.includes(OLD_ITENS_BLOCK)) {
  html = html.replace(OLD_ITENS_BLOCK, NEW_ITENS_BLOCK);
  changes++;
  console.log('✅ FIX 1: Removidos itens do gerarParametroD');
} else {
  console.warn('⚠️  FIX 1: Trecho de itens não encontrado exatamente. Verificar manualmente.');
}

// ── FIX 2: Visualizador PDF — detectar Android Chrome e pular PDF.js ────────
// No Android Chrome, PDF.js tenta mas falha silenciosamente ou mostra UUID.
// Detectamos Android e pulamos direto para o fallback com botões Baixar/Tela Cheia.
const OLD_PDFJS_BLOCK = `    // 1. Renderiza com PDF.js para 100% de compatibilidade em celulares Android, iPhones e PCs
    let renderizouComSucesso = false;
    if (typeof pdfjsLib !== 'undefined') {`;

const NEW_PDFJS_BLOCK = `    // 1. Renderiza com PDF.js — EXCETO no Android Chrome (mostra UUID do blob)
    const isAndroidChrome = /Android/i.test(navigator.userAgent) && /Chrome/i.test(navigator.userAgent);
    let renderizouComSucesso = false;
    if (!isAndroidChrome && typeof pdfjsLib !== 'undefined') {`;

if (html.includes(OLD_PDFJS_BLOCK)) {
  html = html.replace(OLD_PDFJS_BLOCK, NEW_PDFJS_BLOCK);
  changes++;
  console.log('✅ FIX 2: Visualizador PDF detecta Android Chrome e pula PDF.js');
} else {
  console.warn('⚠️  FIX 2: Bloco PDF.js não encontrado exatamente.');
}

// ── FIX 3: Badges 2º ambiente — adicionar overflow:hidden e min-width:0 ─────
// O problema é que a span com o valor fica empurrada para fora no mobile.
// Adicionar overflow:hidden na div dos badges resolve o corte.
const OLD_BADGE_WRAP = `        <!-- BADGES DE VALORES -->
        <div style="display:flex;flex-direction:column;gap:5px;width:100%;max-width:240px;margin-top:2px;">`;

const NEW_BADGE_WRAP = `        <!-- BADGES DE VALORES -->
        <div style="display:flex;flex-direction:column;gap:5px;width:100%;max-width:240px;margin-top:2px;overflow:hidden;">`;

if (html.includes(OLD_BADGE_WRAP)) {
  html = html.replace(OLD_BADGE_WRAP, NEW_BADGE_WRAP);
  changes++;
  console.log('✅ FIX 3: Badges 2º ambiente com overflow:hidden');
} else {
  console.warn('⚠️  FIX 3: Wrapper de badges não encontrado exatamente.');
}

// ── FIX 4: SW registration version bump ─────────────────────────────────────
const OLD_SW_REG = `navigator.serviceWorker.register('/sw.js?v=9.1.2')`;
const NEW_SW_REG = `navigator.serviceWorker.register('/sw.js?v=9.5.6')`;
if (html.includes(OLD_SW_REG)) {
  html = html.replace(OLD_SW_REG, NEW_SW_REG);
  changes++;
  console.log('✅ FIX 4: SW registration versão atualizada para 9.5.6');
} else {
  // Tenta versão alternativa
  const alt = `navigator.serviceWorker.register('/sw.js?v=9.5.5')`;
  if (html.includes(alt)) {
    html = html.replace(alt, NEW_SW_REG);
    changes++;
    console.log('✅ FIX 4: SW registration versão 9.5.5 → 9.5.6');
  } else {
    console.warn('⚠️  FIX 4: SW register não encontrado. Versão atual mantida.');
  }
}

// ── FIX 5: Duplicação do bloco de ambientes (fpdf/ambNome duplicado) ─────────
// A função gerarParametroD tinha fpdf/ambNome e o bloco amb definidos DUAS vezes.
const OLD_DUP_BLOCK = `    payloadCompacto.fpdf = (typeof _modoPdfOrcamentoSelecionado !== 'undefined' ? _modoPdfOrcamentoSelecionado : (d.formatoPdf || 'ambiente'));
    payloadCompacto.ambNome = (document.getElementById('inp-orc-ambiente-top') ? document.getElementById('inp-orc-ambiente-top').value.trim() : '') || 'Sala';
    if (typeof obterResumoAmbientesParaPdf === 'function') {
      const resAmb = obterResumoAmbientesParaPdf();
      if (resAmb && resAmb.length) {
        payloadCompacto.amb = resAmb.map(a => [
          a.nome || '',
          a.obs || '',
          Math.round(a.produtosVal || 0),
          Math.round(a.servicosVal || 0),
          Math.round(a.totalVal || 0)
        ]);
      }
    }
    // NÃO incluímos itens no dParam para manter a URL curta.
    // O PDF é obtido via ?p= (ntfy) ou ?id= (Supabase).
    const jsonStr = JSON.stringify(payloadCompacto);`;

const NEW_DUP_BLOCK = `    // NÃO incluímos itens no dParam para manter a URL curta.
    // O PDF é obtido via ?p= (ntfy) ou ?id= (Supabase).
    const jsonStr = JSON.stringify(payloadCompacto);`;

if (html.includes(OLD_DUP_BLOCK)) {
  html = html.replace(OLD_DUP_BLOCK, NEW_DUP_BLOCK);
  changes++;
  console.log('✅ FIX 5: Bloco duplicado de fpdf/ambNome removido de gerarParametroD');
} else {
  console.log('ℹ️  FIX 5: Bloco duplicado não encontrado (pode já ter sido corrigido ou ter estrutura diferente).');
}

// ── FIX SW: versão do Service Worker ────────────────────────────────────────
const OLD_SW_VER = `'sdmoveisprojetados-v9.5.5 (Fix: badges ambientes alinhados, visualizador PDF Android, links WhatsApp e API)'`;
const NEW_SW_VER = `'sdmoveisprojetados-v9.5.6 (Fix: link WhatsApp curto, PDF viewer Android, badges ambientes)'`;

if (sw.includes(OLD_SW_VER)) {
  sw = sw.replace(OLD_SW_VER, NEW_SW_VER);
  changes++;
  console.log('✅ FIX SW: Versão do Service Worker atualizada para v9.5.6');
} else {
  // Tenta com regex mais amplo
  const swVerMatch = sw.match(/'sdmoveisprojetados-v[\d.]+[^']*'/);
  if (swVerMatch) {
    sw = sw.replace(swVerMatch[0], NEW_SW_VER);
    changes++;
    console.log('✅ FIX SW: Versão do Service Worker atualizada via regex para v9.5.6');
  } else {
    console.warn('⚠️  FIX SW: Versão do SW não encontrada.');
  }
}

// ── Salva os arquivos ────────────────────────────────────────────────────────
fs.writeFileSync('index.html', html, 'utf8');
fs.writeFileSync('sw.js', sw, 'utf8');

console.log(`\n✅ Total de ${changes} correções aplicadas.`);
console.log('📁 index.html e sw.js salvos com sucesso.');
