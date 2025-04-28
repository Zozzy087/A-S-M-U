/**
 * Flipbook Engine - Professional interactive flipbook for PWAs
 * Supports 100% offline functionality, smooth page turning animations, and responsive design
 */
class FlipbookEngine {
    constructor(options) {
        // Core elements
        this.currentPageElement = null;
        this.nextPageElement = null;
        this.bookContainer = null;
        
        // State variables
        this.currentPage = 0;
        this.totalPages = options.totalPages || 300;
        this.isAnimating = false;
        this.isMuted = false;
        this.isFullscreen = false;
        
        // Navigation controls
        this.leftButton = null;
        this.rightButton = null;
        
        // Chapter data - updated with actual page structure
        this.chapters = [
            { id: "0", title: "Cover", page: 0 },
            { id: "1", title: "1 Dice Roll", page: 1 },
            { id: "2", title: "3 Dice Roll", page: 2 },
            { id: "3", title: "Character Generation", page: 3 },
            { id: "4", title: "Answer Input", page: 4 }
        ];
        
        // Sound effects
        this.flipSound = new Audio(options.soundPath || 'sounds/pageturn-102978.mp3');
        this.flipSound.preload = 'auto';
        
        // Initialize with options
        this.initialize(options);
    }
    
    /**
     * Initialize the flipbook with the provided options
     */
    initialize(options) {
        // Set total pages
        this.totalPages = options.totalPages || 300;
        
        // Get container element
        const container = document.getElementById(options.containerId);
        if (!container) {
            throw new Error(`Container element with ID "${options.containerId}" not found`);
        }
        this.bookContainer = container;
        
        // Initialize container
        this.initializeContainer();
        
        // Create controls
        this.createControls();
        
        // Add event listeners
        this.addEventListeners();
        
        // Load initial page
        this.loadPage(0);
        
        // Update navigation visibility
        this.updateNavigationVisibility();
        
        // Add notification container
        this.createNotificationContainer();
    }
    
    /**
     * Initialize the flipbook container
     */
    initializeContainer() {
        this.bookContainer.innerHTML = '';
        this.bookContainer.style.position = 'relative';
        this.bookContainer.style.width = '100%';
        this.bookContainer.style.height = '100%';
        this.bookContainer.style.overflow = 'hidden';
        this.bookContainer.classList.add('flipbook-container');
        
        // Create current page iframe
        this.currentPageElement = document.createElement('iframe');
        this.currentPageElement.className = 'book-page current';
        this.currentPageElement.style.width = '100%';
        this.currentPageElement.style.height = '100%';
        this.currentPageElement.style.border = 'none';
        this.currentPageElement.style.position = 'absolute';
        this.currentPageElement.style.left = '0';
        this.currentPageElement.style.top = '0';
        this.currentPageElement.style.zIndex = '1';
        this.currentPageElement.style.transition = 'transform 0.6s cubic-bezier(0.645, 0.045, 0.355, 1)';
        this.currentPageElement.style.transformOrigin = 'left center';
        this.currentPageElement.style.backfaceVisibility = 'hidden';
        this.bookContainer.appendChild(this.currentPageElement);
        
        // Create next page iframe (for page turning)
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
        this.nextPageElement.style.transition = 'transform 0.6s cubic-bezier(0.645, 0.045, 0.355, 1)';
        this.nextPageElement.style.transformOrigin = 'left center';
        this.nextPageElement.style.backfaceVisibility = 'hidden';
        this.bookContainer.appendChild(this.nextPageElement);
    }
    
    /**
     * Create navigation and function controls
     */
    createControls() {
        // Left page turn button
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
        
        // Right page turn button
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
        
        // Controls container
        const controlsContainer = document.createElement('div');
        controlsContainer.className = 'controls-container';
        controlsContainer.style.position = 'fixed';
        controlsContainer.style.bottom = '0';
        controlsContainer.style.left = '0';
        controlsContainer.style.width = '100%';
        controlsContainer.style.zIndex = '9999';
        controlsContainer.style.display = 'flex';
        controlsContainer.style.justifyContent = 'center';
        controlsContainer.style.gap = '10px';
        controlsContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
        controlsContainer.style.padding = '10px 0';
        
        // Navigation button
        const navButton = document.createElement('button');
        navButton.className = 'control-button navigation';
        navButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
  <polyline points="9 22 9 12 15 12 15 22"></polyline>
</svg>`;
        navButton.title = 'Navigation';
        navButton.addEventListener('click', () => this.showNavigationMenu());
        
        // Fullscreen button
        const fullscreenButton = document.createElement('button');
        fullscreenButton.className = 'control-button fullscreen';
        fullscreenButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"></path>
</svg>`;
        fullscreenButton.title = 'Fullscreen';
        fullscreenButton.addEventListener('click', () => this.toggleFullscreen());
        
        // Mute button
        const muteButton = document.createElement('button');
        muteButton.className = 'control-button mute';
        muteButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
  <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
</svg>`;
        muteButton.title = 'Mute Sound';
        muteButton.addEventListener('click', () => this.toggleMute(muteButton));
        
        // Add buttons to container
        controlsContainer.appendChild(navButton);
        controlsContainer.appendChild(fullscreenButton);
        controlsContainer.appendChild(muteButton);
        
        // Add container to document
        document.body.appendChild(controlsContainer);
    }
    
    /**
     * Create notification container
     */
    createNotificationContainer() {
        this.notificationContainer = document.createElement('div');
        this.notificationContainer.className = 'notification-container';
        this.notificationContainer.style.position = 'fixed';
        this.notificationContainer.style.top = '20px';
        this.notificationContainer.style.left = '50%';
        this.notificationContainer.style.transform = 'translateX(-50%)';
        this.notificationContainer.style.zIndex = '10000';
        this.notificationContainer.style.display = 'none';
        this.notificationContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
        this.notificationContainer.style.color = 'white';
        this.notificationContainer.style.padding = '10px 20px';
        this.notificationContainer.style.borderRadius = '5px';
        this.notificationContainer.style.fontFamily = 'Cinzel, serif';
        this.notificationContainer.style.transition = 'opacity 0.3s ease';
        document.body.appendChild(this.notificationContainer);
    }
    
    /**
     * Add event listeners
     */
    addEventListeners() {
        // Page turn buttons
        if (this.leftButton) {
            this.leftButton.addEventListener('click', () => this.prevPage());
        }
        if (this.rightButton) {
            this.rightButton.addEventListener('click', () => this.nextPage());
        }
        
        // Keyboard events
        document.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowLeft') {
                this.prevPage();
            } else if (e.key === 'ArrowRight') {
                this.nextPage();
            } else if (e.key === 'f' || e.key === 'F') {
                this.toggleFullscreen();
            }
        });
        
        // Touch events (swipe)
        let touchStartX = 0;
        let touchEndX = 0;
        
        this.bookContainer.addEventListener('touchstart', (e) => {
            touchStartX = e.changedTouches[0].screenX;
        }, { passive: true });
        
        this.bookContainer.addEventListener('touchend', (e) => {
            touchEndX = e.changedTouches[0].screenX;
            this.handleSwipe(touchStartX, touchEndX);
        }, { passive: true });
        
        // Handle window resize
        window.addEventListener('resize', () => {
            this.updateNavigationVisibility();
        });
    }
    
    /**
     * Handle swipe gestures
     */
    handleSwipe(startX, endX) {
        const swipeThreshold = 50;
        if (endX < startX - swipeThreshold) {
            // Swipe right -> Next page
            this.nextPage();
        } else if (endX > startX + swipeThreshold) {
            // Swipe left -> Previous page
            this.prevPage();
        }
    }
    
    /**
     * Load a page
     */
    loadPage(pageNumber) {
        if (pageNumber < 0 || pageNumber > this.totalPages) {
            return;
        }
        
        if (this.currentPageElement) {
            // Map page numbers to actual page files
            let pagePath;
            switch(pageNumber) {
                case 0:
                    pagePath = 'pages/borito.html';
                    break;
                case 1:
                    pagePath = 'pages/1 kockás példaoldal.html';
                    break;
                case 2:
                    pagePath = 'pages/3 kockás példaoldal.html';
                    break;
                case 3:
                    pagePath = 'pages/KARAKTER GENERÁLÓ.html';
                    break;
                case 4:
                    pagePath = 'pages/6.html';
                    break;
                default:
                    pagePath = `pages/${pageNumber}.html`;
            }
            
            this.currentPageElement.src = pagePath;
            this.currentPage = pageNumber;
            
            // Set data-page attribute on body
            document.body.setAttribute('data-page', pageNumber.toString());
            
            // Handle iframe load
            this.currentPageElement.onload = () => {
                try {
                    const iframeDoc = this.currentPageElement?.contentDocument;
                    if (iframeDoc) {
                        // Add CSS rule to prevent content from extending to control bar
                        const style = iframeDoc.createElement('style');
                        style.textContent = `
                            body {
                                padding-bottom: 70px !important;
                                box-sizing: border-box;
                            }
                        `;
                        iframeDoc.head.appendChild(style);
                    }
                } catch (error) {
                    console.error('Error accessing iframe content:', error);
                }
            };
            
            // Update navigation visibility
            this.updateNavigationVisibility();
        }
    }
    
    /**
     * Go to next page
     */
    nextPage() {
        if (this.isAnimating || this.currentPage >= this.totalPages) {
            return;
        }
        
        const nextPageNumber = this.currentPage + 1;
        this.flipPageAnimation('next', nextPageNumber);
    }
    
    /**
     * Go to previous page
     */
    prevPage() {
        if (this.isAnimating || this.currentPage <= 0) {
            return;
        }
        
        const prevPageNumber = this.currentPage - 1;
        this.flipPageAnimation('prev', prevPageNumber);
    }
    
    /**
     * Animate page turning
     */
    flipPageAnimation(direction, targetPage) {
        if (this.isAnimating) {
            return;
        }
        
        this.isAnimating = true;
        
        // Play sound if not muted
        if (!this.isMuted) {
            this.flipSound.currentTime = 0;
            this.flipSound.play().catch(e => console.error('Error playing sound:', e));
        }
        
        // Set up next page
        let pagePath;
        switch(targetPage) {
            case 0:
                pagePath = 'pages/borito.html';
                break;
            case 1:
                pagePath = 'pages/1 kockás példaoldal.html';
                break;
            case 2:
                pagePath = 'pages/3 kockás példaoldal.html';
                break;
            case 3:
                pagePath = 'pages/KARAKTER GENERÁLÓ.html';
                break;
            case 4:
                pagePath = 'pages/6.html';
                break;
            default:
                pagePath = `pages/${targetPage}.html`;
        }
        
        this.nextPageElement.src = pagePath;
        this.nextPageElement.style.visibility = 'visible';
        
        // Determine animation based on direction
        if (direction === 'next') {
            // Next page animation
            this.currentPageElement.style.transform = 'rotateY(-180deg)';
            this.nextPageElement.style.transform = 'rotateY(0deg)';
        } else {
            // Previous page animation
            this.currentPageElement.style.transform = 'rotateY(180deg)';
            this.nextPageElement.style.transform = 'rotateY(0deg)';
        }
        
        // After animation completes
        setTimeout(() => {
            // Swap pages
            const temp = this.currentPageElement;
            this.currentPageElement = this.nextPageElement;
            this.nextPageElement = temp;
            
            // Reset styles
            this.currentPageElement.style.transform = '';
            this.currentPageElement.style.zIndex = '1';
            this.nextPageElement.style.transform = '';
            this.nextPageElement.style.zIndex = '0';
            this.nextPageElement.style.visibility = 'hidden';
            
            // Update current page
            this.currentPage = targetPage;
            document.body.setAttribute('data-page', targetPage.toString());
            
            // Update navigation visibility
            this.updateNavigationVisibility();
            
            // Animation complete
            this.isAnimating = false;
        }, 600); // Match transition duration
    }
    
    /**
     * Show navigation menu
     */
    showNavigationMenu() {
        // Create navigation overlay
        const overlay = document.createElement('div');
        overlay.className = 'navigation-overlay';
        overlay.style.position = 'fixed';
        overlay.style.top = '0';
        overlay.style.left = '0';
        overlay.style.width = '100%';
        overlay.style.height = '100%';
        overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.9)';
        overlay.style.zIndex = '10000';
        overlay.style.display = 'flex';
        overlay.style.flexDirection = 'column';
        overlay.style.alignItems = 'center';
        overlay.style.justifyContent = 'center';
        overlay.style.fontFamily = 'Cinzel, serif';
        
        // Create close button
        const closeButton = document.createElement('button');
        closeButton.innerHTML = '×';
        closeButton.style.position = 'absolute';
        closeButton.style.top = '20px';
        closeButton.style.right = '20px';
        closeButton.style.fontSize = '40px';
        closeButton.style.background = 'none';
        closeButton.style.border = 'none';
        closeButton.style.color = 'white';
        closeButton.style.cursor = 'pointer';
        closeButton.addEventListener('click', () => {
            document.body.removeChild(overlay);
        });
        
        // Create title
        const title = document.createElement('h1');
        title.textContent = 'Navigation';
        title.style.color = 'white';
        title.style.marginBottom = '30px';
        
        // Create chapter list
        const chapterList = document.createElement('div');
        chapterList.style.display = 'flex';
        chapterList.style.flexDirection = 'column';
        chapterList.style.gap = '10px';
        chapterList.style.maxHeight = '70vh';
        chapterList.style.overflowY = 'auto';
        chapterList.style.width = '80%';
        chapterList.style.maxWidth = '500px';
        
        // Add chapters to list
        this.chapters.forEach(chapter => {
            const chapterButton = document.createElement('button');
            chapterButton.textContent = `${chapter.title} (Page ${chapter.page})`;
            chapterButton.style.padding = '10px';
            chapterButton.style.backgroundColor = '#368B27';
            chapterButton.style.color = 'white';
            chapterButton.style.border = 'none';
            chapterButton.style.borderRadius = '5px';
            chapterButton.style.cursor = 'pointer';
            chapterButton.style.fontFamily = 'Cinzel, serif';
            chapterButton.style.transition = 'background-color 0.3s ease';
            
            chapterButton.addEventListener('mouseover', () => {
                chapterButton.style.backgroundColor = '#91E35D';
            });
            
            chapterButton.addEventListener('mouseout', () => {
                chapterButton.style.backgroundColor = '#368B27';
            });
            
            chapterButton.addEventListener('click', () => {
                this.loadPage(chapter.page);
                document.body.removeChild(overlay);
            });
            
            chapterList.appendChild(chapterButton);
        });
        
        // Add elements to overlay
        overlay.appendChild(closeButton);
        overlay.appendChild(title);
        overlay.appendChild(chapterList);
        
        // Add overlay to document
        document.body.appendChild(overlay);
    }
    
    /**
     * Update navigation button visibility
     */
    updateNavigationVisibility() {
        if (this.leftButton) {
            this.leftButton.style.opacity = this.currentPage <= 0 ? '0.3' : '1';
            this.leftButton.style.pointerEvents = this.currentPage <= 0 ? 'none' : 'auto';
        }
        
        if (this.rightButton) {
            this.rightButton.style.opacity = this.currentPage >= this.totalPages ? '0.3' : '1';
            this.rightButton.style.pointerEvents = this.currentPage >= this.totalPages ? 'none' : 'auto';
        }
    }
    
    /**
     * Show notification
     */
    showNotification(message) {
        if (!this.notificationContainer) {
            return;
        }
        
        this.notificationContainer.textContent = message;
        this.notificationContainer.style.display = 'block';
        this.notificationContainer.style.opacity = '1';
        
        setTimeout(() => {
            this.notificationContainer.style.opacity = '0';
            setTimeout(() => {
                this.notificationContainer.style.display = 'none';
            }, 300);
        }, 3000);
    }
    
    /**
     * Toggle fullscreen
     */
    toggleFullscreen() {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(err => {
                console.error(`Error attempting to enable fullscreen: ${err.message}`);
            });
            this.isFullscreen = true;
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
                this.isFullscreen = false;
            }
        }
    }
    
    /**
     * Toggle mute
     */
    toggleMute(button) {
        this.isMuted = !this.isMuted;
        
        if (this.isMuted) {
            button.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <line x1="1" y1="1" x2="23" y2="23"></line>
  <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.68-1.33"></path>
  <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"></path>
  <line x1="12" y1="19" x2="12" y2="23"></line>
  <line x1="8" y1="23" x2="16" y2="23"></line>
</svg>`;
        } else {
            button.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
  <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
</svg>`;
        }
    }
    
    /**
     * Clean up resources
     */
    destroy() {
        // Remove event listeners
        document.removeEventListener('keydown', this.handleKeyDown);
        
        // Clear container
        if (this.bookContainer) {
            this.bookContainer.innerHTML = '';
        }
        
        // Remove controls
        const controlsContainer = document.querySelector('.controls-container');
        if (controlsContainer) {
            document.body.removeChild(controlsContainer);
        }
        
        // Remove notification container
        if (this.notificationContainer) {
            document.body.removeChild(this.notificationContainer);
        }
    }
}

// Export the flipbook engine
window.FlipbookEngine = FlipbookEngine;
