/**
 * Tartalom betöltő szolgáltatás
 * Ez a szolgáltatás felelős a könyv oldalainak biztonságos betöltéséért,
 * ellenőrizve a hozzáférési jogosultságot minden egyes oldal betöltése előtt.
 */
class ContentLoader {
  constructor() {
    this.pages = {}; // Gyorsítótár a betöltött oldalakhoz
    this.renderCallback = null; // Visszahívás függvény az oldalak megjelenítéséhez
    this.isInitialized = false;
    
    // Csatlakozunk a Firebase hitelesítési eseményhez
    if (window.firebase && window.firebase.auth) {
      this.db = window.firebase.firestore();
      this.isInitialized = true;
    } else {
      console.warn('Firebase nincs inicializálva! A tartalom betöltés korlátozott működésű lesz.');
    }
  }
  
  /**
   * Beállítás
   * @param {Function} renderCallback - Függvény, ami megjeleníti az oldalakat
   */
  setup(renderCallback) {
    this.renderCallback = renderCallback;
    console.log('ContentLoader inicializálva');
  }
  
  /**
   * Tartalom betöltése
   * @param {string} pageId - Az oldal azonosítója (pl. "1", "2", "borito")
   * @returns {Promise<boolean>} - Sikeres volt-e a betöltés
   */
  async loadContent(pageId) {
    // Ha már be van töltve a cache-ben, onnan szolgáljuk ki
    if (this.pages[pageId]) {
      console.log(`Oldal betöltése cache-ből: ${pageId}`);
      this._renderContent(pageId, this.pages[pageId]);
      return true;
    }
    
    try {
      // Először megpróbáljuk a helyi fájlból betölteni
      const content = await this._loadFromFile(pageId);
      if (content) {
        this.pages[pageId] = content;
        this._renderContent(pageId, content);
        return true;
      }
      
      // Ha helyi betöltés nem sikerült, megpróbáljuk a Firebase-ből
      if (this.isInitialized) {
        const firebaseContent = await this._loadFromFirebase(pageId);
        if (firebaseContent) {
          this.pages[pageId] = firebaseContent;
          this._renderContent(pageId, firebaseContent);
          return true;
        }
      }
      
      // Ha egyik sem sikerült, hibaüzenetet jelenítünk meg
      this._renderErrorPage(pageId);
      return false;
    } catch (error) {
      console.error(`Hiba az oldal betöltésekor (${pageId}):`, error);
      this._renderErrorPage(pageId);
      return false;
    }
  }
  
  /**
   * Helyi fájlból való betöltés
   * @param {string} pageId - Az oldal azonosítója
   * @returns {Promise<string|null>} - A betöltött tartalom vagy null
   */
  async _loadFromFile(pageId) {
    try {
      // Az oldal betöltése a pages mappából
      const pagePath = pageId === 'borito' ? 'pages/borito.html' : `pages/${pageId}.html`;
      
      // Token ellenőrzés, kivéve a borítólapnál
      if (pageId !== 'borito') {
        if (!await this._hasAccessToPage(pageId)) {
          console.warn(`Nincs jogosultság az oldal megtekintéséhez: ${pageId}`);
          return null;
        }
      }
      
      const response = await fetch(pagePath);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const content = await response.text();
      return content;
    } catch (error) {
      console.warn(`Helyi fájl betöltése nem sikerült (${pageId}):`, error);
      return null;
    }
  }
  
  /**
   * Firebase-ből való betöltés
   * @param {string} pageId - Az oldal azonosítója
   * @returns {Promise<string|null>} - A betöltött tartalom vagy null
   */
  async _loadFromFirebase(pageId) {
    if (!this.isInitialized) return null;
    
    try {
      // Token ellenőrzés, kivéve a borítólapnál
      if (pageId !== 'borito') {
        if (!await this._hasAccessToPage(pageId)) {
          console.warn(`Nincs jogosultság az oldal megtekintéséhez: ${pageId}`);
          return null;
        }
      }
      
      const docRef = this.db.collection('pages').doc(pageId);
      const doc = await docRef.get();
      
      if (doc.exists) {
        const data = doc.data();
        return data.content || null;
      } else {
        console.warn(`Az oldal nem található a Firebase-ben: ${pageId}`);
        return null;
      }
    } catch (error) {
      console.error(`Firebase betöltés hiba (${pageId}):`, error);
      return null;
    }
  }
  
  /**
   * Jogosultság ellenőrzése egy oldalhoz
   * @param {string} pageId - Az oldal azonosítója
   * @returns {Promise<boolean>} - Van-e jogosultság
   */
  async _hasAccessToPage(pageId) {
    // A borító mindig elérhető
    if (pageId === 'borito') return true;
    
    // Ha a Firebase nincs inicializálva, csak az első néhány oldalt engedélyezzük
    if (!this.isInitialized) {
      const pageNum = parseInt(pageId, 10);
      return !isNaN(pageNum) && pageNum <= 3; // Első 3 oldal elérhető
    }
    
    // Ellenőrizzük, hogy van-e érvényes token
    if (!window.authTokenService) {
      console.warn('Az AuthTokenService nem elérhető! Csak korlátozott hozzáférés lehetséges.');
      const pageNum = parseInt(pageId, 10);
      return !isNaN(pageNum) && pageNum <= 3; // Csak az első 3 oldal elérhető
    }
    
    // Token lekérése, ha nincs érvényes token, akkor nincs jogosultság
    const token = await window.authTokenService.getAccessToken();
    return !!token;
  }
  
  /**
   * Tartalom megjelenítése
   * @param {string} pageId - Az oldal azonosítója
   * @param {string} content - A megjelenítendő tartalom
   */
  _renderContent(pageId, content) {
    if (this.renderCallback) {
      this.renderCallback(pageId, content);
    } else {
      console.error('Nincs beállítva renderCallback függvény!');
    }
  }
  
  /**
   * Hibaoldal megjelenítése
   * @param {string} pageId - Az oldal azonosítója
   */
  _renderErrorPage(pageId) {
    const errorContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Hiba</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          text-align: center;
          padding: 50px;
          background-color: #f5f5f5;
        }
        .error-container {
          max-width: 500px;
          margin: 0 auto;
          background-color: white;
          padding: 30px;
          border-radius: 10px;
          box-shadow: 0 0 10px rgba(0,0,0,0.1);
        }
        h1 {
          color: #e74c3c;
        }
        p {
          margin-bottom: 20px;
          font-size: 16px;
          line-height: 1.5;
        }
        .button {
          display: inline-block;
          padding: 10px 20px;
          background-color: #3498db;
          color: white;
          text-decoration: none;
          border-radius: 5px;
          font-weight: bold;
        }
      </style>
    </head>
    <body>
      <div class="error-container">
        <h1>Az oldal nem érhető el</h1>
        <p>Sajnáljuk, de ez a tartalom nem elérhető. Ez a következő okok miatt lehet:</p>
        <ul style="text-align: left;">
          <li>Nem aktiváltad még a könyvedet ezen az eszközön</li>
          <li>A munkameneted lejárt (30 perc után automatikusan lejár)</li>
          <li>Nincs internetkapcsolat, ami szükséges az ellenőrzéshez</li>
        </ul>
        <p>Kérjük, jelentkezz be vagy aktiváld újra a könyvet a főoldalon!</p>
        <a href="index.html" class="button">Vissza a főoldalra</a>
      </div>
    </body>
    </html>
    `;
    
    this._renderContent(pageId, errorContent);
  }
}

// Globális példány létrehozása, hogy az alkalmazás más részeiből is elérhető legyen
window.contentLoader = new ContentLoader();