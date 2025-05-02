// AuthService - A kalandkönyv autentikációs szolgáltatása (MÓDOSÍTOTT Verzió)
class AuthService {
  constructor() {
    // Ellenőrizzük, hogy a window.firebaseApp betöltődött-e már
    if (!window.firebaseApp || !window.firebaseApp.auth || !window.firebaseApp.db) {
      console.error("[AuthService] Hiba: Firebase App nem elérhető! Késleltetett inicializálás...");
       setTimeout(() => {
            if (window.firebaseApp && window.firebaseApp.auth && window.firebaseApp.db) {
               this._initializeFirebaseServices();
            } else {
               console.error("[AuthService] Firebase App még mindig nem elérhető inicializáláskor!");
            }
       }, 1000); // Vár 1 másodpercet
    } else {
        this._initializeFirebaseServices();
    }

    this.STORAGE_KEY = 'kalandkonyv_auth'; // Ezt használja a storeCredentials
    this.LAST_CODE_KEY = 'lastActivatedCode'; // ÚJ kulcs a kód tárolásához
    this.CODES_COLLECTION = 'activationCodes';

     if (this.auth) {
        this.auth.onAuthStateChanged(user => {
            if (user) {
                console.log('[AuthService] Felhasználó bejelentkezve:', user.uid);
            } else {
                console.log('[AuthService] Nincs bejelentkezett felhasználó');
                if (window.authTokenService) {
                    window.authTokenService.clearToken();
                }
                // Kijelentkezéskor töröljük a mentett kódot is
                try {
                    localStorage.removeItem(this.LAST_CODE_KEY);
                    console.log('[AuthService] Tárolt aktivációs kód törölve kijelentkezéskor.');
                } catch (e) { /* Hiba esetén nem baj */ }
            }
        });
    }
  }

  _initializeFirebaseServices() {
      this.auth = window.firebaseApp.auth;
      this.db = window.firebaseApp.db;
      console.log("[AuthService] Firebase szolgáltatások sikeresen inicializálva.");
  }

  async checkStoredAuth() {
    try {
      if (!this.auth || !this.db) {
          console.warn("[AuthService] Firebase szolgáltatások még nem állnak készen (checkStoredAuth).");
          await new Promise(resolve => setTimeout(resolve, 500));
          if (!this.auth || !this.db) {
              console.error("[AuthService] Firebase szolgáltatások nem inicializálódtak.");
              return null;
          }
      }
      console.log('[AuthService] Tárolt autentikáció ellenőrzése...');
      const storedAuth = localStorage.getItem(this.STORAGE_KEY);
      if (!storedAuth) {
        console.log('[AuthService] Nincs tárolt autentikáció');
        return null;
      }
      const authData = JSON.parse(storedAuth);
      console.log('[AuthService] Tárolt autentikáció betöltve:', authData.userId);

      if (this.auth.currentUser) {
        if (this.auth.currentUser.uid === authData.userId) {
          console.log('[AuthService] A bejelentkezett felhasználó megegyezik a tároltal');
           if (window.authTokenService && window.authTokenService.getAccessToken()) {
              console.log("[AuthService] Érvényes biztonsági token is található.");
           } else {
              console.warn("[AuthService] Nincs érvényes biztonsági token, aktiválás szükséges lehet.");
           }
           // Ellenőrizzük, van-e mentett kód
           const storedCode = localStorage.getItem(this.LAST_CODE_KEY);
           if (storedCode) {
               console.log("[AuthService] Tárolt aktivációs kód is található.");
           } else {
                console.warn("[AuthService] Nincs tárolt aktivációs kód (ez nem feltétlenül hiba).");
           }
          return this.auth.currentUser;
        } else {
            console.warn('[AuthService] Bejelentkezett user UID nem egyezik a tárolttal. Tárolt adatok törlése.');
            localStorage.removeItem(this.STORAGE_KEY);
            localStorage.removeItem(this.LAST_CODE_KEY); // Kódot is töröljük
            return null;
        }
      }

      try {
        console.log('[AuthService] Nincs aktív user, újra bejelentkezés...');
        await this.auth.signInAnonymously();
        if (this.auth.currentUser && this.auth.currentUser.uid === authData.userId) {
          console.log('[AuthService] Sikeres újra bejelentkezés, egyező UID');
           if (window.authTokenService && window.authTokenService.getAccessToken()) {
              console.log("[AuthService] Érvényes biztonsági token is található (újra bejelentkezés után).");
           } else {
              console.warn("[AuthService] Nincs érvényes biztonsági token (újra bejelentkezés után), aktiválás szükséges lehet.");
           }
            const storedCode = localStorage.getItem(this.LAST_CODE_KEY);
           if (storedCode) {
               console.log("[AuthService] Tárolt aktivációs kód is található (újra bejelentkezés után).");
           }
          return this.auth.currentUser;
        } else {
          console.error('[AuthService] Az új bejelentkezés UID-ja nem egyezik a tároltal!');
          localStorage.removeItem(this.STORAGE_KEY);
          localStorage.removeItem(this.LAST_CODE_KEY);
          return null;
        }
      } catch (error) {
        console.error('[AuthService] Hiba történt az újra bejelentkezés során:', error);
        localStorage.removeItem(this.STORAGE_KEY);
        localStorage.removeItem(this.LAST_CODE_KEY);
        return null;
      }
    } catch (error) {
      console.error('[AuthService] Hiba a tárolt autentikáció ellenőrzésekor:', error);
      return null;
    }
  }

  async verifyActivationCode(code) {
    try {
      if (!this.db) {
        console.warn("[AuthService] Firestore nem áll készen (verifyActivationCode).");
        await new Promise(resolve => setTimeout(resolve, 500));
         if (!this.db) {
            console.error('[AuthService] Firestore nem inicializálódott!');
            return { valid: false, message: 'Adatbázis kapcsolat hiba' };
         }
      }
      console.log('[AuthService] Kód ellenőrzése:', code); // A kapott (kötőjeles) kódot ellenőrizzük
      try {
        const codeDoc = await this.db.collection(this.CODES_COLLECTION).doc(code).get(); // Kötőjeles ID-val keresünk
        if (!codeDoc.exists) {
          console.log('[AuthService] A kód nem létezik az adatbázisban:', code);
          return { valid: false, message: 'Érvénytelen aktivációs kód' };
        }
        const codeData = codeDoc.data();
        console.log('[AuthService] Kód adatok:', JSON.stringify(codeData));

        if (codeData.status === 'blocked' || codeData.status === 'revoked') { // ÚJ: Blokkolt kód ellenőrzése
            console.warn('[AuthService] A kód le van tiltva:', code);
            return { valid: false, message: 'Ezt a kódot letiltották.' };
        }

        if (codeData.status === 'active') {
          const maxDevices = codeData.maxDevices || 3;
          const currentDevices = codeData.devices || [];
           let deviceAlreadyActivated = false;
           if (this.auth.currentUser) {
               deviceAlreadyActivated = currentDevices.some(device =>
                   device.deviceId === this.auth.currentUser.uid
               );
           }
           if (deviceAlreadyActivated) {
               console.log('[AuthService] Ez az eszköz már aktiválva van ezzel a kóddal.');
               return { valid: true, message: 'Ez az eszköz már aktiválva van', alreadyActivated: true };
           }
           if (currentDevices.length >= maxDevices) {
               console.log('[AuthService] A kód elérte a maximum eszközszámot:', currentDevices.length);
               return {
                   valid: false,
                   message: `Ez a kód már a maximális számú eszközön (${maxDevices}) aktiválva van.`
               };
           }
           return { valid: true };
        } else if (codeData.status === 'unused') {
            return { valid: true };
        } else {
            console.warn('[AuthService] Ismeretlen vagy érvénytelen kód státusz:', codeData.status);
            return { valid: false, message: 'A kód státusza ismeretlen vagy érvénytelen.'};
        }
      } catch (dbError) {
        console.error('[AuthService] Adatbázis hiba a kód ellenőrzésekor:', dbError);
        return { valid: false, message: 'Adatbázis hiba: ' + dbError.message };
      }
    } catch (error) {
      console.error('[AuthService] Általános hiba a kód ellenőrzésekor:', error);
      return { valid: false, message: 'Hiba történt a kód ellenőrzésekor: ' + error.message };
    }
  }

  async signInAnonymously() {
    try {
       if (!this.auth) {
           console.warn("[AuthService] Auth nem áll készen (signInAnonymously).");
           await new Promise(resolve => setTimeout(resolve, 500));
           if (!this.auth) {
               console.error('[AuthService] Auth nem inicializálódott!');
               throw new Error('Hitelesítési szolgáltatás nem elérhető.');
           }
       }
      console.log('[AuthService] Névtelen bejelentkezés megkezdése...');
      const result = await this.auth.signInAnonymously();
      console.log('[AuthService] Névtelen bejelentkezés sikeres:', result.user.uid);
      return result;
    } catch (error) {
      console.error('[AuthService] Névtelen bejelentkezési hiba:', error);
      throw error;
    }
  }

  async markCodeAsUsed(code, userId) { // 'code' itt a kötőjeles verzió
    try {
       if (!this.db) {
            console.warn("[AuthService] Firestore nem áll készen (markCodeAsUsed).");
            await new Promise(resolve => setTimeout(resolve, 500));
            if (!this.db) {
               console.error('[AuthService] Firestore nem inicializálódott!');
               throw new Error('Adatbázis kapcsolat hiba');
            }
        }
      console.log('[AuthService] Kód aktiválása/eszköz hozzáadása:', code, 'userId:', userId);
      const codeRef = this.db.collection(this.CODES_COLLECTION).doc(code); // Kötőjeles ID-t használunk
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
      const currentTime = new Date();
      console.log('[AuthService] Aktuális idő:', currentTime);
      const deviceInfo = {
        deviceId: userId,
        activatedAt: currentTime,
        deviceType: this._getDeviceType(),
        userAgent: navigator.userAgent
      };
      console.log('[AuthService] Eszköz információk:', JSON.stringify(deviceInfo));

      try {
        let needsFirestoreUpdate = false; // Csak akkor frissítünk, ha tényleg kell

        if (codeData.status === 'unused') {
          console.log('[AuthService] Első aktiválás...');
          await codeRef.update({
            status: 'active',
            devices: [deviceInfo]
          });
          console.log('[AuthService] Sikeres első aktiválás');
          needsFirestoreUpdate = true; // Valójában már megtörtént, de jelezzük
        } else if (codeData.status === 'active') {
          console.log('[AuthService] Már aktív kód, eszköz ellenőrzése/hozzáadása...');
          const currentDevices = codeData.devices || [];
          if (!currentDevices.some(device => device.deviceId === userId)) {
             const maxDevices = codeData.maxDevices || 3;
             if (currentDevices.length >= maxDevices) {
                 console.error('[AuthService] Hiba: Eszköz hozzáadása sikertelen, elérte a maximum limitet.');
                 throw new Error(`Ez a kód már a maximális számú eszközön (${maxDevices}) aktiválva van.`);
             }
             console.log('[AuthService] Új eszköz hozzáadása a listához...');
             const updatedDevices = [...currentDevices, deviceInfo];
             await codeRef.update({ devices: updatedDevices });
             console.log('[AuthService] Sikeres eszköz hozzáadás');
             needsFirestoreUpdate = true; // Valójában már megtörtént
          } else {
            console.log('[AuthService] Ez az eszköz már a listában van, nincs szükség Firestore frissítésre.');
          }
        } else {
            console.error('[AuthService] Érvénytelen kód státusz a frissítéskor:', codeData.status);
            throw new Error('A kód nem aktiválható státuszban van.');
        }

        // ----> ÚJ RÉSZ KEZDETE: Aktivációs kód mentése localStorage-ba <----
        // Ezt a Firestore művelet sikere UTÁN, de a token kérés ELŐTT/közben tesszük.
        try {
            // A 'code' változó itt a kötőjeles, érvényes kódot tartalmazza
            localStorage.setItem(this.LAST_CODE_KEY, code);
            console.log(`[AuthService] Aktivációs kód (${code}) elmentve a localStorage-ba.`);
        } catch (e) {
            console.error('[AuthService] Hiba az aktivációs kód localStorage-ba mentésekor:', e);
            // Nem állítjuk le a folyamatot, ha a mentés nem sikerül, de logoljuk
        }
        // ----> ÚJ RÉSZ VÉGE <----


        // Biztonságos token lekérése (marad ugyanaz)
        console.log('[AuthService] Biztonságos token lekérése...');
        if (window.authTokenService) {
          window.authTokenService.fetchAndStoreSecureToken(code)
            .then(token => {
              if (token) {
                console.log('[AuthService] Biztonságos token sikeresen lekérve és tárolva.');
              } else {
                console.warn('[AuthService] Nem sikerült biztonságos tokent lekérni aktiváció után.');
              }
            }).catch(tokenError => {
                 console.error('[AuthService] Hiba a fetchAndStoreSecureToken hívása után:', tokenError);
            });
        } else {
          console.error('[AuthService] AuthTokenService nem elérhető a token lekéréshez!');
        }

        return true;

      } catch (updateError) {
        console.error('[AuthService] Hiba a Firestore frissítésekor:', updateError);
        throw new Error(updateError.message || 'Nem sikerült frissíteni a kódot az adatbázisban.');
      }
    } catch (error) {
      console.error('[AuthService] Általános hiba a kód használtként jelölésekor:', error);
      throw error;
    }
  }

  _getDeviceType() {
    const ua = navigator.userAgent;
    if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) return 'tablet';
    if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(ua)) return 'mobile';
    return 'desktop';
  }

  async storeCredentials(user) {
    try {
      console.log('[AuthService] Alap hitelesítési adatok mentése:', user.uid);
      const authData = { userId: user.uid, createdAt: Date.now() };
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(authData));
      console.log('[AuthService] Alap hitelesítési adatok sikeresen mentve a localStorage-ba.');
      // A kód mentése már a markCodeAsUsed-ban történik.
      return authData;
    } catch (error) {
      console.error('[AuthService] Hiba a hitelesítési adatok mentésekor:', error);
      throw error;
    }
  }

  async signOut() {
    try {
       if (!this.auth) {
           console.warn("[AuthService] Auth nem áll készen (signOut).");
           await new Promise(resolve => setTimeout(resolve, 500));
           if (!this.auth) {
               console.error('[AuthService] Auth nem inicializálódott a kijelentkezéshez!');
               return false;
           }
       }
      console.log('[AuthService] Kijelentkezés...');
      await this.auth.signOut(); // Firebase kijelentkeztetés
      localStorage.removeItem(this.STORAGE_KEY); // Tárolt auth adatok törlése
      localStorage.removeItem(this.LAST_CODE_KEY); // Tárolt aktivációs kód törlése is!

      if (window.authTokenService) {
          window.authTokenService.clearToken();
      }
      console.log('[AuthService] Kijelentkezés és adattörlés sikeres');
      return true;
    } catch (error) {
      console.error('[AuthService] Hiba a kijelentkezés során:', error);
      return false;
    }
  }
}

// Globális példány létrehozása (marad ugyanaz)
if (window.firebaseApp) {
    window.authService = new AuthService();
} else {
    console.warn("[AuthService] Várakozás a window.firebaseApp elérhetőségére...");
    const checkInterval = setInterval(() => {
        if (window.firebaseApp) {
            clearInterval(checkInterval);
            window.authService = new AuthService();
            console.log("[AuthService] Globális példány létrehozva késleltetéssel.");
        }
    }, 100);
    setTimeout(() => {
        if (!window.authService) {
            clearInterval(checkInterval);
            console.error("[AuthService] Időtúllépés: window.firebaseApp nem lett elérhető!");
        }
    }, 5000);
}