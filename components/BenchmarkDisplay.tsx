'use client';

import React, { useState } from 'react';
import { Language, BenchmarkComparison } from '@/lib/types';
import { t } from '@/lib/translations';
import { getVisualIndicator } from '@/lib/finance/categorizePerformance';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Skeleton } from './ui/Skeleton';
import { formatPercentage } from '@/lib/design-system/utils';
import { BarChart3, Sparkles, ChevronDown, ChevronUp } from 'lucide-react';

interface BenchmarkDisplayProps {
  comparison: BenchmarkComparison | null;
  language: Language;
  isLoading: boolean;
  error?: string;
  userId?: string;
}

const categoryColors: Record<string, { dot: string; text: string; badge: string }> = {
  above_average: {
    dot: 'bg-emerald-500',
    text: 'text-emerald-700',
    badge: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  },
  at_average: {
    dot: 'bg-amber-400',
    text: 'text-amber-700',
    badge: 'bg-amber-50 text-amber-700 border border-amber-200',
  },
  below_average: {
    dot: 'bg-rose-500',
    text: 'text-rose-700',
    badge: 'bg-rose-50 text-rose-700 border border-rose-200',
  },
};

export default function BenchmarkDisplay({
  comparison,
  language,
  isLoading,
  error,
  userId
}: BenchmarkDisplayProps) {
  const [isExplaining, setIsExplaining] = useState(false);
  const [explanation, setExplanation] = useState<string | null>(null);
  const [explanationError, setExplanationError] = useState<string | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);

  // Loading state
  if (isLoading) {
    return (
      <Card>
        <div className="flex items-center gap-3 mb-5">
          <Skeleton variant="circular" width={36} height={36} />
          <Skeleton variant="text" width="40%" height={20} />
        </div>
        <Skeleton variant="rectangular" width="100%" height={80} className="mb-3 rounded-xl" />
        <Skeleton variant="rectangular" width="100%" height={80} className="rounded-xl" />
      </Card>
    );
  }

  // Error state
  if (error) {
    return (
      <Card>
        <div className="flex items-center gap-3 mb-4">
          <div className="bg-gray-100 p-2 rounded-lg">
            <BarChart3 className="w-5 h-5 text-gray-500" />
          </div>
          <h3 className="text-base font-semibold text-gray-900">{t('benchmark.title', language)}</h3>
        </div>
        <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
          {error}
        </p>
      </Card>
    );
  }

  // No data state
  if (!comparison) {
    return (
      <Card>
        <div className="flex items-center gap-3 mb-4">
          <div className="bg-blue-50 p-2 rounded-lg">
            <BarChart3 className="w-5 h-5 text-blue-600" />
          </div>
          <h3 className="text-base font-semibold text-gray-900">{t('benchmark.title', language)}</h3>
        </div>
        <p className="text-sm text-gray-500 bg-gray-50 border border-gray-200 rounded-lg px-4 py-3">
          {t('benchmark.noData', language)}
        </p>
      </Card>
    );
  }

  const healthIndicator = getVisualIndicator(comparison.healthScoreComparison.category);
  const marginIndicator = getVisualIndicator(comparison.marginComparison.category);

  const healthColors = categoryColors[comparison.healthScoreComparison.category] || categoryColors.at_average;
  const marginColors = categoryColors[comparison.marginComparison.category] || categoryColors.at_average;

  // Show limited data warning
  const showLimitedDataWarning = comparison.segmentInfo.sampleSize < 10;

  // Check if cache is stale (older than 7 days)
  const lastUpdated = new Date(comparison.segmentInfo.lastUpdated);
  const daysSinceUpdate = Math.floor(
    (Date.now() - lastUpdated.getTime()) / (1000 * 60 * 60 * 24)
  );
  const isStale = daysSinceUpdate > 7;

  // Handle AI explanation request
  const handleExplain = async () => {
    if (!userId) {
      setExplanationError(t('error.loginRequired', language));
      return;
    }

    setIsExplaining(true);
    setExplanationError(null);

    try {
      const response = await fetch('/api/benchmark/explain', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          comparison,
          language,
        }),
      });

      const data = await response.json();

      if (data.success && data.explanation) {
        setExplanation(data.explanation);
        setShowExplanation(true);
      } else {
        setExplanationError(t('error.aiExplanationUnavailable', language));
      }
    } catch (err) {
      setExplanationError(t('error.aiExplanationUnavailable', language));
    } finally {
      setIsExplaining(false);
    }
  };

  return (
    <Card>
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <div className="bg-blue-50 p-2 rounded-lg">
          <BarChart3 className="w-5 h-5 text-blue-600" />
        </div>
        <div>
          <h3 className="text-base font-bold text-gray-900">{t('benchmark.title', language)}</h3>
          <p className="text-xs text-gray-500">
            {t('benchmark.sampleSize', language).replace('{count}', comparison.segmentInfo.sampleSize.toString())}
          </p>
        </div>
      </div>

      {/* Warnings */}
      {showLimitedDataWarning && (
        <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-4">
          <span>⚠️</span>
          <span>{t('benchmark.limitedData', language)}</span>
        </div>
      )}

      {isStale && (
        <div className="flex items-center gap-2 text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 mb-4">
          <span>🕐</span>
          <span>{t('benchmark.staleData', language).replace('{days}', daysSinceUpdate.toString())}</span>
        </div>
      )}

      {/* Metric Cards */}
      <div className="space-y-3 mb-5">
        {/* Health Score */}
        <div className="border border-gray-200 rounded-xl p-4 bg-gray-50">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${healthColors.dot}`} />
              <span className="text-sm font-semibold text-gray-700">{t('benchmark.healthScore', language)}</span>
            </div>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${healthColors.badge}`}>
              {healthIndicator.icon} {t(`benchmark.category.${comparison.healthScoreComparison.category}`, language)}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-500 mb-0.5">{t('benchmark.yourBusiness', language)}</p>
              <p className="text-2xl font-bold text-gray-900">{comparison.healthScoreComparison.userValue}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-0.5">{t('benchmark.segmentAverage', language)}</p>
              <p className="text-2xl font-bold text-gray-400">{comparison.healthScoreComparison.segmentMedian}</p>
            </div>
          </div>
        </div>

        {/* Profit Margin */}
        <div className="border border-gray-200 rounded-xl p-4 bg-gray-50">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${marginColors.dot}`} />
              <span className="text-sm font-semibold text-gray-700">{t('benchmark.profitMargin', language)}</span>
            </div>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${marginColors.badge}`}>
              {marginIndicator.icon} {t(`benchmark.category.${comparison.marginComparison.category}`, language)}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-500 mb-0.5">{t('benchmark.yourBusiness', language)}</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatPercentage(comparison.marginComparison.userValue * 100)}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-0.5">{t('benchmark.segmentAverage', language)}</p>
              <p className="text-2xl font-bold text-gray-400">
                {formatPercentage(comparison.marginComparison.segmentMedian * 100)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-gray-100 pt-4">
        {/* AI Insights Button */}
        {!showExplanation ? (
          <Button
            onClick={handleExplain}
            disabled={isExplaining || !userId}
            loading={isExplaining}
            fullWidth
            variant="outline"
            size="md"
            icon={<Sparkles className="w-4 h-4" />}
            iconPosition="left"
          >
            {t('benchmark.getAiExplanation', language)}
          </Button>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-blue-500" />
                {t('benchmark.aiExplanation', language)}
              </h4>
              <button
                onClick={() => setShowExplanation(false)}
                className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 transition-colors"
              >
                <ChevronUp className="w-3.5 h-3.5" />
                {t('benchmark.hide', language)}
              </button>
            </div>
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
              <p className="text-sm text-gray-700 whitespace-pre-line leading-relaxed">{explanation}</p>
            </div>
          </div>
        )}

        {/* Explanation Error */}
        {explanationError && (
          <p className="mt-2 text-xs text-amber-600 text-center">{explanationError}</p>
        )}
      </div>
    </Card>
  );
}
