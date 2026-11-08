const fs = require('fs');
let index = fs.readFileSync('index.html', 'utf8');

// The remaining call is in a PDF generation function (not the assinatura function), which is correct to keep
// Verify the fix message is correct
const fixPresent = index.includes('NOTE: Não chamamos salvarOrdemInterna() aqui pois enviarOrcamentoParaAssinaturaDigital');
console.log('Fix comment present:', fixPresent);

// Find if the original bad auto-save is gone from enviarOrcamentoParaAssinaturaDigital
const idxEnviar = index.indexOf('function enviarOrcamentoParaAssinaturaDigital()');
const idxEnviarEnd = index.indexOf('function ', idxEnviar + 100);
const enviarBlock = index.substring(idxEnviar, idxEnviarEnd);
const hasAutoSave = enviarBlock.includes('salvarOrdemInterna(true, false)');
console.log('Auto-save in enviarOrcamento (should be false):', hasAutoSave);
console.log('NOTE comment in enviarOrcamento:', enviarBlock.includes('NOTE: Não chamamos'));
