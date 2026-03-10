'use client';

import { useEffect } from 'react';

/**
 * Registers a minimal service worker (`/sw.js`) so that the app
 * satisfies the PWA requirement of having an active service worker.
 */
export function PWAServiceWorkerRegistration() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return;
    }

    navigator.serviceWorker
      .register('/sw.js')
      .catch((error) => {
        console.error('Failed to register service worker:', error);
      });
  }, []);

  return null;
}

