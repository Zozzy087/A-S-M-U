import { createEdgeConfigClient } from '@vercel/edge-config';

export default async function handler(req, res) {
  const { token, email } = req.query;
  
  // AZONNALI MEGOLDÁS: Hardcoded adatok a gyors teszteléshez
  const validUsers = {
    'zozzy': 'lughlleu@gmail.com'
  };
  
  // Ellenőrzés a hardcoded adatokkal
  if (!token || !email || validUsers[token] !== email) {
    return res.status(403).send('Érvénytelen belépési adatok');
  }
  
  // Beállítjuk a cookie-kat a bejelentkezéshez
  res.setHeader('Set-Cookie', [
    `auth_token=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=31536000`,
    `auth_email=${email}; Path=/; HttpOnly; SameSite=Strict; Max-Age=31536000`
  ]);
  
  // Sikeres belépés - átirányítás az alkalmazásra
  return res.redirect(307, '/app/');
}