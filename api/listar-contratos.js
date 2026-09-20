const { getClient } = require('./_supabase');

const NTFY_TOPIC = 'sdvidros_aprovacoes_85996119824';

module.exports = async (req, res) => {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Método não permitido' });

  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Access-Control-Allow-Origin', '*');

  const contratosMap = new Map();

  // 1. Busca aprovações do barramento em tempo real (ntfy.sh - 100% de disponibilidade)
  try {
    const r = await fetch(`https://ntfy.sh/${NTFY_TOPIC}/json?poll=1&since=all`);
    const text = await r.text();
    if (text) {
      const lines = text.split('\n').filter(Boolean);
      for (const line of lines) {
        try {
          const item = JSON.parse(line);
          if (item.event === 'message' && item.message) {
            const dados = JSON.parse(item.message);
            if (dados.numero_os) {
              contratosMap.set(dados.numero_os, {
                id: item.id || dados.numero_os,
                numero_os: dados.numero_os,
                cliente_nome: dados.cliente || 'Cliente',
                cliente_tel: '',
                assinado: true,
                assinante_nome: dados.assinante_nome || dados.cliente || 'Confirmado via WhatsApp',
                assinado_em: dados.assinado_em || (item.time ? new Date(item.time * 1000).toISOString() : new Date().toISOString()),
                texto: `Orçamento ${dados.numero_os} aprovado via WhatsApp.`
              });
            }
          }
        } catch (_) {}
      }
    }
  } catch (err) {
    console.warn('Aviso ntfy em listar-contratos:', err.message);
  }

  // 2. Tenta complementar com Supabase (caso esteja online e configurado)
  try {
    const supabase = getClient();
    const { data: dbData } = await supabase
      .from('contratos')
      .select('id, numero_os, cliente_nome, cliente_tel, assinado, assinante_nome, assinado_em, assinatura_base64, texto')
      .order('id', { ascending: false });

    if (Array.isArray(dbData)) {
      dbData.forEach(c => {
        if (c && c.numero_os) {
          const anterior = contratosMap.get(c.numero_os) || {};
          contratosMap.set(c.numero_os, { ...anterior, ...c });
        }
      });
    }
  } catch (_) {}

  const lista = Array.from(contratosMap.values());
  res.status(200).json(lista);
};
