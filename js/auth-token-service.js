/**
 * Token alapú jogosultságkezelés szolgáltatás
 * Ez a szolgáltatás kezeli a hozzáférési tokeneket, hogy a felhasználó csak akkor férjen hozzá 
 * a tartalmakhoz, ha a könyvet valóban aktiválta az eszközén.
 */
class AuthTokenService {
  constructor() {
    // Alapértelmezett beállítások
    this.tokenKey = 'flipbook_access_token';
    // A token érvényessége másodpercekben - 10 másodperc a teszteléshez
    this.tokenValiditySeconds = 10; 
    this.isInitialized = false;
    
    // Inicializálást késleltetjük, amíg a Firebase betöltődik
    this._initWhenFirebaseReady();
  }
  
  /**
   * Inicializálás, amikor a Firebase elérhető
   */
  _initWhenFirebaseReady() {
    // Ellenőrizzük, hogy a window.firebaseApp már létezik-e
    if (window.firebaseApp && window.firebaseApp.auth) {
      this._initWithFirebase();
    } else {
      // Ha még nem, várunk egy rövid ideig és újra próbáljuk
      console.log('Várakozás a Firebase inicializálására...');
      setTimeout(() => this._initWhenFirebaseReady(), 500);
    }
  }
  
  /**
   * Inicializálás a Firebase-szel
   */
  _initWithFirebase() {
    try {
      // Firebase szolgáltatások mentése
      this.auth = window.firebaseApp.auth;
      this.db = window.firebaseApp.db;
      
      // Csatlakozunk a Firebase hitelesítési eseményhez
      this.auth.onAuthStateChanged(user => {
        if (user) {
          this.userId = user.uid;
          this.refreshToken();
        } else {
          this.clearToken();
        }
      });
      
      this.isInitialized = true;
      console.log('AuthTokenService inicializálva Firebase-szel');
    } catch (error) {
      console.error('Hiba a Firebase inicializálásakor:', error);
    }
  }
  
  /**
   * Token lekérése (létrehozza, ha nem létezik)
   */
  async getAccessToken() {
    // Ha még nincs inicializálva, várjuk meg
    if (!this.isInitialized) {
      console.log('Várakozás a token szolgáltatás inicializálására...');
      await new Promise(resolve => {
        const checkInit = () => {
          if (this.isInitialized) {
            resolve();
          } else {
            setTimeout(checkInit, 100);
          }
        };
        checkInit();
      });
    }
    
    // Ellenőrizzük a meglévő token érvényességét
    const existingToken = this.loadToken();
    if (existingToken && this.isTokenValid(existingToken)) {
      return existingToken.token;
    }
    
    // Ha nincs érvényes token, kérünk újat
    return this.refreshToken();
  }
  
  /**
   * Token frissítése a Firebase-ből
   */
  async refreshToken() {
    if (!this.isInitialized || !this.userId) {
      console.warn('A token szolgáltatás nincs inicializálva vagy a felhasználó nincs bejelentkezve!');
      return null;
    }
    
    try {
      // A felhasználó egyedi azonosítója és az aktuális időbélyeg alapján generálunk tokent
      const timestamp = new Date().getTime();
      const tokenData = {
        userId: this.userId,
        timestamp: timestamp,
        expires: timestamp + (this.tokenValiditySeconds * 1000), // másodpercekben
        token: this._generateToken(this.userId, timestamp)
      };
      
      // Mentjük a tokent a localStorage-ba
      this._saveToken(tokenData);
      
      console.log(`Új token generálva, lejárat: ${new Date(tokenData.expires)} (${this.tokenValiditySeconds} másodperc múlva)`);
      
      return tokenData.token;
    } catch (error) {
      console.error('Hiba történt a token frissítésekor:', error);
      return null;
    }
  }
  
  /**
   * Token betöltése a localStorage-ból
   */
  loadToken() {
    try {
      const tokenString = localStorage.getItem(this.tokenKey);
      if (!tokenString) return null;
      
      return JSON.parse(tokenString);
    } catch (e) {
      console.error('Hiba a token betöltésekor:', e);
      return null;
    }
  }
  
  /**
   * Token törlése
   */
  clearToken() {
    localStorage.removeItem(this.tokenKey);
  }
  
  /**
   * Token érvényességének ellenőrzése
   */
  isTokenValid(tokenData) {
    if (!tokenData || !tokenData.expires) return false;
    
    // Ellenőrizzük, hogy a token nem járt-e le
    const now = new Date().getTime();
    const isValid = tokenData.expires > now;
    
    if (!isValid) {
      console.log(`A token lejárt: ${new Date(tokenData.expires)}`);
    }
    
    return isValid;
  }
  
  /**
   * Token generálása (egyszerű hash)
   * Valódi környezetben ezt szerver oldalon kellene végezni, biztonsági okokból
   */
  _generateToken(userId, timestamp) {
    // Egyszerű token generálás a userId és timestamp alapján
    const combinedString = `${userId}-${timestamp}-${window.location.hostname}`;
    return this._simpleHash(combinedString);
  }
  
  /**
   * Egyszerű hash függvény (nem kriptográfiai célokra)
   */
  _simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // 32-bites egésszé konvertálás
    }
    // Pozitív hexadecimális stringgé alakítás
    return (hash >>> 0).toString(16);
  }
  
  /**
   * Token mentése a localStorage-ba
   */
  _saveToken(tokenData) {
    try {
      localStorage.setItem(this.tokenKey, JSON.stringify(tokenData));
    } catch (e) {
      console.error('Hiba a token mentésekor:', e);
    }
  }
}

// Globális példány létrehozása, hogy az alkalmazás más részeiből is elérhető legyen
window.authTokenService = new AuthTokenService();