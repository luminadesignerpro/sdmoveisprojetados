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


function parseNumSafe(val) {
  if (val == null) return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  // Remove prefixos de moeda e espaços unicode (incluindo narrow no-break space \u202f e \u00a0)
  let str = String(val)
    .replace(/R\s*\$\s*/g, '')   // remove R$ e variações
    .replace(/[\u00a0\u202f\u2009\u200b]/g, '') // remove espaços especiais unicode
    .trim();
  if (!str) return 0;
  // Formato BRL: 1.059,00 (ponto=milhar, vírgula=decimal)
  if (str.includes(',') && str.includes('.')) {
    if (str.indexOf('.') < str.indexOf(',')) {
      // BRL: 1.059,00 → 1059.00
      str = str.replace(/\./g, '').replace(',', '.');
    } else {
      // US: 1,059.00 → remove vírgulas
      str = str.replace(/,/g, '');
    }
  } else if (str.includes(',')) {
    // Só vírgula: 1059,00 → 1059.00
    str = str.replace(',', '.');
  }
  const n = parseFloat(str);
  return isNaN(n) ? 0 : n;
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
  page.drawText(nomeEmpresaUpper, { x: textX, y: headerY - 14, size: 16, font: fontBold, color: DARK });

  let sloganTxt = (empInfo.segmento || empInfo.slogan || '').trim();
  // Exclui 'Móveis Planejados', 'Marcenaria de Luxo', 'Cozinhas Planejadas, Closets & Ambientes Sob Medida' conforme solicitação do usuário
  if (!sloganTxt || /m[oó]veis\s+planejados|marcenaria\s+de\s+luxo|vidra|vidro|esquadria|cozinha|closet|sob\s*medida/i.test(sloganTxt)) {
    sloganTxt = "";
  }

  let yCursorEmpresa = headerY - 27;
  if (sloganTxt) {
    const segmentoEmpresa = sanitizePdf(sloganTxt.toUpperCase());
    page.drawText(segmentoEmpresa, { x: textX, y: headerY - 26, size: 7.2, font: fontBold, color: GOLD });
    yCursorEmpresa = headerY - 37;
  }

  let endEmpresa = "";
  if (!empInfo.ehMoveis) {
    endEmpresa = empInfo.endereco || "Rua Jorge Figueiredo 740, Barrocão - Itaitinga-CE • CNPJ: 49.226.611/0001-33";
  } else {
    const cid = empInfo.cidade || "Itaitinga - CE";
    const cnp = empInfo.cnpj ? (" • CNPJ: " + empInfo.cnpj) : " • CNPJ: 85997602237";
    endEmpresa = cid + cnp;
  }
  page.drawText(sanitizePdf(endEmpresa), { x: textX, y: yCursorEmpresa, size: 7.2, font: fontRegular, color: GRAY });
  yCursorEmpresa -= 11;

  let contatosEmpresa = "";
  const zapEmpresa = empInfo.telefone || "85985749686";
  if (!empInfo.ehMoveis) {
    contatosEmpresa = `WhatsApp: ${zapEmpresa} • 99760-2237 • 98574-9606 | sdvidros2025@gmail.com`;
  } else {
    contatosEmpresa = `WhatsApp: ${zapEmpresa} | ${empInfo.email || "contato@sdmoveisprojetados.com.br"}`;
  }
  page.drawText(sanitizePdf(contatosEmpresa), { x: textX, y: yCursorEmpresa, size: 7.2, font: fontRegular, color: GRAY });

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

  page.drawText('DESCRIÇÃO DO PRODUTO / SERVIÇO', { x: MARGIN_X + 8, y: tableHeaderY - 13, size: 7, font: fontBold, color: WHITE });
  page.drawText('MEDIDAS (L x A)', { x: MARGIN_X + 250, y: tableHeaderY - 13, size: 7, font: fontBold, color: WHITE });
  page.drawText('ÁREA (M²)', { x: MARGIN_X + 338, y: tableHeaderY - 13, size: 7, font: fontBold, color: WHITE });
  page.drawText('QTD', { x: MARGIN_X + 395, y: tableHeaderY - 13, size: 7, font: fontBold, color: WHITE });
  page.drawText('VL. UNIT (R$)', { x: MARGIN_X + 434, y: tableHeaderY - 13, size: 7, font: fontBold, color: WHITE });
  page.drawText('TOTAL (R$)', { x: MARGIN_X + 486, y: tableHeaderY - 13, size: 7, font: fontBold, color: WHITE });

  let curY = tableHeaderY - tableHeaderH;
  const itensList = Array.isArray(itens) && itens.length ? itens : [];
  const formatoAmbiente = (dados.formatoPdf === 'ambiente' || dados.formato === 'ambiente' || dados.fpdf === 'ambiente' || (empInfo.ehMoveis && dados.formatoPdf !== 'detalhado'));

  let ambientesParaPdf = (Array.isArray(dados.ambientes) && dados.ambientes.length) ? dados.ambientes : [];
  if (formatoAmbiente && (!ambientesParaPdf || !ambientesParaPdf.length) && itensList.length) {
    const mapAmb = {};
    itensList.forEach(it => {
      const aNome = (it.ambiente || dados.ambNome || 'Sala').trim();
      if (!mapAmb[aNome]) mapAmb[aNome] = { nome: aNome, obs: (dados.obs || ''), produtosVal: 0, servicosVal: 0, totalVal: 0, qtdItens: 0 };
      const val = parseNumSafe(it.total);
      mapAmb[aNome].produtosVal += val;
      mapAmb[aNome].totalVal += val;
      mapAmb[aNome].qtdItens++;
    });
    ambientesParaPdf = Object.values(mapAmb);
  }
  if (formatoAmbiente && (!ambientesParaPdf || !ambientesParaPdf.length)) {
    const totNum = parseNumSafe(total);
    ambientesParaPdf = [{
      nome: dados.ambNome || 'Sala',
      obs: dados.obs || '',
      produtosVal: totNum,
      servicosVal: 0,
      totalVal: totNum,
      qtdItens: 1
    }];
  }

  if (formatoAmbiente && ambientesParaPdf.length) {
    ambientesParaPdf.forEach((amb, idx) => {
      const rowH = 26;
      curY -= rowH;

      page.drawRectangle({
        x: MARGIN_X,
        y: curY,
        width: CONTENT_W,
        height: rowH,
        color: idx % 2 === 0 ? WHITE : ROW_ALT,
        borderColor: BORDER,
        borderWidth: 0.6
      });

      const obsTexto = (amb.obs && String(amb.obs).trim()) || (dados.obs ? String(dados.obs).trim() : '');
      const temObs = !!obsTexto;
      const altLinha = temObs ? 26 : 22;
      curY = curY + rowH - altLinha;

      // Nome do Ambiente em destaque (só o valor total do ambiente, sem subtítulo de produtos/serviço)
      const titAmb = `AMBIENTE: ${String(amb.nome || '').toUpperCase()}`;
      const posYTit = temObs ? (curY + altLinha - 12) : (curY + (altLinha / 2) - 3.5);
      page.drawText(sanitizePdf(titAmb), {
        x: MARGIN_X + 10,
        y: posYTit,
        size: 8.5,
        font: fontBold,
        color: DARK
      });

      // Se houver observações deste ambiente ou do orçamento, exibe abaixo do nome
      if (temObs) {
        page.drawText(sanitizePdf(`Obs: ${obsTexto}`), {
          x: MARGIN_X + 10,
          y: curY + 5,
          size: 6.8,
          font: fontRegular,
          color: GRAY
        });
      }

      const posYValores = temObs ? (curY + altLinha - 14) : (curY + (altLinha / 2) - 3.5);

      // Medidas
      page.drawText('Sob Medida', {
        x: MARGIN_X + 250,
        y: posYValores,
        size: 7.5,
        font: fontRegular,
        color: GRAY
      });

      // Área
      page.drawText('-', {
        x: MARGIN_X + 345,
        y: posYValores,
        size: 7.5,
        font: fontRegular,
        color: GRAY
      });

      // QTD: 1 AMB
      page.drawText('1 AMB', {
        x: MARGIN_X + 395,
        y: posYValores,
        size: 7.5,
        font: fontRegular,
        color: DARK
      });

      const totAmbNum = amb.totalVal || (amb.produtosVal + (amb.servicosVal || 0));
      const vTotTxt = Number(totAmbNum || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

      // VL. UNIT: R$ Total do Ambiente
      page.drawText(vTotTxt, {
        x: MARGIN_X + 438,
        y: posYValores,
        size: 7.5,
        font: fontRegular,
        color: DARK
      });

      // TOTAL: R$ Total do Ambiente em negrito
      page.drawText(vTotTxt, {
        x: MARGIN_X + 488,
        y: posYValores,
        size: 8,
        font: fontBold,
        color: DARK
      });
    });
  } else if (!itensList.length) {
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
    const itemPadrao = empInfo.ehMoveis ? 'MÓVEIS PLANEJADOS & MARCENARIA SOB MEDIDA' : 'SERVIÇOS DE VIDRAÇARIA E ESQUADRIAS DE ALUMÍNIO';
    page.drawText(itemPadrao, { x: MARGIN_X + 8, y: curY + 9, size: 7.5, font: fontBold, color: DARK });
    page.drawText('Sob Medida', { x: MARGIN_X + 250, y: curY + 9, size: 7.5, font: fontRegular, color: GRAY });
    page.drawText('-', { x: MARGIN_X + 345, y: curY + 9, size: 7.5, font: fontRegular, color: GRAY });
    page.drawText('1 UND', { x: MARGIN_X + 395, y: curY + 9, size: 7.5, font: fontRegular, color: DARK });

    const valTot = formatMoney(total);
    page.drawText(valTot, { x: MARGIN_X + 438, y: curY + 9, size: 7.5, font: fontRegular, color: DARK });
    page.drawText(valTot, { x: MARGIN_X + 488, y: curY + 8, size: 8, font: fontBold, color: DARK });
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
  if (garantia && String(garantia).trim()) {
    page.drawText(`• Garantia: ${String(garantia).trim()}`, { x: MARGIN_X + 8, y: condY, size: 6.8, font: fontRegular, color: DARK });
    condY -= 11;
  }

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

  const valProdNum = parseNumSafe(dados.valProdutos);
  const valServNum = parseNumSafe(dados.valServico);
  const valFreteNum = parseNumSafe(dados.valFrete);
  const valDescNum = parseNumSafe(dados.valDesconto);
  const totalGeralNum = parseNumSafe(total);

  if (formatoAmbiente) {
    page.drawText('Valor Total dos Ambientes:', { x: rightCardX + 10, y: totY, size: 6.8, font: fontRegular, color: GRAY });
    // Somar os totais de cada ambiente (mais preciso que totalGeralNum - frete + desconto)
    const totAmbientesNum = ambientesParaPdf && ambientesParaPdf.length
      ? ambientesParaPdf.reduce((acc, a) => acc + (parseNumSafe(a.totalVal) || 0), 0)
      : Math.max(0, totalGeralNum - valFreteNum + valDescNum);
    const txtTotAmbResumo = 'R$ ' + (totAmbientesNum > 0 ? totAmbientesNum.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : valorTotalFormatado);
    page.drawText(txtTotAmbResumo, { x: rightCardX + rightCardW - 10 - fontBold.widthOfTextAtSize(txtTotAmbResumo, 7.2), y: totY, size: 7.2, font: fontBold, color: DARK });

    if (valFreteNum > 0) {
      totY -= 13;
      const txtValFrete = 'R$ ' + valFreteNum.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      page.drawText('Frete:', { x: rightCardX + 10, y: totY, size: 6.8, font: fontRegular, color: GRAY });
      page.drawText(txtValFrete, { x: rightCardX + rightCardW - 10 - fontBold.widthOfTextAtSize(txtValFrete, 7.2), y: totY, size: 7.2, font: fontBold, color: DARK });
    }
  } else {
    page.drawText('Valor dos Produtos / Materiais:', { x: rightCardX + 10, y: totY, size: 6.8, font: fontRegular, color: GRAY });
    page.drawText(`R$ ${formatMoney(dados.valProdutos || total)}`, { x: rightCardX + rightCardW - 10 - fontBold.widthOfTextAtSize(`R$ ${formatMoney(dados.valProdutos || total)}`, 7.2), y: totY, size: 7.2, font: fontBold, color: DARK });

    totY -= 13;
    const valServicoNum = parseNumSafe(dados.valServico);
    const vServApi = valServicoNum > 0 ? ('R$ ' + formatMoney(valServicoNum)) : '';
    page.drawText('Mão de Obra e Instalação:', { x: rightCardX + 10, y: totY, size: 6.8, font: fontRegular, color: GRAY });
    if (vServApi) {
      page.drawText(vServApi, { x: rightCardX + rightCardW - 10 - fontRegular.widthOfTextAtSize(vServApi, 7.2), y: totY, size: 7.2, font: fontRegular, color: DARK });
    }

    totY -= 13;
    const txtValFrete = valFreteNum > 0 ? ('R$ ' + valFreteNum.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })) : '';
    page.drawText('Frete:', { x: rightCardX + 10, y: totY, size: 6.8, font: fontRegular, color: GRAY });
    if (txtValFrete) {
      page.drawText(txtValFrete, { x: rightCardX + rightCardW - 10 - fontBold.widthOfTextAtSize(txtValFrete, 7.2), y: totY, size: 7.2, font: fontBold, color: DARK });
    }
  }

  if (valDescNum > 0) {
    totY -= 13;
    const txtDesc = '- R$ ' + valDescNum.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    page.drawText('Desconto Especial:', { x: rightCardX + 10, y: totY, size: 6.8, font: fontRegular, color: rgb(0.8, 0.2, 0.2) });
    page.drawText(txtDesc, { x: rightCardX + rightCardW - 10 - fontBold.widthOfTextAtSize(txtDesc, 7.2), y: totY, size: 7.2, font: fontBold, color: rgb(0.8, 0.2, 0.2) });
  }

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

  // ── INCLUSÃO DAS FOTOS ANEXADAS NA GALERIA NO PDF ──
  const fotosParaEmbed = Array.isArray(dados.fotos) ? dados.fotos : [];
  if (fotosParaEmbed && fotosParaEmbed.length > 0) {
    const fotosPorPagina = 4;
    const totalPagsFotos = Math.ceil(fotosParaEmbed.length / fotosPorPagina);

    for (let pIdx = 0; pIdx < totalPagsFotos; pIdx++) {
      const fotoPage = pdfDoc.addPage([PAGE_W, PAGE_H]);
      const fotosDoLote = fotosParaEmbed.slice(pIdx * fotosPorPagina, (pIdx + 1) * fotosPorPagina);

      fotoPage.drawRectangle({
        x: MARGIN_X,
        y: PAGE_H - 72,
        width: CONTENT_W,
        height: 48,
        color: BOX_BG,
        borderColor: BORDER,
        borderWidth: 1
      });

      fotoPage.drawText('SD MÓVEIS PROJETADOS • REGISTRO FOTOGRÁFICO DO PROJETO', {
        x: MARGIN_X + 14,
        y: PAGE_H - 44,
        size: 11,
        font: fontBold,
        color: DARK
      });

      const numOsSan = sanitizePdf(dados.numero || '');
      const cliSan = sanitizePdf(dados.nome || '');
      const dtSan = sanitizePdf(dados.data || new Date().toLocaleDateString('pt-BR'));
      fotoPage.drawText(`O.S. ${numOsSan} • Cliente: ${cliSan} • Emissão: ${dtSan} • (Anexos Fotográficos - Pág. ${pIdx + 2} de ${totalPagsFotos + 1})`, {
        x: MARGIN_X + 14,
        y: PAGE_H - 60,
        size: 7.5,
        font: fontRegular,
        color: GRAY
      });

      const gridStartX = MARGIN_X;
      const gridStartY = PAGE_H - 86;
      const boxW = (CONTENT_W - 14) / 2;
      const boxH = 340;

      for (let i = 0; i < fotosDoLote.length; i++) {
        const itemFoto = fotosDoLote[i];
        if (!itemFoto) continue;

        const col = i % 2;
        const row = Math.floor(i / 2);
        const cardX = gridStartX + (col * (boxW + 14));
        const cardY = gridStartY - ((row + 1) * (boxH + 12));

        fotoPage.drawRectangle({
          x: cardX,
          y: cardY,
          width: boxW,
          height: boxH,
          color: WHITE,
          borderColor: BORDER,
          borderWidth: 1
        });

        fotoPage.drawRectangle({
          x: cardX,
          y: cardY + boxH - 24,
          width: boxW,
          height: 24,
          color: HEADER_BG
        });

        const numFotoGlobal = pIdx * fotosPorPagina + i + 1;
        const ambNome = sanitizePdf(itemFoto.ambiente || '');
        const origemFoto = sanitizePdf(itemFoto.origem || 'Câmera');
        const titCard = ambNome ? `Foto ${numFotoGlobal} • ${origemFoto} (${ambNome})` : `Foto ${numFotoGlobal} • ${origemFoto}`;

        fotoPage.drawText(titCard, {
          x: cardX + 10,
          y: cardY + boxH - 17,
          size: 8.5,
          font: fontBold,
          color: DARK
        });

        try {
          const rawUrl = itemFoto.dataUrl || itemFoto.url || (typeof itemFoto === 'string' ? itemFoto : '');
          if (rawUrl && rawUrl.includes(',')) {
            const isPng = rawUrl.startsWith('data:image/png');
            const b64 = rawUrl.split(',')[1];
            const binBuffer = Buffer.from(b64, 'base64');

            let embedded = null;
            if (isPng) {
              try { embedded = await pdfDoc.embedPng(binBuffer); } catch(_) {
                try { embedded = await pdfDoc.embedJpg(binBuffer); } catch(_) {}
              }
            } else {
              try { embedded = await pdfDoc.embedJpg(binBuffer); } catch(_) {
                try { embedded = await pdfDoc.embedPng(binBuffer); } catch(_) {}
              }
            }

            if (embedded) {
              const maxImgW = boxW - 16;
              const maxImgH = boxH - 36;
              const scale = Math.min(maxImgW / embedded.width, maxImgH / embedded.height);
              const wFinal = embedded.width * scale;
              const hFinal = embedded.height * scale;
              const xFinal = cardX + (boxW - wFinal) / 2;
              const yFinal = cardY + 6 + (maxImgH - hFinal) / 2;

              fotoPage.drawImage(embedded, {
                x: xFinal,
                y: yFinal,
                width: wFinal,
                height: hFinal
              });
            }
          }
        } catch(errEmbed) {
          console.warn('Erro ao embutir foto ' + numFotoGlobal + ' no PDF:', errEmbed);
        }
      }

      fotoPage.drawText(sanitizePdf(`SD Móveis Projetados • (85) 99611-9824`), {
        x: MARGIN_X + 10,
        y: 18,
        size: 7,
        font: fontRegular,
        color: GRAY
      });
      fotoPage.drawText(sanitizePdf(`Documento gerado eletronicamente em ${new Date().toLocaleDateString('pt-BR')}`), {
        x: MARGIN_X + CONTENT_W - 190,
        y: 18,
        size: 7,
        font: fontRegular,
        color: GRAY
      });
    }
  }

  return pdfDoc.save();
}

module.exports = async (req, res) => {
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ error: 'Método não permitido' });
  }
  try {
    // ── SUPORTE A PDF COMPLETO COM REGISTRO FOTOGRÁFICO DO PROJETO ──
    if (req.query && req.query.p) {
      const fileId = String(req.query.p).trim().replace(/[^a-zA-Z0-9_-]/g, '');
      const numOs = String(req.query.num || '0001').replace('#', '');
      if (fileId) {
        try {
          const respNtfy = await fetch(`https://ntfy.sh/file/${fileId}.pdf`);
          if (respNtfy.ok) {
            const pdfBytes = Buffer.from(await respNtfy.arrayBuffer());
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `inline; filename="Orcamento-${numOs}.pdf"`);
            return res.status(200).send(pdfBytes);
          }
        } catch (errP) {
          console.warn('Erro ao carregar PDF pré-renderizado do ntfy:', errP);
        }
      }
    }
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
          // Remove possíveis aspas ou pontuações ao redor da URL que o WhatsApp ou cliente de email possa ter colado
          s = s.replace(/^[\"\'\<]+/, '').replace(/[\"\'\>\.\,\;]+$/, '');
          while (s.includes('%')) {
            try { s = decodeURIComponent(s); } catch(_) { break; }
          }
          s = s.replace(/\s+/g, '+').replace(/-/g, '+').replace(/_/g, '/');
          while (s.length % 4 !== 0) s += '=';
          let jsonTexto = Buffer.from(s, 'base64').toString('utf-8');
          // Limpa possíveis caracteres invisíveis ou nulos
          jsonTexto = jsonTexto.replace(/^[\uFEFF\0]+/, '').trim();
          const p = JSON.parse(jsonTexto);

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
                  bizt: it[8] || '',
                  ambiente: it[9] || ''
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

          let listaAmbientes = [];
          if (Array.isArray(p.ambientes) && p.ambientes.length) {
            listaAmbientes = p.ambientes;
          } else if (Array.isArray(p.amb) && p.amb.length) {
            listaAmbientes = p.amb.map(a => {
              if (Array.isArray(a)) {
                return {
                  nome: a[0] || '',
                  obs: a[1] || '',
                  produtosVal: Number(a[2]) || 0,
                  servicosVal: Number(a[3]) || 0,
                  totalVal: Number(a[4]) || 0
                };
              }
              return a;
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
            ambientes: listaAmbientes,
            total: p.v || p.total || '',
            valProdutos: p.vp || p.valProdutos,
            valServico: p.vs || p.valServico,
            valFrete: p.vf || p.valFrete,
            valDesconto: p.vd || p.valDesconto,
            forma: p.f || p.forma || '',
            obs: p.obs || '',
            prazo: p.p || p.prazo || '',
            garantia: p.g || p.garantia || '',
            ambNome: p.ambNome || '',
            formatoPdf: p.fpdf || p.formatoPdf || p.formato || 'ambiente'
          };
        } catch (e) {
          console.warn('Erro ao decodificar d na API:', e.message);
          return res.status(400).json({ error: 'Parâmetro de orçamento inválido', detalhe: e.message });
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
    if (!ehMoveis && (empParamLower === 'sdvidros' || empTipoLower === 'vidros')) {
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
    } else {
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
