'use client';

import React, { useState } from 'react';
import { Language, BenchmarkComparison } from '@/lib/types';
import { t } from '@/lib/translations';
import { getVisualIndicator } from '@/lib/finance/categorizePerformance';

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
      <div className="bg-white rounded-lg shadow-md p-6 border border-slate-200">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
          <div className="h-8 bg-gray-200 rounded mb-2"></div>
          <div className="h-8 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }
  
  // Error state
  if (error) {
    return (
      <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded">
        <p className="text-sm text-yellow-700">{error}</p>
      </div>
    );
  }
  
  // No data state
  if (!comparison) {
    return (
      <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
        <p className="text-sm text-blue-700">
          {t('benchmark.noData', language)}
        </p>
      </div>
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
    <div className="bg-white rounded-lg shadow-md p-6 border border-slate-200">
      <h3 className="text-lg font-semibold mb-4 text-slate-800">
        {t('benchmark.title', language)}
      </h3>
      
      {/* Limited data warning */}
      {showLimitedDataWarning && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-3 mb-4 rounded">
          <p className="text-sm text-yellow-700 flex items-center gap-2">
            <span>⚠️</span>
            {t('benchmark.limitedData', language)}
          </p>
        </div>
      )}
      
      {/* Stale data indicator */}
      {isStale && (
        <div className="bg-gray-50 border-l-4 border-gray-400 p-3 mb-4 rounded">
          <p className="text-sm text-gray-600 flex items-center gap-2">
            <span>🕐</span>
            {t('benchmark.staleData', language).replace('{days}', daysSinceUpdate.toString())}
          </p>
        </div>
      )}
      
      {/* Health Score Comparison */}
      <div className={`${healthIndicator.bgColor} ${healthIndicator.borderColor} border-l-4 p-4 rounded mb-4`}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">
            {t('benchmark.healthScore', language)}
          </span>
          <span className="text-2xl">{healthIndicator.icon}</span>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-gray-600">{t('benchmark.yourBusiness', language)}</p>
            <p className="text-2xl font-bold text-gray-900">
              {comparison.healthScoreComparison.userValue}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-600">{t('benchmark.segmentAverage', language)}</p>
            <p className="text-2xl font-bold text-gray-900">
              {comparison.healthScoreComparison.segmentMedian}
            </p>
          </div>
        </div>
        
        <p className="text-sm mt-2 font-medium text-gray-700">
          {t(`benchmark.category.${comparison.healthScoreComparison.category}`, language)}
        </p>
      </div>
      
      {/* Profit Margin Comparison */}
      <div className={`${marginIndicator.bgColor} ${marginIndicator.borderColor} border-l-4 p-4 rounded mb-4`}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">
            {t('benchmark.profitMargin', language)}
          </span>
          <span className="text-2xl">{marginIndicator.icon}</span>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-gray-600">{t('benchmark.yourBusiness', language)}</p>
            <p className="text-2xl font-bold text-gray-900">
              {(comparison.marginComparison.userValue * 100).toFixed(1)}%
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-600">{t('benchmark.segmentAverage', language)}</p>
            <p className="text-2xl font-bold text-gray-900">
              {(comparison.marginComparison.segmentMedian * 100).toFixed(1)}%
            </p>
          </div>
        </div>
        
        <p className="text-sm mt-2 font-medium text-gray-700">
          {t(`benchmark.category.${comparison.marginComparison.category}`, language)}
        </p>
      </div>
      
      {/* Sample Size Info */}
      <p className="text-xs text-gray-500 text-center">
        {t('benchmark.sampleSize', language).replace('{count}', comparison.segmentInfo.sampleSize.toString())}
      </p>

      {/* AI Explanation Button (Optional Enhancement) */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        {!showExplanation ? (
          <button
            onClick={handleExplain}
            disabled={isExplaining || !userId}
            className={`w-full py-2 px-4 rounded-lg font-medium transition-colors ${
              isExplaining || !userId
                ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                : 'bg-blue-500 text-white hover:bg-blue-600'
            }`}
          >
            {isExplaining ? (
              <span className="flex items-center justify-center gap-2">
                <span className="animate-spin">⏳</span>
                {language === 'hi' ? 'व्याख्या प्राप्त कर रहे हैं...' : language === 'mr' ? 'स्पष्टीकरण मिळवत आहे...' : 'Getting explanation...'}
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <span>💡</span>
                {language === 'hi' ? 'AI व्याख्या प्राप्त करें' : language === 'mr' ? 'AI स्पष्टीकरण मिळवा' : 'Get AI Explanation'}
              </span>
            )}
          </button>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <span>💡</span>
                {language === 'hi' ? 'AI व्याख्या' : language === 'mr' ? 'AI स्पष्टीकरण' : 'AI Explanation'}
              </h4>
              <button
                onClick={() => setShowExplanation(false)}
                className="text-xs text-gray-500 hover:text-gray-700"
              >
                {language === 'hi' ? 'छुपाएं' : language === 'mr' ? 'लपवा' : 'Hide'}
              </button>
            </div>
            <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
              <p className="text-sm text-gray-700 whitespace-pre-line">
                {explanation}
              </p>
            </div>
          </div>
        )}

        {/* Explanation Error (Graceful Degradation) */}
        {explanationError && (
          <div className="mt-2 text-xs text-yellow-600 text-center">
            {explanationError}
          </div>
        )}
      </div>
    </div>
  );
}
