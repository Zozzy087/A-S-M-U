// AuthService - A kalandkönyv autentikációs szolgáltatása
class AuthService {
  constructor() {
    // Ellenőrizzük, hogy a Firebase sikeresen inicializálódott-e
    if (!window.firebaseApp || !window.firebaseApp.auth || !window.firebaseApp.db) {
      console.error('Firebase nem inicializálódott megfelelően');
      // Alapértelmezett értékek, hogy ne kapjunk hibát később
      this.auth = null; 
      this.db = null;
    } else {
      this.auth = window.firebaseApp.auth;
      this.db = window.firebaseApp.db;
    }
    
    this.STORAGE_KEY = 'kalandkonyv_auth';
    this.CODES_COLLECTION = 'activationCodes';
    
    // Autentikáció változásának figyelése (csak ha sikeresen inicializálódott)
    if (this.auth) {
      this.auth.onAuthStateChanged(user => {
        if (user) {
          console.log('Felhasználó bejelentkezve:', user.uid);
        } else {
          console.log('Nincs bejelentkezett felhasználó');
        }
      });
    }
  }
  
  // Helyi tárolás elérhetőségének ellenőrzése
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
  
  // Adatok biztonságos mentése localStorage-ba
  _saveToStorage(key, data) {
    if (!this._isStorageAvailable()) return false;
    
    try {
      localStorage.setItem(key, JSON.stringify(data));
      return true;
    } catch (error) {
      console.error('Hiba a localStorage írása közben:', error);
      return false;
    }
  }
  
  // Adatok biztonságos olvasása localStorage-ból
  _loadFromStorage(key) {
    if (!this._isStorageAvailable()) return null;
    
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch (error) {
      console.error('Hiba a localStorage olvasása közben:', error);
      return null;
    }
  }
  
  // Adat törlése a localStorage-ból
  _removeFromStorage(key) {
    if (!this._isStorageAvailable()) return;
    
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error('Hiba a localStorage törlése közben:', error);
    }
  }
  
  // Ellenőrzi, van-e tárolt autentikáció
  async checkStoredAuth() {
    try {
      // Ellenőrizzük, hogy a Firebase inicializálódott-e
      if (!this.auth || !this.db) {
        console.error('Firebase szolgáltatások nem érhetők el');
        return null;
      }
      
      // Adatok betöltése a localStorage-ból
      const storedAuth = this._loadFromStorage(this.STORAGE_KEY);
      if (!storedAuth) {
        console.log('Nincs tárolt autentikáció');
        return null;
      }
      
      console.log('Tárolt autentikáció betöltve:', storedAuth.userId);
      
      // Ellenőrizzük, hogy a tárolt token érvényes-e még
      if (this.auth.currentUser) {
        console.log('Már van bejelentkezett felhasználó:', this.auth.currentUser.uid);
        if (this.auth.currentUser.uid === storedAuth.userId) {
          console.log('A bejelentkezett felhasználó egyezik a tárolttal');
          return this.auth.currentUser;
        }
        console.log('A bejelentkezett felhasználó különbözik a tároltól, kijelentkezés...');
        await this.auth.signOut(); // Kiléptetjük, mert nem egyezik
      }
      
      // Próbáljunk meg újra bejelentkezni
      console.log('Megpróbálunk bejelentkezni a tárolt adatokkal...');
      try {
        await this.auth.signInAnonymously();
        console.log('Névtelen bejelentkezés sikeres:', this.auth.currentUser?.uid);
        
        // Ellenőrizzük, hogy a kapott UID egyezik-e a tároltal
        if (this.auth.currentUser && this.auth.currentUser.uid === storedAuth.userId) {
          console.log('Az új bejelentkezés sikeresen visszaállította az eszközt');
          return this.auth.currentUser;
        } else {
          console.log('Az új bejelentkezés nem egyezik a tárolt adatokkal, törlés...');
          this._removeFromStorage(this.STORAGE_KEY);
          return null;
        }
      } catch (error) {
        console.error('Hiba történt a bejelentkezés során:', error);
        this._removeFromStorage(this.STORAGE_KEY);
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
      // Ellenőrizzük, hogy a Firebase inicializálódott-e
      if (!this.auth || !this.db) {
        console.error('Firebase szolgáltatások nem érhetők el');
        return { valid: false, message: 'Hiba: Firebase szolgáltatások nem érhetők el' };
      }
      
      console.log('Kód ellenőrzése:', code);
      const codeDoc = await this.db.collection(this.CODES_COLLECTION).doc(code).get();
      
      if (!codeDoc.exists) {
        console.log('A kód nem létezik:', code);
        return { valid: false, message: 'Érvénytelen aktivációs kód' };
      }
      
      const codeData = codeDoc.data();
      const currentUser = this.auth.currentUser;
      
      console.log('Kód adatok:', JSON.stringify(codeData));
      console.log('Jelenlegi felhasználó:', currentUser?.uid);
      
      // 1. Ellenőrzés: A kód állapota
      if (codeData.status === 'unused') {
        // Ez egy új, még nem használt kód - azonnal érvényesíthető
        console.log('Új, nem használt kód');
        return { valid: true };
      } 
      else if (codeData.status === 'active') {
        // Ez egy már aktív kód, ellenőrizzük az eszközöket
        console.log('Már aktív kód, eszközök ellenőrzése');
        
        // 1.a Ellenőrzés: Van-e devices tömb
        const devices = codeData.devices || [];
        
        // 1.b Ellenőrzés: Ez az eszköz már szerepel-e a listában?
        const deviceExists = devices.some(device => device.deviceId === currentUser?.uid);
        if (deviceExists) {
          // Ez az eszköz már hitelesítve van, engedélyezzük az újbóli használatot
          console.log('Ez az eszköz már aktiválva van ezen a kódon');
          return { valid: true, alreadyActivated: true };
        }
        
        // 1.c Ellenőrzés: Van-e még hely új eszköz számára?
        const maxDevices = codeData.maxDevices || 3; // Alapértelmezetten 3
        if (devices.length >= maxDevices) {
          console.log('A kód elérte a maximum eszközszámot:', devices.length, '>=', maxDevices);
          return { 
            valid: false, 
            message: `Ez a kód már elérte a maximum használható eszközök számát (${maxDevices})` 
          };
        }
        
        // Ha ideáig eljutottunk, a kód egy új eszközön aktiválható
        console.log('A kód aktiválható új eszközön');
        return { valid: true };
      } 
      else {
        // Bármilyen más állapot (pl. "expired", ha később bevezetjük)
        console.log('A kód nem használható állapotban van:', codeData.status);
        return { valid: false, message: 'Ez a kód már nem használható' };
      }
    } catch (error) {
      console.error('Hiba a kód ellenőrzésekor:', error);
      return { valid: false, message: 'Hiba történt a kód ellenőrzésekor' };
    }
  }

  // Névtelen bejelentkezés
  async signInAnonymously() {
    try {
      // Ellenőrizzük, hogy a Firebase inicializálódott-e
      if (!this.auth) {
        console.error('Firebase Auth nem érhető el');
        throw new Error('Firebase Auth nem érhető el');
      }
      
      console.log('Névtelen bejelentkezés kísérlet...');
      const result = await this.auth.signInAnonymously();
      console.log('Névtelen bejelentkezés sikeres:', result.user?.uid);
      return result;
    } catch (error) {
      console.error('Névtelen bejelentkezési hiba:', error);
      throw error;
    }
  }
  
  // A kódot megjelöli aktívként és hozzáadja az eszközt
  async markCodeAsActive(code, userId) {
    try {
      // Ellenőrizzük, hogy a Firebase inicializálódott-e
      if (!this.db) {
        console.error('Firebase Firestore nem érhető el');
        throw new Error('Firebase Firestore nem érhető el');
      }
      
      console.log('Kód aktiválása:', code, 'eszköz:', userId);
      const codeRef = this.db.collection(this.CODES_COLLECTION).doc(code);
      const codeDoc = await codeRef.get();
      
      if (!codeDoc.exists) {
        console.error('A kód nem létezik:', code);
        throw new Error('A kód nem létezik');
      }
      
      const codeData = codeDoc.data();
      const currentDevices = codeData.devices || [];
      
      console.log('Jelenlegi eszközök:', JSON.stringify(currentDevices));
      
      const deviceExists = currentDevices.some(device => device.deviceId === userId);
      
      // Ha az eszköz már szerepel a listában, nincs szükség frissítésre
      if (deviceExists) {
        console.log('Ez az eszköz már szerepel a listában, nincs szükség frissítésre');
        return true;
      }
      
      // Új eszköz hozzáadása
      const updatedDevices = [
        ...currentDevices,
        {
          deviceId: userId,
          activatedAt: this.db.firestore.FieldValue.serverTimestamp()
        }
      ];
      
      console.log('Frissített eszközlista:', JSON.stringify(updatedDevices));
      
      // Kód státuszának és eszközlistájának frissítése
      await codeRef.update({
        status: 'active',  // "unused" → "active"
        devices: updatedDevices
      });
      
      console.log('Kód sikeresen aktiválva, eszköz hozzáadva');
      return true;
    } catch (error) {
      console.error('Hiba a kód aktiválásakor:', error);
      throw error;
    }
  }
  
  // Hitelesítési adatok mentése
  async storeCredentials(user) {
    try {
      // Ellenőrizzük, hogy a paraméter érvényes-e
      if (!user || !user.uid) {
        console.error('Érvénytelen felhasználó:', user);
        throw new Error('Érvénytelen felhasználó');
      }
      
      console.log('Hitelesítési adatok mentése:', user.uid);
      
      try {
        const token = await user.getIdToken();
        
        const authData = {
          userId: user.uid,
          token: token,
          createdAt: Date.now()
        };
        
        // Biztonságos mentés a localStorage-ba
        const success = this._saveToStorage(this.STORAGE_KEY, authData);
        
        if (success) {
          console.log('Hitelesítési adatok sikeresen mentve');
        } else {
          console.warn('Nem sikerült menteni a hitelesítési adatokat, de folytatjuk');
        }
        
        return authData;
      } catch (tokenError) {
        console.error('Hiba a token lekérésekor:', tokenError);
        
        // Ha a token lekérés hibával jár, mentsük legalább a userId-t
        const fallbackData = {
          userId: user.uid,
          createdAt: Date.now()
        };
        
        this._saveToStorage(this.STORAGE_KEY, fallbackData);
        console.log('Egyszerűsített hitelesítési adatok mentve');
        
        return fallbackData;
      }
    } catch (error) {
      console.error('Hiba a hitelesítési adatok mentésekor:', error);
      throw error;
    }
  }
  
  // Kijelentkezés
  async signOut() {
    try {
      // Ellenőrizzük, hogy a Firebase inicializálódott-e
      if (!this.auth) {
        console.error('Firebase Auth nem érhető el');
        return false;
      }
      
      console.log('Kijelentkezés...');
      await this.auth.signOut();
      this._removeFromStorage(this.STORAGE_KEY);
      console.log('Kijelentkezés és adattörlés sikeres');
      return true;
    } catch (error) {
      console.error('Hiba a kijelentkezés során:', error);
      return false;
    }
  }
}

// Exportáljuk a szolgáltatást
window.authService = new AuthService();