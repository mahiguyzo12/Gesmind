const CACHE_NAME = 'gesmind-hybrid-v1';
const urlsToCache = ['/', '/index.html', '/manifest.json'];

// Installation du Service Worker
self.addEventListener('install', (event: any) => {
  // Force waiting to ensure the new service worker takes over immediately
  (self as any).skipWaiting();

  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('Opened cache for PWA/Hybrid mode');
      return cache.addAll(urlsToCache);
    })
  );
});

// Interception des requêtes réseau
self.addEventListener('fetch', (event: any) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      // Cache hit - return response
      if (response) {
        return response;
      }
      return fetch(event.request);
    })
  );
});

// Mise à jour du Service Worker
self.addEventListener('activate', (event: any) => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
