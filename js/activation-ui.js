// Aktivációs UI kezelő - Javított verzió mobil kompatibilitással
class ActivationUI {
  constructor() {
    console.log("ActivationUI konstruktor elindult");
    this.authService = null;
    this.isActivated = false;
    this.activationContainer = null;
    this.initRetries = 0;
    this.maxRetries = 3;
  }

  // Aktivációs UI inicializálása - Javított verzió mobil támogatással
  async initialize() {
    console.log("ActivationUI.initialize() elindult");
    
    try {
      // Ellenőrizzük, hogy a window.authService létezik-e, ha nem, várunk egy kicsit
      if (!window.authService) {
        console.log("AuthService még nem elérhető, várakozás...");
        
        // Maximum 3 próbálkozás, 1 másodperc szünettel
        if (this.initRetries < this.maxRetries) {
          this.initRetries++;
          console.log(`Újrapróbálkozás ${this.initRetries}/${this.maxRetries}...`);
          
          return new Promise(resolve => {
            setTimeout(async () => {
              if (window.authService) {
                this.authService = window.authService;
                console.log("AuthService most már elérhető");
                const result = await this.initialize();
                resolve(result);
              } else {
                console.error("AuthService továbbra sem elérhető");
                this._createActivationUI(); // Visszatérünk az aktivációs UI-hoz hibakezeléssel
                resolve(false);
              }
            }, 1000); // 1 másodperc várakozás
          });
        } else {
          console.error("AuthService nem található több kísérlet után sem");
          // Létrehozzuk az aktivációs UI-t, de belerakunk egy hibaüzenetet
          this._createActivationUI(true);
          return false;
        }
      }

      // Ha ide eljutunk, akkor az authService létezik
      this.authService = window.authService;
      console.log("AuthService sikeresen elérve", !!this.authService);

      // Ellenőrizzük, hogy már hitelesítve van-e
      try {
        const user = await this.authService.checkStoredAuth();
        console.log("Tárolt hitelesítés ellenőrzése:", !!user);

        if (user) {
          console.log('Felhasználó már aktiválva van:', user.uid);
          this.isActivated = true;
          this.remove(); // Ha már aktiválva van, távolítsuk el a UI-t, ha esetleg látható maradt
          return true;
        }
      } catch (authCheckError) {
        console.error("Hiba a tárolt hitelesítés ellenőrzésekor:", authCheckError);
      }

      // Aktivációs UI létrehozása és megjelenítése, ha még nincs aktiválva
      this._createActivationUI();
      return false;
    } catch (error) {
      console.error("Súlyos hiba az initialize() függvényben:", error);
      this._createActivationUI(true);
      return false;
    }
  }

  // Aktivációs UI létrehozása - kibővített hibajelzéssel
  _createActivationUI(showServiceError = false) {
    console.log("_createActivationUI() elindult, hibajelzés:", showServiceError);
    
    // Ha már létezik, ne hozzunk létre újat
    if (this.activationContainer || document.getElementById('activation-container')) {
      console.log("Aktivációs konténer már létezik, nem hozunk létre újat");
      return;
    }

    // Konténer létrehozása
    this.activationContainer = document.createElement('div');
    this.activationContainer.id = 'activation-container';
    
    // Alapértelmezett HTML tartalom (hibával vagy anélkül)
    let contentHTML = `
      <div class="activation-overlay">
        <div class="activation-card">
          <h2>A Sötét Mágia Útvesztője</h2>
          ${showServiceError ? 
            `<p class="activation-error">Hiba: A rendszer nem tudott kapcsolódni a szerverhez. Kérjük, próbáld újra később vagy ellenőrizd az internetkapcsolatot.</p>` 
            : 
            `<p>Köszönjük a vásárlást! A folytatáshoz add meg az aktivációs kódodat:</p>`
          }
          <div class="activation-form">
            <input type="text" id="activation-code" placeholder="XXXX-XXXX-XXXX" autocomplete="off">
            <button id="activate-btn">Aktiválás</button>
          </div>
          <p id="activation-message" class="activation-message"></p>
          <p class="activation-info"><small>Egy aktivációs kóddal a könyv akár <strong>3 különböző</strong> eszközön is használható.</small></p>
          <div id="debug-info" class="debug-info" style="display: none;"></div>
        </div>
      </div>
    `;

    this.activationContainer.innerHTML = contentHTML;

    // Stílusok hozzáadása (ha még nincsenek az oldalon)
    if (!document.getElementById('activation-styles')) {
        const style = document.createElement('style');
        style.id = 'activation-styles';
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
            box-sizing: border-box;
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
            background-color: #5a00b3;
            cursor: not-allowed;
          }

          .activation-message {
            min-height: 1.5rem;
            margin-top: 1rem;
            font-weight: bold;
          }

          .activation-message.error {
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
          
          .activation-error {
            color: #ff5555;
            font-weight: bold;
            margin-bottom: 1rem;
          }
          
          .debug-info {
            font-size: 0.8rem;
            margin-top: 1.5rem;
            padding: 0.5rem;
            background-color: #111;
            border-radius: 4px;
            text-align: left;
            color: #888;
            max-height: 100px;
            overflow-y: auto;
          }
          
          /* Mobilra optimalizálás */
          @media (max-width: 480px) {
            .activation-card {
              padding: 1.5rem;
              width: 85%;
            }
            
            #activation-code,
            #activate-btn {
              font-size: 16px; /* Nagyobb betűméret mobilon */
            }
            
            #activate-btn {
              padding: 0.85rem 1.5rem;
              width: 100%; /* Teljes szélesség mobilon */
            }
          }
        `;
        document.head.appendChild(style);
    }

    // Hozzáadjuk az oldalhoz
    document.body.appendChild(this.activationContainer);
    console.log("Aktivációs UI létrehozva és beillesztve a DOM-ba");

    // Eseménykezelők hozzáadása
    const activateButton = document.getElementById('activate-btn');
    const codeInput = document.getElementById('activation-code');

    // Debug gomb - 3x kattintásra megjelenik a debug info
    const header = this.activationContainer.querySelector('h2');
    if (header) {
      let clickCount = 0;
      let clickTimer = null;
      
      header.addEventListener('click', () => {
        clickCount++;
        
        // Reset after 2 seconds
        clearTimeout(clickTimer);
        clickTimer = setTimeout(() => { clickCount = 0; }, 2000);
        
        // Show debug after 3 clicks
        if (clickCount >= 3) {
          const debugInfo = document.getElementById('debug-info');
          if (debugInfo) {
            debugInfo.style.display = 'block';
            debugInfo.innerHTML = `
              Firebase inicializálva: ${!!(window.firebaseApp)}<br>
              Auth szolgáltatás: ${!!(window.authService)}<br>
              Auth User ID: ${window.authService?.auth?.currentUser?.uid || 'nincs'}<br>
              Mobilos böngésző: ${/Android|webOS|iPhone|iPad|iPod/i.test(navigator.userAgent)}<br>
              Böngésző User Agent: ${navigator.userAgent}
            `;
          }
          clickCount = 0;
        }
      });
    }

    // Gomb eseménykezelő
    if (activateButton) {
        activateButton.addEventListener('click', () => this._handleActivation());
    } else {
        console.error("Aktivációs gomb (activate-btn) nem található!");
    }

    // Input mező eseménykezelő
    if (codeInput) {
        codeInput.addEventListener('keypress', (e) => {
          if (e.key === 'Enter') this._handleActivation();
        });
    } else {
        console.error("Aktivációs kód beviteli mező (activation-code) nem található!");
    }
    
    // Ha szeretnénk, hogy minden mobilon működjön, állítsuk fókuszba az inputot
    if (codeInput && /Android|webOS|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
      setTimeout(() => {
        codeInput.focus();
      }, 500);
    }
  }

  // Aktivációs üzenet megjelenítése - kibővített hibakezeléssel
  _showMessage(message, type = 'info') {
    console.log(`Üzenet megjelenítése: ${message}, típus: ${type}`);
    
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
    
    // Debug információkat is frissítjük, ha látható
    const debugInfo = document.getElementById('debug-info');
    if (debugInfo && debugInfo.style.display === 'block') {
      debugInfo.innerHTML += `<br>Üzenet: ${message} (${type})`;
    }
  }

  // Aktivációs kódkezelés - MOBIL-KOMPATIBILIS VERZIÓ
  async _handleActivation() {
    console.log("_handleActivation elindult");
    
    // Aktivációs kód beszerzése
    const codeInput = document.getElementById('activation-code');
    if (!codeInput) {
        console.error("Aktivációs kód beviteli mező nem található");
        return;
    }
    
    const code = codeInput.value.trim().toUpperCase();
    console.log(`Megadott kód: ${code}`);

    // Kód ellenőrzése
    if (!code) {
      this._showMessage('Kérlek add meg az aktivációs kódot', 'error');
      return;
    }

    // Authservice ellenőrzése
    if (!this.authService) {
      // Ha a constructor-ban nem találta meg, próbáljuk meg újra
      if (window.authService) {
        console.log("AuthService most már elérhető, használat...");
        this.authService = window.authService;
      } else {
        console.error("AuthService nem elérhető a kód ellenőrzésekor");
        this._showMessage('Hiba: Authentikációs szolgáltatás nem elérhető. Kérjük, frissítsd az oldalt!', 'error');
        return;
      }
    }

    // Gomb letiltása az ellenőrzés idejére
    const activateBtn = document.getElementById('activate-btn');
    if (activateBtn) {
        activateBtn.disabled = true;
        activateBtn.textContent = 'Ellenőrzés...';
    }
    
    this._showMessage('Kód ellenőrzése...', 'info');

    try {
      // FONTOS: Ellenőrizzük, hogy Firebase megfelelően inicializálódott-e
      if (!window.firebaseApp || !window.firebaseApp.auth) {
        throw new Error("Firebase szolgáltatások nem elérhetők.");
      }

      // === Bejelentkezés biztosítása ===
      let currentUser = this.authService.auth.currentUser;
      
      // Ha nincs bejelentkezett felhasználó, próbáljunk meg bejelentkezni
      if (!currentUser) {
        console.log('Nincs aktív felhasználó, névtelen bejelentkezés megkísérlése...');
        try {
          // Tisztább hibakezeléssel
          const signInResult = await this.authService.signInAnonymously();
          currentUser = signInResult.user;
          
          if (!currentUser) {
            throw new Error('Bejelentkezés sikeres volt, de felhasználó nem érkezett vissza');
          }
          
          console.log('Névtelen bejelentkezés sikeres:', currentUser.uid);
        } catch (signInError) {
          console.error('Névtelen bejelentkezési hiba:', signInError);
          this._showMessage(`Hiba a bejelentkezés során: ${signInError.message || 'Ismeretlen hiba'}`, 'error');
          
          if(activateBtn) {
             activateBtn.disabled = false;
             activateBtn.textContent = 'Aktiválás';
          }
          return;
        }
      } else {
         console.log('Aktív felhasználó már van:', currentUser.uid);
      }

      // Most már van bejelentkezett felhasználó (currentUser), jöhet a kód ellenőrzése
      console.log('Kód ellenőrzése folyamatban...');
      
      try {
        const verification = await this.authService.verifyActivationCode(code);
        console.log('Kód ellenőrzés eredménye:', verification);

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
          await this.authService.storeCredentials(currentUser);
        } else {
          // Új aktiválás (első eszköz vagy új eszköz hozzáadása)
          this._showMessage('Sikeres aktiváció! Eszköz regisztrálva...', 'success');
          
          try {
            // FONTOS: Ez a lépés mobilon gyakran hibákat okoz, ezért külön try/catch blokkban van
            await this.authService.markCodeAsActive(code, currentUser.uid);
            
            // Hitelesítés mentése
            await this.authService.storeCredentials(currentUser);
          } catch (markActiveError) {
            console.error('Hiba a kód aktiválásakor:', markActiveError);
            this._showMessage(`Hiba a kód aktiválásakor: ${markActiveError.message || 'Adatbázis hiba'}`, 'error');
            
            if(activateBtn) {
              activateBtn.disabled = false;
              activateBtn.textContent = 'Aktiválás';
            }
            return;
          }
        }

        // UI frissítése és átirányítás/könyvmegjelenítés
        this.isActivated = true;

        // Jelezzük a sikert az inicializáló kódnak
        const activationSuccessEvent = new Event('activationSuccess');
        document.dispatchEvent(activationSuccessEvent);
        console.log("'activationSuccess' esemény elküldve");

        // Kis szünet a sikeres üzenet megjelenítéséhez
        setTimeout(() => {
          this.remove();
          console.log("Aktivációs felület eltávolítva");
        }, 1500);

      } catch (verifyError) {
        console.error('Hiba a kód ellenőrzésekor:', verifyError);
        this._showMessage(`Hiba a kód ellenőrzésekor: ${verifyError.message || 'Adatbázis hiba'}`, 'error');
        
        if(activateBtn) {
          activateBtn.disabled = false;
          activateBtn.textContent = 'Aktiválás';
        }
      }

    } catch (error) {
      console.error('Aktiválási hiba:', error);
      this._showMessage(`Hiba történt: ${error.message || 'Ismeretlen hiba'}`, 'error');

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
      this.activationContainer = null;
      console.log("Aktivációs konténer eltávolítva");
    }
    
    // Megjegyzés: A stílusokat általában nem távolítjuk el,
    // mert más komponensek még használhatják
  }
}

// A biztonság kedvéért dinamikusan adjuk hozzá a window-hoz,
// de elkerüljük a duplikációt
if (!window.activationUI) {
  console.log("ActivationUI példány létrehozása");
  window.activationUI = new ActivationUI();
} else {
  console.log("ActivationUI példány már létezik");
}