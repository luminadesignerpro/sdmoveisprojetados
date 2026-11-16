const { getClient } = require('./_supabase');

const NTFY_TOPIC = 'sdvidros_aprovacoes_85996119824';

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });

  try {
    const { id, numero_os, assinante_nome, assinatura_base64, sobrescrever } = req.body || {};
    if ((!id && !numero_os) || !assinante_nome) {
      return res.status(400).json({ error: 'Dados incompletos para assinatura.' });
    }

    let numOs = String(numero_os || id || '').trim();
    if (numOs && !numOs.startsWith('#')) {
      const numInt = parseInt(numOs.replace(/\D/g, ''), 10);
      numOs = !isNaN(numInt) ? '#' + String(numInt).padStart(4, '0') : '#' + numOs;
    }
    const numLimpo = String(numOs || '').replace(/\D/g, '');

    const dataHora = new Date().toISOString();
    const eventoAprovacao = {
      numero_os: numOs,
      cliente: assinante_nome,
      status: 'aprovado',
      assinado: true,
      assinante_nome: assinante_nome,
      assinado_em: dataHora,
      origem: 'api_assinar'
    };

    // 1. Grava no barramento de tempo real ntfy (sempre online, zero downtime)
    let ntfyOk = false;
    try {
      const rPub = await fetch(`https://ntfy.sh/${NTFY_TOPIC}`, {
        method: 'POST',
        headers: { 'Title': `Orçamento ${numOs} Assinado Digitalmente`, 'Tags': 'white_check_mark' },
        body: JSON.stringify(eventoAprovacao)
      });
      ntfyOk = rPub.ok;
    } catch (ntfyErr) {
      console.warn('Aviso ntfy pub:', ntfyErr.message);
    }

    // Grava também a rubrica em tópico específico da OS se fornecida
    if (numLimpo && assinatura_base64) {
      try {
        await fetch(`https://ntfy.sh/sdm_os_${numLimpo}_sig`, {
          method: 'POST',
          headers: { 'Title': `Assinatura ${numOs}` },
          body: String(assinatura_base64)
        });
      } catch (_) { }
    }

    // 2. Grava no Supabase caso configurado (não bloqueia se Supabase estiver offline ou pausado)
    let dbOk = false;
    try {
      const supabase = getClient();
      let query = supabase.from('contratos').select('id, assinado, assinatura_base64');
      if (id) {
        query = query.eq('id', id);
      } else if (numOs) {
        query = query.eq('numero_os', numOs);
      }
      const { data: existente, error: errBusca } = await query.maybeSingle();

      if (!errBusca) {
        const targetId = existente ? existente.id : id;
        let upQuery = supabase.from('contratos').update({
          assinante_nome,
          assinatura_base64: assinatura_base64 || '',
          assinado: true,
          assinado_em: dataHora
        });

        if (targetId) {
          upQuery = upQuery.eq('id', targetId);
        } else if (numOs) {
          upQuery = upQuery.eq('numero_os', numOs);
        }
        const { error } = await upQuery;
        if (!error) dbOk = true;
      }
    } catch (supErr) {
      console.warn('Supabase offline ou não configurado:', supErr.message);
    }

    return res.status(200).json({
      ok: true,
      numero_os: numOs,
      status: 'aprovado',
      realtime_notified: ntfyOk,
      db_salvo: dbOk
    });
  } catch (e) {
    console.error('Erro em assinar:', e);
    return res.status(200).json({ ok: true, warning: e.message });
  }
};
