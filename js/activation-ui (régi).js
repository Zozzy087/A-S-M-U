// Aktivációs UI kezelő
class ActivationUI {
  constructor() {
    this.authService = window.authService;
    this.isActivated = false;
    this.activationContainer = null;
    this.correctCodeFormat = /^[A-Z0-9]{5}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/; // Helyes formátum: XXXXX-XXXX-XXXX-XXXX
  }
  
  // Aktivációs UI inicializálása
  async initialize() {
    // Ellenőrizzük, hogy már hitelesítve van-e
    const user = await this.authService.checkStoredAuth();
    
    if (user) {
      console.log('Felhasználó már aktiválva van:', user.uid);
      this.isActivated = true;
      return true;
    }
    
    // Aktivációs UI létrehozása és megjelenítése
    this._createActivationUI();
    return false;
  }
  
  // Aktivációs UI létrehozása
  _createActivationUI() {
    // Ha már létezik, ne hozzunk létre újat
    if (this.activationContainer) return;
    
    // Konténer létrehozása
    this.activationContainer = document.createElement('div');
    this.activationContainer.id = 'activation-container';
    this.activationContainer.innerHTML = `
      <div class="activation-overlay">
        <div class="activation-card">
          <h2>A Sötét Mágia Útvesztője</h2>
          <p>Köszönjük a vásárlást! A folytatáshoz add meg az aktivációs kódodat:</p>
          <div class="activation-form">
            <input type="text" id="activation-code" placeholder="XXXX-XXXX-XXXX" autocomplete="off" maxlength="20">
            <button id="activate-btn">Aktiválás</button>
          </div>
          <p id="activation-message" class="activation-message"></p>
          <p class="activation-info">Egy aktivációs kóddal a könyv akár 3 különböző eszközön is használható.</p>
        </div>
      </div>
    `;
    
    // Stílusok hozzáadása
    const style = document.createElement('style');
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
      
      .activation-message {
        min-height: 1.5rem;
        color: #ff5555;
      }
      
      .activation-message.success {
        color: #55ff55;
      }
      
      .activation-info {
        font-size: 0.9rem;
        color: #cccccc;
        margin-top: 1rem;
      }
    `;
    
    // Hozzáadjuk az oldalhoz
    document.head.appendChild(style);
    document.body.appendChild(this.activationContainer);
    
    // Eseménykezelők hozzáadása
    document.getElementById('activate-btn').addEventListener('click', () => this._handleActivation());
    
    // Kód beviteli mező eseménykezelője
    const codeInput = document.getElementById('activation-code');
    codeInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this._handleActivation();
    });
    
    // Kódbeviteli formázás kezelése
    codeInput.addEventListener('input', (e) => {
      let value = e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, '');
      
      // Rugalmas kódformázás, ami támogatja a 4-4-4-4 és 5-4-4-4 formátumokat is
      
      // Eltávolítjuk az összes kötőjelet
      let cleanValue = value.replace(/-/g, '');
      
      // Formázott érték létrehozása
      let formattedValue = '';
      
      // Admin-előtagos kód speciális kezelése (5-4-4-4 forma)
      if (cleanValue.startsWith('ADMIN')) {
        if (cleanValue.length > 5) {
          formattedValue = cleanValue.substring(0, 5) + '-' + cleanValue.substring(5);
          
          if (cleanValue.length > 9) {
            formattedValue = formattedValue.substring(0, 10) + '-' + formattedValue.substring(10);
          }
          
          if (cleanValue.length > 13) {
            formattedValue = formattedValue.substring(0, 15) + '-' + formattedValue.substring(15);
          }
        } else {
          formattedValue = cleanValue;
        }
      } 
      // Normál kódok kezelése (4-4-4-4 forma)
      else {
        if (cleanValue.length > 4) {
          formattedValue = cleanValue.substring(0, 4) + '-' + cleanValue.substring(4);
          
          if (cleanValue.length > 8) {
            formattedValue = formattedValue.substring(0, 9) + '-' + formattedValue.substring(9);
          }
          
          if (cleanValue.length > 12) {
            formattedValue = formattedValue.substring(0, 14) + '-' + formattedValue.substring(14);
          }
        } else {
          formattedValue = cleanValue;
        }
      }
      
      // Beállítjuk a formázott értéket, ha különbözik
      if (e.target.value !== formattedValue) {
        e.target.value = formattedValue;
      }
    });
  }
  
  // Aktivációs üzenet megjelenítése
  _showMessage(message, isSuccess = false) {
    const messageElement = document.getElementById('activation-message');
    if (!messageElement) return;
    
    messageElement.textContent = message;
    messageElement.className = 'activation-message' + (isSuccess ? ' success' : '');
  }
  
  // Aktivációs kód ellenőrzése és formázása
  _formatActivationCode(code) {
    // Eltávolítjuk a nem alfanumerikus karaktereket és nagybetűsítjük
    let cleanCode = code.replace(/[^A-Z0-9]/gi, '').toUpperCase();
    
    // Ha a kód már formázva van kötőjelekkel, megtartjuk
    if (this.correctCodeFormat.test(code)) {
      return code;
    }
    
    // ADMIN-előtagos speciális kezelés
    if (cleanCode.startsWith('ADMIN')) {
      // 5-4-4-4 formátum
      return cleanCode.substring(0, 5) + 
             (cleanCode.length > 5 ? '-' + cleanCode.substring(5, 9) : '') +
             (cleanCode.length > 9 ? '-' + cleanCode.substring(9, 13) : '') +
             (cleanCode.length > 13 ? '-' + cleanCode.substring(13, 17) : '');
    } else {
      // 4-4-4-4 formátum
      return cleanCode.substring(0, 4) + 
             (cleanCode.length > 4 ? '-' + cleanCode.substring(4, 8) : '') +
             (cleanCode.length > 8 ? '-' + cleanCode.substring(8, 12) : '') +
             (cleanCode.length > 12 ? '-' + cleanCode.substring(12, 16) : '');
    }
  }
  
  // Aktivációs kódkezelés
  async _handleActivation() {
    const codeInput = document.getElementById('activation-code');
    const rawCode = codeInput.value.trim();
    
    if (!rawCode) {
      this._showMessage('Kérlek add meg az aktivációs kódot');
      return;
    }
    
    // Formázzuk a kódot a megfelelő formátumra
    const code = this._formatActivationCode(rawCode);
    
    try {
      // Gomb letiltása az ellenőrzés idejére
      const activateBtn = document.getElementById('activate-btn');
      activateBtn.disabled = true;
      activateBtn.textContent = 'Ellenőrzés...';
      
      // Névtelen bejelentkezés először, ha még nincs bejelentkezve
      if (!this.authService.auth.currentUser) {
        await this.authService.signInAnonymously();
      }
      
      // Kód ellenőrzése
      const verification = await this.authService.verifyActivationCode(code);
      
      if (!verification.valid) {
        this._showMessage(verification.message || 'Érvénytelen aktivációs kód');
        activateBtn.disabled = false;
        activateBtn.textContent = 'Aktiválás';
        return;
      }
      
      // Sikeres ellenőrzés, bejelentkezés
      activateBtn.textContent = 'Aktiválás...';
      
      // Sikeres ellenőrzés, bejelentkezés
      this._showMessage('Sikeres aktiváció! Bejelentkezés...', true);
      
      // Kód használtként jelölése vagy eszköz hozzáadása
      await this.authService.markCodeAsUsed(code, this.authService.auth.currentUser.uid);
      
      // Hitelesítés mentése
      await this.authService.storeCredentials(this.authService.auth.currentUser);
      
      // UI frissítése
      this.isActivated = true;
      
      // Kis szünet a sikeres üzenet megjelenítéséhez, majd UI eltüntetése
      setTimeout(() => {
        if (this.activationContainer) {
          this.activationContainer.remove();
          this.activationContainer = null;
        }
      }, 1500);
      
    } catch (error) {
      console.error('Aktiválási hiba:', error);
      this._showMessage(error.message || 'Hiba történt az aktiválás során');
      
      const activateBtn = document.getElementById('activate-btn');
      if (activateBtn) {
        activateBtn.disabled = false;
        activateBtn.textContent = 'Aktiválás';
      }
    }
  }
  
  // Aktivációs UI eltávolítása (ha pl. már aktiválva van)
  remove() {
    if (this.activationContainer) {
      this.activationContainer.remove();
      this.activationContainer = null;
    }
  }
}

// Exportáljuk az osztályt
window.activationUI = new ActivationUI();