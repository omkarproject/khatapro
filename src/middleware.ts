import { NextRequest, NextResponse } from 'next/server';

const PUBLIC_EXACT_PATHS = [
  '/login',
  '/pricing',
  '/contact-us',
  '/privacy-policy',
  '/terms-and-conditions',
  '/refund-and-cancellation',
];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 1. Always allow API routes, Next.js internal files, and static files
  if (
    pathname.startsWith('/api') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/static') ||
    pathname.includes('.') // favicon.ico, images, fonts, robots.txt, etc.
  ) {
    return NextResponse.next();
  }

  // 2. Allow public pay routes (for customers scanning QR or paying invoices)
  if (pathname.startsWith('/pay')) {
    return NextResponse.next();
  }

  // 3. Allow public informational pages
  if (PUBLIC_EXACT_PATHS.includes(pathname)) {
    const authSession = req.cookies.get('skp_auth_session')?.value;
    // If user is already authenticated and visits /login, redirect to dashboard
    if (pathname === '/login' && authSession) {
      return NextResponse.redirect(new URL('/', req.url));
    }
    return NextResponse.next();
  }

  // 4. Protected routes: Check session cookie
  const authSession = req.cookies.get('skp_auth_session')?.value;
  if (!authSession) {
    // Redirect unauthenticated user directly to /login
    const loginUrl = new URL('/login', req.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
