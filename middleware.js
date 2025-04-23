import { NextResponse } from 'next/server';
import { createEdgeConfigClient } from '@vercel/edge-config';

export default async function middleware(request) {
  // Az URL ellenőrzése
  const url = new URL(request.url);
  
  // Ha az app mappához próbálnak hozzáférni
  if (url.pathname.startsWith('/app/')) {
    // Cookie-k keresése
    const token = request.cookies.get('auth_token')?.value;
    const email = request.cookies.get('auth_email')?.value;
    
    // Ha nincsenek cookie-k, átirányítás a bejelentkezési oldalra
    if (!token || !email) {
      return NextResponse.redirect(new URL('/', request.url));
    }
    
    try {
      // Edge Config kliens létrehozása
      const edgeConfig = createEdgeConfigClient(process.env.EDGE_CONFIG);
      
      // Token ellenőrzése
      const userData = await edgeConfig.get(`user:${token}`);
      
      // Ha nincs ilyen token vagy az email nem egyezik
      if (!userData || userData.email !== email) {
        return NextResponse.redirect(new URL('/', request.url));
      }
    } catch (error) {
      // Hiba esetén átirányítás a bejelentkezési oldalra
      return NextResponse.redirect(new URL('/', request.url));
    }
  }
  
  // Ha minden rendben, folytatás
  return NextResponse.next();
}

// Meghatározzuk, hogy mely útvonalakon fusson a middleware
export const config = {
  matcher: ['/app/:path*']
};