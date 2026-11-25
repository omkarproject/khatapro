const CACHE_NAME = 'smartkhata-offline-v2';

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
            const htmlRes = await fetch(route, { credentials: 'same-origin' });
            if (htmlRes && htmlRes.ok) {
              await cache.put(route, htmlRes.clone());
            }
          } catch {}
          try {
            const rscRes = await fetch(route, {
              credentials: 'same-origin',
              headers: { RSC: '1' },
            });
            if (rscRes && rscRes.ok) {
              await cache.put(`${route}?__rsc=1`, rscRes.clone());
            }
          } catch {}
        })
      );
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k.startsWith('smartkhata-offline-') && k !== CACHE_NAME)
            .map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET' && request.method !== 'HEAD') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Never cache connectivity pings or API routes
  if (url.searchParams.has('__ping') || url.pathname.startsWith('/api/')) return;
  if (request.method !== 'GET') return;

  // 1. Next.js static hashed assets (JS/CSS/fonts/images): Cache-First
  if (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.ico')
  ) {
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

  // 2. Next.js App Router RSC payload requests: Network-First with Cache Fallback (prevents hard reload offline!)
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
          const cached = (await cache.match(request)) || (await cache.match(rscKey));
          if (cached) return cached;
          return Response.error();
        }
      })
    );
    return;
  }

  // 3. HTML Page Navigations: Network-First with Cache Fallback
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
