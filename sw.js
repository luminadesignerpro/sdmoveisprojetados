// Service Worker Oficial SD Vidros & SD Móveis Projetados
// Suporte a PWA, Cache Offline e Alarme de Ponto em Segundo Plano (Mesmo com o App Fechado)

const CACHE_NAME = 'sdv-pwa-v2.5';
const ASSETS_CACHE = [
  '/',
  '/index.html',
  '/cliente.html',
  '/funcionario.html',
  '/login.html',
  '/logo.jpg',
  '/logo_moveis.jpg',
  '/banner.jpg',
  '/banner_moveis.jpg'
];

let alarmesPontoConfig = [
  { hora: '08:00', label: 'Entrada no Trabalho' },
  { hora: '12:00', label: 'Saída para Almoço' },
  { hora: '13:00', label: 'Retorno do Almoço' },
  { hora: '17:00', label: 'Saída / Fim de Expediente' }
];
let colaboradorNome = 'Colaborador';
let alarmesDisparadosHoje = {};

self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS_CACHE).catch(() => {}))
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(self.clients.claim());
});

// Recebe mensagens do app / portal
self.addEventListener('message', (e) => {
  if (!e.data) return;
  if (e.data.action === 'configurarAlarmesPonto') {
    if (Array.isArray(e.data.alarmes)) {
      alarmesPontoConfig = e.data.alarmes;
    }
    if (e.data.nome) colaboradorNome = e.data.nome;
    if (e.data.testar) {
      dispararNotificacaoAlarme('Teste de Alarme de Ponto', 'O alarme do ponto está ativo e tocará 5 minutos antes de cada turno mesmo com o aplicativo fechado!');
    }
  }
});

// Periodic Background Sync (quando suportado pelo navegador)
self.addEventListener('periodicsync', (e) => {
  if (e.tag === 'alarme-ponto-sync') {
    e.waitUntil(verificarAlarmesPonto());
  }
});

// Notificação Clicada -> Abre o portal na tela de ponto
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const urlToOpen = e.notification.data && e.notification.data.url ? e.notification.data.url : '/funcionario.html?aba=ponto';

  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes('funcionario.html') && 'focus' in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(urlToOpen);
      }
    })
  );
});

// Checador de alarme em segundo plano a cada 30 segundos
function checarHorarioAtual() {
  const agora = new Date();
  const dia = agora.toISOString().slice(0, 10);
  if (!alarmesDisparadosHoje[dia]) alarmesDisparadosHoje = { [dia]: {} };

  const diaSem = agora.getDay();
  // Não dispara no domingo se for folga (pode configurar)
  if (diaSem === 0) return;

  const minTotaisAgora = agora.getHours() * 60 + agora.getMinutes();

  alarmesPontoConfig.forEach((item) => {
    if (!item.hora) return;
    const partes = item.hora.split(':');
    const minAlvo = parseInt(partes[0]) * 60 + parseInt(partes[1]);
    const minAlarme = minAlvo - 5; // 5 minutos antes

    const chaveAlarme = `${dia}_${item.hora}`;
    if (minTotaisAgora === minAlarme && !alarmesDisparadosHoje[dia][chaveAlarme]) {
      alarmesDisparadosHoje[dia][chaveAlarme] = true;
      dispararNotificacaoAlarme(
        `⏰ Alarme de Ponto: ${item.label} (${item.hora})`,
        `Atenção ${colaboradorNome}! Faltam 5 minutos para o seu horário de ${item.label}. Toque aqui para registrar o ponto agora.`
      );
    }
  });
}

function dispararNotificacaoAlarme(titulo, corpo) {
  self.registration.showNotification(titulo, {
    body: corpo,
    icon: '/logo.jpg',
    badge: '/logo.jpg',
    vibrate: [500, 250, 500, 250, 500, 250, 1000],
    tag: 'alarme-ponto-' + Date.now(),
    renotify: true,
    requireInteraction: true,
    data: {
      url: '/funcionario.html?aba=ponto&origem=alarme'
    },
    actions: [
      { action: 'registrar', title: '⏱️ Bater Ponto Agora' }
    ]
  });
}

// Loop periódico em background do Service Worker
setInterval(checarHorarioAtual, 30000);
