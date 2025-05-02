// flipbook-engine.js - MÓDOSÍTVA a hash navigációhoz és contentLoader integrációhoz
/**
 * Flipbook Motor - Interaktív kalandkönyvekhez
 */
class FlipbookEngine {
    constructor(options) {
        this.currentPageElement = null; // Az aktuális oldalt megjelenítő iframe
        this.nextPageElement = null; // A következő oldal előtöltéséhez (animációhoz) használt iframe (opcionális)
        this.isAnimating = false; // Jelzi, ha lapozási animáció fut
        this.isMuted = false; // Hang némítás állapota
        this.leftButton = null; // Balra lapozó gomb DOM elem
        this.rightButton = null; // Jobbra lapozó gomb DOM elem
        this.currentPage = 0; // Az aktuálisan megjelenített oldal SZÁMA (vagy 'borito') - a renderPage frissíti
        this.flipSound = null; // Hang objektum

        // --- ÚJ: Renderelési callback referencia ---
        // A ContentLoadernek átadandó függvény, ami tudja, hogyan kell renderelni
        this.renderPageCallback = this.renderPage.bind(this);

        // Inicializálás az opciókkal
        const container = document.getElementById(options.containerId);
        if (!container) throw new Error(`Container element with ID "${options.containerId}" not found`);
        this.bookContainer = container;

        this.initializeContainer(); // Csak létrehozza az iframe-eket, src nélkül

        if (options.soundPath) {
            this.flipSound = new Audio(options.soundPath);
            this.flipSound.preload = 'auto';
        } else {
             console.warn("FlipbookEngine: Nincs megadva hangfájl útvonal (soundPath).");
        }

        this.createControls(); // Vezérlők létrehozása (marad ugyanaz)
        this.addEventListeners(); // Eseményfigyelők hozzáadása (lapozó gombok módosulnak)

        // TotalPages és Chapters itt már talán nem szükséges, ha a navigáció a hash-re épül
        // this.totalPages = options.totalPages;
        // this.chapters = options.chapters || []; // Ha lenne fejezetlista

        // Kezdeti navigációs gombok beállítása (az induló hash alapján kellene)
        // Ezt most a renderPage fogja kezelni, miután az első oldal betöltődött
        // this.updateNavigationVisibility();

        // --- ContentLoader beállítása a callback-kel ---
        // Ezt most az index.html végzi, miután az engine inicializálódott
        // if (window.contentLoader) {
        //   window.contentLoader.setup(this.renderPageCallback);
        // } else {
        //    console.error("FlipbookEngine: ContentLoader nem található a setup hívásakor!");
        // }

        console.log("FlipbookEngine konstruktor befejeződött.");
    }

    /**
     * Flipbook konténer és iframe elemek létrehozása (src nélkül)
     */
    initializeContainer() {
        this.bookContainer.innerHTML = ''; // Tiszta konténer
        this.bookContainer.style.position = 'relative';
        this.bookContainer.style.width = '100%';
        this.bookContainer.style.height = '100%';
        this.bookContainer.style.overflow = 'hidden';
        this.bookContainer.classList.add('flipbook-container');

        // Aktuális oldal iframe létrehozása
        this.currentPageElement = document.createElement('iframe');
        this.currentPageElement.className = 'book-page current';
        this.currentPageElement.style.width = '100%';
        this.currentPageElement.style.height = '100%';
        this.currentPageElement.style.border = 'none';
        this.currentPageElement.style.position = 'absolute';
        this.currentPageElement.style.left = '0';
        this.currentPageElement.style.top = '0';
        this.currentPageElement.style.zIndex = '1';
        // Fontos: Kezdetben ne legyen src beállítva! A tartalom JS-ből jön.
        // this.currentPageElement.src = 'about:blank'; // Vagy hagyjuk üresen
        this.bookContainer.appendChild(this.currentPageElement);

        // Következő oldal iframe létrehozása (animációhoz, ha kell)
        // Ennek a kezelése bonyolultabb lesz src nélkül, lehet egyszerűsíteni
        this.nextPageElement = document.createElement('iframe');
        this.nextPageElement.className = 'book-page next';
        this.nextPageElement.style.cssText = this.currentPageElement.style.cssText; // Stílus másolása
        this.nextPageElement.style.zIndex = '0';
        this.nextPageElement.style.visibility = 'hidden';
        this.bookContainer.appendChild(this.nextPageElement);

        console.log("FlipbookEngine: iframe-ek inicializálva.");
    }

    /**
     * Navigációs és funkció vezérlők létrehozása (Változatlan)
     */
    createControls() {
        // Balra lapozó gomb (marad ugyanaz)
        this.leftButton = document.createElement('div');
        this.leftButton.className = 'page-turn-button left';
        // ... (ugyanazok a stílusok, mint korábban) ...
         this.leftButton.innerHTML = '◀';
         this.leftButton.style.position = 'absolute'; this.leftButton.style.left = '20px'; this.leftButton.style.top = '50%'; this.leftButton.style.transform = 'translateY(-50%)'; this.leftButton.style.fontSize = '36px'; this.leftButton.style.color = 'rgba(199, 0, 0, 1)'; this.leftButton.style.cursor = 'pointer'; this.leftButton.style.zIndex = '100'; this.leftButton.style.backgroundColor = 'rgba(0, 0, 0, 0.3)'; this.leftButton.style.borderRadius = '50%'; this.leftButton.style.width = '50px'; this.leftButton.style.height = '50px'; this.leftButton.style.display = 'flex'; this.leftButton.style.justifyContent = 'center'; this.leftButton.style.alignItems = 'center'; this.leftButton.style.transition = 'opacity 0.3s ease';
        this.bookContainer.appendChild(this.leftButton);

        // Jobbra lapozó gomb (marad ugyanaz)
        this.rightButton = document.createElement('div');
        this.rightButton.className = 'page-turn-button right';
        // ... (ugyanazok a stílusok, mint korábban) ...
        this.rightButton.innerHTML = '▶';
        this.rightButton.style.position = 'absolute'; this.rightButton.style.right = '20px'; this.rightButton.style.top = '50%'; this.rightButton.style.transform = 'translateY(-50%)'; this.rightButton.style.fontSize = '36px'; this.rightButton.style.color = 'rgba(0, 199, 0, 1)'; this.rightButton.style.cursor = 'pointer'; this.rightButton.style.zIndex = '100'; this.rightButton.style.backgroundColor = 'rgba(0, 0, 0, 0.3)'; this.rightButton.style.borderRadius = '50%'; this.rightButton.style.width = '50px'; this.rightButton.style.height = '50px'; this.rightButton.style.display = 'flex'; this.rightButton.style.justifyContent = 'center'; this.rightButton.style.alignItems = 'center'; this.rightButton.style.transition = 'opacity 0.3s ease';
        this.bookContainer.appendChild(this.rightButton);

        // Alsó vezérlők konténere (marad ugyanaz)
        const controlsContainer = document.createElement('div');
        controlsContainer.className = 'controls-container';
        // ... (stílusok maradnak) ...
        controlsContainer.style.position = 'fixed'; controlsContainer.style.bottom = '0'; controlsContainer.style.left = '0'; controlsContainer.style.width = '100%'; controlsContainer.style.zIndex = '9999'; controlsContainer.style.display = 'flex'; controlsContainer.style.justifyContent = 'center'; /* Változtatva: Gombok középre */ controlsContainer.style.gap = '15px'; controlsContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.3)'; controlsContainer.style.padding = '8px 0';

        // Navigáció gomb (marad ugyanaz)
        const navButton = document.createElement('button');
        navButton.className = 'control-button navigation';
        navButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>`;
        navButton.title = 'Navigáció';
        navButton.addEventListener('click', () => this.showNavigationMenu()); // showNavigationMenu logikája maradhat

        // Teljes képernyő gomb (marad ugyanaz)
        const fullscreenButton = document.createElement('button');
        fullscreenButton.className = 'control-button fullscreen';
        fullscreenButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"></path></svg>`;
        fullscreenButton.title = 'Teljes képernyő';
        fullscreenButton.addEventListener('click', () => this.toggleFullscreen()); // Ez a logika maradhat

        // Némítás gomb (marad ugyanaz)
        const muteButton = document.createElement('button');
        muteButton.className = 'control-button mute';
        muteButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>`;
        muteButton.title = 'Hang némítása';
        // Kezdeti állapot beállítása (ha kell)
        this.updateMuteButtonIcon(muteButton);
        muteButton.addEventListener('click', () => this.toggleMute(muteButton)); // Ez a logika maradhat

        controlsContainer.appendChild(navButton);
        controlsContainer.appendChild(fullscreenButton);
        controlsContainer.appendChild(muteButton);
        document.body.appendChild(controlsContainer); // Inkább a body-hoz adjuk, ne a book containerhez
        console.log("FlipbookEngine: Vezérlők létrehozva.");
    }

    /**
     * Eseményfigyelők hozzáadása
     */
    addEventListeners() {
        // Nyíl gombok eseménykezelői (mostantól hash-t váltanak)
        if (this.leftButton) {
            this.leftButton.addEventListener('click', () => this.prevPage());
        }
        if (this.rightButton) {
            this.rightButton.addEventListener('click', () => this.nextPage());
        }

        // Billentyűzet események (marad ugyanaz)
        document.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowLeft') this.prevPage();
            else if (e.key === 'ArrowRight') this.nextPage();
            else if (e.key === 'f' || e.key === 'F') this.toggleFullscreen();
        });

        // Érintés események (swipe) - Maradhat ugyanaz, a prev/nextPage hívás miatt
        let touchStartX = 0;
        let touchEndX = 0;
        this.bookContainer.addEventListener('touchstart', (e) => {
            touchStartX = e.changedTouches[0].screenX;
        }, { passive: true });
        this.bookContainer.addEventListener('touchend', (e) => {
            touchEndX = e.changedTouches[0].screenX;
            this.handleSwipe(touchStartX, touchEndX);
        }, { passive: true });

        console.log("FlipbookEngine: Eseményfigyelők hozzáadva.");
    }

    /**
     * Swipe kezelése (Változatlan)
     */
    handleSwipe(startX, endX) {
        const swipeThreshold = 50; // Minimum swipe távolság pixelben
        if (this.isAnimating) return; // Ne engedjünk swipe-ot animáció közben

        if (endX < startX - swipeThreshold) {
            this.nextPage(); // Jobbra swipe
        } else if (endX > startX + swipeThreshold) {
            this.prevPage(); // Balra swipe
        }
    }


    // ==============================================================
    // ==       MÓDOSÍTOTT ÉS ÚJ FÜGGVÉNYEK AZ ÚJ LOGIKÁHOZ      ==
    // ==============================================================

    /**
     * Callback függvény a ContentLoader számára.
     * Megjeleníti a kapott HTML tartalmat az aktuális iframe-ben.
     * @param {string} pageId Az oldal azonosítója (pl. "1", "borito")
     * @param {string} htmlContent A megjelenítendő HTML tartalom (már tartalmazza a licenc infót)
     */
    renderPage(pageId, htmlContent) {
        if (!this.currentPageElement) {
            console.error("FlipbookEngine: Nincs aktuális iframe elem a rendereléshez!");
            return;
        }
        console.log(`[FlipbookEngine] Oldal renderelése: ${pageId}`);

        // Egyszerű tartalom beírás, animáció nélkül egyelőre
        // Ha animációt szeretnél, itt kellene bonyolítani a nextPageElement használatával
        try {
            const iframe = this.currentPageElement;
            const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;

            if (iframeDoc) {
                iframeDoc.open();
                iframeDoc.write(htmlContent);
                iframeDoc.close();
                console.log(`[FlipbookEngine] Tartalom sikeresen beírva az iframe-be (${pageId}).`);

                // Scroll to top of the iframe content after loading
                if (iframe.contentWindow) {
                    iframe.contentWindow.scrollTo(0, 0);
                }

                 // Itt lehetne újraalkalmazni az iframe biztonsági beállításokat, ha szükséges
                 // this._applyIframeSecurity(iframe);

                 // Globális goToPage elérhetővé tétele az iframe-en belülről
                 // (Biztonsági megfontolásból jobb lehetne postMessage-et használni)
                 if (iframe.contentWindow) {
                     iframe.contentWindow.parentGoToPage = window.goToPage;
                     // Régi goToPage direkt hívás eltávolítása, ha volt ilyen
                     if(iframe.contentWindow.goToPage) iframe.contentWindow.goToPage = undefined;
                 }


            } else {
                console.error("[FlipbookEngine] Nem sikerült elérni az iframe dokumentumát a rendereléshez.");
            }
        } catch (e) {
            console.error(`[FlipbookEngine] Hiba az iframe tartalmának beírásakor (${pageId}):`, e);
            // Hibaoldal megjelenítése az iframe-ben
             const errorHtml = `<h1>Renderelési Hiba</h1><p>Az oldal (${pageId}) tartalmának megjelenítése sikertelen.</p><p>${e.message}</p>`;
             try {
                  const iframeDoc = this.currentPageElement.contentDocument || this.currentPageElement.contentWindow?.document;
                  if (iframeDoc) { iframeDoc.open(); iframeDoc.write(errorHtml); iframeDoc.close(); }
             } catch (renderError) {}
        }

        // Frissítjük a belső állapotot és a gombokat
        this.currentPage = pageId === 'borito' ? 0 : parseInt(pageId, 10);
        this.updateNavigationVisibility(); // Navigációs gombok állapotának frissítése
    }


    /**
     * Előző oldalra "lapozás" (Hash változtatása)
     */
    prevPage() {
        if (this.isAnimating) return; // Animáció alatt ne engedjünk lapozni

        // Az aktuális oldal számát a hash-ből vagy a belső változóból vesszük
        let currentPageNum = this.getCurrentPageNumberFromHash();
        if (isNaN(currentPageNum)) currentPageNum = this.currentPage; // Fallback a belsőre

        const targetPageNum = currentPageNum - 1;

        // Ellenőrizzük, hogy van-e ilyen oldal (0 a minimum, borító speciális)
        if (targetPageNum >= 0) {
             // Ha a cél a 0, akkor a hash 'borito' legyen (vagy '0', ha úgy kezeled)
             const targetPageId = targetPageNum === 0 ? 'borito' : String(targetPageNum);
             console.log(`[FlipbookEngine] prevPage: Ugrás a ${targetPageId} oldalra (hash beállítása).`);
             location.hash = `#${targetPageId}`;
             this.playFlipSound(); // Hang lejátszása
        } else {
            console.log("[FlipbookEngine] prevPage: Már az első oldalon vagyunk.");
        }
    }

    /**
     * Következő oldalra "lapozás" (Hash változtatása)
     */
    nextPage() {
        if (this.isAnimating) return;

        let currentPageNum = this.getCurrentPageNumberFromHash();
        if (isNaN(currentPageNum)) currentPageNum = this.currentPage;

        const targetPageNum = (currentPageNum === 0) ? 1 : currentPageNum + 1; // Borítóról (0) az 1-re

        // Ellenőrizzük, hogy létezik-e a céloldal a betöltött adatokban
        // (Nem a totalPages alapján, hanem a bookPageData alapján)
        if (window.bookPageData && window.bookPageData.hasOwnProperty(String(targetPageNum))) {
            console.log(`[FlipbookEngine] nextPage: Ugrás a ${targetPageNum} oldalra (hash beállítása).`);
            location.hash = `#${targetPageNum}`;
            this.playFlipSound(); // Hang lejátszása
        } else {
            console.log(`[FlipbookEngine] nextPage: Nincs több oldal, vagy a ${targetPageNum} nem létezik a bookPageData-ban.`);
            // Itt lehetne egy üzenet a felhasználónak, hogy vége a könyvnek
            // this.showNotification("A könyv végére értél.");
        }
    }

     /**
     * Segédfüggvény az aktuális oldalszám kinyerésére a hash-ből
     * @returns {number} Az oldalszám, vagy NaN, ha nem szám vagy 'borito'
     */
     getCurrentPageNumberFromHash() {
        const hash = location.hash.substring(1);
        if (hash === 'borito') return 0;
        return parseInt(hash, 10);
    }

    /**
     * Lapozás hang lejátszása (ha nincs némítva)
     */
    playFlipSound() {
        if (this.flipSound && !this.isMuted) {
            this.flipSound.currentTime = 0;
            this.flipSound.play().catch(e => console.warn('Hang lejátszási hiba:', e));
        }
    }


    /**
     * Navigációs gombok láthatóságának frissítése
     * Most már a hash vagy a belső currentPage alapján kell döntenie.
     */
    updateNavigationVisibility() {
        // Az aktuális oldalszámot használjuk (amit a renderPage frissít)
        const currentPageNum = this.currentPage; // Ez már szám vagy 0 (borito)
        console.log(`[FlipbookEngine] updateNavigationVisibility - Aktuális oldal (belső): ${currentPageNum}`);

        // Bal gomb: Akkor látszik, ha nem a borítón (0) vagyunk
        if (this.leftButton) {
            if (currentPageNum <= 0) { // 0 vagy annál kisebb (elvileg csak 0 lehet)
                this.leftButton.style.opacity = '0';
                this.leftButton.style.pointerEvents = 'none';
            } else {
                this.leftButton.style.opacity = '1';
                this.leftButton.style.pointerEvents = 'auto';
            }
        }

        // Jobb gomb: Akkor látszik, ha van következő oldal a betöltött adatokban
        if (this.rightButton) {
             const nextPageId = String(currentPageNum === 0 ? 1 : currentPageNum + 1);
             if (window.bookPageData && window.bookPageData.hasOwnProperty(nextPageId)) {
                 this.rightButton.style.opacity = '1';
                 this.rightButton.style.pointerEvents = 'auto';
             } else {
                 this.rightButton.style.opacity = '0';
                 this.rightButton.style.pointerEvents = 'none';
             }
        }
    }

    // ==============================================================
    // ==           VÁLTOZATLANUL HAGYOTT FÜGGVÉNYEK             ==
    // ==============================================================

    /**
     * Navigációs menü megjelenítése (Logika maradhat, de az oldalszámokat a bookPageData-ból vehetné)
     */
    showNavigationMenu() {
        // TODO: Ezt át lehetne írni, hogy a window.bookPageData kulcsai alapján generálja a listát,
        //       és a kattintás a location.hash = `#${pageId}`-t állítsa be.
        //       Jelenleg a régi this.chapters alapján működik, ami nem frissül.
        //       Egyszerűsítésként egyelőre hagyjuk így, de ez nem lesz pontos.
        console.warn("FlipbookEngine: showNavigationMenu még a régi 'this.chapters' alapján működik, nem a betöltött adatokból!");

        const existingMenu = document.querySelector('.navigation-menu');
        if (existingMenu) { existingMenu.remove(); return; }
        const menu = document.createElement('div');
        menu.className = 'navigation-menu';
        // ... (Stílusok maradnak ugyanazok) ...
        menu.style.position = 'fixed'; menu.style.bottom = '70px'; menu.style.right = '20px'; menu.style.width = '250px'; menu.style.maxHeight = '60vh'; menu.style.overflowY = 'auto'; menu.style.backgroundColor = 'rgba(0, 0, 0, 0.9)'; menu.style.borderRadius = '10px'; menu.style.padding = '15px'; menu.style.zIndex = '10000'; menu.style.boxShadow = '0 0 20px rgba(0, 0, 0, 0.5)';

        const title = document.createElement('div');
        // ... (Stílusok maradnak) ...
        title.style.color = 'white'; title.style.fontSize = '18px'; title.style.fontWeight = 'bold'; title.style.marginBottom = '15px'; title.style.textAlign = 'center';
        title.textContent = 'Navigáció (Korlátozott)';
        menu.appendChild(title);

        // Régi fejezetlista alapján (EZ NEM PONTOS MÁR!)
        this.chapters.forEach(chapter => {
            const item = document.createElement('div');
            item.className = 'nav-item';
            item.style.color = 'white'; item.style.padding = '10px'; item.style.margin = '5px 0'; item.style.cursor = 'pointer'; item.style.borderRadius = '5px'; item.style.transition = 'background-color 0.2s';

            const currentHashId = location.hash.substring(1) || (this.currentPage === 0 ? 'borito' : String(this.currentPage));
            if (String(chapter.page) === currentHashId || (chapter.page === 0 && currentHashId === 'borito')) {
                 item.style.backgroundColor = 'rgba(127, 0, 255, 0.5)'; item.style.fontWeight = 'bold';
            }
            item.textContent = `${chapter.title} (${chapter.page === 0 ? 'Borító' : chapter.page + '. oldal'})`;
            item.addEventListener('click', () => {
                location.hash = `#${chapter.page === 0 ? 'borito' : chapter.page}`; // Hash váltás
                menu.remove();
            });
            item.addEventListener('mouseenter', () => { /* ... hover ... */ });
            item.addEventListener('mouseleave', () => { /* ... hover ... */ });
            menu.appendChild(item);
        });
        document.body.appendChild(menu);
        document.addEventListener('click', (e) => { /* ... bezárás ... */ }, { once: true });
    }

    /**
     * Értesítés megjelenítése (Változatlan)
     */
    showNotification(message) {
        const notification = document.createElement('div');
        notification.className = 'flipbook-notification';
        notification.textContent = message;
        // ... (stílusok maradnak) ...
        notification.style.position = 'fixed'; notification.style.top = '20px'; notification.style.left = '50%'; notification.style.transform = 'translateX(-50%)'; notification.style.padding = '10px 20px'; notification.style.backgroundColor = 'rgba(0, 0, 0, 0.8)'; notification.style.color = 'white'; notification.style.borderRadius = '5px'; notification.style.zIndex = '1000'; notification.style.opacity = '0'; notification.style.transition = 'opacity 0.3s ease';
        document.body.appendChild(notification);
        setTimeout(() => { notification.style.opacity = '1'; }, 10);
        setTimeout(() => {
            notification.style.opacity = '0';
            setTimeout(() => { if (notification.parentNode) notification.parentNode.removeChild(notification); }, 300);
        }, 2500); // Kicsit hosszabb ideig látszik
    }

    /**
     * Teljes képernyő váltás (Változatlan)
     */
    toggleFullscreen() {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(err => {
                this.showNotification('Teljes képernyő hiba: ' + (err.message || err));
            });
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            }
        }
    }

     /**
     * Némítás gomb ikonjának frissítése
     */
     updateMuteButtonIcon(buttonElement){
         if (!buttonElement) return;
          buttonElement.innerHTML = this.isMuted ?
                `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><line x1="23" y1="9" x2="17" y2="15"></line><line x1="17" y1="9" x2="23" y2="15"></line></svg>` :
                `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>`;
     }

    /**
     * Hang némítása/visszakapcsolása (Változatlan)
     */
    toggleMute(button) {
        this.isMuted = !this.isMuted;
        console.log("Hang némítva:", this.isMuted);
        this.updateMuteButtonIcon(button || document.querySelector('.control-button.mute'));
    }

    /**
     * Iframe biztonsági beállítások (ha szükséges volt korábban)
     */
    _applyIframeSecurity(iframe) {
      // Ezt a logikát a régi kódból át lehet venni, ha szükséges volt.
      // Figyelem: Ez a renderPage metódusban fut le minden tartalom beírás után.
       try {
           const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
           if (!iframeDoc || !iframeDoc.body) return; // Még nem töltődött be teljesen?

            // Script hozzáadása (másolás, jobb klikk stb. tiltása)
            let securityScript = iframeDoc.getElementById('security-script');
            if (!securityScript) {
                 securityScript = iframeDoc.createElement('script');
                 securityScript.id = 'security-script';
                 securityScript.textContent = `
                   document.addEventListener('contextmenu', e => e.preventDefault());
                   document.addEventListener('copy', e => e.preventDefault());
                   document.addEventListener('dragstart', e => e.preventDefault());
                   document.body.style.userSelect = 'none';
                   document.body.style.webkitUserSelect = 'none';
                   document.body.style.msUserSelect = 'none';
                 `;
                 iframeDoc.body.appendChild(securityScript);
            }

            // CSS hozzáadása (kijelölés tiltása)
             let securityStyle = iframeDoc.getElementById('security-style');
             if(!securityStyle) {
                 securityStyle = iframeDoc.createElement('style');
                 securityStyle.id = 'security-style';
                 securityStyle.textContent = `::selection { background: transparent; } * { -webkit-touch-callout: none; }`;
                 iframeDoc.head.appendChild(securityStyle);
             }

       } catch (error) {
           console.warn('Hiba az iframe biztonsági beállításakor:', error);
       }
    }


    /**
     * Könyv bezárás, erőforrások felszabadítása (Változatlan)
     */
    destroy() {
        document.removeEventListener('keydown', this.handleKeyDown); // Módosított referencia
        if (this.leftButton) this.leftButton.removeEventListener('click', this.prevPage); // Módosított referencia
        if (this.rightButton) this.rightButton.removeEventListener('click', this.nextPage); // Módosított referencia
        // Esetleg a hashchange figyelőt is el kell távolítani, ha az engine felelős érte
        // window.removeEventListener('hashchange', ...);
        console.log("FlipbookEngine megsemmisítve.");
    }

    // handleKeyDown referencia a removeEventListener-hez (marad ugyanaz)
    handleKeyDown = (e) => {
      if (e.key === 'ArrowLeft') this.prevPage();
      else if (e.key === 'ArrowRight') this.nextPage();
      // else if (e.key === 'f' || e.key === 'F') this.toggleFullscreen(); // Már a fő addEventListeners-ben van
    };

} // <-- FlipbookEngine osztály vége

// Globális exportálás (marad ugyanaz)
// window.FlipbookEngine = FlipbookEngine; // TypeScript-ben ez nem szükséges, ha a script globálisan töltődik be