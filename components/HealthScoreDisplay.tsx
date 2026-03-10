'use client';

import { useState, useEffect } from 'react';
import { Language } from '@/lib/types';
import { t } from '@/lib/translations';
import { Heart, Info, TrendingUp } from 'lucide-react';
import { logger } from '@/lib/logger';

interface HealthScoreDisplayProps {
  score: number;
  breakdown: {
    marginScore: number;
    expenseScore: number;
    cashScore: number;
    creditScore: number;
  };
  language: Language;
  sessionId?: string;
  userId?: string;
}

export default function HealthScoreDisplay({
  score,
  breakdown,
  language,
  sessionId,
  userId
}: HealthScoreDisplayProps) {
  const [explaining, setExplaining] = useState(false);
  // Cache explanations per language — switching language is instant (0 AI credits)
  // if that language has already been fetched
  const [explanations, setExplanations] = useState<Record<string, string>>({});

  // Only clear the cache when the score itself changes (new data),
  // NOT when language changes — language switch uses the cache
  useEffect(() => {
    setExplanations({});
  }, [score]);

  // Safety check: ensure breakdown is valid
  if (!breakdown || typeof breakdown !== 'object' ||
    'success' in breakdown || 'error' in breakdown || 'errorType' in breakdown) {
    logger.error('[HealthScoreDisplay] Invalid breakdown received', { breakdown });
    return null;
  }

  const getScoreColor = (score: number) => {
    if (score >= 70) return 'text-green-500';
    if (score >= 40) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getProgressColor = (score: number) => {
    if (score >= 70) return '#10b981';
    if (score >= 40) return '#eab308';
    return '#ef4444';
  };

  const fetchForLanguage = async (lang: string): Promise<string> => {
    const response = await fetch('/api/explain', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId,
        userId,
        metric: 'healthScore',
        value: score,
        context: breakdown,
        language: lang,
      }),
    });
    const data = await response.json();
    if (data.success && data.explanation) {
      return typeof data.explanation === 'string'
        ? data.explanation
        : data.explanation?.content ?? 'Unable to generate explanation.';
    }
    throw new Error(data.error || 'Explain failed');
  };

  const handleExplain = async () => {
    if (!sessionId || !userId) return;

    const allLanguages: string[] = ['en', 'hi', 'mr'];

    // If all 3 are already cached, nothing to do
    if (allLanguages.every((l) => explanations[l])) return;

    setExplaining(true);
    try {
      // Fetch all 3 languages in parallel — pay once, instant switching forever
      const results = await Promise.allSettled(
        allLanguages.map((lang) => fetchForLanguage(lang))
      );

      const newCache: Record<string, string> = { ...explanations };
      results.forEach((result, i) => {
        const lang = allLanguages[i];
        if (result.status === 'fulfilled') {
          newCache[lang] = result.value;
        } else {
          logger.warn(`[HealthScore] Explain failed for ${lang}`, { error: result.reason });
          newCache[lang] = explanations[lang] || 'Unable to generate explanation.';
        }
      });
      setExplanations(newCache);
    } catch (err) {
      logger.error('Failed to get explanations', { error: err });
    } finally {
      setExplaining(false);
    }
  };

  const circumference = 2 * Math.PI * 70;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="bg-red-50 p-2 rounded-lg">
            <Heart className="w-5 h-5 text-red-600" />
          </div>
          <h2 className="text-lg font-bold text-gray-900">
            {t('healthScore', language)}
          </h2>
        </div>
        {sessionId && userId && (
          <button
            onClick={handleExplain}
            disabled={explaining}
            className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1 disabled:text-gray-400 transition-colors"
          >
            <Info className="w-4 h-4" />
            {t('explainScore', language)}
          </button>
        )}
      </div>

      {/* Circular Progress */}
      <div className="flex items-center justify-center mb-6">
        <div className="relative w-40 h-40">
          <svg className="w-full h-full transform -rotate-90">
            {/* Background circle */}
            <circle
              cx="80"
              cy="80"
              r="70"
              stroke="currentColor"
              strokeWidth="12"
              fill="none"
              className="text-gray-200"
            />
            {/* Progress circle */}
            <circle
              cx="80"
              cy="80"
              r="70"
              stroke={getProgressColor(score)}
              strokeWidth="12"
              fill="none"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              className="transition-all duration-1000 ease-out"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`text-4xl font-bold ${getScoreColor(score)}`}>
              {score}
            </span>
            <span className="text-sm text-gray-500">/100</span>
          </div>
        </div>
      </div>

      {/* Breakdown Grid */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-600">{t('marginScore', language)}</span>
            <span className="text-sm font-semibold text-gray-900">{breakdown.marginScore}/30</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-1.5">
            <div
              className="h-full bg-blue-600 rounded-full transition-all duration-500"
              style={{ width: `${(breakdown.marginScore / 30) * 100}%` }}
            />
          </div>
        </div>

        <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-600">{t('expenseScore', language)}</span>
            <span className="text-sm font-semibold text-gray-900">{breakdown.expenseScore}/30</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-1.5">
            <div
              className="h-full bg-blue-600 rounded-full transition-all duration-500"
              style={{ width: `${(breakdown.expenseScore / 30) * 100}%` }}
            />
          </div>
        </div>

        <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-600">{t('cashScore', language)}</span>
            <span className="text-sm font-semibold text-gray-900">{breakdown.cashScore}/20</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-1.5">
            <div
              className="h-full bg-blue-600 rounded-full transition-all duration-500"
              style={{ width: `${(breakdown.cashScore / 20) * 100}%` }}
            />
          </div>
        </div>

        <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-600">{t('creditScore', language)}</span>
            <span className="text-sm font-semibold text-gray-900">{breakdown.creditScore}/20</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-1.5">
            <div
              className="h-full bg-blue-600 rounded-full transition-all duration-500"
              style={{ width: `${(breakdown.creditScore / 20) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {explaining && (
        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg animate-pulse">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-4 h-4 rounded-full bg-blue-300 animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="w-4 h-4 rounded-full bg-blue-300 animate-bounce" style={{ animationDelay: '150ms' }} />
            <div className="w-4 h-4 rounded-full bg-blue-300 animate-bounce" style={{ animationDelay: '300ms' }} />
            <span className="text-xs text-blue-500 ml-1">
              {language === 'hi' ? 'AI विश्लेषण तैयार हो रहा है…' :
                language === 'mr' ? 'AI विश्लेषण तयार होत आहे…' :
                  'Generating AI explanation in all languages…'}
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

      {!explaining && (() => {
        const currentText = explanations[language];
        const anyText = currentText || Object.values(explanations)[0];
        const isFallback = !currentText && !!anyText;

        const translateHint: Record<string, string> = {
          hi: 'हिंदी में देखने के लिए "स्कोर समझाएं" दबाएं',
          mr: 'मराठीत पाहण्यासाठी "स्कोअर समजावून सांगा" दाबा',
          en: 'Click "Explain Score" to get explanation in English',
        };

        if (!anyText) return null;
        return (
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{anyText}</p>
            {isFallback && (
              <p className="mt-2 text-xs text-blue-500 italic">
                {translateHint[language] || translateHint['en']}
              </p>
            )}
          </div>
        );
      })()}
    </div>
  );
}
