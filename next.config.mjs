/** @type {import('next').NextConfig} */
import withPWA from 'next-pwa';

const nextConfig = {
  reactStrictMode: true,
  // Disable x-powered-by header for security
  poweredByHeader: false,
  // Enable Turbopack explicitly
  turbopack: {},
  // Raise body size limit for App Router API routes.
  // Default is 4MB which is smaller than typical Android camera photos.
  // This must be set here (next.config) for App Router — not in route.ts.
  experimental: {
    serverActions: {
      bodySizeLimit: '50mb',
    },
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value:
              "default-src 'self'; " +
              "style-src 'self' https://fonts.googleapis.com; " +
              "font-src 'self' https://fonts.gstatic.com; "
          },
        ],
      },
    ];
  },
};

const pwaConfig = withPWA({
  dest: 'public',
  register: true, // Auto-register service worker
  skipWaiting: true,
  cacheOnFrontEndNav: true,
  // Offline fallback page - Workbox will serve /offline when a navigation fails offline
  navigateFallback: '/offline',
  navigateFallbackDenylist: [/^\/api/, /\\.png$/, /\\.jpg$/, /\\.jpeg$/],
  // Workbox options
  runtimeCaching: [
    {
      urlPattern: /^https:\/\/fonts\.(?:gstatic|googleapis)\.com\/.*/i,
      handler: 'CacheFirst',
      options: {
        cacheName: 'google-fonts',
        expiration: {
          maxEntries: 4,
          maxAgeSeconds: 365 * 24 * 60 * 60, // 1 year
        },
      },
    },
    {
      urlPattern: /^https:\/\/.*\.(?:png|jpg|jpeg|svg|gif|webp)$/i,
      handler: 'CacheFirst',
      options: {
        cacheName: 'image-cache',
        expiration: {
          maxEntries: 64,
          maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
        },
      },
    },
    {
      urlPattern: /\/api\/(?!auth|upload|receipt-ocr|voice-entry).*/i,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'api-cache',
        networkTimeoutSeconds: 10,
        expiration: {
          maxEntries: 50,
          maxAgeSeconds: 5 * 60, // 5 minutes
        },
      },
    },
    {
      urlPattern: /\/_next\/static\/.*/i,
      handler: 'CacheFirst',
      options: {
        cacheName: 'next-static',
        expiration: {
          maxEntries: 64,
          maxAgeSeconds: 365 * 24 * 60 * 60, // 1 year
        },
      },
    },
  ],
});

export default pwaConfig(nextConfig);
