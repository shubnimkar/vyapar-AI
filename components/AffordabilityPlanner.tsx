'use client';

/**
 * Affordability Planner Component
 * 
 * Allows users to input a planned expense and check affordability.
 * NO business logic - uses callbacks for calculation.
 * 
 * Color coding:
 * - Red (0-33): Not affordable
 * - Yellow (34-66): Stretch/Risky
 * - Green (67-100): Affordable
 */

import { useState } from 'react';
import type { AffordabilityIndexResult, Language, AffordabilityColor } from '@/lib/types';
import { t } from '@/lib/translations';

interface AffordabilityPlannerProps {
  userId: string;
  language: Language;
  onCalculate: (plannedCost: number) => Promise<AffordabilityIndexResult | null>;
}

/**
 * Get color based on affordability score
 * Property 20: Affordability Color Coding
 */
function getAffordabilityColor(score: number): AffordabilityColor {
  if (score <= 33) return 'red';
  if (score <= 66) return 'yellow';
  return 'green';
}

/**
 * Get color classes for Tailwind CSS
 */
function getColorClasses(color: AffordabilityColor): {
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

/**
 * Get localized category label
 * Property 21: Affordability Guidance Mapping
 */
function getCategoryLabel(
  category: string,
  language: Language
): string {
  const categoryMap: Record<string, string> = {
    'Easily Affordable': t('indices.category.easilyAffordable', language),
    'Affordable': t('indices.category.affordable', language),
    'Stretch': t('indices.category.stretch', language),
    'Risky': t('indices.category.risky', language),
    'Not Recommended': t('indices.category.notRecommended', language),
  };
  return categoryMap[category] || category;
}

export default function AffordabilityPlanner({
  userId,
  language,
  onCalculate,
}: AffordabilityPlannerProps) {
  const [plannedCost, setPlannedCost] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AffordabilityIndexResult | null>(null);

  /**
   * Handle affordability check
   * Property 22: Positive Cost Validation
   */
  const handleCheckAffordability = async () => {
    // Reset previous state
    setError(null);
    setResult(null);

    // Validate input
    const amount = parseFloat(plannedCost);
    if (isNaN(amount) || amount <= 0) {
      setError(t('indices.invalidAmount', language));
      return;
    }

    setIsLoading(true);

    try {
      const affordabilityResult = await onCalculate(amount);
      
      if (affordabilityResult) {
        setResult(affordabilityResult);
      } else {
        setError(t('indices.error', language));
      }
    } catch (err) {
      setError(t('indices.error', language));
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !isLoading) {
      handleCheckAffordability();
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 border-2 border-gray-200">
      {/* Header */}
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-800">
          {t('indices.affordabilityIndex', language)}
        </h3>
      </div>

      {/* Input Section */}
      <div className="mb-4">
        <label
          htmlFor="plannedCost"
          className="block text-sm font-medium text-gray-700 mb-2"
        >
          {t('indices.plannedExpense', language)}
        </label>
        <div className="flex gap-2">
          <input
            id="plannedCost"
            type="number"
            value={plannedCost}
            onChange={(e) => setPlannedCost(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={t('indices.enterAmount', language)}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={isLoading}
            min="0"
            step="1"
          />
          <button
            onClick={handleCheckAffordability}
            disabled={isLoading || !plannedCost}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium"
          >
            {isLoading
              ? t('indices.checking', language)
              : t('indices.checkAffordability', language)}
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-300 text-red-800 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Result Display */}
      {result && (
        <div className="space-y-4">
          {/* Score Display */}
          <div className="flex items-center justify-center">
            <div
              className={`${getColorClasses(getAffordabilityColor(result.score)).bg} ${
                getColorClasses(getAffordabilityColor(result.score)).text
              } ${
                getColorClasses(getAffordabilityColor(result.score)).border
              } border-4 rounded-full w-32 h-32 flex flex-col items-center justify-center`}
            >
              <div className="text-4xl font-bold">{Math.round(result.score)}</div>
              <div className="text-sm font-medium">{t('indices.score', language)}</div>
            </div>
          </div>

          {/* Category */}
          <div className="text-center">
            <div className="text-sm text-gray-600 mb-1">
              {t('indices.category', language)}
            </div>
            <div
              className={`inline-block px-4 py-2 rounded-lg font-semibold ${
                getColorClasses(getAffordabilityColor(result.score)).bg
              } ${getColorClasses(getAffordabilityColor(result.score)).text}`}
            >
              {getCategoryLabel(result.breakdown.affordabilityCategory, language)}
            </div>
          </div>

          {/* Breakdown */}
          <div className="border-t pt-4 space-y-3">
            <h4 className="font-semibold text-gray-700 text-sm mb-3">
              {t('indices.breakdown', language)}
            </h4>

            {/* Cost to Profit Ratio */}
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">
                {t('indices.costToProfitRatio', language)}
              </span>
              <span className="text-sm font-medium text-gray-800">
                {result.breakdown.costToProfitRatio.toFixed(2)}
              </span>
            </div>

            {/* Average Monthly Profit */}
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">
                {t('indices.avgMonthlyProfit', language)}
              </span>
              <span className="text-sm font-medium text-gray-800">
                ₹{result.inputParameters.avgMonthlyProfit.toLocaleString('en-IN')}
              </span>
            </div>

            {/* Planned Cost */}
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">
                {t('indices.plannedExpense', language)}
              </span>
              <span className="text-sm font-medium text-gray-800">
                ₹{result.inputParameters.plannedCost.toLocaleString('en-IN')}
              </span>
            </div>
          </div>

          {/* Calculation Timestamp */}
          <div className="pt-4 border-t text-xs text-gray-500 text-center">
            {t('indices.calculatedAt', language)}:{' '}
            {new Date(result.calculatedAt).toLocaleString(
              language === 'hi' ? 'hi-IN' : language === 'mr' ? 'mr-IN' : 'en-IN',
              {
                dateStyle: 'medium',
                timeStyle: 'short',
              }
            )}
          </div>
        </div>
      )}
    </div>
  );
}
