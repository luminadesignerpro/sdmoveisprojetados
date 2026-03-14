// Minimal Service Worker required for PWA installability
const CACHE_NAME = 'sd-moveis-v1';
const ASSETS_TO_CACHE = [
    '/',
    '/index.html',
    '/favicon.jpeg',
    '/manifest.json'
];

self.addEventListener('install', (event) => {
    self.skipWaiting(); // Force active
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS_TO_CACHE);
        })
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(clients.claim()); // Take control immediately
});

self.addEventListener('fetch', (event) => {
    // Bypass cache for development or non-GET requests
    if (event.request.method !== 'GET' || event.request.url.includes('localhost') || event.request.url.includes('127.0.0.1')) {
        return;
    }
    event.respondWith(
        caches.match(event.request).then((response) => response || fetch(event.request))
    );
});
