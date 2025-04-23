import { createEdgeConfigClient } from '@vercel/edge-config';

export default async function handler(req, res) {
  const { token, email } = req.query;
  
  if (!token || !email) {
    return res.status(400).send('Hiányzó token vagy email');
  }
  
  try {
    // Edge Config kliens létrehozása
    const edgeConfig = createEdgeConfigClient(process.env.EDGE_CONFIG);
    
    // JAVÍTÁS: Helyes kulcsformátum használata
    const userData = await edgeConfig.get(`user_${token}`);
    
    // Ha nincs ilyen token vagy az email nem egyezik
    if (!userData || userData.email !== email) {
      return res.status(403).send('Érvénytelen belépési adatok');
    }
    
    // Beállítjuk a cookie-kat a bejelentkezéshez
    res.setHeader('Set-Cookie', [
      `auth_token=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=31536000`,
      `auth_email=${email}; Path=/; HttpOnly; SameSite=Strict; Max-Age=31536000`
    ]);
    
    // Sikeres belépés - átirányítás az alkalmazásra
    return res.redirect(307, '/app/');
  } catch (error) {
    console.error('Edge Config error:', error);
    return res.status(500).send('Szerver hiba történt: ' + error.message);
  }
}