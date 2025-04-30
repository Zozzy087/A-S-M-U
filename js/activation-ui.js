// Aktivációs UI kezelő
class ActivationUI {
  constructor() {
    // Fontos: Biztosítsd, hogy a window.authService létezzen, mielőtt ez lefut
    // (Ezt az auth-service.js fájl végén lévő window.authService = new AuthService(); sor intézi)
    if (!window.authService) {
       console.error("AuthService még nem inicializálódott, amikor az ActivationUI létrejött!");
       // Itt kezelhetnéd ezt a hibát, pl. egy késleltetéssel vagy hibaüzenettel
    }
    this.authService = window.authService;
    this.isActivated = false;
    this.activationContainer = null;
  }

  // Aktivációs UI inicializálása
  async initialize() {
    // Ellenőrizzük, hogy az authService elérhető-e
    if (!this.authService) {
        console.error("AuthService nem elérhető az initialize hívásakor.");
        // Dönthetsz úgy, hogy hibát dobsz, vagy megpróbálod később újrahívni
        return false; // Jelezzük, hogy nem sikerült az inicializálás
    }

    // Ellenőrizzük, hogy már hitelesítve van-e
    const user = await this.authService.checkStoredAuth();

    if (user) {
      console.log('Felhasználó már aktiválva van:', user.uid);
      this.isActivated = true;
      this.remove(); // Ha már aktiválva van, távolítsuk el a UI-t, ha esetleg látható maradt
      return true;
    }

    // Aktivációs UI létrehozása és megjelenítése, ha még nincs aktiválva
    this._createActivationUI();
    return false;
  }

  // Aktivációs UI létrehozása
  _createActivationUI() {
    // Ha már létezik, ne hozzunk létre újat
    if (this.activationContainer || document.getElementById('activation-container')) return;

    // Konténer létrehozása
    this.activationContainer = document.createElement('div');
    this.activationContainer.id = 'activation-container';
    // Biztosítjuk, hogy az authService létezzen, mielőtt az eseménykezelőket hozzáadjuk
    if (!this.authService) {
       console.error("AuthService nem elérhető a UI létrehozásakor.");
       // Megjeleníthetsz egy hibaüzenetet a UI-ban
       this.activationContainer.innerHTML = `<div class="activation-overlay"><div class="activation-card"><p class="activation-message">Hiba: Authentikációs szolgáltatás nem érhető el.</p></div></div>`;
       document.body.appendChild(this.activationContainer);
       return; // Ne folytassuk az UI felépítését
    }

    this.activationContainer.innerHTML = `
      <div class="activation-overlay">
        <div class="activation-card">
          <h2>A Sötét Mágia Útvesztője</h2>
          <p>Köszönjük a vásárlást! A folytatáshoz add meg az aktivációs kódodat:</p>
          <div class="activation-form">
            <input type="text" id="activation-code" placeholder="XXXX-XXXX-XXXX" autocomplete="off">
            <button id="activate-btn">Aktiválás</button>
          </div>
          <p id="activation-message" class="activation-message"></p>
          <p class="activation-info"><small>Egy aktivációs kóddal a könyv akár <strong>3 különböző</strong> eszközön is használható.</small></p>
        </div>
      </div>
    `;

    // Stílusok hozzáadása (ha még nincsenek az oldalon)
    if (!document.getElementById('activation-styles')) {
        const style = document.createElement('style');
        style.id = 'activation-styles'; // ID hozzáadása a duplikáció elkerülésére
        style.textContent = `
          .activation-overlay {
            position: fixed;
            top: 0; left: 0;
            width: 100%; height: 100%;
            background-color: rgba(0, 0, 0, 0.85);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10000;
          }

          .activation-card {
            background-color: #1a1a1a;
            color: #fff;
            border-radius: 8px;
            padding: 2rem;
            box-shadow: 0 0 30px rgba(127, 0, 255, 0.5);
            max-width: 90%;
            width: 400px;
            text-align: center;
            font-family: 'Cinzel', serif;
          }

          .activation-card h2 {
            color: #7f00ff;
            margin-bottom: 1.5rem;
          }

          .activation-form {
            margin: 1.5rem 0;
          }

          #activation-code {
            width: 100%;
            padding: 0.75rem;
            background-color: #333;
            border: 1px solid #7f00ff;
            border-radius: 4px;
            color: #fff;
            font-size: 1rem;
            margin-bottom: 1rem;
            text-align: center;
            letter-spacing: 2px;
            box-sizing: border-box; /* Hozzáadva a padding miatti méretproblémák elkerülésére */
          }

          #activate-btn {
            background-color: #7f00ff;
            color: #fff;
            border: none;
            padding: 0.75rem 2rem;
            font-size: 1rem;
            border-radius: 4px;
            cursor: pointer;
            font-family: 'Cinzel', serif;
            transition: background-color 0.3s;
          }

          #activate-btn:hover {
            background-color: #9b30ff;
          }

          #activate-btn:disabled {
            background-color: #5a00b3; /* Kicsit sötétebb letiltva */
            cursor: not-allowed;
          }


          .activation-message {
            min-height: 1.5rem;
            margin-top: 1rem; /* Hozzáadva egy kis térköz */
            font-weight: bold; /* Kiemelés */
          }

          .activation-message.error { /* Külön osztály a hibához */
             color: #ff5555;
          }

          .activation-message.success {
            color: #55ff55;
          }
          
          .activation-info {
            font-size: 0.9rem;
            margin-top: 1.5rem;
            color: #ccc;
          }
          
          .activation-info strong {
            color: #9b30ff;
          }
        `;
        document.head.appendChild(style);
    }

    // Hozzáadjuk az oldalhoz
    document.body.appendChild(this.activationContainer);

    // Eseménykezelők hozzáadása
    // Biztosítjuk, hogy az elemek létezzenek, mielőtt eseménykezelőt adunk hozzájuk
    const activateButton = document.getElementById('activate-btn');
    const codeInput = document.getElementById('activation-code');

    if (activateButton) {
        activateButton.addEventListener('click', () => this._handleActivation());
    } else {
        console.error("Aktivációs gomb (activate-btn) nem található!");
    }

    if (codeInput) {
        codeInput.addEventListener('keypress', (e) => {
          if (e.key === 'Enter') this._handleActivation();
        });
    } else {
        console.error("Aktivációs kód beviteli mező (activation-code) nem található!");
    }
  }

  // Aktivációs üzenet megjelenítése
   _showMessage(message, type = 'info') { // type lehet 'info', 'success', 'error'
    const messageElement = document.getElementById('activation-message');
    if (!messageElement) {
        console.error("Üzenet elem (activation-message) nem található!");
        return;
    }

    messageElement.textContent = message;
    // Osztályok beállítása a típus alapján
    messageElement.className = 'activation-message'; // Alap osztály
    if (type === 'success') {
        messageElement.classList.add('success');
    } else if (type === 'error') {
        messageElement.classList.add('error');
    }
  }

  // Aktivációs kódkezelés - MÓDOSÍTOTT VERZIÓ (Bejelentkezés előrehozva)
  async _handleActivation() {
    const codeInput = document.getElementById('activation-code');
    // Biztosítjuk, hogy az authService létezzen
    if (!this.authService) {
        console.error("AuthService nem elérhető a _handleActivation hívásakor.");
        this._showMessage('Hiba: Authentikációs szolgáltatás nem elérhető.', 'error');
        return;
    }

    // Ellenőrizzük, hogy a codeInput létezik-e
    if (!codeInput) {
        console.error("Aktivációs kód beviteli mező nem található a _handleActivationben.");
        this._showMessage('Hiba: Nem található a kód beviteli mező.', 'error');
        return;
    }
    const code = codeInput.value.trim().toUpperCase();


    if (!code) {
      this._showMessage('Kérlek add meg az aktivációs kódot', 'error');
      return;
    }

    // Gomb letiltása az ellenőrzés idejére
    const activateBtn = document.getElementById('activate-btn');
     if (!activateBtn) {
        console.error("Aktivációs gomb nem található a _handleActivationben.");
        // A folyamat mehet tovább, de a gombot nem tudjuk kezelni
    } else {
        activateBtn.disabled = true;
        activateBtn.textContent = 'Ellenőrzés...';
    }
    this._showMessage(''); // Korábbi üzenet törlése

    try {
      // === Bejelentkezés biztosítása ===
      let currentUser = this.authService.auth.currentUser;
      // Ha nincs bejelentkezett felhasználó, próbáljunk meg bejelentkezni
      if (!currentUser) {
        console.log('Nincs aktív felhasználó, névtelen bejelentkezés megkísérlése...');
        try {
          await this.authService.signInAnonymously();
          currentUser = this.authService.auth.currentUser; // Frissítjük a currentUser változót
          if (!currentUser) {
            // Ha a bejelentkezés után sincs felhasználó, az komoly hiba
            throw new Error('Névtelen bejelentkezés sikertelen.');
          }
          console.log('Névtelen bejelentkezés sikeres:', currentUser.uid);
        } catch (signInError) {
          console.error('Névtelen bejelentkezési hiba:', signInError);
          this._showMessage('Hiba történt a bejelentkezés során.', 'error');
          if(activateBtn) { // Csak akkor állítjuk vissza, ha létezik
             activateBtn.disabled = false;
             activateBtn.textContent = 'Aktiválás';
          }
          return; // Megszakítjuk a folyamatot, ha a bejelentkezés nem sikerül
        }
      } else {
         console.log('Aktív felhasználó már van:', currentUser.uid);
      }
      // === Bejelentkezés biztosítása VÉGE ===

      // Most már van bejelentkezett felhasználó (currentUser), jöhet a kód ellenőrzése
      this._showMessage('Kód ellenőrzése...', 'info'); // Tájékoztató üzenet
      const verification = await this.authService.verifyActivationCode(code);

      if (!verification.valid) {
        this._showMessage(verification.message || 'Érvénytelen aktivációs kód', 'error');
         if(activateBtn) {
             activateBtn.disabled = false;
             activateBtn.textContent = 'Aktiválás';
          }
        return;
      }

      // Ha a kód érvényes, de az eszköz már aktiválva van
      if (verification.alreadyActivated) {
        this._showMessage('Eszköz sikeresen azonosítva!', 'success');
        // A currentUser biztosan létezik ekkorra
        // Frissítsük a hitelesítési adatokat a local storage-ban (redundáns lehet, de biztosít)
        await this.authService.storeCredentials(currentUser);

      } else {
        // Új aktiválás (első eszköz vagy új eszköz hozzáadása)
        this._showMessage('Sikeres aktiváció! Eszköz hozzáadása...', 'success');
        // A currentUser biztosan létezik ekkorra
        // Kód megjelölése aktívként és eszköz hozzáadása
        await this.authService.markCodeAsActive(code, currentUser.uid);
        // Hitelesítés mentése
        await this.authService.storeCredentials(currentUser);
      }

      // UI frissítése és átirányítás/könyvmegjelenítés
      this.isActivated = true;

      // Jelezzük a sikert az inicializáló kódnak (pl. az index.html-ben)
      // Létrehozunk egy egyedi eseményt
       const activationSuccessEvent = new Event('activationSuccess');
       document.dispatchEvent(activationSuccessEvent);


      // Kis szünet a sikeres üzenet megjelenítéséhez, majd UI eltüntetése
      setTimeout(() => {
        this.remove(); // UI eltávolítása a remove() függvénnyel
         console.log("Aktivációs felület eltávolítva.");
         // Az alkalmazás indítását most már az index.html-ben lévő
         // 'activationSuccess' eseményre figyelő kódnak kellene kezelnie.
      }, 1500); // Késleltetés a sikeres üzenet olvashatóságáért

    } catch (error) {
      console.error('Aktiválási hiba a _handleActivationben:', error);
      // Általános hibaüzenet, ha valami váratlan történik
      // (pl. a bejelentkezés vagy a Firestore művelet dob kivételt)
      this._showMessage('Hiba történt az aktiválás során.', 'error');

      if (activateBtn) {
        activateBtn.disabled = false;
        activateBtn.textContent = 'Aktiválás';
      }
    }
  }

  // Aktivációs UI eltávolítása
  remove() {
    if (this.activationContainer) {
      this.activationContainer.remove();
      this.activationContainer = null; // Töröljük a referenciát is
      console.log("Aktivációs konténer eltávolítva.");
    }
     // Esetleg a stílusokat is eltávolíthatnánk, ha már nincs rájuk szükség
     const activationStyles = document.getElementById('activation-styles');
     if (activationStyles) {
        // activationStyles.remove(); // Óvatosan, ha más is használhatja ezeket a stílusokat
     }
  }
}

// Exportáljuk az osztályt, de csak miután a DOM betöltődött,
// és biztosítjuk, hogy az authService már létezik.
// Ezt inkább az index.html-ben lévő fő inicializáló szkriptnek kellene kezelnie.
// Közvetlenül itt létrehozni a window objektumon rizikós lehet a betöltési sorrend miatt.
// Javaslat: Az index.html-ben a DOMContentLoaded után példányosítsd:
// document.addEventListener('DOMContentLoaded', async () => {
//    window.authService = new AuthService(); // Feltéve, hogy az AuthService definíciója már betöltődött
//    window.activationUI = new ActivationUI();
//    // ... többi inicializáló kód ...
// });

// A biztonság kedvéért itt hagyjuk, de az index.html-es megoldás robusztusabb:
 if (window.authService) {
     window.activationUI = new ActivationUI();
 } else {
     // Ha az authService még nem jött létre, várjunk egy kicsit, vagy jelezzük a problémát
     console.warn("AuthService még nem volt elérhető, amikor az activationUI példányosult volna.");
     // Esetleg próbálkozhatunk később:
     // setTimeout(() => {
     //    if (window.authService && !window.activationUI) {
     //        window.activationUI = new ActivationUI();
     //        console.log("ActivationUI késleltetve példányosítva.");
     //    }
     // }, 500);
 }