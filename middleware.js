export default async function middleware(request) {
  const url = new URL(request.url);
  
  if (url.pathname.startsWith('/app/')) {
    // Cookie-k keresése
    const cookies = request.headers.get('cookie') || '';
    const tokenMatch = cookies.match(/auth_token=([^;]+)/);
    const emailMatch = cookies.match(/auth_email=([^;]+)/);
    
    const token = tokenMatch ? tokenMatch[1] : null;
    const email = emailMatch ? emailMatch[1] : null;
    
    // AZONNALI MEGOLDÁS: Hardcoded adatok a gyors teszteléshez
    const validUsers = {
      'zozzy': 'lughlleu@gmail.com'
    };
    
    // Ha nincsenek cookie-k vagy érvénytelenek
    if (!token || !email || validUsers[token] !== email) {
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