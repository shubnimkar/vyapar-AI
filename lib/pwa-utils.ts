/**
 * PWA Utilities
 * 
 * Helper functions for Progressive Web App features including:
 * - Install prompt handling
 * - Online/offline detection
 * - Service worker registration
 * - Update notifications
 */

/**
 * Check if the app is running as a PWA (installed)
 */
export function isPWA(): boolean {
  if (typeof window === 'undefined') return false;
  
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true ||
    document.referrer.includes('android-app://')
  );
}

/**
 * Check if the browser supports PWA installation
 */
export function canInstallPWA(): boolean {
  if (typeof window === 'undefined') return false;
  
  return 'BeforeInstallPromptEvent' in window;
}

/**
 * Get the current online/offline status
 */
export function isOnline(): boolean {
  if (typeof window === 'undefined') return true;
  
  return navigator.onLine;
}

/**
 * Register online/offline event listeners
 */
export function registerConnectivityListeners(
  onOnline: () => void,
  onOffline: () => void
): () => void {
  if (typeof window === 'undefined') {
    return () => {};
  }

  window.addEventListener('online', onOnline);
  window.addEventListener('offline', onOffline);

  // Return cleanup function
  return () => {
    window.removeEventListener('online', onOnline);
    window.removeEventListener('offline', onOffline);
  };
}

/**
 * PWA Install Prompt Manager
 */
export class PWAInstallManager {
  private deferredPrompt: any = null;
  private installCallback: ((canInstall: boolean) => void) | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.init();
    }
  }

  private init() {
    window.addEventListener('beforeinstallprompt', (e) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later
      this.deferredPrompt = e;
      // Notify that install is available
      if (this.installCallback) {
        this.installCallback(true);
      }
    });

    window.addEventListener('appinstalled', () => {
      // Clear the deferredPrompt
      this.deferredPrompt = null;
      // Notify that app was installed
      if (this.installCallback) {
        this.installCallback(false);
      }
    });
  }

  /**
   * Set callback for install availability changes
   */
  onInstallAvailabilityChange(callback: (canInstall: boolean) => void) {
    this.installCallback = callback;
    // Immediately call with current state
    callback(this.canInstall());
  }

  /**
   * Check if install prompt is available
   */
  canInstall(): boolean {
    return this.deferredPrompt !== null;
  }

  /**
   * Show the install prompt
   * Returns true if user accepted, false if declined, null if prompt not available
   */
  async promptInstall(): Promise<boolean | null> {
    if (!this.deferredPrompt) {
      return null;
    }

    // Show the install prompt
    this.deferredPrompt.prompt();

    // Wait for the user to respond to the prompt
    const { outcome } = await this.deferredPrompt.userChoice;

    // Clear the deferredPrompt
    this.deferredPrompt = null;

    // Notify callback
    if (this.installCallback) {
      this.installCallback(false);
    }

    return outcome === 'accepted';
  }
}

/**
 * Service Worker Update Manager
 */
export class ServiceWorkerUpdateManager {
  private registration: ServiceWorkerRegistration | null = null;
  private updateCallback: (() => void) | null = null;

  constructor() {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      this.init();
    }
  }

  private async init() {
    try {
      // Get the service worker registration
      this.registration = await navigator.serviceWorker.ready;

      // Check for updates every hour
      setInterval(() => {
        this.checkForUpdates();
      }, 60 * 60 * 1000);

      // Listen for controlling service worker changes
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (this.updateCallback) {
          this.updateCallback();
        }
      });
    } catch (error) {
      console.error('Failed to initialize service worker update manager:', error);
    }
  }

  /**
   * Set callback for when an update is available
   */
  onUpdateAvailable(callback: () => void) {
    this.updateCallback = callback;
  }

  /**
   * Manually check for service worker updates
   */
  async checkForUpdates(): Promise<boolean> {
    if (!this.registration) {
      return false;
    }

    try {
      await this.registration.update();
      return true;
    } catch (error) {
      console.error('Failed to check for updates:', error);
      return false;
    }
  }

  /**
   * Apply the pending update (reload the page)
   */
  applyUpdate() {
    window.location.reload();
  }
}

/**
 * Get PWA display mode
 */
export function getPWADisplayMode(): 'browser' | 'standalone' | 'minimal-ui' | 'fullscreen' {
  if (typeof window === 'undefined') return 'browser';

  const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
  if (isStandalone) return 'standalone';

  const isMinimalUI = window.matchMedia('(display-mode: minimal-ui)').matches;
  if (isMinimalUI) return 'minimal-ui';

  const isFullscreen = window.matchMedia('(display-mode: fullscreen)').matches;
  if (isFullscreen) return 'fullscreen';

  return 'browser';
}

/**
 * Share content using Web Share API (if available)
 */
export async function shareContent(data: {
  title?: string;
  text?: string;
  url?: string;
}): Promise<boolean> {
  if (typeof navigator === 'undefined' || !navigator.share) {
    return false;
  }

  try {
    await navigator.share(data);
    return true;
  } catch (error) {
    // User cancelled or share failed
    return false;
  }
}

/**
 * Check if Web Share API is available
 */
export function canShare(): boolean {
  return typeof navigator !== 'undefined' && 'share' in navigator;
}
