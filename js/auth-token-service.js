/**
 * Fejlett jogosultságkezelő szolgáltatás
 * Rövid élettartamú token alapú hozzáférést biztosít a tartalmakhoz
 */
class AuthTokenService {
  constructor() {
    this.auth = window.firebaseApp.auth;
    this.db = window.firebaseApp.db;
    this.STORAGE_KEY = 'kalandkonyv_auth';
    this.CODES_COLLECTION = 'activationCodes';
    this.TOKEN_EXPIRY = 30 * 60 * 1000; // 30 perc
    
    // Session token kezelés
    this.sessionToken = null;
    this.tokenExpiry = null;
    
    // Firebase auth figyelő
    this.auth.onAuthStateChanged(user => {
      if (user) {
        console.log('Felhasználó bejelentkezve:', user.uid);
        this._initSessionToken();
      } else {
        console.log('Nincs bejelentkezett felhasználó');
        this._clearSessionToken();
      }
    });
    
    // Token frissítési időzítő
    this.tokenRefreshInterval = setInterval(() => {
      this._checkAndRefreshToken();
    }, 60000); // Percenként ellenőrizzük
    
    // Hozzáférés ellenőrzése lapváltáskor
    window.addEventListener('pageshow', () => {
      this._checkAndRefreshToken();
    });
  }
  
  /**
   * Session token inicializálása
   * @private
   */
  async _initSessionToken() {
    try {
      if (!this.auth.currentUser) return;
      
      const token = await this._generateSessionToken();
      this.sessionToken = token;
      this.tokenExpiry = Date.now() + this.TOKEN_EXPIRY;
      
      console.log('Session token inicializálva, lejárat:', new Date(this.tokenExpiry));
      
      // Tároljuk a token adatokat
      const authData = this._loadFromStorage() || {};
      authData.sessionToken = token;
      authData.tokenExpiry = this.tokenExpiry;
      this._saveToStorage(authData);
      
      return token;
    } catch (error) {
      console.error('Hiba a session token inicializálásakor:', error);
      return null;
    }
  }
  
  /**
   * Session token generálása
   * @private
   */
  async _generateSessionToken() {
    try {
      // Egyedi token generálása a felhasználó számára
      const user = this.auth.currentUser;
      if (!user) throw new Error('Nincs bejelentkezett felhasználó');
      
      // Idő alapú token generálás
      const timestamp = Date.now();
      const randomPart = Math.random().toString(36).substring(2, 10);
      const rawToken = `${user.uid}-${timestamp}-${randomPart}`;
      
      // Tároljuk a tokent a felhasználói dokumentumban is
      const deviceId = user.uid;
      const userRef = this.db.collection('userSessions').doc(deviceId);
      
      await userRef.set({
        uid: user.uid,
        sessionToken: rawToken,
        created: firebase.firestore.FieldValue.serverTimestamp(),
        expires: new Date(Date.now() + this.TOKEN_EXPIRY),
        deviceInfo: navigator.userAgent,
        lastActive: firebase.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
      
      return rawToken;
    } catch (error) {
      console.error('Hiba a session token generálásakor:', error);
      throw error;
    }
  }
  
  /**
   * Token ellenőrzése és frissítése ha szükséges
   * @private
   */
  async _checkAndRefreshToken() {
    try {
      // Ellenőrizzük hogy van-e érvényes token
      if (!this.auth.currentUser) return false;
      
      // Adatok betöltése a storage-ból
      const authData = this._loadFromStorage() || {};
      this.sessionToken = authData.sessionToken || this.sessionToken;
      this.tokenExpiry = authData.tokenExpiry || this.tokenExpiry;
      
      // Ha nincs token vagy lejárt, újat generálunk
      if (!this.sessionToken || !this.tokenExpiry || Date.now() > this.tokenExpiry) {
        console.log('Token lejárt vagy nem létezik, új generálása...');
        await this._initSessionToken();
        return true;
      }
      
      // Ha közeledik a lejárat ideje, frissítjük
      if (this.tokenExpiry - Date.now() < 5 * 60 * 1000) { // 5 percen belül lejár
        console.log('Token hamarosan lejár, frissítés...');
        await this._initSessionToken();
        return true;
      }
      
      // Frissítjük a lastActive időt a Firestore-ban
      const deviceId = this.auth.currentUser.uid;
      const userRef = this.db.collection('userSessions').doc(deviceId);
      await userRef.update({
        lastActive: firebase.firestore.FieldValue.serverTimestamp()
      });
      
      return true;
    } catch (error) {
      console.error('Hiba a token ellenőrzésekor:', error);
      return false;
    }
  }
  
  /**
   * Session token törlése
   * @private
   */
  _clearSessionToken() {
    this.sessionToken = null;
    this.tokenExpiry = null;
    
    // Töröljük a token adatokat a storage-ból
    const authData = this._loadFromStorage() || {};
    delete authData.sessionToken;
    delete authData.tokenExpiry;
    this._saveToStorage(authData);
  }
  
  /**
   * Helyi tárolás elérhetőségének ellenőrzése
   * @private
   */
  _isStorageAvailable() {
    try {
      const testKey = '__storage_test__';
      localStorage.setItem(testKey, testKey);
      localStorage.removeItem(testKey);
      return true;
    } catch (e) {
      console.warn('localStorage nem érhető el:', e);
      return false;
    }
  }
  
  /**
   * Adatok biztonságos mentése localStorage-ba
   * @private
   */
  _saveToStorage(data) {
    if (!this._isStorageAvailable()) return false;
    
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
      return true;
    } catch (error) {
      console.error('Hiba a localStorage írása közben:', error);
      return false;
    }
  }
  
  /**
   * Adatok biztonságos olvasása localStorage-ból
   * @private
   */
  _loadFromStorage() {
    if (!this._isStorageAvailable()) return null;
    
    try {
      const item = localStorage.getItem(this.STORAGE_KEY);
      return item ? JSON.parse(item) : null;
    } catch (error) {
      console.error('Hiba a localStorage olvasása közben:', error);
      return null;
    }
  }
  
  /**
   * Aktuális munkamenet token lekérése
   * @public
   */
  async getAccessToken() {
    // Ellenőrizzük és frissítjük a tokent ha szükséges
    await this._checkAndRefreshToken();
    return this.sessionToken;
  }
  
  /**
   * URL-hez hozzáférési token hozzáadása
   * @public
   */
  async addTokenToUrl(url) {
    const token = await this.getAccessToken();
    if (!token) return url;
    
    // URL objektummá alakítjuk
    const urlObj = new URL(url, window.location.origin);
    
    // Hozzáadjuk a tokent
    urlObj.searchParams.set('access_token', token);
    
    return urlObj.toString();
  }
  
  /**
   * Tartalom jogosultság ellenőrzése
   * @public
   */
  async verifyContentAccess(contentId) {
    try {
      if (!this.auth.currentUser) return false;
      
      // Token frissítése ha szükséges
      await this._checkAndRefreshToken();
      
      // Ellenőrizzük a jogosultságot a Firestore-ban
      const deviceId = this.auth.currentUser.uid;
      const sessionRef = this.db.collection('userSessions').doc(deviceId);
      const sessionDoc = await sessionRef.get();
      
      if (!sessionDoc.exists) return false;
      
      const sessionData = sessionDoc.data();
      
      // Ellenőrizzük a token érvényességét
      if (!sessionData.sessionToken || 
          !sessionData.expires || 
          sessionData.expires.toDate() < new Date()) {
        return false;
      }
      
      // Ellenőrizzük, hogy a token megegyezik-e
      if (sessionData.sessionToken !== this.sessionToken) {
        return false;
      }
      
      // Jogosultság megerősítve
      return true;
    } catch (error) {
      console.error('Hiba a tartalom jogosultság ellenőrzésekor:', error);
      return false;
    }
  }
}

// Exportáljuk a szolgáltatást
window.authTokenService = new AuthTokenService();