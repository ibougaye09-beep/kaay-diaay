// KAAY DIAAY — Service Worker
// Stratégie "réseau d'abord" : on récupère toujours la dernière version en ligne,
// et on garde une copie en cache uniquement comme secours hors-ligne.
// => évite le piège du "cache qui garde l'ancienne version".

const CACHE = 'kaay-diaay-v1';

self.addEventListener('install', function(e) {
  self.skipWaiting(); // activer la nouvelle version immédiatement
});

self.addEventListener('activate', function(e) {
  e.waitUntil((async function() {
    // Supprimer les anciens caches
    const keys = await caches.keys();
    await Promise.all(keys.filter(function(k){ return k !== CACHE; })
                          .map(function(k){ return caches.delete(k); }));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', function(e) {
  const req = e.request;
  if (req.method !== 'GET') return; // on ne touche pas aux POST/PUT (Supabase, etc.)

  e.respondWith((async function() {
    try {
      // 1) Réseau d'abord (toujours la version la plus fraîche)
      const fresh = await fetch(req);
      try {
        const cache = await caches.open(CACHE);
        cache.put(req, fresh.clone());
      } catch (err) { /* mise en cache non bloquante */ }
      return fresh;
    } catch (err) {
      // 2) Hors-ligne : on sert la copie en cache si elle existe
      const cached = await caches.match(req);
      if (cached) return cached;
      throw err;
    }
  })());
});
