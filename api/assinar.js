const { getClient } = require('./_supabase');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });
  try {
    const { id, numero_os, assinante_nome, assinatura_base64, sobrescrever } = req.body || {};
    if ((!id && !numero_os) || !assinante_nome || !assinatura_base64) {
      return res.status(400).json({ error: 'Dados incompletos para assinatura.' });
    }

    let supabase;
    try {
      supabase = getClient();
    } catch (cfgErr) {
      return res.status(503).json({ error: cfgErr.message });
    }

    let query = supabase.from('contratos').select('id, assinado, assinatura_base64');
    if (id) {
      query = query.eq('id', id);
    } else {
      query = query.eq('numero_os', numero_os);
    }
    const { data: existente, error: errBusca } = await query.maybeSingle();

    if (errBusca) {
      const msg = errBusca.message || '';
      if (msg.includes('fetch failed') || msg.includes('ENOTFOUND')) {
        return res.status(503).json({ error: 'Banco de dados Supabase inacessível ou pausado.' });
      }
      throw errBusca;
    }
    if (existente && existente.assinado && existente.assinatura_base64 && !sobrescrever) {
      return res.status(409).json({ error: 'Este contrato já possui assinatura registrada.' });
    }

    const targetId = existente ? existente.id : id;
    let upQuery = supabase.from('contratos').update({
      assinante_nome,
      assinatura_base64,
      assinado: true,
      assinado_em: new Date().toISOString()
    });

    if (targetId) {
      upQuery = upQuery.eq('id', targetId);
    } else {
      upQuery = upQuery.eq('numero_os', numero_os);
    }
    const { error } = await upQuery;

    if (error) {
      const msg = error.message || '';
      if (msg.includes('fetch failed') || msg.includes('ENOTFOUND')) {
        return res.status(503).json({ error: 'Banco de dados Supabase inacessível ou pausado.' });
      }
      throw error;
    }
    res.status(200).json({ ok: true });
  } catch (e) {
    console.error('Erro em assinar:', e);
    let msg = e.message || 'Erro ao salvar assinatura.';
    if (msg.includes('fetch failed')) {
      msg = 'Banco de dados Supabase inacessível ou pausado.';
    }
    res.status(500).json({ error: msg });
  }
};
