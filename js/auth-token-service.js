/**
 * Token alapú jogosultságkezelés szolgáltatás - Kompatibilis verzió
 * Ez a szolgáltatás kezeli a hozzáférési tokeneket, hogy a felhasználó csak akkor férjen hozzá 
 * a tartalmakhoz, ha a könyvet valóban aktiválta az eszközén.
 */
class SecureTokenService {
  constructor() {
    // Alapértelmezett beállítások
    this.tokenKey = 'flipbook_access_token';
    this.tokenValidityMinutes = 30; // Token érvényessége percekben
    this.isInitialized = false;
    
    // Csatlakozunk a Firebase hitelesítési eseményhez
    if (window.firebaseApp && window.firebaseApp.auth) {
      window.firebaseApp.auth.onAuthStateChanged(user => {
        if (user) {
          this.userId = user.uid;
          this.refreshToken();
        } else {
          this.clearToken();
        }
      });
      
      this.isInitialized = true;
    } else {
      console.warn('Firebase Auth nincs inicializálva! A token szolgáltatás korlátozott működésű lesz.');
    }
  }
  
  /**
   * Token lekérése (létrehozza, ha nem létezik)
   */
  async getAccessToken() {
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
        expires: timestamp + (this.tokenValidityMinutes * 60 * 1000),
        token: this._generateToken(this.userId, timestamp)
      };
      
      // Mentjük a tokent a localStorage-ba
      this._saveToken(tokenData);
      
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
    return tokenData.expires > now;
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
window.authTokenService = new SecureTokenService();