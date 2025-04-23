export default function handler(req, res) {
  const { token, email } = req.query;
  
  // Itt tárold a token-email párokat
  const validUsers = {
    'zozzy': 'lughlleu@gmail.com',
    'abc456': 'vasarlo2@gmail.com',
    // További felhasználók...
  };
  
  // Ellenőrzés - létezik a token és a hozzá tartozó email egyezik
  if (!token || !email || validUsers[token] !== email) {
    return res.status(403).send('Érvénytelen belépési adatok');
  }
  
  // Sikeres belépés
  return res.redirect(307, '/app/');
}