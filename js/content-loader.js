/**
 * Tartalombetöltő és jogosultságkezelő
 * Ez a modul felel a tartalom biztonságos betöltéséért és megjelenítéséért
 */
class ContentLoader {
  constructor() {
    this.authTokenService = window.authTokenService;
    this.auth = window.firebaseApp.auth;
    this.db = window.firebaseApp.db;
    this.isLoading = false;
    this.activePageId = null;
    
    // Callback funkció a tartalom megjelenítésére
    this.renderCallback = null;
    
    // Tartalom gyorsítótár
    this.contentCache = {};
    
    // Cache élettartam (30 perc)
    this.cacheTTL = 30 * 60 * 1000;
    
    // Betöltő overlay
    this.loadingOverlay = null;
    
    // Átirányítási eseményfigyelő
    window.addEventListener('popstate', (event) => {
      this._handleNavigation();
    });
    
    // Első betöltéskor ellenőrizzük a jogosultságot
    window.addEventListener('DOMContentLoaded', () => {
      this._handleNavigation();
    });
    
    // Rendszeres jogosultság ellenőrzés (percenként)
    setInterval(() => {
      if (this.activePageId) {
        this.verifyAccess(this.activePageId);
      }
    }, 60000);
  }
  
  /**
   * Kezdeti beállítás
   * @param {Function} renderCallback - A tartalom megjelenítéséért felelős callback
   */
  setup(renderCallback) {
    this.renderCallback = renderCallback;
    this._createLoadingOverlay();
    console.log('ContentLoader inicializálva');
  }
  
  /**
   * Betöltő overlay létrehozása
   * @private
   */
  _createLoadingOverlay() {
    this.loadingOverlay = document.createElement('div');
    this.loadingOverlay.id = 'content-loading-overlay';
    this.loadingOverlay.style.cssText = `
      position: fixed;
      top: 0; left: 0;
      width: 100%; height: 100%;
      background-color: rgba(0, 0, 0, 0.8);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 9999;
      opacity: 0;
      visibility: hidden;
      transition: opacity 0.3s, visibility 0.3s;
    `;
    
    this.loadingOverlay.innerHTML = `
      <div class="loading-spinner" style="
        width: 50px;
        height: 50px;
        border: 5px solid #7f00ff;
        border-radius: 50%;
        border-top-color: transparent;
        animation: spin 1s linear infinite;
      "></div>
      <style>
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      </style>
    `;
    
    document.body.appendChild(this.loadingOverlay);
  }
  
  /**
   * Betöltő megjelenítése
   * @private
   */
  _showLoading() {
    if (this.loadingOverlay) {
      this.loadingOverlay.style.opacity = '1';
      this.loadingOverlay.style.visibility = 'visible';
    }
  }
  
  /**
   * Betöltő elrejtése
   * @private
   */
  _hideLoading() {
    if (this.loadingOverlay) {
      this.loadingOverlay.style.opacity = '0';
      this.loadingOverlay.style.visibility = 'hidden';
    }
  }
  
  /**
   * Navigáció kezelése
   * @private
   */
  async _handleNavigation() {
    // Kivonjuk a pageId-t az URL-ből
    const urlParams = new URLSearchParams(window.location.search);
    const pageId = urlParams.get('page') || 'borito';
    
    // Ha már ez az oldal aktív, nem csinálunk semmit
    if (pageId === this.activePageId) return;
    
    // Ellenőrizzük a jogosultságot és betöltjük a tartalmat
    await this.loadContent(pageId);
  }
  
  /**
   * Tartalom betöltése
   * @param {string} pageId - A betöltendő oldal azonosítója
   * @public
   */
  async loadContent(pageId) {
    try {
      if (this.isLoading) return;
      this.isLoading = true;
      this._showLoading();
      
      console.log(`Tartalom betöltése: ${pageId}`);
      
      // Jogosultság ellenőrzése
      const hasAccess = await this.verifyAccess(pageId);
      if (!hasAccess) {
        console.error(`Nincs jogosultság a tartalomhoz: ${pageId}`);
        this._showAccessDenied();
        this.isLoading = false;
        this._hideLoading();
        return false;
      }
      
      // Gyorsítótárból betöltés, ha elérhető és nem járt le
      if (this.contentCache[pageId] && 
          this.contentCache[pageId].timestamp > Date.now() - this.cacheTTL) {
        console.log(`Tartalom betöltése gyorsítótárból: ${pageId}`);
        this._renderContent(pageId, this.contentCache[pageId].content);
        this.isLoading = false;
        this._hideLoading();
        return true;
      }
      
      // Tartalom lekérése a szerverről
      const content = await this._fetchContent(pageId);
      if (!content) {
        console.error(`Nem sikerült betölteni a tartalmat: ${pageId}`);
        this._showError();
        this.isLoading = false;
        this._hideLoading();
        return false;
      }
      
      // Tartalom mentése a gyorsítótárba
      this.contentCache[pageId] = {
        content: content,
        timestamp: Date.now()
      };
      
      // Tartalom megjelenítése
      this._renderContent(pageId, content);
      
      // Állapot frissítése
      this.activePageId = pageId;
      
      // URL frissítése
      this._updateURL(pageId);
      
      this.isLoading = false;
      this._hideLoading();
      return true;
    } catch (error) {
      console.error('Hiba a tartalom betöltésekor:', error);
      this._showError();
      this.isLoading = false;
      this._hideLoading();
      return false;
    }
  }
  
  /**
   * Tartalom lekérése a szerverről
   * @param {string} pageId - A lekérendő oldal azonosítója
   * @private
   */
  async _fetchContent(pageId) {
    try {
      // Token beszerzése
      const token = await this.authTokenService.getAccessToken();
      if (!token) {
        throw new Error('Nem sikerült hozzáférési tokent generálni');
      }
      
      // Fejléc beállítások
      const headers = new Headers();
      headers.append('Authorization', `Bearer ${token}`);
      
      // Tartalom lekérése
      const url = `pages/${pageId}.html`;
      const response = await fetch(url, {
        method: 'GET',
        headers: headers,
        credentials: 'same-origin'
      });
      
      if (!response.ok) {
        throw new Error(`HTTP hiba: ${response.status}`);
      }
      
      const content = await response.text();
      return content;
    } catch (error) {
      console.error('Hiba a tartalom lekérésekor:', error);
      return null;
    }
  }
  
  /**
   * Tartalom megjelenítése
   * @param {string} pageId - Az oldal azonosítója
   * @param {string} content - A megjelenítendő tartalom
   * @private
   */
  _renderContent(pageId, content) {
    if (!this.renderCallback) {
      console.error('Nincs beállítva renderCallback');
      return;
    }
    
    // Biztonságos tartalom előkészítése
    const secureContent = this._prepareSecureContent(content, pageId);
    
    // Callback hívása a tartalom megjelenítéséhez
    this.renderCallback(pageId, secureContent);
  }
  
  /**
   * Biztonságos tartalom előkészítése (copy-paste védelem, stb.)
   * @param {string} content - Az eredeti tartalom
   * @param {string} pageId - Az oldal azonosítója
   * @private
   */
  _prepareSecureContent(content, pageId) {
    // Itt adhatunk hozzá védelmeket a HTML tartalomhoz
    // Pl. script injektálása, amely megakadályozza a másolást, képernyőképet, stb.
    
    // Egyszerű példa: no-copy attribútumok hozzáadása
    let secureContent = content
      .replace(/<body/g, '<body oncopy="return false" oncut="return false" oncontextmenu="return false"')
      .replace(/<img/g, '<img draggable="false" oncontextmenu="return false"')
      .replace(/<div/g, '<div oncontextmenu="return false"');
    
    // Data-page attribútum hozzáadása a követéshez
    secureContent = secureContent.replace(/<body([^>]*)>/g, '<body$1 data-page-id="' + pageId + '">');
    
    return secureContent;
  }
  
  /**
   * URL frissítése
   * @param {string} pageId - Az új oldal azonosítója
   * @private
   */
  async _updateURL(pageId) {
    const token = await this.authTokenService.getAccessToken();
    const newURL = new URL(window.location.href);
    
    // Oldal azonosító beállítása
    newURL.searchParams.set('page', pageId);
    
    // Token hozzáadása
    if (token) {
      const shortToken = token.split('-')[0] + '-...-' + token.split('-').pop();
      newURL.searchParams.set('t', shortToken);
    }
    
    // Böngésző előzmények frissítése
    window.history.pushState({ pageId: pageId }, '', newURL.toString());
  }
  
  /**
   * Jogosultság ellenőrzése adott tartalomhoz
   * @param {string} pageId - Az ellenőrizendő oldal azonosítója
   * @public
   */
  async verifyAccess(pageId) {
    try {
      // A borító oldalt mindig elérhetővé tesszük
      if (pageId === 'borito') return true;
      
      // Ellenőrizzük, hogy be van-e jelentkezve
      if (!this.auth.currentUser) {
        console.log('Nincs bejelentkezett felhasználó');
        return false;
      }
      
      // Jogosultság ellenőrzése a token service-szel
      const hasAccess = await this.authTokenService.verifyContentAccess(pageId);
      return hasAccess;
    } catch (error) {
      console.error('Hiba a jogosultság ellenőrzésekor:', error);
      return false;
    }
  }
  
  /**
   * Hozzáférés megtagadva képernyő megjelenítése
   * @private
   */
  _showAccessDenied() {
    const overlay = document.createElement('div');
    overlay.id = 'access-denied-overlay';
    overlay.style.cssText = `
      position: fixed;
      top: 0; left: 0;
      width: 100%; height: 100%;
      background-color: rgba(0, 0, 0, 0.9);
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      z-index: 10000;
      color: #fff;
      font-family: 'Cinzel', serif;
      text-align: center;
    `;
    
    overlay.innerHTML = `
      <h2 style="color: #7f00ff; margin-bottom: 1rem;">Hozzáférés megtagadva</h2>
      <p>Nincs jogosultságod a kért tartalomhoz.</p>
      <p>Kérlek aktiváld a könyvet a megfelelő aktivációs kóddal.</p>
      <button id="activate-now-btn" style="
        background-color: #7f00ff;
        color: #fff;
        border: none;
        padding: 0.75rem 2rem;
        font-size: 1rem;
        border-radius: 4px;
        cursor: pointer;
        font-family: 'Cinzel', serif;
        margin-top: 2rem;
      ">Aktiválás most</button>
    `;
    
    document.body.appendChild(overlay);
    
    document.getElementById('activate-now-btn').addEventListener('click', () => {
      overlay.remove();
      window.location.href = '?page=borito';
    });
  }
  
  /**
   * Hiba képernyő megjelenítése
   * @private
   */
  _showError() {
    const overlay = document.createElement('div');
    overlay.id = 'error-overlay';
    overlay.style.cssText = `
      position: fixed;
      top: 0; left: 0;
      width: 100%; height: 100%;
      background-color: rgba(0, 0, 0, 0.9);
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      z-index: 10000;
      color: #fff;
      font-family: 'Cinzel', serif;
      text-align: center;
    `;
    
    overlay.innerHTML = `
      <h2 style="color: #ff5555; margin-bottom: 1rem;">Hiba történt</h2>
      <p>A tartalom betöltése sikertelen.</p>
      <p>Kérjük, ellenőrizd az internetkapcsolatot és próbáld újra.</p>
      <button id="retry-btn" style="
        background-color: #7f00ff;
        color: #fff;
        border: none;
        padding: 0.75rem 2rem;
        font-size: 1rem;
        border-radius: 4px;
        cursor: pointer;
        font-family: 'Cinzel', serif;
        margin-top: 2rem;
      ">Újrapróbálkozás</button>
    `;
    
    document.body.appendChild(overlay);
    
    document.getElementById('retry-btn').addEventListener('click', () => {
      overlay.remove();
      window.location.reload();
    });
  }
}

// Exportáljuk a szolgáltatást
window.contentLoader = new ContentLoader();