import { createEdgeConfigClient } from '@vercel/edge-config';

export default async function handler(req, res) {
  // Csak POST kéréseket fogadunk
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }
  
  // Admin jelszó ellenőrzése
  const { adminPassword, token, email, name } = req.body;
  
  if (adminPassword !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Érvénytelen admin jelszó' });
  }
  
  try {
    // Edge Config kliens létrehozása
    const edgeConfig = createEdgeConfigClient(process.env.EDGE_CONFIG);
    
    // Token létrehozása
    await edgeConfig.set(`user:${token}`, {
      email,
      name,
      createdAt: Date.now()
    });
    
    return res.status(200).json({ success: true, message: `Token létrehozva: ${token}` });
  } catch (error) {
    console.error('Edge Config error:', error);
    return res.status(500).json({ error: 'Szerver hiba történt' });
  }
}