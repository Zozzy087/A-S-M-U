// AuthService - A kalandkönyv autentikációs szolgáltatása (MÓDOSÍTOTT Verzió)
class AuthService {
  constructor() {
    // Ellenőrizzük, hogy a window.firebaseApp betöltődött-e már
    if (!window.firebaseApp || !window.firebaseApp.auth || !window.firebaseApp.db) {
      console.error("[AuthService] Hiba: Firebase App nem elérhető! Késleltetett inicializálás...");
      // Esetleg itt lehetne egy újrapróbálkozó mechanizmus, de egyszerűbb, ha a config előbb töltődik be.
      // Jelenleg hibát dobhat, ha a config.js később töltődik be.
      // Ideiglenes megoldás: várjunk egy kicsit
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

    this.STORAGE_KEY = 'kalandkonyv_auth';
    this.CODES_COLLECTION = 'activationCodes';

     // Ha az inicializálás sikeres volt, figyeljük az auth állapotot
     if (this.auth) {
        // Autentikáció változásának figyelése
        this.auth.onAuthStateChanged(user => {
            if (user) {
                console.log('[AuthService] Felhasználó bejelentkezve:', user.uid);
                // Itt lehetne ellenőrizni, van-e már token, és ha nincs, kell-e kérni?
                // De a logikánk szerint csak aktivációkor kérünk tokent.
            } else {
                console.log('[AuthService] Nincs bejelentkezett felhasználó');
                // Kijelentkezéskor töröljük a biztonsági tokent is
                if (window.authTokenService) {
                    window.authTokenService.clearToken();
                }
            }
        });
    }
  }

  // Segédfüggvény a Firebase szolgáltatások inicializálásához
  _initializeFirebaseServices() {
      this.auth = window.firebaseApp.auth;
      this.db = window.firebaseApp.db;
      console.log("[AuthService] Firebase szolgáltatások sikeresen inicializálva.");
  }


  // Ellenőrzi, van-e tárolt autentikáció
  async checkStoredAuth() {
    try {
      // Biztosítjuk, hogy az inicializálás befejeződött
      if (!this.auth || !this.db) {
          console.warn("[AuthService] Firebase szolgáltatások még nem állnak készen (checkStoredAuth).");
          // Várjunk egy kicsit és próbáljuk újra, vagy adjunk vissza null-t
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

      // Ellenőrizzük, hogy a jelenlegi Firebase user egyezik-e
      if (this.auth.currentUser) {
        if (this.auth.currentUser.uid === authData.userId) {
          console.log('[AuthService] A bejelentkezett felhasználó megegyezik a tároltal');
          // Itt ellenőrizhetnénk a biztonsági token érvényességét is
           if (window.authTokenService && window.authTokenService.getAccessToken()) {
              console.log("[AuthService] Érvényes biztonsági token is található.");
           } else {
              console.warn("[AuthService] Nincs érvényes biztonsági token, aktiválás szükséges lehet.");
              // Opcionálisan törölhetjük a tárolt auth adatokat, ha token nélkül érvénytelen
              // localStorage.removeItem(this.STORAGE_KEY); return null;
           }
          return this.auth.currentUser;
        } else {
            // Ha van bejelentkezett user, de nem egyezik a tárolttal, az hiba/konfliktus
            console.warn('[AuthService] Bejelentkezett user UID nem egyezik a tárolttal. Tárolt adatok törlése.');
            localStorage.removeItem(this.STORAGE_KEY);
            // Kijelentkeztetjük a nem várt usert? Vagy csak null-t adunk vissza?
            // await this.auth.signOut(); // Óvatosan ezzel
            return null;
        }
      }

      // Ha nincs aktuális user, próbáljunk meg (névtelenül) bejelentkezni
      // Megjegyzés: Ha nem csak névtelen auth van, ez a logika bonyolultabb lehet
      try {
        console.log('[AuthService] Nincs aktív user, újra bejelentkezés...');
        await this.auth.signInAnonymously();

        // Ellenőrizzük, hogy a kapott UID egyezik-e a tároltal
        if (this.auth.currentUser && this.auth.currentUser.uid === authData.userId) {
          console.log('[AuthService] Sikeres újra bejelentkezés, egyező UID');
           // Itt is ellenőrizhetnénk a tokent
           if (window.authTokenService && window.authTokenService.getAccessToken()) {
              console.log("[AuthService] Érvényes biztonsági token is található (újra bejelentkezés után).");
           } else {
              console.warn("[AuthService] Nincs érvényes biztonsági token (újra bejelentkezés után), aktiválás szükséges lehet.");
           }
          return this.auth.currentUser;
        } else {
          // Ez nem fordulhatna elő névtelen bejelentkezésnél, ha a UID stabil
          console.error('[AuthService] Az új bejelentkezés UID-ja nem egyezik a tároltal!');
          localStorage.removeItem(this.STORAGE_KEY);
          return null;
        }
      } catch (error) {
        console.error('[AuthService] Hiba történt az újra bejelentkezés során:', error);
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
      // Biztosítjuk, hogy az inicializálás befejeződött
      if (!this.db) {
        console.warn("[AuthService] Firestore nem áll készen (verifyActivationCode).");
        await new Promise(resolve => setTimeout(resolve, 500));
         if (!this.db) {
            console.error('[AuthService] Firestore nem inicializálódott!');
            return { valid: false, message: 'Adatbázis kapcsolat hiba' };
         }
      }

      console.log('[AuthService] Kód ellenőrzése:', code);

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
          const maxDevices = codeData.maxDevices || 3; // Alapértelmezett 3, ha nincs megadva
          const currentDevices = codeData.devices || [];

           // Ellenőrizzük, hogy ez az eszköz már aktiválva van-e
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

           // Ha az eszköz nincs aktiválva, de a kód már aktív, akkor ellenőrizzük a limitet
           if (currentDevices.length >= maxDevices) {
               console.log('[AuthService] A kód elérte a maximum eszközszámot:', currentDevices.length);
               return {
                   valid: false,
                   message: `Ez a kód már a maximális számú eszközön (${maxDevices}) aktiválva van.`
               };
           }
           // Ha van még hely, akkor a kód érvényes az új eszköz hozzáadására
           return { valid: true };

        } else if (codeData.status === 'unused') {
            // Ha a kód még nem használt, akkor érvényes az aktiválásra
            return { valid: true };
        } else {
            // Ismeretlen vagy érvénytelen státusz
            console.warn('[AuthService] Ismeretlen kód státusz:', codeData.status);
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

  // Névtelen bejelentkezés
  async signInAnonymously() {
    try {
       // Biztosítjuk, hogy az inicializálás befejeződött
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
      throw error; // Dobjuk tovább a hibát, hogy a hívó kezelhesse
    }
  }

  // Kód aktiválása vagy új eszköz hozzáadása
  async markCodeAsUsed(code, userId) {
    try {
       // Biztosítjuk, hogy az inicializálás befejeződött
       if (!this.db) {
            console.warn("[AuthService] Firestore nem áll készen (markCodeAsUsed).");
            await new Promise(resolve => setTimeout(resolve, 500));
            if (!this.db) {
               console.error('[AuthService] Firestore nem inicializálódott!');
               throw new Error('Adatbázis kapcsolat hiba');
            }
        }

      console.log('[AuthService] Kód aktiválása/eszköz hozzáadása:', code, 'userId:', userId);

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

      // Firestore frissítési logika
      try {
        // Ellenőrizzük, hogy első aktiválás-e vagy új eszköz hozzáadása
        if (codeData.status === 'unused') {
          console.log('[AuthService] Első aktiválás...');
          // Első aktiválás: státusz 'active'-ra, eszközlista létrehozása
          await codeRef.update({
            status: 'active',
            devices: [deviceInfo] // Kezdjük az új eszközzel a listát
          });
          console.log('[AuthService] Sikeres első aktiválás');
        } else if (codeData.status === 'active') {
          console.log('[AuthService] Már aktív kód, eszköz ellenőrzése/hozzáadása...');
          const currentDevices = codeData.devices || [];
          // Ellenőrizzük, hogy ez az eszköz már szerepel-e a listában
          if (currentDevices.some(device => device.deviceId === userId)) {
            console.log('[AuthService] Ez az eszköz már a listában van, nincs szükség Firestore frissítésre.');
            // Nincs szükség update-re, de a token kérést ettől még meg kell hívni!
          } else {
             // Ellenőrizzük a limitet, mielőtt hozzáadnánk
             const maxDevices = codeData.maxDevices || 3;
             if (currentDevices.length >= maxDevices) {
                 console.error('[AuthService] Hiba: Eszköz hozzáadása sikertelen, elérte a maximum limitet.');
                 throw new Error(`Ez a kód már a maximális számú eszközön (${maxDevices}) aktiválva van.`);
             }
             // Új eszköz hozzáadása a listához
             console.log('[AuthService] Új eszköz hozzáadása a listához...');
             const updatedDevices = [...currentDevices, deviceInfo];
             await codeRef.update({
                devices: updatedDevices
             });
             console.log('[AuthService] Sikeres eszköz hozzáadás');
          }
        } else {
            // Ha a kód státusza nem 'unused' és nem 'active', akkor valami hiba van
            console.error('[AuthService] Érvénytelen kód státusz a frissítéskor:', codeData.status);
            throw new Error('A kód nem aktiválható státuszban van.');
        }

        // --- > MÓDOSÍTÁS KEZDETE < ---
        // A sikeres Firestore művelet (vagy ha az eszköz már listán volt) UTÁN
        // kérünk egy biztonságos tokent a szervertől.
        console.log('[AuthService] Firestore művelet sikeres, biztonságos token lekérése...');
        if (window.authTokenService) {
          // Hívjuk a token lekérő funkciót az authTokenService-ből
          // Nem várjuk meg a végét feltétlenül (async), a háttérben lefuthat,
          // de fontos, hogy elinduljon. Ha kritikus, hogy meglegyen a token
          // a visszatérés előtt, akkor itt használhatunk await-et.
          window.authTokenService.fetchAndStoreSecureToken(code)
            .then(token => {
              if (token) {
                console.log('[AuthService] Biztonságos token sikeresen lekérve és tárolva.');
              } else {
                console.warn('[AuthService] Nem sikerült biztonságos tokent lekérni aktiváció után.');
                // Itt lehetne komolyabb hibakezelés, pl. felhasználó értesítése,
                // bár a Cloud Function hibaüzenete informatívabb lehetett már.
              }
            }).catch(tokenError => {
                 // Hiba a token lekérése során (a fetchAndStoreSecureToken már logol, de itt is lehet)
                 console.error('[AuthService] Hiba a fetchAndStoreSecureToken hívása után:', tokenError);
            });
        } else {
          console.error('[AuthService] AuthTokenService nem elérhető a token lekéréshez!');
          // Dobjunk hibát, mert ez kritikus? Vagy csak jelezzük?
          // throw new Error("Belső hiba: Token szolgáltatás nem elérhető.");
        }
        // --- > MÓDOSÍTÁS VÉGE < ---

        return true; // Visszatérünk a sikeres aktiválással/eszköz hozzáadással

      } catch (updateError) {
        // A Firestore frissítési hibát itt kapjuk el
        console.error('[AuthService] Hiba a Firestore frissítésekor:', updateError);
        // Próbáljuk meg az eredeti hibaüzenetet továbbadni, ha van
        throw new Error(updateError.message || 'Nem sikerült frissíteni a kódot az adatbázisban.');
      }
    } catch (error) {
      // Az általánosabb hibákat (pl. kód lekérés, invalid argument) itt kapjuk el
      console.error('[AuthService] Általános hiba a kód használtként jelölésekor:', error);
      throw error; // Dobjuk tovább a hibát
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

  // Hitelesítési adatok mentése (LocalStorage-ba)
  // Csak az alap user ID-t és a létrehozás idejét menti.
  async storeCredentials(user) {
    try {
      console.log('[AuthService] Alap hitelesítési adatok mentése:', user.uid);

      const authData = {
        userId: user.uid,
        // A Firebase Auth ID token itt már nem releváns számunkra,
        // a saját biztonságos tokenünket használjuk (amit az authTokenService kezel)
        // token: 'removed-firebase-id-token',
        createdAt: Date.now()
      };

      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(authData));
      console.log('[AuthService] Alap hitelesítési adatok sikeresen mentve a localStorage-ba.');

      // ---> MÓDOSÍTÁS: Innen kivettük a token lekérési kísérletet <---
      // Ahogy megbeszéltük, a tokent az aktivációs folyamat során (markCodeAsUsed)
      // vagy potenciálisan egy külön "token frissítése" gombbal/mechanizmussal
      // kellene kezelni, nem automatikusan minden bejelentkezéskor, mert nem tudjuk,
      // melyik aktivációs kóddal kellene kérni.

      return authData;
    } catch (error) {
      console.error('[AuthService] Hiba a hitelesítési adatok mentésekor:', error);
      // Fontos lehet itt is továbbdobni a hibát, hogy a hívó tudjon róla
      throw error;
    }
  }

  // Kijelentkezés
  async signOut() {
    try {
      // Biztosítjuk, hogy az inicializálás befejeződött
       if (!this.auth) {
           console.warn("[AuthService] Auth nem áll készen (signOut).");
           await new Promise(resolve => setTimeout(resolve, 500));
           if (!this.auth) {
               console.error('[AuthService] Auth nem inicializálódott a kijelentkezéshez!');
               return false; // Vagy dobjunk hibát
           }
       }
      console.log('[AuthService] Kijelentkezés...');
      await this.auth.signOut(); // Firebase kijelentkeztetés

      localStorage.removeItem(this.STORAGE_KEY); // Tárolt auth adatok törlése

      // Biztonsági token törlése is!
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

// Globális példány létrehozása (biztosítva, hogy a config már létezik)
if (window.firebaseApp) {
    window.authService = new AuthService();
} else {
    // Ha a firebase-config.js később töltődne be, ez a késleltetés segíthet
    console.warn("[AuthService] Várakozás a window.firebaseApp elérhetőségére...");
    const checkInterval = setInterval(() => {
        if (window.firebaseApp) {
            clearInterval(checkInterval);
            window.authService = new AuthService();
            console.log("[AuthService] Globális példány létrehozva késleltetéssel.");
        }
    }, 100);
    // Időtúllépés hozzáadása, hogy ne várjon örökké
    setTimeout(() => {
        if (!window.authService) {
            clearInterval(checkInterval);
            console.error("[AuthService] Időtúllépés: window.firebaseApp nem lett elérhető!");
        }
    }, 5000); // 5 másodperc várakozás
}
