/**
 * Tartalom betöltő szolgáltatás (MÓDOSÍTOTT Verzió a pages-data.js támogatással)
 * Ez a szolgáltatás felelős a könyv oldalainak biztonságos betöltéséért,
 * ellenőrizve a hozzáférési jogosultságot minden egyes oldal betöltése előtt.
 */
class ContentLoader {
  constructor() {
    this.pages = {}; // Gyorsítótár a betöltött oldalakhoz
    this.renderCallback = null; // Visszahívás függvény az oldalak megjelenítéséhez
    this.isInitialized = false; // Jelzi, hogy a Firebase DB kapcsolat létrejött-e
    this.bookDataLoaded = false; // Jelzi, hogy a könyv adatok betöltve vannak-e

    // Inicializálást késleltetjük, amíg a Firebase betöltődik
    this._initWhenFirebaseReady();
    
    // Könyv adatok betöltése
    this._loadBookData();
    
    // Hash változás figyelése
    window.addEventListener('hashchange', this._handleHashChange.bind(this));
    // Kezdeti hash ellenőrzése
    this._checkInitialHash();
  }

  /**
   * Inicializálás, amikor a Firebase elérhető
   */
  _initWhenFirebaseReady() {
    // Ellenőrizzük, hogy a window.firebaseApp már létezik-e
    if (window.firebaseApp && window.firebaseApp.db) { // Csak a db kell neki
      this._initWithFirebase();
    } else {
      // Ha még nem, várunk egy rövid ideig és újra próbáljuk
      console.log('[ContentLoader] Várakozás a Firebase inicializálására...');
      setTimeout(() => this._initWhenFirebaseReady(), 500);
    }
  }

  /**
   * Inicializálás a Firebase-szel
   */
  _initWithFirebase() {
    try {
      this.db = window.firebaseApp.db;
      // Figyelem: A this.auth itt nem szükséges, kivéve ha a jövőben kellene
      this.isInitialized = true;
      console.log('[ContentLoader] Inicializálva Firebase DB-vel');
    } catch (error) {
      console.error('[ContentLoader] Hiba a Firebase inicializálásakor:', error);
    }
  }

  /**
   * Beállítás
   * @param {Function} renderCallback - Függvény, ami megjeleníti az oldalakat
   */
  setup(renderCallback) {
    this.renderCallback = renderCallback;
    console.log('[ContentLoader] Beállítva renderCallback-kel');
  }

  /**
   * Pages-data.js betöltése
   * @private
   */
  _loadBookData() {
    // Ellenőrizzük, hogy a bookPageData már létezik-e
    if (typeof window.bookPageData !== 'undefined') {
      console.log('[ContentLoader] bookPageData már elérhető, betöltés kihagyva.');
      this.bookDataLoaded = true;
      return;
    }
    
    console.log('[ContentLoader] pages-data.js betöltése...');
    const script = document.createElement('script');
    script.src = 'js/pages-data.js';
    script.onload = () => {
      console.log('[ContentLoader] pages-data.js betöltése sikeres.');
      this.bookDataLoaded = true;
    };
    script.onerror = (error) => {
      console.error('[ContentLoader] pages-data.js betöltése sikertelen:', error);
      this.bookDataLoaded = false;
    };
    document.head.appendChild(script);
  }

  /**
   * Tartalom betöltése - MÓDOSÍTOTT a pages-data.js használatához
   * @param {string} pageId - Az oldal azonosítója (pl. "1", "2", "borito")
   * @returns {Promise<boolean>} - Sikeres volt-e a betöltés
   */
  async loadContent(pageId) {
    console.log(`[ContentLoader] Tartalom betöltése megkezdve: ${pageId}`);

    // Ingyenes/védett oldalak meghatározása
    const pageNum = parseInt(pageId, 10);
    const INGYENES_OLDAL_LIMIT = 2; // Itt állítsd be, hanyadik oldaltól kezdve VÉDETT a tartalom
    const isFreePage = pageId === 'borito' || (!isNaN(pageNum) && pageNum <= INGYENES_OLDAL_LIMIT);

    // Jogosultság ellenőrzése a védett oldalaknál
    if (!isFreePage) {
      const hasAccess = await this._hasAccessToPage(pageId);
      if (!hasAccess) {
        console.warn(`[ContentLoader] Nincs jogosultság a védett oldalhoz: ${pageId}. Hibaoldal megjelenítése.`);
        this._renderErrorPage(pageId);
        return false;
      }
      console.log(`[ContentLoader] Jogosultság rendben a védett oldalhoz: ${pageId}`);
    } else {
      console.log(`[ContentLoader] Ingyenes oldal (${pageId}) betöltése, jogosultság ellenőrzés nem szükséges.`);
    }

    // Ha már be van töltve a gyorsítótárban, onnan szolgáljuk ki
    if (this.pages[pageId]) {
      console.log(`[ContentLoader] Oldal betöltése cache-ből: ${pageId}`);
      this._renderContent(pageId, this.pages[pageId]);
      return true;
    }

    try {
      let content = null;

      // 1. Először a bookPageData-ból próbáljuk betölteni
      if (typeof window.bookPageData !== 'undefined' && window.bookPageData[pageId]) {
        console.log(`[ContentLoader] Oldal (${pageId}) betöltve a pages-data.js-ből.`);
        content = window.bookPageData[pageId];
      } 
      // 2. Ha nincs bookPageData vagy ebben az oldalban, visszatérünk a régi módszerekhez
      else {
        console.log(`[ContentLoader] bookPageData nem elérhető vagy nem tartalmazza az oldalt (${pageId}), alternatív betöltésre váltás...`);
        
        // Ingyenes oldalaknál megpróbálhatjuk a fájlból
        if (isFreePage) {
          content = await this._loadFromFileAttempt(pageId);
          if (!content && this.isInitialized) {
            content = await this._loadFromFirebaseAttempt(pageId);
          }
        } 
        // Védett oldalaknál csak Firebase-ből próbálkozunk
        else if (this.isInitialized) {
          content = await this._loadFromFirebaseAttempt(pageId);
        }
      }

      // Ha sikerült tartalmat betölteni
      if (content) {
        // Egyedi azonosító/vízjel hozzáadása a tartalomhoz
        content = this._addIdentifierToContent(content, pageId);
        
        // Gyorsítótárazás és megjelenítés
        this.pages[pageId] = content;
        this._renderContent(pageId, content);
        console.log(`[ContentLoader] Oldal (${pageId}) sikeresen betöltve és renderelve.`);
        
        // URL hash frissítése
        window.location.hash = '#' + pageId;
        
        return true;
      }

      // Ha nem sikerült tartalmat betölteni
      console.error(`[ContentLoader] Nem sikerült betölteni a tartalmat: ${pageId}`);
      this._renderGenericErrorPage(pageId, 'A kért tartalom nem található vagy nem elérhető.');
      return false;
    } catch (error) {
      console.error(`[ContentLoader] Váratlan hiba az oldal betöltésekor (${pageId}):`, error);
      this._renderGenericErrorPage(pageId, 'Váratlan hiba történt a tartalom betöltése közben.');
      return false;
    }
  }

  /**
   * Helyi fájlból való betöltési KÍSÉRLET (jogosultság már ellenőrizve)
   * @param {string} pageId - Az oldal azonosítója
   * @returns {Promise<string|null>} - A betöltött tartalom vagy null
   */
  async _loadFromFileAttempt(pageId) {
    try {
      const pagePath = pageId === 'borito' ? 'pages/borito.html' : `pages/${pageId}.html`;
      console.log(`[ContentLoader] Helyi fájl betöltési kísérlet: ${pagePath}`);

      const response = await fetch(pagePath);
      if (!response.ok) {
        // Ha a fájl nem található (404) vagy más hiba van, az nem feltétlenül végzetes hiba,
        // lehet, hogy csak Firebase-ből érhető el. Ezért csak figyelmeztetést logolunk.
        console.warn(`[ContentLoader] Helyi fájl nem található vagy hiba (${response.status}): ${pagePath}`);
        return null; // Jelzi, hogy nem sikerült innen betölteni
      }

      const content = await response.text();
      console.log(`[ContentLoader] Helyi fájl sikeresen betöltve: ${pagePath}`);
      return content;
    } catch (error) {
      // Hálózati vagy egyéb hiba esetén is csak figyelmeztetünk
      console.warn(`[ContentLoader] Hiba a helyi fájl betöltésekor (${pageId}):`, error);
      return null;
    }
  }

  /**
   * Firebase-ből való betöltési KÍSÉRLET (jogosultság már ellenőrizve)
   * @param {string} pageId - Az oldal azonosítója
   * @returns {Promise<string|null>} - A betöltött tartalom vagy null
   */
  async _loadFromFirebaseAttempt(pageId) {
    if (!this.isInitialized || !this.db) {
        console.warn("[ContentLoader] Firebase DB nem inicializált (loadFromFirebaseAttempt).");
        return null;
    }

    try {
      console.log(`[ContentLoader] Firebase-ből oldal lekérési kísérlet: pages/${pageId}`);
      const docRef = this.db.collection('pages').doc(pageId); // Feltételezzük, hogy van 'pages' kollekció
      const doc = await docRef.get();

      if (doc.exists) {
        const data = doc.data();
        // Feltételezzük, hogy a tartalom a 'content' mezőben van
        if (data && data.content) {
             console.log(`[ContentLoader] Firebase-ből oldal sikeresen betöltve: ${pageId}`);
             return data.content;
        } else {
            console.warn(`[ContentLoader] Oldal létezik Firebase-ben, de hiányzik a 'content' mező: ${pageId}`);
            return null;
        }
      } else {
        console.warn(`[ContentLoader] Az oldal nem található a Firebase 'pages' kollekcióban: ${pageId}`);
        return null;
      }
    } catch (error) {
      console.error(`[ContentLoader] Firebase betöltés hiba (${pageId}):`, error);
      return null;
    }
  }


  /**
   * Jogosultság ellenőrzése egy oldalhoz (MÓDOSÍTOTT Verzió)
   * Ez a funkció már a biztonságos, szerver oldali tokent használó
   * authTokenService-re támaszkodik.
   * @param {string} pageId - Az oldal azonosítója
   * @returns {Promise<boolean>} - Van-e jogosultság
   */
  async _hasAccessToPage(pageId) {
    // A borító mindig elérhető, nincs szükség ellenőrzésre
    if (pageId === 'borito') {
        // console.log("[ContentLoader] Borító - Hozzáférés engedélyezve (nincs ellenőrzés).");
        return true;
    }

    // Demo mód: Az első néhány oldal elérhető lehet token nélkül is
    // Ezt a részt igény szerint módosíthatod vagy kiveheted
    const pageNum = parseInt(pageId, 10);
    const isEarlyPage = !isNaN(pageNum) && pageNum <= 2; // Pl. csak az 1. és 2. oldalig engedünk ingyenes hozzáférést

    // Ellenőrizzük, hogy az authTokenService elérhető-e
    if (!window.authTokenService) {
      console.error('[ContentLoader] KRITIKUS HIBA: Az AuthTokenService nem elérhető! Hozzáférés megtagadva.');
      // Ebben az esetben csak a demó oldalakhoz engedünk hozzáférést
      return isEarlyPage;
    }

    try {
      // Token lekérése a szolgáltatástól (ez már nem async hívás!)
      // A getAccessToken() a memóriából vagy localStorage-ból olvassa a *már megszerzett* tokent.
      const token = window.authTokenService.getAccessToken();

      if (token) {
        // Van érvényes tokenünk a tárolóban.
        // Itt lehetne akár egy extra szerver oldali validálást is beépíteni,
        // ami ellenőrzi a token aláírását és nem csak a meglétét/lejáratát.
        // De egyelőre elfogadjuk, ha a token létezik és nem járt le (ezt az authTokenService ellenőrzi).
        // console.log(`[ContentLoader] Érvényes token található az oldalhoz: ${pageId}`);
        return true; // Van jogosultság
      } else {
        // Nincs érvényes token a tárolóban
        console.warn(`[ContentLoader] Nincs érvényes token az oldal megtekintéséhez: ${pageId}`);
        // Ha nincs token, csak a demó oldalakhoz adunk hozzáférést
        if (isEarlyPage) {
             console.log(`[ContentLoader] Demó oldal (${pageId}), hozzáférés engedélyezve token nélkül.`);
             return true;
        } else {
            console.warn(`[ContentLoader] Védett oldal (${pageId}), hozzáférés megtagadva token hiányában.`);
            return false; // Nincs jogosultság a védett tartalomhoz
        }
      }

    } catch (error) {
      // Hiba a token lekérése vagy ellenőrzése közben
      console.error('[ContentLoader] Hiba a token ellenőrzésekor:', error);
      return false; // Hiba esetén nincs hozzáférés
    }
  }

  /**
   * Egyedi azonosító/vízjel/lábléc hozzáadása a tartalomhoz
   * @param {string} content - Az oldal HTML tartalma
   * @param {string} pageId - Az oldal azonosítója
   * @returns {string} - A módosított HTML tartalom
   */
  _addIdentifierToContent(content, pageId) {
    try {
      // Próbáljuk megszerezni a felhasználó azonosítóját
      let userId = "ISMERETLEN";
      let activationCode = "NINCS";
      
      // 1. Firebase User ID lekérése
      if (window.firebaseApp && window.firebaseApp.auth && window.firebaseApp.auth.currentUser) {
        userId = window.firebaseApp.auth.currentUser.uid.substring(0, 8); // Csak az első 8 karakter
      }
      
      // 2. Aktivációs kód ellenőrzése a localStorage-ban
      // Ezt az értéket a markCodeAsUsed függvényben kellene elmenteni
      try {
        const storedCode = localStorage.getItem('activation_code');
        if (storedCode) {
          activationCode = storedCode;
        } else {
          // Ha nincs közvetlenül mentve, ellenőrizzük más helyeken is
          const authData = localStorage.getItem('kalandkonyv_auth');
          if (authData) {
            const parsedData = JSON.parse(authData);
            if (parsedData.activationCode) {
              activationCode = parsedData.activationCode;
            }
          }
        }
      } catch (e) {
        console.warn('[ContentLoader] Hiba az aktivációs kód kiolvasásakor:', e);
      }
      
      // Az aktuális dátum
      const currentDate = new Date().toLocaleDateString();
      
      // Lábléc HTML kód létrehozása
      const footerHtml = `
<div style="position: fixed; bottom: 5px; right: 10px; font-size: 8px; color: #999; opacity: 0.5; z-index: 9999; pointer-events: none; user-select: none;">
  © 2025 Zordán Erik - Licenc: ${activationCode} - ID: ${userId} - Oldal: ${pageId} - ${currentDate}
</div>`;
      
      // Lábléc beszúrása a HTML végére
      if (content.includes('</body>')) {
        return content.replace('</body>', `${footerHtml}</body>`);
      } else {
        return content + footerHtml;
      }
    } catch (error) {
      console.error('[ContentLoader] Hiba az azonosító hozzáadásakor:', error);
      return content; // Hiba esetén az eredeti tartalmat adjuk vissza
    }
  }

  /**
   * Tartalom megjelenítése a renderCallback segítségével
   * @param {string} pageId - Az oldal azonosítója
   * @param {string} content - A megjelenítendő tartalom
   */
  _renderContent(pageId, content) {
    if (this.renderCallback) {
      try {
        this.renderCallback(pageId, content);
        // console.log(`[ContentLoader] Tartalom sikeresen átadva renderelésre: ${pageId}`);
      } catch (renderError) {
          console.error(`[ContentLoader] Hiba a renderCallback végrehajtása közben (${pageId}):`, renderError);
          // Itt is megjeleníthetnénk egy általános hibaoldalt
          this._renderGenericErrorPage(pageId, 'Hiba történt az oldal megjelenítése közben.');
      }
    } else {
      console.error('[ContentLoader] Nincs beállítva renderCallback függvény!');
      // Callback nélkül nem tudjuk megjeleníteni
    }
  }

  /**
   * Jogosultsági Hibaoldal megjelenítése
   * Akkor hívódik, ha a _hasAccessToPage false-t ad vissza védett tartalomnál.
   * @param {string} pageId - Az oldal azonosítója
   */
  _renderErrorPage(pageId) {
    console.log(`[ContentLoader] Jogosultsági hibaoldal megjelenítése: ${pageId}`);
    const errorContent = `
    <!DOCTYPE html>
    <html lang="hu">
    <head>
      <meta charset="utf-8">
      <title>Hozzáférés Megtagadva</title>
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;700&display=swap" rel="stylesheet">
      <style>
        body { font-family: 'Roboto', sans-serif; text-align: center; padding: 40px; background-color: #1a1a1a; color: #e0e0e0; margin: 0; display: flex; justify-content: center; align-items: center; min-height: 100vh; box-sizing: border-box; }
        .error-container { max-width: 500px; margin: 0 auto; background-color: #2c2c2c; padding: 30px; border-radius: 10px; box-shadow: 0 0 15px rgba(0,0,0,0.5); }
        h1 { color: #ff6b6b; margin-bottom: 15px; font-size: 24px; }
        p { margin-bottom: 20px; font-size: 16px; line-height: 1.6; }
        ul { text-align: left; display: inline-block; margin-bottom: 20px; padding-left: 20px;}
        li { margin-bottom: 8px; }
        .button { display: inline-block; padding: 12px 25px; background-color: #7f00ff; color: white; text-decoration: none; border-radius: 5px; font-weight: bold; transition: background-color 0.3s; border: none; cursor: pointer; font-size: 16px; }
        .button:hover { background-color: #9b30ff; }
      </style>
    </head>
    <body>
      <div class="error-container">
        <h1>Hozzáférés Megtagadva</h1>
        <p>Sajnáljuk, de ehhez a tartalomhoz nincs érvényes hozzáférésed. Lehetséges okok:</p>
        <ul>
          <li>Nem aktiváltad még a könyvet a megvásárolt kóddal ezen az eszközön.</li>
          <li>Az aktivációs munkameneted lejárt (általában 30 perc után).</li>
          <li>Sikeres aktiválás után nem sikerült lekérni a hozzáférési kulcsot a szervertől.</li>
          <li>Internetkapcsolati hiba az ellenőrzés során.</li>
        </ul>
        <p>Kérjük, próbáld meg újra aktiválni a könyvet a főoldalon (ha van rá lehetőség), vagy ellenőrizd az internetkapcsolatodat.</p>
        </div>
    </body>
    </html>
    `;

    this._renderContent(pageId, errorContent);
  }

   /**
    * Általános Hibaoldal megjelenítése
    * Akkor hívódik, ha a tartalom betöltése sikertelen volt (de a jogosultság rendben volt).
    * @param {string} pageId - Az oldal azonosítója
    * @param {string} [message] - Opcionális üzenet a hiba okáról
    */
   _renderGenericErrorPage(pageId, message = 'Ismeretlen hiba történt.') {
     console.log(`[ContentLoader] Általános hibaoldal megjelenítése: ${pageId}`);
     const errorContent = `
     <!DOCTYPE html>
     <html lang="hu">
     <head>
       <meta charset="utf-8">
       <title>Hiba</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
       <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;700&display=swap" rel="stylesheet">
       <style>
         body { font-family: 'Roboto', sans-serif; text-align: center; padding: 40px; background-color: #1a1a1a; color: #e0e0e0; margin: 0; display: flex; justify-content: center; align-items: center; min-height: 100vh; box-sizing: border-box; }
         .error-container { max-width: 500px; margin: 0 auto; background-color: #2c2c2c; padding: 30px; border-radius: 10px; box-shadow: 0 0 15px rgba(0,0,0,0.5); }
         h1 { color: #ffcc00; margin-bottom: 15px; font-size: 24px; }
         p { margin-bottom: 20px; font-size: 16px; line-height: 1.6; }
         .message { font-style: italic; color: #aaaaaa; margin-bottom: 25px; }
         .button { display: inline-block; padding: 12px 25px; background-color: #7f00ff; color: white; text-decoration: none; border-radius: 5px; font-weight: bold; transition: background-color 0.3s; border: none; cursor: pointer; font-size: 16px; }
         .button:hover { background-color: #9b30ff; }
       </style>
     </head>
     <body>
       <div class="error-container">
         <h1>Hoppá, Hiba Történt!</h1>
         <p>Sajnáljuk, de a kért tartalom betöltése közben hiba lépett fel.</p>
         <p class="message">${message}</p>
         <p>Kérjük, próbáld meg később újra betölteni az oldalt, vagy lépj vissza.</p>
         </div>
     </body>
     </html>
     `;

     this._renderContent(pageId, errorContent);
   }

  /**
   * Kezdeti hash ellenőrzése betöltéskor
   */
  _checkInitialHash() {
    const hash = window.location.hash;
    if (hash && hash.length > 1) {
      const pageId = hash.substring(1); // A # utáni rész
      console.log(`[ContentLoader] Kezdeti hash észlelve: ${hash}, oldal betöltése: ${pageId}`);
      
      // Kis késleltetés, hogy a rendszer inicializálódjon
      setTimeout(() => {
        if (window.flipbookInstance) {
          window.flipbookInstance.loadPage(pageId);
        }
      }, 1500);
    }
  }

  /**
   * Hash változás kezelése
   */
  _handleHashChange() {
    const hash = window.location.hash;
    if (hash && hash.length > 1) {
      const pageId = hash.substring(1); // A # utáni rész
      console.log(`[ContentLoader] Hash változás észlelve: ${hash}, oldal betöltése: ${pageId}`);
      
      if (window.flipbookInstance) {
        window.flipbookInstance.loadPage(pageId);
      }
    }
  }

} // <-- ContentLoader osztály vége

// Globális példány létrehozása (biztosítva, hogy a config már létezik)
if (window.firebaseApp) {
    window.contentLoader = new ContentLoader();
} else {
    // Ha a firebase-config.js később töltődne be, ez a késleltetés segíthet
    console.warn("[ContentLoader] Várakozás a window.firebaseApp elérhetőségére...");
    const checkLoaderInterval = setInterval(() => {
        if (window.firebaseApp) {
            clearInterval(checkLoaderInterval);
            window.contentLoader = new ContentLoader();
            console.log("[ContentLoader] Globális példány létrehozva késleltetéssel.");
        }
    }, 100);
     // Időtúllépés hozzáadása, hogy ne várjon örökké
    setTimeout(() => {
        if (!window.contentLoader) {
            clearInterval(checkLoaderInterval);
            console.error("[ContentLoader] Időtúllépés: window.firebaseApp nem lett elérhető!");
        }
    }, 5000); // 5 másodperc várakozás
}