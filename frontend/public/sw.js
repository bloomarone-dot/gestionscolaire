const CACHE = 'edusaas-shell-v6';
const SHELL = ['/', '/index.html', '/manifest.webmanifest', '/icons/icon-192.png', '/icons/icon-512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)),
    )).then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.pathname.startsWith('/auth/')
    || url.pathname.startsWith('/tenants/')
    || url.pathname.startsWith('/pedagogie/')
    || url.pathname.startsWith('/personnel')
    || url.pathname.startsWith('/eleves/')
    || url.pathname.startsWith('/evaluations/')
    || url.pathname.startsWith('/referentiel/')
    || url.pathname.startsWith('/notifications/')
    || url.pathname.startsWith('/health')
    || url.pathname.startsWith('/bulletins/')) {
    return;
  }

  if (request.mode === 'navigate' || url.pathname.endsWith('.js') || url.pathname.endsWith('.css')) {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copy));
          return res;
        })
        .catch(() => caches.match(request).then((r) => r || caches.match('/index.html'))),
    );
  }
});
