const { getClient } = require('./_supabase');

const SD_ZAP_NUM = '5585996119824';
const NTFY_TOPIC = 'sdvidros_aprovacoes_85996119824';

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Access-Control-Allow-Origin', '*');

  const isPost = req.method === 'POST';
  const query = req.query || {};
  const body = req.body || {};

  let os = String(body.os || query.os || query.numero_os || body.numero_os || '').trim();
  let total = String(body.total || query.total || '').trim();
  let cliente = String(body.cliente || query.cliente || '').trim();
  const format = String(query.format || body.format || '').toLowerCase();

  if (!os) {
    if (isPost || format === 'json') {
      return res.status(400).json({ error: 'Número da O.S. não informado (parâmetro "os").' });
    }
    return res.status(400).send('<h1>Erro: Número da Ordem de Serviço não informado.</h1>');
  }

  // Normaliza número da OS (ex: "0006" ou "6" vira "#0006")
  let numOs = os;
  if (!numOs.startsWith('#')) {
    const numInt = parseInt(numOs.replace(/\D/g, ''), 10);
    numOs = !isNaN(numInt) ? '#' + String(numInt).padStart(4, '0') : '#' + numOs;
  }

  const dataHora = new Date().toISOString();
  const eventoAprovacao = {
    numero_os: numOs,
    cliente: cliente || 'Cliente',
    total: total || '',
    status: 'aprovado',
    assinado: true,
    assinante_nome: cliente || 'Confirmado via WhatsApp',
    assinado_em: dataHora,
    origem: 'link_whatsapp'
  };

  // 1. Grava no barramento de tempo real ntfy (sempre online, zero downtime)
  try {
    await fetch(`https://ntfy.sh/${NTFY_TOPIC}`, {
      method: 'POST',
      headers: { 'Title': `Orçamento ${numOs} Aprovado`, 'Tags': 'white_check_mark' },
      body: JSON.stringify(eventoAprovacao)
    });
  } catch (ntfyErr) {
    console.warn('Aviso ntfy pub:', ntfyErr.message);
  }

  // 2. Tenta gravar no Supabase como persistência secundária
  let dbOk = false;
  let dbMsg = '';
  try {
    const supabase = getClient();
    const { data: existente, error: errBusca } = await supabase
      .from('contratos')
      .select('id, assinado, cliente_nome')
      .eq('numero_os', numOs)
      .limit(1);

    if (!errBusca && existente && existente.length > 0) {
      const id = existente[0].id;
      const { error: errUpdate } = await supabase
        .from('contratos')
        .update({
          assinado: true,
          assinante_nome: cliente || existente[0].cliente_nome || 'Confirmado via WhatsApp',
          assinado_em: dataHora
        })
        .eq('id', id);
      if (!errUpdate) dbOk = true;
    } else {
      const { error: errInsert } = await supabase
        .from('contratos')
        .insert({
          numero_os: numOs,
          cliente_nome: cliente || 'Cliente',
          cliente_tel: '',
          texto: `Orçamento ${numOs} aprovado pelo cliente via WhatsApp. Valor: ${total || 'Conforme proposta'}.`,
          assinado: true,
          assinante_nome: cliente || 'Confirmado via WhatsApp',
          assinado_em: dataHora
        });
      if (!errInsert) dbOk = true;
    }
  } catch (err) {
    dbMsg = err.message || '';
  }

  // Mensagem exata do WhatsApp (Imagem 2)
  const textoZap = `Olá! Aprovo o orçamento ${numOs}${total ? ' no valor de ' + total : ''} da SD Vidros! Pode iniciar a produção`;
  const zapUrl = `https://wa.me/${SD_ZAP_NUM}?text=${encodeURIComponent(textoZap)}`;

  if (isPost || format === 'json') {
    return res.status(200).json({
      ok: true,
      numero_os: numOs,
      status: 'aprovado',
      realtime_notified: true,
      db_salvo: dbOk,
      db_info: dbMsg,
      whatsapp_url: zapUrl
    });
  }

  // Cliente clicou no link: resposta HTML com abertura imediata do WhatsApp
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  return res.status(200).send(`
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="refresh" content="1;url=${zapUrl}">
  <title>Orçamento Aprovado – SD Vidros</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;800;900&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Outfit', -apple-system, sans-serif;
      background: #07070b;
      color: #f0ece4;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
      text-align: center;
    }
    .box {
      background: #101018;
      border: 1px solid rgba(201,168,76,0.3);
      border-radius: 24px;
      padding: 36px 24px;
      max-width: 440px;
      width: 100%;
      box-shadow: 0 20px 60px rgba(0,0,0,0.8), 0 0 30px rgba(201,168,76,0.15);
    }
    .icon {
      font-size: 54px;
      margin-bottom: 16px;
      display: inline-block;
      animation: bounce 0.6s ease;
    }
    @keyframes bounce {
      0% { transform: scale(0.3); opacity: 0; }
      70% { transform: scale(1.15); }
      100% { transform: scale(1); opacity: 1; }
    }
    h1 {
      font-size: 22px;
      font-weight: 900;
      color: #4ade80;
      margin-bottom: 10px;
    }
    p {
      font-size: 14.5px;
      color: #c4bdb5;
      line-height: 1.5;
      margin-bottom: 24px;
    }
    .os-badge {
      display: inline-block;
      background: rgba(201,168,76,0.15);
      color: #E8D27A;
      border: 1px solid rgba(201,168,76,0.35);
      padding: 6px 16px;
      border-radius: 999px;
      font-weight: 800;
      font-size: 15px;
      margin-bottom: 18px;
    }
    .btn-zap {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      background: linear-gradient(135deg, #25D366, #1cb85a);
      color: #fff;
      font-weight: 800;
      font-size: 15px;
      padding: 15px 24px;
      border-radius: 12px;
      text-decoration: none;
      width: 100%;
      box-shadow: 0 4px 20px rgba(37,211,102,0.35);
      transition: all 0.2s;
    }
    .btn-zap:active { transform: scale(0.98); }
    .loading-sub {
      font-size: 12px;
      color: #6a6275;
      margin-top: 14px;
    }
    .spinner {
      display: inline-block;
      width: 14px;
      height: 14px;
      border: 2px solid rgba(255,255,255,0.3);
      border-top-color: #25D366;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      vertical-align: middle;
      margin-right: 4px;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
  </style>
</head>
<body>
  <div class="box">
    <div class="icon">✅</div>
    <div class="os-badge">Orçamento ${numOs}</div>
    <h1>Orçamento Aprovado!</h1>
    <p>Sua confirmação foi registrada com sucesso no sistema da <strong>SD Vidros</strong>. Estamos abrindo seu WhatsApp para notificar nossa produção...</p>
    <a href="${zapUrl}" class="btn-zap" id="link-zap">
      📱 Abrir WhatsApp Agora
    </a>
    <div class="loading-sub">
      <span class="spinner"></span> Redirecionando automaticamente em instantes...
    </div>
  </div>
  <script>
    setTimeout(function() {
      window.location.href = "${zapUrl}";
    }, 400);
  </script>
</body>
</html>
  `);
};
