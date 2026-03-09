'use client';

import { useState } from 'react';
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
  const [explanation, setExplanation] = useState('');

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

  const handleExplain = async () => {
    if (!sessionId || !userId) return;
    
    setExplaining(true);
    try {
      const response = await fetch('/api/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          userId,
          metric: 'healthScore',
          value: score,
          context: breakdown,
          language,
        }),
      });

      const data = await response.json();
      if (data.success && data.explanation) {
        // Handle both flat string and nested object formats for backward compatibility
        if (typeof data.explanation === 'string') {
          setExplanation(data.explanation);
        } else if (typeof data.explanation === 'object' && data.explanation.content) {
          setExplanation(data.explanation.content);
        } else {
          setExplanation('Unable to generate explanation at this time.');
        }
      } else {
        logger.warn('[HealthScore] Explain failed', { error: data.error });
        setExplanation('Unable to generate explanation at this time.');
      }
    } catch (err) {
      logger.error('Failed to get explanation', { error: err });
      setExplanation('Unable to generate explanation at this time.');
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

      {explanation && (
        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-gray-700 whitespace-pre-wrap">{explanation}</p>
        </div>
      )}
    </div>
  );
}
