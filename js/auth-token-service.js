/**
 * Token alapú jogosultságkezelés szolgáltatás (Biztonságos Verzió)
 * Ez a szolgáltatás kezeli a biztonságos, szerver által generált hozzáférési tokeneket.
 */
class AuthTokenService {
  constructor() {
    this.tokenKey = 'flipbook_secure_access_token'; // Kulcs a localStorage-ban
    this.tokenData = null; // Itt tároljuk a memóriában az aktuális tokent és adatait
    this.isInitialized = false;
    this.tokenFetchInProgress = false; // Jelzi, ha már folyamatban van token kérés

    this._initWhenFirebaseReady();
  }

  /**
   * Inicializálás, amikor a Firebase elérhető
   */
  _initWhenFirebaseReady() {
    if (window.firebaseApp && window.firebaseApp.auth && window.firebaseApp.functions) {
      this._initWithFirebase();
    } else {
      console.log('Várakozás a Firebase inicializálására (AuthTokenService)...');
      setTimeout(() => this._initWhenFirebaseReady(), 500);
    }
  }

  /**
   * Inicializálás a Firebase-szel
   */
  _initWithFirebase() {
    try {
      this.auth = window.firebaseApp.auth;
      this.functions = window.firebaseApp.functions;
      this.isInitialized = true;
      console.log('AuthTokenService (Secure) inicializálva Firebase-szel');

      // Megpróbáljuk betölteni a tokent a localStorage-ból indításkor
      this._loadTokenFromStorage();

      // Figyeljük a bejelentkezési állapot változását
      this.auth.onAuthStateChanged(user => {
        if (!user) {
          // Kijelentkezéskor töröljük a tokent
          this.clearToken();
          console.log('[AuthTokenService] Felhasználó kijelentkezett, token törölve.');
        } else {
          // Bejelentkezéskor nem kérünk automatikusan tokent,
          // csak ha van tárolt, akkor ellenőrizzük
           this._loadTokenFromStorage();
           console.log('[AuthTokenService] Felhasználó bejelentkezve/állapot változott.');
        }
      });

    } catch (error) {
      console.error('Hiba a Firebase inicializálásakor (AuthTokenService):', error);
    }
  }

  /**
   * Biztonságos token lekérése és tárolása a Cloud Function hívásával.
   * Ezt a funkciót az `AuthService` hívja meg sikeres aktiváció után.
   * @param {string} activationCode - Az aktiváláshoz használt kód.
   * @returns {Promise<string|null>} - A sikeresen lekért és tárolt token, vagy null hiba esetén.
   */
  async fetchAndStoreSecureToken(activationCode) {
    if (!this.isInitialized) {
      console.warn('[AuthTokenService] Szolgáltatás még nem inicializálódott a token kéréshez.');
      return null;
    }
    if (!this.auth.currentUser) {
      console.warn('[AuthTokenService] Nincs bejelentkezett felhasználó a token kéréshez.');
      return null;
    }
    if (this.tokenFetchInProgress) {
        console.log('[AuthTokenService] Token kérés már folyamatban van.');
        return null; // Vagy várhatunk a meglévő promiser-a
    }

    this.tokenFetchInProgress = true;
    console.log(`[AuthTokenService] Biztonságos token kérése a Cloud Function-től a ${activationCode} kóddal.`);

    try {
      const generateTokenFunc = this.functions.httpsCallable('generateSecureToken');
      const result = await generateTokenFunc({ activationCode: activationCode });

      if (result && result.data && result.data.token) {
        const token = result.data.token;
        console.log('[AuthTokenService] Sikeres token fogadás a Cloud Function-től.');

        // JWT token dekódolása (opcionális, csak az érvényesség ellenőrzéséhez kellhet)
        const payload = this._decodeJwtPayload(token);
        const expires = payload ? payload.exp * 1000 : Date.now() + 30 * 60 * 1000; // Ha nincs exp, 30 percet feltételezünk

         const tokenData = {
           token: token,
           expires: expires, // Lejárati idő ezredmásodpercben
           fetchedAt: Date.now()
         };

        this._saveToken(tokenData); // Mentés memóriába és localStorage-ba
        this.tokenFetchInProgress = false;
        return token;
      } else {
        console.error('[AuthTokenService] Érvénytelen válasz a Cloud Function-től:', result);
        throw new Error('Nem sikerült érvényes tokent kapni.');
      }
    } catch (error) {
      console.error('[AuthTokenService] Hiba a Cloud Function hívása vagy token feldolgozása közben:', error);
      // Hibakezelés: Megjeleníthetjük a felhasználónak az üzenetet
      let message = 'Hiba történt a hozzáférés ellenőrzésekor.';
      if (error.message) {
          message = error.message; // A Cloud Function által dobott hibaüzenet
      }
      // Itt lehetne egy globális hibaüzenet megjelenítő mechanizmust hívni
      // pl. window.showGlobalError(message);
      this.tokenFetchInProgress = false;
      this.clearToken(); // Hiba esetén töröljük a régit is
      return null;
    } finally {
        this.tokenFetchInProgress = false;
    }
  }

  /**
   * Aktuális, érvényes token lekérése.
   * Ha van érvényes token a memóriában/storage-ban, azt adja vissza.
   * Nem próbál meg új tokent kérni, azt az aktivációnak kell intéznie.
   * @returns {string|null} - Az érvényes token, vagy null, ha nincs.
   */
  getAccessToken() {
    // Először a memóriában lévő tokent ellenőrizzük
    if (this.tokenData && this.isTokenValid(this.tokenData)) {
        // console.log('[AuthTokenService] Érvényes token a memóriából.');
        return this.tokenData.token;
    }

    // Ha nincs a memóriában, próbáljuk a storage-ból
    const storedTokenData = this._loadTokenFromStorage();
     if (storedTokenData && this.isTokenValid(storedTokenData)) {
        console.log('[AuthTokenService] Érvényes token betöltve a localStorage-ból.');
        this.tokenData = storedTokenData; // Betöltjük a memóriába is
        return this.tokenData.token;
    }

    // console.log('[AuthTokenService] Nincs érvényes tárolt token.');
    return null; // Nincs érvényes token
  }


  /**
   * Token törlése (memóriából és localStorage-ból)
   */
  clearToken() {
    this.tokenData = null;
    try {
      localStorage.removeItem(this.tokenKey);
    } catch (e) {
      console.error('[AuthTokenService] Hiba a token törlésekor a localStorage-ból:', e);
    }
     console.log('[AuthTokenService] Token törölve.');
  }

  /**
   * Token érvényességének ellenőrzése (lejárat alapján)
   */
  isTokenValid(tokenData) {
    if (!tokenData || !tokenData.token || !tokenData.expires) {
        // console.log('[AuthTokenService] Token érvénytelen: hiányzó adatok.');
        return false;
    }

    const now = Date.now();
    const isValid = tokenData.expires > now;

    // if (!isValid) {
    //    console.log(`[AuthTokenService] Token lejárt: ${new Date(tokenData.expires)}`);
    // }

    return isValid;
  }

   /**
    * Token mentése (memóriába és localStorage-ba)
    */
   _saveToken(tokenData) {
     if (!tokenData || !tokenData.token) {
       console.error('[AuthTokenService] Hiba: Érvénytelen token adat a mentéshez.');
       return;
     }
     this.tokenData = tokenData; // Memóriába mentés
     try {
       localStorage.setItem(this.tokenKey, JSON.stringify(tokenData));
       console.log(`[AuthTokenService] Token mentve, lejár: ${new Date(tokenData.expires)}`);
     } catch (e) {
       console.error('[AuthTokenService] Hiba a token mentésekor a localStorage-ba:', e);
     }
   }


  /**
   * Token betöltése a localStorage-ból a memóriába.
   * @returns {object|null} A betöltött token adat objektum, vagy null.
   */
  _loadTokenFromStorage() {
    try {
      const tokenString = localStorage.getItem(this.tokenKey);
      if (!tokenString) return null;

      const parsedData = JSON.parse(tokenString);
      // Alapvető validálás
       if (parsedData && parsedData.token && parsedData.expires) {
           // Csak akkor töltjük be a memóriába, ha még érvényes lehet
           if (this.isTokenValid(parsedData)) {
               this.tokenData = parsedData;
               // console.log('[AuthTokenService] Token betöltve a localStorage-ból a memóriába.');
               return parsedData;
           } else {
               console.log('[AuthTokenService] Lejárt token található a localStorage-ban, törölve.');
               this.clearToken(); // Töröljük a lejárt tokent
               return null;
           }
       }
       return null;
    } catch (e) {
      console.error('[AuthTokenService] Hiba a token betöltésekor a localStorage-ból:', e);
      return null;
    }
  }

  /**
   * Dekódolja a JWT payload részét Base64-ből (nem ellenőrzi az aláírást!).
   * Csak a payload kinyerésére szolgál, pl. a lejárati idő kiolvasásához.
   */
   _decodeJwtPayload(token) {
     try {
       const base64Url = token.split('.')[1]; // Payload rész
       if (!base64Url) return null;
       const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
       const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
           return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
       }).join(''));
       return JSON.parse(jsonPayload);
     } catch (error) {
       console.error("[AuthTokenService] Hiba a JWT payload dekódolása közben:", error);
       return null;
     }
   }
}

// Globális példány létrehozása
window.authTokenService = new AuthTokenService();