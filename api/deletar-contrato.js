const { getClient } = require('./_supabase');

module.exports = async (req, res) => {
  if (req.method !== 'DELETE' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }
  try {
    const id = (req.query && req.query.id) || (req.body && req.body.id);
    if (!id) return res.status(400).json({ error: 'ID não informado.' });

    let supabase;
    try {
      supabase = getClient();
    } catch (cfgErr) {
      return res.status(503).json({ error: cfgErr.message });
    }

    const { error } = await supabase
      .from('contratos')
      .delete()
      .eq('id', id);

    if (error) {
      const msg = error.message || '';
      if (msg.includes('fetch failed') || msg.includes('ENOTFOUND')) {
        return res.status(503).json({ error: 'Banco de dados Supabase inacessível ou pausado.' });
      }
      throw error;
    }
    res.status(200).json({ ok: true });
  } catch (e) {
    console.error(e);
    let msg = e.message || 'Erro ao excluir contrato.';
    if (msg.includes('fetch failed')) {
      msg = 'Banco de dados Supabase inacessível ou pausado.';
    }
    res.status(500).json({ error: msg });
  }
};
