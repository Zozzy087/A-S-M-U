// AuthService - A kalandkönyv autentikációs szolgáltatása (JAVÍTOTT)
class AuthService {
  constructor() {
    if (!window.firebaseApp || !window.firebaseApp.auth || !window.firebaseApp.db) {
      console.error("[AuthService] Hiba: Firebase App nem elérhető! Késleltetett inicializálás...");
       setTimeout(() => {
            if (window.firebaseApp && window.firebaseApp.auth && window.firebaseApp.db) {
               this._initializeFirebaseServices();
            } else {
               console.error("[AuthService] Firebase App még mindig nem elérhető inicializáláskor!");
            }
       }, 1000);
    } else {
        this._initializeFirebaseServices();
    }

    this.STORAGE_KEY = 'kalandkonyv_auth';
    this.LAST_CODE_KEY = 'lastActivatedCode'; // Kulcs a kód tárolásához
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
                // === JAVÍTÁS: Kód törlése kijelentkezéskor ===
                try {
                    localStorage.removeItem(this.LAST_CODE_KEY);
                    console.log('[AuthService] Tárolt aktivációs kód törölve kijelentkezéskor.');
                } catch (e) { /* Nem baj, ha hiba van */ }
                // === JAVÍTÁS VÉGE ===
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
      // ... (checkStoredAuth többi része változatlan) ...
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
           const storedCode = localStorage.getItem(this.LAST_CODE_KEY); // Ellenőrizzük a kódot is
           if (storedCode) console.log("[AuthService] Tárolt aktivációs kód is található.");
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
            const storedCode = localStorage.getItem(this.LAST_CODE_KEY); // Ellenőrizzük a kódot is
            if (storedCode) console.log("[AuthService] Tárolt aktivációs kód is található (újra bejelentkezés után).");
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
      localStorage.removeItem(this.STORAGE_KEY); // Hiba esetén is töröljünk
      localStorage.removeItem(this.LAST_CODE_KEY);
      return null;
    }
  }

  async verifyActivationCode(code) { /* ... (Ez a függvény változatlan marad) ... */
    try {
      if (!this.db) { console.warn("[AuthService] Firestore nem áll készen (verifyActivationCode)."); await new Promise(resolve => setTimeout(resolve, 500)); if (!this.db) { console.error('[AuthService] Firestore nem inicializálódott!'); return { valid: false, message: 'Adatbázis kapcsolat hiba' }; } }
      console.log('[AuthService] Kód ellenőrzése:', code);
      try {
        const codeDoc = await this.db.collection(this.CODES_COLLECTION).doc(code).get();
        if (!codeDoc.exists) { console.log('[AuthService] A kód nem létezik:', code); return { valid: false, message: 'Érvénytelen aktivációs kód' }; }
        const codeData = codeDoc.data(); console.log('[AuthService] Kód adatok:', JSON.stringify(codeData));
        if (codeData.status === 'blocked' || codeData.status === 'revoked') { console.warn('[AuthService] A kód le van tiltva:', code); return { valid: false, message: 'Ezt a kódot letiltották.' }; }
        if (codeData.status === 'active') {
          const maxDevices = codeData.maxDevices || 3; const currentDevices = codeData.devices || []; let deviceAlreadyActivated = false; if (this.auth.currentUser) { deviceAlreadyActivated = currentDevices.some(device => device.deviceId === this.auth.currentUser.uid); }
          if (deviceAlreadyActivated) { console.log('[AuthService] Eszköz már aktiválva ezzel a kóddal.'); return { valid: true, message: 'Ez az eszköz már aktiválva van', alreadyActivated: true }; }
          if (currentDevices.length >= maxDevices) { console.log('[AuthService] Max eszközszám elérve:', currentDevices.length); return { valid: false, message: `Ez a kód már a maximális számú eszközön (${maxDevices}) aktiválva van.` }; }
          return { valid: true };
        } else if (codeData.status === 'unused') { return { valid: true }; }
        else { console.warn('[AuthService] Ismeretlen kód státusz:', codeData.status); return { valid: false, message: 'A kód státusza ismeretlen vagy érvénytelen.'}; }
      } catch (dbError) { console.error('[AuthService] DB hiba kód ellenőrzéskor:', dbError); return { valid: false, message: 'Adatbázis hiba: ' + dbError.message }; }
    } catch (error) { console.error('[AuthService] Ált. hiba kód ellenőrzéskor:', error); return { valid: false, message: 'Hiba történt a kód ellenőrzésekor: ' + error.message }; }
  }

  async signInAnonymously() { /* ... (Ez a függvény változatlan marad) ... */
    try {
       if (!this.auth) { console.warn("[AuthService] Auth nem áll készen (signInAnonymously)."); await new Promise(resolve => setTimeout(resolve, 500)); if (!this.auth) { console.error('[AuthService] Auth nem inicializálódott!'); throw new Error('Hitelesítési szolgáltatás nem elérhető.'); } }
      console.log('[AuthService] Névtelen bejelentkezés megkezdése...'); const result = await this.auth.signInAnonymously(); console.log('[AuthService] Névtelen bejelentkezés sikeres:', result.user.uid); return result;
    } catch (error) { console.error('[AuthService] Névtelen bejelentkezési hiba:', error); throw error; }
   }

  async markCodeAsUsed(code, userId) { // code itt a kötőjeles ID
    try {
       if (!this.db) { /* ... (hibaellenőrzés változatlan) ... */ throw new Error('Adatbázis kapcsolat hiba'); }
      console.log('[AuthService] Kód aktiválása/eszköz hozzáadása:', code, 'userId:', userId);
      const codeRef = this.db.collection(this.CODES_COLLECTION).doc(code);
      console.log('[AuthService] Kód lekérése...');
      let codeDoc;
      try { codeDoc = await codeRef.get(); } catch (getError) { /* ... (hibaellenőrzés változatlan) ... */ throw new Error('Nem sikerült lekérni a kódot: ' + getError.message); }
      if (!codeDoc.exists) { /* ... (hibaellenőrzés változatlan) ... */ throw new Error('Érvénytelen aktivációs kód'); }
      const codeData = codeDoc.data(); console.log('[AuthService] Kód adatok:', JSON.stringify(codeData));
      const currentTime = new Date(); console.log('[AuthService] Aktuális idő:', currentTime);
      const deviceInfo = { deviceId: userId, activatedAt: currentTime, deviceType: this._getDeviceType(), userAgent: navigator.userAgent };
      console.log('[AuthService] Eszköz információk:', JSON.stringify(deviceInfo));

      try {
        // === Firestore frissítési logika (változatlan) ===
        if (codeData.status === 'unused') {
          console.log('[AuthService] Első aktiválás...');
          await codeRef.update({ status: 'active', devices: [deviceInfo] });
          console.log('[AuthService] Sikeres első aktiválás');
        } else if (codeData.status === 'active') {
          console.log('[AuthService] Már aktív kód, eszköz ellenőrzése/hozzáadása...');
          const currentDevices = codeData.devices || [];
          if (!currentDevices.some(device => device.deviceId === userId)) {
             const maxDevices = codeData.maxDevices || 3;
             if (currentDevices.length >= maxDevices) { throw new Error(`Ez a kód már a maximális számú eszközön (${maxDevices}) aktiválva van.`); }
             console.log('[AuthService] Új eszköz hozzáadása a listához...');
             const updatedDevices = [...currentDevices, deviceInfo];
             await codeRef.update({ devices: updatedDevices });
             console.log('[AuthService] Sikeres eszköz hozzáadás');
          } else {
            console.log('[AuthService] Eszköz már listában, nincs Firestore update.');
          }
        } else {
            throw new Error('A kód nem aktiválható státuszban van.');
        }

        // ---> ÚJ RÉSZ KEZDETE: Aktivációs kód mentése <---
        try {
            localStorage.setItem(this.LAST_CODE_KEY, code); // A kötőjeles kódot mentjük
            console.log(`[AuthService] Aktivációs kód (${code}) elmentve a localStorage-ba.`);
        } catch (e) {
            console.error('[AuthService] Hiba az aktivációs kód localStorage-ba mentésekor:', e);
        }
        // ---> ÚJ RÉSZ VÉGE <---

        // Token lekérés (változatlan)
        console.log('[AuthService] Biztonságos token lekérése...');
        if (window.authTokenService) {
          window.authTokenService.fetchAndStoreSecureToken(code)
            .then(token => { /* ... (logolás változatlan) ... */ if(token){console.log("Token OK")}else{console.warn("Token hiba")} })
            .catch(tokenError => { console.error('[AuthService] Hiba a token lekérésnél:', tokenError); });
        } else {
          console.error('[AuthService] AuthTokenService nem elérhető!');
        }

        return true;

      } catch (updateError) { /* ... (hibaellenőrzés változatlan) ... */ throw new Error(updateError.message || 'Nem sikerült frissíteni a kódot.'); }
    } catch (error) { /* ... (hibaellenőrzés változatlan) ... */ throw error; }
  }

  _getDeviceType() { /* ... (Ez a függvény változatlan marad) ... */
      const ua = navigator.userAgent; if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) return 'tablet'; if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(ua)) return 'mobile'; return 'desktop';
  }

  async storeCredentials(user) { /* ... (Ez a függvény változatlan marad) ... */
    try { console.log('[AuthService] Alap hitelesítési adatok mentése:', user.uid); const authData = { userId: user.uid, createdAt: Date.now() }; localStorage.setItem(this.STORAGE_KEY, JSON.stringify(authData)); console.log('[AuthService] Alap hitelesítési adatok sikeresen mentve.'); return authData; } catch (error) { console.error('[AuthService] Hiba a hitelesítési adatok mentésekor:', error); throw error; }
  }

  async signOut() { /* ... (Ez a függvény változatlan marad, de már törli a kódot is az elején) ... */
    try { if (!this.auth) { /*...*/ return false; }
      console.log('[AuthService] Kijelentkezés...'); await this.auth.signOut();
      localStorage.removeItem(this.STORAGE_KEY); localStorage.removeItem(this.LAST_CODE_KEY); // Kód törlése itt is biztosítva
      if (window.authTokenService) { window.authTokenService.clearToken(); }
      console.log('[AuthService] Kijelentkezés és adattörlés sikeres'); return true;
    } catch (error) { console.error('[AuthService] Hiba a kijelentkezés során:', error); return false; }
  }
}

// Globális példány létrehozása (változatlan)
if (window.firebaseApp) { window.authService = new AuthService(); } else { /* ... (várakozás változatlan) ... */ console.warn("[AuthService] Várakozás a window.firebaseApp elérhetőségére..."); const ci=setInterval(()=>{if(window.firebaseApp){clearInterval(ci);window.authService=new AuthService();console.log("[AuthService] Globális példány létrehozva késleltetéssel.");}},100);setTimeout(()=>{if(!window.authService){clearInterval(ci);console.error("[AuthService] Időtúllépés: window.firebaseApp nem lett elérhető!");}},5000); }