const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');

const PAGE_W = 595.28; // A4 pt
const PAGE_H = 841.89;
const MARGIN = 50;
const FONT_SIZE = 9;
const LINE_H = 13;
const DARK = rgb(0.08, 0.08, 0.08);

function sanitizeForPdf(str) {
  return String(str)
    .replace(/═/g, '=')
    .replace(/─/g, '-')
    .replace(/[–—]/g, '-')
    .replace(/[^\x00-\xFF\n]/g, '?');
}

function wrapMonoLine(line, font, size, maxWidth) {
  // Preserva linhas em branco
  if (line === '') return [''];
  const words = line.split(' ');
  const out = [];
  let current = '';
  for (const w of words) {
    const test = current ? current + ' ' + w : w;
    if (font.widthOfTextAtSize(test, size) > maxWidth && current) {
      out.push(current);
      current = w;
    } else {
      current = test;
    }
  }
  if (current) out.push(current);
  return out.length ? out : [''];
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });
  try {
    const { texto, numero } = req.body || {};
    if (!texto) return res.status(400).json({ error: 'Texto do contrato é obrigatório.' });

    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Courier);
    const contentWidth = PAGE_W - MARGIN * 2;

    let page = pdfDoc.addPage([PAGE_W, PAGE_H]);
    let y = PAGE_H - MARGIN;

    function newPage() {
      page = pdfDoc.addPage([PAGE_W, PAGE_H]);
      y = PAGE_H - MARGIN;
    }

    const rawLines = sanitizeForPdf(texto).split('\n');
    for (const rawLine of rawLines) {
      const wrapped = wrapMonoLine(rawLine, font, FONT_SIZE, contentWidth);
      for (const line of wrapped) {
        if (y < MARGIN) newPage();
        page.drawText(line, { x: MARGIN, y, size: FONT_SIZE, font, color: DARK });
        y -= LINE_H;
      }
    }

    const pdfBytes = await pdfDoc.save();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="contrato-texto-${(numero || '0001').replace('#', '')}.pdf"`);
    res.status(200).send(Buffer.from(pdfBytes));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message || 'Erro ao gerar PDF do contrato.' });
  }
};
