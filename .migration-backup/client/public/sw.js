const CACHE_NAME = 'martingale-risk-guard-v3';
const shellFiles = [
  '/', '/manifest.json', '/newsmaker-logo-white.png', '/newsmaker-favicon.png',
  '/newsmaker-mrg-192.png', '/newsmaker-mrg-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const response = await fetch('/', { cache: 'reload' });
    if (!response.ok) throw new Error('App shell unavailable');
    const html = await response.clone().text();
    const assets = [...html.matchAll(/\b(?:src|href)=["']([^"']+)["']/g)]
      .map((match) => new URL(match[1], self.location.origin))
      .filter((url) => url.origin === self.location.origin && url.pathname.startsWith('/assets/'))
      .map((url) => url.pathname + url.search);
    if (!assets.some((asset) => /\.js(?:\?|$)/.test(asset))) {
      throw new Error('Offline mode requires the production build');
    }
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll([...new Set([...shellFiles.slice(1), ...assets])]);
    await cache.put('/', response);
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) {
      if (key.startsWith('martingale-risk-guard-') && key !== CACHE_NAME) await caches.delete(key);
    }
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  // Never cache or replace market API failures with old successful responses.
  if (event.request.method !== 'GET' || url.origin !== self.location.origin ||
      url.pathname === '/api' || url.pathname.startsWith('/api/')) return;
  if (event.request.mode === 'navigate') {
    event.respondWith((async () => {
      let response;
      try {
        response = await fetch(event.request);
        // Do not bypass authentication/client errors with an offline shell.
        if (response.status < 500) return response;
      } catch {
        // A transport failure can use this worker's verified shell only.
      }
      const cache = await caches.open(CACHE_NAME);
      return (await cache.match('/')) || response || Response.error();
    })());
    return;
  }
  // Restrict offline caching to this app's static assets, not arbitrary routes.
  if (!url.pathname.startsWith('/assets/') && !shellFiles.includes(url.pathname)) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(event.request);
    if (cached) return cached;
    const response = await fetch(event.request);
    if (response.ok && response.type === 'basic') {
      const copy = response.clone();
      event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy)).catch(() => {}));
    }
    return response;
  })());
});
