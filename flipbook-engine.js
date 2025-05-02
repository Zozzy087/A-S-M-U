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
        // Borítón mindig elrejtjük a visszalapozó gombot
        this.hideLeftButtonOnCover();
        
        // Tartalom betöltő és token kezelő inicializálása
        if (window.contentLoader) {
          window.contentLoader.setup((pageId, content) => this._renderPage(pageId, content));
        }

        if (window.authTokenService) {
          // Hozzáférési token inicializálása
          window.authTokenService.getAccessToken();
        }
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
        this.bookContainer.addEventListener('touchstart', (e) => {
            touchStartX = e.changedTouches[0].screenX;
        }, { passive: true });
        this.bookContainer.addEventListener('touchend', (e) => {
            touchEndX = e.changedTouches[0].screenX;
            this.handleSwipe(touchStartX, touchEndX);
        }, { passive: true });
    }
    /**
     * Swipe kezelése
     */
    handleSwipe(startX, endX) {
        const swipeThreshold = 50;
        if (endX < startX - swipeThreshold) {
            // Jobbra swipe -> Következő oldal
            this.nextPage();
        }
        else if (endX > startX + swipeThreshold) {
            // Balra swipe -> Előző oldal
            this.prevPage();
        }
    }
    
    // Eredeti oldalletöltő függvény mentése
    _originalLoadPage(pageNumber) {
        if (pageNumber < 0 || pageNumber > this.totalPages) return;
        
        if (this.currentPageElement) {
            const pagePath = pageNumber === 0 ? 'pages/borito.html' : `pages/${pageNumber}.html`;
            this.currentPageElement.src = pagePath;
            this.currentPage = pageNumber;
            
            // Beállítjuk a data-page attribútumot a body tag-en
            document.body.setAttribute('data-page', pageNumber.toString());
            
            // Az iframe betöltése után állítsuk be a tartalom méretét
            this.currentPageElement.onload = () => {
                try {
                    const iframeDoc = this.currentPageElement?.contentDocument;
                    if (iframeDoc) {
                        // CSS szabály hozzáadása, hogy a tartalom ne érjen le a vezérlősávig
                        const style = iframeDoc.createElement('style');
                        style.textContent = `
                          body {
                            padding-bottom: 70px !important;
                            box-sizing: border-box;
                          }
                        `;
                        iframeDoc.head.appendChild(style);
                    }
                } catch (e) {
                    console.error('Nem sikerült módosítani az iframe tartalmát:', e);
                }
            };
            
            // Navigációs gombok frissítése
            this.updateNavigationVisibility();
            
            // Ha borítóra navigálunk, külön is biztosítjuk, hogy ne legyen visszalapozó gomb
            if (pageNumber === 0) {
                this.hideLeftButtonOnCover();
            }
        }
    }

    /**
     * Bal gomb explicit elrejtése a borítón (biztonsági megoldás)
     */
    hideLeftButtonOnCover() {
        // Ha a borítón vagyunk és létezik bal gomb, akkor bizonyosan elrejtjük
        if (this.currentPage === 0 && this.leftButton) {
            console.log("Bal gomb explicit elrejtése a borítón");
            this.leftButton.style.opacity = '0';
            this.leftButton.style.pointerEvents = 'none';
            this.leftButton.style.display = 'none'; // Teljesen eltávolítjuk a DOM-ból
            // iframe-en belüli kezelés is - ha az iframe már betöltődött
            if (this.currentPageElement && this.currentPageElement.contentDocument) {
                try {
                    // Adjunk hozzá egy stílust az iframe-hez, hogy a tartalom ne legyen kattintható
                    const style = this.currentPageElement.contentDocument.createElement('style');
                    style.textContent = `
                        * {
                            pointer-events: none;
                        }
                    `;
                    this.currentPageElement.contentDocument.head.appendChild(style);
                } catch (e) {
                    console.error('Nem sikerült módosítani az iframe tartalmát borító módban:', e);
                }
            }
        }
    }

    // Új oldalletöltő függvény
    loadPage(pageNumber) {
        console.log(`loadPage hívva: ${pageNumber}`);
        
        // Ellenőrzés: érvényes oldalszám
        if (pageNumber < 0 || pageNumber > this.totalPages) {
            console.error(`Érvénytelen oldalszám: ${pageNumber}`);
            return;
        }
        
        // Ha borítóra navigálunk, rögtön elrejtjük a bal gombot
        if (pageNumber === 0) {
            this.currentPage = 0; // Explicit beállítjuk
            setTimeout(() => {
                this.hideLeftButtonOnCover(); // Explicit elrejtjük a bal gombot késleltetéssel
            }, 10);
        }
        
        // Ha van ContentLoader, azt használjuk (biztonságos)
        if (window.contentLoader) {
            const pageId = pageNumber === 0 ? 'borito' : pageNumber.toString();
            console.log(`ContentLoader használata a betöltéshez: ${pageId}`);
            window.contentLoader.loadContent(pageId)
                .then(success => {
                    // A loadContent után frissítjük a navigációs gombokat
                    this.currentPage = pageNumber;
                    this.updateNavigationVisibility();
                    
                    // Borítónál még egyszer ellenőrizzük, késleltetéssel
                    if (pageNumber === 0) {
                        setTimeout(() => {
                            this.hideLeftButtonOnCover();
                        }, 50);
                    }
                    
                    console.log(`Oldal betöltve ContentLoader-rel: ${pageId}, sikeres: ${success}`);
                })
                .catch(error => {
                    console.error(`Hiba a ContentLoader használatakor: ${error}`);
                });
        } 
        // Ellenkező esetben visszatérünk az eredeti betöltési logikához
        else {
            console.log(`Eredeti betöltési logika használata: ${pageNumber}`);
            this._originalLoadPage(pageNumber);
            
            // Borítónál még egyszer ellenőrizzük, késleltetéssel
            if (pageNumber === 0) {
                setTimeout(() => {
                    this.hideLeftButtonOnCover();
                }, 50);
            }
        }
    }
    
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
        // Már a borítón vagyunk vagy animáció zajlik - nem csinálunk semmit
        if (this.isAnimating || this.currentPage <= 0) {
            console.log("Nem lapozunk: már a borítón vagyunk vagy animáció zajlik.");
            return;
        }
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
                
                // Ha borítóra lapoztunk, még egyszer elrejtjük a bal gombot
                if (nextPageNum === 0) {
                    setTimeout(() => {
                        this.hideLeftButtonOnCover();
                    }, 50);
                }
                
                // Animáció befejezve
                this.isAnimating = false;
            }, 500); // Animáció ideje
        }, 50);
    }
    
    /**
     * Navigációs menü megjelenítése
     */
    showNavigationMenu() {
        console.log('Navigációs menü megjelenítése');
        
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
                console.log(`Navigációs menüből oldal betöltése: ${chapter.page}`);
                this.loadPage(chapter.page);
                menu.remove();
                
                // Explicit beállítjuk az aktuális oldalt és frissítjük a navigációs gombokat
                this.currentPage = chapter.page;
                this.updateNavigationVisibility();
                
                // Ha borítóra navigálunk, elrejtjük a bal gombot
                if (chapter.page === 0) {
                    setTimeout(() => {
                        this.hideLeftButtonOnCover();
                    }, 50);
                }
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
        console.log('Navigációs gombok frissítése, aktuális oldal:', this.currentPage);
        
        const maxFreePageNavigation = 2; // Ez az érték, ameddig lapozni lehet
        
        // Bal gomb frissítése (hátra lapozás) - JAVÍTOTT változat
        if (this.leftButton) {
            // JAVÍTÁS: A 0-s oldalon (borítón) SOHA ne jelenjen meg a bal gomb!
            if (this.currentPage === 0) {
                // Borítón vagyunk, itt soha nem kell vissza gomb
                this.leftButton.style.opacity = '0';
                this.leftButton.style.pointerEvents = 'none';
                this.leftButton.style.display = 'none'; // Teljesen eltávolítjuk a DOM-ból
                console.log('Bal gomb elrejtve - borítón vagyunk');
            }
            else if (this.currentPage === 1) {
                // 1. oldalon vagyunk, itt megjelenik a vissza gomb
                this.leftButton.style.opacity = '1';
                this.leftButton.style.pointerEvents = 'auto';
                this.leftButton.style.display = 'flex'; // Visszaállítjuk a megjelenítést
                console.log('Bal gomb megjelenítve - 1. oldalon vagyunk');
            }
            else if (this.currentPage >= 2) {
                // 2. vagy későbbi oldalon vagyunk, itt elrejtjük a gombot
                this.leftButton.style.opacity = '0';
                this.leftButton.style.pointerEvents = 'none';
                this.leftButton.style.display = 'none'; // Eltávolítjuk a DOM-ból
                console.log('Bal gomb elrejtve - 2. vagy későbbi oldalon vagyunk');
            }
        }
        
        // Jobb gomb frissítése (előre lapozás)
        if (this.rightButton) {
            if (this.currentPage >= maxFreePageNavigation) {
                // Ha elértük vagy túlléptük a max szabad lapozási limitet, elrejtjük
                this.rightButton.style.opacity = '0';
                this.rightButton.style.pointerEvents = 'none';
                console.log('Jobb gomb elrejtve - elértük a max. lapozási limitet');
            } else {
                // Egyébként mutatjuk (borítólapon és 1. oldalon)
                this.rightButton.style.opacity = '1';
                this.rightButton.style.pointerEvents = 'auto';
                this.rightButton.style.display = 'flex'; // Biztosítjuk, hogy megjelenjen
                console.log('Jobb gomb megjelenítve');
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
    
    // Tartalom megjelenítése a jogosultság ellenőrzés után
    _renderPage(pageId, content) {
        console.log(`Oldal renderelése: ${pageId}`);
      
        try {
            // Konvertáljuk a pageId-t számmá, ha szükséges
            let pageNumber = pageId === 'borito' ? 0 : parseInt(pageId, 10);
        
            // A megfelelő oldalszámú iframe kiválasztása vagy létrehozása
            const iframe = this._getOrCreateIframe(pageNumber);
        
            if (!iframe) {
                console.error(`Nem sikerült iframe-et találni a ${pageNumber}. oldalhoz`);
                return;
            }
        
            // Tartalom betöltése az iframe-be
            const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
            iframeDoc.open();
            iframeDoc.write(content);
            iframeDoc.close();
        
            // Sandbox korlátozások hozzáadása (biztonsági intézkedések)
            this._applyIframeSecurity(iframe);
        
            // Jelezzük, hogy az oldal készen áll
            iframe.dataset.loaded = 'true';
        
            // Aktiváljuk az oldalt (minden esetben)
            this._activatePage(pageNumber);
        
            // Plusz ellenőrzés: ha borítón vagyunk, akkor biztosan elrejtjük a bal gombot
            if (pageNumber === 0) {
                setTimeout(() => {
                    this.hideLeftButtonOnCover();
                }, 50);
            }
        
            console.log(`Oldal sikeresen renderelve: ${pageId}`);
        } catch (error) {
            console.error(`Hiba az oldal renderelése közben (${pageId}):`, error);
        }
    }

    // Iframe biztonsági beállítások alkalmazása
    _applyIframeSecurity(iframe) {
      try {
        // A sandbox attribútumok beállítása
        iframe.sandbox = 'allow-same-origin allow-scripts';
        
        // iframe-en belüli tartalomhoz scriptek hozzáadása
        const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
        
        // Script hozzáadása, ami megakadályozza a kimásolást
        const securityScript = iframeDoc.createElement('script');
        securityScript.textContent = `
          document.addEventListener('copy', function(e) {
            e.preventDefault();
            return false;
          });
          
          document.addEventListener('contextmenu', function(e) {
            e.preventDefault();
            return false;
          });
          
          document.addEventListener('dragstart', function(e) {
            e.preventDefault();
            return false;
          });
          
          // Minden kép megérintés tiltása
          document.querySelectorAll('img').forEach(img => {
            img.style.pointerEvents = 'none';
            img.draggable = false;
            img.setAttribute('unselectable', 'on');
          });
          
          // Ha borítón vagyunk, akkor ne engedjük a kattintásokat
          if (window.parent && window.parent.flipbookInstance && window.parent.flipbookInstance.currentPage === 0) {
            document.body.style.pointerEvents = 'none';
          }
        `;
        
        iframeDoc.body.appendChild(securityScript);
        
        // CSS szabályok hozzáadása a kijelölés letiltásához
        const securityStyle = iframeDoc.createElement('style');
        securityStyle.textContent = `
          * {
            -webkit-user-select: none;
            -moz-user-select: none;
            -ms-user-select: none;
            user-select: none;
            -webkit-touch-callout: none;
          }
          
          /* Védelem az ideiglenes kijelölés ellen */
          ::selection {
            background: transparent;
            color: inherit;
          }
        `;
        
        iframeDoc.head.appendChild(securityStyle);
      } catch (error) {
        console.error('Hiba az iframe biztonsági beállításakor:', error);
      }
    }
    
    // Segédfüggvény az iframe kiválasztásához vagy létrehozásához
    _getOrCreateIframe(pageNumber) {
      // Ha a kért oldal az aktuális oldal, akkor az aktuális iframe-et használjuk
      if (pageNumber === this.currentPage && this.currentPageElement) {
        return this.currentPageElement;
      }
      
      // Ha a kért oldal a következő oldal és van következő iframe, akkor azt használjuk
      if (pageNumber === this.currentPage + 1 && this.nextPageElement) {
        return this.nextPageElement;
      }
      
      // Egyébként az aktuális iframe-et használjuk, mert nincs más választásunk
      return this.currentPageElement;
    }
    
    // Aktív oldal beállítása
    _activatePage(pageNumber) {
      console.log(`Oldal aktiválása: ${pageNumber}`);
      
      // Beállítjuk az aktuális oldal számát
      this.currentPage = pageNumber;
      
      // Navigációs gombok frissítése
      this.updateNavigationVisibility();
      
      // Plusz ellenőrzés: ha borítón vagyunk, akkor biztosan elrejtjük a bal gombot
      if (pageNumber === 0) {
          setTimeout(() => {
              this.hideLeftButtonOnCover();
          }, 50);
      }
      
      // A data-page attribútum frissítése a body tag-en
      document.body.setAttribute('data-page', pageNumber.toString());
      
      // Írjuk be a globális navigációs funkciót az ablakba
      window.flipbookInstance = this;
      
      console.log(`Oldal sikeresen aktiválva: ${pageNumber}`);
    }
}
// Exportálás
window.FlipbookEngine = FlipbookEngine;