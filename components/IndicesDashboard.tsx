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
  const [showExplanation, setShowExplanation] = useState(false);
  const [explanation, setExplanation] = useState<string | null>(null);
  const [isExplaining, setIsExplaining] = useState(false);

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
   * Get AI explanation for current indices
   */
  const handleExplain = async () => {
    if (!indexData?.stressIndex) return;

    setIsExplaining(true);
    setExplanation(null);

    try {
      const response = await fetch('/api/indices/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stressIndex: indexData.stressIndex,
          affordabilityIndex: indexData.affordabilityIndex,
          userProfile,
          language,
        }),
      });

      const data = await response.json();

      if (data.success && data.explanation) {
        setExplanation(data.explanation);
        setShowExplanation(true);
      } else {
        setExplanation(t('indices.error', language));
        setShowExplanation(true);
      }
    } catch (err) {
      setExplanation(t('indices.error', language));
      setShowExplanation(true);
    } finally {
      setIsExplaining(false);
    }
  };

  /**
   * Render sync status indicator
   */
  const renderSyncStatus = () => {
    const statusConfig = {
      online: {
        variant: 'success' as const,
        text: t('indices.syncStatus.online', language),
      },
      offline: {
        variant: 'default' as const,
        text: t('indices.syncStatus.offline', language),
      },
      syncing: {
        variant: 'info' as const,
        text: t('indices.syncStatus.syncing', language),
      },
    };

    const config = statusConfig[syncStatus];

    return (
      <Badge variant={config.variant}>
        {config.text}
      </Badge>
    );
  };

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
        <h3 className="text-lg font-semibold text-neutral-800 mb-2">
          {t('indices.insufficientData', language)}
        </h3>
        <p className="text-neutral-600 mb-4">
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
        <h3 className="text-lg font-semibold text-neutral-800 mb-2">
          {t('indices.insufficientData', language)}
        </h3>
        <p className="text-neutral-600 mb-4">
          {t('indices.addMoreData', language)}
        </p>
        {renderSyncStatus()}
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Sync Status */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-800">
          {t('indices.stressIndex', language)} & {t('indices.affordabilityIndex', language)}
        </h2>
        {renderSyncStatus()}
      </div>

      {/* Indices Grid - Responsive Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Stress Index Display */}
        <StressIndexDisplay stressIndex={indexData.stressIndex} language={language} />

        {/* Affordability Planner */}
        <AffordabilityPlanner
          userId={userId}
          language={language}
          onCalculate={handleCalculateAffordability}
        />
      </div>

      {/* Explain Button */}
      <div className="flex justify-center mt-6">
        <Button
          onClick={handleExplain}
          disabled={isExplaining}
          loading={isExplaining}
          variant="primary"
          size="lg"
          className="w-full lg:w-auto min-w-[200px]"
        >
          {isExplaining
            ? t('indices.explaining', language)
            : t('indices.explain', language)}
        </Button>
      </div>

      {/* AI Explanation Modal */}
      {showExplanation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-neutral-800">
                {t('indices.aiExplanation', language)}
              </h3>
              <button
                onClick={() => setShowExplanation(false)}
                className="text-neutral-500 hover:text-neutral-700 text-2xl"
              >
                ×
              </button>
            </div>
            <div className="prose max-w-none">
              <p className="text-neutral-700 whitespace-pre-wrap">{explanation}</p>
            </div>
            <div className="mt-6 text-center">
              <Button
                onClick={() => setShowExplanation(false)}
                variant="primary"
              >
                {t('indices.close', language)}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
