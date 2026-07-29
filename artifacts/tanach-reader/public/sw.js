/**
 * Service Worker — קורא תנ"ך ורש"י
 * Strategy:
 *   - App-shell & static assets → Cache-first (versioned cache)
 *   - API calls (/api/)          → Network-only (no caching of live AI data)
 *   - Navigation (HTML)          → Network-first, fallback to cached shell
 */

const CACHE_VERSION = 'v1';
const STATIC_CACHE  = `tanach-static-${CACHE_VERSION}`;
const IMAGE_CACHE   = `tanach-images-${CACHE_VERSION}`;

// Assets to precache on install
const PRECACHE_URLS = [
  '/',
  '/manifest.webmanifest',
  '/favicon.svg',
  '/icon-192.png',
  '/icon-512.png',
];

// ── Install ────────────────────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

// ── Activate ───────────────────────────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  const keep = [STATIC_CACHE, IMAGE_CACHE];
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => !keep.includes(k)).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// ── Fetch ──────────────────────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // 1. Non-GET → bypass
  if (request.method !== 'GET') return;

  // 2. API calls → network-only
  if (url.pathname.startsWith('/api/')) return;

  // 3. External origins → bypass
  if (url.origin !== self.location.origin) return;

  // 4. Image assets → cache-first (long-lived)
  if (/\.(png|jpe?g|svg|webp|gif|ico)$/i.test(url.pathname)) {
    event.respondWith(
      caches.open(IMAGE_CACHE).then(async (cache) => {
        const cached = await cache.match(request);
        if (cached) return cached;
        const response = await fetch(request);
        if (response.ok) cache.put(request, response.clone());
        return response;
      })
    );
    return;
  }

  // 5. JS / CSS / fonts → cache-first (versioned by Vite hash)
  if (/\.(js|css|woff2?)$/i.test(url.pathname)) {
    event.respondWith(
      caches.open(STATIC_CACHE).then(async (cache) => {
        const cached = await cache.match(request);
        if (cached) return cached;
        const response = await fetch(request);
        if (response.ok) cache.put(request, response.clone());
        return response;
      })
    );
    return;
  }

  // 6. Navigation (HTML) → network-first, fallback to cached root
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() =>
        caches.open(STATIC_CACHE).then((cache) => cache.match('/'))
      )
    );
    return;
  }

  // 7. Everything else → network-first, cache on success
  event.respondWith(
    caches.open(STATIC_CACHE).then(async (cache) => {
      try {
        const response = await fetch(request);
        if (response.ok) cache.put(request, response.clone());
        return response;
      } catch {
        return cache.match(request);
      }
    })
  );
});
