// flipbook-engine.js - MÓDOSÍTVA a hash navigációhoz és contentLoader integrációhoz
/**
 * Flipbook Motor - Interaktív kalandkönyvekhez
 */
class FlipbookEngine {
    constructor(options) {
        this.currentPageElement = null;
        this.nextPageElement = null; // Ezt most nem használjuk aktívan az animációhoz
        this.currentPage = null; // Kezdetben ismeretlen, az _activatePage állítja be
        this.isAnimating = false; // Bár animáció nincs, meghagyjuk a flag-et
        this.isMuted = false;
        this.leftButton = null;
        this.rightButton = null;
        // Chapters lista itt már csak a nav menühöz kell (ami pontatlan lesz)
        this.chapters = [
            { id: "0", title: "Borító", page: 0 },
            { id: "1", title: "Kezdés", page: 1 },
            { id: "2", title: "Karakteralkotás", page: 2 }
        ];
        this.handleKeyDown = (e) => {
            if (document.getElementById('activation-container')) return; // Ne lapozzunk, ha az aktivációs UI látszik
            if (e.key === 'ArrowLeft') this.prevPage();
            else if (e.key === 'ArrowRight') this.nextPage();
        };

        const container = document.getElementById(options.containerId);
        if (!container) throw new Error(`Container element with ID "${options.containerId}" not found`);
        this.bookContainer = container;

        this.initializeContainer(); // Csak létrehozza az üres iframe-eket

        if (options.soundPath) {
            this.flipSound = new Audio(options.soundPath);
            this.flipSound.preload = 'auto';
        } else {
             console.warn("FlipbookEngine: Nincs hangfájl útvonal (soundPath).");
        }

        this.createControls();
        this.addEventListeners(); // Módosított prev/next hívásokkal

        // === Kezdőoldal betöltés és ContentLoader setup MÁR AZ INDEX.HTML-BEN TÖRTÉNIK ===

        console.log("FlipbookEngine konstruktor befejeződött.");
    }

    /**
     * Flipbook konténer és iframe elemek létrehozása (Változatlan)
     */
    initializeContainer() { /* ... (Marad ugyanaz, mint az előző válaszban) ... */
        this.bookContainer.innerHTML = ''; this.bookContainer.style.position = 'relative'; this.bookContainer.style.width = '100%'; this.bookContainer.style.height = '100%'; this.bookContainer.style.overflow = 'hidden'; this.bookContainer.classList.add('flipbook-container');
        this.currentPageElement = document.createElement('iframe'); this.currentPageElement.className = 'book-page current'; this.currentPageElement.style.cssText="width:100%;height:100%;border:none;position:absolute;left:0;top:0;z-index:1;"; this.currentPageElement.setAttribute('sandbox', 'allow-scripts allow-same-origin'); this.bookContainer.appendChild(this.currentPageElement);
        this.nextPageElement = document.createElement('iframe'); this.nextPageElement.className = 'book-page next'; this.nextPageElement.style.cssText = this.currentPageElement.style.cssText; this.nextPageElement.style.zIndex = '0'; this.nextPageElement.style.visibility = 'hidden'; this.nextPageElement.setAttribute('sandbox', 'allow-scripts allow-same-origin'); this.bookContainer.appendChild(this.nextPageElement); console.log("FlipbookEngine: iframe-ek inicializálva (src nélkül).");
    }

    /**
     * Navigációs és funkció vezérlők létrehozása (Változatlan)
     */
    createControls() { /* ... (Marad ugyanaz, mint az előző válaszban) ... */
        this.leftButton = document.createElement('div'); this.leftButton.className = 'page-turn-button left'; this.leftButton.innerHTML = '◀'; this.leftButton.style.cssText = "position: absolute; left: 20px; top: 50%; transform: translateY(-50%); font-size: 36px; color: rgba(199, 0, 0, 1); cursor: pointer; z-index: 100; background-color: rgba(0, 0, 0, 0.3); border-radius: 50%; width: 50px; height: 50px; display: flex; justify-content: center; align-items: center; transition: opacity 0.3s ease;"; this.bookContainer.appendChild(this.leftButton); this.rightButton = document.createElement('div'); this.rightButton.className = 'page-turn-button right'; this.rightButton.innerHTML = '▶'; this.rightButton.style.cssText = "position: absolute; right: 20px; top: 50%; transform: translateY(-50%); font-size: 36px; color: rgba(0, 199, 0, 1); cursor: pointer; z-index: 100; background-color: rgba(0, 0, 0, 0.3); border-radius: 50%; width: 50px; height: 50px; display: flex; justify-content: center; align-items: center; transition: opacity 0.3s ease;"; this.bookContainer.appendChild(this.rightButton); const c=document.createElement('div'); c.className='controls-container'; c.style.cssText="position: fixed; bottom: 0px; left: 0px; width: 100%; z-index: 999; display: flex; justify-content: center; gap: 15px; background-color: rgba(0, 0, 0, 0.3); padding: 8px 0px; box-sizing: border-box;"; const n=document.createElement('button'); n.className='control-button navigation'; n.innerHTML='<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>'; n.title='Navigáció'; n.addEventListener('click',()=>this.showNavigationMenu()); const f=document.createElement('button'); f.className='control-button fullscreen'; f.innerHTML='<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"></path></svg>'; f.title='Teljes képernyő'; f.addEventListener('click',()=>this.toggleFullscreen()); const m=document.createElement('button'); m.className='control-button mute'; m.innerHTML='<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>'; m.title='Hang némítása'; this.updateMuteButtonIcon(m); m.addEventListener('click',()=>this.toggleMute(m)); c.appendChild(n); c.appendChild(f); c.appendChild(m); document.body.appendChild(c); console.log("FlipbookEngine: Vezérlők létrehozva.");
    }

    /**
     * Eseményfigyelők hozzáadása (Változatlan)
     */
    addEventListeners() { /* ... (Marad ugyanaz, mint az előző válaszban) ... */
         if(this.leftButton) this.leftButton.addEventListener('click',()=>this.prevPage()); if(this.rightButton) this.rightButton.addEventListener('click',()=>this.nextPage()); document.addEventListener('keydown',this.handleKeyDown); let ts=0,te=0; this.bookContainer.addEventListener('touchstart',(e)=>{ts=e.changedTouches[0].screenX;},{passive:true}); this.bookContainer.addEventListener('touchend',(e)=>{te=e.changedTouches[0].screenX;this.handleSwipe(ts,te);},{passive:true}); console.log("FlipbookEngine: Eseményfigyelők hozzáadva.");
     }

    /**
     * Swipe kezelése (Változatlan)
     */
    handleSwipe(startX, endX) { /* ... (Marad ugyanaz, mint az előző válaszban) ... */
         const t=50; if(this.isAnimating)return; if(endX<startX-t)this.nextPage(); else if(endX>startX+t)this.prevPage();
     }

    // === RÉGI OLDALBETÖLTŐ FÜGGVÉNYEK TÖRÖLVE / ÁTALAKÍTVA ===
    // _originalLoadPage törölve
    // loadPage törölve
    // flipPageAnimation törölve

    /**
     * Callback: Tartalom megjelenítése az iframe-ben (MÓDOSÍTVA: document.write)
     * @param {string} pageId Az oldal azonosítója
     * @param {string} htmlContent A teljes HTML tartalom (már ID-vel együtt)
     */
    renderPage(pageId, htmlContent) {
        console.log(`[FlipbookEngine] renderPage meghívva: ${pageId}`);
        if (!this.currentPageElement) return;

        this.isAnimating = true; // Blokkoljuk a további lapozást a renderelés alatt

        try {
            const iframe = this.currentPageElement;
            // Próbáljuk meg az about:blank beállítást, hátha segít a renderelési hibáknál
            // De lehet, hogy ez okoz villanást vagy felesleges újratöltést
            // if (iframe.contentWindow?.location.href !== 'about:blank') {
            //    iframe.src = 'about:blank';
            // }

            // Közvetlen tartalombeírás
            // Jobb, ha a window.goToPage-t is átadjuk az iframe-nek
            const renderContentInIframe = () => {
                try {
                    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
                    if (iframeDoc) {
                        iframeDoc.open();
                        iframeDoc.write(htmlContent);
                        iframeDoc.close();
                        console.log(`[FlipbookEngine] Tartalom beírva az iframe-be (${pageId}).`);

                        if (iframe.contentWindow) {
                            iframe.contentWindow.scrollTo(0, 0);
                            // A globális goToPage elérhetővé tétele
                            iframe.contentWindow.parentGoToPage = window.goToPage;
                            console.log(`[FlipbookEngine] parentGoToPage beállítva az iframe-ben (${pageId}).`);
                        }
                        this._applyIframeSecurity(iframe); // Biztonsági beállítások
                        this._activatePage(pageId); // Belső állapot és gombok frissítése

                    } else {
                        console.error("[FlipbookEngine] Nem sikerült elérni az iframe dokumentumát (renderContentInIframe).");
                         this._activatePage(pageId); // Próbáljuk frissíteni az állapotot hiba esetén is
                    }
                } catch (writeError) {
                    console.error(`[FlipbookEngine] Hiba az iframe tartalmának beírásakor (${pageId}):`, writeError);
                     this._activatePage(pageId); // Próbáljuk frissíteni az állapotot hiba esetén is
                } finally {
                    this.isAnimating = false; // Renderelés végén feloldjuk a blokkolást
                }
            };

            // Ha az iframe 'about:blank'-ra lett állítva, várni kell kicsit, különben lehet azonnal írni
             // if (iframe.src === 'about:blank') {
             //    setTimeout(renderContentInIframe, 50); // Kis késleltetés
             // } else {
                 renderContentInIframe(); // Próbáljuk meg azonnal
            // }
             // Egyszerűsítsünk: Próbáljuk meg mindig azonnal írni.
             renderContentInIframe();


        } catch (e) {
            console.error(`[FlipbookEngine] Hiba az iframe renderelés előkészítésekor (${pageId}):`, e);
            this._activatePage(pageId); // Frissítsük az állapotot
            this.isAnimating = false; // Oldjuk a blokkolást
        }
    }


    /**
     * Előző oldalra "lapozás" (Hash változtatása) - MÓDOSÍTVA
     */
    prevPage() {
        if (this.isAnimating) return;
        const currentPageNum = this.currentPage; // A belső állapotot használjuk
        if (currentPageNum === null || typeof currentPageNum === 'undefined') {
             console.warn("[FlipbookEngine] prevPage: Aktuális oldal ismeretlen."); return;
        }

        const targetPageNum = currentPageNum - 1;
        if (targetPageNum >= 0) {
            const targetPageId = targetPageNum === 0 ? 'borito' : String(targetPageNum);
            // Ellenőrizzük, létezik-e a céloldal az adatokban
             if (window.bookPageData && window.bookPageData.hasOwnProperty(targetPageId)) {
                 console.log(`[FlipbookEngine] prevPage: Ugrás ${targetPageId}-ra (hash beállítása).`);
                 this.playFlipSound();
                 location.hash = `#${targetPageId}`; // Hash váltás -> hashchange listener intézi a betöltést
             } else {
                  console.warn(`[FlipbookEngine] prevPage: Oldal ${targetPageId} nem létezik.`);
                  this.showNotification(`Előző oldal (${targetPageId}) nem található.`);
             }
        } else {
            console.log("[FlipbookEngine] prevPage: Már az első oldalon.");
        }
    }

    /**
     * Következő oldalra "lapozás" (Hash változtatása) - MÓDOSÍTVA
     */
    nextPage() {
        if (this.isAnimating) return;
        const currentPageNum = this.currentPage;
        if (currentPageNum === null || typeof currentPageNum === 'undefined') {
            console.warn("[FlipbookEngine] nextPage: Aktuális oldal ismeretlen."); return;
        }

        const targetPageNum = (currentPageNum === 0) ? 1 : currentPageNum + 1;
        const targetPageId = String(targetPageNum);

        if (window.bookPageData && window.bookPageData.hasOwnProperty(targetPageId)) {
            console.log(`[FlipbookEngine] nextPage: Ugrás ${targetPageId}-ra (hash beállítása).`);
            this.playFlipSound();
            location.hash = `#${targetPageId}`; // Hash váltás -> hashchange listener intézi a betöltést
        } else {
            console.log(`[FlipbookEngine] nextPage: Oldal ${targetPageId} nem létezik (könyv vége?).`);
            this.showNotification("Nincs több oldal.");
        }
    }

    /**
     * Lapozás hang lejátszása (Változatlan)
     */
     playFlipSound() { /* ... (Változatlan) ... */ if(this.flipSound&&!this.isMuted){this.flipSound.currentTime=0;this.flipSound.play().catch(e=>console.warn('Hang hiba:',e));}}

    /**
     * Navigációs gombok láthatóságának frissítése (MÓDOSÍTVA: bookPageData alapján)
     */
    updateNavigationVisibility() {
        const currentPageNum = this.currentPage;
        if (currentPageNum === null || typeof currentPageNum === 'undefined') return;

        // Bal gomb
        if (this.leftButton) {
            const prevPageNum = currentPageNum - 1;
            const prevPageId = prevPageNum === 0 ? 'borito' : String(prevPageNum);
            const canGoPrev = currentPageNum > 0 && window.bookPageData?.hasOwnProperty(prevPageId);
            this.leftButton.style.opacity = canGoPrev ? '1' : '0';
            this.leftButton.style.pointerEvents = canGoPrev ? 'auto' : 'none';
        }

        // Jobb gomb
        if (this.rightButton) {
             const nextPageNum = (currentPageNum === 0) ? 1 : currentPageNum + 1;
             const nextPageId = String(nextPageNum);
             const canGoNext = window.bookPageData?.hasOwnProperty(nextPageId);
             this.rightButton.style.opacity = canGoNext ? '1' : '0';
             this.rightButton.style.pointerEvents = canGoNext ? 'auto' : 'none';
        }
        // console.log(`Nav buttons updated for page ${currentPageNum}. CanGoPrev: ${this.leftButton?.style.opacity === '1'}, CanGoNext: ${this.rightButton?.style.opacity === '1'} `);
    }

    /**
     * Aktív oldal belső állapotának és UI-jának frissítése (MÓDOSÍTVA: pageId-t kap)
     */
    _activatePage(pageId) {
      const pageNum = pageId === 'borito' ? 0 : parseInt(pageId, 10);
      if (isNaN(pageNum)) {
          console.warn(`[FlipbookEngine] _activatePage érvénytelen pageId: ${pageId}. Állapot 0-ra állítva.`);
          this.currentPage = 0;
      } else {
           this.currentPage = pageNum;
      }
      console.log(`[FlipbookEngine] Oldal aktiválva (belső állapot): ${pageId} -> ${this.currentPage}`);
      document.body.setAttribute('data-page', pageId); // Frissítjük a body attribútumot is
      this.updateNavigationVisibility(); // Gombok frissítése
    }

    // --- VÁLTOZATLANUL HAGYOTT FÜGGVÉNYEK AZ EREDETIBŐL ---
    showNavigationMenu() { /* ... (Marad változatlan, de pontatlan) ... */ console.warn("showNavigationMenu régi logika alapján!"); const m=document.querySelector('.navigation-menu'); if(m){m.remove();return;} const d=document.createElement('div'); d.className='navigation-menu'; d.style.cssText="position: fixed; bottom: 70px; right: 20px; width: 250px; max-height: 60vh; overflow-y: auto; background-color: rgba(0, 0, 0, 0.9); border-radius: 10px; padding: 15px; z-index: 10000; box-shadow: 0 0 20px rgba(0, 0, 0, 0.5);"; const t=document.createElement('div'); t.style.cssText="color: white; font-size: 18px; font-weight: bold; margin-bottom: 15px; text-align: center;"; t.textContent='Navigáció (Korlátozott)'; d.appendChild(t); this.chapters.forEach(c=>{const i=document.createElement('div'); i.className='nav-item'; i.style.cssText="color: white; padding: 10px; margin: 5px 0; cursor: pointer; border-radius: 5px; transition: background-color 0.2s;"; const p=c.page===0?'borito':String(c.page); const h=location.hash.substring(1)||(this.currentPage===0?'borito':String(this.currentPage)); if(p===h){i.style.backgroundColor='rgba(127,0,255,0.5)';i.style.fontWeight='bold';} i.textContent=`${c.title} (${p}. oldal)`; i.addEventListener('click',()=>{location.hash=`#${p}`; d.remove();}); d.appendChild(i); }); document.body.appendChild(d); document.addEventListener('click',(e)=>{if(d.parentNode&&!d.contains(e.target)&&!e.target.closest('.control-button.navigation'))d.remove();},{once:true});}
    showNotification(message) { /* ... (Marad változatlan) ... */ const n=document.createElement('div'); n.className='flipbook-notification'; n.textContent=message; n.style.cssText="position:fixed;top:20px;left:50%;transform:translateX(-50%);padding:10px 20px;background-color:rgba(0,0,0,0.8);color:white;border-radius:5px;z-index:10000;opacity:0;transition:opacity .3s ease"; document.body.appendChild(n); setTimeout(()=>{n.style.opacity='1'},10); setTimeout(()=>{n.style.opacity='0';setTimeout(()=>{if(n.parentNode)n.parentNode.removeChild(n)},300)},2500); }
    toggleFullscreen() { /* ... (Marad változatlan) ... */ if(!document.fullscreenElement){document.documentElement.requestFullscreen().catch(err=>{this.showNotification('Teljes képernyő hiba: '+(err.message||err));});}else{if(document.exitFullscreen){document.exitFullscreen();}} }
    updateMuteButtonIcon(buttonElement){ /* ... (Marad változatlan) ... */ if (!buttonElement) return; buttonElement.innerHTML = this.isMuted ? `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><line x1="23" y1="9" x2="17" y2="15"></line><line x1="17" y1="9" x2="23" y2="15"></line></svg>` : `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>`; }
    toggleMute(button) { /* ... (Marad változatlan) ... */ this.isMuted=!this.isMuted; console.log("Hang némítva:", this.isMuted); this.updateMuteButtonIcon(button||document.querySelector('.control-button.mute')); }
    _applyIframeSecurity(iframe) { /* ... (Marad változatlan az eredeti fájlodból) ... */ try{const d=iframe.contentDocument||iframe.contentWindow?.document;if(!d||!d.body)return;let s=d.getElementById('security-script');if(!s){s=d.createElement('script');s.id='security-script';s.textContent="document.addEventListener('contextmenu',e=>e.preventDefault());document.addEventListener('copy',e=>e.preventDefault());document.addEventListener('dragstart',e=>e.preventDefault());document.body.style.userSelect='none';document.body.style.webkitUserSelect='none';document.body.style.msUserSelect='none'; document.querySelectorAll('img').forEach(img => { img.style.pointerEvents = 'none'; img.draggable = false; img.setAttribute('unselectable', 'on'); });";d.body.appendChild(s);}let y=d.getElementById('security-style');if(!y){y=d.createElement('style');y.id='security-style';y.textContent='::selection{background:transparent;}*{-webkit-touch-callout:none;-webkit-user-select:none;-moz-user-select:none;-ms-user-select:none;user-select:none;}';d.head.appendChild(y);}}catch(e){console.warn('Hiba iframe sec beáll.:',e);} }
    destroy() { /* ... (Marad változatlan) ... */ document.removeEventListener('keydown',this.handleKeyDown); if(this.leftButton)this.leftButton.removeEventListener('click',this.prevPage); if(this.rightButton)this.rightButton.removeEventListener('click',this.nextPage); console.log("FlipbookEngine megsemmisítve."); }

} // <-- FlipbookEngine osztály vége

// Globális exportálás (marad változatlan)
window.FlipbookEngine = FlipbookEngine;