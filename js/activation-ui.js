// Aktivációs UI kezelő (MÓDOSÍTOTT ZÖLD STÍLUSSAL és HELYES KÓDKEZELÉSSEL)
class ActivationUI {
  constructor() {
    if (window.authService) {
        this.authService = window.authService;
    } else {
        console.error("[ActivationUI] Hiba: window.authService nem található! Aktiváció nem fog működni.");
    }
    this.isActivated = false;
    this.activationContainer = null;
  }

  // Aktivációs UI inicializálása
  async initialize() {
    if (!this.authService) {
        console.error("[ActivationUI] AuthService nem inicializálódott, initialize megszakítva.");
        return false;
    }
    const user = await this.authService.checkStoredAuth();
    if (user) {
      console.log('[ActivationUI] Felhasználó már aktiválva és van érvényes token:', user.uid);
      this.isActivated = true;
      this.remove();
      return true;
    } else {
        console.log('[ActivationUI] Felhasználó nincs aktiválva vagy nincs érvényes token. Aktivációs UI megjelenítése.');
        this.isActivated = false;
        this._createActivationUI();
        return false;
    }
  }

  // Aktivációs UI létrehozása
  _createActivationUI() {
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
    this.activationContainer = document.createElement('div');
    this.activationContainer.id = 'activation-container';
    this.activationContainer.innerHTML = `
      <div class="activation-overlay">
        <div class="activation-card">
          <h2>A Sötét Mágia Útvesztője</h2>
          <p>Köszönjük a vásárlást! A folytatáshoz add meg az aktivációs kódodat:</p>
          <div class="activation-form">
            
            <input type="text" id="activation-code" placeholder="Kód beírása..." autocomplete="off" maxlength="23">
            <button id="activate-btn">Aktiválás</button>
          </div>
          <p id="activation-message" class="activation-message"></p>
          <p class="activation-info">Egy aktivációs kóddal a könyv akár 3 különböző eszközön is használható (PC, telefon, tablet).</p>
        </div>
      </div>
    `;
    const style = document.createElement('style');
    style.textContent = `
      .activation-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background-color: rgba(0, 0, 0, 0.90); display: flex; justify-content: center; align-items: center; z-index: 10000; backdrop-filter: blur(3px); }
      .activation-card { background-color: #1a1a1a; color: #e0e0e0; border-radius: 8px; padding: 2rem; border: 1px solid #32CD32; box-shadow: 0 0 20px 5px rgba(50, 205, 50, 0.5); max-width: 90%; width: 400px; text-align: center; font-family: 'Cinzel', serif; }
      .activation-card h2 { color: #32CD32; margin-bottom: 1.5rem; text-shadow: 0 0 5px rgba(50, 205, 50, 0.7); }
      .activation-form { margin: 1.5rem 0; }
      #activation-code { width: 100%; padding: 0.75rem; background-color: #333; border: 1px solid #32CD32; border-radius: 4px; color: #e0e0e0; font-size: 1rem; margin-bottom: 1rem; text-align: center; letter-spacing: 2px; box-sizing: border-box; }
      #activation-code::placeholder { color: #888; opacity: 0.7; }
      #activation-code:focus { outline: none; box-shadow: 0 0 8px rgba(50, 205, 50, 0.6); }
      #activate-btn { background-color: #368B27; color: #ffffff; border: none; padding: 0.75rem 2rem; font-size: 1rem; border-radius: 4px; cursor: pointer; font-family: 'Cinzel', serif; transition: background-color 0.3s, box-shadow 0.3s, transform 0.1s; box-shadow: 0 0 5px rgba(54, 139, 39, 0.5); }
      #activate-btn:hover { background-color: #4CAF50; box-shadow: 0 0 10px rgba(76, 175, 80, 0.7); }
      #activate-btn:active { transform: scale(0.98); }
      #activate-btn:disabled { background-color: #555; color: #999; cursor: not-allowed; box-shadow: none; }
      .activation-message { min-height: 1.5rem; margin-top: 1rem; font-weight: bold; color: #ff6b6b; }
      .activation-message.success { color: #32CD32; }
      .activation-info { font-size: 0.9rem; color: #cccccc; margin-top: 1.5rem; opacity: 0.8; }
    `;
    if (!document.querySelector('style[data-activation-style]')) {
        style.setAttribute('data-activation-style', 'true');
        document.head.appendChild(style);
    }
    document.body.appendChild(this.activationContainer);
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
        this._handleInputFormattingBound = this._handleInputFormattingBound || this._formatInputOnType_Combined.bind(this); // A javított formázót használjuk
        codeInput.addEventListener('keypress', this._handleEnterKeyBound);
        codeInput.addEventListener('input', this._handleInputFormattingBound); // A javított formázót használjuk
        codeInput.focus();
    } else {
        console.error("[ActivationUI] Aktivációs kód beviteli mező nem található!");
    }
    console.log('[ActivationUI] Aktivációs UI sikeresen létrehozva és eseménykezelők hozzáadva.');
  }

   // =======================================================================
   // ==      KÓDFORMÁZÓ FÜGGVÉNY (ADMIN 5-4-4-4 és NORMÁL 4-4-4-4)      ==
   // =======================================================================
   _formatInputOnType_Combined(event) {
        const inputElement = event.target;
        const originalValue = inputElement.value;
        let selectionStart = inputElement.selectionStart;

        let cleanValue = inputElement.value.toUpperCase().replace(/[^A-Z0-9]/g, '');

        let formattedValue = '';
        const isAdminCode = cleanValue.startsWith('ADMIN');
        let maxLength = 16; // Normál kód (4*4)

        if (isAdminCode) {
            maxLength = 17; // ADMIN + 3*4 = 17
             if (cleanValue.length > maxLength) { cleanValue = cleanValue.substring(0, maxLength); }
            const segments = [cleanValue.substring(0, 5)];
            if (cleanValue.length > 5) segments.push(cleanValue.substring(5, 9));
            if (cleanValue.length > 9) segments.push(cleanValue.substring(9, 13));
            if (cleanValue.length > 13) segments.push(cleanValue.substring(13, 17));
            formattedValue = segments.join('-');
        } else {
             if (cleanValue.length > maxLength) { cleanValue = cleanValue.substring(0, maxLength); }
            const segments = [cleanValue.substring(0, 4)];
            if (cleanValue.length > 4) segments.push(cleanValue.substring(4, 8));
            if (cleanValue.length > 8) segments.push(cleanValue.substring(8, 12));
            if (cleanValue.length > 12) segments.push(cleanValue.substring(12, 16));
            formattedValue = segments.join('-');
        }

        if (inputElement.value !== formattedValue) {
            inputElement.value = formattedValue;
             try {
                // Kurzopozíció egyszerű visszaállítása (böngészőre bízva a kötőjeleket)
                let newPos = selectionStart;
                const diff = formattedValue.length - originalValue.length;
                // Alapvető logika: ha kötőjel került be a kurzor elé, nő a pozíció
                 const oldHyphensBefore = (originalValue.substring(0, selectionStart).match(/-/g) || []).length;
                 const newHyphensBefore = (formattedValue.substring(0, selectionStart + diff > 0 ? selectionStart + diff : selectionStart ).match(/-/g) || []).length;
                 newPos = selectionStart + (newHyphensBefore - oldHyphensBefore);


                if (newPos < 0) newPos = 0;
                if (newPos > formattedValue.length) newPos = formattedValue.length;
                inputElement.setSelectionRange(newPos, newPos);
             } catch (e) { /* Hiba esetén nem csinálunk semmit */ }
        }
   }
   // =======================================================================
   // ==                      VÉGE: KÓDFORMÁZÓ FÜGGVÉNY                    ==
   // =======================================================================


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


   // =======================================================================
   // ==         JAVÍTOTT _handleActivation (MEGHAGYJA A KÖTŐJELET)       ==
   // =======================================================================
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

    // Közvetlenül a beviteli mező értékét használjuk, amit az _formatInputOnType_Combined már formázott
    let rawCode = codeInput.value.trim();

    if (!rawCode) {
      this._showMessage('Kérlek add meg az aktivációs kódot');
      return;
    }

    // Csak nagybetűsítjük, a kötőjeleket MEGHAGYJUK, mert a Firestore ID így tartalmazza!
    const code = rawCode.toUpperCase();

    // Opcionális: Ellenőrizhetjük a formátumot itt is kicsit lazábban, mielőtt küldenénk
    // Például: van-e benne kötőjel és csak engedélyezett karakterek
    // De a fő ellenőrzést a szervernek (authService.verifyActivationCode) kell elvégeznie.
     if (code.indexOf('-') === -1 || !/^[A-Z0-9-]+$/.test(code)) {
        // Ez a feltétel lehet túl szigorú, ha pl. valaki kötőjel nélkül másolja be.
        // Talán jobb ezt a részt kivenni, és bízni a backend ellenőrzésben.
        // Vagy finomítani kell, hogy a kötőjel nélküli beírást is kezelje itt.
        // Egyelőre kikommentezem, hogy ne akadályozzon:
        // this._showMessage('Érvénytelen kód formátum. Használj kötőjeleket.');
        // activateBtn.disabled = false; // Ne felejtsük el újra engedélyezni a gombot itt
        // activateBtn.textContent = 'Aktiválás';
        // return;
     }


    console.log(`[ActivationUI] Formázott kód ellenőrzésre küldése (kötőjelekkel): ${code}`);

    activateBtn.disabled = true;
    activateBtn.textContent = 'Ellenőrzés...';
    this._showMessage('');

    try {
      let currentUser = this.authService.auth.currentUser;
      if (!currentUser) {
        console.log('[ActivationUI] Nincs bejelentkezett user, névtelen bejelentkezés megkísérlése...');
        const signInResult = await this.authService.signInAnonymously();
        currentUser = signInResult.user;
         if (!currentUser) { throw new Error("Nem sikerült névtelen felhasználót létrehozni."); }
         console.log('[ActivationUI] Névtelen bejelentkezés sikeres.');
      }

      // 1. Kód ellenőrzése (a KÖTŐJELES kóddal)
      console.log(`[ActivationUI] Kód ellenőrzése Firestore-ban: ${code}`);
      const verification = await this.authService.verifyActivationCode(code); // Kötőjeles kódot küldünk!

      if (!verification.valid) {
        console.warn(`[ActivationUI] Kód ellenőrzés sikertelen: ${verification.message}`);
        this._showMessage(verification.message || `Érvénytelen vagy felhasznált kód: ${code}`);
        activateBtn.disabled = false;
        activateBtn.textContent = 'Aktiválás';
        return;
      }

      console.log('[ActivationUI] Kód ellenőrzés sikeres. Folytatás: kód megjelölése/token kérése.');
      activateBtn.textContent = 'Aktiválás...';

      // 2. Kód használtként jelölése / Eszköz hozzáadása ÉS Token kérése (a KÖTŐJELES kóddal)
      await this.authService.markCodeAsUsed(code, currentUser.uid); // Kötőjeles kódot használunk!
      console.log('[ActivationUI] markCodeAsUsed sikeresen lefutott (token kérés elindítva).');

      // 3. Hitelesítési adatok mentése
      await this.authService.storeCredentials(currentUser);

      this._showMessage('Sikeres aktiváció!', true);
      this.isActivated = true;
      setTimeout(() => {
        this.remove();
         location.reload(); // Oldal újratöltése
      }, 1500);

    } catch (error) {
      console.error('[ActivationUI] Aktiválási hiba a _handleActivation try blokkban:', error);
      this._showMessage(error.message || 'Ismeretlen hiba történt az aktiválás során.');
      if (activateBtn) {
         activateBtn.disabled = false;
         activateBtn.textContent = 'Aktiválás';
      }
    }
  }
   // =======================================================================
   // ==                  VÉGE: JAVÍTOTT _handleActivation                 ==
   // =======================================================================


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

// Globális példány létrehozása
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