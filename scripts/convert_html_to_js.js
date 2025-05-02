// A-S-M-U/scripts/convert_html_to_js.js
const fs = require('fs');
const path = require('path');

// --- KONFIGURÁCIÓ ---
// Mivel a szkript a 'scripts' mappában van, a 'pages' és 'js' mappák
// egy szinttel feljebb (../) találhatók a projekt gyökerében.
const pagesInputFolderPath = path.join(__dirname, '../pages');
const outputFilePath = path.join(__dirname, '../js/pages-data.js');
// --- KONFIGURÁCIÓ VÉGE ---

const bookPageData = {};
let filesProcessed = 0;
let filesIncluded = 0;

console.log(`Adatkonverzió indul...`);
console.log(`Forrás mappa: ${pagesInputFolderPath}`);

try {
  const files = fs.readdirSync(pagesInputFolderPath);
  console.log(`${files.length} fájl található a forrás mappában.`);

  files.forEach(fileName => {
    filesProcessed++;
    const filePath = path.join(pagesInputFolderPath, fileName);
    const fileStats = fs.statSync(filePath); // Fájl statisztikák lekérése

    // Csak fájlokkal foglalkozunk (almappákat kihagyjuk), és csak .html-lel
    if (fileStats.isFile() && path.extname(fileName).toLowerCase() === '.html') {
      try {
        let pageId = '';
        const baseName = path.basename(fileName, '.html');

        if (baseName.toLowerCase() === 'borito') {
          pageId = 'borito';
        } else if (/^\d+$/.test(baseName)) { // Csak számokból áll (pl. '3.html')
          pageId = baseName;
        } else if (/^oldal-(\d+)$/i.test(baseName)) { // 'oldal-X.html' (kis/nagybetű mindegy)
           const match = baseName.match(/^oldal-(\d+)$/i);
           if (match && match[1]) pageId = match[1];
        } else if (/^(\d+)-fp$/i.test(baseName)) { // Pl. '1-FP.html' -> ID: '1-fp'
            pageId = baseName.toLowerCase();
        } else {
             pageId = baseName; // Egyéb esetekben a fájlnév kiterjesztés nélkül
             console.log(`-> Speciális fájlnév (${fileName}), ID-ként használva: '${pageId}'`);
        }

        if (pageId) {
          const htmlContent = fs.readFileSync(filePath, 'utf8');
          if (bookPageData.hasOwnProperty(pageId)) {
              console.warn(`  FIGYELEM: Duplikált oldal ID ('${pageId}') a '${fileName}' fájlnál! Felülírva az előzőt.`);
          }
          bookPageData[pageId] = htmlContent;
          filesIncluded++;
        } else {
            console.warn(`  FIGYELEM: Nem sikerült ID-t kinyerni a fájlnévből: ${fileName}. Kihagyva.`);
        }
      } catch (readError) {
        console.error(`  ❌ Hiba a(z) ${fileName} fájl olvasása közben:`, readError.message);
      }
    }
  });

  const outputContent = `// ----- pages-data.js -----
// Automatikusan generálva: ${new Date().toISOString()}
// Tartalmazza a könyv oldalainak HTML kódját.

const bookPageData = ${JSON.stringify(bookPageData, null, 2)};

// Globálissá tesszük, hogy más scriptek elérjék
if (typeof window !== 'undefined') {
  window.bookPageData = bookPageData;
}
`;

  fs.writeFileSync(outputFilePath, outputContent, 'utf8');

  console.log('\n------------------------------------');
  console.log('Adatkonverzió sikeresen befejezve!');
  console.log(`Feldolgozott fájlok: ${filesProcessed}`);
  console.log(`Belefoglalt oldalak (létrehozott ID-k): ${filesIncluded}`);
  console.log(`Kimeneti fájl: ${outputFilePath}`);
  console.log('------------------------------------');

} catch (error) {
  console.error('\n❌ Hiba történt a folyamat során:');
  if (error.code === 'ENOENT' && error.path === pagesInputFolderPath) {
      console.error(`  Nem található a forrás mappa! Ellenőrizd a 'pagesInputFolderPath' elérési utat a szkriptben.`);
      console.error(`  Abszolút elérési út, amit kerestem: ${pagesInputFolderPath}`);
  } else {
      console.error('  Hiba részletei:', error);
  }
  process.exit(1);
}