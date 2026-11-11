const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');

const PAGE_W = 595.28; // A4 pt
const PAGE_H = 841.89;
const MARGIN = 42;
const CONTENT_W = PAGE_W - (MARGIN * 2);
const FONT_SIZE = 9;
const LINE_H = 13.5;

const DARK = rgb(0.1, 0.12, 0.16);
const GOLD = rgb(0.79, 0.63, 0.22);
const GRAY = rgb(0.45, 0.48, 0.55);
const BORDER = rgb(0.85, 0.88, 0.92);
const BOX_BG = rgb(0.98, 0.98, 0.99);

function sanitizeForPdf(str) {
  if (str == null) return '';
  return String(str)
    .replace(/[•●]/g, '-')
    .replace(/[═=]{3,}/g, '------------------------------------------------------------')
    .replace(/[─-]{3,}/g, '------------------------------------------------------------')
    .replace(/[–—]/g, '-')
    .replace(/[""]/g, '"')
    .replace(/['']/g, "'")
    .replace(/[^\x00-\xFF\n]/g, ' ')
    .trim();
}

function wrapText(text, font, size, maxWidth) {
  if (!text) return [''];
  const words = text.split(/\s+/).filter(Boolean);
  if (!words.length) return [''];
  const lines = [];
  let current = '';
  for (const w of words) {
    const test = current ? (current + ' ' + w) : w;
    if (font.widthOfTextAtSize(test, size) > maxWidth && current) {
      lines.push(current);
      current = w;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines.length ? lines : [''];
}

module.exports = async (req, res) => {
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ error: 'Método não permitido' });
  }
  try {
    let texto = '';
    let numero = '0001';
    let empresaNome = 'SD MÓVEIS PROJETADOS';

    if (req.method === 'POST') {
      texto = (req.body && req.body.texto) || '';
      numero = (req.body && req.body.numero) || '0001';
      empresaNome = (req.body && req.body.empresa) || empresaNome;
    } else {
      texto = (req.query && req.query.texto) || '';
      numero = (req.query && req.query.numero) || '0001';
      empresaNome = (req.query && req.query.empresa) || empresaNome;
    }

    if (!texto) {
      return res.status(400).json({ error: 'Texto do contrato é obrigatório.' });
    }

    const pdfDoc = await PDFDocument.create();
    const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    let page = pdfDoc.addPage([PAGE_W, PAGE_H]);
    let y = PAGE_H - MARGIN;

    function desenharCabecalho(p, pagAtual, totalPags) {
      // Cabeçalho elegante
      p.drawRectangle({
        x: MARGIN,
        y: PAGE_H - 64,
        width: CONTENT_W,
        height: 42,
        color: BOX_BG,
        borderColor: BORDER,
        borderWidth: 1
      });

      p.drawText(String(empresaNome).toUpperCase() + ' • CONTRATO DE PRESTAÇÃO DE SERVIÇOS', {
        x: MARGIN + 12,
        y: PAGE_H - 42,
        size: 10.5,
        font: fontBold,
        color: DARK
      });

      p.drawText('O.S. #' + String(numero).replace('#', '') + ' • Documento Jurídico Vinculante', {
        x: MARGIN + 12,
        y: PAGE_H - 55,
        size: 8,
        font: fontRegular,
        color: GRAY
      });

      p.drawLine({
        start: { x: MARGIN, y: PAGE_H - 65 },
        end: { x: MARGIN + CONTENT_W, y: PAGE_H - 65 },
        thickness: 1.5,
        color: GOLD
      });
    }

    const pages = [page];
    desenharCabecalho(page, 1, 1);
    y = PAGE_H - 80;

    const rawLines = sanitizeForPdf(texto).split('\n');

    for (let i = 0; i < rawLines.length; i++) {
      const lineStr = rawLines[i].trimEnd();

      if (lineStr === '') {
        y -= (LINE_H * 0.7);
        if (y < MARGIN + 25) {
          page = pdfDoc.addPage([PAGE_W, PAGE_H]);
          pages.push(page);
          desenharCabecalho(page, pages.length, pages.length);
          y = PAGE_H - 80;
        }
        continue;
      }

      // Detecta títulos de cláusulas (ex: CLÁUSULA PRIMEIRA, CONTRATADA:, etc.)
      const ehTitulo = /^(CL[AÁ]USULA|[0-9]+\.|CONTRATAD[AO]:|DO OBJETO|DO VALOR|DO PRAZO|DA GARANTIA|DO FORO)/i.test(lineStr);
      const fontUsada = ehTitulo ? fontBold : fontRegular;
      const sizeUsada = ehTitulo ? (FONT_SIZE + 0.5) : FONT_SIZE;
      const corUsada = ehTitulo ? DARK : DARK;

      const wrapped = wrapText(lineStr, fontUsada, sizeUsada, CONTENT_W);
      for (const subLine of wrapped) {
        if (y < MARGIN + 25) {
          page = pdfDoc.addPage([PAGE_W, PAGE_H]);
          pages.push(page);
          desenharCabecalho(page, pages.length, pages.length);
          y = PAGE_H - 80;
        }

        page.drawText(subLine, {
          x: MARGIN,
          y: y,
          size: sizeUsada,
          font: fontUsada,
          color: corUsada
        });
        y -= (ehTitulo ? (LINE_H + 2) : LINE_H);
      }
    }

    // Rodapé de todas as páginas
    const totalPags = pages.length;
    for (let pIdx = 0; pIdx < totalPags; pIdx++) {
      const p = pages[pIdx];
      p.drawLine({
        start: { x: MARGIN, y: MARGIN - 10 },
        end: { x: MARGIN + CONTENT_W, y: MARGIN - 10 },
        thickness: 0.5,
        color: BORDER
      });
      p.drawText(String(empresaNome) + ' • Contrato de Prestação de Serviços #' + String(numero).replace('#', ''), {
        x: MARGIN,
        y: MARGIN - 22,
        size: 7.5,
        font: fontRegular,
        color: GRAY
      });
      p.drawText('Página ' + (pIdx + 1) + ' de ' + totalPags, {
        x: MARGIN + CONTENT_W - 70,
        y: MARGIN - 22,
        size: 7.5,
        font: fontRegular,
        color: GRAY
      });
    }

    const pdfBytes = await pdfDoc.save();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="Contrato-${String(numero).replace('#', '')}.pdf"`);
    res.status(200).send(Buffer.from(pdfBytes));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message || 'Erro ao gerar PDF do contrato.' });
  }
};
