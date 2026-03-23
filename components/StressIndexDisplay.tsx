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

  const clampedScore = Math.max(0, Math.min(100, Math.round(stressIndex.score)));
  const radius = 80;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - clampedScore / 100);

  const color = getStressColor(stressIndex.score);
  const colorClasses = getColorClasses(color);

  const calculatedDate = new Date(stressIndex.calculatedAt).toLocaleString(
    language === 'hi' ? 'hi-IN' : language === 'mr' ? 'mr-IN' : 'en-IN',
    {
      dateStyle: 'medium',
      timeStyle: 'short',
    }
  );

  return (
    <article className="bg-white border border-slate-200 rounded-2xl p-8 flex flex-col items-center justify-between shadow-sm hover:shadow-md transition-shadow duration-300">
      <div className="w-full">
        <h3 className="text-section-heading text-slate-700 mb-6">
          {t('indices.stressIndex', language)}
        </h3>
      </div>

      {/* Gauge Visualization */}
      <div className="relative flex items-center justify-center mb-6">
        <svg className="w-48 h-48 transform -rotate-90">
          {/* Background track */}
          <circle
            cx="96"
            cy="96"
            r={radius}
            strokeWidth="12"
            fill="transparent"
            className="text-slate-100"
            stroke="currentColor"
          />
          {/* Progress track */}
          <circle
            cx="96"
            cy="96"
            r={radius}
            strokeWidth="12"
            fill="transparent"
            strokeLinecap="round"
            stroke="url(#stressGradient)"
            style={{
              strokeDasharray: circumference,
              strokeDashoffset,
            }}
          />
          <defs>
            <linearGradient id="stressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#fbbf24" />
              <stop offset="100%" stopColor="#f59e0b" />
            </linearGradient>
          </defs>
        </svg>

        {/* Score Text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center transform rotate-0">
          <span className="text-numeric-lg text-slate-800">{clampedScore}</span>
          <span className="text-caption text-slate-400 uppercase tracking-widest">
            {t('indices.score', language)}
          </span>
        </div>
      </div>

      <div className="w-full flex flex-col items-center gap-4">
        <button
          onClick={() => setShowBreakdown(!showBreakdown)}
          className="text-blue-600 hover:text-blue-700 font-medium text-sm flex items-center gap-1 group transition-colors"
        >
          <span>
            {showBreakdown
              ? t('indices.hideBreakdown', language)
              : t('indices.showBreakdown', language)}
          </span>
          <svg
            className="h-4 w-4 group-hover:translate-x-0.5 transition-transform"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              d="M9 5l7 7-7 7"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
            />
          </svg>
        </button>

        {showBreakdown && (
          <div className="w-full pt-4 border-t border-slate-100 space-y-3">
            <h4 className="text-label text-slate-700 mb-1">
              {t('indices.breakdown', language)}
            </h4>

            {/* Credit Ratio Score */}
            <div className="flex justify-between items-center">
              <span className="text-body-sm text-slate-600">
                {t('indices.creditRatio', language)}
              </span>
              <div className="flex items-center gap-2">
                <div className="w-24 bg-slate-100 rounded-full h-2">
                  <div
                    className="h-2 rounded-full"
                    style={{
                      width: `${(stressIndex.breakdown.creditRatioScore / 40) * 100}%`,
                      backgroundColor: '#3b82f6',
                    }}
                  />
                </div>
                <span className="text-label text-slate-800 w-12 text-right">
                  {Math.round(stressIndex.breakdown.creditRatioScore)}/40
                </span>
              </div>
            </div>

            {/* Cash Buffer Score */}
            <div className="flex justify-between items-center">
              <span className="text-body-sm text-slate-600">
                {t('indices.cashBuffer', language)}
              </span>
              <div className="flex items-center gap-2">
                <div className="w-24 bg-slate-100 rounded-full h-2">
                  <div
                    className="h-2 rounded-full"
                    style={{
                      width: `${(stressIndex.breakdown.cashBufferScore / 35) * 100}%`,
                      backgroundColor: '#3b82f6',
                    }}
                  />
                </div>
                <span className="text-label text-slate-800 w-12 text-right">
                  {Math.round(stressIndex.breakdown.cashBufferScore)}/35
                </span>
              </div>
            </div>

            {/* Expense Volatility Score */}
            <div className="flex justify-between items-center">
              <span className="text-body-sm text-slate-600">
                {t('indices.expenseVolatility', language)}
              </span>
              <div className="flex items-center gap-2">
                <div className="w-24 bg-slate-100 rounded-full h-2">
                  <div
                    className="h-2 rounded-full"
                    style={{
                      width: `${(stressIndex.breakdown.expenseVolatilityScore / 25) * 100}%`,
                      backgroundColor: '#3b82f6',
                    }}
                  />
                </div>
                <span className="text-label text-slate-800 w-12 text-right">
                  {Math.round(stressIndex.breakdown.expenseVolatilityScore)}/25
                </span>
              </div>
            </div>
          </div>
        )}

        <div className="w-full pt-6 border-t border-slate-100 flex justify-center">
          <p className="text-caption text-slate-400 italic">
            {t('indices.calculatedAt', language)}: {calculatedDate}
          </p>
        </div>
      </div>
    </article>
  );
}
