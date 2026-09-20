const { getClient } = require('./_supabase');

const NTFY_TOPIC = 'sdvidros_portal_notificacoes';

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const isPost = req.method === 'POST';
  const query = req.query || {};
  const body = req.body || {};

  const action = String(body.action || query.action || 'notificar').toLowerCase();

  // 1. Envio de mensagem pelo Cliente ou pela Vidraçaria
  if (action === 'mensagem') {
    const remetente = String(body.remetente || 'cliente'); // 'cliente' ou 'empresa'
    const clienteNome = String(body.cliente_nome || body.cliente || 'Cliente');
    const os = String(body.os || body.numero_os || '');
    const texto = String(body.texto || body.mensagem || '').trim();
    const clienteTel = String(body.telefone || body.tel || '');

    if (!texto) {
      return res.status(400).json({ error: 'Texto da mensagem não informado.' });
    }

    const payloadMsg = {
      tipo: 'mensagem',
      remetente: remetente, // 'cliente' ou 'empresa'
      cliente_nome: clienteNome,
      telefone: clienteTel,
      os: os,
      texto: texto,
      data_hora: new Date().toISOString()
    };

    // Notifica via ntfy
    try {
      const titulo = remetente === 'cliente' 
        ? `💬 Nova Mensagem de ${clienteNome} (${os || 'Portal'})`
        : `💬 Resposta da SD Vidros sobre seu pedido ${os}`;
      
      const tag = remetente === 'cliente' ? 'speech_balloon,bell' : 'glasses,white_check_mark';

      await fetch(`https://ntfy.sh/${NTFY_TOPIC}`, {
        method: 'POST',
        headers: {
          'Title': titulo,
          'Tags': tag,
          'Priority': 'urgent'
        },
        body: JSON.stringify(payloadMsg)
      });
    } catch (e) {
      console.warn('Erro ao despachar no ntfy:', e.message);
    }

    return res.status(200).json({ success: true, mensagem: payloadMsg });
  }

  // 2. Atualização de Status do Serviço pela Vidraçaria
  if (action === 'atualizar_status') {
    const os = String(body.os || body.numero_os || '');
    const clienteNome = String(body.cliente_nome || body.cliente || 'Cliente');
    const clienteTel = String(body.telefone || body.tel || '');
    const novoStatus = String(body.status || 'Em andamento');
    const etapaIndex = Number(body.etapa || 1); // 1 a 6
    const observacao = String(body.obs || body.observacao || '');
    const previsao = String(body.previsao || '');

    const payloadStatus = {
      tipo: 'status_servico',
      os: os,
      cliente_nome: clienteNome,
      telefone: clienteTel,
      status: novoStatus,
      etapa: etapaIndex,
      observacao: observacao,
      previsao: previsao,
      atualizado_em: new Date().toISOString()
    };

    // Publica no barramento para que o cliente receba em tempo real
    try {
      await fetch(`https://ntfy.sh/${NTFY_TOPIC}`, {
        method: 'POST',
        headers: {
          'Title': `🔄 SD Vidros: Status Atualizado - ${novoStatus}`,
          'Tags': 'hammer_and_wrench,sparkles',
          'Priority': 'high'
        },
        body: JSON.stringify(payloadStatus)
      });
    } catch (e) {
      console.warn('Erro ao despachar status no ntfy:', e.message);
    }

    return res.status(200).json({ success: true, status: payloadStatus });
  }

  // 3. Adicionar foto na Galeria
  if (action === 'adicionar_foto') {
    const os = String(body.os || body.numero_os || '');
    const clienteNome = String(body.cliente_nome || 'Cliente');
    const fotoUrl = String(body.foto_url || body.foto || '');
    const legenda = String(body.legenda || 'Foto do serviço');
    const remetente = String(body.remetente || 'empresa');

    const payloadFoto = {
      tipo: 'galeria_foto',
      os: os,
      cliente_nome: clienteNome,
      remetente: remetente,
      foto: fotoUrl,
      legenda: legenda,
      data_hora: new Date().toISOString()
    };

    try {
      await fetch(`https://ntfy.sh/${NTFY_TOPIC}`, {
        method: 'POST',
        headers: {
          'Title': `📸 Nova Foto na Galeria - ${os}`,
          'Tags': 'camera,art'
        },
        body: JSON.stringify(payloadFoto)
      });
    } catch (e) {
      console.warn('Erro ao despachar foto no ntfy:', e.message);
    }

    return res.status(200).json({ success: true, foto: payloadFoto });
  }

  // 4. Atualização Financeira da O.S. (pagamento, entrada, quitação)
  if (action === 'atualizar_financeiro') {
    const os = String(body.os || body.numero_os || '');
    const clienteNome = String(body.cliente_nome || body.cliente || 'Cliente');
    const valorPago = String(body.valor_pago || body.entrada || '0,00');
    const saldoRestante = String(body.saldo_restante || '0,00');
    const total = String(body.total || '0,00');
    const statusPagamento = String(body.status_pagamento || 'Pendente');

    const payloadFin = {
      tipo: 'financeiro_atualizado',
      os: os,
      cliente_nome: clienteNome,
      valor_pago: valorPago,
      saldo_restante: saldoRestante,
      total: total,
      status_pagamento: statusPagamento,
      atualizado_em: new Date().toISOString()
    };

    try {
      await fetch(`https://ntfy.sh/${NTFY_TOPIC}`, {
        method: 'POST',
        headers: {
          'Title': `💰 SD Vidros: Financeiro Atualizado - ${os}`,
          'Tags': 'moneybag,credit_card',
          'Priority': 'high'
        },
        body: JSON.stringify(payloadFin)
      });
    } catch (e) {
      console.warn('Erro ao despachar financeiro no ntfy:', e.message);
    }

    return res.status(200).json({ success: true, financeiro: payloadFin });
  }

  // 5. Troca de Senha pelo Cliente
  if (action === 'trocar_senha') {
    const clienteNome = String(body.cliente_nome || 'Cliente');
    const telefone = String(body.telefone || body.whatsapp || '');
    const os = String(body.os || '');

    const payloadSenha = {
      tipo: 'troca_senha_cliente',
      cliente_nome: clienteNome,
      telefone: telefone,
      os: os,
      data_hora: new Date().toISOString()
    };

    try {
      await fetch(`https://ntfy.sh/${NTFY_TOPIC}`, {
        method: 'POST',
        headers: {
          'Title': `🔑 Senha Alterada pelo Cliente - ${clienteNome}`,
          'Tags': 'key,lock'
        },
        body: JSON.stringify(payloadSenha)
      });
    } catch (e) {
      console.warn('Erro ao despachar troca_senha no ntfy:', e.message);
    }

    return res.status(200).json({ success: true, alterado: true });
  }

  // 6. Nova Ordem de Serviço Gerada (Apenas dados técnicos e nome do cliente, sem valores)
  if (action === 'nova_os') {
    const os = String(body.os || body.numero_os || '');
    const clienteNome = String(body.cliente_nome || body.cliente || 'Cliente');
    const data = String(body.data || '');
    const local = String(body.local || '');
    const itens = Array.isArray(body.itens) ? body.itens : [];

    const payloadNovaOs = {
      tipo: 'nova_os',
      os: os,
      cliente_nome: clienteNome,
      data: data,
      local: local,
      itens: itens,
      gerada_em: new Date().toISOString()
    };

    try {
      await fetch(`https://ntfy.sh/${NTFY_TOPIC}`, {
        method: 'POST',
        headers: {
          'Title': `📋 Nova O.S. Gerada: ${os} - ${clienteNome}`,
          'Tags': 'clipboard,hammer_and_wrench',
          'Priority': 'urgent'
        },
        body: JSON.stringify(payloadNovaOs)
      });
    } catch (e) {
      console.warn('Erro ao despachar nova_os no ntfy:', e.message);
    }

    return res.status(200).json({ success: true, ordem: payloadNovaOs });
  }

  // Endpoint de status / teste
  return res.status(200).json({
    status: 'online',
    topico_ntfy: NTFY_TOPIC,
    horario: new Date().toISOString()
  });
};
