import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Vyapar AI - Smart Business Assistant',
    short_name: 'Vyapar AI',
    description:
      'AI-powered financial health tracking for small businesses. Track daily entries, manage credit, and get personalized insights.',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#2563eb',
    orientation: 'portrait-primary',
    scope: '/',
    lang: 'en-IN',
    dir: 'ltr',
    categories: ['business', 'finance', 'productivity'],
    icons: [
      { src: '/icons/icon-72x72.svg', sizes: '72x72', type: 'image/svg+xml' },
      { src: '/icons/icon-96x96.svg', sizes: '96x96', type: 'image/svg+xml' },
      { src: '/icons/icon-128x128.svg', sizes: '128x128', type: 'image/svg+xml' },
      { src: '/icons/icon-144x144.svg', sizes: '144x144', type: 'image/svg+xml' },
      { src: '/icons/icon-152x152.png?v=1.1.0', sizes: '152x152', type: 'image/png' },
      { src: '/icons/icon-192x192.png?v=1.1.0', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-192x192.png?v=1.1.0', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
      { src: '/icons/icon-384x384.svg', sizes: '384x384', type: 'image/svg+xml' },
      { src: '/icons/icon-512x512.png?v=1.1.0', sizes: '512x512', type: 'image/png' },
      { src: '/icons/icon-512x512.png?v=1.1.0', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    shortcuts: [
      {
        name: 'Add Daily Entry',
        short_name: 'Add Entry',
        description: 'Quickly add a new daily entry',
        url: '/?action=add-entry',
        icons: [
          {
            src: '/icons/shortcut-add.svg',
            sizes: '96x96',
            type: 'image/svg+xml',
          },
        ],
      },
      {
        name: 'View Health Score',
        short_name: 'Health',
        description: 'Check your financial health score',
        url: '/?action=health-score',
        icons: [
          {
            src: '/icons/shortcut-health.svg',
            sizes: '96x96',
            type: 'image/svg+xml',
          },
        ],
      },
      {
        name: 'Credit Follow-ups',
        short_name: 'Credits',
        description: 'View overdue credit follow-ups',
        url: '/?action=credits',
        icons: [
          {
            src: '/icons/shortcut-credit.svg',
            sizes: '96x96',
            type: 'image/svg+xml',
          },
        ],
      },
    ],
    related_applications: [],
    prefer_related_applications: false,
  };
}

