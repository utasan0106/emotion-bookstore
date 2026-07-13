const CACHE_NAME = 'emotion-bookstore-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
  // オフライン対応よりも、既存のIndexedDBやAPI通信の安全性を最優先し、ネットワーク優先で動かします
  event.respondWith(
    fetch(event.request).catch(() => {
      return caches.match(event.request);
    })
  );
});