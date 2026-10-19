const VERSION = 'mnmknk-v2';
const STATIC_CACHE = `${VERSION}-static`;
const PAGES_CACHE = `${VERSION}-pages`;

const PRECACHE_URLS = [
  '/',
  '/brand/logo.png',
  '/favicon.ico',
  '/manifest.json',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(PRECACHE_URLS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);

  // Never intercept local dev servers — Turbopack reuses stable asset URLs,
  // so cached CSS/JS here goes stale and breaks hot reload.
  if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') return;

  // Skip API requests and cross-origin traffic (maps tiles, etc.)
  if (url.pathname.startsWith('/api/') || url.origin !== self.location.origin) return;

  // Pages: network-first, fall back to cache (offline support)
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(PAGES_CACHE).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(() => caches.match(request).then((cached) => cached || caches.match('/')))
    );
    return;
  }

  // Static assets: stale-while-revalidate — serve instantly from cache but
  // refresh the copy in the background so deploys propagate.
  event.respondWith(
    caches.match(request).then((cached) => {
      const refresh = fetch(request)
        .then((response) => {
          if (response.ok && (url.pathname.startsWith('/_next/') || url.pathname.startsWith('/images/') || url.pathname.startsWith('/fonts/') || url.pathname.startsWith('/brand/'))) {
            const copy = response.clone();
            caches.open(STATIC_CACHE).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => cached);
      return cached || refresh;
    })
  );
});