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
      className="fixed left-0 right-0 bottom-0 z-50 p-4 animate-in slide-in-from-bottom duration-base"
      style={{ paddingBottom: 'calc(16px + env(safe-area-inset-bottom))' }}
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      <div className="mx-auto w-full max-w-xl">
        <div
          className={cn(
            'bg-gradient-to-r from-primary-600 to-primary-700 border border-primary-500',
            'rounded-t-3xl overflow-hidden shadow-lg'
          )}
        >
          {/* Drag handle (visual affordance) */}
          <div className="h-2 bg-white/25 mx-auto w-12 rounded-full mt-2 mb-4" aria-hidden="true" />

          <div className="px-4 pb-4">
            <div className="flex items-start gap-4">
              {/* Icon */}
              <div className="flex-shrink-0 mt-1">
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

              {/* Dismiss */}
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

            {/* Actions: WhatsApp-like stacked CTA */}
            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
              <Button onClick={handleInstall} variant="secondary" size="md" fullWidth>
                {t('ui.pwa.install', language)}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
