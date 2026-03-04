import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Security headers middleware
 * 
 * Adds security headers to all responses to protect against common web vulnerabilities
 */
export function middleware(request: NextRequest) {
  const response = NextResponse.next();
  
  // Content Security Policy
  // Restricts sources for scripts, styles, images, and connections
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "connect-src 'self' https://bedrock-runtime.*.amazonaws.com"
  ].join('; ');
  
  response.headers.set('Content-Security-Policy', csp);
  
  // Prevent clickjacking attacks by disallowing the page to be embedded in frames
  response.headers.set('X-Frame-Options', 'DENY');
  
  // Prevent MIME type sniffing which could lead to security vulnerabilities
  response.headers.set('X-Content-Type-Options', 'nosniff');
  
  // Control how much referrer information is sent with requests
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  return response;
}

/**
 * Configure middleware to apply to all routes except static files
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico (favicon)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
