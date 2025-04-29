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
      
      if (codeData.status === 'used') {
        return { valid: false, message: 'Ez a kód már fel lett használva' };
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
  
  // Kód megjelölése használtként
  async markCodeAsUsed(code, userId) {
    try {
      const codeRef = this.db.collection(this.CODES_COLLECTION).doc(code);
      
      // Atomikusan frissítjük a dokumentumot
      await codeRef.update({
        status: 'used',
        usedBy: userId,
        usedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      
      return true;
    } catch (error) {
      console.error('Hiba a kód használtként jelölésekor:', error);
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