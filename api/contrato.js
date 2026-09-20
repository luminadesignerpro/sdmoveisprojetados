const { getClient } = require('./_supabase');

module.exports = async (req, res) => {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Método não permitido' });
  try {
    const { id, os } = req.query;
    if (!id && !os) return res.status(400).json({ error: 'ID ou OS não informado.' });

    let supabase;
    try {
      supabase = getClient();
    } catch (cfgErr) {
      return res.status(503).json({ error: cfgErr.message });
    }

    let query = supabase
      .from('contratos')
      .select('id, numero_os, cliente_nome, texto, assinado, assinante_nome, assinado_em, assinatura_base64');

    if (id) {
      query = query.eq('id', id);
    } else if (os) {
      const numLimpo = String(os).replace(/\D/g, '');
      const numHash = '#' + numLimpo.padStart(4, '0');
      query = query.or(`numero_os.eq.${numHash},numero_os.eq.${numLimpo},numero_os.ilike.%${numLimpo}%`);
    }

    const { data: records, error } = await query.order('id', { ascending: false }).limit(1);

    if (error) {
      const msg = error.message || '';
      if (msg.includes('fetch failed') || msg.includes('ENOTFOUND')) {
        return res.status(503).json({ error: 'Banco de dados Supabase inacessível ou pausado.' });
      }
      throw error;
    }
    const data = (records && records[0]) || null;
    if (!data) return res.status(404).json({ error: 'Contrato não encontrado.' });
    res.status(200).json(data);
  } catch (e) {
    console.error('Erro em contrato:', e);
    let msg = e.message || 'Erro ao buscar contrato.';
    if (msg.includes('fetch failed')) {
      msg = 'Banco de dados Supabase inacessível ou pausado.';
    }
    res.status(500).json({ error: msg });
  }
};
