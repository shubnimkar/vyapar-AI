'use client';

/**
 * Offline Fallback Page
 * 
 * Displayed when the user is offline and tries to access a page that's not cached.
 * Provides a friendly message and shows cached content options using the new design system.
 * 
 * @see .kiro/specs/ui-ux-redesign/requirements.md - Requirement 17.5
 */

import { useRouter } from 'next/navigation';
import { ErrorState } from '@/components/ui/ErrorState';
import { Card, CardBody } from '@/components/ui/Card';
import { WifiOff, CheckCircle } from 'lucide-react';
import { t } from '@/lib/translations';
import { Language } from '@/lib/types';
import { useState, useEffect } from 'react';

export default function OfflinePage() {
  const router = useRouter();
  const [language, setLanguage] = useState<Language>('en');

  useEffect(() => {
    // Get language from localStorage
    const storedLanguage =
      localStorage.getItem('vyapar-lang') ||
      localStorage.getItem('language') ||
      localStorage.getItem('vyapar-language');

    if (storedLanguage && ['en', 'hi', 'mr'].includes(storedLanguage)) {
      setLanguage(storedLanguage as Language);
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  return (
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-6">
        {/* Main error state */}
        <ErrorState
          title={t('ui.pwa.offlineTitle', language)}
          message={t('ui.pwa.offlineMessage', language)}
          action={{
            label: t('ui.button.tryAgain', language),
            onClick: () => window.location.reload(),
          }}
          secondaryAction={{
            label: t('ui.pwa.goToDashboard', language),
            onClick: () => router.push('/'),
          }}
        />

        {/* Features Available Offline */}
        <Card elevation="raised">
          <CardBody>
            <h2 className="text-sm font-semibold text-neutral-900 mb-3 flex items-center gap-2">
              <WifiOff className="w-4 h-4 text-neutral-500" />
              {t('ui.pwa.offlineFeatures', language)}
            </h2>
            <ul className="space-y-2">
              <li className="flex items-start gap-2 text-sm text-neutral-700">
                <CheckCircle className="w-4 h-4 text-success-600 flex-shrink-0 mt-0.5" />
                <span>{t('offline.viewCachedEntries', language)}</span>
              </li>
              <li className="flex items-start gap-2 text-sm text-neutral-700">
                <CheckCircle className="w-4 h-4 text-success-600 flex-shrink-0 mt-0.5" />
                <span>{t('offline.addNewEntries', language)}</span>
              </li>
              <li className="flex items-start gap-2 text-sm text-neutral-700">
                <CheckCircle className="w-4 h-4 text-success-600 flex-shrink-0 mt-0.5" />
                <span>{t('offline.viewHealthScore', language)}</span>
              </li>
              <li className="flex items-start gap-2 text-sm text-neutral-700">
                <CheckCircle className="w-4 h-4 text-success-600 flex-shrink-0 mt-0.5" />
                <span>{t('offline.manageCredit', language)}</span>
              </li>
            </ul>
          </CardBody>
        </Card>

        {/* Connection Status */}
        <Card elevation="flat" className="bg-info-50 border-info-200">
          <CardBody className="text-center">
            <p className="text-xs text-info-700">
              {t('offline.autoSyncMessage', language)}
            </p>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

