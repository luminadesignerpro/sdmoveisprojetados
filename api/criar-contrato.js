const { getClient } = require('./_supabase');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });
  try {
    const { numero_os, cliente_nome, cliente_tel, texto } = req.body || {};
    if (!texto) return res.status(400).json({ error: 'Texto do contrato é obrigatório.' });

    let supabase;
    try {
      supabase = getClient();
    } catch (cfgErr) {
      return res.status(503).json({ error: cfgErr.message, code: 'SUPABASE_NOT_CONFIGURED' });
    }

    const { data, error } = await supabase
      .from('contratos')
      .insert({ numero_os, cliente_nome, cliente_tel, texto })
      .select('id')
      .single();

    if (error) {
      console.warn('Erro Supabase criar-contrato:', error);
      const msg = error.message || '';
      if (msg.includes('fetch failed') || msg.includes('ENOTFOUND')) {
        return res.status(503).json({
          error: 'Banco de dados Supabase inacessível ou pausado. Verifique o painel do Supabase.',
          code: 'SUPABASE_UNAVAILABLE'
        });
      }
      throw error;
    }

    res.status(200).json({ id: data.id });
  } catch (e) {
    console.error('Exceção em criar-contrato:', e);
    let msg = e.message || 'Erro ao criar contrato.';
    if (msg.includes('fetch failed')) {
      msg = 'Banco de dados Supabase inacessível ou pausado.';
    }
    res.status(500).json({ error: msg });
  }
};
