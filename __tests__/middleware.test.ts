/**
 * Integration tests for security headers middleware
 * 
 * Property 8: Security Headers Presence
 * Validates: Requirements 6.1, 6.2, 6.3, 6.4
 */

import { NextRequest } from 'next/server';
import { middleware } from '../middleware';

describe('Security Headers Middleware', () => {
  describe('Property 8: Security Headers Presence', () => {
    test('should add all required security headers to response', () => {
      // Create a mock request
      const request = new NextRequest('http://localhost:3000/api/test');
      
      // Execute middleware
      const response = middleware(request);
      
      // Verify all required headers are present
      expect(response.headers.has('Content-Security-Policy')).toBe(true);
      expect(response.headers.has('X-Frame-Options')).toBe(true);
      expect(response.headers.has('X-Content-Type-Options')).toBe(true);
      expect(response.headers.has('Referrer-Policy')).toBe(true);
    });

    test('should set Content-Security-Policy with correct directives', () => {
      const request = new NextRequest('http://localhost:3000/api/test');
      const response = middleware(request);
      
      const csp = response.headers.get('Content-Security-Policy');
      
      // Verify CSP contains all required directives
      expect(csp).toContain("default-src 'self'");
      expect(csp).toContain("script-src 'self' 'unsafe-inline' 'unsafe-eval'");
      expect(csp).toContain("style-src 'self' 'unsafe-inline'");
      expect(csp).toContain("img-src 'self' data: https:");
      expect(csp).toContain("connect-src 'self' https://bedrock-runtime.*.amazonaws.com");
    });

    test('should set X-Frame-Options to DENY', () => {
      const request = new NextRequest('http://localhost:3000/api/test');
      const response = middleware(request);
      
      expect(response.headers.get('X-Frame-Options')).toBe('DENY');
    });

    test('should set X-Content-Type-Options to nosniff', () => {
      const request = new NextRequest('http://localhost:3000/api/test');
      const response = middleware(request);
      
      expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
    });

    test('should set Referrer-Policy to strict-origin-when-cross-origin', () => {
      const request = new NextRequest('http://localhost:3000/api/test');
      const response = middleware(request);
      
      expect(response.headers.get('Referrer-Policy')).toBe('strict-origin-when-cross-origin');
    });
  });

  describe('Middleware Application', () => {
    test('should apply to API routes', () => {
      const request = new NextRequest('http://localhost:3000/api/analyze');
      const response = middleware(request);
      
      // Verify headers are present
      expect(response.headers.has('Content-Security-Policy')).toBe(true);
    });

    test('should apply to page routes', () => {
      const request = new NextRequest('http://localhost:3000/dashboard');
      const response = middleware(request);
      
      // Verify headers are present
      expect(response.headers.has('Content-Security-Policy')).toBe(true);
    });

    test('should apply to nested routes', () => {
      const request = new NextRequest('http://localhost:3000/api/profile/setup');
      const response = middleware(request);
      
      // Verify headers are present
      expect(response.headers.has('Content-Security-Policy')).toBe(true);
    });
  });

  describe('Header Consistency', () => {
    test('should apply same headers to all routes', () => {
      const routes = [
        'http://localhost:3000/api/analyze',
        'http://localhost:3000/api/daily',
        'http://localhost:3000/dashboard',
        'http://localhost:3000/profile'
      ];

      const responses = routes.map(url => {
        const request = new NextRequest(url);
        return middleware(request);
      });

      // Verify all responses have identical security headers
      const firstCsp = responses[0].headers.get('Content-Security-Policy');
      const firstXFrame = responses[0].headers.get('X-Frame-Options');
      const firstXContent = responses[0].headers.get('X-Content-Type-Options');
      const firstReferrer = responses[0].headers.get('Referrer-Policy');

      responses.forEach(response => {
        expect(response.headers.get('Content-Security-Policy')).toBe(firstCsp);
        expect(response.headers.get('X-Frame-Options')).toBe(firstXFrame);
        expect(response.headers.get('X-Content-Type-Options')).toBe(firstXContent);
        expect(response.headers.get('Referrer-Policy')).toBe(firstReferrer);
      });
    });
  });

  describe('CSP Directive Validation', () => {
    test('should allow connections to AWS Bedrock', () => {
      const request = new NextRequest('http://localhost:3000/api/analyze');
      const response = middleware(request);
      
      const csp = response.headers.get('Content-Security-Policy');
      
      // Verify Bedrock connection is allowed
      expect(csp).toContain('https://bedrock-runtime.*.amazonaws.com');
    });

    test('should restrict default sources to self', () => {
      const request = new NextRequest('http://localhost:3000/api/test');
      const response = middleware(request);
      
      const csp = response.headers.get('Content-Security-Policy');
      
      // Verify default-src is restricted
      expect(csp).toContain("default-src 'self'");
    });

    test('should allow inline scripts and styles for Next.js', () => {
      const request = new NextRequest('http://localhost:3000/');
      const response = middleware(request);
      
      const csp = response.headers.get('Content-Security-Policy');
      
      // Verify inline scripts and styles are allowed (required for Next.js)
      expect(csp).toContain("'unsafe-inline'");
      expect(csp).toContain("'unsafe-eval'");
    });

    test('should allow data URIs and HTTPS images', () => {
      const request = new NextRequest('http://localhost:3000/');
      const response = middleware(request);
      
      const csp = response.headers.get('Content-Security-Policy');
      
      // Verify image sources include data URIs and HTTPS
      expect(csp).toContain("img-src 'self' data: https:");
    });
  });
});
