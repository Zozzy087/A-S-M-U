// middleware.js
import { createEdgeConfigClient } from '@vercel/edge-config';

export default async function middleware(request) {
  const url = new URL(request.url);
  
  if (url.pathname.startsWith('/app/')) {
    // Cookie-k keresése
    const cookies = request.headers.get('cookie') || '';
    const tokenMatch = cookies.match(/auth_token=([^;]+)/);
    const emailMatch = cookies.match(/auth_email=([^;]+)/);
    
    const token = tokenMatch ? tokenMatch[1] : null;
    const email = emailMatch ? emailMatch[1] : null;
    
    // Ha nincsenek cookie-k, átirányítás a bejelentkezési oldalra
    if (!token || !email) {
      return new Response(null, {
        status: 302,
        headers: { Location: '/' }
      });
    }
    
    try {
      // Edge Config kliens létrehozása
      const edgeConfig = createEdgeConfigClient(process.env.EDGE_CONFIG);
      
      // Token ellenőrzése
      const userData = await edgeConfig.get(`user:${token}`);
      
      // Ha nincs ilyen token vagy az email nem egyezik
      if (!userData || userData.email !== email) {
        return new Response(null, {
          status: 302,
          headers: { Location: '/' }
        });
      }
    } catch (error) {
      // Hiba esetén átirányítás a bejelentkezési oldalra
      return new Response(null, {
        status: 302,
        headers: { Location: '/' }
      });
    }
  }
  
  // Ha minden rendben, folytatás
  return fetch(request);
}

export const config = {
  matcher: ['/app/:path*']
};