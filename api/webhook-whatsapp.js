const { getClient } = require('./_supabase');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(200).send('Webhook WhatsApp SD Vidros pronto para receber POST.');
  }

  try {
    const body = req.body || {};
    
    // Tenta extrair o texto de diferentes formatos comuns de webhooks WhatsApp (Evolution, Z-API, Baileys, etc.)
    let texto = '';
    if (typeof body === 'string') {
      texto = body;
    } else {
      texto = body.message || body.text || body.body || (body.data && (body.data.message || body.data.body)) || '';
      if (typeof texto === 'object' && texto !== null) {
        texto = texto.conversation || texto.text || texto.body || JSON.stringify(texto);
      }
    }

    texto = String(texto || '').trim();

    if (!texto) {
      return res.status(200).json({ ok: false, msg: 'Nenhum texto de mensagem detectado no payload.' });
    }

    // Verifica se a mensagem contém indicação de aprovação
    const textoMinusculo = texto.toLowerCase();
    const ehAprovacao = textoMinusculo.includes('aprovo') ||
                        textoMinusculo.includes('aprovado') ||
                        textoMinusculo.includes('pode iniciar a produção') ||
                        textoMinusculo.includes('pode iniciar a producao') ||
                        textoMinusculo.includes('autorizo');

    if (!ehAprovacao) {
      return res.status(200).json({ ok: false, msg: 'Mensagem recebida, mas não é uma confirmação de aprovação.' });
    }

    // Extrai o número da OS (ex: "#0006" ou "0006")
    const matchOs = texto.match(/#(\d{3,5})/i) || texto.match(/orçamento\s*(?:nº|n°|n\.|#)?\s*(\d{3,5})/i);
    if (!matchOs) {
      return res.status(200).json({ ok: false, msg: 'Número da O.S. não encontrado no texto da mensagem.' });
    }

    const numDigitos = matchOs[1];
    const numOs = '#' + numDigitos.padStart(4, '0');

    const NTFY_TOPIC = 'sdvidros_aprovacoes_85996119824';
    const dataHora = new Date().toISOString();

    // 1. Notifica o barramento de tempo real instantâneo
    try {
      await fetch(`https://ntfy.sh/${NTFY_TOPIC}`, {
        method: 'POST',
        headers: { 'Title': `Orçamento ${numOs} Aprovado via Webhook`, 'Tags': 'white_check_mark' },
        body: JSON.stringify({
          numero_os: numOs,
          cliente: 'Cliente',
          status: 'aprovado',
          assinado: true,
          assinante_nome: 'Confirmado via WhatsApp',
          assinado_em: dataHora,
          origem: 'webhook_whatsapp'
        })
      });
    } catch (_) {}

    // 2. Tenta atualizar no Supabase (se disponível)
    let dbOk = false;
    let dbMsg = '';
    try {
      const supabase = getClient();
      const { data: existente } = await supabase
        .from('contratos')
        .select('id, cliente_nome')
        .eq('numero_os', numOs)
        .limit(1);

      if (existente && existente.length > 0) {
        await supabase
          .from('contratos')
          .update({
            assinado: true,
            assinante_nome: existente[0].cliente_nome || 'Confirmado via WhatsApp',
            assinado_em: dataHora
          })
          .eq('id', existente[0].id);
      } else {
        await supabase
          .from('contratos')
          .insert({
            numero_os: numOs,
            cliente_nome: 'Cliente',
            cliente_tel: '',
            texto: texto,
            assinado: true,
            assinante_nome: 'Confirmado via WhatsApp',
            assinado_em: dataHora
          });
      }
      dbOk = true;
    } catch (e) {
      dbMsg = e.message;
    }

    return res.status(200).json({
      ok: true,
      numero_os: numOs,
      status: 'aprovado',
      db_salvo: dbOk,
      db_info: dbMsg
    });
  } catch (err) {
    console.error('Erro no webhook de WhatsApp:', err);
    return res.status(500).json({ error: err.message });
  }
};
