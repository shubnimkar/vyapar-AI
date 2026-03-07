'use client';

/**
 * Indices Dashboard Component
 * 
 * Combined dashboard displaying stress index and affordability planner.
 * Handles API calls to calculate and explain indices.
 * Implements responsive layout and sync status indicators.
 */

import { useState, useEffect } from 'react';
import StressIndexDisplay from './StressIndexDisplay';
import AffordabilityPlanner from './AffordabilityPlanner';
import type {
  IndexData,
  AffordabilityIndexResult,
  Language,
  UserProfile,
} from '@/lib/types';
import { t } from '@/lib/translations';

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
        setError(data.error || t('indices.error', language));
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
        setError(data.error || t('indices.error', language));
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
        color: 'bg-green-500',
        text: t('indices.syncStatus.online', language),
      },
      offline: {
        color: 'bg-gray-500',
        text: t('indices.syncStatus.offline', language),
      },
      syncing: {
        color: 'bg-blue-500',
        text: t('indices.syncStatus.syncing', language),
      },
    };

    const config = statusConfig[syncStatus];

    return (
      <div className="flex items-center gap-2 text-sm text-gray-600">
        <div className={`w-2 h-2 rounded-full ${config.color}`} />
        <span>{config.text}</span>
      </div>
    );
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-8 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
        <p className="text-gray-600">{t('indices.checking', language)}</p>
      </div>
    );
  }

  // Insufficient data state
  if (error && error.includes('Insufficient')) {
    return (
      <div className="bg-white rounded-lg shadow-md p-8 text-center">
        <div className="text-6xl mb-4">📊</div>
        <h3 className="text-lg font-semibold text-gray-800 mb-2">
          {t('indices.insufficientData', language)}
        </h3>
        <p className="text-gray-600 mb-4">
          {t('indices.addMoreData', language)}
        </p>
        {renderSyncStatus()}
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-md p-8 text-center">
        <div className="text-red-600 mb-4">⚠️</div>
        <p className="text-red-600">{error}</p>
        <button
          onClick={loadLatestIndices}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          {t('receipt.tryAgain', language)}
        </button>
      </div>
    );
  }

  // No data yet
  if (!indexData?.stressIndex) {
    return (
      <div className="bg-white rounded-lg shadow-md p-8 text-center">
        <div className="text-6xl mb-4">📊</div>
        <h3 className="text-lg font-semibold text-gray-800 mb-2">
          {t('indices.insufficientData', language)}
        </h3>
        <p className="text-gray-600 mb-4">
          {t('indices.addMoreData', language)}
        </p>
        {renderSyncStatus()}
      </div>
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
      <div className="text-center">
        <button
          onClick={handleExplain}
          disabled={isExplaining}
          className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium shadow-md"
        >
          {isExplaining
            ? t('indices.explaining', language)
            : t('indices.explain', language)}
        </button>
      </div>

      {/* AI Explanation Modal */}
      {showExplanation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-gray-800">
                  {t('indices.aiExplanation', language)}
                </h3>
                <button
                  onClick={() => setShowExplanation(false)}
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                >
                  ×
                </button>
              </div>
              <div className="prose max-w-none">
                <p className="text-gray-700 whitespace-pre-wrap">{explanation}</p>
              </div>
              <div className="mt-6 text-center">
                <button
                  onClick={() => setShowExplanation(false)}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  {t('indices.close', language)}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
