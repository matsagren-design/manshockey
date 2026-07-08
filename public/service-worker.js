const CACHE = 'manshockey-x-v8';
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(['/', '/manifest.webmanifest'])));
});
self.addEventListener('fetch', event => {
  event.respondWith(fetch(event.request).catch(() => caches.match(event.request)));
});
