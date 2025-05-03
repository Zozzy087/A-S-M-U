// flipbook-engine.ts - Főbb osztályok és funkciók
/**
 * Flipbook Motor - Interaktív kalandkönyvekhez
 * Támogatja a 100% PWA működést, lapozási animációkat, keresést, könyvjelzőt
 */
class FlipbookEngine {
    constructor(options) {
        this.currentPageElement = null;
        this.nextPageElement = null;
        // Állapot változók
        this.currentPage = 0;
        this.totalPages = 300;
        this.isAnimating = false;
        this.isMuted = false;
        // Navigáció vezérlők
        this.leftButton = null;
        this.rightButton = null;
        // Fejezet adatok
        this.chapters = [
            { id: "0", title: "Borító", page: 0 },
            { id: "1", title: "Kezdés", page: 1 },
            { id: "2", title: "Karakteralkotás", page: 2 }
            // További fejezetek itt adhatók hozzá
        ];
        // Segédfüggvény a keydown eseménykezelő referenciájához
        this.handleKeyDown = (e) => {
            if (e.key === 'ArrowLeft') {
                this.prevPage();
            }
            else if (e.key === 'ArrowRight') {
                this.nextPage();
            }
        };
        // Inicializálás az opciókkal
        this.totalPages = options.totalPages;
        const container = document.getElementById(options.containerId);
        if (!container)
            throw new Error(`Container element with ID "${options.containerId}" not found`);
        this.bookContainer = container;
        // Flipbook konténer inicializálása
        this.initializeContainer();
        // Lapozó hang inicializálása
        this.flipSound = new Audio(options.soundPath || 'sounds/pageturn.mp3');
        // Vezérlők létrehozása
        this.createControls();
        // Események hozzáadása
        this.addEventListeners();
        // Kezdőoldal betöltése
        this.loadPage(0);
        // Navigációs gombok kezdeti beállítása
        this.updateNavigationVisibility();
    }
    /**
     * Flipbook konténer inicializálása
     */
    initializeContainer() {
        this.bookContainer.innerHTML = '';
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
        this.bookContainer.appendChild(this.currentPageElement);
        // Következő oldal iframe elékészítése (lapozáshoz)
        this.nextPageElement = document.createElement('iframe');
        this.nextPageElement.className = 'book-page next';
        this.nextPageElement.style.width = '100%';
        this.nextPageElement.style.height = '100%';
        this.nextPageElement.style.border = 'none';
        this.nextPageElement.style.position = 'absolute';
        this.nextPageElement.style.left = '0';
        this.nextPageElement.style.top = '0';
        this.nextPageElement.style.zIndex = '0';
        this.nextPageElement.style.visibility = 'hidden';
        this.bookContainer.appendChild(this.nextPageElement);
    }
    /**
     * Navigációs és funkció vezérlők létrehozása
     */
    createControls() {
        // Baloldali lapozó gomb
        this.leftButton = document.createElement('div');
        this.leftButton.className = 'page-turn-button left';
        this.leftButton.innerHTML = '◀';
        this.leftButton.style.position = 'absolute';
        this.leftButton.style.left = '20px';
        this.leftButton.style.top = '50%';
        this.leftButton.style.transform = 'translateY(-50%)';
        this.leftButton.style.fontSize = '36px';
        this.leftButton.style.color = 'rgba(199, 0, 0, 1)';
        this.leftButton.style.cursor = 'pointer';
        this.leftButton.style.zIndex = '100';
        this.leftButton.style.backgroundColor = 'rgba(0, 0, 0, 0.3)';
        this.leftButton.style.borderRadius = '50%';
        this.leftButton.style.width = '50px';
        this.leftButton.style.height = '50px';
        this.leftButton.style.display = 'flex';
        this.leftButton.style.justifyContent = 'center';
        this.leftButton.style.alignItems = 'center';
        this.leftButton.style.transition = 'opacity 0.3s ease';
        this.bookContainer.appendChild(this.leftButton);
        // Jobboldali lapozó gomb
        this.rightButton = document.createElement('div');
        this.rightButton.className = 'page-turn-button right';
        this.rightButton.innerHTML = '▶';
        this.rightButton.style.position = 'absolute';
        this.rightButton.style.right = '20px';
        this.rightButton.style.top = '50%';
        this.rightButton.style.transform = 'translateY(-50%)';
        this.rightButton.style.fontSize = '36px';
        this.rightButton.style.color = 'rgba(0, 199, 0, 1)';
        this.rightButton.style.cursor = 'pointer';
        this.rightButton.style.zIndex = '100';
        this.rightButton.style.backgroundColor = 'rgba(0, 0, 0, 0.3)';
        this.rightButton.style.borderRadius = '50%';
        this.rightButton.style.width = '50px';
        this.rightButton.style.height = '50px';
        this.rightButton.style.display = 'flex';
        this.rightButton.style.justifyContent = 'center';
        this.rightButton.style.alignItems = 'center';
        this.rightButton.style.transition = 'opacity 0.3s ease';
        this.bookContainer.appendChild(this.rightButton);
        // További vezérlők konténere
        const controlsContainer = document.createElement('div');
        controlsContainer.className = 'controls-container';
        controlsContainer.style.position = 'fixed';
        controlsContainer.style.bottom = '0'; // Alulra helyezi
        controlsContainer.style.left = '0'; // Balra igazítja
        controlsContainer.style.width = '100%'; // Teljes szélességű lesz
        controlsContainer.style.zIndex = '9999'; // Garantálja, hogy minden felett lesz
        controlsContainer.style.display = 'flex';
        controlsContainer.style.justifyContent = 'right'; // Középre igazítja a gombokat
        controlsContainer.style.gap = '-200px';
        controlsContainer.style.backgroundColor = 'rgba(0, 0, 0, 0)'; // Sötét háttér
        controlsContainer.style.padding = '0px 0'; // Csak fent-lent van padding
        // Navigáció gomb
        const navButton = document.createElement('button');
        navButton.className = 'control-button navigation';
        navButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
  <polyline points="9 22 9 12 15 12 15 22"></polyline>
</svg>`;
        navButton.title = 'Navigáció';
        navButton.addEventListener('click', () => this.showNavigationMenu());
        // Teljes képernyő gomb
        const fullscreenButton = document.createElement('button');
        fullscreenButton.className = 'control-button fullscreen';
        fullscreenButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"></path>
</svg>`;
        fullscreenButton.title = 'Teljes képernyő';
        fullscreenButton.addEventListener('click', () => this.toggleFullscreen());
        // Némítás gomb
        const muteButton = document.createElement('button');
        muteButton.className = 'control-button mute';
        muteButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
  <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
</svg>`;
        muteButton.title = 'Hang némítása';
        muteButton.addEventListener('click', () => this.toggleMute(muteButton));
        // Gombok hozzáadása a vezérlő konténerhez
        controlsContainer.appendChild(navButton);
        controlsContainer.appendChild(fullscreenButton);
        controlsContainer.appendChild(muteButton);
        // Vezérlő konténer hozzáadása a könyv konténerhez
        document.body.appendChild(controlsContainer);
    }
    /**
     * Események hozzáadása
     */
    addEventListeners() {
        // Nyíl gombok eseménykezelői
        if (this.leftButton) {
            this.leftButton.addEventListener('click', () => this.prevPage());
        }
        if (this.rightButton) {
            this.rightButton.addEventListener('click', () => this.nextPage());
        }
        // Billentyűzet események
        document.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowLeft') {
                this.prevPage();
            }
            else if (e.key === 'ArrowRight') {
                this.nextPage();
            }
            else if (e.key === 'f' || e.key === 'F') {
                this.toggleFullscreen();
            }
        });
        // Érintés események (swipe)
        let touchStartX = 0;
        let touchEndX = 0;
        this.bookContainer.addEventListener('touchstart', (e) => { if (this.currentPage === 0) {
    return;
}
            touchStartX = e.changedTouches[0].screenX;
        }, { passive: true });
        this.bookContainer.addEventListener('touchend', (e) => { if (this.currentPage === 0) {
    return;
}
            touchEndX = e.changedTouches[0].screenX;
            this.handleSwipe(touchStartX, touchEndX);
        }, { passive: true });
    }
    /**
     * Swipe kezelése
     */
    handleSwipe(startX, endX) {
        const swipeThreshold = 100;
        if (endX < startX - swipeThreshold) {
            // Jobbra swipe -> Következő oldal
            this.nextPage();
        }
        else if (endX > startX + swipeThreshold) {
            // Balra swipe -> Előző oldal
            this.prevPage();
        }
    }
    /**
 * Oldalbetöltés KEZDEMÉNYEZÉSE (ÚJ VERZIÓ)
 * Ez a funkció most már a ContentLoader-t kéri meg a betöltésre és ellenőrzésre.
 */
loadPage(pageIdentifier) {
    // Azonosító átalakítása szöveggé (string), hogy biztosan az legyen
    const pageId = String(pageIdentifier);

    console.log(`[FlipbookEngine] Oldalbetöltési kérelem érkezett: ${pageId}`);

    // Ellenőrizzük, hogy a ContentLoader elérhető-e (biztonsági ellenőrzés)
    if (window.contentLoader) {
        // Megkérjük a ContentLoader-t, hogy töltse be és ellenőrizze az oldalt
        window.contentLoader.loadContent(pageId)
            .then(success => {
                // Ez a rész akkor fut le, MIUTÁN a ContentLoader végzett.
                if (success) {
                    // Ha a ContentLoader sikeres volt (token rendben, tartalom elérhető):
                    // CSAK MOST frissítjük a FlipbookEngine állapotát!
                    this.currentPage = pageId; // Elmentjük az aktuális oldal azonosítóját
                    document.body.setAttribute('data-page', pageId); // Frissítjük a body attribútumot
                    this.updateNavigationVisibility(); // Frissítjük a lapozó nyilak láthatóságát
                    console.log(`[FlipbookEngine] Állapot sikeresen frissítve: ${pageId}`);

                    // Itt NEM kell beállítani az iframe src-jét (this.currentPageElement.src = ...),
                    // mert azt feltételezzük, hogy a ContentLoader _renderContent metódusa
                    // (vagy a neki adott callback funkció) már megtette,
                    // amikor sikeresen betöltötte a tartalmat.
                } else {
                    // Ha a ContentLoader sikertelen volt (pl. nincs jogosultság):
                    // Nem csinálunk semmit itt, mert a ContentLoader már
                    // valószínűleg megjelenítette a hibaoldalt.
                    console.warn(`[FlipbookEngine] A ContentLoader sikertelen betöltést jelzett: ${pageId}`);
                }
            })
            .catch(error => {
                // Hiba történt a ContentLoader hívása közben
                console.error(`[FlipbookEngine] Hiba a contentLoader.loadContent hívásakor (${pageId}):`, error);
                this.showNotification("Hiba az oldal betöltése közben."); // Értesítjük a felhasználót
            });
    } else {
        // Ha a ContentLoader valamiért nem elérhető
        console.error("[FlipbookEngine] Hiba: ContentLoader példány nem található!");
        this.showNotification("Hiba: A tartalombetöltő szolgáltatás nem érhető el.");
    }
} // <-- Itt a vége az ÚJ loadPage funkciónak
    /**
     * Következő oldalra lapozás
     */
    nextPage() {
        if (this.isAnimating || this.currentPage >= this.totalPages)
            return;
        // Csak bizonyos oldalszámig engedélyezünk lapozást
        const maxFreePageNavigation = 2; // Ezt az értéket állítsd be, ameddig lapozni lehet
        if (this.currentPage >= maxFreePageNavigation) {
            this.showNotification('Ezen a ponton csak linkeken keresztül folytathatod az olvasást.');
            return;
        }
        this.flipPageAnimation('right');
    }
    /**
     * Előző oldalra lapozás
     */
    prevPage() {
        if (this.isAnimating || this.currentPage <= 0)
            return;
        this.flipPageAnimation('left');
    }
    /**
     * Lapozási animáció végrehajtása
     */
    flipPageAnimation(direction) {
        if (!this.currentPageElement || !this.nextPageElement)
            return;
        this.isAnimating = true;
        // Kövezkező oldal számának kiszámítása
        const nextPageNum = direction === 'right' ? this.currentPage + 1 : this.currentPage - 1;
        if (nextPageNum < 0 || nextPageNum > this.totalPages) {
            this.isAnimating = false;
            return;
        }
        // Következő oldal betöltése az elrejtett iframe-be
        const nextPagePath = nextPageNum === 0 ? 'pages/borito.html' : `pages/${nextPageNum}.html`;
        this.nextPageElement.src = nextPagePath;
        this.nextPageElement.style.visibility = 'visible';
        // A lap helyzetének beállítása az animációhoz
        if (direction === 'right') {
            // Jobbra lapozás esetén
            this.nextPageElement.style.transform = 'translateX(100%)';
            this.currentPageElement.style.transform = 'translateX(0)';
        }
        else {
            // Balra lapozás esetén
            this.nextPageElement.style.transform = 'translateX(-100%)';
            this.currentPageElement.style.transform = 'translateX(0)';
        }
        // Rövid várakozás, hogy az új oldal betöltődjön
        setTimeout(() => {
            // Lapozás hang lejátszása
            if (!this.isMuted) {
                this.flipSound.currentTime = 0;
                this.flipSound.play().catch(e => console.error('Hang lejátszási hiba:', e));
            }
            // Animáció hozzáadása
            this.nextPageElement.style.transition = 'transform 0.5s ease-in-out';
            this.currentPageElement.style.transition = 'transform 0.5s ease-in-out';
            if (direction === 'right') {
                this.nextPageElement.style.transform = 'translateX(0)';
                this.currentPageElement.style.transform = 'translateX(-100%)';
            }
            else {
                this.nextPageElement.style.transform = 'translateX(0)';
                this.currentPageElement.style.transform = 'translateX(100%)';
            }
            // Animáció után iframeek cseréje
            setTimeout(() => {
                // A jelenlegi oldal iframe lesz a következő
                this.currentPageElement.style.transition = '';
                this.nextPageElement.style.transition = '';
                // Ideiglenes változó a cseréhez
                const temp = this.currentPageElement;
                this.currentPageElement = this.nextPageElement;
                this.nextPageElement = temp;
                // Z-index és láthatóság alaphelyzetbe állítása
                this.currentPageElement.style.zIndex = '1';
                this.nextPageElement.style.zIndex = '0';
                this.nextPageElement.style.visibility = 'hidden';
                this.nextPageElement.style.transform = 'translateX(0)';
                // Oldal számának frissítése
                this.currentPage = nextPageNum;
                // Navigációs gombok frissítése
                this.updateNavigationVisibility();
                // Animáció befejezve
                this.isAnimating = false;
            }, 500); // Animáció ideje
        }, 50);
    }
    /**
     * Navigációs menü megjelenítése
     */
    showNavigationMenu() {
        // Ellenőrizzük, hogy a navigációs menü már látható-e
        const existingMenu = document.querySelector('.navigation-menu');
        if (existingMenu) {
            existingMenu.remove();
            return;
        }
        // Menü létrehozása
        const menu = document.createElement('div');
        menu.className = 'navigation-menu';
        menu.style.position = 'fixed';
        menu.style.bottom = '70px';
        menu.style.right = '20px';
        menu.style.width = '250px';
        menu.style.maxHeight = '60vh';
        menu.style.overflowY = 'auto';
        menu.style.backgroundColor = 'rgba(0, 0, 0, 0.9)';
        menu.style.borderRadius = '10px';
        menu.style.padding = '15px';
        menu.style.zIndex = '10000';
        menu.style.boxShadow = '0 0 20px rgba(0, 0, 0, 0.5)';
        // Menü cím
        const title = document.createElement('div');
        title.style.color = 'white';
        title.style.fontSize = '18px';
        title.style.fontWeight = 'bold';
        title.style.marginBottom = '15px';
        title.style.textAlign = 'center';
        title.textContent = 'Navigáció';
        menu.appendChild(title);
        // Fejezetek listázása
        this.chapters.forEach(chapter => {
            const item = document.createElement('div');
            item.className = 'nav-item';
            item.style.color = 'white';
            item.style.padding = '10px';
            item.style.margin = '5px 0';
            item.style.cursor = 'pointer';
            item.style.borderRadius = '5px';
            item.style.transition = 'background-color 0.2s';
            // Jelenlegi oldal kiemelése
            if (this.currentPage === chapter.page) {
                item.style.backgroundColor = 'rgba(127, 0, 255, 0.5)';
                item.style.fontWeight = 'bold';
            }
            item.textContent = `${chapter.title} (${chapter.page}. oldal)`;
            // Kattintás eseménykezelő
            item.addEventListener('click', () => {
                this.loadPage(chapter.page);
                menu.remove();
            });
            // Hover effekt
            item.addEventListener('mouseenter', () => {
                if (this.currentPage !== chapter.page) {
                    item.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                }
            });
            item.addEventListener('mouseleave', () => {
                if (this.currentPage !== chapter.page) {
                    item.style.backgroundColor = 'transparent';
                }
            });
            menu.appendChild(item);
        });
        // Menü hozzáadása a dokumentumhoz
        document.body.appendChild(menu);
        // Kattintás bárhová a menün kívül bezárja azt
        document.addEventListener('click', (e) => {
            const target = e.target;
            if (menu && !menu.contains(target) && !target.closest('.control-button.navigation')) {
                menu.remove();
            }
        }, { once: true });
    }
    /**
     * Navigációs gombok láthatóságának frissítése az aktuális oldal alapján
   */
    updateNavigationVisibility() {
        const maxFreePageNavigation = 2; // Ezt állítsd be, ameddig a lapozás elérhető
        // Bal gomb frissítése (hátra lapozás)
        if (this.leftButton) {
            if (this.currentPage <= 0 || this.currentPage >= 2) { // Itt a módosítás: hozzáadva a || this.currentPage >= 4 feltétel
                this.leftButton.style.opacity = '0';
                this.leftButton.style.pointerEvents = 'none';
            }
            else {
                this.leftButton.style.opacity = '1';
                this.leftButton.style.pointerEvents = 'auto';
            }
        }
        // Jobb gomb frissítése (előre lapozás)
        if (this.rightButton) {
            if (this.currentPage >= maxFreePageNavigation) {
                this.rightButton.style.opacity = '0';
                this.rightButton.style.pointerEvents = 'none';
            }
            else {
                this.rightButton.style.opacity = '1';
                this.rightButton.style.pointerEvents = 'auto';
            }
        }
    }
    /**
     * Értesítés megjelenítése
     */
    showNotification(message) {
        const notification = document.createElement('div');
        notification.className = 'flipbook-notification';
        notification.textContent = message;
        notification.style.position = 'fixed';
        notification.style.top = '20px';
        notification.style.left = '50%';
        notification.style.transform = 'translateX(-50%)';
        notification.style.padding = '10px 20px';
        notification.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
        notification.style.color = 'white';
        notification.style.borderRadius = '5px';
        notification.style.zIndex = '1000';
        notification.style.opacity = '0';
        notification.style.transition = 'opacity 0.3s ease';
        document.body.appendChild(notification);
        // Megjelenítés fokozatosan
        setTimeout(() => {
            notification.style.opacity = '1';
        }, 10);
        // Eltüntetés késleltetéssel
        setTimeout(() => {
            notification.style.opacity = '0';
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 2000);
    }
    /**
     * Teljes képernyő váltás
     */
    toggleFullscreen() {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(err => {
                this.showNotification('Teljes képernyő hiba: ' + err.message);
            });
        }
        else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            }
        }
    }
    /**
     * Hang némítása/visszakapcsolása
     */
    toggleMute(button) {
        this.isMuted = !this.isMuted;
        if (button) {
            // Ikoncsere
            button.innerHTML = this.isMuted ?
                `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
        <line x1="23" y1="9" x2="17" y2="15"></line>
        <line x1="17" y1="9" x2="23" y2="15"></line>
      </svg>` :
                `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
        <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
      </svg>`;
        }
    }
    /**
     * Könyv bezárás, erőforrások felszabadítása
     */
    destroy() {
        // Eseménykezelők eltávolítása
        document.removeEventListener('keydown', this.handleKeyDown);
        if (this.leftButton) {
            this.leftButton.removeEventListener('click', this.prevPage);
        }
        if (this.rightButton) {
            this.rightButton.removeEventListener('click', this.nextPage);
        }
    }
}
// Exportálás
window.FlipbookEngine = FlipbookEngine;
