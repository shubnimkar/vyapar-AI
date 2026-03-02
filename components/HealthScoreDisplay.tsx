'use client';

import { useState } from 'react';
import { Language } from '@/lib/types';
import { t } from '@/lib/translations';
import { Heart, Info } from 'lucide-react';

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
}

export default function HealthScoreDisplay({ 
  score, 
  breakdown, 
  language,
  sessionId 
}: HealthScoreDisplayProps) {
  const [explaining, setExplaining] = useState(false);
  const [explanation, setExplanation] = useState('');

  const getScoreColor = (score: number) => {
    if (score >= 70) return 'text-green-600';
    if (score >= 40) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getProgressColor = (score: number) => {
    if (score >= 70) return 'bg-green-500';
    if (score >= 40) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const handleExplain = async () => {
    if (!sessionId) return;
    
    setExplaining(true);
    try {
      const response = await fetch('/api/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          metric: 'healthScore',
          value: score,
          context: breakdown,
          language,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setExplanation(data.explanation);
      }
    } catch (err) {
      console.error('Failed to get explanation:', err);
    } finally {
      setExplaining(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <Heart className="w-6 h-6 text-red-500" />
          {t('healthScore', language)}
        </h2>
        {sessionId && (
          <button
            onClick={handleExplain}
            disabled={explaining}
            className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1 disabled:text-gray-400"
          >
            <Info className="w-4 h-4" />
            {t('explainScore', language)}
          </button>
        )}
      </div>

      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className={`text-5xl font-bold ${getScoreColor(score)}`}>
            {score}
          </span>
          <span className="text-2xl text-gray-400">/100</span>
        </div>
        
        <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
          <div
            className={`h-full ${getProgressColor(score)} transition-all duration-500 ease-out`}
            style={{ width: `${score}%` }}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="bg-gray-50 p-3 rounded-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-600">{t('marginScore', language)}</span>
            <span className="text-sm font-semibold text-gray-800">{breakdown.marginScore}/30</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
            <div
              className="h-full bg-blue-500 rounded-full"
              style={{ width: `${(breakdown.marginScore / 30) * 100}%` }}
            />
          </div>
        </div>

        <div className="bg-gray-50 p-3 rounded-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-600">{t('expenseScore', language)}</span>
            <span className="text-sm font-semibold text-gray-800">{breakdown.expenseScore}/30</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
            <div
              className="h-full bg-blue-500 rounded-full"
              style={{ width: `${(breakdown.expenseScore / 30) * 100}%` }}
            />
          </div>
        </div>

        <div className="bg-gray-50 p-3 rounded-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-600">{t('cashScore', language)}</span>
            <span className="text-sm font-semibold text-gray-800">{breakdown.cashScore}/20</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
            <div
              className="h-full bg-blue-500 rounded-full"
              style={{ width: `${(breakdown.cashScore / 20) * 100}%` }}
            />
          </div>
        </div>

        <div className="bg-gray-50 p-3 rounded-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-600">{t('creditScore', language)}</span>
            <span className="text-sm font-semibold text-gray-800">{breakdown.creditScore}/20</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
            <div
              className="h-full bg-blue-500 rounded-full"
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
