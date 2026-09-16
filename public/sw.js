// Service Worker for BookStudio PWA - Version 4
const CACHE_NAME = 'bookstudio-v4';
const STATIC_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon.svg',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch(() => {});
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
  // Do not cache third-party cloud APIs (Firebase, Supabase, Cloudinary, Gemini, Pollinations)
  const url = event.request.url;
  if (
    url.includes('googleapis.com') ||
    url.includes('firebase') ||
    url.includes('supabase.co') ||
    url.includes('cloudinary.com') ||
    url.includes('pollinations.ai')
  ) {
    return;
  }

  // Network-First for HTML/Navigation: Always fetch fresh HTML from server/GitHub Pages
  if (event.request.mode === 'navigate' || event.request.destination === 'document' || url.endsWith('.html') || url.endsWith('/')) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response && response.status === 200) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((c) => c.put(event.request, copy));
          }
          return response;
        })
        .catch(() => {
          return caches.match(event.request) || caches.match('./index.html') || caches.match('./');
        })
    );
    return;
  }

  // Cache-First with Network fallback for static vendor scripts and fonts
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      return cachedResponse || fetch(event.request).then((response) => {
        if (response && response.status === 200 && (url.includes('unpkg.com') || url.includes('cdnjs.cloudflare.com') || url.includes('fonts.googleapis.com') || url.includes('jsdelivr.net'))) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      });
    })
  );
});
