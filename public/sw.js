// Service Worker - SD Móveis Projetados
// v4: force cache invalidation - fix UTF-8 encoding for emojis and accented chars
const CACHE_NAME = 'sd-moveis-v4';
const ASSETS_TO_CACHE = [
    '/',
    '/index.html',
    '/favicon.jpeg',
    '/manifest.json'
];

// Install: limpar caches antigos e pre-cachear assets essenciais
self.addEventListener('install', (event) => {
    self.skipWaiting(); // Ativar imediatamente sem esperar tab fechar
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS_TO_CACHE);
        })
    );
});

// Activate: deletar TODOS os caches antigos
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames
                    .filter((name) => name !== CACHE_NAME)
                    .map((name) => caches.delete(name))
            );
        }).then(() => clients.claim()) // Assume controle imediato de todas as tabs
    );
});

// Fetch: estratégia Network-First (sempre tenta rede, cache como fallback offline)
self.addEventListener('fetch', (event) => {
    // Ignorar requisições não-GET e localhost
    if (event.request.method !== 'GET' || 
        event.request.url.includes('localhost') || 
        event.request.url.includes('127.0.0.1') ||
        event.request.url.includes('supabase.co')) {
        return;
    }

    event.respondWith(
        fetch(event.request)
            .then((networkResponse) => {
                // Sucesso na rede: atualizar cache e retornar resposta
                if (networkResponse && networkResponse.status === 200) {
                    const responseClone = networkResponse.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseClone);
                    });
                }
                return networkResponse;
            })
            .catch(() => {
                // Falha na rede: tentar cache (modo offline)
                return caches.match(event.request);
            })
    );
});
