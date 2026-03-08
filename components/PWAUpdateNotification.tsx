'use client';

/**
 * PWA Update Notification Component
 * 
 * Displays a notification when a new version of the PWA is available.
 * Prompts the user to reload to get the latest version.
 * 
 * @see .kiro/specs/ui-ux-redesign/requirements.md - Requirement 17.2
 */

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { RefreshCw, X } from 'lucide-react';
import { cn } from '@/lib/design-system/utils';

export default function PWAUpdateNotification() {
  const [showUpdate, setShowUpdate] = useState(false);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
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

    // Listen for controller change (when new SW takes over)
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      // Reload the page to get the new version
      window.location.reload();
    });
  }, []);

  const handleUpdate = () => {
    if (registration && registration.waiting) {
      // Tell the waiting service worker to skip waiting and become active
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
    }
  };

  const handleDismiss = () => {
    setShowUpdate(false);
  };

  if (!showUpdate) {
    return null;
  }

  return (
    <div className="fixed top-20 right-4 z-50 animate-in slide-in-from-top duration-base">
      <Card
        elevation="elevated"
        className={cn(
          'max-w-sm',
          'bg-info-50 border-info-200'
        )}
      >
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div className="flex-shrink-0">
            <div className="w-10 h-10 bg-info-100 rounded-lg flex items-center justify-center">
              <RefreshCw className="w-5 h-5 text-info-600" />
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm text-info-900 mb-1">
              Update Available
            </h3>
            <p className="text-xs text-info-700 mb-3">
              A new version of Vyapar AI is ready. Update now to get the latest features and improvements.
            </p>
            
            {/* Actions */}
            <div className="flex gap-2">
              <Button
                onClick={handleUpdate}
                variant="primary"
                size="sm"
                icon={<RefreshCw className="w-4 h-4" />}
              >
                Update Now
              </Button>
              <Button
                onClick={handleDismiss}
                variant="ghost"
                size="sm"
              >
                Later
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
            aria-label="Dismiss update notification"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </Card>
    </div>
  );
}
