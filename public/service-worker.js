const CACHE_NAME = 'manshockey-e30-8-4';

self.addEventListener('install', event => {
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();

      await Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      );

      await self.clients.claim();
    })()
  );
});

self.addEventListener('fetch', event => {
  const request = event.request;

  if (request.method !== 'GET') {
    return;
  }

  event.respondWith(
    (async () => {
      try {
        return await fetch(request, {
          cache: 'no-store'
        });
      } catch {
        const cached = await caches.match(request);

        if (cached) {
          return cached;
        }

        throw new Error('Network unavailable and no cached response found');
      }
    })()
  );
});