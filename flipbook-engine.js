// flipbook-engine.js - MÓDOSÍTVA a hash navigációhoz és contentLoader integrációhoz
/**
 * Flipbook Motor - Interaktív kalandkönyvekhez
 */
class FlipbookEngine {
    constructor(options) {
        this.currentPageElement = null;
        this.nextPageElement = null;
        // Állapot változók
        this.currentPage = 0; // Ezt az _activatePage frissíti
        // this.totalPages = 300; // Erre már nem feltétlenül van szükség itt
        this.isAnimating = false;
        this.isMuted = false;
        // Navigáció vezérlők
        this.leftButton = null;
        this.rightButton = null;
        // Fejezet adatok (Ezeket most már nem itt használjuk a fő navigációhoz)
        this.chapters = [
            { id: "0", title: "Borító", page: 0 },
            { id: "1", title: "Kezdés", page: 1 },
            { id: "2", title: "Karakteralkotás", page: 2 }
        ];
        // Segédfüggvény a keydown eseménykezelő referenciájához (marad)
        this.handleKeyDown = (e) => {
            // Ne lapozzunk, ha az aktivációs UI látható
            if (document.getElementById('activation-container')) return;
            if (e.key === 'ArrowLeft') {
                this.prevPage();
            } else if (e.key === 'ArrowRight') {
                this.nextPage();
            }
            // A fullscreen ('f') kezelése maradhat itt vagy az index.html-ben
        };

        // === FONTOS VÁLTOZÁS: this.totalPages eltávolítva innen ===
        // this.totalPages = options.totalPages; // Nincs már rá szükség itt

        const container = document.getElementById(options.containerId);
        if (!container) throw new Error(`Container element with ID "${options.containerId}" not found`);
        this.bookContainer = container;

        this.initializeContainer(); // Létrehozza az üres iframe-eket

        // Lapozó hang inicializálása (marad)
        this.flipSound = new Audio(options.soundPath || 'sounds/pageturn.mp3');
        this.flipSound.preload = 'auto';

        this.createControls(); // Létrehozza a gombokat
        this.addEventListeners(); // Hozzáadja az eseményfigyelőket (módosított prev/next)

        // === FONTOS VÁLTOZÁS: Kezdőoldal betöltés eltávolítva innen ===
        // A kezdőoldal betöltését most az index.html intézi a hash alapján
        // this.loadPage(0);
        // this.updateNavigationVisibility(); // Ezt az _activatePage fogja kezelni

        // === ContentLoader setup hívás MÓDOSÍTVA ===
        // Most az _renderPage metódust adjuk át callback-ként
        if (window.contentLoader) {
          window.contentLoader.setup(this._renderPage.bind(this)); // Az _renderPage lesz a callback
           console.log("FlipbookEngine: ContentLoader setup sikeresen meghívva.");
        } else {
           console.error("FlipbookEngine: ContentLoader nem található a setup hívásakor!");
        }

        // Auth token service ellenőrzése (marad)
        if (window.authTokenService) {
          window.authTokenService.getAccessToken();
        }
        console.log("FlipbookEngine konstruktor befejeződött.");
    }

    /**
     * Flipbook konténer inicializálása (Változatlan, de src nélkül)
     */
    initializeContainer() {
        this.bookContainer.innerHTML = '';
        this.bookContainer.style.position = 'relative';
        this.bookContainer.style.width = '100%';
        this.bookContainer.style.height = '100%';
        this.bookContainer.style.overflow = 'hidden';
        this.bookContainer.classList.add('flipbook-container');
        // Aktuális oldal iframe
        this.currentPageElement = document.createElement('iframe');
        this.currentPageElement.className = 'book-page current';
        // ... (iframe stílusok maradnak) ...
        this.currentPageElement.style.width = '100%'; this.currentPageElement.style.height = '100%'; this.currentPageElement.style.border = 'none'; this.currentPageElement.style.position = 'absolute'; this.currentPageElement.style.left = '0'; this.currentPageElement.style.top = '0'; this.currentPageElement.style.zIndex = '1';
        this.currentPageElement.setAttribute('sandbox', 'allow-scripts allow-same-origin'); // Sandbox fontos lehet
        // NINCS SRC BEÁLLÍTÁS!
        this.bookContainer.appendChild(this.currentPageElement);

        // Következő oldal iframe (animációhoz)
        this.nextPageElement = document.createElement('iframe');
        this.nextPageElement.className = 'book-page next';
        this.nextPageElement.style.cssText = this.currentPageElement.style.cssText;
        this.nextPageElement.style.zIndex = '0';
        this.nextPageElement.style.visibility = 'hidden';
         this.nextPageElement.setAttribute('sandbox', 'allow-scripts allow-same-origin');
        this.bookContainer.appendChild(this.nextPageElement);
        console.log("FlipbookEngine: iframe-ek inicializálva (src nélkül).");
    }

    /**
     * Navigációs és funkció vezérlők létrehozása (Változatlan)
     */
    createControls() { /* ... (A teljes createControls kód változatlan marad) ... */
        this.leftButton = document.createElement('div'); this.leftButton.className = 'page-turn-button left'; this.leftButton.innerHTML = '◀'; this.leftButton.style.cssText = "position: absolute; left: 20px; top: 50%; transform: translateY(-50%); font-size: 36px; color: rgba(199, 0, 0, 1); cursor: pointer; z-index: 100; background-color: rgba(0, 0, 0, 0.3); border-radius: 50%; width: 50px; height: 50px; display: flex; justify-content: center; align-items: center; transition: opacity 0.3s ease;"; this.bookContainer.appendChild(this.leftButton);
        this.rightButton = document.createElement('div'); this.rightButton.className = 'page-turn-button right'; this.rightButton.innerHTML = '▶'; this.rightButton.style.cssText = "position: absolute; right: 20px; top: 50%; transform: translateY(-50%); font-size: 36px; color: rgba(0, 199, 0, 1); cursor: pointer; z-index: 100; background-color: rgba(0, 0, 0, 0.3); border-radius: 50%; width: 50px; height: 50px; display: flex; justify-content: center; align-items: center; transition: opacity 0.3s ease;"; this.bookContainer.appendChild(this.rightButton);
        const controlsContainer = document.createElement('div'); controlsContainer.className = 'controls-container'; controlsContainer.style.cssText = "position: fixed; bottom: 0px; left: 0px; width: 100%; z-index: 9999; display: flex; justify-content: center; gap: 15px; background-color: rgba(0, 0, 0, 0.3); padding: 8px 0px;";
        const navButton = document.createElement('button'); navButton.className = 'control-button navigation'; navButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>`; navButton.title = 'Navigáció'; navButton.addEventListener('click', () => this.showNavigationMenu());
        const fullscreenButton = document.createElement('button'); fullscreenButton.className = 'control-button fullscreen'; fullscreenButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"></path></svg>`; fullscreenButton.title = 'Teljes képernyő'; fullscreenButton.addEventListener('click', () => this.toggleFullscreen());
        const muteButton = document.createElement('button'); muteButton.className = 'control-button mute'; muteButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>`; muteButton.title = 'Hang némítása'; muteButton.addEventListener('click', () => this.toggleMute(muteButton));
        controlsContainer.appendChild(navButton); controlsContainer.appendChild(fullscreenButton); controlsContainer.appendChild(muteButton); document.body.appendChild(controlsContainer);
        console.log("FlipbookEngine: Vezérlők létrehozva.");
     }

    /**
     * Eseményfigyelők hozzáadása (MÓDOSÍTVA: prev/nextPage hívás marad, de azok mást csinálnak)
     */
    addEventListeners() {
        if (this.leftButton) {
            this.leftButton.addEventListener('click', () => this.prevPage()); // prevPage most hash-t vált
        }
        if (this.rightButton) {
            this.rightButton.addEventListener('click', () => this.nextPage()); // nextPage most hash-t vált
        }
        document.addEventListener('keydown', this.handleKeyDown); // Billentyűzet figyelő

        // Swipe figyelő (marad, mert a prev/nextPage-et hívja)
        let touchStartX = 0;
        let touchEndX = 0;
        this.bookContainer.addEventListener('touchstart', (e) => { touchStartX = e.changedTouches[0].screenX; }, { passive: true });
        this.bookContainer.addEventListener('touchend', (e) => { touchEndX = e.changedTouches[0].screenX; this.handleSwipe(touchStartX, touchEndX); }, { passive: true });

        console.log("FlipbookEngine: Eseményfigyelők hozzáadva.");
    }

    /**
     * Swipe kezelése (Változatlan)
     */
    handleSwipe(startX, endX) { /* ... (Marad ugyanaz) ... */
        const swipeThreshold = 50; if (this.isAnimating) return;
        if (endX < startX - swipeThreshold) this.nextPage();
        else if (endX > startX + swipeThreshold) this.prevPage();
    }

    // === RÉGI OLDALBETÖLTŐ FÜGGVÉNYEK TÖRÖLVE ===
    // _originalLoadPage() törölve
    // loadPage() törölve (mostantól a contentLoader intézi a hash alapján)
    // flipPageAnimation() törölve (az egyszerűség kedvéért most nincs animáció)

    /**
     * Callback: Tartalom megjelenítése az iframe-ben (ÚJ LOGIKA)
     * Ezt a metódust hívja meg a contentLoader, miután sikeresen betöltötte és
     * kiegészítette a HTML tartalmat a licenc infóval.
     * @param {string} pageId Az oldal azonosítója
     * @param {string} htmlContent A teljes HTML tartalom (már ID-vel együtt)
     */
    _renderPage(pageId, htmlContent) {
        console.log(`[FlipbookEngine] _renderPage meghívva: ${pageId}`);
        if (!this.currentPageElement) {
            console.error("FlipbookEngine: Nincs aktuális iframe elem a rendereléshez!");
            return;
        }

        // Egyszerű tartalom beírás az AKTUÁLIS iframe-be
        // Nincs animáció, nincs nextFrame használat ebben a verzióban
        try {
            const iframe = this.currentPageElement;
            // Fontos: Biztosítjuk, hogy az iframe ne a régi src alapján akarjon betölteni
            if (iframe.src !== 'about:blank') iframe.src = 'about:blank';

            // Várakozás, amíg az about:blank betöltődik (apró késleltetés)
            setTimeout(() => {
                try {
                     const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
                     if (iframeDoc) {
                         iframeDoc.open();
                         iframeDoc.write(htmlContent); // Beírjuk a kapott tartalmat
                         iframeDoc.close();
                         console.log(`[FlipbookEngine] Tartalom sikeresen beírva az iframe-be (${pageId}).`);

                         // Scroll a tetejére
                         iframe.contentWindow?.scrollTo(0, 0);

                         // Globális goToPage elérhetővé tétele az iframe számára
                         if (iframe.contentWindow) {
                            iframe.contentWindow.parentGoToPage = window.goToPage;
                         }
                         // Biztonsági beállítások alkalmazása
                         this._applyIframeSecurity(iframe);

                         // Aktiváljuk az oldalt (frissítjük a belső állapotot és gombokat)
                         this._activatePage(pageId);

                     } else {
                         console.error("[FlipbookEngine] Nem sikerült elérni az iframe dokumentumát a rendereléshez (időzítés után).");
                         this._activatePage(pageId); // Próbáljuk meg aktiválni a gombokat akkor is
                     }
                } catch (writeError) {
                     console.error(`[FlipbookEngine] Hiba az iframe tartalmának beírásakor (${pageId}) (időzítés után):`, writeError);
                     this._activatePage(pageId); // Próbáljuk meg aktiválni a gombokat akkor is
                }
            }, 50); // Rövid várakozás az about:blank betöltésére

        } catch (e) {
            console.error(`[FlipbookEngine] Hiba az iframe előkészítésekor (${pageId}):`, e);
             this._activatePage(pageId); // Próbáljuk meg aktiválni a gombokat akkor is
        }
    }


    /**
     * Előző oldalra "lapozás" (Hash változtatása) - MÓDOSÍTVA
     */
    prevPage() {
        if (this.isAnimating) return;
        // Az aktuális oldal számát a belső változóból vesszük (amit az _activatePage frissít)
        const currentPageNum = (typeof this.currentPage === 'number') ? this.currentPage : this.getCurrentPageNumberFromHash();

        if (isNaN(currentPageNum)) {
             console.warn("[FlipbookEngine] prevPage: Nem sikerült meghatározni az aktuális oldalszámot.");
             return;
        }

        const targetPageNum = currentPageNum - 1;

        if (targetPageNum >= 0) {
            const targetPageId = targetPageNum === 0 ? 'borito' : String(targetPageNum);
            // Ellenőrizzük, létezik-e a céloldal
             if (window.bookPageData && window.bookPageData.hasOwnProperty(targetPageId)) {
                 console.log(`[FlipbookEngine] prevPage: Ugrás a ${targetPageId} oldalra (hash beállítása).`);
                 this.playFlipSound(); // Hang lejátszása a hash váltás ELŐTT
                 location.hash = `#${targetPageId}`;
             } else {
                  console.log(`[FlipbookEngine] prevPage: A(z) ${targetPageId} oldal nem létezik a bookPageData-ban.`);
                  this.showNotification(`A(z) ${targetPageId}. oldal nem elérhető.`); // Értesítés
             }
        } else {
            console.log("[FlipbookEngine] prevPage: Már az első oldalon vagyunk.");
        }
    }

    /**
     * Következő oldalra "lapozás" (Hash változtatása) - MÓDOSÍTVA
     */
    nextPage() {
        if (this.isAnimating) return;
         const currentPageNum = (typeof this.currentPage === 'number') ? this.currentPage : this.getCurrentPageNumberFromHash();

         if (isNaN(currentPageNum)) {
             console.warn("[FlipbookEngine] nextPage: Nem sikerült meghatározni az aktuális oldalszámot.");
             return;
         }

        const targetPageNum = (currentPageNum === 0) ? 1 : currentPageNum + 1;
        const targetPageId = String(targetPageNum);

        if (window.bookPageData && window.bookPageData.hasOwnProperty(targetPageId)) {
            console.log(`[FlipbookEngine] nextPage: Ugrás a ${targetPageId} oldalra (hash beállítása).`);
             this.playFlipSound(); // Hang lejátszása a hash váltás ELŐTT
            location.hash = `#${targetPageId}`;
        } else {
            console.log(`[FlipbookEngine] nextPage: Nincs több oldal, vagy a ${targetPageId} nem létezik a bookPageData-ban.`);
            this.showNotification("A könyv végére értél, vagy a következő oldal nem található."); // Értesítés
        }
    }

    /**
     * Segédfüggvény az aktuális oldalszám kinyerésére a hash-ből (Változatlan)
     */
     getCurrentPageNumberFromHash() {
        const hash = location.hash.substring(1);
        if (hash === 'borito') return 0;
        const pageNum = parseInt(hash, 10);
        // Visszaadjuk a számot, vagy 0-t ha 'borito', egyébként NaN-t
        return hash === 'borito' ? 0 : pageNum;
    }

     /**
     * Lapozás hang lejátszása (Változatlan)
     */
     playFlipSound() { /* ... (Marad ugyanaz) ... */
        if (this.flipSound && !this.isMuted) { this.flipSound.currentTime = 0; this.flipSound.play().catch(e => console.warn('Hang lejátszási hiba:', e)); }
     }


    /**
     * Navigációs gombok láthatóságának frissítése (MÓDOSÍTVA: A bookPageData alapján)
     */
    updateNavigationVisibility() {
        const currentPageNum = this.currentPage; // Ezt az _activatePage frissíti
        if (currentPageNum === null || typeof currentPageNum === 'undefined') return; // Ha még nincs beállítva

        // Bal gomb: Akkor látszik, ha az aktuális oldal NEM a borító (0) ÉS LÉTEZIK az előző oldal
        if (this.leftButton) {
            const prevPageNum = currentPageNum - 1;
            const prevPageId = prevPageNum === 0 ? 'borito' : String(prevPageNum);
            if (currentPageNum > 0 && window.bookPageData?.hasOwnProperty(prevPageId)) {
                this.leftButton.style.opacity = '1';
                this.leftButton.style.pointerEvents = 'auto';
            } else {
                this.leftButton.style.opacity = '0';
                this.leftButton.style.pointerEvents = 'none';
            }
        }

        // Jobb gomb: Akkor látszik, ha LÉTEZIK a következő oldal a bookPageData-ban
        if (this.rightButton) {
             const nextPageNum = (currentPageNum === 0) ? 1 : currentPageNum + 1;
             const nextPageId = String(nextPageNum);
             if (window.bookPageData?.hasOwnProperty(nextPageId)) {
                 this.rightButton.style.opacity = '1';
                 this.rightButton.style.pointerEvents = 'auto';
             } else {
                 this.rightButton.style.opacity = '0';
                 this.rightButton.style.pointerEvents = 'none';
             }
        }
    }

    // --- VÁLTOZATLANUL HAGYOTT FÜGGVÉNYEK AZ EREDETIBŐL ---

    /**
     * Navigációs menü megjelenítése (Maradhat, de a tartalma nem lesz pontos)
     */
    showNavigationMenu() { /* ... (Marad ugyanaz, de figyelmeztetéssel) ... */
         console.warn("FlipbookEngine: showNavigationMenu még a régi 'this.chapters' alapján működik!");
         const existingMenu = document.querySelector('.navigation-menu'); if (existingMenu) { existingMenu.remove(); return; } const menu = document.createElement('div'); menu.className = 'navigation-menu'; menu.style.cssText="position: fixed; bottom: 70px; right: 20px; width: 250px; max-height: 60vh; overflow-y: auto; background-color: rgba(0, 0, 0, 0.9); border-radius: 10px; padding: 15px; z-index: 10000; box-shadow: 0 0 20px rgba(0, 0, 0, 0.5);"; const title = document.createElement('div'); title.style.cssText="color: white; font-size: 18px; font-weight: bold; margin-bottom: 15px; text-align: center;"; title.textContent = 'Navigáció (Korlátozott)'; menu.appendChild(title);
         this.chapters.forEach(chapter => { const item = document.createElement('div'); item.className = 'nav-item'; item.style.cssText = "color: white; padding: 10px; margin: 5px 0; cursor: pointer; border-radius: 5px; transition: background-color 0.2s;"; const pageIdForChapter = chapter.page === 0 ? 'borito' : String(chapter.page); if (pageIdForChapter === String(this.currentPage) || (pageIdForChapter === 'borito' && this.currentPage === 0)) { item.style.backgroundColor = 'rgba(127, 0, 255, 0.5)'; item.style.fontWeight = 'bold'; } item.textContent = `${chapter.title} (${pageIdForChapter}. oldal)`; item.addEventListener('click', () => { location.hash = `#${pageIdForChapter}`; menu.remove(); }); menu.appendChild(item); }); document.body.appendChild(menu); document.addEventListener('click', (e) => { if (menu.parentNode && !menu.contains(e.target) && !e.target.closest('.control-button.navigation')) menu.remove(); }, { once: true });
     }

    /**
     * Értesítés megjelenítése (Változatlan)
     */
    showNotification(message) { /* ... (Marad ugyanaz) ... */
        const n=document.createElement('div'); n.className='flipbook-notification'; n.textContent=message; n.style.cssText="position:fixed;top:20px;left:50%;transform:translateX(-50%);padding:10px 20px;background-color:rgba(0,0,0,0.8);color:white;border-radius:5px;z-index:10000;opacity:0;transition:opacity .3s ease"; document.body.appendChild(n); setTimeout(()=>{n.style.opacity='1'},10); setTimeout(()=>{n.style.opacity='0';setTimeout(()=>{if(n.parentNode)n.parentNode.removeChild(n)},300)},2500);
    }

    /**
     * Teljes képernyő váltás (Változatlan)
     */
    toggleFullscreen() { /* ... (Marad ugyanaz) ... */
         if (!document.fullscreenElement) { document.documentElement.requestFullscreen().catch(err => { this.showNotification('Teljes képernyő hiba: ' + (err.message || err)); }); } else { if (document.exitFullscreen) { document.exitFullscreen(); } }
    }

     /**
     * Némítás gomb ikonjának frissítése (Változatlan)
     */
     updateMuteButtonIcon(buttonElement){ /* ... (Marad ugyanaz) ... */
          if (!buttonElement) return; buttonElement.innerHTML = this.isMuted ? `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><line x1="23" y1="9" x2="17" y2="15"></line><line x1="17" y1="9" x2="23" y2="15"></line></svg>` : `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>`;
     }

    /**
     * Hang némítása/visszakapcsolása (Változatlan)
     */
    toggleMute(button) { /* ... (Marad ugyanaz) ... */
         this.isMuted = !this.isMuted; console.log("Hang némítva:", this.isMuted); this.updateMuteButtonIcon(button || document.querySelector('.control-button.mute'));
    }

    /**
     * Iframe biztonsági beállítások (Változatlan, de most az _renderPage hívja)
     */
    _applyIframeSecurity(iframe) { /* ... (Marad ugyanaz) ... */
        try { const d=iframe.contentDocument||iframe.contentWindow?.document; if(!d||!d.body)return; let s=d.getElementById('security-script'); if(!s){s=d.createElement('script');s.id='security-script';s.textContent="document.addEventListener('contextmenu',e=>e.preventDefault());document.addEventListener('copy',e=>e.preventDefault());document.addEventListener('dragstart',e=>e.preventDefault());document.body.style.userSelect='none';document.body.style.webkitUserSelect='none';document.body.style.msUserSelect='none';"; d.body.appendChild(s);} let y=d.getElementById('security-style'); if(!y){y=d.createElement('style'); y.id='security-style'; y.textContent='::selection { background: transparent; } * { -webkit-touch-callout: none; }'; d.head.appendChild(y);} } catch(e){console.warn('Hiba iframe sec beáll.:',e);}
    }

    /**
     * Aktív oldal beállítása (Belső állapot frissítése) - MÓDOSÍTVA: pageId-t kap
     */
    _activatePage(pageId) {
      // pageId lehet 'borito' vagy szám stringként
      console.log(`[FlipbookEngine] Oldal aktiválása (belső állapot): ${pageId}`);
      this.currentPage = pageId === 'borito' ? 0 : parseInt(pageId, 10);
      if (isNaN(this.currentPage)) {
          console.warn(`[FlipbookEngine] _activatePage érvénytelen pageId-t kapott: ${pageId}. Alaphelyzet (0).`);
          this.currentPage = 0; // Vissza a borítóra hiba esetén
      }
      // A data-page attribútumot is frissítjük (bár lehet felesleges, ha a hash van)
      document.body.setAttribute('data-page', pageId);
      // Navigációs gombok frissítése az új állapot alapján
      this.updateNavigationVisibility();
      console.log(`[FlipbookEngine] Oldal sikeresen aktiválva, belső currentPage: ${this.currentPage}`);
    }

    // A _getOrCreateIframe metódusra valószínűleg már nincs szükség,
    // mert csak a currentPageElement-et használjuk a rendereléshez.
    // Kommentbe tesszük vagy töröljük.
    /*
    _getOrCreateIframe(pageNumber) {
      // ...
      return this.currentPageElement;
    }
    */

    /**
     * Könyv bezárás, erőforrások felszabadítása (Változatlan)
     */
    destroy() { /* ... (Marad ugyanaz) ... */
         document.removeEventListener('keydown', this.handleKeyDown); if(this.leftButton)this.leftButton.removeEventListener('click', this.prevPage); if(this.rightButton)this.rightButton.removeEventListener('click', this.nextPage); console.log("FlipbookEngine megsemmisítve.");
     }

    // handleKeyDown referencia (Változatlan)
    handleKeyDown = (e) => { /* ... (Marad ugyanaz) ... */
         if(document.getElementById('activation-container'))return; if(e.key==='ArrowLeft')this.prevPage(); else if(e.key==='ArrowRight')this.nextPage();
     };

} // <-- FlipbookEngine osztály vége

// Globális exportálás (marad változatlan)
// window.FlipbookEngine = FlipbookEngine;