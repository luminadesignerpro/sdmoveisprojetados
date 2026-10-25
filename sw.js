// Service Worker PWA – SD Móveis Projetados v8.3 (Alarme Ponto Segundo Plano + Notificações)
const CACHE_NAME = 'sdmoveisprojetados-v8.3';
const ASSETS = [
  '/',
  '/index.html',
  '/confirmar.html',
  '/banner.jpg',
  '/logo_moveis.jpg',
  '/cliente.html',
  '/funcionario.html',
  '/assinar.html',
  '/alarme.wav',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png'
];

// ── Variáveis de controle do alarme de ponto ──
let _alarmesPonto = [];
let _nomeColaborador = 'Colaborador';
let _alarmeIntervalId = null;
let _ultimasNotificacoesEnviadas = {}; // evita duplicidade no mesmo minuto

// ══════════════════════════════════════════════
//  INSTALL & ACTIVATE
// ══════════════════════════════════════════════
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS).catch((err) => console.log('Aviso cache install:', err));
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

// ══════════════════════════════════════════════
//  FETCH – Network First
// ══════════════════════════════════════════════
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});

// ══════════════════════════════════════════════
//  MESSAGE – Recebe alarmes da página
// ══════════════════════════════════════════════
self.addEventListener('message', (event) => {
  const data = event.data || {};

  if (data.action === 'configurarAlarmesPonto') {
    _alarmesPonto = Array.isArray(data.alarmes) ? data.alarmes : [];
    _nomeColaborador = data.nome || 'Colaborador';
    _ultimasNotificacoesEnviadas = {};

    // Cancela loop anterior se existir
    if (_alarmeIntervalId !== null) {
      clearInterval(_alarmeIntervalId);
      _alarmeIntervalId = null;
    }

    if (_alarmesPonto.length === 0) return;

    // Dispara checagem imediata e a cada 30 segundos
    verificarAlarmesPonto();
    _alarmeIntervalId = setInterval(verificarAlarmesPonto, 30000);

    // Confirma ativação para a página
    if (event.source) {
      event.source.postMessage({ action: 'alarmeConfigurado', total: _alarmesPonto.length });
    }

    // Teste imediato (notificação de confirmação)
    if (data.testar) {
      self.registration.showNotification('⏰ Alarme de Ponto Ativado!', {
        body: `Olá, ${_nomeColaborador}! Você receberá avisos 5 minutos antes de cada batida de ponto — mesmo com o app fechado.`,
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        tag: 'alarme-ponto-ativado',
        requireInteraction: false,
        vibrate: [200, 100, 200]
      });
    }
  }

  if (data.action === 'desativarAlarmes') {
    _alarmesPonto = [];
    if (_alarmeIntervalId !== null) {
      clearInterval(_alarmeIntervalId);
      _alarmeIntervalId = null;
    }
  }
});

// ══════════════════════════════════════════════
//  VERIFICAÇÃO DOS ALARMES – roda a cada 30s
// ══════════════════════════════════════════════
function verificarAlarmesPonto() {
  if (!_alarmesPonto || _alarmesPonto.length === 0) return;

  const agora = new Date();
  const horaAtual = agora.getHours();
  const minAtual = agora.getMinutes();
  const diaSemana = agora.getDay(); // 0=Dom, 1=Seg … 6=Sáb

  _alarmesPonto.forEach((alarme) => {
    if (!alarme || !alarme.hora) return;

    // Verifica dias permitidos
    const diasPermitidos = Array.isArray(alarme.dias) ? alarme.dias : [1,2,3,4,5]; // padrão seg-sex
    if (!diasPermitidos.includes(diaSemana)) return;

    // Converte hora do alarme (HH:MM) para comparação
    const [hAlarm, mAlarm] = (alarme.hora || '00:00').split(':').map(Number);

    // Notifica 5 minutos antes
    const totalMinAtual  = horaAtual * 60 + minAtual;
    const totalMinAlarme = hAlarm * 60 + mAlarm - 5;

    if (totalMinAtual !== totalMinAlarme) return;

    // Chave única por alarme + minuto exato (evita duplicidade)
    const chave = `${alarme.hora}_${agora.toDateString()}`;
    if (_ultimasNotificacoesEnviadas[chave]) return;
    _ultimasNotificacoesEnviadas[chave] = true;

    // Dispara a notificação de ponto
    self.registration.showNotification(`⏰ Hora de Bater Ponto – ${alarme.label || alarme.hora}`, {
      body: `${_nomeColaborador}, faltam 5 minutos para ${alarme.label || 'bater o ponto'} (${alarme.hora}). Abra o app e registre!`,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: `ponto-${alarme.hora}`,
      requireInteraction: true,
      vibrate: [300, 100, 300, 100, 300],
      actions: [
        { action: 'abrir', title: '📱 Abrir App' },
        { action: 'dispensar', title: 'Dispensar' }
      ]
    });
  });
}

// ══════════════════════════════════════════════
//  NOTIFICATION CLICK
// ══════════════════════════════════════════════
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dispensar') return;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Se já tem uma aba aberta, foca nela
      for (const client of clientList) {
        if ('focus' in client) {
          return client.focus();
        }
      }
      // Caso contrário, abre uma nova janela
      if (self.clients.openWindow) {
        return self.clients.openWindow('/funcionario.html');
      }
    })
  );
});
