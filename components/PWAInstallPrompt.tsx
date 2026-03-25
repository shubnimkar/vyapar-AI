'use client';

/**
 * PWA Install Prompt Component
 * 
 * Displays a banner prompting users to install the PWA using the new design system.
 * Only shows when:
 * - App is not already installed
 * - Browser supports installation
 * - User hasn't dismissed the prompt recently
 * 
 * @see .kiro/specs/ui-ux-redesign/requirements.md - Requirement 17.1
 */

import { useState, useEffect } from 'react';
import { PWAInstallManager, isPWA } from '@/lib/pwa-utils';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Smartphone, X } from 'lucide-react';
import { cn } from '@/lib/design-system/utils';
import { t } from '@/lib/translations';
import { Language } from '@/lib/types';

const DISMISS_KEY = 'pwa-install-dismissed';
const DISMISS_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days

export default function PWAInstallPrompt() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [installManager] = useState(() => new PWAInstallManager());
  const [language, setLanguage] = useState<Language>('en');

  useEffect(() => {
    const storedLanguage =
      localStorage.getItem('vyapar-lang') ||
      localStorage.getItem('language') ||
      localStorage.getItem('vyapar-language');
    if (storedLanguage && ['en', 'hi', 'mr'].includes(storedLanguage)) {
      setLanguage(storedLanguage as Language);
      document.documentElement.lang = storedLanguage;
    }

    // Don't show if already installed
    if (isPWA()) {
      return;
    }

    // Check if user dismissed recently
    const dismissed = localStorage.getItem(DISMISS_KEY);
    if (dismissed) {
      const dismissedTime = parseInt(dismissed, 10);
      if (Date.now() - dismissedTime < DISMISS_DURATION) {
        return;
      }
    }

    // Listen for install availability
    installManager.onInstallAvailabilityChange((canInstall) => {
      setShowPrompt(canInstall);
    });
  }, [installManager]);

  const handleInstall = async () => {
    const result = await installManager.promptInstall();
    
    if (result === true) {
      // User accepted
      setShowPrompt(false);
    } else if (result === false) {
      // User declined
      handleDismiss();
    }
  };

  const handleDismiss = () => {
    localStorage.setItem(DISMISS_KEY, Date.now().toString());
    setShowPrompt(false);
  };

  if (!showPrompt) {
    return null;
  }

  return (
    <div
      className="fixed left-0 right-0 z-50 p-4 animate-in slide-in-from-bottom duration-base pointer-events-none"
      style={{ bottom: '0', paddingBottom: 'calc(16px + env(safe-area-inset-bottom))' }}
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      <Card
        elevation="elevated"
        className={cn(
          'max-w-md mx-auto',
          'bg-gradient-to-r from-primary-600 to-primary-700',
          'border-primary-500'
        )}
        // Allow interaction with buttons inside while the backdrop uses pointer-events-none.
        style={{ pointerEvents: 'auto' }}
      >
        <div className="flex items-center gap-4">
          {/* Icon */}
          <div className="flex-shrink-0">
            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center">
              <Smartphone className="w-6 h-6 text-primary-600" />
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-lg text-white mb-1">
              {t('ui.pwa.installTitle', language)}
            </h3>
            <p className="text-sm text-primary-100">
              {t('ui.pwa.installMessage', language)}
            </p>
          </div>

          {/* Actions */}
          <div className="flex-shrink-0 flex gap-2">
            <Button
              onClick={handleInstall}
              variant="secondary"
              size="md"
            >
              {t('ui.pwa.install', language)}
            </Button>
            <button
              onClick={handleDismiss}
              className={cn(
                'p-2 text-white hover:bg-white/10 rounded-2xl transition-colors',
                'min-w-[44px] min-h-[44px]',
                'focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-primary-600'
              )}
              aria-label={t('ui.pwa.later', language)}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      </Card>
    </div>
  );
}
