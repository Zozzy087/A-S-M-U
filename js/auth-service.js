// AuthService - A kalandkönyv autentikációs szolgáltatása - Mobile-optimalizált verzió
class AuthService {
  constructor() {
    console.log("AuthService konstruktor elindult");
    
    // Firebase inicializálásának ellenőrzése
    if (!window.firebaseApp || !window.firebaseApp.auth || !window.firebaseApp.db) {
      console.error('Firebase nem inicializálódott megfelelően');
      
      // Megpróbáljuk manuálisan inicializálni, ha a firebase globális objektum létezik
      if (typeof firebase !== 'undefined') {
        try {
          console.log("Firebase SDK elérhető, kézi inicializálás megkísérlése...");
          
          // Firebase konfiguráció
          const firebaseConfig = {
            apiKey: "AIzaSyDxsN0vk0dAoDu7GYn2Bl8WoKDejy6q1vA",
            authDomain: "a-s-m-u.firebaseapp.com",
            projectId: "a-s-m-u",
            storageBucket: "a-s-m-u.firebasestorage.app",
            messagingSenderId: "317821756996",
            appId: "1:317821756996:web:61d1b94b291080592abe11",
            measurementId: "G-ENT3XNTKTE"
          };
          
          // Ellenőrizzük, hogy az alkalmazás már inicializálva van-e
          let firebaseApp;
          try {
            firebaseApp = firebase.app();
            console.log("Firebase már inicializálva van");
          } catch (e) {
            console.log("Firebase még nincs inicializálva, most inicializáljuk");
            firebaseApp = firebase.initializeApp(firebaseConfig);
          }
          
          // Szolgáltatások inicializálása
          const auth = firebase.auth();
          const db = firebase.firestore();
          
          // Globális objektumba mentés
          window.firebaseApp = {
            auth: auth,
            db: db
          };
          
          console.log("Firebase kézi inicializálása sikeres");
          
          this.auth = auth;
          this.db = db;
        } catch (initError) {
          console.error("Firebase kézi inicializálása sikertelen:", initError);
          // Alapértelmezett értékek, hogy ne kapjunk hibát később
          this.auth = null; 
          this.db = null;
        }
      } else {
        console.error("Firebase SDK nem érhető el egyáltalán!");
        this.auth = null; 
        this.db = null;
      }
    } else {
      console.log("Firebase szolgáltatások sikeresen elérve");
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
    
    // Mobilbarát beállítások Firebase-hez
    if (this.db) {
      try {
        // Növelt cache méret és offline perzisztencia engedélyezése
        // Ez segíthet a mobil kapcsolatok instabilitásának kezelésében
        this.db.settings({
          cacheSizeBytes: firebase.firestore.CACHE_SIZE_UNLIMITED
        });
        
        // Perzisztencia engedélyezése (offline használat)
        this.db.enablePersistence({ synchronizeTabs: true })
          .catch(err => {
            if (err.code === 'failed-precondition') {
              console.warn('Firestore perzisztencia nem engedélyezhető: több lap nyitva');
            } else if (err.code === 'unimplemented') {
              console.warn('A böngésző nem támogatja a Firestore perzisztenciát');
            } else {
              console.error('Firestore perzisztencia hiba:', err);
            }
          });
      } catch (settingsError) {
        console.warn('Firestore beállítások módosítása sikertelen:', settingsError);
      }
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
      console.log("checkStoredAuth() elindult");
      
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
        
        try {
          await this.auth.signOut();
        } catch (signOutError) {
          console.error('Kijelentkezési hiba:', signOutError);
          // Folytatjuk a következő lépéssel, ne szakadjon meg a folyamat
        }
      }
      
      // Próbáljunk meg újra bejelentkezni
      console.log('Megpróbálunk bejelentkezni a tárolt adatokkal...');
      try {
        const authResult = await this.auth.signInAnonymously();
        
        if (authResult && authResult.user) {
          console.log('Névtelen bejelentkezés sikeres:', authResult.user.uid);
          
          // Ellenőrizzük, hogy a kapott UID egyezik-e a tároltal
          if (authResult.user.uid === storedAuth.userId) {
            console.log('Az új bejelentkezés sikeresen visszaállította az eszközt');
            return authResult.user;
          } else {
            console.log('Az új bejelentkezés nem egyezik a tárolt adatokkal, törlés...');
            this._removeFromStorage(this.STORAGE_KEY);
            return null;
          }
        } else {
          console.error('Bejelentkezés sikeres volt, de nincs user objektum');
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
  
  // Aktivációs kód ellenőrzése - mobilra optimalizált
  async verifyActivationCode(code) {
    try {
      console.log("verifyActivationCode() elindult, kód:", code);
      
      // Ellenőrizzük, hogy a Firebase inicializálódott-e
      if (!this.auth || !this.db) {
        console.error('Firebase szolgáltatások nem érhetők el');
        return { 
          valid: false, 
          message: 'Hiba: Firebase szolgáltatások nem érhetők el. Frissítsd az oldalt és próbáld újra!' 
        };
      }
      
      // Ellenőrizzük a kód formátumát
      if (!code || code.length < 8) {
        return { 
          valid: false, 
          message: 'Érvénytelen aktivációs kód formátum' 
        };
      }
      
      // Ellenőrizzük, hogy van-e bejelentkezett felhasználó
      if (!this.auth.currentUser) {
        return { 
          valid: false, 
          message: 'Nincs bejelentkezett felhasználó. Frissítsd az oldalt és próbáld újra!' 
        };
      }
      
      console.log('Kód ellenőrzése az adatbázisban:', code);
      
      try {
        // Timeout kezelés - mobilon lassabb lehet a kapcsolat
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Időtúllépés a kód ellenőrzésekor')), 10000)
        );
        
        // Adatbázis lekérés
        const dbPromise = this.db.collection(this.CODES_COLLECTION).doc(code).get();
        
        // A kettő közül amelyik előbb teljesül
        const codeDoc = await Promise.race([dbPromise, timeoutPromise]);
        
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
      } catch (dbError) {
        console.error('Adatbázis hiba a kód ellenőrzésekor:', dbError);
        
        // Speciális hibaüzenetek a különböző esetekre
        if (dbError.message && dbError.message.includes('timeout')) {
          return { 
            valid: false, 
            message: 'Időtúllépés a szerverkapcsolatkor. Ellenőrizd az internetkapcsolatot és próbáld újra!' 
          };
        }
        
        if (dbError.code === 'permission-denied') {
          return { 
            valid: false, 
            message: 'Nincs jogosultságod az aktivációs kód ellenőrzéséhez' 
          };
        }
        
        return { 
          valid: false, 
          message: `Hiba a kód ellenőrzésekor: ${dbError.message || 'Adatbázis hiba'}` 
        };
      }
    } catch (error) {
      console.error('Általános hiba a kód ellenőrzésekor:', error);
      return { 
        valid: false, 
        message: `Hiba történt a kód ellenőrzésekor: ${error.message || 'Ismeretlen hiba'}` 
      };
    }
  }

  // Névtelen bejelentkezés - mobilra optimalizált
  async signInAnonymously() {
    try {
      console.log("signInAnonymously() elindult");
      
      // Ellenőrizzük, hogy a Firebase inicializálódott-e
      if (!this.auth) {
        console.error('Firebase Auth nem érhető el');
        throw new Error('Firebase Auth nem érhető el');
      }
      
      // Ellenőrizzük, hogy már van-e bejelentkezett felhasználó
      if (this.auth.currentUser) {
        console.log('Már van bejelentkezett felhasználó:', this.auth.currentUser.uid);
        return { user: this.auth.currentUser };
      }
      
      console.log('Névtelen bejelentkezés kísérlet...');
      
      // Timeout kezelés
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Időtúllépés a bejelentkezés során')), 15000)
      );
      
      // Firebase bejelentkezés
      const authPromise = this.auth.signInAnonymously();
      
      // Amelyik előbb teljesül
      const result = await Promise.race([authPromise, timeoutPromise]);
      
      console.log('Névtelen bejelentkezés sikeres:', result.user?.uid);
      return result;
    } catch (error) {
      console.error('Névtelen bejelentkezési hiba:', error);
      
      // Speciális hibaüzenetek a gyakori esetekre
      if (error.code === 'auth/network-request-failed') {
        throw new Error('Nincs internetkapcsolat a bejelentkezéshez');
      }
      
      if (error.message && error.message.includes('timeout')) {
        throw new Error('Időtúllépés a bejelentkezés során. Ellenőrizd az internetkapcsolatot!');
      }
      
      throw error;
    }
  }
  
  // A kódot megjelöli aktívként és hozzáadja az eszközt - mobilra optimalizált
  async markCodeAsActive(code, userId) {
    try {
      console.log("markCodeAsActive() elindult");
      
      // Ellenőrizzük, hogy a Firebase inicializálódott-e
      if (!this.db) {
        console.error('Firebase Firestore nem érhető el');
        throw new Error('Firebase Firestore nem érhető el');
      }
      
      // Érvényes paraméterek ellenőrzése
      if (!code || !userId) {
        throw new Error('Érvénytelen paraméterek: kód vagy userId hiányzik');
      }
      
      console.log('Kód aktiválása:', code, 'eszköz:', userId);
      
      // Kód dokumentum lekérése
      const codeRef = this.db.collection(this.CODES_COLLECTION).doc(code);
      
      try {
        // Timeout kezelés
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Időtúllépés az adatbázis elérésekor')), 10000)
        );
        
        // Adatbázis lekérdezés
        const dbPromise = codeRef.get();
        
        // Amelyik előbb teljesül
        const codeDoc = await Promise.race([dbPromise, timeoutPromise]);
        
        if (!codeDoc.exists) {
          console.error('A kód nem létezik:', code);
          throw new Error('A kód nem létezik az adatbázisban');
        }
        
        const codeData = codeDoc.data();
        const currentDevices = codeData.devices || [];
        
        console.log('Jelenlegi eszközök:', JSON.stringify(currentDevices));
        
        // Ellenőrizzük, hogy ez az eszköz már szerepel-e
        const deviceExists = currentDevices.some(device => device.deviceId === userId);
        
        // Ha az eszköz már szerepel a listában, nincs szükség frissítésre
        if (deviceExists) {
          console.log('Ez az eszköz már szerepel a listában, nincs szükség frissítésre');
          return true;
        }
        
        // Ellenőrizzük, hogy nincs-e túl sok eszköz
        const maxDevices = codeData.maxDevices || 3;
        if (currentDevices.length >= maxDevices) {
          throw new Error(`A kód már elérte a maximum használható eszközök számát (${maxDevices})`);
        }
        
        // Új eszköz hozzáadása
        const updatedDevices = [
          ...currentDevices,
          {
            deviceId: userId,
            activatedAt: this.db.firestore.FieldValue.serverTimestamp(),
            // Eszköz típus információk tárolása
            deviceType: /Android|webOS|iPhone|iPad|iPod/i.test(navigator.userAgent) ? 'mobile' : 'desktop',
            userAgent: navigator.userAgent.substring(0, 100) // Limitált hosszúság
          }
        ];
        
        console.log('Frissített eszközlista:', JSON.stringify(updatedDevices));
        
        // Kód státuszának és eszközlistájának frissítése
        try {
          // Transaction használata a konkurenciakezeléshez
          await this.db.runTransaction(async (transaction) => {
            // Újra lekérjük a dokumentumot a tranzakción belül
            const codeSnapshot = await transaction.get(codeRef);
            
            if (!codeSnapshot.exists) {
              throw new Error('A kód nem létezik a tranzakció során');
            }
            
            // Aktuális adatok a tranzakción belül
            const latestData = codeSnapshot.data();
            const latestDevices = latestData.devices || [];
            
            // Újra ellenőrizzük, hogy az eszköz már szerepel-e
            const deviceExistsInTransaction = latestDevices.some(device => device.deviceId === userId);
            
            if (deviceExistsInTransaction) {
              console.log('Az eszköz már szerepel (tranzakción belüli ellenőrzés)');
              return; // Kilépünk a tranzakcióból változtatás nélkül
            }
            
            // Ellenőrizzük a max eszközök számát újra
            if (latestDevices.length >= maxDevices) {
              throw new Error(`A kód már elérte a maximum eszközszámot (${maxDevices}) a tranzakción belül`);
            }
            
            // Új eszköz hozzáadása a legfrissebb állapothoz
            const updatedDevicesInTransaction = [
              ...latestDevices,
              {
                deviceId: userId,
                activatedAt: this.db.firestore.FieldValue.serverTimestamp(),
                deviceType: /Android|webOS|iPhone|iPad|iPod/i.test(navigator.userAgent) ? 'mobile' : 'desktop',
                userAgent: navigator.userAgent.substring(0, 100)
              }
            ];
            
            // Frissítjük az adatbázist
            transaction.update(codeRef, {
              status: 'active',  // "unused" → "active"
              devices: updatedDevicesInTransaction,
              lastUpdated: this.db.firestore.FieldValue.serverTimestamp()
            });
          });
          
          console.log('Kód sikeresen aktiválva tranzakcióval, eszköz hozzáadva');
          return true;
        } catch (transactionError) {
          console.error('Tranzakciós hiba:', transactionError);
          
          // Hiba esetén egyszerű update-tel próbálkozunk
          await codeRef.update({
            status: 'active',  // "unused" → "active"
            devices: updatedDevices,
            lastUpdated: this.db.firestore.FieldValue.serverTimestamp()
          });
          
          console.log('Kód sikeresen aktiválva egyszerű update-tel, eszköz hozzáadva');
          return true;
        }
      } catch (dbError) {
        console.error('Adatbázis hiba a kód aktiválásakor:', dbError);
        
        // Speciális hibaüzenetek
        if (dbError.code === 'permission-denied') {
          throw new Error('Nincs jogosultságod a kód aktiválásához');
        }
        
        if (dbError.message && dbError.message.includes('timeout')) {
          throw new Error('Időtúllépés a szerverkapcsolatkor. Ellenőrizd az internetkapcsolatot!');
        }
        
        throw new Error(`Adatbázis hiba: ${dbError.message || 'Ismeretlen'}`);
      }
    } catch (error) {
      console.error('Általános hiba a kód aktiválásakor:', error);
      throw error;
    }
  }
  
  // Hitelesítési adatok mentése - mobilra optimalizált
  async storeCredentials(user) {
    try {
      console.log("storeCredentials() elindult");
      
      // Ellenőrizzük, hogy a paraméter érvényes-e
      if (!user || !user.uid) {
        console.error('Érvénytelen felhasználó:', user);
        throw new Error('Érvénytelen felhasználó objektum');
      }
      
      console.log('Hitelesítési adatok mentése:', user.uid);
      
      try {
        // Token lekérése 15 másodperces időkorláttal
        const tokenPromise = user.getIdToken();
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Időtúllépés a token lekérésénél')), 15000)
        );
        
        const token = await Promise.race([tokenPromise, timeoutPromise]);
        
        // Bővített autentikációs adatok, többszörös redundanciával
        const authData = {
          userId: user.uid,
          token: token,
          createdAt: Date.now(),
          // Eszközazonosítási információk
          deviceInfo: {
            userAgent: navigator.userAgent,
            platform: navigator.platform,
            isMobile: /Android|webOS|iPhone|iPad|iPod/i.test(navigator.userAgent)
          },
          // Biztonsági jelzők
          securityFlags: {
            storedAt: new Date().toISOString()
          }
        };
        
        // Biztonságos mentés a localStorage-ba
        const success = this._saveToStorage(this.STORAGE_KEY, authData);
        
        // Cookie-ba is elmentjük (fallback)
        try {
          document.cookie = `${this.STORAGE_KEY}_uid=${user.uid}; path=/; max-age=31536000; SameSite=Strict`;
        } catch (cookieError) {
          console.warn('Cookie mentési hiba:', cookieError);
        }
        
        if (success) {
          console.log('Hitelesítési adatok sikeresen mentve');
        } else {
          console.warn('Nem sikerült menteni a hitelesítési adatokat localStorage-ba, de folytatjuk');
        }
        
        return authData;
      } catch (tokenError) {
        console.error('Hiba a token lekérésekor:', tokenError);
        
        // Ha a token lekérés hibával jár, mentsük legalább a userId-t
        const fallbackData = {
          userId: user.uid,
          createdAt: Date.now(),
          fallback: true,
          errorMessage: tokenError.message || 'Ismeretlen token hiba'
        };
        
        this._saveToStorage(this.STORAGE_KEY, fallbackData);
        
        // Cookie-ba is elmentjük (fallback)
        try {
          document.cookie = `${this.STORAGE_KEY}_uid=${user.uid}; path=/; max-age=31536000; SameSite=Strict`;
        } catch (cookieError) {
          console.warn('Cookie mentési hiba:', cookieError);
        }
        
        console.log('Egyszerűsített hitelesítési adatok mentve');
        
        return fallbackData;
      }
    } catch (error) {
      console.error('Hiba a hitelesítési adatok mentésekor:', error);
      throw error;
    }
  }
  
  // Kijelentkezés - mobilra optimalizált
  async signOut() {
    try {
      console.log("signOut() elindult");
      
      // Ellenőrizzük, hogy a Firebase inicializálódott-e
      if (!this.auth) {
        console.error('Firebase Auth nem érhető el');
        return false;
      }
      
      console.log('Kijelentkezés megkezdése...');
      
      try {
        await this.auth.signOut();
        console.log('Firebase kijelentkezés sikeres');
      } catch (signOutError) {
        console.error('Hiba a Firebase kijelentkezéskor:', signOutError);
        // Folytatjuk a többi lépéssel attól függetlenül
      }
      
      // Lokális adatok törlése
      this._removeFromStorage(this.STORAGE_KEY);
      
      // Cookie törlése
      try {
        document.cookie = `${this.STORAGE_KEY}_uid=; path=/; max-age=0; SameSite=Strict`;
      } catch (cookieError) {
        console.warn('Cookie törlési hiba:', cookieError);
      }
      
      console.log('Kijelentkezés és adattörlés sikeres');
      return true;
    } catch (error) {
      console.error('Hiba a kijelentkezés során:', error);
      return false;
    }
  }
}

// Exportáljuk a szolgáltatást
if (!window.authService) {
  console.log("AuthService példány létrehozása");
  window.authService = new AuthService();
} else {
  console.log("AuthService példány már létezik");
}