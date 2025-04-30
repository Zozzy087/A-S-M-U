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
        console.log('Felhasználó bejelentkezve:', user.uid);
      } else {
        console.log('Nincs bejelentkezett felhasználó');
      }
    });
  }
  
  // Ellenőrzi, van-e tárolt autentikáció
  async checkStoredAuth() {
    try {
      const storedAuth = localStorage.getItem(this.STORAGE_KEY);
      if (!storedAuth) return null;
      
      const authData = JSON.parse(storedAuth);
      
      // Ellenőrizzük, hogy a tárolt token érvényes-e még
      if (this.auth.currentUser) {
        if (this.auth.currentUser.uid === authData.userId) {
          return this.auth.currentUser;
        }
      }
      
      // Próbáljunk meg újra bejelentkezni a tárolt adatokkal
      try {
        await this.auth.signInAnonymously();
        
        // Ellenőrizzük, hogy a kapott UID egyezik-e a tároltal
        if (this.auth.currentUser && this.auth.currentUser.uid === authData.userId) {
          return this.auth.currentUser;
        } else {
          // Ha nem egyezik, töröljük a tárolt adatokat
          localStorage.removeItem(this.STORAGE_KEY);
          return null;
        }
      } catch (error) {
        console.error('Hiba történt a bejelentkezés során:', error);
        localStorage.removeItem(this.STORAGE_KEY);
        return null;
      }
    } catch (error) {
      console.error('Hiba a tárolt autentikáció ellenőrzésekor:', error);
      return null;
    }
  }
  
  // Aktivációs kód ellenőrzése
  async verifyActivationCode(code) {
    try {
      const codeDoc = await this.db.collection(this.CODES_COLLECTION).doc(code).get();
      
      if (!codeDoc.exists) {
        return { valid: false, message: 'Érvénytelen aktivációs kód' };
      }
      
      const codeData = codeDoc.data();
      
      // Ellenőrizzük, hogy a kód már aktiválva van-e 
      if (codeData.status === 'active') {
        // Ellenőrizzük, hogy nem léptük-e túl a maximális eszközszámot
        const maxDevices = codeData.maxDevices || 3;
        if (codeData.devices && codeData.devices.length >= maxDevices) {
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
            return { valid: true, message: 'Ez az eszköz már aktiválva van', alreadyActivated: true };
          }
        }
      }
      
      return { valid: true };
    } catch (error) {
      console.error('Hiba a kód ellenőrzésekor:', error);
      return { valid: false, message: 'Hiba történt a kód ellenőrzésekor' };
    }
  }
  
  // Névtelen bejelentkezés
  async signInAnonymously() {
    try {
      return await this.auth.signInAnonymously();
    } catch (error) {
      console.error('Névtelen bejelentkezési hiba:', error);
      throw error;
    }
  }
  
  // Kód aktiválása vagy új eszköz hozzáadása - JAVÍTOTT verzió
  async markCodeAsUsed(code, userId) {
    try {
      const codeRef = this.db.collection(this.CODES_COLLECTION).doc(code);
      const codeDoc = await codeRef.get();
      
      if (!codeDoc.exists) {
        throw new Error('Érvénytelen aktivációs kód');
      }
      
      const codeData = codeDoc.data();
      
      // HIBA kijavítása: Ne használjunk serverTimestamp() tömb elemekben
      // Ehelyett JavaScript Date objektumot használunk
      const currentTime = new Date();
      
      // Eszköz információk - eltávolítjuk a FieldValue.serverTimestamp()-ot
      const deviceInfo = {
        deviceId: userId,
        // JAVÍTVA: JavaScript dátum objektumot használunk
        activatedAt: currentTime,
        deviceType: this._getDeviceType(),
        userAgent: navigator.userAgent
      };
      
      // Ellenőrizzük, hogy első aktiválás-e vagy új eszköz hozzáadása
      if (codeData.status === 'unused') {
        // Első aktiválás
        await codeRef.update({
          status: 'active',
          devices: [deviceInfo]
        });
      } else {
        // Új eszköz hozzáadása
        // Ellenőrizzük, hogy ez az eszköz már szerepel-e a listában
        if (codeData.devices && codeData.devices.some(device => device.deviceId === userId)) {
          return true; // Már aktiválva van ez az eszköz
        }
        
        // Új eszköz hozzáadása a listához (kézi összefűzéssel, nem FieldValue.arrayUnion-nal)
        const updatedDevices = [...(codeData.devices || []), deviceInfo];
        
        // Frissítés a teljes tömbbel
        await codeRef.update({
          devices: updatedDevices
        });
      }
      
      return true;
    } catch (error) {
      console.error('Hiba a kód használtként jelölésekor:', error);
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
      const token = await user.getIdToken();
      
      const authData = {
        userId: user.uid,
        token: token,
        createdAt: Date.now()
      };
      
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(authData));
      return authData;
    } catch (error) {
      console.error('Hiba a hitelesítési adatok mentésekor:', error);
      throw error;
    }
  }
  
  // Kijelentkezés
  async signOut() {
    try {
      await this.auth.signOut();
      localStorage.removeItem(this.STORAGE_KEY);
      return true;
    } catch (error) {
      console.error('Hiba a kijelentkezés során:', error);
      return false;
    }
  }
}

// Exportáljuk a szolgáltatást
window.authService = new AuthService();