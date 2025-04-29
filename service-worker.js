// ► 1. Cache név verzió: ha módosítasz valamit, növeld pl. '…-v2'-re
const CACHE_NAME = 'kalandkonyv-cache-v3';

// ► 2. Statikus fájlok (install fázisban ezeket töltjük be először)
const STATIC_ASSETS = [
  '/',                  // start_url
  'index.html',         // főindex
  'offline.html',       // offline fallback oldal
  'manifest.json',      // PWA manifest
  'common-styles.css',  // közös CSS
  'flipbook-engine.js', // motorod fő JS fájlja
  'sounds/pageturn-102978.mp3',
  'js/firebase-config.js',  // Firebase konfiguráció
  'js/auth-service.js',     // Autentikációs szolgáltatás
  'js/activation-ui.js',    // Aktivációs felület
  'https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700&display=swap',
  'https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/9.22.0/firebase-auth-compat.js',
  'https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore-compat.js'
];

// ► 3. Dinamikusan generáljuk az oldalakat (borító + 1…300)
//    totalPages változóval szabályozod, hány fejezeted van.
const totalPages = 300;
const PAGE_ASSETS = Array.from(
  { length: totalPages + 1 },      // 0..300
  (_, i) => i === 0
    ? 'pages/borito.html'           // 0 → borító
    : `pages/${i}.html`             // 1..300
);

// ► 4. Kulcsfontosságú képek és ikonok cache-first: 
//    képeket nem kell mind listázni, de ha akarod, beteheted statikus listába is.
//    (alternatíva: a fetch-handler magától cache-eli őket)
const IMAGE_ASSETS = [
  'images/d1.png','images/d2.png','images/d3.png',
  'images/d4.png','images/d5.png','images/d6.png',
  'files/icon-192.png','files/icon-512.png'
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

  // Firebase API kérések - mindig hálózatról
  if (url.hostname.includes('firestore.googleapis.com') || 
      url.hostname.includes('firebase') ||
      url.pathname.includes('auth')) {
    return;  // Ne kezeljük a Firebase API kéréseket service worker-ben
  }

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
      });
    })
  );
});
