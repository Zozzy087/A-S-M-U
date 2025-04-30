// Firebase konfiguráció - Mobilbarát verzió
// Automatikus újrapróbálkozási logikával

// Konzolon jelezzük a betöltés kezdetét
console.log("Firebase konfigurációs fájl betöltése megkezdődött");

// Firebase konfiguráció
const firebaseConfig = {
  apiKey: "AIzaSyDxsN0vk0dAoDu7GYn2Bl8WoKDejy6q1vA",
  authDomain: "a-s-m-u.firebaseapp.com",
  projectId: "a-s-m-u",
  storageBucket: "a-s-m-u.firebasestorage.app",
  messagingSenderId: "317821756996",
  appId: "1:317821756996:web:61d1b94b291080592abe11",
  measurementId: "G-ENT3XNTKTE"
};

// Firebase inicializálási logika hibakezeléssel
function initializeFirebase() {
  try {
    // Ellenőrizzük, hogy a firebase könyvtár betöltődött-e
    if (typeof firebase === 'undefined') {
      console.error("Firebase SDK nem elérhető. Kérjük, frissítse az oldalt.");
      
      // Megjelenítünk egy hibaüzenetet a console-on túl
      if (document.querySelector('.loader-text')) {
        document.querySelector('.loader-text').textContent = "Hiba: Firebase nem érhető el";
      }
      
      // Újrapróbálkozás 3 másodperc múlva
      setTimeout(initializeFirebase, 3000);
      return;
    }
    
    // Ellenőrizzük, hogy az app már inicializálva van-e
    try {
      const app = firebase.app();
      console.log("Firebase app már inicializálva van:", app.name);
      
      // Ellenőrizzük, hogy a window.firebaseApp objektum létezik-e
      if (!window.firebaseApp) {
        console.log("A window.firebaseApp objektum létrehozása már létező app alapján");
        
        // Szolgáltatások inicializálása
        window.firebaseApp = {
          auth: firebase.auth(),
          db: firebase.firestore()
        };
        
        // Firestore optimalizálások mobilra
        try {
          const db = window.firebaseApp.db;
          
          // Nagyobb cache méret
          db.settings({
            cacheSizeBytes: firebase.firestore.CACHE_SIZE_UNLIMITED
          });
          
          // Perzisztencia engedélyezése (jobb mobilos működés)
          db.enablePersistence({
            synchronizeTabs: true
          }).catch(err => {
            if (err.code === 'failed-precondition') {
              console.warn('Több böngészőfül nyitva van, a perzisztencia nem engedélyezhető');
            } else if (err.code === 'unimplemented') {
              console.warn('A böngésző nem támogatja a perzisztencia funkciót');
            } else {
              console.error('Perzisztencia hiba:', err);
            }
          });
        } catch (settingsError) {
          console.warn('Firestore beállítások hiba:', settingsError);
        }
      }
    } catch (appError) {
      // Ha nincs még inicializálva, inicializáljuk
      console.log("Firebase app inicializálása...");
      
      // Hibakezeléssel inicializáljuk
      try {
        firebase.initializeApp(firebaseConfig);
        console.log("Firebase inicializálása sikeres");
        
        // Szolgáltatások
        const auth = firebase.auth();
        const db = firebase.firestore();
        
        // Beállítjuk a globális firebaseApp objektumot
        window.firebaseApp = {
          auth: auth,
          db: db
        };
        
        // Firestore optimalizálások mobilra
        try {
          // Nagyobb cache méret
          db.settings({
            cacheSizeBytes: firebase.firestore.CACHE_SIZE_UNLIMITED
          });
          
          // Perzisztencia engedélyezése (jobb mobilos működés)
          db.enablePersistence({
            synchronizeTabs: true
          }).catch(err => {
            if (err.code === 'failed-precondition') {
              console.warn('Több böngészőfül nyitva van, a perzisztencia nem engedélyezhető');
            } else if (err.code === 'unimplemented') {
              console.warn('A böngésző nem támogatja a perzisztencia funkciót');
            } else {
              console.error('Perzisztencia hiba:', err);
            }
          });
        } catch (settingsError) {
          console.warn('Firestore beállítások hiba:', settingsError);
        }
        
        console.log("Minden Firebase szolgáltatás inicializálva és globálisan elérhető");
      } catch (initError) {
        console.error("Firebase inicializálási hiba:", initError);
        
        // Állítsuk be a betöltési üzenetet
        if (document.querySelector('.loader-text')) {
          document.querySelector('.loader-text').textContent = 
            "Hiba a szerverkapcsolat létrehozásakor. Újrapróbálkozás...";
        }
        
        // Újrapróbálkozás 2 másodperc múlva
        setTimeout(initializeFirebase, 2000);
      }
    }
  } catch (error) {
    console.error("Váratlan hiba a Firebase inicializálásakor:", error);
    
    // Újrapróbálkozás 3 másodperc múlva
    setTimeout(initializeFirebase, 3000);
  }
}

// Azonnal elindítjuk az inicializálást
initializeFirebase();