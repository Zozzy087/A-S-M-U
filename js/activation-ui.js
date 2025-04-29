// Aktivációs UI kezelő
class ActivationUI {
  constructor() {
    this.authService = window.authService;
    this.isActivated = false;
    this.activationContainer = null;
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
            <input type="text" id="activation-code" placeholder="XXXX-XXXX-XXXX" autocomplete="off">
            <button id="activate-btn">Aktiválás</button>
          </div>
          <p id="activation-message" class="activation-message"></p>
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
    `;
    
    // Hozzáadjuk az oldalhoz
    document.head.appendChild(style);
    document.body.appendChild(this.activationContainer);
    
    // Eseménykezelők hozzáadása
    document.getElementById('activate-btn').addEventListener('click', () => this._handleActivation());
    document.getElementById('activation-code').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this._handleActivation();
    });
  }
  
  // Aktivációs üzenet megjelenítése
  _showMessage(message, isSuccess = false) {
    const messageElement = document.getElementById('activation-message');
    if (!messageElement) return;
    
    messageElement.textContent = message;
    messageElement.className = 'activation-message' + (isSuccess ? ' success' : '');
  }
  
  // Aktivációs kódkezelés
  async _handleActivation() {
    const codeInput = document.getElementById('activation-code');
    const code = codeInput.value.trim().toUpperCase();
    
    if (!code) {
      this._showMessage('Kérlek add meg az aktivációs kódot');
      return;
    }
    
    try {
      // Gomb letiltása az ellenőrzés idejére
      const activateBtn = document.getElementById('activate-btn');
      activateBtn.disabled = true;
      activateBtn.textContent = 'Ellenőrzés...';
      
      // Kód ellenőrzése
      const verification = await this.authService.verifyActivationCode(code);
      
      if (!verification.valid) {
        this._showMessage(verification.message || 'Érvénytelen aktivációs kód');
        activateBtn.disabled = false;
        activateBtn.textContent = 'Aktiválás';
        return;
      }
      
      // Sikeres ellenőrzés, bejelentkezés
      this._showMessage('Sikeres aktiváció! Bejelentkezés...', true);
      
      // Névtelen bejelentkezés
      const userCredential = await this.authService.signInAnonymously();
      
      // Kód megjelölése használtként
      await this.authService.markCodeAsUsed(code, userCredential.user.uid);
      
      // Hitelesítés mentése
      await this.authService.storeCredentials(userCredential.user);
      
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
      this._showMessage('Hiba történt az aktiválás során');
      
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