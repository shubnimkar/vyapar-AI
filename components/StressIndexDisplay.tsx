'use client';

/**
 * Stress Index Display Component
 * 
 * Displays the stress index score with color coding and component breakdown.
 * NO business logic - display only.
 * 
 * Color coding:
 * - Green (0-33): Low stress
 * - Yellow (34-66): Medium stress
 * - Red (67-100): High stress
 */

import { useState } from 'react';
import type { StressIndexResult, Language, StressColor } from '@/lib/types';
import { t } from '@/lib/translations';

interface StressIndexDisplayProps {
  stressIndex: StressIndexResult;
  language: Language;
}

/**
 * Get color based on stress score
 * Property 19: Stress Color Coding
 */
function getStressColor(score: number): StressColor {
  if (score <= 33) return 'green';
  if (score <= 66) return 'yellow';
  return 'red';
}

/**
 * Get color classes for Tailwind CSS
 */
function getColorClasses(color: StressColor): {
  bg: string;
  text: string;
  border: string;
} {
  switch (color) {
    case 'green':
      return {
        bg: 'bg-green-100',
        text: 'text-green-800',
        border: 'border-green-300',
      };
    case 'yellow':
      return {
        bg: 'bg-yellow-100',
        text: 'text-yellow-800',
        border: 'border-yellow-300',
      };
    case 'red':
      return {
        bg: 'bg-red-100',
        text: 'text-red-800',
        border: 'border-red-300',
      };
  }
}

export default function StressIndexDisplay({
  stressIndex,
  language,
}: StressIndexDisplayProps) {
  const [showBreakdown, setShowBreakdown] = useState(false);

  const color = getStressColor(stressIndex.score);
  const colorClasses = getColorClasses(color);

  // Format timestamp for display
  const calculatedDate = new Date(stressIndex.calculatedAt).toLocaleString(
    language === 'hi' ? 'hi-IN' : language === 'mr' ? 'mr-IN' : 'en-IN',
    {
      dateStyle: 'medium',
      timeStyle: 'short',
    }
  );

  return (
    <div className="bg-white rounded-lg shadow-md p-6 border-2 border-gray-200">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800">
          {t('indices.stressIndex', language)}
        </h3>
      </div>

      {/* Score Display */}
      <div className="flex items-center justify-center mb-4">
        <div
          className={`${colorClasses.bg} ${colorClasses.text} ${colorClasses.border} border-4 rounded-full w-32 h-32 flex flex-col items-center justify-center`}
        >
          <div className="text-4xl font-bold">{Math.round(stressIndex.score)}</div>
          <div className="text-sm font-medium">{t('indices.score', language)}</div>
        </div>
      </div>

      {/* Breakdown Toggle */}
      <div className="text-center mb-4">
        <button
          onClick={() => setShowBreakdown(!showBreakdown)}
          className="text-blue-600 hover:text-blue-800 font-medium text-sm underline"
        >
          {showBreakdown
            ? t('indices.hideBreakdown', language)
            : t('indices.showBreakdown', language)}
        </button>
      </div>

      {/* Component Breakdown */}
      {showBreakdown && (
        <div className="border-t pt-4 space-y-3">
          <h4 className="font-semibold text-gray-700 text-sm mb-3">
            {t('indices.breakdown', language)}
          </h4>

          {/* Credit Ratio Score */}
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">
              {t('indices.creditRatio', language)}
            </span>
            <div className="flex items-center gap-2">
              <div className="w-24 bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full"
                  style={{
                    width: `${(stressIndex.breakdown.creditRatioScore / 40) * 100}%`,
                  }}
                />
              </div>
              <span className="text-sm font-medium text-gray-800 w-12 text-right">
                {Math.round(stressIndex.breakdown.creditRatioScore)}/40
              </span>
            </div>
          </div>

          {/* Cash Buffer Score */}
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">
              {t('indices.cashBuffer', language)}
            </span>
            <div className="flex items-center gap-2">
              <div className="w-24 bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full"
                  style={{
                    width: `${(stressIndex.breakdown.cashBufferScore / 35) * 100}%`,
                  }}
                />
              </div>
              <span className="text-sm font-medium text-gray-800 w-12 text-right">
                {Math.round(stressIndex.breakdown.cashBufferScore)}/35
              </span>
            </div>
          </div>

          {/* Expense Volatility Score */}
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">
              {t('indices.expenseVolatility', language)}
            </span>
            <div className="flex items-center gap-2">
              <div className="w-24 bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full"
                  style={{
                    width: `${(stressIndex.breakdown.expenseVolatilityScore / 25) * 100}%`,
                  }}
                />
              </div>
              <span className="text-sm font-medium text-gray-800 w-12 text-right">
                {Math.round(stressIndex.breakdown.expenseVolatilityScore)}/25
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Calculation Timestamp */}
      <div className="mt-4 pt-4 border-t text-xs text-gray-500 text-center">
        {t('indices.calculatedAt', language)}: {calculatedDate}
      </div>
    </div>
  );
}
