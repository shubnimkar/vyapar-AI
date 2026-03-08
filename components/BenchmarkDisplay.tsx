'use client';

import React, { useState } from 'react';
import { Language, BenchmarkComparison } from '@/lib/types';
import { t } from '@/lib/translations';
import { getVisualIndicator } from '@/lib/finance/categorizePerformance';
import { Card } from './ui/Card';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';
import { Skeleton } from './ui/Skeleton';
import { formatCurrency, formatPercentage } from '@/lib/design-system/utils';

interface BenchmarkDisplayProps {
  comparison: BenchmarkComparison | null;
  language: Language;
  isLoading: boolean;
  error?: string;
  userId?: string;
}

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
        <Skeleton variant="text" width="50%" height={20} className="mb-4" />
        <Skeleton variant="rectangular" width="100%" height={80} className="mb-2" />
        <Skeleton variant="rectangular" width="100%" height={80} />
      </Card>
    );
  }
  
  // Error state
  if (error) {
    return (
      <Card className="bg-warning-50 border-l-4 border-warning-500">
        <p className="text-sm text-warning-700">{error}</p>
      </Card>
    );
  }
  
  // No data state
  if (!comparison) {
    return (
      <Card className="bg-info-50 border-l-4 border-info-500">
        <p className="text-sm text-info-700">
          {t('benchmark.noData', language)}
        </p>
      </Card>
    );
  }
  
  const healthIndicator = getVisualIndicator(comparison.healthScoreComparison.category);
  const marginIndicator = getVisualIndicator(comparison.marginComparison.category);
  
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
      setExplanationError('Please log in to get AI explanation');
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
        // Graceful degradation - comparison still works without AI
        setExplanationError('AI explanation temporarily unavailable');
      }
    } catch (error) {
      // Graceful degradation - comparison still works without AI
      setExplanationError('AI explanation temporarily unavailable');
    } finally {
      setIsExplaining(false);
    }
  };
  
  return (
    <Card>
      <h3 className="text-lg font-semibold mb-4 text-neutral-800">
        {t('benchmark.title', language)}
      </h3>
      
      {/* Limited data warning */}
      {showLimitedDataWarning && (
        <Card className="bg-warning-50 border-l-4 border-warning-400 mb-4" density="compact">
          <p className="text-sm text-warning-700 flex items-center gap-2">
            <span>⚠️</span>
            {t('benchmark.limitedData', language)}
          </p>
        </Card>
      )}
      
      {/* Stale data indicator */}
      {isStale && (
        <Card className="bg-neutral-50 border-l-4 border-neutral-400 mb-4" density="compact">
          <p className="text-sm text-neutral-600 flex items-center gap-2">
            <span>🕐</span>
            {t('benchmark.staleData', language).replace('{days}', daysSinceUpdate.toString())}
          </p>
        </Card>
      )}
      
      {/* Health Score Comparison */}
      <Card className={`${healthIndicator.bgColor} ${healthIndicator.borderColor} border-l-4 mb-4`} density="compact">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-neutral-700">
            {t('benchmark.healthScore', language)}
          </span>
          <Badge variant={healthIndicator.icon === '🟢' ? 'success' : healthIndicator.icon === '🟡' ? 'warning' : 'default'}>
            {healthIndicator.icon}
          </Badge>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-neutral-600">{t('benchmark.yourBusiness', language)}</p>
            <p className="text-2xl font-bold text-neutral-900">
              {comparison.healthScoreComparison.userValue}
            </p>
          </div>
          <div>
            <p className="text-xs text-neutral-600">{t('benchmark.segmentAverage', language)}</p>
            <p className="text-2xl font-bold text-neutral-900">
              {comparison.healthScoreComparison.segmentMedian}
            </p>
          </div>
        </div>
        
        <p className="text-sm mt-2 font-medium text-neutral-700">
          {t(`benchmark.category.${comparison.healthScoreComparison.category}`, language)}
        </p>
      </Card>
      
      {/* Profit Margin Comparison */}
      <Card className={`${marginIndicator.bgColor} ${marginIndicator.borderColor} border-l-4 mb-4`} density="compact">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-neutral-700">
            {t('benchmark.profitMargin', language)}
          </span>
          <Badge variant={marginIndicator.icon === '🟢' ? 'success' : marginIndicator.icon === '🟡' ? 'warning' : 'default'}>
            {marginIndicator.icon}
          </Badge>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-neutral-600">{t('benchmark.yourBusiness', language)}</p>
            <p className="text-2xl font-bold text-neutral-900">
              {formatPercentage(comparison.marginComparison.userValue * 100)}
            </p>
          </div>
          <div>
            <p className="text-xs text-neutral-600">{t('benchmark.segmentAverage', language)}</p>
            <p className="text-2xl font-bold text-neutral-900">
              {formatPercentage(comparison.marginComparison.segmentMedian * 100)}
            </p>
          </div>
        </div>
        
        <p className="text-sm mt-2 font-medium text-neutral-700">
          {t(`benchmark.category.${comparison.marginComparison.category}`, language)}
        </p>
      </Card>
      
      {/* Sample Size Info */}
      <p className="text-xs text-neutral-500 text-center">
        {t('benchmark.sampleSize', language).replace('{count}', comparison.segmentInfo.sampleSize.toString())}
      </p>

      {/* AI Explanation Button (Optional Enhancement) */}
      <div className="mt-4 pt-4 border-t border-neutral-200">
        {!showExplanation ? (
          <Button
            onClick={handleExplain}
            disabled={isExplaining || !userId}
            loading={isExplaining}
            fullWidth
            variant="primary"
          >
            <span className="flex items-center justify-center gap-2">
              <span>💡</span>
              {language === 'hi' ? 'AI व्याख्या प्राप्त करें' : language === 'mr' ? 'AI स्पष्टीकरण मिळवा' : 'Get AI Explanation'}
            </span>
          </Button>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-neutral-700 flex items-center gap-2">
                <span>💡</span>
                {language === 'hi' ? 'AI व्याख्या' : language === 'mr' ? 'AI स्पष्टीकरण' : 'AI Explanation'}
              </h4>
              <Button
                onClick={() => setShowExplanation(false)}
                variant="ghost"
                size="sm"
              >
                {language === 'hi' ? 'छुपाएं' : language === 'mr' ? 'लपवा' : 'Hide'}
              </Button>
            </div>
            <Card className="bg-info-50 border-l-4 border-info-500" density="compact">
              <p className="text-sm text-neutral-700 whitespace-pre-line">
                {explanation}
              </p>
            </Card>
          </div>
        )}

        {/* Explanation Error (Graceful Degradation) */}
        {explanationError && (
          <div className="mt-2 text-xs text-warning-600 text-center">
            {explanationError}
          </div>
        )}
      </div>
    </Card>
  );
}
