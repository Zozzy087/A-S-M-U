// Aktivációs UI kezelő (JAVÍTOTT Verzió - Kétféle kódformátum kezelése)
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
    // Ezt a regexet már nem használjuk a formázáshoz, de maradhat ellenőrzésre ha kell
    // this.correctCodeFormat = /^[A-Z0-9-]+$/;
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
        return;
    }
     if (this.activationContainer) {
         console.log('[ActivationUI] Aktivációs konténer objektum már létezik, de nincs a DOM-ban? Újra létrehozzuk.');
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
            {/* Figyelem: a maxlength="19" a 4-4-4-4 formátumhoz jó, az 5-4-4(-4?) adminhoz lehet, hogy kevés! Átírva 23-ra. */}
            <input type="text" id="activation-code" placeholder="Kód beírása..." autocomplete="off" maxlength="23">
            <button id="activate-btn">Aktiválás</button>
          </div>
          <p id="activation-message" class="activation-message"></p>
          <p class="activation-info">Egy aktivációs kóddal a könyv akár 3 különböző eszközön is használható (PC, telefon, tablet).</p>
        </div>
      </div>
    `;

    // Stílusok hozzáadása (ZÖLD STÍLUSOK)
    const style = document.createElement('style');
    style.textContent = `
      .activation-overlay {
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background-color: rgba(0, 0, 0, 0.90); display: flex; justify-content: center; align-items: center;
        z-index: 10000; backdrop-filter: blur(3px);
      }
      .activation-card {
        background-color: #1a1a1a; color: #e0e0e0; border-radius: 8px; padding: 2rem;
        border: 1px solid #32CD32; box-shadow: 0 0 20px 5px rgba(50, 205, 50, 0.5);
        max-width: 90%; width: 400px; text-align: center; font-family: 'Cinzel', serif;
      }
      .activation-card h2 { color: #32CD32; margin-bottom: 1.5rem; text-shadow: 0 0 5px rgba(50, 205, 50, 0.7); }
      .activation-form { margin: 1.5rem 0; }
      #activation-code {
        width: 100%; padding: 0.75rem; background-color: #333; border: 1px solid #32CD32; border-radius: 4px;
        color: #e0e0e0; font-size: 1rem; margin-bottom: 1rem; text-align: center; letter-spacing: 2px; box-sizing: border-box;
      }
      #activation-code::placeholder { color: #888; opacity: 0.7; }
      #activation-code:focus { outline: none; box-shadow: 0 0 8px rgba(50, 205, 50, 0.6); }
      #activate-btn {
        background-color: #368B27; color: #ffffff; border: none; padding: 0.75rem 2rem; font-size: 1rem; border-radius: 4px;
        cursor: pointer; font-family: 'Cinzel', serif; transition: background-color 0.3s, box-shadow 0.3s, transform 0.1s;
        box-shadow: 0 0 5px rgba(54, 139, 39, 0.5);
      }
      #activate-btn:hover { background-color: #4CAF50; box-shadow: 0 0 10px rgba(76, 175, 80, 0.7); }
      #activate-btn:active { transform: scale(0.98); }
      #activate-btn:disabled { background-color: #555; color: #999; cursor: not-allowed; box-shadow: none; }
      .activation-message { min-height: 1.5rem; margin-top: 1rem; font-weight: bold; color: #ff6b6b; }
      .activation-message.success { color: #32CD32; }
      .activation-info { font-size: 0.9rem; color: #cccccc; margin-top: 1.5rem; opacity: 0.8; }
    `;

    // Stílusok hozzáadása a head-hez (csak egyszer)
    if (!document.querySelector('style[data-activation-style]')) {
        style.setAttribute('data-activation-style', 'true');
        document.head.appendChild(style);
    }

    // Konténer hozzáadása a body-hoz
    document.body.appendChild(this.activationContainer);

    // Eseménykezelők hozzáadása
    const activateBtn = document.getElementById('activate-btn');
    const codeInput = document.getElementById('activation-code');

    if (activateBtn) {
         this._handleActivationBound = this._handleActivationBound || this._handleActivation.bind(this);
         activateBtn.addEventListener('click', this._handleActivationBound);
    } else {
        console.error("[ActivationUI] Aktivációs gomb nem található!");
    }

    if (codeInput) {
        this._handleEnterKeyBound = this._handleEnterKeyBound || ((e) => { if (e.key === 'Enter') this._handleActivation(); }).bind(this);
        // === JAVÍTÁS ITT: A régi logikát használó formázó függvényt kötjük be ===
        this._handleInputFormattingBound = this._handleInputFormattingBound || this._formatInputOnType_Combined.bind(this); // A JAVÍTOTT FUNKCIÓT HASZNÁLJUK

        codeInput.addEventListener('keypress', this._handleEnterKeyBound);
        codeInput.addEventListener('input', this._handleInputFormattingBound); // A JAVÍTOTT FUNKCIÓT HASZNÁLJUK
        codeInput.focus();
    } else {
        console.error("[ActivationUI] Aktivációs kód beviteli mező nem található!");
    }

     console.log('[ActivationUI] Aktivációs UI sikeresen létrehozva és eseménykezelők hozzáadva.');
  }


  // =========================================================================
  // == JAVÍTOTT KÓDFORMÁZÓ FÜGGVÉNY (a régi logika alapján) ==
  // =========================================================================
  /**
   * Segédfüggvény a beviteli mező formázásához gépelés közben
   * Támogatja az 5-4-4 (admin) és 4-4-4-4 (normál) formátumokat is.
   */
  _formatInputOnType_Combined(event) {
    const inputElement = event.target;
    // 1. Aktuális érték és kurzorpozíció mentése
    const originalValue = inputElement.value;
    const originalCursorPos = inputElement.selectionStart;

    // 2. Érték tisztítása: Nagybetűsítés, csak A-Z, 0-9 engedélyezése a logikához
    let cleanValue = originalValue.toUpperCase().replace(/[^A-Z0-9]/g, '');

    // 3. Formátum meghatározása és kötőjelek alkalmazása
    let formattedValue = '';
    const isAdminCode = cleanValue.startsWith('ADMIN'); // Ellenőrizzük az ADMIN prefixet

    let segments;
    if (isAdminCode) {
      // Admin kód: 5-4-4-4 (vagy amilyen hosszú valójában)
      segments = [5, 4, 4, 4]; // Igazítsd a valós admin kód hosszakhoz, ha szükséges
    } else {
      // Normál kód: 4-4-4-4
      segments = [4, 4, 4, 4];
    }

    let currentPos = 0;
    let segmentIndex = 0;
    while (currentPos < cleanValue.length && segmentIndex < segments.length) {
      const segmentLength = segments[segmentIndex];
      const segment = cleanValue.substring(currentPos, currentPos + segmentLength);
      if (segment.length > 0) {
        formattedValue += (formattedValue.length > 0 ? '-' : '') + segment;
        currentPos += segment.length;
        segmentIndex++;
      } else {
        break; // Nincs több karakter
      }
    }
    // Ha maradt még karakter a várt szegmensek után (nem kellene, de biztos, ami biztos)
    if (currentPos < cleanValue.length) {
         formattedValue += (formattedValue.length > 0 ? '-' : '') + cleanValue.substring(currentPos);
    }

    // 4. Maximális hossz korlátozása (az input maxlength alapján)
    const maxLength = inputElement.maxLength > 0 ? inputElement.maxLength : (isAdminCode ? 22 : 19); // Becsült max hossz
    formattedValue = formattedValue.substring(0, maxLength);

    // 5. Érték frissítése és kurzor pozíció visszaállítása, ha az érték változott
    if (originalValue !== formattedValue) {
      // Számoljuk ki az új kurzorpozíciót a kötőjelek figyelembevételével
      let newCursorPos = originalCursorPos;
      // Ahogy adunk hozzá/veszünk el kötőjeleket, a kurzor elmozdulhat
      // Ez a kurzor pozíció számítás egyszerűsített, nem tökéletes minden esetben
      // De megpróbálja követni a relatív helyet
      let originalHyphens = (originalValue.substring(0, originalCursorPos).match(/-/g) || []).length;
      let newHyphens = (formattedValue.substring(0, originalCursorPos + (formattedValue.length - originalValue.length)).match(/-/g) || []).length; // Becslés
      newCursorPos += (newHyphens - originalHyphens);
      newCursorPos = Math.max(0, Math.min(formattedValue.length, newCursorPos)); // Korlátok közé szorítás


      inputElement.value = formattedValue;

      // Kurzort csak a renderelés után állítjuk be
      requestAnimationFrame(() => {
           inputElement.setSelectionRange(newCursorPos, newCursorPos);
       });
    }
  }
  // =========================================================================
  // == JAVÍTOTT KÓDFORMÁZÓ FÜGGVÉNY VÉGE ==
  // =========================================================================


  // Aktivációs üzenet megjelenítése
  _showMessage(message, isSuccess = false) {
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

  // Aktivációs kódkezelés
  async _handleActivation() {
     if (!this.authService) {
         console.error("[ActivationUI] AuthService nem elérhető a _handleActivation során.");
         this._showMessage("Hiba: A hitelesítési szolgáltatás nem érhető el.");
         return;
     }
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

    // --- Fontos: A kódot itt már a BEGÉPELT (formázott) formában használjuk ---
    // Az authService feladata lesz a kötőjelek kezelése/eltávolítása, ha szükséges
    // Vagy itt is tisztíthatjuk:
    // const codeToSend = rawCode.replace(/-/g, ''); // Kötőjelek nélküli verzió küldése
    const code = rawCode; // Meghagyjuk a formázottat, az authService kezeli

    // --- Kezdődik a tényleges aktivációs logika ---
    activateBtn.disabled = true;
    activateBtn.textContent = 'Ellenőrzés...';
    this._showMessage(''); // Töröljük az előző üzenetet

    try {
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

      console.log(`[ActivationUI] Kód ellenőrzése Firestore-ban: ${code}`);
      const verification = await this.authService.verifyActivationCode(code);

      if (!verification.valid) {
        console.warn(`[ActivationUI] Kód ellenőrzés sikertelen: ${verification.message}`);
        this._showMessage(verification.message || 'Érvénytelen vagy már teljesen felhasznált aktivációs kód.');
        // Hiba esetén input mező tartalmát nem töröljük, hogy javítható legyen
        activateBtn.disabled = false;
        activateBtn.textContent = 'Aktiválás';
        return; // Fontos, hogy itt megálljunk hiba esetén
      }

      console.log('[ActivationUI] Kód ellenőrzés sikeres. Folytatás: kód megjelölése/token kérése.');
      activateBtn.textContent = 'Aktiválás...';

      await this.authService.markCodeAsUsed(code, currentUser.uid);
      console.log('[ActivationUI] markCodeAsUsed sikeresen lefutott (token kérés elindítva).');

      // Várjunk egy kicsit, hogy a token lekérésnek legyen esélye lefutni a háttérben
      // Ez nem garantálja, de növeli az esélyt, hogy a reload után már legyen token
      await new Promise(resolve => setTimeout(resolve, 500)); // Fél másodperc várakozás

      // Hitelesítési adatok mentése (opcionális)
      await this.authService.storeCredentials(currentUser);

      this._showMessage('Sikeres aktiváció!', true);
      this.isActivated = true;

      setTimeout(() => {
        this.remove();
         // Újratöltjük az oldalt a sikeres aktiváció után
         location.reload();
      }, 1500); // Késleltetés a sikeres üzenet miatt

    } catch (error) {
      console.error('[ActivationUI] Aktiválási hiba a _handleActivation try blokkban:', error);
      // Próbáljuk meg a hibaüzenetet megjeleníteni a felhasználónak
      this._showMessage(error.message || 'Ismeretlen hiba történt az aktiválás során.');

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
       this.activationContainer = null;
    }
  }
} // <-- ActivationUI osztály vége

// Globális példány létrehozása (feltételezve, hogy az authService már létezik)
if (window.authService) {
    window.activationUI = new ActivationUI();
} else {
    console.warn("[ActivationUI] Várakozás a window.authService elérhetőségére...");
    const checkUIInterval = setInterval(() => {
        if (window.authService && window.firebaseApp) {
            clearInterval(checkUIInterval);
            window.activationUI = new ActivationUI();
            console.log("[ActivationUI] Globális példány létrehozva késleltetéssel.");
        }
    }, 100);
    setTimeout(() => {
        if (!window.activationUI) {
             clearInterval(checkUIInterval);
            console.error("[ActivationUI] Időtúllépés: window.authService vagy window.firebaseApp nem lett elérhető!");
        }
    }, 5000);
}