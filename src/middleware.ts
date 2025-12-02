import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Next.js Middleware
 * Rate limiting disabled for development - re-enable for production
 */
export function middleware(request: NextRequest) {
  return NextResponse.next();
}

/**
 * Configure which routes the middleware should run on
 */
export const config = {
  matcher: [
    // Match all API routes except static files
    '/api/:path*',
  ],
};
