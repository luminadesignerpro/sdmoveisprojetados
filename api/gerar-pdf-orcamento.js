const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');

// Paleta de Cores Premium SD VIDROS & SD MÓVEIS
const DARK = rgb(0.09, 0.12, 0.18);      // Slate Navy elegante
const GOLD = rgb(0.79, 0.63, 0.22);      // Dourado nobre
const GOLD_LIGHT = rgb(0.96, 0.93, 0.84);// Dourado suave para fundos
const GRAY = rgb(0.42, 0.46, 0.54);      // Cinza neutro texto secundário
const LIGHT_GRAY = rgb(0.65, 0.69, 0.76);// Cinza claro
const BORDER = rgb(0.86, 0.89, 0.93);    // Borda suave
const BOX_BG = rgb(0.98, 0.98, 0.99);    // Fundo de cards
const HEADER_BG = rgb(0.93, 0.95, 0.98); // Fundo sutil de cabeçalhos
const ROW_ALT = rgb(0.97, 0.98, 0.99);   // Fundo alternado de linhas
const WHITE = rgb(1, 1, 1);
const GREEN_BG = rgb(0.93, 0.97, 0.94);  // Fundo PIX
const GREEN_TXT = rgb(0.12, 0.48, 0.24); // Texto PIX

const PAGE_W = 595.28; // A4 pt
const PAGE_H = 841.89;
const MARGIN_X = 32;
const CONTENT_W = PAGE_W - (MARGIN_X * 2); // 531.28 pt

function sanitizePdf(text) {
  if (text == null) return '';
  return String(text)
    .replace(/[^\x00-\x7F\xA0-\xFF\u2022]/g, '')
    .trim();
}

function wrapText(text, font, size, maxWidth) {
  const words = sanitizePdf(text).split(/\s+/).filter(Boolean);
  const lines = [];
  let line = '';
  for (const word of words) {
    const test = line ? line + ' ' + word : word;
    if (font.widthOfTextAtSize(test, size) > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines.length ? lines : [''];
}

function formatMoney(val) {
  if (val == null) return '0,00';
  let str = String(val).replace('R$', '').trim();
  if (!str) return '0,00';
  if (str.includes(',') && str.includes('.')) return str;
  if (str.includes(',')) {
    const p = str.split(',');
    const intP = Number(p[0].replace(/\D/g, '') || 0).toLocaleString('pt-BR');
    const decP = (p[1] || '00').padEnd(2, '0').slice(0, 2);
    return intP + ',' + decP;
  }
  if (str.includes('.')) {
    const num = parseFloat(str);
    if (!isNaN(num)) return num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  const num = parseInt(str.replace(/\D/g, ''), 10);
  if (!isNaN(num)) return num.toLocaleString('pt-BR') + ',00';
  return str;
}

async function gerarPdfOrcamento(dados, fetchLogo, empInfo) {
  const {
    numero, dataStr, nome, cnpj, tel, endereco, bairro, cidade, apto, resp,
    itens, total, forma, obs, prazo, garantia
  } = dados;

  const pdfDoc = await PDFDocument.create();
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  let logoImage = null;
  try {
    const buf = await fetchLogo(empInfo && empInfo.logoFile ? empInfo.logoFile : (empInfo && empInfo.ehMoveis ? 'logo_moveis.jpg' : 'logo.jpg'));
    if (buf) logoImage = await pdfDoc.embedJpg(buf);
  } catch (e) { /* segue sem logo */ }

  const page = pdfDoc.addPage([PAGE_W, PAGE_H]);

  // 1. Faixa decorativa superior dourada
  page.drawRectangle({
    x: MARGIN_X,
    y: PAGE_H - 24,
    width: CONTENT_W,
    height: 3.5,
    color: GOLD
  });

  // ---------------- 2. CABEÇALHO ELEGANTE ----------------
  const headerY = PAGE_H - 34;

  // Logo com borda suave
  if (logoImage) {
    const logoSize = 48;
    page.drawRectangle({
      x: MARGIN_X,
      y: headerY - logoSize,
      width: logoSize,
      height: logoSize,
      borderColor: BORDER,
      borderWidth: 0.8,
      color: WHITE
    });
    page.drawImage(logoImage, {
      x: MARGIN_X + 2,
      y: headerY - logoSize + 2,
      width: logoSize - 4,
      height: logoSize - 4
    });
  }

  const textX = logoImage ? MARGIN_X + 56 : MARGIN_X;
  const nomeEmpresaUpper = sanitizePdf((empInfo.nome || (empInfo.ehMoveis ? 'SD MÓVEIS PROJETADOS' : 'SD VIDROS')).toUpperCase());
  page.drawText(nomeEmpresaUpper, { x: textX, y: headerY - 14, size: 16.5, font: fontBold, color: DARK });

  const segmentoEmpresa = sanitizePdf((empInfo.segmento || (empInfo.ehMoveis ? 'MÓVEIS PLANEJADOS & MARCENARIA DE LUXO' : 'SOLUÇÕES EM VIDROS TEMPERADOS E ESQUADRIAS DE ALUMÍNIO')).toUpperCase());
  page.drawText(segmentoEmpresa, { x: textX, y: headerY - 26, size: 7.2, font: fontBold, color: GOLD });

  const endEmpresa = sanitizePdf(empInfo.endereco || (empInfo.ehMoveis ? 'Itaitinga - CE' : 'Rua Jorge Figueiredo 740, Barrocão - Itaitinga-CE • CNPJ: 49.226.611/0001-33'));
  page.drawText(endEmpresa, { x: textX, y: headerY - 37, size: 7, font: fontRegular, color: GRAY });

  const contatosEmpresa = sanitizePdf(empInfo.contatos || (empInfo.ehMoveis ? 'WhatsApp: (85) 99611-9824 | Atendimento & Projetos Sob Medida' : 'WhatsApp: (85) 99611-9824 • 99760-2237 • 98574-9606 | sdvidros2025@gmail.com'));
  page.drawText(contatosEmpresa, { x: textX, y: headerY - 48, size: 7, font: fontRegular, color: GRAY });

  // Badge do Orçamento no canto direito superior
  const badgeW = 142;
  const badgeH = 50;
  const badgeX = MARGIN_X + CONTENT_W - badgeW;
  const badgeY = headerY - badgeH;

  page.drawRectangle({
    x: badgeX,
    y: badgeY,
    width: badgeW,
    height: badgeH,
    color: DARK
  });

  // Linha dourada na lateral do badge
  page.drawRectangle({
    x: badgeX,
    y: badgeY,
    width: 3.5,
    height: badgeH,
    color: GOLD
  });

  const numLimpo = String(numero || '000001').replace('#', '').padStart(6, '0');
  page.drawText('PROPOSTA COMERCIAL', { x: badgeX + 10, y: badgeY + 35, size: 7, font: fontBold, color: GOLD });
  page.drawText(`Nº ${numLimpo}`, { x: badgeX + 10, y: badgeY + 20, size: 12, font: fontBold, color: WHITE });

  const agora = new Date();
  const horaStr = agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const dataFormatada = dataStr || agora.toLocaleDateString('pt-BR');
  page.drawText(`Emissão: ${dataFormatada} às ${horaStr}`, { x: badgeX + 10, y: badgeY + 8, size: 6.8, font: fontRegular, color: rgb(0.85, 0.88, 0.93) });

  // ---------------- 3. CARD: DADOS DO CLIENTE & LOCAL ----------------
  const clientCardY = badgeY - 14;
  const clientCardH = 58;
  const clientCardBoxY = clientCardY - clientCardH;

  page.drawRectangle({
    x: MARGIN_X,
    y: clientCardBoxY,
    width: CONTENT_W,
    height: clientCardH,
    color: BOX_BG,
    borderColor: BORDER,
    borderWidth: 0.8
  });

  // Topo interno do card
  page.drawRectangle({
    x: MARGIN_X,
    y: clientCardY - 15,
    width: CONTENT_W,
    height: 15,
    color: HEADER_BG
  });
  page.drawText('IDENTIFICAÇÃO DO CLIENTE & LOCAL DA INSTALAÇÃO', { x: MARGIN_X + 10, y: clientCardY - 11, size: 7, font: fontBold, color: DARK });

  const nomeCliente = String(nome || 'CLIENTE NÃO INFORMADO').toUpperCase();
  const telCliente = String(tel || '').trim();
  const endLimpo = String(endereco || '').toUpperCase();
  const bairroNome = String(bairro || '').toUpperCase();
  const cidadeNome = String(cidade || '').toUpperCase();
  const bairroCidade = [bairroNome, cidadeNome ? cidadeNome + ' - CE' : 'CE'].filter(Boolean).join(', ');

  // Linha 1: Cliente e Telefone
  page.drawText('CLIENTE:', { x: MARGIN_X + 10, y: clientCardY - 27, size: 6.8, font: fontBold, color: GRAY });
  page.drawText(nomeCliente.substring(0, 48), { x: MARGIN_X + 56, y: clientCardY - 27, size: 8, font: fontBold, color: DARK });

  page.drawText('WHATSAPP / TEL:', { x: MARGIN_X + 340, y: clientCardY - 27, size: 6.8, font: fontBold, color: GRAY });
  page.drawText(telCliente || '-', { x: MARGIN_X + 420, y: clientCardY - 27, size: 8, font: fontBold, color: DARK });

  // Linha 2: Endereço e Bairro/Cidade
  page.drawText('ENDEREÇO:', { x: MARGIN_X + 10, y: clientCardY - 41, size: 6.8, font: fontBold, color: GRAY });
  page.drawText((endLimpo || 'Não informado').substring(0, 52), { x: MARGIN_X + 68, y: clientCardY - 41, size: 7.5, font: fontRegular, color: DARK });

  page.drawText('BAIRRO / CID:', { x: MARGIN_X + 340, y: clientCardY - 41, size: 6.8, font: fontBold, color: GRAY });
  page.drawText(bairroCidade || 'Itaitinga - CE', { x: MARGIN_X + 406, y: clientCardY - 41, size: 7.5, font: fontRegular, color: DARK });

  // Linha 3: CPF/CNPJ e Complemento
  page.drawText('CPF / CNPJ:', { x: MARGIN_X + 10, y: clientCardY - 54, size: 6.8, font: fontBold, color: GRAY });
  page.drawText(cnpj || 'Não informado', { x: MARGIN_X + 68, y: clientCardY - 54, size: 7.5, font: fontRegular, color: DARK });

  if (apto) {
    page.drawText('COMPL / APTO:', { x: MARGIN_X + 220, y: clientCardY - 54, size: 6.8, font: fontBold, color: GRAY });
    page.drawText(String(apto).toUpperCase(), { x: MARGIN_X + 284, y: clientCardY - 54, size: 7.5, font: fontRegular, color: DARK });
  }

  // ---------------- 4. TABELA DE ITENS & SERVIÇOS ----------------
  const tableHeaderY = clientCardBoxY - 14;
  const tableHeaderH = 19;

  // Barra de cabeçalho da tabela escura e elegante
  page.drawRectangle({
    x: MARGIN_X,
    y: tableHeaderY - tableHeaderH,
    width: CONTENT_W,
    height: tableHeaderH,
    color: DARK
  });

  page.drawText('ITEM', { x: MARGIN_X + 6, y: tableHeaderY - 13, size: 7, font: fontBold, color: WHITE });
  page.drawText('DESCRIÇÃO DO PRODUTO / SERVIÇO', { x: MARGIN_X + 30, y: tableHeaderY - 13, size: 7, font: fontBold, color: WHITE });
  page.drawText('MEDIDAS (L x A)', { x: MARGIN_X + 248, y: tableHeaderY - 13, size: 7, font: fontBold, color: WHITE });
  page.drawText('ÁREA (M²)', { x: MARGIN_X + 322, y: tableHeaderY - 13, size: 7, font: fontBold, color: WHITE });
  page.drawText('QTD', { x: MARGIN_X + 374, y: tableHeaderY - 13, size: 7, font: fontBold, color: WHITE });
  page.drawText('VL. UNIT (R$)', { x: MARGIN_X + 418, y: tableHeaderY - 13, size: 7, font: fontBold, color: WHITE });
  page.drawText('TOTAL (R$)', { x: MARGIN_X + 478, y: tableHeaderY - 13, size: 7, font: fontBold, color: WHITE });

  let curY = tableHeaderY - tableHeaderH;
  const itensList = Array.isArray(itens) && itens.length ? itens : [];

  if (!itensList.length) {
    const rowH = 26;
    curY -= rowH;
    page.drawRectangle({
      x: MARGIN_X,
      y: curY,
      width: CONTENT_W,
      height: rowH,
      color: WHITE,
      borderColor: BORDER,
      borderWidth: 0.6
    });
    page.drawText('01', { x: MARGIN_X + 8, y: curY + 9, size: 7.5, font: fontBold, color: GRAY });
    const itemPadrao = empInfo.ehMoveis ? 'MÓVEIS PLANEJADOS & MARCENARIA SOB MEDIDA' : 'SERVIÇOS DE VIDRAÇARIA E ESQUADRIAS DE ALUMÍNIO';
    page.drawText(itemPadrao, { x: MARGIN_X + 30, y: curY + 9, size: 7.5, font: fontBold, color: DARK });
    page.drawText('Sob Medida', { x: MARGIN_X + 248, y: curY + 9, size: 7.5, font: fontRegular, color: GRAY });
    page.drawText('-', { x: MARGIN_X + 332, y: curY + 9, size: 7.5, font: fontRegular, color: GRAY });
    page.drawText('1 UND', { x: MARGIN_X + 374, y: curY + 9, size: 7.5, font: fontRegular, color: DARK });

    const valTot = formatMoney(total);
    page.drawText(valTot, { x: MARGIN_X + 418, y: curY + 9, size: 7.5, font: fontRegular, color: DARK });
    page.drawText(valTot, { x: MARGIN_X + 478, y: curY + 9, size: 8, font: fontBold, color: DARK });
  } else {
    itensList.forEach((it, idx) => {
      let descTxt = String(it.desc || '').toUpperCase();
      if (it.cor) descTxt += ` (${String(it.cor).toUpperCase()})`;

      const descLines = wrapText(descTxt, fontRegular, 7.5, 210);
      const rowH = Math.max(24, descLines.length * 11 + 10);
      curY -= rowH;

      // Fundo alternado
      page.drawRectangle({
        x: MARGIN_X,
        y: curY,
        width: CONTENT_W,
        height: rowH,
        color: idx % 2 === 0 ? WHITE : ROW_ALT,
        borderColor: BORDER,
        borderWidth: 0.5
      });

      // Item #
      const numItemStr = String(idx + 1).padStart(2, '0');
      page.drawText(numItemStr, { x: MARGIN_X + 8, y: curY + rowH - 13, size: 7.5, font: fontBold, color: GRAY });

      // Descrição do item
      descLines.forEach((l, lIdx) => {
        page.drawText(l, { x: MARGIN_X + 30, y: curY + rowH - 13 - (lIdx * 10), size: 7.5, font: lIdx === 0 ? fontBold : fontRegular, color: DARK });
      });

      // Medidas
      let medTxt = '-';
      if (it.larg && it.alt) {
        medTxt = `${it.larg} x ${it.alt} m`;
      }
      page.drawText(medTxt, { x: MARGIN_X + 248, y: curY + rowH - 13, size: 7.5, font: fontRegular, color: DARK });

      // Área m²
      let m2Txt = '-';
      if (it.m2) {
        const numM2 = parseFloat(String(it.m2).replace(',', '.'));
        if (!isNaN(numM2) && numM2 > 0) {
          m2Txt = String(it.m2).replace('m²', '').trim() + ' m²';
        }
      }
      page.drawText(m2Txt, { x: MARGIN_X + 322, y: curY + rowH - 13, size: 7.5, font: fontRegular, color: DARK });

      // Quantidade
      page.drawText(`${it.qtd || 1} UND`, { x: MARGIN_X + 374, y: curY + rowH - 13, size: 7.5, font: fontRegular, color: DARK });

      // Valor unitário
      const vUnitTxt = formatMoney(it.v_unit);
      page.drawText(vUnitTxt, { x: MARGIN_X + 418, y: curY + rowH - 13, size: 7.5, font: fontRegular, color: DARK });

      // Valor total do item
      const vTotTxt = formatMoney(it.total);
      page.drawText(vTotTxt, { x: MARGIN_X + 478, y: curY + rowH - 13, size: 7.8, font: fontBold, color: DARK });
    });
  }

  // ---------------- 5. CARDS INFERIORES (CONDIÇÕES & TOTAIS) ----------------
  const rodapeCardH = 70;
  const rodapeCardY = 26;
  const rodapeTop = rodapeCardY + rodapeCardH;

  // Altura dos cards comerciais
  const cardBottomH = 146;
  let bottomY = curY - 12;

  let cardBottomY = bottomY - cardBottomH;
  let spaceBelowCards = cardBottomY - rodapeTop;

  // Se apertar o rodapé por excesso de itens, ajusta bottomY
  if (spaceBelowCards < 12) {
    bottomY = rodapeTop + 12 + cardBottomH;
    cardBottomY = bottomY - cardBottomH;
    spaceBelowCards = cardBottomY - rodapeTop;
  }

  // CARD ESQUERDO: CONDIÇÕES & PAGAMENTO (Largura: 320 pt)
  const leftCardW = 320;
  page.drawRectangle({
    x: MARGIN_X,
    y: cardBottomY,
    width: leftCardW,
    height: cardBottomH,
    color: BOX_BG,
    borderColor: BORDER,
    borderWidth: 0.8
  });

  // Cabeçalho do Card Esquerdo
  page.drawRectangle({
    x: MARGIN_X,
    y: bottomY - 16,
    width: leftCardW,
    height: 16,
    color: HEADER_BG
  });
  page.drawText('CONDIÇÕES COMERCIAIS & FORMAS DE PAGAMENTO', { x: MARGIN_X + 8, y: bottomY - 12, size: 7, font: fontBold, color: DARK });

  let condY = bottomY - 28;
  const formaTxt = forma ? String(forma).toUpperCase() : 'À VISTA';
  page.drawText(`• Forma Escolhida: ${formaTxt}`, { x: MARGIN_X + 8, y: condY, size: 7.2, font: fontBold, color: DARK });
  condY -= 11;
  page.drawText('• Opções: 50% na entrada + 50% na entrega | Até 10x s/ juros no cartão', { x: MARGIN_X + 8, y: condY, size: 6.8, font: fontRegular, color: GRAY });
  condY -= 11;
  page.drawText(`• Prazo de Execução: ${prazo || '15 dias úteis após confirmação'}`, { x: MARGIN_X + 8, y: condY, size: 6.8, font: fontRegular, color: DARK });
  condY -= 11;
  page.drawText(`• Garantia: ${garantia || '1 Ano de garantia legal e de instalação'}`, { x: MARGIN_X + 8, y: condY, size: 6.8, font: fontRegular, color: DARK });

  if (obs) {
    condY -= 11;
    page.drawText(`• Observações: ${String(obs).substring(0, 50)}`, { x: MARGIN_X + 8, y: condY, size: 6.8, font: fontRegular, color: GRAY });
  }

  // Box PIX no rodapé do Card Esquerdo
  const pixBoxH = 46;
  const pixBoxY = cardBottomY + 7;
  page.drawRectangle({
    x: MARGIN_X + 8,
    y: pixBoxY,
    width: leftCardW - 16,
    height: pixBoxH,
    color: GREEN_BG,
    borderColor: rgb(0.72, 0.85, 0.76),
    borderWidth: 0.8
  });
  page.drawText('DADOS PARA PAGAMENTO VIA PIX:', { x: MARGIN_X + 16, y: pixBoxY + 32, size: 6.8, font: fontBold, color: GREEN_TXT });

  if (empInfo.ehMoveis) {
    const pixChave = empInfo.pixChave || '85996119824';
    const pixTit = empInfo.pixTitular || 'SD Móveis Projetados';
    page.drawText(sanitizePdf(`Chave PIX: ${pixChave} (${pixTit})`), { x: MARGIN_X + 16, y: pixBoxY + 20, size: 6.8, font: fontBold, color: DARK });
    page.drawText(sanitizePdf(`WhatsApp / Contato: ${empInfo.telefone || '(85) 99611-9824'}`), { x: MARGIN_X + 16, y: pixBoxY + 9, size: 6.8, font: fontRegular, color: DARK });
  } else {
    page.drawText('Chave CNPJ: 49.226.611/0001-33 (InfinityPay - SD Vidros)', { x: MARGIN_X + 16, y: pixBoxY + 20, size: 6.8, font: fontRegular, color: DARK });
    page.drawText('Chave Celular: (85) 99760-2237 (Itaú - Samuel David)', { x: MARGIN_X + 16, y: pixBoxY + 9, size: 6.8, font: fontRegular, color: DARK });
  }

  // CARD DIREITO: RESUMO FINANCEIRO E TOTAL (Largura: 198 pt)
  const rightCardW = CONTENT_W - leftCardW - 12; // ~199 pt
  const rightCardX = MARGIN_X + leftCardW + 12;

  page.drawRectangle({
    x: rightCardX,
    y: cardBottomY,
    width: rightCardW,
    height: cardBottomH,
    color: BOX_BG,
    borderColor: BORDER,
    borderWidth: 0.8
  });

  // Cabeçalho do Card Direito
  page.drawRectangle({
    x: rightCardX,
    y: bottomY - 16,
    width: rightCardW,
    height: 16,
    color: HEADER_BG
  });
  page.drawText('RESUMO FINANCEIRO', { x: rightCardX + 8, y: bottomY - 12, size: 7, font: fontBold, color: DARK });

  let totY = bottomY - 32;
  const valorTotalFormatado = formatMoney(total);

  page.drawText('Valor dos Materiais:', { x: rightCardX + 10, y: totY, size: 7, font: fontRegular, color: GRAY });
  page.drawText(`R$ ${valorTotalFormatado}`, { x: rightCardX + rightCardW - 10 - fontBold.widthOfTextAtSize(`R$ ${valorTotalFormatado}`, 7.5), y: totY, size: 7.5, font: fontBold, color: DARK });

  totY -= 14;
  page.drawText('Mão de Obra e Instalação:', { x: rightCardX + 10, y: totY, size: 7, font: fontRegular, color: GRAY });
  page.drawText('Inclusa', { x: rightCardX + rightCardW - 10 - fontRegular.widthOfTextAtSize('Inclusa', 7), y: totY, size: 7, font: fontRegular, color: DARK });

  totY -= 14;
  page.drawText('Frete e Deslocamento:', { x: rightCardX + 10, y: totY, size: 7, font: fontRegular, color: GRAY });
  page.drawText('Incluso', { x: rightCardX + rightCardW - 10 - fontRegular.widthOfTextAtSize('Incluso', 7), y: totY, size: 7, font: fontRegular, color: DARK });

  // Bloco de destaque do VALOR TOTAL
  const totalBoxH = 50;
  const totalBoxY = cardBottomY + 7;
  page.drawRectangle({
    x: rightCardX + 8,
    y: totalBoxY,
    width: rightCardW - 16,
    height: totalBoxH,
    color: DARK
  });
  page.drawRectangle({
    x: rightCardX + 8,
    y: totalBoxY,
    width: rightCardW - 16,
    height: totalBoxH,
    borderColor: GOLD,
    borderWidth: 1.2
  });

  page.drawText('TOTAL DO ORÇAMENTO', { x: rightCardX + 18, y: totalBoxY + 34, size: 7, font: fontBold, color: GOLD });
  page.drawText(`R$ ${valorTotalFormatado}`, { x: rightCardX + 18, y: totalBoxY + 14, size: 14, font: fontBold, color: WHITE });

  // ---------------- 6. BARRA DE DIFERENCIAIS & CARD DE ESPECIFICAÇÕES TÉCNICAS ----------------
  // Preenche harmonicamente o espaço intermediário sem deixar vazio branco
  if (spaceBelowCards >= 140) {
    // 6.1 Barra com 4 Pilares de Confiança
    const badgesY = cardBottomY - 12;
    const badgesH = 24;
    const badgeColW = (CONTENT_W - 18) / 4;

    const selos = empInfo.ehMoveis ? [
      { t1: '100% MDF', t2: 'NAVAL PREMIUM' },
      { t1: 'PADRÃO LUXO', t2: 'SOB MEDIDA' },
      { t1: 'PONTUALIDADE', t2: 'NA ENTREGA' },
      { t1: '1 ANO DE', t2: 'GARANTIA REAL' }
    ] : [
      { t1: '100% VIDRO', t2: 'TEMPERADO' },
      { t1: 'PADRÃO NORMAS', t2: 'ABNT NBR 14698' },
      { t1: 'PONTUALIDADE', t2: 'NA ENTREGA' },
      { t1: '1 ANO DE', t2: 'GARANTIA REAL' }
    ];

    selos.forEach((s, sIdx) => {
      const bX = MARGIN_X + (sIdx * (badgeColW + 6));
      page.drawRectangle({
        x: bX,
        y: badgesY - badgesH,
        width: badgeColW,
        height: badgesH,
        color: BOX_BG,
        borderColor: BORDER,
        borderWidth: 0.6
      });
      // Borda decorativa dourada no topo de cada selo
      page.drawRectangle({
        x: bX,
        y: badgesY - 2.5,
        width: badgeColW,
        height: 2.5,
        color: GOLD
      });

      const txtFull = `${s.t1} ${s.t2}`;
      const txtW = fontBold.widthOfTextAtSize(txtFull, 6.2);
      page.drawText(txtFull, {
        x: bX + Math.max(4, (badgeColW - txtW) / 2),
        y: badgesY - 15,
        size: 6.2,
        font: fontBold,
        color: DARK
      });
    });

    // 6.2 Card Executivo de Padrão Técnico e Segurança
    const qualTopY = badgesY - badgesH - 10;
    const qualBottomY = rodapeTop + 10;
    const qualCardH = qualTopY - qualBottomY;

    if (qualCardH >= 70) {
      page.drawRectangle({
        x: MARGIN_X,
        y: qualBottomY,
        width: CONTENT_W,
        height: qualCardH,
        color: BOX_BG,
        borderColor: BORDER,
        borderWidth: 0.8
      });

      // Cabeçalho do Card Técnico
      const qualHeaderH = 15;
      page.drawRectangle({
        x: MARGIN_X,
        y: qualTopY - qualHeaderH,
        width: CONTENT_W,
        height: qualHeaderH,
        color: HEADER_BG
      });

      const tituloCardTecnico = empInfo.ehMoveis
        ? 'PADRÃO TÉCNICO DE MARCENARIA, NORMAS DE QUALIDADE & ACABAMENTO'
        : 'PADRÃO TÉCNICO DE ENGENHARIA, NORMAS DE SEGURANÇA & PROCEDIMENTOS';

      page.drawText(tituloCardTecnico, {
        x: MARGIN_X + 10,
        y: qualTopY - 11,
        size: 6.8,
        font: fontBold,
        color: DARK
      });

      const colW = (CONTENT_W - 24) / 2;
      const col1X = MARGIN_X + 10;
      const col2X = MARGIN_X + colW + 18;
      let textLineY = qualTopY - qualHeaderH - 13;

      if (empInfo.ehMoveis) {
        // Coluna 1: Materiais & Acabamento SD Móveis
        page.drawText('• MDF Naval e Madeiras Certificadas:', { x: col1X, y: textLineY, size: 6.8, font: fontBold, color: DARK });
        page.drawText('Chapas de alta densidade 100% MDF com tratamento antimofo, resistentes à umidade e ao empenamento.', { x: col1X + 8, y: textLineY - 10, size: 6.3, font: fontRegular, color: GRAY });

        page.drawText('• Ferragens & Amortecedores Soft-Close:', { x: col1X, y: textLineY - 23, size: 6.8, font: fontBold, color: DARK });
        page.drawText('Dobradiças com amortecimento suave e corrediças telescópicas reforçadas para deslizamento silencioso.', { x: col1X + 8, y: textLineY - 33, size: 6.3, font: fontRegular, color: GRAY });

        page.drawText('• Bordas Seladas & Acabamento Impecável:', { x: col1X, y: textLineY - 46, size: 6.8, font: fontBold, color: DARK });
        page.drawText('Fita de borda aplicada com polímero termoplástico impermeabilizante, garantindo total vedação.', { x: col1X + 8, y: textLineY - 56, size: 6.3, font: fontRegular, color: GRAY });

        // Coluna 2: Instalação & Atendimento SD Móveis
        page.drawText('• Projeto 3D e Medição Milimétrica a Laser:', { x: col2X, y: textLineY, size: 6.8, font: fontBold, color: DARK });
        page.drawText('Conferência precisa de prumos, desníveis e esquadros antes da fabricação sob medida para encaixe exato.', { x: col2X + 8, y: textLineY - 10, size: 6.3, font: fontRegular, color: GRAY });

        page.drawText('• Puxadores Nobres & Perfis de Alumínio:', { x: col2X, y: textLineY - 23, size: 6.8, font: fontBold, color: DARK });
        page.drawText('Componentes de alta durabilidade, design moderno e ergonomia planejada para cada ambiente.', { x: col2X + 8, y: textLineY - 33, size: 6.3, font: fontRegular, color: GRAY });

        page.drawText('• Montagem Especializada & Limpeza Pós-Obra:', { x: col2X, y: textLineY - 46, size: 6.8, font: fontBold, color: DARK });
        page.drawText('Marceneiros próprios capacitados com entrega dos ambientes higienizados, nivelados e alinhados.', { x: col2X + 8, y: textLineY - 56, size: 6.3, font: fontRegular, color: GRAY });
      } else {
        // Coluna 1: Materiais & Segurança SD Vidros
        page.drawText('• Vidros Temperados Certificados:', { x: col1X, y: textLineY, size: 6.8, font: fontBold, color: DARK });
        page.drawText('Conforme normas ABNT NBR 14698/14697, resistência térmica e a impacto até 5x maior que o vidro comum.', { x: col1X + 8, y: textLineY - 10, size: 6.3, font: fontRegular, color: GRAY });

        page.drawText('• Perfis Estruturais em Alumínio Nobre:', { x: col1X, y: textLineY - 23, size: 6.8, font: fontBold, color: DARK });
        page.drawText('Tratamento anticorrosivo especial (anodização ou pintura eletrostática), imunes a oxidação e ferrugem.', { x: col1X + 8, y: textLineY - 33, size: 6.3, font: fontRegular, color: GRAY });

        page.drawText('• Vedação Acústica e Hidráulica:', { x: col1X, y: textLineY - 46, size: 6.8, font: fontBold, color: DARK });
        page.drawText('Aplicação com silicone neutro fungicida de alta vedação, evitando vazamentos, infiltrações e mofo.', { x: col1X + 8, y: textLineY - 56, size: 6.3, font: fontRegular, color: GRAY });

        // Coluna 2: Instalação & Atendimento SD Vidros
        page.drawText('• Medição Técnica e Precisão a Laser:', { x: col2X, y: textLineY, size: 6.8, font: fontBold, color: DARK });
        page.drawText('Conferência de vãos, prumos e esquadros antes da fabricação sob medida para encaixe milimétrico.', { x: col2X + 8, y: textLineY - 10, size: 6.3, font: fontRegular, color: GRAY });

        page.drawText('• Ferragens e Roldanas de Alta Performance:', { x: col2X, y: textLineY - 23, size: 6.8, font: fontBold, color: DARK });
        page.drawText('Roldanas blindadas de rolamento suave com regulagem, e componentes em aço inox e latão cromado.', { x: col2X + 8, y: textLineY - 33, size: 6.3, font: fontRegular, color: GRAY });

        page.drawText('• Equipe Especializada e Garantia de 1 Ano:', { x: col2X, y: textLineY - 46, size: 6.8, font: fontBold, color: DARK });
        page.drawText('Montadores próprios capacitados com EPIs, limpeza pós-obra e cobertura total de fabricação.', { x: col2X + 8, y: textLineY - 56, size: 6.3, font: fontRegular, color: GRAY });
      }
    }
  } else if (spaceBelowCards >= 50) {
    // Versão compacta da barra de selos se houver mais itens
    const badgesY = cardBottomY - 10;
    const badgesH = 24;
    const badgeColW = (CONTENT_W - 18) / 4;

    const selos = empInfo.ehMoveis ? [
      { t1: '100% MDF', t2: 'NAVAL PREMIUM' },
      { t1: 'PADRÃO LUXO', t2: 'SOB MEDIDA' },
      { t1: 'PONTUALIDADE', t2: 'NA ENTREGA' },
      { t1: '1 ANO DE', t2: 'GARANTIA REAL' }
    ] : [
      { t1: '100% VIDRO', t2: 'TEMPERADO' },
      { t1: 'PADRÃO NORMAS', t2: 'ABNT NBR' },
      { t1: 'PONTUALIDADE', t2: 'NA ENTREGA' },
      { t1: '1 ANO DE', t2: 'GARANTIA' }
    ];

    selos.forEach((s, sIdx) => {
      const bX = MARGIN_X + (sIdx * (badgeColW + 6));
      page.drawRectangle({
        x: bX,
        y: badgesY - badgesH,
        width: badgeColW,
        height: badgesH,
        color: BOX_BG,
        borderColor: BORDER,
        borderWidth: 0.6
      });
      page.drawRectangle({
        x: bX,
        y: badgesY - 2.5,
        width: badgeColW,
        height: 2.5,
        color: GOLD
      });
      const txtFull = `${s.t1} ${s.t2}`;
      const txtW = fontBold.widthOfTextAtSize(txtFull, 6.2);
      page.drawText(txtFull, {
        x: bX + Math.max(4, (badgeColW - txtW) / 2),
        y: badgesY - 15,
        size: 6.2,
        font: fontBold,
        color: DARK
      });
    });
  }

  // ---------------- 7. RODAPÉ DE APROVAÇÃO & ASSINATURA ----------------
  page.drawRectangle({
    x: MARGIN_X,
    y: rodapeCardY,
    width: CONTENT_W,
    height: rodapeCardH,
    color: WHITE,
    borderColor: BORDER,
    borderWidth: 0.8
  });

  // Linha 1: Autorização e Opções de Aprovação
  page.drawText('Autorizo a execução dos serviços conforme as especificações e valores discriminados nesta proposta comercial.', {
    x: MARGIN_X + 10,
    y: rodapeCardY + rodapeCardH - 14,
    size: 6.8,
    font: fontRegular,
    color: DARK
  });

  page.drawText('[  ] APROVADO     [  ] AJUSTAR DETALHES', {
    x: MARGIN_X + CONTENT_W - 200,
    y: rodapeCardY + rodapeCardH - 14,
    size: 7.5,
    font: fontBold,
    color: DARK
  });

  // Linha 2: Campo de Assinatura
  page.drawText('Assinatura do Cliente: __________________________________________________', {
    x: MARGIN_X + 10,
    y: rodapeCardY + 30,
    size: 7.5,
    font: fontBold,
    color: DARK
  });
  page.drawText('Data: _____ / _____ / ________', {
    x: MARGIN_X + CONTENT_W - 145,
    y: rodapeCardY + 30,
    size: 7.5,
    font: fontBold,
    color: DARK
  });

  // Linha 3: Responsável técnico e Confirmação via WhatsApp
  const respNome = String(resp || 'SAMUEL DAVID').toUpperCase();
  page.drawText(`Responsável Técnico: ${respNome} • Situação: Proposta Comercial Aguardando Aprovação`, {
    x: MARGIN_X + 10,
    y: rodapeCardY + 12,
    size: 6.8,
    font: fontRegular,
    color: GRAY
  });

  const telRodapeZap = empInfo.telefone || '(85) 99611-9824';
  page.drawText(`Confirmação rápida WhatsApp: ${telRodapeZap}`, {
    x: MARGIN_X + CONTENT_W - 205,
    y: rodapeCardY + 12,
    size: 6.8,
    font: fontBold,
    color: GOLD
  });

  return pdfDoc.save();
}

module.exports = async (req, res) => {
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ error: 'Método não permitido' });
  }
  try {
    let dados = req.body || {};
    let queryEmpresa = '';
    let queryEmpNome = '';
    let queryEmpTipo = '';
    let queryEmpSeg = '';
    let queryEmpTel = '';
    let queryEmpPix = '';
    let queryEmpCnpj = '';

    if (req.query) {
      queryEmpresa = req.query.empresa || req.query.lic || req.query.emp || '';
      queryEmpNome = req.query.empNome || req.query.nomeEmpresa || '';
      queryEmpTipo = req.query.empTipo || req.query.tipoContrato || '';
      queryEmpSeg = req.query.empSeg || req.query.segmento || '';
      queryEmpTel = req.query.empTel || req.query.telEmpresa || '';
      queryEmpPix = req.query.empPix || req.query.pix || '';
      queryEmpCnpj = req.query.empCnpj || req.query.cnpjEmpresa || '';
    }

    if (req.method === 'GET') {
      if (req.query && req.query.d) {
        try {
          let s = String(req.query.d).trim();
          while (s.includes('%')) {
            try { s = decodeURIComponent(s); } catch(_) { break; }
          }
          s = s.replace(/ /g, '+').replace(/-/g, '+').replace(/_/g, '/');
          while (s.length % 4 !== 0) s += '=';
          const p = JSON.parse(Buffer.from(s, 'base64').toString('utf-8'));

          if (p.emp && !queryEmpresa) queryEmpresa = p.emp;
          if (p.empresa && !queryEmpresa) queryEmpresa = p.empresa;
          if (p.empNome && !queryEmpNome) queryEmpNome = p.empNome;
          if (p.empTipo && !queryEmpTipo) queryEmpTipo = p.empTipo;
          if (p.empSeg && !queryEmpSeg) queryEmpSeg = p.empSeg;
          if (p.empTel && !queryEmpTel) queryEmpTel = p.empTel;
          if (p.empPix && !queryEmpPix) queryEmpPix = p.empPix;
          if (p.empCnpj && !queryEmpCnpj) queryEmpCnpj = p.empCnpj;

          let bNome = (p.b || p.bairro || '').trim();
          let cNome = (p.cidade || '').trim();
          if (bNome.includes(',')) {
            const parts = bNome.split(',').map(s => s.trim());
            bNome = parts[0] || '';
            cNome = parts[1] || '';
          } else if (bNome.includes('-')) {
            const parts = bNome.split('-').map(s => s.trim());
            bNome = parts[0] || '';
            cNome = parts[1] || '';
          }

          let endCompleto = (p.e || p.endereco || '').trim();
          if (p.num && !endCompleto.includes(p.num)) {
            endCompleto = endCompleto ? `${endCompleto}, Nº ${p.num}` : `Nº ${p.num}`;
          }

          let listaItens = [];
          if (Array.isArray(p.itens) && p.itens.length) {
            listaItens = p.itens;
          } else if (Array.isArray(p.i) && p.i.length) {
            listaItens = p.i.map(it => {
              if (Array.isArray(it)) {
                return {
                  desc: it[0] || '',
                  qtd: it[1] || 1,
                  larg: it[2] || '',
                  alt: it[3] || '',
                  m2: it[4] || '',
                  v_unit: it[5] || '',
                  total: it[6] || '',
                  cor: it[7] || '',
                  bizt: it[8] || ''
                };
              } else if (it && typeof it === 'object') {
                return {
                  desc: it.d || it.desc || '',
                  qtd: it.q || it.qtd || 1,
                  larg: it.l || it.larg || '',
                  alt: it.a || it.alt || '',
                  m2: it.m || it.m2 || '',
                  v_unit: it.u || it.v_unit || '',
                  total: it.t || it.total || '',
                  cor: it.c || it.cor || '',
                  bizt: it.z || it.bizt || ''
                };
              }
              return { desc: String(it || '') };
            });
          }

          dados = {
            numero: p.n || p.numero || '0001',
            dataStr: p.d || p.data || new Date().toLocaleDateString('pt-BR'),
            nome: p.c || p.nome || '',
            cnpj: p.cnpj || '',
            tel: p.t || p.tel || '',
            endereco: endCompleto,
            bairro: bNome,
            cidade: cNome,
            apto: p.apto || '',
            resp: p.resp || '',
            itens: listaItens,
            total: p.v || p.total || '',
            forma: p.f || p.forma || '',
            obs: p.obs || '',
            prazo: p.p || p.prazo || '',
            garantia: p.g || p.garantia || ''
          };
        } catch (e) {
          return res.status(400).json({ error: 'Parâmetro de orçamento inválido' });
        }
      } else if (req.query && req.query.id) {
        try {
          const { getClient } = require('./_supabase');
          const supabase = getClient();
          if (supabase) {
            const { data, error } = await supabase.from('contratos').select('*').eq('id', req.query.id).single();
            if (!error && data) {
              if (data.empresa && !queryEmpresa) queryEmpresa = data.empresa;
              if (data.texto && (data.texto.includes('Móveis') || data.texto.includes('marcenaria') || data.texto.includes('moveis'))) {
                queryEmpTipo = 'moveis';
              }
              if (data.dados) {
                dados = data.dados;
              } else {
                dados = {
                  numero: data.numero_os || '0001',
                  nome: data.cliente_nome || '',
                  tel: data.cliente_tel || '',
                  total: data.valor_total || '',
                  obs: data.texto || ''
                };
              }
            }
          }
        } catch (e) {}
      }
    }

    // Identificação precisa da empresa ativa (SD Vidros vs SD Móveis vs Custom)
    const empParamLower = String(queryEmpresa || (dados && (dados.empresa || dados.emp)) || '').toLowerCase().trim();
    const empNomeLower = String(queryEmpNome || (dados && (dados.empNome || dados.nomeEmpresa)) || '').toLowerCase().trim();
    const empTipoLower = String(queryEmpTipo || (dados && (dados.empTipo || dados.tipoContrato)) || '').toLowerCase().trim();

    // emp_1789700331599 é a chave criada para SD Móveis
    const ehMoveis = (
      empParamLower === 'emp_1789700331599' ||
      empParamLower === 'sdmoveis' ||
      empParamLower === 'sd-moveis' ||
      empParamLower.includes('moveis') ||
      empParamLower.includes('móveis') ||
      empTipoLower === 'moveis' ||
      empNomeLower.includes('móveis') ||
      empNomeLower.includes('moveis') ||
      empNomeLower.includes('planejados') ||
      empNomeLower.includes('marcenaria')
    );

    let empInfo = {};
    if (ehMoveis) {
      empInfo = {
        id: queryEmpresa || 'sdmoveis',
        nome: queryEmpNome || 'SD Móveis Projetados',
        segmento: queryEmpSeg || 'Móveis Planejados & Marcenaria de Luxo',
        slogan: 'Cozinhas Planejadas, Closets & Ambientes Sob Medida',
        endereco: 'Itaitinga - CE',
        contatos: `WhatsApp: ${queryEmpTel || '(85) 99611-9824'} | Atendimento & Projetos Sob Medida`,
        telefone: queryEmpTel || '(85) 99611-9824',
        pixChave: queryEmpPix || '85996119824',
        pixTitular: 'SD Móveis Projetados',
        logoFile: 'logo_moveis.jpg',
        ehMoveis: true
      };
    } else {
      empInfo = {
        id: queryEmpresa || 'sdvidros',
        nome: queryEmpNome || 'SD Vidros',
        segmento: queryEmpSeg || 'Soluções em Vidros Temperados e Esquadrias de Alumínio',
        slogan: 'Box, Espelhos, Portas, Janelas & Guarda-Corpo',
        endereco: 'Rua Jorge Figueiredo 740, Barrocão - Itaitinga-CE • CNPJ: 49.226.611/0001-33',
        contatos: `WhatsApp: ${queryEmpTel || '(85) 99611-9824'} • 99760-2237 • 98574-9606 | sdvidros2025@gmail.com`,
        telefone: queryEmpTel || '(85) 99611-9824',
        pixChave: queryEmpPix || '49.226.611/0001-33',
        pixTitular: 'InfinityPay - SD Vidros',
        logoFile: 'logo.jpg',
        ehMoveis: false
      };
    }

    const fetchLogo = async (logoFileName = 'logo.jpg') => {
      try {
        const fs = require('fs');
        const path = require('path');
        const localPath = path.join(process.cwd(), logoFileName);
        if (fs.existsSync(localPath)) {
          return fs.readFileSync(localPath);
        }
        // Fallback para logo padrão caso arquivo específico não exista
        const fallbackPath = path.join(process.cwd(), 'logo.jpg');
        if (fs.existsSync(fallbackPath)) {
          return fs.readFileSync(fallbackPath);
        }
      } catch (_) {}
      try {
        const host = req.headers.host;
        if (!host) return null;
        const proto = host.includes('localhost') ? 'http' : 'https';
        let resp = await fetch(`${proto}://${host}/${logoFileName}`);
        if (!resp.ok) {
          resp = await fetch(`${proto}://${host}/logo.jpg`);
        }
        if (!resp.ok) return null;
        return Buffer.from(await resp.arrayBuffer());
      } catch (_) {
        return null;
      }
    };

    const pdfBytes = await gerarPdfOrcamento(dados, fetchLogo, empInfo);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="orcamento-${(dados.numero || '0001').replace('#', '')}.pdf"`);
    res.status(200).send(Buffer.from(pdfBytes));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message || 'Erro ao gerar PDF do orçamento.' });
  }
};
