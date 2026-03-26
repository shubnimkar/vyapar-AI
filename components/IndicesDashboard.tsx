'use client';

/**
 * Indices Dashboard Component
 * 
 * Combined dashboard displaying stress index and affordability planner.
 * Handles API calls to calculate and explain indices.
 * Implements responsive layout and sync status indicators.
 */

import React, { useState, useEffect } from 'react';
import StressIndexDisplay from './StressIndexDisplay';
import AffordabilityPlanner from './AffordabilityPlanner';
import type {
  IndexData,
  AffordabilityIndexResult,
  Language,
  UserProfile,
} from '@/lib/types';
import { t } from '@/lib/translations';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Spinner } from './ui/Spinner';
import { ErrorState } from './ui/ErrorState';
import { Badge } from './ui/Badge';

interface IndicesDashboardProps {
  userId: string;
  userProfile: UserProfile;
  language: Language;
}

type SyncStatus = 'online' | 'offline' | 'syncing';

export default function IndicesDashboard({
  userId,
  userProfile,
  language,
}: IndicesDashboardProps) {
  const [indexData, setIndexData] = useState<IndexData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('online');
  const [explanations, setExplanations] = useState<Record<string, string>>({});
  const [isExplaining, setIsExplaining] = useState(false);

  // Clear cached explanations when the underlying stress score changes
  useEffect(() => {
    if (indexData?.stressIndex?.score !== undefined) {
      setExplanations({});
    }
  }, [indexData?.stressIndex?.score]);

  /**
   * Load latest indices on mount
   */
  useEffect(() => {
    loadLatestIndices();
    
    // Monitor online/offline status
    const handleOnline = () => setSyncStatus('online');
    const handleOffline = () => setSyncStatus('offline');
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Set initial status
    setSyncStatus(navigator.onLine ? 'online' : 'offline');
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [userId]);

  /**
   * Load latest indices from API
   */
  const loadLatestIndices = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/indices/latest?userId=${userId}`);
      const data = await response.json();

      if (data.success && data.data) {
        setIndexData(data.data);
      } else if (response.status === 404) {
        // No indices yet - need to calculate
        await calculateIndices();
      } else {
        // Check error code to determine message
        // Handle both INSUFFICIENT_DATA (new) and INVALID_INPUT with insufficientData message (old)
        const errorMsg = data.message || data.error || '';
        if (
          data.code === 'INSUFFICIENT_DATA' ||
          (data.code === 'INVALID_INPUT' && errorMsg.includes('insufficientData'))
        ) {
          setError('INSUFFICIENT_DATA');  // Special marker
        } else {
          // For other errors, translate if it's a translation key
          const finalErrorMsg = errorMsg || 'indices.error';
          setError(
            finalErrorMsg.startsWith('errors.') || finalErrorMsg.startsWith('indices.')
              ? t(finalErrorMsg, language)
              : finalErrorMsg
          );
        }
      }
    } catch (err) {
      setError(t('indices.error', language));
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Calculate indices (stress only, no planned cost)
   */
  const calculateIndices = async () => {
    setSyncStatus('syncing');
    setError(null);

    try {
      const response = await fetch('/api/indices/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, language }),
      });

      const data = await response.json();

      if (data.success && data.data) {
        setIndexData(data.data);
      } else {
        // Check error code first
        // Handle both INSUFFICIENT_DATA (new) and INVALID_INPUT with insufficientData message (old)
        const errorMsg = data.message || data.error || '';
        if (
          data.code === 'INSUFFICIENT_DATA' ||
          (data.code === 'INVALID_INPUT' && errorMsg.includes('insufficientData'))
        ) {
          setError('INSUFFICIENT_DATA');
        } else {
          // For other errors, translate if it's a translation key
          const finalErrorMsg = errorMsg || 'indices.error';
          setError(
            finalErrorMsg.startsWith('errors.') || finalErrorMsg.startsWith('indices.')
              ? t(finalErrorMsg, language)
              : finalErrorMsg
          );
        }
      }
    } catch (err) {
      setError(t('indices.error', language));
    } finally {
      setSyncStatus(navigator.onLine ? 'online' : 'offline');
    }
  };

  /**
   * Calculate affordability for a planned cost
   * Called by AffordabilityPlanner component
   */
  const handleCalculateAffordability = async (
    plannedCost: number
  ): Promise<AffordabilityIndexResult | null> => {
    setSyncStatus('syncing');

    try {
      const response = await fetch('/api/indices/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, plannedCost, language }),
      });

      const data = await response.json();

      if (data.success && data.data) {
        setIndexData(data.data);
        return data.data.affordabilityIndex;
      }

      return null;
    } catch (err) {
      return null;
    } finally {
      setSyncStatus(navigator.onLine ? 'online' : 'offline');
    }
  };

  /**
   * Fetch AI explanation for current indices in a specific language
   */
  const fetchExplanationForLanguage = async (lang: Language): Promise<string> => {
    if (!indexData?.stressIndex) {
      throw new Error('No stress index available');
    }

    const response = await fetch('/api/indices/explain', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        stressIndex: indexData.stressIndex,
        affordabilityIndex: indexData.affordabilityIndex,
        userProfile,
        language: lang,
      }),
    });

    const data = await response.json();

    if (data.success && data.explanation) {
      return typeof data.explanation === 'string'
        ? data.explanation
        : data.explanation?.content ?? t('indices.error', lang);
    }

    throw new Error(data.error || 'Explain failed');
  };

  /**
   * Get AI explanation for current indices (all languages, cached)
   */
  const handleExplain = async () => {
    if (!indexData?.stressIndex) return;

    const allLanguages: Language[] = ['en', 'hi', 'mr'];

    // If all languages are already cached, nothing more to do
    if (allLanguages.every((l) => explanations[l])) return;

    setIsExplaining(true);

    try {
      const results = await Promise.allSettled(
        allLanguages.map((lang) => fetchExplanationForLanguage(lang))
      );

      const newCache: Record<string, string> = { ...explanations };
      results.forEach((result, i) => {
        const lang = allLanguages[i];
        if (result.status === 'fulfilled') {
          newCache[lang] = result.value;
        } else {
          newCache[lang] = explanations[lang] || t('indices.error', lang);
        }
      });

      setExplanations(newCache);
    } finally {
      setIsExplaining(false);
    }
  };

  // Intentionally hide the online/offline badge in UI.
  // We still track `syncStatus` internally for future enhancements.
  const renderSyncStatus = () => null;

  // Loading state
  if (isLoading) {
    return (
      <Card className="text-center">
        <Spinner size="lg" className="mx-auto mb-4" />
        <p className="text-neutral-600">{t('indices.checking', language)}</p>
      </Card>
    );
  }

  // Insufficient data state
  if (error === 'INSUFFICIENT_DATA') {
    return (
      <Card className="text-center">
        <div className="text-6xl mb-4">📊</div>
        <h3 className="text-section-heading text-neutral-800 mb-2">
          {t('indices.insufficientData', language)}
        </h3>
        <p className="text-body-sm text-neutral-600 mb-4">
          {t('indices.addMoreData', language)}
        </p>
        {renderSyncStatus()}
      </Card>
    );
  }

  // Error state
  if (error) {
    return (
      <ErrorState
        title={t('indices.error', language)}
        message={error}
        action={{
          label: t('receipt.tryAgain', language),
          onClick: loadLatestIndices,
        }}
      />
    );
  }

  // No data yet
  if (!indexData?.stressIndex) {
    return (
      <Card className="text-center">
        <div className="text-6xl mb-4">📊</div>
        <h3 className="text-section-heading text-neutral-800 mb-2">
          {t('indices.insufficientData', language)}
        </h3>
        <p className="text-body-sm text-neutral-600 mb-4">
          {t('indices.addMoreData', language)}
        </p>
        {renderSyncStatus()}
      </Card>
    );
  }

  return (
    <>
      <div className="w-full">
        {/* Sync status */}
        <div className="flex justify-end mb-4">{renderSyncStatus()}</div>

        {/* Main Content */}
        <section className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-8">
          <StressIndexDisplay stressIndex={indexData.stressIndex} language={language} />
          <AffordabilityPlanner
            userId={userId}
            language={language}
            onCalculate={handleCalculateAffordability}
          />
        </section>

        {/* Footer Actions */}
        <footer className="mt-8 flex justify-center">
          <Button
            onClick={handleExplain}
            disabled={isExplaining}
            loading={isExplaining}
            variant="primary"
            size="lg"
            className="px-10"
          >
            <span>
              {isExplaining
                ? t('indices.explaining', language)
                : t('indices.explain', language)}
            </span>
            <svg
              className="h-5 w-5"
              fill="currentColor"
              viewBox="0 0 20 20"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z"
                clipRule="evenodd"
              />
            </svg>
          </Button>
        </footer>

        {/* Inline AI Explanation */}
        {(isExplaining || Object.keys(explanations).length > 0) && (
          <div className="mt-6">
            {isExplaining && !Object.keys(explanations).length && (
              <div className="p-4 bg-primary-50 border border-primary-200 rounded-2xl animate-pulse">
                <div className="flex items-center gap-2 mb-3">
                  <div
                    className="w-4 h-4 rounded-full bg-primary-300 animate-bounce"
                    style={{ animationDelay: '0ms' }}
                  />
                  <div
                    className="w-4 h-4 rounded-full bg-primary-300 animate-bounce"
                    style={{ animationDelay: '150ms' }}
                  />
                  <div
                    className="w-4 h-4 rounded-full bg-primary-300 animate-bounce"
                    style={{ animationDelay: '300ms' }}
                  />
                  <span className="text-xs text-primary-600 ml-1">
                    {language === 'hi'
                      ? 'AI तीनों भाषाओं में विश्लेषण तैयार कर रहा है…'
                      : language === 'mr'
                        ? 'AI सर्व तीन भाषांमध्ये विश्लेषण तयार करत आहे…'
                        : 'Generating AI explanation in all languages…'}
                  </span>
                </div>
                <div className="space-y-2">
                  <div className="h-3 bg-primary-200 rounded w-full" />
                  <div className="h-3 bg-primary-200 rounded w-5/6" />
                  <div className="h-3 bg-primary-200 rounded w-4/6" />
                  <div className="h-3 bg-primary-200 rounded w-full mt-3" />
                  <div className="h-3 bg-primary-200 rounded w-3/4" />
                </div>
              </div>
            )}
            {!isExplaining && Object.keys(explanations).length > 0 && (() => {
              const currentText = explanations[language];
              const anyText =
                currentText || Object.values(explanations)[0];
              const isFallback = !currentText && !!anyText;

              if (!anyText) {
                return (
                  <div className="p-4 bg-primary-50 border border-primary-200 rounded-2xl">
                    <p className="text-sm text-neutral-700">
                      {t('indices.error', language)}
                    </p>
                  </div>
                );
              }

              const translateHint: Record<string, string> = {
                hi: 'ऊपर भाषा बदलने पर यही विश्लेषण तुरंत उसी भाषा में दिखेगा।',
                mr: 'वर भाषा बदलल्यास हे विश्लेषण लगेच त्या भाषेत दिसेल.',
                en: 'Switch language at the top to see this explanation in that language instantly.',
              };

              return (
                <div className="p-4 bg-primary-50 border border-primary-200 rounded-2xl">
                  <p className="text-sm text-neutral-700 whitespace-pre-wrap">
                    {anyText}
                  </p>
                  {isFallback && (
                    <p className="mt-2 text-xs text-primary-600 italic">
                      {translateHint[language] || translateHint.en}
                    </p>
                  )}
                </div>
              );
            })()}
          </div>
        )}
      </div>
    </>
  );
}
