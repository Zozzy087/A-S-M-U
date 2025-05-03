document.addEventListener('DOMContentLoaded', () => {
  // Az egész dokumentumra (body) teszünk egyetlen eseményfigyelőt
  document.body.addEventListener('click', (event) => {
    // Megkeressük a kattintott elem legközelebbi 'a' szülőjét,
    // amelyik rendelkezik 'data-page' attribútummal.
    const link = event.target.closest('a[data-page]');

    if (link) {
      // Ha találtunk ilyen linket:
      event.preventDefault(); // Megállítjuk a link alapértelmezett működését

      const pageId = link.getAttribute('data-page'); // Kiolvassuk a céloldal azonosítóját

      if (pageId && window.parent && typeof window.parent.handlePageNavigation === 'function') {
        // Meghívjuk a SZÜLŐ (index.html) ablakban lévő ÚJ függvényt
        console.log(`[page-interaction.js] Navigációs kérés innen: ${window.location.pathname}, Cél: ${pageId}`);
        window.parent.handlePageNavigation(pageId);
      } else {
        console.error('Hiba: parent.handlePageNavigation funkció nem található vagy pageId hiányzik!');
        alert('Navigációs hiba történt!'); // Opcionális: felhasználói visszajelzés
      }
    }
    // Ha nem data-page linkre kattintottak, nem csinálunk semmit
  });
});