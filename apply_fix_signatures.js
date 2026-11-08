const fs = require('fs');

// ===========================================================================
// FIX 1: index.html - Expand autocura to also cover October 2026 signatures
// FIX 2: index.html - Fix salvarOrdemInterna to NOT add extra PDF version
//                      when the order is NOT genuinely signed
// FIX 3: index.html - Fix enviarOrcamentoParaAssinaturaDigital to NOT add
//                      extra PDF version if order is not genuinely signed
// FIX 4: assinar.html - Replace blind localStorage check with validated check
// ===========================================================================

let index = fs.readFileSync('index.html', 'utf8');
let assinar = fs.readFileSync('assinar.html', 'utf8');

// ───────────────────────────────────────────
// FIX 1: Expand autocura to cover Oct 2026
// ───────────────────────────────────────────
const oldAutocura = `      // 2. Qualquer assinatura de setembro de 2026 em ordens de novembro\r\n      if (assData && String(assData).includes('2026-09') && tOrd > new Date('2026-10-01').getTime()) {\r\n        invalido = true;\r\n      }`;

const newAutocura = `      // 2. Qualquer assinatura de setembro OU outubro de 2026 em ordens de novembro+\r\n      if (assData && (String(assData).includes('2026-09') || String(assData).includes('2026-10')) && tOrd > new Date('2026-11-01').getTime()) {\r\n        invalido = true;\r\n      }`;

// Also expand localStorage cleanup to include Oct
const oldAutocuraLocalStorage = `          if (v.data && String(v.data).includes('2026-09')) {\r\n            localStorage.removeItem(k);\r\n          }`;

const newAutocuraLocalStorage = `          if (v.data && (String(v.data).includes('2026-09') || String(v.data).includes('2026-10'))) {\r\n            localStorage.removeItem(k);\r\n          }`;

if (!index.includes(oldAutocura)) {
  console.error('ERROR: oldAutocura not found');
  process.exit(1);
}
if (!index.includes(oldAutocuraLocalStorage)) {
  console.error('ERROR: oldAutocuraLocalStorage not found');
  process.exit(1);
}

index = index.replace(oldAutocura, newAutocura);
index = index.replace(oldAutocuraLocalStorage, newAutocuraLocalStorage);

console.log('FIX 1 applied');

// ───────────────────────────────────────────
// FIX 2: salvarOrdemInterna - Only add new PDF version when genuinely signed
// When salvarOrdemInterna is called (silently, from enviarOrcamentoParaAssinaturaDigital),
// we need it to NOT blindly add a new PDF version. The issue is that when there's
// an editandoOsId set (from the previous salvarOrdemInterna call that created the order),
// the second call in enviarOrcamentoParaAssinaturaDigital treats it as an existing order
// and adds a 2nd version.
//
// The fix: In enviarOrcamentoParaAssinaturaDigital, do NOT call salvarOrdemInterna
// before the main logic. Instead, do the full save inline (the function already
// handles it). Remove the premature salvarOrdemInterna call.
// ───────────────────────────────────────────

const oldAutoSave = `  // ✅ SALVA A ORDEM DE SERVIÇO AUTOMATICAMENTE AO ENVIAR PARA ASSINATURA DIGITAL\r\n  try {\r\n    if (typeof salvarOrdemInterna === 'function') {\r\n      salvarOrdemInterna(true, false);\r\n    }\r\n  } catch (errAutoSave) {\r\n    console.warn('Auto-save da ordem antes da assinatura digital:', errAutoSave);\r\n  }`;

const newAutoSave = `  // ✅ NOTE: Não chamamos salvarOrdemInterna() aqui pois enviarOrcamentoParaAssinaturaDigital
  // já gerencia o histórico internamente, evitando PDF duplicado`;

if (!index.includes(oldAutoSave)) {
  console.error('ERROR: oldAutoSave not found in index.html');
  process.exit(1);
}

index = index.replace(oldAutoSave, newAutoSave);
console.log('FIX 2 applied');

// ───────────────────────────────────────────
// FIX 3: enviarOrcamentoParaAssinaturaDigital
// When editandoOsId exists but the order is NOT genuinely signed (pendente),
// we should update v1 in-place instead of pushing v2.
// ───────────────────────────────────────────

// Find the editandoOsId block in enviarOrcamentoParaAssinaturaDigital
const oldEnvioReajuste = `    if (editandoOsId) {\r\n      const idx = historico.findIndex(x => x.id === editandoOsId);\r\n      if (idx !== -1) {\r\n        const ordAntiga = historico[idx];\r\n        // 🛡️ PRESERVAÇÃO: O primeiro PDF assinado nunca é apagado\r\n        if (!ordAntiga.versoes_pdf || !ordAntiga.versoes_pdf.length) {\r\n          ordAntiga.versoes_pdf = [{\r\n            versao: 1,\r\n            titulo: 'v1 (Original' + (ordAntiga.assinado_por ? ' Assinado' : '') + ')',\r\n            data: ordAntiga.data_orc || d.data,\r\n            total: ordAntiga.total,\r\n            status: ordAntiga.status || 'aprovado',\r\n            assinado_por: ordAntiga.assinado_por || '',\r\n            assinado_em: ordAntiga.assinado_em || '',\r\n            dados: JSON.parse(JSON.stringify(ordAntiga.dados || {}))\r\n          }];\r\n        }\r\n\r\n        const proxV = ordAntiga.versoes_pdf.length + 1;\r\n        ordAntiga.versoes_pdf.push({\r\n          versao: proxV,\r\n          titulo: \`v\${proxV} (\${novoStatus === 'modificacao_aprovada' ? 'Modificação Aprovada' : 'Modificações'} - \${d.data})\`,\r\n          data: d.data,\r\n          total: d.total,\r\n          status: novoStatus,\r\n          dados: JSON.parse(JSON.stringify(d))\r\n        });\r\n\r\n        historico[idx] = {\r\n          ...ordAntiga,\r\n          nome: d.nome,\r\n          total: d.total,\r\n          data_orc: d.data,\r\n          dados: d,\r\n          status: novoStatus,\r\n          versoes_pdf: ordAntiga.versoes_pdf,\r\n          enviado_assinatura: true,\r\n          enviado_assinatura_em: new Date().toISOString()\r\n        };\r\n\r\n        if (novoStatus === 'reajustar') {\r\n          historico[idx].assinado_por = 'Aguardando Nova Assinatura';\r\n        }\r\n      }\r\n    } else {`;

const newEnvioReajuste = `    if (editandoOsId) {\r\n      const idx = historico.findIndex(x => x.id === editandoOsId);\r\n      if (idx !== -1) {\r\n        const ordAntiga = historico[idx];\r\n        // 🛡️ Verifica se a ordem já foi GENUINAMENTE assinada (não resíduo de teste)\r\n        const jaFoiAssinada = !!(ordAntiga.assinado_por &&\r\n          ordAntiga.assinado_por !== 'Aguardando Nova Assinatura' &&\r\n          !String(ordAntiga.assinado_em || '').includes('2026-10') &&\r\n          !String(ordAntiga.assinado_em || '').includes('2026-09') &&\r\n          ordAntiga.status === 'aprovado');\r\n\r\n        if (jaFoiAssinada) {\r\n          // 🛡️ PRESERVAÇÃO: O primeiro PDF assinado nunca é apagado - gera v2\r\n          if (!ordAntiga.versoes_pdf || !ordAntiga.versoes_pdf.length) {\r\n            ordAntiga.versoes_pdf = [{\r\n              versao: 1,\r\n              titulo: 'v1 (Original Assinado)',\r\n              data: ordAntiga.data_orc || d.data,\r\n              total: ordAntiga.total,\r\n              status: 'aprovado',\r\n              assinado_por: ordAntiga.assinado_por || '',\r\n              assinado_em: ordAntiga.assinado_em || '',\r\n              dados: JSON.parse(JSON.stringify(ordAntiga.dados || {}))\r\n            }];\r\n          }\r\n          const proxV = ordAntiga.versoes_pdf.length + 1;\r\n          ordAntiga.versoes_pdf.push({\r\n            versao: proxV,\r\n            titulo: \`v\${proxV} (\${novoStatus === 'modificacao_aprovada' ? 'Modificação Aprovada' : 'Modificações'} - \${d.data})\`,\r\n            data: d.data,\r\n            total: d.total,\r\n            status: novoStatus,\r\n            dados: JSON.parse(JSON.stringify(d))\r\n          });\r\n        } else {\r\n          // Ordem pendente ou com assinatura fantasma → mantém apenas v1 atualizado\r\n          ordAntiga.versoes_pdf = [{\r\n            versao: 1,\r\n            titulo: 'v1 (Original)',\r\n            data: d.data,\r\n            total: d.total,\r\n            status: 'pendente',\r\n            dados: JSON.parse(JSON.stringify(d))\r\n          }];\r\n          // Limpa assinatura fantasma\r\n          ordAntiga.assinado_por = '';\r\n          ordAntiga.assinado_em = '';\r\n          delete ordAntiga.assinatura_digital;\r\n          const numLimpoEnv = String(ordAntiga.numero || '').replace(/\\D/g, '');\r\n          try { localStorage.removeItem('sdv_assinatura_' + numLimpoEnv); } catch(_) {}\r\n          try {\r\n            const mapaEnv = JSON.parse(localStorage.getItem('sdv_assinaturas_map') || '{}');\r\n            delete mapaEnv[numLimpoEnv];\r\n            localStorage.setItem('sdv_assinaturas_map', JSON.stringify(mapaEnv));\r\n          } catch(_) {}\r\n        }\r\n\r\n        historico[idx] = {\r\n          ...ordAntiga,\r\n          nome: d.nome,\r\n          total: d.total,\r\n          data_orc: d.data,\r\n          dados: d,\r\n          status: jaFoiAssinada ? novoStatus : 'pendente',\r\n          versoes_pdf: ordAntiga.versoes_pdf,\r\n          enviado_assinatura: true,\r\n          enviado_assinatura_em: new Date().toISOString()\r\n        };\r\n\r\n        if (jaFoiAssinada && novoStatus === 'reajustar') {\r\n          historico[idx].assinado_por = 'Aguardando Nova Assinatura';\r\n        }\r\n      }\r\n    } else {`;

if (!index.includes(oldEnvioReajuste)) {
  console.error('ERROR: oldEnvioReajuste not found');
  process.exit(1);
}

index = index.replace(oldEnvioReajuste, newEnvioReajuste);
console.log('FIX 3 applied');

// ───────────────────────────────────────────
// FIX 4: assinar.html - Replace blind localStorage check with validated check
// ───────────────────────────────────────────

const oldAssinarCheck = `    // ── VERIFICAÇÃO AUTOMÁTICA DE ASSINATURA PRÉVIA ──\r\n    // Bloqueia nova assinatura se a O.S. já foi assinada nesta máquina ou no sistema\r\n    const numLimpoOs = String(data.numero_os || "").replace(/\\D/g, "");\r\n    if (!data.assinado && numLimpoOs) {\r\n      try {\r\n        const regLocal = localStorage.getItem("sdv_assinatura_" + numLimpoOs);\r\n        const mapLocal = JSON.parse(localStorage.getItem("sdv_assinaturas_map") || "{}");\r\n        const ordensLocal = JSON.parse(localStorage.getItem("sdv_ordens") || "[]");\r\n        const ordEncontrada = ordensLocal.find(o => String(o.numero || "").replace(/\\D/g, "") === numLimpoOs);\r\n\r\n        if (regLocal) {\r\n          const regObj = JSON.parse(regLocal);\r\n          data.assinado = true;\r\n          data.assinante_nome = regObj.nome || data.assinante_nome;\r\n          data.assinado_em = regObj.data || data.assinado_em;\r\n        } else if (mapLocal[numLimpoOs]) {\r\n          data.assinado = true;\r\n          data.assinante_nome = mapLocal[numLimpoOs].nome || data.assinante_nome;\r\n          data.assinado_em = mapLocal[numLimpoOs].data || data.assinado_em;\r\n        } else if (ordEncontrada && (ordEncontrada.status === "aprovado" || ordEncontrada.assinado_por || ordEncontrada.assinatura_digital)) {\r\n          data.assinado = true;\r\n          data.assinante_nome = ordEncontrada.assinado_por || (ordEncontrada.assinatura_digital && ordEncontrada.assinatura_digital.nome) || data.assinante_nome;\r\n          data.assinado_em = ordEncontrada.assinado_em || (ordEncontrada.assinatura_digital && ordEncontrada.assinatura_digital.data) || data.assinado_em;\r\n        }\r\n      } catch (_) {}\r\n    }`;

const newAssinarCheck = `    // ── VERIFICAÇÃO DE ASSINATURA: só bloqueia se realmente assinado no servidor ──
    // Não usa localStorage para bloquear - evita "fantasmas" de assinaturas antigas
    const numLimpoOs = String(data.numero_os || "").replace(/\\D/g, "");
    if (!data.assinado && numLimpoOs) {
      try {
        // Limpa qualquer resíduo de outubro/setembro que possa contaminar
        const regLocal = localStorage.getItem("sdv_assinatura_" + numLimpoOs);
        if (regLocal) {
          const regObj = JSON.parse(regLocal);
          const dataAss = regObj.data || '';
          // Só usa se for assinatura recente (não de períodos de teste)
          if (dataAss && (dataAss.includes('2026-09') || dataAss.includes('2026-10'))) {
            // Assinatura fantasma de período de teste — limpa e ignora
            localStorage.removeItem("sdv_assinatura_" + numLimpoOs);
          }
        }
        const mapLocal = JSON.parse(localStorage.getItem("sdv_assinaturas_map") || "{}");
        if (mapLocal[numLimpoOs]) {
          const dataAssMap = (mapLocal[numLimpoOs] && mapLocal[numLimpoOs].data) || '';
          if (dataAssMap && (dataAssMap.includes('2026-09') || dataAssMap.includes('2026-10'))) {
            delete mapLocal[numLimpoOs];
            localStorage.setItem("sdv_assinaturas_map", JSON.stringify(mapLocal));
          }
        }
        // NÃO marca como assinado baseado em localStorage — o servidor é a fonte de verdade
        // data.assinado só é true se a API /contrato retornou assinado=true
      } catch (_) {}
    }`;

if (!assinar.includes(oldAssinarCheck)) {
  console.error('ERROR: oldAssinarCheck not found in assinar.html');
  process.exit(1);
}

assinar = assinar.replace(oldAssinarCheck, newAssinarCheck);
console.log('FIX 4 applied');

// ───────────────────────────────────────────
// FIX 5: Bump cache version in sw.js and index.html
// ───────────────────────────────────────────
let sw = fs.readFileSync('sw.js', 'utf8');
sw = sw.replace(/sdmoveisprojetados-v9\.0\.4/g, 'sdmoveisprojetados-v9.0.5');
index = index.replace(/sw\.js\?v=9\.0\.4/g, 'sw.js?v=9.0.5');
index = index.replace(/v=9\.0\.4/g, 'v=9.0.5');
fs.writeFileSync('sw.js', sw, 'utf8');
console.log('FIX 5 applied (sw.js bumped)');

// Write files
fs.writeFileSync('index.html', index, 'utf8');
fs.writeFileSync('assinar.html', assinar, 'utf8');

console.log('All files written!');
