const CACHE_NAME = 'smartkhata-offline-v1';

const CORE_ROUTES = [
  '/',
  '/khata',
  '/customers',
  '/upi-collection',
  '/invoices',
  '/notes-tasks',
  '/expenses',
  '/savings',
  '/inventory',
  '/reminders',
  '/documents',
  '/analytics',
  '/settings',
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      await Promise.allSettled(
        CORE_ROUTES.map(async (route) => {
          try {
            const res = await fetch(route, { credentials: 'same-origin' });
            if (res && res.ok) {
              await cache.put(route, res.clone());
            }
          } catch {}
        })
      );
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k.startsWith('smartkhata-offline-') && k !== CACHE_NAME)
          .map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Never cache API routes or auth callbacks
  if (url.pathname.startsWith('/api/')) return;

  // 1. Next.js static hashed assets (JS/CSS/fonts): Cache-First
  if (url.pathname.startsWith('/_next/static/') || url.pathname.endsWith('.png') || url.pathname.endsWith('.svg') || url.pathname.endsWith('.ico')) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const cached = await cache.match(request);
        if (cached) return cached;
        try {
          const res = await fetch(request);
          if (res && res.ok) {
            cache.put(request, res.clone());
          }
          return res;
        } catch {
          return cached || Response.error();
        }
      })
    );
    return;
  }

  // 2. Next.js App Router RSC payload requests: Network-First with Cache Fallback
  const isRsc = request.headers.get('RSC') === '1' || url.searchParams.has('_rsc');
  if (isRsc) {
    const rscKey = `${url.pathname}?__rsc=1`;
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        try {
          const res = await fetch(request);
          if (res && res.ok) {
            cache.put(request, res.clone());
            cache.put(rscKey, res.clone());
          }
          return res;
        } catch {
          return (await cache.match(request)) || (await cache.match(rscKey)) || Response.error();
        }
      })
    );
    return;
  }

  // 3. HTML Page Navigations: Network-First with Cache Fallback (never show browser offline page for cached routes)
  if (request.mode === 'navigate' || request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        try {
          const res = await fetch(request);
          if (res && res.ok) {
            cache.put(url.pathname, res.clone());
          }
          return res;
        } catch {
          return (
            (await cache.match(url.pathname)) ||
            (await cache.match(request)) ||
            (await cache.match('/khata')) ||
            (await cache.match('/')) ||
            Response.error()
          );
        }
      })
    );
  }
});
