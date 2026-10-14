const CACHE_NAME = 'martingale-risk-guard-v2';
const urlsToCache = [
  '/',
  '/index.html'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(urlsToCache);
      })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName.startsWith('martingale-risk-guard-') && cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  // Never replace failed live API requests with a previously successful response.
  // Leave POSTs and third-party content to the browser, including TradingView.
  if (event.request.method !== 'GET' || url.origin !== self.location.origin ||
      url.pathname === '/api' || url.pathname.startsWith('/api/')) return;
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }
        const responseToCache = response.clone();
        event.waitUntil(caches.open(CACHE_NAME)
          .then((cache) => cache.put(event.request.mode === 'navigate' ? '/' : event.request, responseToCache))
          .catch(() => { /* Static caching is optional; do not hide network errors. */ }));
        return response;
      })
      .catch(() => {
        return caches.match(event.request.mode === 'navigate' ? '/' : event.request)
          .then((response) => response || Response.error());
      })
  );
});
