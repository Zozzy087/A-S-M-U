/**
 * Tartalom betöltő szolgáltatás (SPA / JS Adat Verzió + Licenc Kód Beillesztés)
 * Ez a szolgáltatás felelős a könyv oldalainak biztonságos betöltéséért
 * a window.bookPageData objektumból, ellenőrzi a hozzáférést,
 * és beilleszti a licenc azonosítót.
 */
class ContentLoader {
  constructor() {
    this.pages = {}; // Gyorsítótár a már RENDERELT oldalakhoz (opcionális)
    this.renderCallback = null;
    this.isInitialized = false; // Jelzi, hogy az alap PWA és az auth service kész-e
    this.LAST_CODE_KEY = 'lastActivatedCode'; // Kulcs a kód kiolvasásához

    this._waitForDependencies();
  }

  _waitForDependencies() {
    // Most már a bookPageData elérhetőségére is várunk
    if (window.authTokenService && window.authService && typeof window.bookPageData !== 'undefined') {
        this.isInitialized = true;
        console.log('[ContentLoader] Függőségek (AuthTokenService, AuthService, bookPageData) elérhetőek.');
         console.log(`[ContentLoader] Oldal adat (bookPageData) sikeresen betöltve, ${Object.keys(window.bookPageData).length} oldal található.`);
        this._initWhenFirebaseReady(); // Firebase kapcsolatot is megpróbáljuk inicializálni (Authhoz kellhet)
    } else {
      if (typeof window.bookPageData === 'undefined') {
          console.log('[ContentLoader] Várakozás a bookPageData betöltődésére...');
      } else {
          console.log('[ContentLoader] Várakozás az Auth szolgáltatásokra...');
      }
      setTimeout(() => this._waitForDependencies(), 300);
    }
  }

   // Az eredeti Firebase init logika itt marad, bár a DB-t nem használjuk aktívan a betöltéshez
   _initWhenFirebaseReady() { /* ... (Változatlan) ... */ if(window.firebaseApp&&window.firebaseApp.db){this._initWithFirebase();}else{console.log("[ContentLoader] Várakozás Firebase init-re...");setTimeout(()=>this._initWhenFirebaseReady(),500);} }
   _initWithFirebase() { /* ... (Változatlan) ... */ try{this.db=window.firebaseApp.db;console.log("[ContentLoader] Firebase DB init OK.");}catch(e){console.error('[ContentLoader] Firebase init hiba:',e);} }


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

    if (!this.isInitialized) { /* ... (Hibaellenőrzés változatlan) ... */ console.error(`[ContentLoader] Nincs inicializálva. Betöltés megszakítva: ${pageId}`); if(this.renderCallback)this._renderGenericErrorPage(pageId,"Init hiba."); return false; }
    if (typeof window.bookPageData === 'undefined') { /* ... (Hibaellenőrzés változatlan) ... */ console.error(`[ContentLoader] bookPageData nem elérhető. Betöltés megszakítva: ${pageId}`); if(this.renderCallback)this._renderGenericErrorPage(pageId,"Adatfájl hiba."); return false; }

    const pageNum = parseInt(pageId, 10);
    const INGYENES_OLDAL_LIMIT = 2; // <<--- !!! Állítsd be a helyes limitet !!!
    const isFreePage = pageId === 'borito' || (!isNaN(pageNum) && pageNum <= INGYENES_OLDAL_LIMIT);

    if (!isFreePage) { /* ... (Jogosultság ellenőrzés változatlan) ... */
        const hasAccess = await this._hasAccessToPage(pageId);
        if (!hasAccess) { console.warn(`[ContentLoader] Nincs jogosultság: ${pageId}.`); this._renderErrorPage(pageId); return false; }
        console.log(`[ContentLoader] Jogosultság OK: ${pageId}`);
    } else { console.log(`[ContentLoader] Ingyenes oldal: ${pageId}`); }

    try {
      // Tartalom kikeresése a globális objektumból
      const htmlContent = window.bookPageData[pageId];

      if (typeof htmlContent === 'string') {
        console.log(`[ContentLoader] Tartalom kikeresve innen: bookPageData[${pageId}]`);

        // ---- Licenc ID beillesztése ----
        let finalHtmlContent = htmlContent;
        try {
          const activationCode = localStorage.getItem(this.LAST_CODE_KEY);
          if (activationCode) {
              let licenseInfo = `Licenc: ${activationCode}`;
              const closingBodyTag = /<\/body>/i;
              if (closingBodyTag.test(finalHtmlContent)) {
                 const footerDiv = `<div style="position:fixed; bottom:2px; left:5px; font-size:7px; color:grey; opacity:0.4; z-index: 1; pointer-events:none; background: rgba(0,0,0,0.1); padding: 1px 3px; border-radius: 2px;">${licenseInfo}</div>`;
                 finalHtmlContent = finalHtmlContent.replace(closingBodyTag, `${footerDiv}\n</body>`);
              } else { finalHtmlContent += `<span style="font-size:7px; color:grey; opacity:0.4;">${licenseInfo}</span>`; }
          }
        } catch (licenseError) { console.error(`[ContentLoader] Licenc infó hiba (${pageId}):`, licenseError); }
        // ---- VÉGE: Licenc ID beillesztése ----

        this._renderContent(pageId, finalHtmlContent);
        return true;

      } else { /* ... (Hiba: oldal nem található) ... */ console.error(`[ContentLoader] Oldal ID nem található: '${pageId}'`); this._renderGenericErrorPage(pageId, `A(z) ${pageId}. oldal tartalma nem található.`); return false; }
    } catch (error) { /* ... (Váratlan hiba) ... */ console.error(`[ContentLoader] Váratlan hiba (${pageId}):`, error); this._renderGenericErrorPage(pageId, 'Hiba a tartalom feldolgozása közben.'); return false; }
  }

  // Jogosultság ellenőrző (_hasAccessToPage) - Eredeti logika változatlan
  async _hasAccessToPage(pageId) { /* ... (Változatlan az eredetihez képest) ... */
    if (pageId === 'borito') return true; const pageNum = parseInt(pageId, 10); const INGYENES_OLDAL_LIMIT = 2; const isEarlyPage = !isNaN(pageNum) && pageNum <= INGYENES_OLDAL_LIMIT; if(isEarlyPage) return true; if (!window.authTokenService) { console.error('[ContentLoader] KRITIKUS HIBA: AuthTokenService nem elérhető!'); return false; } try { const token = window.authTokenService.getAccessToken(); if(token){return true;} else { console.warn(`[ContentLoader] Nincs érvényes token: ${pageId}.`); return false; } } catch (error) { console.error('[ContentLoader] Hiba a token ellenőrzésekor:', error); return false; }
   }

  // Tartalom megjelenítése (_renderContent) - Eredeti logika változatlan
  _renderContent(pageId, content) { /* ... (Változatlan az eredetihez képest) ... */
    if (this.renderCallback) { try { const c = typeof content === 'string' ? content : ''; if(typeof content !== 'string') console.warn(`Tartalom nem string (${pageId})`); this.renderCallback(pageId, c); } catch (renderError) { console.error(`Render callback hiba (${pageId}):`, renderError); this._renderGenericErrorPage(pageId, 'Hiba az oldal megjelenítésekor.'); } } else { console.error('[ContentLoader] Nincs renderCallback!'); }
   }

  // Hibaoldalak (_renderErrorPage, _renderGenericErrorPage) - Eredeti logika változatlan
  _renderErrorPage(pageId) { /* ... (Változatlan az eredetihez képest) ... */
    console.log(`[ContentLoader] Jogosultsági hibaoldal: ${pageId}`); const ec = `<!DOCTYPE html><html lang="hu"><head><meta charset="utf-8"><title>Hozzáférés Megtagadva</title><meta name="viewport" content="width=device-width, initial-scale=1.0"><link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;700&display=swap" rel="stylesheet"><style>body{font-family:'Roboto',sans-serif;text-align:center;padding:40px;background-color:#1a1a1a;color:#e0e0e0;margin:0;display:flex;justify-content:center;align-items:center;min-height:100vh;box-sizing:border-box;}.error-container{max-width:500px;margin:0 auto;background-color:#2c2c2c;padding:30px;border-radius:10px;box-shadow:0 0 15px rgba(0,0,0,0.5);}h1{color:#ff6b6b;margin-bottom:15px;font-size:24px;}p{margin-bottom:20px;font-size:16px;line-height:1.6;}ul{text-align:left;display:inline-block;margin-bottom:20px;padding-left:20px;}li{margin-bottom:8px;}</style></head><body><div class="error-container"><h1>Hozzáférés Megtagadva</h1><p>Sajnáljuk, de ehhez a tartalomhoz nincs érvényes hozzáférésed...</p><ul><li>Nincs aktiválva a kód.</li><li>Lejárt a munkamenet.</li><li>Hálózati hiba.</li></ul><p>Próbáld újra aktiválni, vagy ellenőrizd a kapcsolatot.</p></div></body></html>`; this._renderContent(pageId, ec);
   }
  _renderGenericErrorPage(pageId, message = 'Ismeretlen hiba történt.') { /* ... (Változatlan az eredetihez képest) ... */
     console.log(`[ContentLoader] Általános hibaoldal: ${pageId}`); const ec = `<!DOCTYPE html><html lang="hu"><head><meta charset="utf-8"><title>Hiba</title><meta name="viewport" content="width=device-width, initial-scale=1.0"><link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;700&display=swap" rel="stylesheet"><style>body{font-family:'Roboto',sans-serif;text-align:center;padding:40px;background-color:#1a1a1a;color:#e0e0e0;margin:0;display:flex;justify-content:center;align-items:center;min-height:100vh;box-sizing:border-box;}.error-container{max-width:500px;margin:0 auto;background-color:#2c2c2c;padding:30px;border-radius:10px;box-shadow:0 0 15px rgba(0,0,0,0.5);}h1{color:#ffcc00;margin-bottom:15px;font-size:24px;}p{margin-bottom:20px;font-size:16px;line-height:1.6;}.message{font-style:italic;color:#aaaaaa;margin-bottom:25px;}</style></head><body><div class="error-container"><h1>Hoppá, Hiba Történt!</h1><p>A kért tartalom betöltése sikertelen.</p><p class="message">Részletek: ${message}</p><p>Próbáld meg később, vagy lépj vissza.</p></div></body></html>`; this._renderContent(pageId, ec);
   }

} // <-- ContentLoader osztály vége

// Globális példány létrehozása (Változatlan)
if (window.firebaseApp) { window.contentLoader = new ContentLoader(); } else { /* ... (Változatlan) ... */ console.warn("[ContentLoader] Várakozás window.firebaseApp-ra..."); const ci=setInterval(()=>{if(window.firebaseApp&&window.authService&&window.authTokenService){ if(typeof window.bookPageData!=='undefined'){ clearInterval(ci); window.contentLoader=new ContentLoader(); console.log("[ContentLoader] Globális példány létrehozva."); }else if(!document.querySelector('script[src*="pages-data.js"]')){ clearInterval(ci); console.error("[ContentLoader] HIBA: pages-data.js nincs betöltve!"); }else{ console.log("[ContentLoader] Várakozás bookPageData-ra..."); } } },100); setTimeout(()=>{if(!window.contentLoader){clearInterval(ci);console.error("[ContentLoader] Időtúllépés!");}},8000); }