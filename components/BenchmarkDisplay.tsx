'use client';

import React, { useState } from 'react';
import { Language, BenchmarkComparison } from '@/lib/types';
import { t } from '@/lib/translations';
import { getVisualIndicator } from '@/lib/finance/categorizePerformance';
import { Card } from './ui/Card';
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
  const [explanations, setExplanations] = useState<Record<string, string>>({});
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

  // Error state with friendlier, typed messages
  if (error) {
    // Map backend error codes / messages to user-friendly translations where possible
    const normalized =
      error === 'benchmark.profileIncomplete' ||
      error === 'benchmark.noDailyEntries' ||
      error === 'benchmark.segmentUnavailable'
        ? t(error, language)
        : error;

    return (
      <Card>
        <div className="flex items-center gap-3 mb-4">
          <div className="bg-gray-100 p-2 rounded-lg">
            <BarChart3 className="w-5 h-5 text-gray-500" />
          </div>
          <h3 className="text-section-heading text-gray-900">{t('benchmark.title', language)}</h3>
        </div>
        <p className="text-body-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
          {normalized}
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
          <h3 className="text-section-heading text-gray-900">{t('benchmark.title', language)}</h3>
        </div>
        <p className="text-body-sm text-gray-500 bg-gray-50 border border-gray-200 rounded-lg px-4 py-3">
          {t('benchmark.noData', language)}
        </p>
      </Card>
    );
  }

  const healthIndicator = getVisualIndicator(comparison.healthScoreComparison.category);
  const marginIndicator = getVisualIndicator(comparison.marginComparison.category);

  const healthColors =
    categoryColors[comparison.healthScoreComparison.category] || categoryColors.at_average;
  const marginColors =
    categoryColors[comparison.marginComparison.category] || categoryColors.at_average;

  // Circular progress for health score (0-100)
  const healthScoreValue = Math.max(
    0,
    Math.min(100, Number(comparison.healthScoreComparison.userValue) || 0)
  );
  const healthStrokeDasharray = `${healthScoreValue}, 100`;

  // Dynamic color for health score ring based on category
  const healthRingColor = 
    comparison.healthScoreComparison.category === 'above_average' ? 'text-emerald-500' :
    comparison.healthScoreComparison.category === 'at_average' ? 'text-amber-400' :
    'text-rose-500';

  // Show limited data warning
  const showLimitedDataWarning = comparison.segmentInfo.sampleSize < 10;

  // Check if cache is stale (older than 7 days)
  const lastUpdated = new Date(comparison.segmentInfo.lastUpdated);
  const daysSinceUpdate = Math.floor(
    (Date.now() - lastUpdated.getTime()) / (1000 * 60 * 60 * 24)
  );
  const isStale = daysSinceUpdate > 7;

  // Fetch explanation for a single language
  const fetchExplanationForLanguage = async (lang: Language): Promise<string> => {
    const response = await fetch('/api/benchmark/explain', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, comparison, language: lang }),
    });
    const data = await response.json();
    if (data.success && data.explanation) {
      return data.explanation;
    }
    throw new Error(data.error || 'Explain failed');
  };

  // Fetch AI explanation for all 3 languages concurrently and cache results
  const handleExplain = async () => {
    if (!userId) {
      setExplanationError(t('error.loginRequired', language));
      return;
    }

    const allLanguages: Language[] = ['en', 'hi', 'mr'];

    // If all languages are already cached, just show them
    if (allLanguages.every((l) => explanations[l])) {
      setShowExplanation(true);
      return;
    }

    setIsExplaining(true);
    setExplanationError(null);
    setShowExplanation(true); // reveal skeleton immediately

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
          newCache[lang] = explanations[lang] || '';
        }
      });

      setExplanations(newCache);

      // If everything failed, surface an error
      if (allLanguages.every((l) => !newCache[l])) {
        setExplanationError(t('error.aiExplanationUnavailable', language));
        setShowExplanation(false);
      }
    } catch (err) {
      setExplanationError(t('error.aiExplanationUnavailable', language));
      setShowExplanation(false);
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
          <h3 className="text-section-heading text-gray-900">{t('benchmark.title', language)}</h3>
          <p className="text-caption text-gray-500">
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

      {/* Metric Cards in landscape layout */}
      <div className="mb-5">
        <div className="flex flex-col md:flex-row gap-8">
          {/* Health Score section */}
          <div className="w-full md:w-1/3 flex flex-col items-center justify-center space-y-4 md:border-r border-gray-50 md:pr-4">
            <div className="relative w-32 h-32">
              <svg
                className="w-full h-full transform -rotate-90"
                viewBox="0 0 36 36"
              >
                <path
                  className="stroke-current text-gray-100"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  strokeWidth="3"
                />
                <path
                  className={`stroke-current ${healthRingColor}`}
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  strokeDasharray={healthStrokeDasharray}
                  strokeLinecap="round"
                  strokeWidth="3"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-numeric text-slate-800">
                  {comparison.healthScoreComparison.userValue}
                </span>
                <span className="text-caption text-gray-400 tracking-wider uppercase">
                  {t('benchmark.healthScore', language)}
                </span>
              </div>
            </div>

            <span
              className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide ${healthColors.badge}`}
            >
              <span className="flex items-center justify-center">
                {healthIndicator.icon}
              </span>
              {t(`benchmark.category.${comparison.healthScoreComparison.category}`, language)}
            </span>
          </div>

          {/* Right content section */}
          <div className="flex-1 flex flex-col justify-between py-1">
            {/* Health comparison numbers */}
            <div className="grid grid-cols-2 gap-4 mt-1">
              <div>
                <p className="text-caption text-gray-400 uppercase tracking-wider">
                  {t('benchmark.yourBusiness', language)}
                </p>
                <p className={`text-subsection-heading ${healthColors.text}`}>
                  {comparison.healthScoreComparison.userValue}
                </p>
              </div>
              <div className="text-right">
                <p className="text-caption text-gray-400 uppercase tracking-wider">
                  {t('benchmark.segmentAverage', language)}
                </p>
                <p className="text-subsection-heading text-gray-400">
                  {comparison.healthScoreComparison.segmentMedian}
                </p>
              </div>
            </div>

            {/* Profit Margin Detail */}
            <div className="mt-6 pt-6 border-t border-gray-100">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${marginColors.dot}`} />
                  <span className="text-label text-slate-700">
                    {t('benchmark.profitMargin', language)}
                  </span>
                </div>
                <span
                  className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase ${marginColors.badge}`}
                >
                  {marginIndicator.icon}{' '}
                  {t(`benchmark.category.${comparison.marginComparison.category}`, language)}
                </span>
              </div>
              <div className="flex items-baseline justify-between">
                <div>
                  <p className="text-caption text-gray-400 uppercase">
                    {t('benchmark.yourBusiness', language)}
                  </p>
                  <p className="text-numeric text-slate-900">
                    {formatPercentage(comparison.marginComparison.userValue * 100)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-caption text-gray-400 uppercase">
                    {t('benchmark.segmentAverage', language)}
                  </p>
                  <p className="text-subsection-heading text-gray-400">
                    {formatPercentage(comparison.marginComparison.segmentMedian * 100)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Divider and insights button */}
      <div className="border-t border-gray-100 pt-4">
        {/* AI Insights Button */}
        {!showExplanation ? (
          <button
            onClick={handleExplain}
            disabled={isExplaining || !userId}
            className={`w-full flex items-center justify-center gap-3 py-2.5 px-8 rounded-[18px] font-bold text-base tracking-tight transition-all duration-300 group active:scale-[0.97] focus:outline-none focus:ring-2 focus:ring-offset-2 ${
              isExplaining || !userId
                ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                : 'bg-gradient-to-r from-[#2D60FF] to-[#604BFF] hover:from-[#2550D6] hover:to-[#503ED6] text-white shadow-[0_8px_20px_-6px_rgba(45,96,255,0.4)] focus:ring-[#2D60FF]'
            }`}
          >
            <Sparkles className="w-[22px] h-[22px] group-hover:scale-110 transition-transform duration-300" />
            <span className="leading-none">{t('benchmark.getAiExplanation', language)}</span>
          </button>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-label text-gray-700 flex items-center gap-2">
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

            {/* Loading skeleton while fetching all 3 languages */}
            {isExplaining && !Object.keys(explanations).length && (
              <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl animate-pulse">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-3 h-3 rounded-full bg-blue-300 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-3 h-3 rounded-full bg-blue-300 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-3 h-3 rounded-full bg-blue-300 animate-bounce" style={{ animationDelay: '300ms' }} />
                  <span className="text-xs text-blue-500 ml-1">
                    {language === 'hi'
                      ? 'AI तीनों भाषाओं में विश्लेषण तैयार कर रहा है…'
                      : language === 'mr'
                        ? 'AI सर्व तीन भाषांमध्ये विश्लेषण तयार करत आहे…'
                        : 'Generating AI insights in all languages…'}
                  </span>
                </div>
                <div className="space-y-2">
                  <div className="h-3 bg-blue-200 rounded w-full" />
                  <div className="h-3 bg-blue-200 rounded w-5/6" />
                  <div className="h-3 bg-blue-200 rounded w-4/6" />
                  <div className="h-3 bg-blue-200 rounded w-full mt-3" />
                  <div className="h-3 bg-blue-200 rounded w-3/4" />
                </div>
              </div>
            )}

            {/* Explanation content — instant language switch from cache */}
            {!isExplaining && Object.keys(explanations).length > 0 && (() => {
              const currentText = explanations[language];
              const anyText = currentText || Object.values(explanations).find(Boolean);
              const isFallback = !currentText && !!anyText;

              const translateHint: Record<string, string> = {
                hi: 'ऊपर भाषा बदलने पर यही विश्लेषण तुरंत उसी भाषा में दिखेगा।',
                mr: 'वर भाषा बदलल्यास हे विश्लेषण लगेच त्या भाषेत दिसेल.',
                en: 'Switch language at the top to see this insight in that language instantly.',
              };

              return anyText ? (
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                  <p className="text-sm text-gray-700 whitespace-pre-line leading-relaxed">{anyText}</p>
                  {isFallback && (
                    <p className="mt-2 text-xs text-blue-500 italic">
                      {translateHint[language] || translateHint.en}
                    </p>
                  )}
                </div>
              ) : null;
            })()}
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
