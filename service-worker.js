// ► 1. Cache név verzió: ha módosítasz valamit, növeld pl. '…-v5'-re
const CACHE_NAME = 'kalandkonyv-cache-v5';
// ► 2. Statikus fájlok (install fázisban ezeket töltjük be először)
const STATIC_ASSETS = [
  '/',                  // start_url
  'index.html',         // főindex
  'offline.html',       // offline fallback oldal
  'manifest.json',      // PWA manifest
  'common-styles.css',  // közös CSS
  'pages/dice1.html',   // 1 kockás dobás oldal
  'pages/dice3.html',   // 3 kockás dobás oldal
  'pages/character.html',  // karaktergenerálás
  'pages/answer.html',   // válaszadós oldal
  'sounds/pageturn-102978.mp3',
  'https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700&display=swap',
  'https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap'
];
// ► 3. Képek cache-first listája: 
//    (alternatíva: a fetch-handler magától cache-eli őket)
const IMAGE_ASSETS = [
  'images/d1.png','images/d2.png','images/d3.png',
  'images/d4.png','images/d5.png','images/d6.png',
  'images/dark_knowledge.png', 'images/shadow_power.png', 'images/health_points.png',
  'images/lapozz.png',
  'files/icon-192.png','files/icon-512.png'
];

// ► 4. Oldalak listája (ha van külön csoportod)
const PAGE_ASSETS = [
  // Ha vannak további oldalak, amiket cache-elni szeretnél
];

// ► 5. Összefűzzük a listákat egy tömbbé
const RESOURCES_TO_CACHE = STATIC_ASSETS
  .concat(IMAGE_ASSETS)  // ha statikusan akarod cache-elni a képeket
  .concat(PAGE_ASSETS);

// ► 6. Install – előcache-eljük a teljes listát
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(RESOURCES_TO_CACHE))
      .then(() => self.skipWaiting())
  );
});

// ► 7. Activate – régi cache-ek törlése, ha verzióváltás történt
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k !== CACHE_NAME)
          .map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// ► 8. Fetch – kéréskezelés
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  
  // 8a) Képek / ikonok (cache-first stratégia)
  if (url.pathname.startsWith('/images/') || url.pathname.startsWith('/files/')) {
    event.respondWith(
      caches.match(event.request).then(cached => {
        if (cached) return cached;
        return fetch(event.request).then(networkRes => {
          if (networkRes.ok) {
            const copy = networkRes.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
          }
          return networkRes;
        });
      })
    );
    return;
  }
  
  // 8b) Egyéb erőforrások (index, HTML oldalak, JS, CSS, manifest stb.)
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(networkRes => {
        // sikeres GET → cache-eljük is (pl. oldalakat)
        if (networkRes.ok && event.request.method === 'GET') {
          const copy = networkRes.clone();
          // csak HTML oldalak és statikus fájlok kerüljenek cache-be
          if (
            url.pathname.startsWith('/pages/') ||
            networkRes.headers.get('content-type')?.includes('text/html')
          ) {
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
          }
        }
        return networkRes;
      }).catch(() => {
        // offline fallback: ha egy /pages/ oldal nem elérhető, mutassuk az offline.html-t
        if (url.pathname.startsWith('/pages/')) {
          return caches.match('offline.html');
        }
        throw new Error('Network request failed and no offline fallback available');
      });
    })
  );
});