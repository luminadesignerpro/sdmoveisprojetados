const { getClient } = require('./_supabase');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });
  try {
    const { numero_os, cliente_nome, cliente_tel, texto, dados } = req.body || {};
    if (!texto) return res.status(400).json({ error: 'Texto do contrato é obrigatório.' });

    let supabase;
    try {
      supabase = getClient();
    } catch (cfgErr) {
      return res.status(503).json({ error: cfgErr.message, code: 'SUPABASE_NOT_CONFIGURED' });
    }

    let insertObj = { numero_os, cliente_nome, cliente_tel, texto };
    if (dados) insertObj.dados = dados;

    let resInsert = await supabase
      .from('contratos')
      .insert(insertObj)
      .select('id')
      .single();

    if (resInsert.error) {
      if (insertObj.dados && String(resInsert.error.message || '').includes('dados')) {
        delete insertObj.dados;
        resInsert = await supabase
          .from('contratos')
          .insert(insertObj)
          .select('id')
          .single();
      }
    }

    if (resInsert.error) {
      console.warn('Erro Supabase criar-contrato:', resInsert.error);
      const msg = resInsert.error.message || '';
      if (msg.includes('fetch failed') || msg.includes('ENOTFOUND')) {
        return res.status(503).json({
          error: 'Banco de dados Supabase inacessível ou pausado. Verifique o painel do Supabase.',
          code: 'SUPABASE_UNAVAILABLE'
        });
      }
      throw resInsert.error;
    }

    res.status(200).json({ id: resInsert.data.id });
  } catch (e) {
    console.error('Exceção em criar-contrato:', e);
    let msg = e.message || 'Erro ao criar contrato.';
    if (msg.includes('fetch failed')) {
      msg = 'Banco de dados Supabase inacessível ou pausado.';
    }
    res.status(500).json({ error: msg });
  }
};
