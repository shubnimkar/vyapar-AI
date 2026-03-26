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
        bg: 'bg-success-100',
        text: 'text-green-800',
        border: 'border-success-300',
      };
    case 'yellow':
      return {
        bg: 'bg-yellow-100',
        text: 'text-yellow-800',
        border: 'border-warning-300',
      };
    case 'red':
      return {
        bg: 'bg-error-100',
        text: 'text-error-800',
        border: 'border-error-300',
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
    <article className="bg-neutral-50 border border-neutral-200 rounded-2xl p-8 flex flex-col shadow-sm h-full">
      <div className="mb-2">
        <h3 className="text-section-heading text-neutral-700">
          {t('indices.affordabilityIndex', language)}
        </h3>
      </div>
      <p className="text-body-sm text-neutral-500 mb-8">
        {language === 'hi'
          ? 'आपके नकदी प्रवाह और बचत लक्ष्यों के आधार पर बड़ी खरीद की क्षमता जांचें।'
          : language === 'mr'
            ? 'तुमच्या रोकड प्रवाह आणि बचत उद्दिष्टांवर आधारित मोठी खरेदी परवडते का ते तपासा.'
            : 'Evaluate potential purchases against your current liquidity and savings goals.'}
      </p>

      <div className="space-y-6 flex-grow">
        {/* Input Section */}
        <div className="space-y-2">
          <label
            htmlFor="plannedCost"
            className="block text-label text-neutral-600"
          >
            {t('indices.plannedExpense', language)}
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <span className="text-neutral-400 font-medium">₹</span>
            </div>
            <input
              id="plannedCost"
              type="number"
              value={plannedCost}
              onChange={(e) => setPlannedCost(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={t('indices.enterAmount', language)}
              className="block w-full pl-9 pr-4 py-3 bg-white border border-neutral-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all text-neutral-800 placeholder:text-neutral-300 disabled:bg-neutral-100"
              disabled={isLoading}
              min="0"
              step="1"
            />
          </div>
        </div>

        <button
          onClick={handleCheckAffordability}
          disabled={isLoading || !plannedCost}
          className={`w-full py-3 rounded-xl font-bold text-white shadow-lg transition-all transform active:scale-[0.98] ${
            isLoading || !plannedCost
              ? 'bg-neutral-400 cursor-not-allowed'
              : 'bg-primary-600 hover:bg-primary-700 shadow-primary-100'
          }`}
        >
          {isLoading
            ? t('indices.checking', language)
            : t('indices.checkAffordability', language)}
        </button>

        {/* Error Message */}
        {error && (
          <div className="p-3 bg-error-100 border border-error-300 text-error-800 rounded-2xl text-sm">
            {error}
          </div>
        )}

        {/* Result Display */}
        {result && (
          <div className="space-y-4">
            {/* Score & Category */}
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-caption uppercase tracking-widest text-neutral-400">
                  {t('indices.score', language)}
                </span>
                <span className="text-numeric-lg text-neutral-800">
                  {Math.round(result.score)}/100
                </span>
              </div>
              <div
                className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold ${
                  getColorClasses(getAffordabilityColor(result.score)).bg
                } ${getColorClasses(getAffordabilityColor(result.score)).text}`}
              >
                {getCategoryLabel(result.breakdown.affordabilityCategory, language)}
              </div>
            </div>

            {/* Breakdown */}
            <div className="border-t border-neutral-100 pt-4 space-y-3 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-neutral-600">
                  {t('indices.costToProfitRatio', language)}
                </span>
                <span className="font-medium text-neutral-800">
                  {result.breakdown.costToProfitRatio.toFixed(2)}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-neutral-600">
                  {t('indices.avgMonthlyProfit', language)}
                </span>
                <span className="font-medium text-neutral-800">
                  ₹{result.inputParameters.avgMonthlyProfit.toLocaleString('en-IN')}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-neutral-600">
                  {t('indices.plannedExpense', language)}
                </span>
                <span className="font-medium text-neutral-800">
                  ₹{result.inputParameters.plannedCost.toLocaleString('en-IN')}
                </span>
              </div>

              <div className="pt-2 text-xs text-neutral-400 text-right">
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
          </div>
        )}

        {!result && (
          <div className="mt-4 p-4 bg-white/60 rounded-xl border border-white flex items-center gap-4">
            <div className="flex -space-x-2">
              <div className="w-8 h-8 rounded-full bg-primary-100 border-2 border-white flex items-center justify-center text-[10px] font-bold text-primary-600">
                AI
              </div>
              <div className="w-8 h-8 rounded-full bg-neutral-800 border-2 border-white flex items-center justify-center">
                <svg
                  className="w-4 h-4 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                  />
                </svg>
              </div>
            </div>
            <p className="text-xs text-neutral-500 leading-relaxed">
              {language === 'hi'
                ? 'हमारा एल्गोरिदम आपके औसत मासिक लाभ और आने वाले दायित्वों को ध्यान में रखता है।'
                : language === 'mr'
                  ? 'आमचा अल्गोरिदम तुमचा सरासरी मासिक नफा आणि येणाऱ्या जबाबदाऱ्या लक्षात घेतो.'
                  : 'Our algorithm considers your monthly recurring income and upcoming liabilities.'}
            </p>
          </div>
        )}
      </div>
    </article>
  );
}
