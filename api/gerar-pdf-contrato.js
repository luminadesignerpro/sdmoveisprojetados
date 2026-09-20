const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');

const GOLD = rgb(201 / 255, 168 / 255, 76 / 255);
const DARK = rgb(0.12, 0.12, 0.12);
const GRAY = rgb(0.45, 0.45, 0.45);
const BORDER = rgb(0.82, 0.82, 0.82);
const BOX_BG = rgb(0.97, 0.97, 0.97);

const PAGE_W = 595.28; // A4 pt
const PAGE_H = 841.89;
const MARGIN = 50;
const CONTENT_W = PAGE_W - MARGIN * 2;

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

async function gerarPdfContrato(dados, fetchLogo, empInfo) {
  const {
    numero, dataStr, nome, cnpj, tel, endereco, resp,
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

  const pages = [];
  let page = pdfDoc.addPage([PAGE_W, PAGE_H]);
  pages.push(page);
  let y = PAGE_H - MARGIN;

  function newPage() {
    page = pdfDoc.addPage([PAGE_W, PAGE_H]);
    pages.push(page);
    y = PAGE_H - MARGIN;
  }

  function ensureSpace(h) {
    if (y - h < MARGIN + 34) newPage();
  }

  function paragraph(text, size, font, color, x, maxWidth, lineHeight) {
    const lines = wrapText(text, font, size, maxWidth);
    for (const line of lines) {
      ensureSpace(lineHeight);
      page.drawText(line, { x, y, size, font, color });
      y -= lineHeight;
    }
  }

  function tituloClausula(texto) {
    ensureSpace(28);
    page.drawText(texto, { x: MARGIN, y, size: 11, font: fontBold, color: DARK });
    y -= 18;
  }

  // ---------------- HEADER ----------------
  const headerTop = y;
  if (logoImage) {
    const logoSize = 54;
    const dims = logoImage.scale(1);
    const ratio = dims.width / dims.height;
    const lw = logoSize * Math.min(ratio, 1);
    const lh = logoSize / Math.max(ratio, 1);
    page.drawImage(logoImage, { x: MARGIN, y: headerTop - logoSize + 6, width: lw || logoSize, height: lh || logoSize });
  }
  const textX = logoImage ? MARGIN + 66 : MARGIN;
  const nomeEmpresaUpper = sanitizePdf((empInfo.nome || (empInfo.ehMoveis ? 'SD MÓVEIS PROJETADOS' : 'SD VIDROS')).toUpperCase());
  page.drawText(nomeEmpresaUpper, { x: textX, y: headerTop - 6, size: 19, font: fontBold, color: DARK });

  const segmentoEmpresa = sanitizePdf(empInfo.segmento || (empInfo.ehMoveis ? 'Móveis Planejados & Marcenaria de Luxo' : 'Vidraçaria, Esquadrias de Alumínio e Soluções em Vidro'));
  page.drawText(segmentoEmpresa, { x: textX, y: headerTop - 23, size: 8.5, font: fontRegular, color: GRAY });

  const contatosEmpresa = sanitizePdf(empInfo.contatos || (empInfo.ehMoveis ? 'WhatsApp: (85) 99611-9824 | Atendimento & Projetos Sob Medida' : 'WhatsApp: (85) 99611-9824 | Instagram: @sdvidros'));
  page.drawText(contatosEmpresa, { x: textX, y: headerTop - 35, size: 8.5, font: fontRegular, color: GRAY });

  const cidadeEmpresa = sanitizePdf(empInfo.endereco || 'Itaitinga - CE');
  page.drawText(cidadeEmpresa, { x: textX, y: headerTop - 47, size: 8.5, font: fontRegular, color: GRAY });

  const numeroStr = `CONTRATO N° ${numero || ''}`;
  const numeroW = fontBold.widthOfTextAtSize(numeroStr, 11);
  page.drawText(numeroStr, { x: PAGE_W - MARGIN - numeroW, y: headerTop - 6, size: 11, font: fontBold, color: GOLD });
  const dataLine = `Itaitinga - CE, ${dataStr || ''}`;
  const dataW = fontRegular.widthOfTextAtSize(dataLine, 9);
  page.drawText(dataLine, { x: PAGE_W - MARGIN - dataW, y: headerTop - 22, size: 9, font: fontRegular, color: GRAY });

  y = headerTop - 64;
  page.drawLine({ start: { x: MARGIN, y }, end: { x: PAGE_W - MARGIN, y }, thickness: 1.2, color: GOLD });
  y -= 24;

  // ---------------- TÍTULO ----------------
  const titulo = 'CONTRATO DE PRESTAÇÃO DE SERVIÇOS';
  const tituloW = fontBold.widthOfTextAtSize(titulo, 14);
  page.drawText(titulo, { x: (PAGE_W - tituloW) / 2, y, size: 14, font: fontBold, color: DARK });
  y -= 12;
  page.drawLine({ start: { x: (PAGE_W - 260) / 2, y }, end: { x: (PAGE_W + 260) / 2, y }, thickness: 0.6, color: BORDER });
  y -= 26;

  // ---------------- CAIXA QUALIFICAÇÃO ----------------
  const rows = [
    ['CONTRATADA:', `${nomeEmpresaUpper} (${cidadeEmpresa})`],
    ['WhatsApp / Redes:', contatosEmpresa],
    ['GAP', ''],
    ['CONTRATANTE:', nome || 'Não informado'],
  ];
  if (cnpj) rows.push(['CPF / CNPJ:', cnpj]);
  rows.push(['WhatsApp / Tel:', tel || 'Não informado']);
  rows.push(['Endereço:', endereco || 'Não informado']);
  if (resp) rows.push(['Responsável:', resp]);

  const boxPadding = 14;
  const labelSize = 9.5;
  const lineH = 16;
  const gapH = 8;
  const labelColW = 118;
  const valueMaxW = CONTENT_W - boxPadding * 2 - labelColW;

  const rowsWrapped = rows.map(([label, value]) => {
    if (label === 'GAP') return { gap: true };
    const valueLines = wrapText(value, fontRegular, labelSize, valueMaxW);
    return { label, valueLines };
  });
  const boxHeight = boxPadding * 2 + rowsWrapped.reduce((acc, r) => acc + (r.gap ? gapH : lineH * r.valueLines.length), 0);

  ensureSpace(boxHeight + 20);
  const boxTop = y;
  page.drawRectangle({ x: MARGIN, y: boxTop - boxHeight, width: CONTENT_W, height: boxHeight, color: BOX_BG, borderColor: BORDER, borderWidth: 1 });
  let rowY = boxTop - boxPadding - 10;
  for (const r of rowsWrapped) {
    if (r.gap) { rowY -= gapH; continue; }
    page.drawText(r.label, { x: MARGIN + boxPadding, y: rowY, size: labelSize, font: fontBold, color: DARK });
    for (const vl of r.valueLines) {
      page.drawText(vl, { x: MARGIN + boxPadding + labelColW, y: rowY, size: labelSize, font: fontRegular, color: DARK });
      rowY -= lineH;
    }
  }
  y = boxTop - boxHeight - 24;

  // ---------------- CLÁUSULA 1: OBJETO ----------------
  tituloClausula('CLÁUSULA 1ª – DO OBJETO');
  const descObjeto = empInfo.ehMoveis
    ? 'O presente contrato tem por objeto a produção, marcenaria sob medida, beneficiamento e instalação dos móveis planejados discriminados a seguir:'
    : 'O presente contrato tem por objeto a fabricação, corte, beneficiamento e instalação dos seguintes produtos e serviços de vidraçaria e esquadrias de alumínio:';
  paragraph(descObjeto, 9.5, fontRegular, DARK, MARGIN, CONTENT_W, 14);
  y -= 8;

  if (Array.isArray(itens) && itens.length) {
    const itensY = y;
    let tableH = 22 + itens.length * 20;
    ensureSpace(tableH);

    page.drawRectangle({ x: MARGIN, y: y - 20, width: CONTENT_W, height: 20, color: rgb(0.92, 0.92, 0.92) });
    page.drawText('ITEM / DESCRIÇÃO', { x: MARGIN + 8, y: y - 14, size: 8, font: fontBold, color: DARK });
    page.drawText('QTD', { x: MARGIN + CONTENT_W - 140, y: y - 14, size: 8, font: fontBold, color: DARK });
    page.drawText('VALOR TOTAL', { x: MARGIN + CONTENT_W - 70, y: y - 14, size: 8, font: fontBold, color: DARK });
    y -= 20;

    itens.forEach((it, idx) => {
      ensureSpace(20);
      const desc = it.desc || it[0] || 'Item sem descrição';
      const qtd = it.qtd || it[1] || 1;
      const tot = it.total || it[6] || '';
      page.drawText(`${idx + 1}. ${desc}`, { x: MARGIN + 8, y: y - 14, size: 8.5, font: fontRegular, color: DARK });
      page.drawText(`${qtd}`, { x: MARGIN + CONTENT_W - 140, y: y - 14, size: 8.5, font: fontRegular, color: DARK });
      page.drawText(`${tot}`, { x: MARGIN + CONTENT_W - 70, y: y - 14, size: 8.5, font: fontBold, color: DARK });
      page.drawLine({ start: { x: MARGIN, y: y - 20 }, end: { x: PAGE_W - MARGIN, y: y - 20 }, thickness: 0.5, color: BORDER });
      y -= 20;
    });
    y -= 14;
  } else if (obs) {
    paragraph(`Especificações: ${obs}`, 9.5, fontRegular, DARK, MARGIN, CONTENT_W, 14);
    y -= 10;
  }

  // ---------------- CLÁUSULA 2: VALOR E FORMA DE PAGAMENTO ----------------
  tituloClausula('CLÁUSULA 2ª – DO VALOR E FORMA DE PAGAMENTO');
  paragraph(`Pela execução dos serviços objeto deste contrato, o CONTRATANTE pagará à CONTRATADA o valor total de ${total || 'R$ 0,00'}.`, 9.5, fontRegular, DARK, MARGIN, CONTENT_W, 14);
  if (forma) {
    paragraph(`Forma de pagamento acordada: ${forma}.`, 9.5, fontRegular, DARK, MARGIN, CONTENT_W, 14);
  }
  const pixTexto = empInfo.ehMoveis
    ? `Dados para pagamento via PIX: Chave PIX: ${empInfo.pixChave || '85996119824'} (${empInfo.pixTitular || 'SD Móveis Projetados'}).`
    : 'Dados para pagamento via PIX: Chave CNPJ: 49.226.611/0001-33 (InfinityPay - SD Vidros) ou Chave Celular: (85) 99760-2237 (Itaú - Samuel David).';
  paragraph(pixTexto, 9.5, fontRegular, DARK, MARGIN, CONTENT_W, 14);
  y -= 10;

  // ---------------- CLÁUSULA 3: PRAZO DE ENTREGA ----------------
  tituloClausula('CLÁUSULA 3ª – DO PRAZO DE ENTREGA E EXECUÇÃO');
  const prazoTexto = prazo
    ? `O prazo estimado para conclusão e entrega dos serviços é de ${prazo}, contados a partir da confirmação do pagamento do sinal e aprovação das medidas finais.`
    : 'O prazo para conclusão e entrega dos serviços será de até 15 (quinze) dias úteis após a confirmação do pagamento do sinal e aprovação das medidas finais no local.';
  paragraph(prazoTexto, 9.5, fontRegular, DARK, MARGIN, CONTENT_W, 14);
  y -= 10;

  // ---------------- CLÁUSULA 4: GARANTIA ----------------
  tituloClausula('CLÁUSULA 4ª – DA GARANTIA');
  const garantiaTexto = garantia
    ? `Os materiais e a instalação possuem garantia de ${garantia}, nos termos legais.`
    : (empInfo.ehMoveis
      ? 'A CONTRATADA oferece garantia de 1 (um) ano sobre a estrutura do MDF naval e montagem, e garantia legal sobre ferragens contra defeitos de fabricação.'
      : 'A CONTRATADA oferece garantia de 1 (um) ano sobre a instalação e garantia legal sobre os vidros temperados contra defeitos de fabricação.');
  paragraph(garantiaTexto, 9.5, fontRegular, DARK, MARGIN, CONTENT_W, 14);
  y -= 18;

  // ---------------- ASSINATURAS ----------------
  ensureSpace(90);
  y -= 20;
  const colW = (CONTENT_W - 40) / 2;
  page.drawLine({ start: { x: MARGIN, y }, end: { x: MARGIN + colW, y }, thickness: 0.8, color: DARK });
  page.drawLine({ start: { x: MARGIN + colW + 40, y }, end: { x: PAGE_W - MARGIN, y }, thickness: 0.8, color: DARK });
  y -= 14;
  page.drawText('CONTRATADA', { x: MARGIN + (colW - fontBold.widthOfTextAtSize('CONTRATADA', 9)) / 2, y, size: 9, font: fontBold, color: DARK });
  page.drawText('CONTRATANTE', { x: MARGIN + colW + 40 + (colW - fontBold.widthOfTextAtSize('CONTRATANTE', 9)) / 2, y, size: 9, font: fontBold, color: DARK });
  y -= 12;
  page.drawText(nomeEmpresaUpper, { x: MARGIN + (colW - fontRegular.widthOfTextAtSize(nomeEmpresaUpper, 8)) / 2, y, size: 8, font: fontRegular, color: GRAY });
  const cliNome = String(nome || 'Cliente').substring(0, 32);
  page.drawText(cliNome, { x: MARGIN + colW + 40 + (colW - fontRegular.widthOfTextAtSize(cliNome, 8)) / 2, y, size: 8, font: fontRegular, color: GRAY });

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

    if (req.query) {
      queryEmpresa = req.query.empresa || req.query.lic || req.query.emp || '';
      queryEmpNome = req.query.empNome || req.query.nomeEmpresa || '';
      queryEmpTipo = req.query.empTipo || req.query.tipoContrato || '';
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

          dados = {
            numero: p.n || p.numero || '0001',
            dataStr: p.d || p.data || new Date().toLocaleDateString('pt-BR'),
            nome: p.c || p.nome || '',
            cnpj: p.cnpj || '',
            tel: p.t || p.tel || '',
            endereco: p.e || p.endereco || '',
            resp: p.resp || '',
            itens: p.i || p.itens || [],
            total: p.v || p.total || '',
            forma: p.f || p.forma || '',
            obs: p.obs || '',
            prazo: p.p || p.prazo || '',
            garantia: p.g || p.garantia || ''
          };
        } catch (e) {
          return res.status(400).json({ error: 'Parâmetro de contrato inválido' });
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

    const empParamLower = String(queryEmpresa || (dados && (dados.empresa || dados.emp)) || '').toLowerCase().trim();
    const empNomeLower = String(queryEmpNome || (dados && (dados.empNome || dados.nomeEmpresa)) || '').toLowerCase().trim();
    const empTipoLower = String(queryEmpTipo || (dados && (dados.empTipo || dados.tipoContrato)) || '').toLowerCase().trim();

    const ehMoveis = (
      empParamLower === 'emp_1789700331599' ||
      empParamLower === 'sdmoveis' ||
      empParamLower === 'sd-moveis' ||
      empParamLower.includes('moveis') ||
      empParamLower.includes('móveis') ||
      empTipoLower === 'moveis' ||
      empNomeLower.includes('móveis') ||
      empNomeLower.includes('moveis')
    );

    const empInfo = {
      id: queryEmpresa || (ehMoveis ? 'sdmoveis' : 'sdvidros'),
      nome: queryEmpNome || (ehMoveis ? 'SD Móveis Projetados' : 'SD Vidros'),
      segmento: ehMoveis ? 'Móveis Planejados & Marcenaria de Luxo' : 'Vidraçaria, Esquadrias de Alumínio e Soluções em Vidro',
      contatos: ehMoveis ? 'WhatsApp: (85) 99611-9824 | Atendimento & Projetos Sob Medida' : 'WhatsApp: (85) 99611-9824 | Instagram: @sdvidros',
      endereco: 'Itaitinga - CE',
      telefone: '(85) 99611-9824',
      pixChave: ehMoveis ? '85996119824' : '49.226.611/0001-33',
      pixTitular: ehMoveis ? 'SD Móveis Projetados' : 'InfinityPay - SD Vidros',
      logoFile: ehMoveis ? 'logo_moveis.jpg' : 'logo.jpg',
      ehMoveis: ehMoveis
    };

    const fetchLogo = async (logoFileName = 'logo.jpg') => {
      try {
        const fs = require('fs');
        const path = require('path');
        const localPath = path.join(process.cwd(), logoFileName);
        if (fs.existsSync(localPath)) {
          return fs.readFileSync(localPath);
        }
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

    const pdfBytes = await gerarPdfContrato(dados, fetchLogo, empInfo);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="contrato-${(dados.numero || '0001').replace('#', '')}.pdf"`);
    res.status(200).send(Buffer.from(pdfBytes));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message || 'Erro ao gerar PDF do contrato.' });
  }
};
