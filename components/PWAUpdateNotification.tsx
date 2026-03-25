'use client';

/**
 * PWA Update Notification Component
 * 
 * Displays a notification when a new version of the PWA is available.
 * Prompts the user to reload to get the latest version.
 * 
 * @see .kiro/specs/ui-ux-redesign/requirements.md - Requirement 17.2
 */

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { RefreshCw, X } from 'lucide-react';
import { cn } from '@/lib/design-system/utils';
import { t } from '@/lib/translations';
import { type Language } from '@/lib/types';

export default function PWAUpdateNotification() {
  const [showUpdate, setShowUpdate] = useState(false);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);
  const [language, setLanguage] = useState<Language>('en');
  const shouldReloadRef = useRef(false);

  useEffect(() => {
    const storedLanguage =
      localStorage.getItem('vyapar-lang') ||
      localStorage.getItem('language') ||
      localStorage.getItem('vyapar-language');
    if (storedLanguage && ['en', 'hi', 'mr'].includes(storedLanguage)) {
      setLanguage(storedLanguage as Language);
    }

    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return;
    }

    // Listen for service worker updates
    navigator.serviceWorker.ready.then((reg) => {
      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing;
        
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New service worker is installed and waiting
              setRegistration(reg);
              setShowUpdate(true);
            }
          });
        }
      });
    });

    // Listen for controller change (when new SW takes over).
    // Only reload when the user explicitly chose "Update Now".
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (shouldReloadRef.current) {
        window.location.reload();
      }
    });
  }, []);

  const handleUpdate = () => {
    if (registration && registration.waiting) {
      shouldReloadRef.current = true;
      // Tell the waiting service worker to skip waiting and become active
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
    }
  };

  const handleDismiss = () => {
    shouldReloadRef.current = false;
    setShowUpdate(false);
  };

  if (!showUpdate) {
    return null;
  }

  return (
    <div
      className="fixed left-1/2 top-4 z-50 -translate-x-1/2 animate-in slide-in-from-top duration-base pointer-events-none"
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      <Card
        elevation="elevated"
        className={cn(
          'max-w-sm',
          'bg-info-50 border-info-200'
        )}
        style={{ pointerEvents: 'auto' }}
      >
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div className="flex-shrink-0">
            <div className="w-10 h-10 bg-info-100 rounded-2xl flex items-center justify-center">
              <RefreshCw className="w-5 h-5 text-info-600" />
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm text-info-900 mb-1">
              {t('ui.pwa.updateAvailable', language)}
            </h3>
            <p className="text-xs text-info-700 mb-3">
              {t('ui.pwa.updateMessage', language)}
            </p>
            
            {/* Actions */}
            <div className="flex gap-2">
              <Button
                onClick={handleUpdate}
                variant="primary"
                size="sm"
                icon={<RefreshCw className="w-4 h-4" />}
              >
                {t('ui.pwa.updateNow', language)}
              </Button>
              <Button
                onClick={handleDismiss}
                variant="ghost"
                size="sm"
              >
                {t('ui.pwa.later', language)}
              </Button>
            </div>
          </div>

          {/* Close button */}
          <button
            onClick={handleDismiss}
            className={cn(
              'flex-shrink-0 p-1 text-info-600 hover:bg-info-100 rounded transition-colors',
              'focus:outline-none focus:ring-2 focus:ring-info-500 focus:ring-offset-2'
            )}
            aria-label={t('ui.pwa.later', language)}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </Card>
    </div>
  );
}
