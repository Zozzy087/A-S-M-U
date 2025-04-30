// AuthService - A kalandkönyv autentikációs szolgáltatása
class AuthService {
  constructor() {
    this.auth = window.firebaseApp.auth;
    this.db = window.firebaseApp.db;
    this.STORAGE_KEY = 'kalandkonyv_auth';
    this.CODES_COLLECTION = 'activationCodes';
    
    // Autentikáció változásának figyelése
    this.auth.onAuthStateChanged(user => {
      if (user) {
        console.log('[AuthService] Felhasználó bejelentkezve:', user.uid);
      } else {
        console.log('[AuthService] Nincs bejelentkezett felhasználó');
      }
    });
  }
  
  // Ellenőrzi, van-e tárolt autentikáció
  async checkStoredAuth() {
    try {
      console.log('[AuthService] Tárolt autentikáció ellenőrzése...');
      const storedAuth = localStorage.getItem(this.STORAGE_KEY);
      if (!storedAuth) {
        console.log('[AuthService] Nincs tárolt autentikáció');
        return null;
      }
      
      const authData = JSON.parse(storedAuth);
      console.log('[AuthService] Tárolt autentikáció betöltve:', authData.userId);
      
      // Ellenőrizzük, hogy a tárolt token érvényes-e még
      if (this.auth.currentUser) {
        if (this.auth.currentUser.uid === authData.userId) {
          console.log('[AuthService] A bejelentkezett felhasználó megegyezik a tároltal');
          return this.auth.currentUser;
        }
      }
      
      // Próbáljunk meg újra bejelentkezni a tárolt adatokkal
      try {
        console.log('[AuthService] Újra bejelentkezés a tárolt adatokkal...');
        await this.auth.signInAnonymously();
        
        // Ellenőrizzük, hogy a kapott UID egyezik-e a tároltal
        if (this.auth.currentUser && this.auth.currentUser.uid === authData.userId) {
          console.log('[AuthService] Sikeres újra bejelentkezés, egyező UID');
          return this.auth.currentUser;
        } else {
          console.log('[AuthService] Az új bejelentkezés UID-ja nem egyezik a tároltal');
          localStorage.removeItem(this.STORAGE_KEY);
          return null;
        }
      } catch (error) {
        console.error('[AuthService] Hiba történt a bejelentkezés során:', error);
        localStorage.removeItem(this.STORAGE_KEY);
        return null;
      }
    } catch (error) {
      console.error('[AuthService] Hiba a tárolt autentikáció ellenőrzésekor:', error);
      return null;
    }
  }
  
  // Aktivációs kód ellenőrzése
  async verifyActivationCode(code) {
    try {
      console.log('[AuthService] Kód ellenőrzése:', code);
      
      if (!this.db) {
        console.error('[AuthService] Firestore nem inicializálódott!');
        return { valid: false, message: 'Adatbázis kapcsolat hiba' };
      }
      
      try {
        const codeDoc = await this.db.collection(this.CODES_COLLECTION).doc(code).get();
        
        if (!codeDoc.exists) {
          console.log('[AuthService] A kód nem létezik az adatbázisban:', code);
          return { valid: false, message: 'Érvénytelen aktivációs kód' };
        }
        
        const codeData = codeDoc.data();
        console.log('[AuthService] Kód adatok:', JSON.stringify(codeData));
        
        // Ellenőrizzük, hogy a kód már aktiválva van-e 
        if (codeData.status === 'active') {
          // Ellenőrizzük, hogy nem léptük-e túl a maximális eszközszámot
          const maxDevices = codeData.maxDevices || 3;
          if (codeData.devices && codeData.devices.length >= maxDevices) {
            console.log('[AuthService] A kód elérte a maximum eszközszámot:', codeData.devices.length);
            return { 
              valid: false, 
              message: `Ez a kód már a maximális számú eszközön (${maxDevices}) aktiválva van` 
            };
          }
          
          // Ellenőrizzük, hogy ez az eszköz már aktiválva van-e
          if (this.auth.currentUser && codeData.devices) {
            const deviceExists = codeData.devices.some(device => 
              device.deviceId === this.auth.currentUser.uid
            );
            
            if (deviceExists) {
              console.log('[AuthService] Ez az eszköz már aktiválva van');
              return { valid: true, message: 'Ez az eszköz már aktiválva van', alreadyActivated: true };
            }
          }
        }
        
        return { valid: true };
      } catch (dbError) {
        console.error('[AuthService] Adatbázis hiba a kód ellenőrzésekor:', dbError);
        return { valid: false, message: 'Adatbázis hiba: ' + dbError.message };
      }
    } catch (error) {
      console.error('[AuthService] Általános hiba a kód ellenőrzésekor:', error);
      return { valid: false, message: 'Hiba történt a kód ellenőrzésekor: ' + error.message };
    }
  }
  
  // Névtelen bejelentkezés
  async signInAnonymously() {
    try {
      console.log('[AuthService] Névtelen bejelentkezés megkezdése...');
      const result = await this.auth.signInAnonymously();
      console.log('[AuthService] Névtelen bejelentkezés sikeres:', result.user.uid);
      return result;
    } catch (error) {
      console.error('[AuthService] Névtelen bejelentkezési hiba:', error);
      throw error;
    }
  }
  
  // Kód aktiválása vagy új eszköz hozzáadása - JAVÍTOTT verzió
  async markCodeAsUsed(code, userId) {
    try {
      console.log('[AuthService] Kód aktiválása:', code, 'userId:', userId);
      
      if (!this.db) {
        throw new Error('Firestore nem inicializálódott!');
      }
      
      const codeRef = this.db.collection(this.CODES_COLLECTION).doc(code);
      console.log('[AuthService] Kód lekérése...');
      
      let codeDoc;
      try {
        codeDoc = await codeRef.get();
      } catch (getError) {
        console.error('[AuthService] Hiba a kód lekérésekor:', getError);
        throw new Error('Nem sikerült lekérni a kódot: ' + getError.message);
      }
      
      if (!codeDoc.exists) {
        console.error('[AuthService] A kód nem létezik:', code);
        throw new Error('Érvénytelen aktivációs kód');
      }
      
      const codeData = codeDoc.data();
      console.log('[AuthService] Kód adatok:', JSON.stringify(codeData));
      
      // Aktuális idő létrehozása
      const currentTime = new Date();
      console.log('[AuthService] Aktuális idő:', currentTime);
      
      // Eszköz információk
      const deviceInfo = {
        deviceId: userId,
        activatedAt: currentTime,
        deviceType: this._getDeviceType(),
        userAgent: navigator.userAgent
      };
      
      console.log('[AuthService] Eszköz információk:', JSON.stringify(deviceInfo));
      
      try {
        // Ellenőrizzük, hogy első aktiválás-e vagy új eszköz hozzáadása
        if (codeData.status === 'unused') {
          console.log('[AuthService] Első aktiválás...');
          // Első aktiválás
          await codeRef.update({
            status: 'active',
            devices: [deviceInfo]
          });
          console.log('[AuthService] Sikeres első aktiválás');
        } else {
          console.log('[AuthService] Már aktív kód, eszköz ellenőrzése...');
          // Ellenőrizzük, hogy ez az eszköz már szerepel-e a listában
          if (codeData.devices && codeData.devices.some(device => device.deviceId === userId)) {
            console.log('[AuthService] Ez az eszköz már a listában van, nincs szükség frissítésre');
            return true; // Már aktiválva van ez az eszköz
          }
          
          console.log('[AuthService] Új eszköz hozzáadása a listához...');
          // Új eszköz hozzáadása a listához (kézi összefűzéssel)
          const updatedDevices = [...(codeData.devices || []), deviceInfo];
          
          // Frissítés a teljes tömbbel
          await codeRef.update({
            devices: updatedDevices
          });
          console.log('[AuthService] Sikeres eszköz hozzáadás');
        }
        
        return true;
      } catch (updateError) {
        console.error('[AuthService] Frissítési hiba részletesen:', updateError);
        console.error('[AuthService] Hiba kód:', updateError.code);
        console.error('[AuthService] Hiba üzenet:', updateError.message);
        if (updateError.details) {
          console.error('[AuthService] További részletek:', updateError.details);
        }
        throw new Error('Nem sikerült frissíteni a kódot: ' + updateError.message);
      }
    } catch (error) {
      console.error('[AuthService] Hiba a kód használtként jelölésekor:', error);
      throw error;
    }
  }
  
  // Eszköz típus meghatározása
  _getDeviceType() {
    const ua = navigator.userAgent;
    if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
      return 'tablet';
    }
    if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(ua)) {
      return 'mobile';
    }
    return 'desktop';
  }
  
  // Hitelesítési adatok mentése
  async storeCredentials(user) {
    try {
      console.log('[AuthService] Hitelesítési adatok mentése:', user.uid);
      
      let token;
      try {
        token = await user.getIdToken();
      } catch (tokenError) {
        console.error('[AuthService] Hiba a token lekérésekor:', tokenError);
        token = 'token-error';
      }
      
      const authData = {
        userId: user.uid,
        token: token,
        createdAt: Date.now()
      };
      
      try {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(authData));
        console.log('[AuthService] Hitelesítési adatok sikeresen mentve');
      } catch (storageError) {
        console.error('[AuthService] Hiba a localStorage írása közben:', storageError);
      }
      
      return authData;
    } catch (error) {
      console.error('[AuthService] Hiba a hitelesítési adatok mentésekor:', error);
      throw error;
    }
  }
  
  // Kijelentkezés
  async signOut() {
    try {
      console.log('[AuthService] Kijelentkezés...');
      await this.auth.signOut();
      localStorage.removeItem(this.STORAGE_KEY);
      console.log('[AuthService] Kijelentkezés és adattörlés sikeres');
      return true;
    } catch (error) {
      console.error('[AuthService] Hiba a kijelentkezés során:', error);
      return false;
    }
  }
}

// Exportáljuk a szolgáltatást
window.authService = new AuthService();