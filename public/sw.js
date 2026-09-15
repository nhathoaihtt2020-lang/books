// Service Worker for BookStudio PWA
const CACHE_NAME = 'bookstudio-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/public/manifest.json',
  '/public/icon.svg'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch(() => {
        // Continue even if some assets fail to cache in dev mode
      });
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  // Do not intercept Gemini/external API requests
  if (event.request.url.includes('googleapis.com')) {
    return;
  }
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      return cachedResponse || fetch(event.request).then((response) => {
        // Optionally cache CDN requests
        if (event.request.url.includes('unpkg.com') || event.request.url.includes('cdnjs.cloudflare.com')) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      }).catch(() => {
        if (event.request.destination === 'document') {
          return caches.match('/index.html') || caches.match('/');
        }
      });
    })
  );
});
