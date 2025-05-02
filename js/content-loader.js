/**
 * Tartalom betöltő szolgáltatás (MÓDOSÍTOTT Verzió - SPA/JS Adat + Licenc)
 * Ez a szolgáltatás felelős a könyv oldalainak biztonságos betöltéséért
 * a window.bookPageData objektumból, ellenőrzi a hozzáférést,
 * és beilleszti a licenc azonosítót. Az eredeti fájl struktúráját követi.
 */
class ContentLoader {
  constructor() {
    this.pages = {}; // Gyorsítótár a már RENDERELT oldalakhoz (opcionális)
    this.renderCallback = null;
    this.isInitialized = false; // Most azt jelzi, hogy az auth servicek és a pageData kész-e
    this.db = null; // Az eredeti kódban volt, itt hagyjuk, bár nem használjuk a betöltéshez
    this.LAST_CODE_KEY = 'lastActivatedCode'; // Kulcs a kód kiolvasásához

    // Függőségekre várakozás (auth service + bookPageData)
    this._waitForDependencies();
  }

  // Az eredeti Firebase init logika itt marad, bár a DB-t nem használjuk aktívan a betöltéshez
  _initWhenFirebaseReady() {
    if (window.firebaseApp && window.firebaseApp.db) {
      this._initWithFirebase();
    } else {
      console.log('[ContentLoader] Várakozás a Firebase inicializálására (Auth-hoz kellhet)...');
      setTimeout(() => this._initWhenFirebaseReady(), 500);
    }
  }

  _initWithFirebase() {
    try {
      this.db = window.firebaseApp.db; // Beállítjuk, ahogy az eredetiben volt
      console.log('[ContentLoader] Firebase DB kapcsolat inicializálva (de nem feltétlen használjuk tartalomhoz).');
      // Az isInitialized flag beállítása a _waitForDependencies-ben történik
    } catch (error) {
      console.error('[ContentLoader] Hiba a Firebase inicializálásakor:', error);
    }
  }

  // Új várakozó függvény
   _waitForDependencies() {
    if (window.authTokenService && window.authService && typeof window.bookPageData !== 'undefined') {
        this.isInitialized = true;
        console.log('[ContentLoader] Függőségek (AuthTokenService, AuthService, bookPageData) elérhetőek.');
         console.log(`[ContentLoader] Oldal adat (bookPageData) sikeresen betöltve, ${Object.keys(window.bookPageData).length} oldal található.`);
        this._initWhenFirebaseReady(); // Firebase kapcsolatot is megpróbáljuk inicializálni
    } else {
      if (typeof window.bookPageData === 'undefined') {
          console.log('[ContentLoader] Várakozás a bookPageData betöltődésére...');
      } else {
          console.log('[ContentLoader] Várakozás az Auth szolgáltatásokra...');
      }
      setTimeout(() => this._waitForDependencies(), 300);
    }
  }


  setup(renderCallback) {
    this.renderCallback = renderCallback;
    console.log('[ContentLoader] Beállítva renderCallback-kel');
  }

  /**
   * Tartalom betöltése a window.bookPageData objektumból - ÚJ VERZIÓ
   * @param {string} pageId - Az oldal azonosítója (pl. "1", "2", "borito")
   * @returns {Promise<boolean>} - Sikeres volt-e a betöltés
   */
  async loadContent(pageId) {
    console.log(`[ContentLoader] Tartalom betöltése megkezdve: ${pageId}`);
    pageId = String(pageId); // Biztosítjuk, hogy string

    if (!this.isInitialized) {
      console.error(`[ContentLoader] Szolgáltatás nincs inicializálva. Betöltés megszakítva: ${pageId}`);
      if (this.renderCallback) this._renderGenericErrorPage(pageId, "Alkalmazás inicializálási hiba.");
      return false;
    }
    if (typeof window.bookPageData === 'undefined') {
      console.error(`[ContentLoader] Oldal adat (bookPageData) nem elérhető. Betöltés megszakítva: ${pageId}`);
      if (this.renderCallback) this._renderGenericErrorPage(pageId, "Könyv adatfájl nem tölthető be.");
      return false;
    }

    const pageNum = parseInt(pageId, 10);
    const INGYENES_OLDAL_LIMIT = 2; // <<--- !!! Állítsd be a helyes limitet !!!
    const isFreePage = pageId === 'borito' || (!isNaN(pageNum) && pageNum <= INGYENES_OLDAL_LIMIT);

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

    // Gyorsítótár ellenőrzés (opcionális) - MOST KIKOMMENTEZVE, hogy mindig frissen illessze be az ID-t
    // if (this.pages[pageId]) {
    //   console.log(`[ContentLoader] Oldal betöltése cache-ből (már renderelt): ${pageId}`);
    //   this._renderContent(pageId, this.pages[pageId]);
    //   return true;
    // }

    try {
      // Tartalom kikeresése a globális objektumból
      const htmlContent = window.bookPageData[pageId];

      if (typeof htmlContent === 'string') {
        console.log(`[ContentLoader] Oldal (${pageId}) tartalom sikeresen kikeresve a bookPageData-ból.`);

        // ---- Licenc ID beillesztése ----
        let finalHtmlContent = htmlContent;
        try {
          const activationCode = localStorage.getItem(this.LAST_CODE_KEY);
          if (activationCode) { // Csak akkor illesztjük be, ha van mentett kód
              let licenseInfo = `Licenc: ${activationCode}`;
              const closingBodyTag = /<\/body>/i;
              if (closingBodyTag.test(finalHtmlContent)) {
                 const footerDiv = `<div style="position:fixed; bottom:2px; left:5px; font-size:7px; color:grey; opacity:0.4; z-index: 1; pointer-events:none; background: rgba(0,0,0,0.1); padding: 1px 3px; border-radius: 2px;">${licenseInfo}</div>`;
                 finalHtmlContent = finalHtmlContent.replace(closingBodyTag, `${footerDiv}\n</body>`);
              } else {
                 finalHtmlContent += `<span style="font-size:7px; color:grey; opacity:0.4;">${licenseInfo}</span>`;
              }
          } else {
               console.log(`[ContentLoader] Nincs mentett aktivációs kód a licenc infóhoz (${pageId}).`);
          }
        } catch (licenseError) {
          console.error(`[ContentLoader] Hiba a licenc információ beillesztésekor (${pageId}):`, licenseError);
        }
        // ---- VÉGE: Licenc ID beillesztése ----

        // Opcionális: Renderelt tartalom gyorsítótárazása
        // this.pages[pageId] = finalHtmlContent;

        this._renderContent(pageId, finalHtmlContent);
        return true;

      } else {
        console.error(`[ContentLoader] Oldal tartalom nem található vagy nem string a bookPageData-ban a '${pageId}' ID alatt.`);
        this._renderGenericErrorPage(pageId, `A(z) ${pageId}. oldal tartalma nem található.`);
        return false;
      }
    } catch (error) {
      console.error(`[ContentLoader] Váratlan hiba az oldal betöltésekor (${pageId}):`, error);
      this._renderGenericErrorPage(pageId, 'Váratlan hiba történt a tartalom feldolgozása közben.');
      return false;
    }
  }

  // Az _loadFromFileAttempt és _loadFromFirebaseAttempt függvényeket most már nem használjuk
  // a tartalom betöltésére, ezért kommentbe tesszük/töröljük őket, ahogy az eredeti fájlodban volt.
  /**
   * Helyi fájlból való betöltési KÍSÉRLET (MÁR NEM HASZNÁLT)
   */
  async _loadFromFileAttempt(pageId) {
    console.warn("[ContentLoader] _loadFromFileAttempt MÁR NEM HASZNÁLATOS!");
    return null;
  }

  /**
   * Firebase-ből való betöltési KÍSÉRLET (MÁR NEM HASZNÁLT)
   */
  async _loadFromFirebaseAttempt(pageId) {
    console.warn("[ContentLoader] _loadFromFirebaseAttempt MÁR NEM HASZNÁLATOS!");
    return null;
  }


  // Jogosultság ellenőrző (_hasAccessToPage) - EREDETI LOGIKA MARADT
  async _hasAccessToPage(pageId) {
    if (pageId === 'borito') { return true; }
    const pageNum = parseInt(pageId, 10);
    const isEarlyPage = !isNaN(pageNum) && pageNum <= 2; // <<--- !!! Ellenőrizd a limitet !!!
    if (!window.authTokenService) {
      console.error('[ContentLoader] KRITIKUS HIBA: Az AuthTokenService nem elérhető! Hozzáférés megtagadva.');
      return isEarlyPage;
    }
    try {
      const token = window.authTokenService.getAccessToken();
      if (token) { return true; }
      else {
        console.warn(`[ContentLoader] Nincs érvényes token az oldal megtekintéséhez: ${pageId}`);
        if (isEarlyPage) {
             console.log(`[ContentLoader] Demó oldal (${pageId}), hozzáférés engedélyezve token nélkül.`);
             return true;
        } else {
            console.warn(`[ContentLoader] Védett oldal (${pageId}), hozzáférés megtagadva token hiányában.`);
            return false;
        }
      }
    } catch (error) {
      console.error('[ContentLoader] Hiba a token ellenőrzésekor:', error);
      return false;
    }
  }

  // Tartalom megjelenítése (_renderContent) - EREDETI LOGIKA MARADT
  _renderContent(pageId, content) {
    if (this.renderCallback) {
      try {
        // Biztosítjuk, hogy a tartalom string legyen
        const contentToRender = typeof content === 'string' ? content : '';
         if (typeof content !== 'string') {
             console.warn(`[ContentLoader] Renderelésre kapott tartalom nem string (${pageId}), üres stringként kezelve.`);
         }
        this.renderCallback(pageId, contentToRender);
      } catch (renderError) {
          console.error(`[ContentLoader] Hiba a renderCallback végrehajtása közben (${pageId}):`, renderError);
          this._renderGenericErrorPage(pageId, 'Hiba történt az oldal megjelenítése közben.');
      }
    } else {
      console.error('[ContentLoader] Nincs beállítva renderCallback függvény!');
    }
  }

  // Hibaoldalak (_renderErrorPage, _renderGenericErrorPage) - EREDETI LOGIKA MARADT
  _renderErrorPage(pageId) {
    console.log(`[ContentLoader] Jogosultsági hibaoldal megjelenítése: ${pageId}`);
    const errorContent = `<!DOCTYPE html><html lang="hu"><head><meta charset="utf-8"><title>Hozzáférés Megtagadva</title><meta name="viewport" content="width=device-width, initial-scale=1.0"><link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;700&display=swap" rel="stylesheet"><style>body{font-family:'Roboto',sans-serif;text-align:center;padding:40px;background-color:#1a1a1a;color:#e0e0e0;margin:0;display:flex;justify-content:center;align-items:center;min-height:100vh;box-sizing:border-box;}.error-container{max-width:500px;margin:0 auto;background-color:#2c2c2c;padding:30px;border-radius:10px;box-shadow:0 0 15px rgba(0,0,0,0.5);}h1{color:#ff6b6b;margin-bottom:15px;font-size:24px;}p{margin-bottom:20px;font-size:16px;line-height:1.6;}ul{text-align:left;display:inline-block;margin-bottom:20px;padding-left:20px;}li{margin-bottom:8px;}</style></head><body><div class="error-container"><h1>Hozzáférés Megtagadva</h1><p>Sajnáljuk, de ehhez a tartalomhoz nincs érvényes hozzáférésed. Lehetséges okok:</p><ul><li>Nem aktiváltad még a könyvet a megvásárolt kóddal ezen az eszközön.</li><li>Az aktivációs munkameneted lejárt (általában 30 perc után).</li><li>Sikeres aktiválás után nem sikerült lekérni a hozzáférési kulcsot a szervertől.</li><li>Internetkapcsolati hiba az ellenőrzés során.</li></ul><p>Kérjük, próbáld meg újra aktiválni a könyvet a főoldalon (ha van rá lehetőség), vagy ellenőrizd az internetkapcsolatodat.</p></div></body></html>`;
    this._renderContent(pageId, errorContent);
  }

  _renderGenericErrorPage(pageId, message = 'Ismeretlen hiba történt.') {
     console.log(`[ContentLoader] Általános hibaoldal megjelenítése: ${pageId}`);
     const errorContent = `<!DOCTYPE html><html lang="hu"><head><meta charset="utf-8"><title>Hiba</title><meta name="viewport" content="width=device-width, initial-scale=1.0"><link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;700&display=swap" rel="stylesheet"><style>body{font-family:'Roboto',sans-serif;text-align:center;padding:40px;background-color:#1a1a1a;color:#e0e0e0;margin:0;display:flex;justify-content:center;align-items:center;min-height:100vh;box-sizing:border-box;}.error-container{max-width:500px;margin:0 auto;background-color:#2c2c2c;padding:30px;border-radius:10px;box-shadow:0 0 15px rgba(0,0,0,0.5);}h1{color:#ffcc00;margin-bottom:15px;font-size:24px;}p{margin-bottom:20px;font-size:16px;line-height:1.6;}.message{font-style:italic;color:#aaaaaa;margin-bottom:25px;}</style></head><body><div class="error-container"><h1>Hoppá, Hiba Történt!</h1><p>Sajnáljuk, de a kért tartalom betöltése közben hiba lépett fel.</p><p class="message">${message}</p><p>Kérjük, próbáld meg később újra betölteni az oldalt, vagy lépj vissza.</p></div></body></html>`;
     this._renderContent(pageId, errorContent);
   }

} // <-- ContentLoader osztály vége

// Globális példány létrehozása (marad ugyanaz)
if (window.firebaseApp) {
    window.contentLoader = new ContentLoader();
} else {
    console.warn("[ContentLoader] Várakozás a window.firebaseApp elérhetőségére...");
    const checkLoaderInterval = setInterval(() => {
        // Most már várjuk az auth service-eket is, mielőtt példányosítunk
        if (window.firebaseApp && window.authService && window.authTokenService) {
             clearInterval(checkLoaderInterval);
             window.contentLoader = new ContentLoader(); // Most már biztonságosabb példányosítani
             console.log("[ContentLoader] Globális példány létrehozva késleltetéssel.");
        }
    }, 100);
    setTimeout(() => {
        if (!window.contentLoader) {
            clearInterval(checkLoaderInterval);
            console.error("[ContentLoader] Időtúllépés: Függőségek (FirebaseApp, AuthServices) nem lett elérhető!");
        }
    }, 8000);
}