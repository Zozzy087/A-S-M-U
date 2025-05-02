// ► Service Worker - SPA / JS Adat Verzió (pl. v20)
// Gyorsítótárazza az alkalmazás héjat és a pages-data.js-t.

// ÚJ VERZIÓSZÁM!
const CACHE_NAME = 'kalandkonyv-cache-v20'; // <-- NÖVELT VERZIÓSZÁM

// Fontos statikus fájlok + AZ ÚJ ADATFÁJL
const CRITICAL_ASSETS = [
  '/',                  // start_url
  'index.html',         // főindex
  'offline.html',       // offline fallback oldal
  'manifest.json',      // PWA manifest
  'common-styles.css',  // közös CSS
  'js/firebase-config.js',
  'js/auth-service.js',
  'js/activation-ui.js',
  'js/auth-token-service.js', // Ez is kritikus lehet
  'js/content-loader.js',   // Ez is kritikus
  'js/pages-data.js',       // ===> ÚJ: Az oldalakat tartalmazó adatfájl <===
  'flipbook-engine.js',     // A motort is gyorsítótárazzuk
  'files/icon-192.png',
  'files/icon-512.png',
  'images/homokora_loader.gif' // A betöltő GIF is kell offline
];

// Másodlagos fontosságú statikus fájlok (pl. hangok)
const SECONDARY_ASSETS = [
  'sounds/pageturn-102978.mp3'
  // Ide jöhetnek a kocka képek is, ha nem túl sok
  // 'images/d1.png', 'images/d2.png', ...
];

// Külső függőségek (Firebase JS SDK, Google Fonts)
const EXTERNAL_DEPENDENCIES = [
  'https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700&display=swap',
  'https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap',
  'https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/9.22.0/firebase-auth-compat.js',
  'https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore-compat.js',
  'https://www.gstatic.com/firebasejs/9.22.0/firebase-functions-compat.js' // Functions SDK is kellhet
  // Figyelem: A fonts.gstatic.com fájlokat a fetch handler külön kezeli
];

// Képek, amelyeket esetleg külön akarunk kezelni (ha sok van)
const IMAGE_ASSETS = [
  'images/d1.png','images/d2.png','images/d3.png',
  'images/d4.png','images/d5.png','images/d6.png'
  // Ide veheted fel a többi fontos képet is, ha szükséges
];

// --- TELEPÍTÉS ---
self.addEventListener('install', event => {
  console.log('[Service Worker] Telepítés v20...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[Service Worker] Kritikus erőforrások gyorsítótárazása...');
        // Kritikus + Képek gyorsítótárazása telepítéskor
        const assetsToCache = [...CRITICAL_ASSETS, ...IMAGE_ASSETS];
        const cachePromises = assetsToCache.map(url => {
          // A külső Firebase scriptekhez adjunk egy cache:"reload" flag-et? Vagy hagyjuk?
          // Legyen egyszerűbb: próbáljuk cache-elni őket is.
          return cache.add(url).catch(error => {
            console.warn(`[Service Worker] Nem sikerült gyorsítótárazni (install): ${url}`, error);
            // Ha egy kritikus asset (pl. pages-data.js) nem cache-elhető, az nagy baj lehet offline!
            if (CRITICAL_ASSETS.includes(url)) {
                 console.error(`[Service Worker] KRITIKUS ASSET (${url}) gyorsítótárazása sikertelen! Offline működés veszélyben lehet.`);
                 // Dönthetünk úgy, hogy megállítjuk a telepítést? Vagy csak figyelmeztetünk?
                 // return Promise.reject(`Failed to cache critical asset: ${url}`);
            }
            return Promise.resolve(); // Folytatjuk a többi fájllal
          });
        });
        return Promise.all(cachePromises);
      })
      .then(() => {
        console.log('[Service Worker] Kritikus erőforrások és képek gyorsítótárazása sikeres.');
        return self.skipWaiting(); // Azonnal aktiváljuk az új SW-t (lehet, hogy frissítés kell a kliens oldalon)
      })
      .catch(err => {
        console.error('[Service Worker] Telepítési hiba:', err);
        // Sikertelen telepítés esetén nem aktiválódik az új SW
      })
  );
});

// --- AKTIVÁLÁS ---
self.addEventListener('activate', event => {
  console.log('[Service Worker] Aktiválás v20...');
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k !== CACHE_NAME) // Csak a NEM ehhez a verzióhoz tartozó cache-eket töröljük
          .map(k => {
            console.log('[Service Worker] Régi gyorsítótár törlése:', k);
            return caches.delete(k);
          })
      )
    )
    .then(() => {
      console.log('[Service Worker] Régi gyorsítótárak törlése kész.');
      // Másodlagos assetek gyorsítótárazása a háttérben
      setTimeout(() => {
          caches.open(CACHE_NAME).then(cache => {
              console.log('[Service Worker] Másodlagos erőforrások (pl. hang) gyorsítótárazása...');
              SECONDARY_ASSETS.forEach(url => {
                  cache.add(url).catch(err => console.warn(`[SW Activate] Hiba másodlagos asset cache-elésnél (${url}):`, err));
              });
              // Külső függőségeket nem itt cache-elünk, hanem a fetch során vagy installkor
          });
      }, 1000);
      return self.clients.claim(); // Az új SW azonnal átveszi az irányítást az aktív kliensek felett
    })
    .catch(err => {
        console.error('[Service Worker] Hiba az aktiválás vagy régi cache törlése közben:', err);
    })
  );
});

// --- KÉRÉSEK KEZELÉSE (FETCH) ---
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // 1. Firebase API hívásokat NE cache-eljük, menjenek a hálózatra
  if (url.hostname.includes('firestore.googleapis.com') ||
      url.hostname.includes('identitytoolkit.googleapis.com') || // Auth hívások
      url.hostname.includes('google.com/recaptcha') || // ReCaptcha, ha használod
      url.hostname.includes('firebasestorage.googleapis.com') || // Ha használnál Storage-ot
      url.hostname.includes('firebaseio.com') || // Realtime DB, ha használnád
      (url.hostname.includes('cloudfunctions') && url.pathname.includes('generateSecureToken')) // A token generáló function
      ) {
    // console.log('[SW Fetch] Firebase/API kérés átengedve:', event.request.url);
    return; // Hagyjuk, hogy a böngésző kezelje
  }

  // 2. Google Fonts kérések (CSS és font fájlok) - Cache first, majd network
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    event.respondWith(
      caches.match(event.request).then(cachedResponse => {
        if (cachedResponse) {
          // console.log('[SW Fetch] Google Font cache-ből:', event.request.url);
          return cachedResponse;
        }
        // console.log('[SW Fetch] Google Font hálózatról:', event.request.url);
        return fetch(event.request).then(networkResponse => {
          // Itt nem 'no-cors' módban kérjük, mert szükségünk van a válaszra a cache-eléshez
          if (networkResponse.ok) {
             const responseToCache = networkResponse.clone();
             caches.open(CACHE_NAME).then(cache => {
               cache.put(event.request, responseToCache);
             });
          }
          return networkResponse;
        }).catch(error => {
            console.warn('[SW Fetch] Google Font hálózati hiba:', event.request.url, error);
            // Hiba esetén nincs mit visszaadni (esetleg egy alap fontot lehetne?)
            return new Response('Google Fonts not available', { status: 503 });
        });
      })
    );
    return;
  }

  // 3. Navigációs kérések (a fő index.html-re vagy a gyökérre) - Hálózat először, majd cache, offline fallback
  // Ez biztosítja, hogy a felhasználó mindig a legfrissebb alkalmazás héjat kapja, ha online van.
  if (event.request.mode === 'navigate' || url.pathname === '/' || url.pathname.endsWith('/index.html')) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // Ha sikeres, gyorsítótárazzuk a legfrissebbet
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
          }
          return response;
        })
        .catch(() => {
          // Ha a hálózat nem elérhető, próbáljuk a cache-ből
          return caches.match(event.request).then(cachedResponse => {
            if (cachedResponse) {
              return cachedResponse;
            }
            // Ha a cache-ben sincs, adjuk vissza az offline.html-t
            return caches.match('offline.html');
          });
        })
    );
    return;
  }

  // 4. Minden egyéb kérés (JS, CSS, Képek, Hangok, pages-data.js, manifest.json stb.) - Cache first, majd network
  // Ez gyors betöltést biztosít offline és online is, ha már van cache-elt verzió.
  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      if (cachedResponse) {
        // console.log('[SW Fetch] Cache-ből:', event.request.url);
        // Opcionális: Háttérben frissíthetjük a cache-t (stale-while-revalidate)
        // fetch(event.request).then(networkResponse => {
        //   if (networkResponse.ok) {
        //      caches.open(CACHE_NAME).then(cache => cache.put(event.request, networkResponse));
        //   }
        // }).catch(() => {}); // Csendes hiba, ha a háttérfrissítés nem sikerül
        return cachedResponse;
      }

      // Ha nincs a cache-ben, kérjük a hálózatról
      // console.log('[SW Fetch] Hálózatról:', event.request.url);
      return fetch(event.request).then(networkResponse => {
        // Ha sikeres a válasz, tegyük be a cache-be
        if (networkResponse.ok) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseToCache);
          });
        } else {
             // Ha a hálózati válasz hiba (pl. 404), azt is logolhatjuk
             console.warn(`[SW Fetch] Hálózati hiba (${networkResponse.status}) a fájl lekérésekor: ${event.request.url}`);
        }
        return networkResponse;
      }).catch(error => {
          console.warn(`[SW Fetch] Hálózati hiba történt: ${event.request.url}`, error);
          // Ha a kérés képre vonatkozott, esetleg visszaadhatnánk egy placeholder képet
          // if (event.request.destination === 'image') return caches.match('/images/placeholder.png');
          // Egyéb esetben nincs fallback, hibát adunk vissza
           return new Response(`Network error fetching ${event.request.url}`, { status: 503 }); // Service Unavailable
      });
    })
  );
});


// ----- Régi opcionális Sync és Push eventek (maradhatnak, ha használod őket) -----
self.addEventListener('push', event => { /* ... */ });
self.addEventListener('sync', event => { /* ... */ });