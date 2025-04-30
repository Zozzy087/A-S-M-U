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
      const currentUser = this.auth.currentUser;
      
      // 1. Ellenőrzés: A kód állapota
      if (codeData.status === 'unused') {
        // Ez egy új, még nem használt kód - azonnal érvényesíthető
        return { valid: true };
      } 
      else if (codeData.status === 'active') {
        // Ez egy már aktív kód, ellenőrizzük az eszközöket
        
        // 1.a Ellenőrzés: Van-e devices tömb
        const devices = codeData.devices || [];
        
        // 1.b Ellenőrzés: Ez az eszköz már szerepel-e a listában?
        const deviceExists = devices.some(device => device.deviceId === currentUser?.uid);
        if (deviceExists) {
          // Ez az eszköz már hitelesítve van, engedélyezzük az újbóli használatot
          return { valid: true, alreadyActivated: true };
        }
        
        // 1.c Ellenőrzés: Van-e még hely új eszköz számára?
        const maxDevices = codeData.maxDevices || 3; // Alapértelmezetten 3
        if (devices.length >= maxDevices) {
          return { 
            valid: false, 
            message: `Ez a kód már elérte a maximum használható eszközök számát (${maxDevices})` 
          };
        }
        
        // Ha ideáig eljutottunk, a kód egy új eszközön aktiválható
        return { valid: true };
      } 
      else {
        // Bármilyen más állapot (pl. "expired", ha később bevezetjük)
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
      return await this.auth.signInAnonymously();
    } catch (error) {
      console.error('Névtelen bejelentkezési hiba:', error);
      throw error;
    }
  }
  
  // A kódot megjelöli aktívként és hozzáadja az eszközt
  async markCodeAsActive(code, userId) {
  try {
    const codeRef = this.db.collection(this.CODES_COLLECTION).doc(code);
    const codeDoc = await codeRef.get();
    
    if (!codeDoc.exists) {
      throw new Error('A kód nem létezik');
    }
    
    const codeData = codeDoc.data();
    const currentDevices = codeData.devices || [];
    const deviceExists = currentDevices.some(device => device.deviceId === userId);
    
    // Ha az eszköz már szerepel a listában, nincs szükség frissítésre
    if (deviceExists) {
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
    
    // Kód státuszának és eszközlistájának frissítése
    await codeRef.update({
      status: 'active',  // "unused" → "active"
      devices: updatedDevices
    });
    
    return true;
  } catch (error) {
    console.error('Hiba a kód aktiválásakor:', error);
    throw error;
  }
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