// Ezt a részt keresd meg az index.html fájlban és cseréld le:

<script>
    let deferredPrompt; // Globális változó a prompt esemény tárolására

    window.addEventListener('beforeinstallprompt', (e) => {
      // 1. Akadályozzuk meg az alapértelmezett mini-infobar megjelenését
      e.preventDefault();
      console.log('[InstallPrompt] beforeinstallprompt esemény érzékelve.');

      // 2. Ellenőrizzük, hogy az app telepített módban fut-e már
      const isInStandaloneMode = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
      if (isInStandaloneMode) {
        console.log('[InstallPrompt] Az app telepített (standalone) módban fut, banner nem jelenik meg.');
        // Ha telepítve fut, elrejtjük a bannert, ha esetleg látható lenne
         const installBanner = document.getElementById('install-banner');
         if (installBanner) {
             installBanner.style.display = 'none';
         }
        return; // Kilépünk, nem kell bannert mutatni
      }

      // 3. NE használjunk sessionStorage-t, hanem azonnal megjelenítsük a bannert
      console.log('[InstallPrompt] Telepítési prompt eltárolva.');
      deferredPrompt = e;

      // 4. Megjelenítjük a saját bannerünket
      const installBanner = document.getElementById('install-banner');
      if (installBanner) {
        console.log('[InstallPrompt] Telepítési banner megjelenítése.');
        installBanner.style.display = 'block';
      } else {
         console.error('[InstallPrompt] Az "install-banner" elem nem található!');
      }
    });

    // Bannerre kattintás kezelése
    const bannerElement = document.getElementById('install-banner');
    if (bannerElement) {
      bannerElement.addEventListener('click', async () => {
        console.log('[InstallPrompt] Bannerre kattintás érzékelve.');
        // Elrejtjük a bannert azonnal
        bannerElement.style.display = 'none';

        // Ellenőrizzük, hogy van-e eltárolt prompt eseményünk
        if (!deferredPrompt) {
          console.log('[InstallPrompt] Nincs eltárolt prompt esemény.');
          return; // Ha nincs, nem tudunk mit tenni
        }

        // Megjelenítjük a böngésző telepítési párbeszédablakát, ha mindenigaz
        try {
          console.log('[InstallPrompt] Telepítési prompt megjelenítése...');
          deferredPrompt.prompt();
          // Várjuk meg a felhasználó válaszát
          const { outcome } = await deferredPrompt.userChoice;
          console.log(`[InstallPrompt] Felhasználó válasza a promptra: ${outcome}`);
          // Akár 'accepted' (elfogadta), akár 'dismissed' (elvetette),
          // a promptot felhasználtuk, töröljük a referenciát.
          deferredPrompt = null;
        } catch (error) {
           console.error('[InstallPrompt] Hiba a telepítési prompt megjelenítése közben:', error);
           deferredPrompt = null; // Hiba esetén is töröljük
        }
      });
    } else {
         console.error('[InstallPrompt] Nem sikerült click eseménykezelőt hozzáadni: Az "install-banner" elem nem található!');
    }
</script>