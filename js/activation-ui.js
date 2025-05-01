// Aktivációs UI kezelő (MÓDOSÍTOTT ZÖLD STÍLUSSAL)
class ActivationUI {
  constructor() {
    // Fontos: Biztosítsd, hogy a window.authService már létezik, mire ez lefut.
    // Ezt az index.html-ben a scriptek sorrendjével lehet szabályozni.
    if (window.authService) {
        this.authService = window.authService;
    } else {
        console.error("[ActivationUI] Hiba: window.authService nem található! Aktiváció nem fog működni.");
        // Esetleg dobhatnánk egy hibát, vagy letilthatnánk a UI-t.
    }
    this.isActivated = false;
    this.activationContainer = null;
    // Megengedőbb formátum ellenőrzés, ami kezeli a kötőjel nélküli bevitelt is a validálás előtt
    // A tényleges XXXXX-XXXX-XXXX-XXXX formátumot a _formatActivationCode kezeli.
    this.correctCodeFormat = /^[A-Z0-9-]+$/; // Engedélyezi a kötőjeleket is
  }

  // Aktivációs UI inicializálása
  async initialize() {
    // Ellenőrizzük, hogy az authService inicializálódott-e
    if (!this.authService) {
        console.error("[ActivationUI] AuthService nem inicializálódott, initialize megszakítva.");
        return false; // Nem tudunk továbblépni authService nélkül
    }

    // Ellenőrizzük, hogy már hitelesítve van-e (az új, token-ellenőrző logikával)
    const user = await this.authService.checkStoredAuth();

    if (user) {
      // Ha a checkStoredAuth usert ad vissza, az azt jelenti, van érvényes token is!
      console.log('[ActivationUI] Felhasználó már aktiválva és van érvényes token:', user.uid);
      this.isActivated = true;
      this.remove(); // Távolítsuk el a UI-t, ha esetleg korábbról itt maradt
      return true; // Jelezzük, hogy aktiválva van
    } else {
        // Ha nincs user VAGY nincs érvényes token
        console.log('[ActivationUI] Felhasználó nincs aktiválva vagy nincs érvényes token. Aktivációs UI megjelenítése.');
        this.isActivated = false;
        this._createActivationUI(); // Csak ekkor hozzuk létre és jelenítjük meg
        return false; // Jelezzük, hogy aktiválás szükséges
    }
  }

  // Aktivációs UI létrehozása (MÓDOSÍTOTT ZÖLD STÍLUSSAL)
  _createActivationUI() {
    // Ha már létezik a DOM-ban, ne hozzunk létre újat
    if (document.getElementById('activation-container')) {
        console.log('[ActivationUI] Aktivációs konténer már létezik.');
        this.activationContainer = document.getElementById('activation-container');
        // Esetleg itt meg lehetne jeleníteni, ha rejtve volt: this.activationContainer.style.display = 'flex';
        return;
    }
     if (this.activationContainer) {
         console.log('[ActivationUI] Aktivációs konténer objektum már létezik, de nincs a DOM-ban? Újra létrehozzuk.');
         // Biztonság kedvéért nullázzuk, hogy újra létrehozza
         this.activationContainer = null;
     }

    console.log('[ActivationUI] Aktivációs UI létrehozása...');

    // Konténer létrehozása
    this.activationContainer = document.createElement('div');
    this.activationContainer.id = 'activation-container';
    this.activationContainer.innerHTML = `
      <div class="activation-overlay">
        <div class="activation-card">
          <h2>A Sötét Mágia Útvesztője</h2>
          <p>Köszönjük a vásárlást! A folytatáshoz add meg az aktivációs kódodat:</p>
          <div class="activation-form">
            <input type="text" id="activation-code" placeholder="Kód beírása..." autocomplete="off" maxlength="23"> <button id="activate-btn">Aktiválás</button>
          </div>
          <p id="activation-message" class="activation-message"></p>
          <p class="activation-info">Egy aktivációs kóddal a könyv akár 3 különböző eszközön is használható.</p>
        </div>
      </div>
    `;

    // Stílusok hozzáadása (ÚJ, ZÖLD STÍLUSOK)
    const style = document.createElement('style');
    style.textContent = `
      .activation-overlay {
        position: fixed;
        top: 0; left: 0;
        width: 100%; height: 100%;
        background-color: rgba(0, 0, 0, 0.90); /* Kicsit sötétebb háttér */
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 10000;
        backdrop-filter: blur(3px); /* Opcionális: háttér elmosása */
      }

      .activation-card {
        background-color: #1a1a1a; /* Sötét háttér */
        color: #e0e0e0; /* Világosszürke szöveg */
        border-radius: 8px;
        padding: 2rem;
        /* Ragyogó zöld keret és árnyék */
        border: 1px solid #32CD32; /* LimeGreen keret */
        box-shadow: 0 0 20px 5px rgba(50, 205, 50, 0.5); /* LimeGreen ragyogás */
        max-width: 90%;
        width: 400px;
        text-align: center;
        font-family: 'Cinzel', serif; /* Marad a Cinzel, vagy lehet Roboto? */
      }

      .activation-card h2 {
        /* Cím színe, lehet a ragyogó zöld */
        color: #32CD32; /* LimeGreen */
        margin-bottom: 1.5rem;
        text-shadow: 0 0 5px rgba(50, 205, 50, 0.7); /* Enyhe zöld szövegárnyék */
      }

      .activation-form {
        margin: 1.5rem 0;
      }

      #activation-code {
        width: 100%;
        padding: 0.75rem;
        background-color: #333; /* Sötétszürke háttér */
        /* Bemeneti mező kerete is lehet zöld */
        border: 1px solid #32CD32; /* LimeGreen keret */
        border-radius: 4px;
        color: #e0e0e0; /* Világos szövegszín */
        font-size: 1rem;
        margin-bottom: 1rem;
        text-align: center;
        letter-spacing: 2px;
        box-sizing: border-box; /* Hozzáadva, hogy a padding ne növelje a méretet */
      }

      #activation-code::placeholder { /* Placeholder stílus */
         color: #888;
         opacity: 0.7;
      }

      #activation-code:focus {
         /* Kiemelés, ha belekattintunk */
         outline: none;
         box-shadow: 0 0 8px rgba(50, 205, 50, 0.6);
      }

      #activate-btn {
        /* Gomb háttérszíne zöld */
        background-color: #368B27; /* Sötétebb zöld, mint a keret */
        color: #ffffff; /* Fehér szöveg */
        border: none;
        padding: 0.75rem 2rem;
        font-size: 1rem;
        border-radius: 4px;
        cursor: pointer;
        font-family: 'Cinzel', serif;
        transition: background-color 0.3s, box-shadow 0.3s, transform 0.1s;
        box-shadow: 0 0 5px rgba(54, 139, 39, 0.5); /* Enyhe gomb árnyék */
      }

      #activate-btn:hover {
        /* Világosabb zöld hover */
        background-color: #4CAF50; /* Kicsit világosabb zöld */
        box-shadow: 0 0 10px rgba(76, 175, 80, 0.7);
      }

       #activate-btn:active {
         /* Kis effekt gombnyomásra */
         transform: scale(0.98);
       }

       #activate-btn:disabled {
           background-color: #555;
           color: #999;
           cursor: not-allowed;
           box-shadow: none;
       }

      /* Üzenetek stílusa */
      .activation-message {
        min-height: 1.5rem;
        margin-top: 1rem;
        font-weight: bold;
        color: #ff6b6b; /* Hibaüzenet színe (pirosas) - ezt meghagyhatjuk */
      }

      .activation-message.success {
        color: #32CD32; /* Sikeres üzenet színe (zöld) */
      }

      /* Információs szöveg */
      .activation-info {
        font-size: 0.9rem;
        color: #cccccc;
        margin-top: 1.5rem;
        opacity: 0.8;
      }
    `; // <-- Itt a backtick vége

    // Stílusok hozzáadása a head-hez (csak egyszer)
    if (!document.querySelector('style[data-activation-style]')) {
        style.setAttribute('data-activation-style', 'true'); // Jelöljük, hogy már hozzáadtuk
        document.head.appendChild(style);
    }

    // Konténer hozzáadása a body-hoz
    document.body.appendChild(this.activationContainer);

    // Eseménykezelők hozzáadása (biztosítva, hogy az elemek léteznek)
    const activateBtn = document.getElementById('activate-btn');
    const codeInput = document.getElementById('activation-code');

    if (activateBtn) {
        // Esetleges régi listener eltávolítása (biztonsági lépés)
        // activateBtn.removeEventListener('click', this._handleActivationBound); // Ha lenne bound verzió
        // Új listener hozzáadása
         this._handleActivationBound = this._handleActivationBound || this._handleActivation.bind(this); // Bindeljük, ha még nem tettük
         activateBtn.addEventListener('click', this._handleActivationBound);
    } else {
        console.error("[ActivationUI] Aktivációs gomb nem található!");
    }

    if (codeInput) {
       // Esetleges régi listener eltávolítása
       // codeInput.removeEventListener('keypress', this._handleEnterKeyBound);
       // codeInput.removeEventListener('input', this._handleInputFormattingBound);

       // Új listenerek hozzáadása
        this._handleEnterKeyBound = this._handleEnterKeyBound || ((e) => { if (e.key === 'Enter') this._handleActivation(); }).bind(this);
        this._handleInputFormattingBound = this._handleInputFormattingBound || this._formatInputOnType.bind(this);

        codeInput.addEventListener('keypress', this._handleEnterKeyBound);
        codeInput.addEventListener('input', this._handleInputFormattingBound);

        // Fókusz beállítása a beviteli mezőre
        codeInput.focus();
    } else {
        console.error("[ActivationUI] Aktivációs kód beviteli mező nem található!");
    }

     console.log('[ActivationUI] Aktivációs UI sikeresen létrehozva és eseménykezelők hozzáadva.');
  }


   /**
    * Segédfüggvény a beviteli mező formázásához gépelés közben
    */
   _formatInputOnType(event) {
        const inputElement = event.target;
        let value = inputElement.value.toUpperCase().replace(/[^A-Z0-9]/g, ''); // Csak nagybetűk és számok
        let formattedValue = '';
        const segmentLengths = [5, 4, 4, 4]; // XXXXX-XXXX-XXXX-XXXX
        let currentPos = 0;

        for (let i = 0; i < segmentLengths.length; i++) {
            const segment = value.substring(currentPos, currentPos + segmentLengths[i]);
            if (segment.length > 0) {
                formattedValue += (formattedValue.length > 0 ? '-' : '') + segment;
                currentPos += segment.length;
            } else {
                break; // Nincs több karakter
            }
        }

        // Frissítjük az input értékét, ha szükséges
        // Figyelünk a kurzor pozícióra is, hogy ne ugorjon el gépelés közben
        if (inputElement.value !== formattedValue) {
            const selectionStart = inputElement.selectionStart;
            const selectionEnd = inputElement.selectionEnd;
            const diff = formattedValue.length - inputElement.value.length; // Hány kötőjel került be/ki

            inputElement.value = formattedValue;

            // Próbáljuk megőrizni a kurzor pozícióját
             // Egyszerűsített logika: ha nőtt a hossz (kötőjel be), növeljük a pozíciót
             if (selectionStart !== null && selectionEnd !== null) {
                 const newPos = selectionStart + (diff > 0 ? diff : 0);
                 // Kerüljük a kötőjelre pozicionálást
                 if (formattedValue[newPos -1] === '-' && diff > 0) {
                    // inputElement.setSelectionRange(newPos + 1, newPos + 1);
                    // Inkább csak simán állítsuk be, a böngésző talán jobban kezeli
                    inputElement.setSelectionRange(newPos, newPos);
                 } else {
                     inputElement.setSelectionRange(newPos, newPos);
                 }
             }
        }
   }


  // Aktivációs üzenet megjelenítése
  _showMessage(message, isSuccess = false) {
    // Biztosítjuk, hogy a konténer létezik
    if (!this.activationContainer || !document.body.contains(this.activationContainer)) {
        console.warn("[ActivationUI] Üzenet megjelenítése sikertelen, az aktivációs konténer nem található.");
        return;
    }
    const messageElement = this.activationContainer.querySelector('#activation-message');
    if (!messageElement) {
         console.warn("[ActivationUI] Üzenet elem (#activation-message) nem található.");
         return;
    }

    messageElement.textContent = message;
    messageElement.className = 'activation-message' + (isSuccess ? ' success' : '');
  }


  // Aktivációs kód formázása az ellenőrzéshez (már nem szükséges itt, a _handleActivation-ben történik)
  /*
  _formatActivationCode(code) {
     // Ezt a logikát áthelyeztük a _handleActivation-be
  }
  */

  // Aktivációs kódkezelés
  async _handleActivation() {
     // Ellenőrizzük, hogy az authService elérhető-e
     if (!this.authService) {
         console.error("[ActivationUI] AuthService nem elérhető a _handleActivation során.");
         this._showMessage("Hiba: A hitelesítési szolgáltatás nem érhető el.");
         return;
     }
     // Ellenőrizzük, hogy a container létezik-e még
     if (!this.activationContainer || !document.body.contains(this.activationContainer)) {
         console.warn("[ActivationUI] Aktivációs konténer már nem létezik (_handleActivation).");
         return;
     }

    const codeInput = this.activationContainer.querySelector('#activation-code');
    const activateBtn = this.activationContainer.querySelector('#activate-btn');

    if (!codeInput || !activateBtn) {
        console.error("[ActivationUI] Beviteli mező vagy gomb nem található!");
        this._showMessage("Hiba: UI elemek nem találhatóak.");
        return;
    }


    const rawCode = codeInput.value.trim();

    if (!rawCode) {
      this._showMessage('Kérlek add meg az aktivációs kódot');
      return;
    }

    // Formázás és Validálás (pl. XXXXX-XXXX-XXXX-XXXX formátumra)
     // Eltávolítjuk a nem alfanumerikus karaktereket (kivéve a kötőjelet) és nagybetűsítjük
     let formattedCode = rawCode.toUpperCase().replace(/[^A-Z0-9-]/g, '');
     // Eltávolítjuk a felesleges kötőjeleket és biztosítjuk a helyes formátumot
     formattedCode = formattedCode.replace(/-+/g, '-').replace(/^-|-$/g, ''); // Dupla, kezdő, záró kötőjelek törlése

     // Itt lehetne egy szigorúbb regex ellenőrzés is a VÉGLEGES formátumra, pl.:
     const finalFormatRegex = /^[A-Z0-9]{5}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/;
     // Vagy /^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/ a 4-4-4-4 formátumhoz
     // Ezt a kódot most nem használjuk, de megfontolandó
     /*
     if (!finalFormatRegex.test(formattedCode)) {
         this._showMessage('Érvénytelen kódformátum. (Pl.: ABCDE-1234-...)');
         return;
     }
     */
     const code = formattedCode; // Használjuk a tisztított kódot

    // --- Kezdődik a tényleges aktivációs logika ---
    activateBtn.disabled = true;
    activateBtn.textContent = 'Ellenőrzés...';
    this._showMessage(''); // Töröljük az előző üzenetet

    try {
      // Névtelen bejelentkezés, ha még nincs user (ez már meg kellett volna történjen az initialize-ban?)
      // Biztonság kedvéért itt is ellenőrizzük/megpróbáljuk
      let currentUser = this.authService.auth.currentUser;
      if (!currentUser) {
        console.log('[ActivationUI] Nincs bejelentkezett user, névtelen bejelentkezés megkísérlése...');
        const signInResult = await this.authService.signInAnonymously();
        currentUser = signInResult.user;
         if (!currentUser) {
             throw new Error("Nem sikerült névtelen felhasználót létrehozni.");
         }
         console.log('[ActivationUI] Névtelen bejelentkezés sikeres.');
      }


      // 1. Kód ellenőrzése (csak validitás és limitek)
      console.log(`[ActivationUI] Kód ellenőrzése Firestore-ban: ${code}`);
      const verification = await this.authService.verifyActivationCode(code);

      if (!verification.valid) {
        console.warn(`[ActivationUI] Kód ellenőrzés sikertelen: ${verification.message}`);
        this._showMessage(verification.message || 'Érvénytelen vagy már teljesen felhasznált aktivációs kód.');
        activateBtn.disabled = false;
        activateBtn.textContent = 'Aktiválás';
        return;
      }

      // Ha a kód érvényes (létezik és van rajta hely VAGY ez az eszköz már aktiválva van vele)
      console.log('[ActivationUI] Kód ellenőrzés sikeres (vagy már aktivált). Folytatás: kód megjelölése/token kérése.');
      activateBtn.textContent = 'Aktiválás...';

      // 2. Kód használtként jelölése / Eszköz hozzáadása ÉS Token kérése
      // A markCodeAsUsed most már magában foglalja a token kérést is!
      await this.authService.markCodeAsUsed(code, currentUser.uid);
      console.log('[ActivationUI] markCodeAsUsed sikeresen lefutott (token kérés elindítva).');

      // 3. Hitelesítési adatok mentése (opcionális, csak a user ID-t menti)
      await this.authService.storeCredentials(currentUser);

      // Sikeres üzenet megjelenítése
       this._showMessage('Sikeres aktiváció!', true);

      // UI állapot frissítése és eltüntetése
      this.isActivated = true;
      setTimeout(() => {
        this.remove(); // UI eltávolítása
        // Itt lehetne jelezni az index.html-nek, hogy inicializálja a FlipbookEngine-t
         // pl. egy egyedi eseménnyel: document.dispatchEvent(new Event('activationComplete'));
         // Vagy az index.html figyelhetné a this.isActivated változását (bonyolultabb)
         // Legegyszerűbb: Újratöltjük az oldalt, ami most már bejelentkezve fog indulni
         location.reload();
      }, 1500); // Kis késleltetés, hogy látszódjon a sikeres üzenet

    } catch (error) {
      console.error('[ActivationUI] Aktiválási hiba a _handleActivation try blokkban:', error);
      // Próbáljuk meg a hibaüzenetet megjeleníteni a felhasználónak
      this._showMessage(error.message || 'Ismeretlen hiba történt az aktiválás során.');

      // Gomb újra aktívvá tétele
      if (activateBtn) {
         activateBtn.disabled = false;
         activateBtn.textContent = 'Aktiválás';
      }
    }
  }

  // Aktivációs UI eltávolítása a DOM-ból
  remove() {
    if (this.activationContainer && this.activationContainer.parentNode) {
       console.log('[ActivationUI] Aktivációs UI eltávolítása.');
       // Eseménykezelők eltávolítása (opcionális, de tiszta)
        const activateBtn = this.activationContainer.querySelector('#activate-btn');
        const codeInput = this.activationContainer.querySelector('#activation-code');
         if (activateBtn && this._handleActivationBound) {
             activateBtn.removeEventListener('click', this._handleActivationBound);
         }
         if (codeInput && this._handleEnterKeyBound && this._handleInputFormattingBound) {
             codeInput.removeEventListener('keypress', this._handleEnterKeyBound);
             codeInput.removeEventListener('input', this._handleInputFormattingBound);
         }

       this.activationContainer.parentNode.removeChild(this.activationContainer);
       this.activationContainer = null; // Nullázzuk a referenciát
    }
  }
} // <-- ActivationUI osztály vége

// Globális példány létrehozása (feltételezve, hogy az authService már létezik)
if (window.authService) {
    window.activationUI = new ActivationUI();
} else {
    // Ha az auth-service.js később töltődne be
    console.warn("[ActivationUI] Várakozás a window.authService elérhetőségére...");
    const checkUIInterval = setInterval(() => {
        // Figyeljük az authService ÉS a firebaseApp elérhetőségét is
        if (window.authService && window.firebaseApp) {
            clearInterval(checkUIInterval);
            window.activationUI = new ActivationUI();
            console.log("[ActivationUI] Globális példány létrehozva késleltetéssel.");
            // Esetleg itt újra kellene futtatni az initialize-t? Vagy az index.html gondoskodik róla?
            // Ha az index.html DOMContentLoaded-ben hívja, akkor valószínűleg jó lesz.
        }
    }, 100);
    // Időtúllépés
    setTimeout(() => {
        if (!window.activationUI) {
             clearInterval(checkUIInterval);
            console.error("[ActivationUI] Időtúllépés: window.authService vagy window.firebaseApp nem lett elérhető!");
        }
    }, 5000); // 5 másodperc várakozás
}