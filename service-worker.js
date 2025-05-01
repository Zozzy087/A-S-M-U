// ► Service Worker - Mobilbarát verzió (v15)
// Optimalizálva mobil eszközökre, jobb hibakezeléssel

// Cache név
const CACHE_NAME = 'kalandkonyv-cache-v15';

// Fontos statikus fájlok, amelyeket mindenképp gyorsítótárazni kell
const CRITICAL_ASSETS = [
  '/',                  // start_url
  'index.html',         // főindex
  'offline.html',       // offline fallback oldal
  'manifest.json',      // PWA manifest
  'common-styles.css',  // közös CSS
  'js/firebase-config.js',  // Firebase konfiguráció
  'js/auth-service.js',     // Autentikációs szolgáltatás
  'js/activation-ui.js',    // Aktivációs felület
  'files/icon-192.png',
  'files/icon-512.png'
];

// Másodlagos fontosságú statikus fájlok
const SECONDARY_ASSETS = [
  'flipbook-engine.js', // motorod fő JS fájlja
  'sounds/pageturn-102978.mp3'
];

// Külső függőségek (feltételes cache)
const EXTERNAL_DEPENDENCIES = [
  'https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700&display=swap',
  'https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap',
  'https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/9.22.0/firebase-auth-compat.js',
  'https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore-compat.js'
];

// ► Dinamikusan generáljuk az oldalakat (borító + 1…300)
//    totalPages változóval szabályozod, hány fejezeted van.
const totalPages = 300;
const PAGE_ASSETS = Array.from(
  { length: totalPages + 1 },      // 0..300
  (_, i) => i === 0
    ? 'pages/borito.html'           // 0 → borító
    : `pages/${i}.html`             // 1..300
);

// Képek, amelyeket gyorsítótárazni kell
const IMAGE_ASSETS = [
  'images/d1.png','images/d2.png','images/d3.png',
  'images/d4.png','images/d5.png','images/d6.png'
];

// Összesített statikus erőforrások
const STATIC_RESOURCES = [
  ...CRITICAL_ASSETS,
  ...SECONDARY_ASSETS,
  ...IMAGE_ASSETS
];

// Prioritásos telepítés - csak a kritikus erőforrások
self.addEventListener('install', event => {
  console.log('[Service Worker] Telepítés...');
  
  event.waitUntil(
    // Először csak a kritikus erőforrásokat mentjük
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[Service Worker] Kritikus erőforrások cache-elése...');
        
        // Egyesével próbáljuk cache-elni az erőforrásokat
        const cachePromises = CRITICAL_ASSETS.map(url => {
          return cache.add(url).catch(error => {
            console.warn('[Service Worker] Nem sikerült cache-elni:', url, error);
            return Promise.resolve(); // Folytatjuk a többi fájllal
          });
        });
        
        return Promise.all(cachePromises);
      })
      .then(() => {
        console.log('[Service Worker] Kritikus erőforrások cache-elése sikeres');
        return self.skipWaiting();
      })
      .catch(err => {
        console.error('[Service Worker] Telepítési hiba:', err);
        return self.skipWaiting();
      })
  );
});

// Aktiválás utáni másodlagos telepítés
self.addEventListener('activate', event => {
  console.log('[Service Worker] Aktiválás...');
  
  event.waitUntil(
    // Régi cache-ek törlése
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k !== CACHE_NAME)
          .map(k => {
            console.log('[Service Worker] Régi cache törlése:', k);
            return caches.delete(k);
          })
      )
    )
    .then(() => {
      console.log('[Service Worker] Régi cache-ek törlése kész');
      
      // Másodlagos erőforrások betöltése (nem blokkolja az aktiválást)
      setTimeout(() => {
        caches.open(CACHE_NAME).then(cache => {
          console.log('[Service Worker] Másodlagos erőforrások cache-elése...');
          
          // Másodlagos erőforrások cache-elése
          SECONDARY_ASSETS.forEach(url => {
            fetch(url)
              .then(response => {
                if (response.ok) {
                  cache.put(url, response);
                }
              })
              .catch(err => {
                console.warn('[Service Worker] Másodlagos erőforrás cache-elési hiba:', url, err);
              });
          });
          
          // Külső függőségek cache-elése
          EXTERNAL_DEPENDENCIES.forEach(url => {
            fetch(url, { mode: 'no-cors' })
              .then(response => {
                cache.put(url, response);
              })
              .catch(err => {
                console.warn('[Service Worker] Külső függőség cache-elési hiba:', url, err);
              });
          });
          
          // Kezdőoldalak (első 5 oldal) cache-elése
          const initialPages = PAGE_ASSETS.slice(0, 6); // Borító + első 5 oldal
          initialPages.forEach(url => {
            fetch(url)
              .then(response => {
                if (response.ok) {
                  cache.put(url, response);
                }
              })
              .catch(err => {
                console.warn('[Service Worker] Kezdőoldal cache-elési hiba:', url, err);
              });
          });
        });
      }, 1000); // 1 másodperc késleltetés
      
      return self.clients.claim();
    })
  );
});

// Kérések kezelése
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  
  // Firebase API kérések - mindig hálózatról
  if (url.hostname.includes('firestore.googleapis.com') || 
      url.hostname.includes('firebase') ||
      url.hostname.includes('googleapis.com') ||
      url.pathname.includes('auth')) {
    // Nem avatkozunk be a Firebase kérésekbe, hanem hagyjuk, hogy a böngésző kezelje
    return;
  }

  // Képek és ikonok kezelése (cache-first)
  if (url.pathname.startsWith('/images/') || 
      url.pathname.startsWith('/files/') || 
      IMAGE_ASSETS.some(asset => url.pathname.endsWith(asset))) {
    event.respondWith(
      caches.match(event.request).then(cached => {
        if (cached) {
          // Ha cache-ben van, visszaadjuk
          return cached;
        }
        
        // Ha nincs cache-ben, hálózatról kérjük
        return fetch(event.request)
          .then(networkRes => {
            if (networkRes.ok) {
              // Ha sikeres, elmentjük a cache-be
              const copy = networkRes.clone();
              caches.open(CACHE_NAME).then(cache => {
                cache.put(event.request, copy);
              });
            }
            return networkRes;
          })
          .catch(() => {
            // Ha nincs kép, üres 404-et adunk vissza
            return new Response('Image not found', { status: 404 });
          });
      })
    );
    return;
  }

  // Google Fonts kezelése (special handling)
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    event.respondWith(
      caches.match(event.request).then(cached => {
        if (cached) return cached;
        
        return fetch(event.request, { mode: 'no-cors' })
          .then(response => {
            const copy = response.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(event.request, copy);
            });
            return response;
          })
          .catch(err => {
            console.warn('[Service Worker] Google Fonts betöltési hiba:', err);
            // Fallback font nem lehetséges
            return fetch(event.request);
          });
      })
    );
    return;
  }

  // HTML oldalak kezelése (Cache, majd network, updates cache)
  if (url.pathname.endsWith('.html') || 
      url.pathname === '/' || 
      url.pathname.startsWith('/pages/')) {
    event.respondWith(
      caches.match(event.request).then(cached => {
        // Először a cache-t próbáljuk
        if (cached) {
          // Háttérben frissítjük a cache-t
          fetch(event.request).then(response => {
            if (response.ok) {
              caches.open(CACHE_NAME).then(cache => {
                cache.put(event.request, response);
              });
            }
          }).catch(() => {/* Csendes hiba */});
          
          return cached;
        }
        
        // Ha nincs a cache-ben, akkor hálózatról kérjük
        return fetch(event.request)
          .then(networkRes => {
            if (networkRes.ok) {
              // Ha sikeres, elmentjük a cache-be
              const copy = networkRes.clone();
              caches.open(CACHE_NAME).then(cache => {
                cache.put(event.request, copy);
              });
            }
            return networkRes;
          })
          .catch(() => {
            // Ha offline vagyunk, megfelelő fallback-et adunk
            if (url.pathname === '/' || url.pathname.endsWith('index.html')) {
              return caches.match('offline.html');
            } else if (url.pathname.startsWith('/pages/')) {
              return caches.match('offline.html');
            }
            
            // Egyéb esetekben üres 404-et adunk vissza
            return new Response('Resource not available offline', { 
              status: 404, 
              headers: new Headers({ 'Content-Type': 'text/plain' }) 
            });
          });
      })
    );
    return;
  }

  // JS/CSS fájlok kezelése (Cache, majd network, updates cache)
  if (url.pathname.endsWith('.js') || url.pathname.endsWith('.css')) {
    event.respondWith(
      caches.match(event.request).then(cached => {
        // Először a cache-t próbáljuk
        if (cached) {
          // Háttérben frissítjük a cache-t, ha nem kritikus JS/CSS
          if (!url.pathname.includes('firebase-config.js') && 
              !url.pathname.includes('auth-service.js') && 
              !url.pathname.includes('activation-ui.js')) {
            fetch(event.request).then(response => {
              if (response.ok) {
                caches.open(CACHE_NAME).then(cache => {
                  cache.put(event.request, response);
                });
              }
            }).catch(() => {/* Csendes hiba */});
          }
          
          return cached;
        }
        
        // Ha nincs a cache-ben, akkor hálózatról kérjük
        return fetch(event.request)
          .then(networkRes => {
            if (networkRes.ok) {
              // Ha sikeres, elmentjük a cache-be
              const copy = networkRes.clone();
              caches.open(CACHE_NAME).then(cache => {
                cache.put(event.request, copy);
              });
            }
            return networkRes;
          })
          .catch(() => {
            // JS/CSS fájlokhoz nincs offline fallback
            return new Response('Resource not available offline', { 
              status: 404, 
              headers: new Headers({ 'Content-Type': 'text/plain' }) 
            });
          });
      })
    );
    return;
  }

  // Minden egyéb kérés (network-first)
  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Ha sikeres, elmentjük a cache-be
        if (response.ok && event.request.method === 'GET') {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, copy);
          });
        }
        return response;
      })
      .catch(() => {
        // Ha offline vagyunk, megnézzük van-e a cache-ben
        return caches.match(event.request)
          .then(cached => {
            if (cached) {
              return cached;
            }
            
            // Ha nincs a cache-ben, 404-et adunk vissza
            return new Response('Resource not available offline', { 
              status: 404, 
              headers: new Headers({ 'Content-Type': 'text/plain' }) 
            });
          });
      })
  );
});

// OPCIONÁLIS: Előre betöltjük a fontosabb oldalakat amikor van hálózat
self.addEventListener('push', event => {
  if (event.data) {
    // Push üzenet esetén betöltjük az oldalakat
    caches.open(CACHE_NAME).then(cache => {
      // Előre betöltjük a kezdőoldalakat
      const pagesToPreload = PAGE_ASSETS.slice(0, 21); // Első 20 oldal + borító
      
      pagesToPreload.forEach(url => {
        fetch(url)
          .then(response => {
            if (response.ok) {
              cache.put(url, response);
            }
          })
          .catch(() => {/* Csendes hiba */});
      });
    });
  }
});

// OPCIONÁLIS: Amikor a felhasználó újra online lesz, frissítünk bizonyos erőforrásokat
self.addEventListener('sync', event => {
  if (event.tag === 'update-cache') {
    event.waitUntil(
      caches.open(CACHE_NAME).then(cache => {
        // Frissítjük a kritikus erőforrásokat
        CRITICAL_ASSETS.forEach(url => {
          fetch(url)
            .then(response => {
              if (response.ok) {
                cache.put(url, response);
              }
            })
            .catch(() => {/* Csendes hiba */});
        });
      })
    );
  }
});