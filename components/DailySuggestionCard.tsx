'use client';

import { useState } from 'react';
import { DailySuggestion, Language } from '@/lib/types';
import { t } from '@/lib/translations';

interface DailySuggestionCardProps {
  suggestions: DailySuggestion[];
  language: Language;
  onDismiss: (suggestionId: string) => void;
}

/**
 * Daily Suggestion Card Component
 * 
 * Displays the highest priority undismissed suggestion with:
 * - Severity-based styling (critical=red, warning=orange, info=blue)
 * - Localized title and description
 * - Dismiss functionality
 * - Accessibility features
 */
export default function DailySuggestionCard({
  suggestions,
  language,
  onDismiss
}: DailySuggestionCardProps) {
  const [dismissing, setDismissing] = useState(false);

  // Filter undismissed suggestions
  const undismissed = suggestions.filter(s => !s.dismissed_at);
  
  if (undismissed.length === 0) {
    return null;
  }
  
  // Sort by severity (critical > warning > info)
  const sortedSuggestions = [...undismissed].sort((a, b) => {
    const severityOrder = { critical: 0, warning: 1, info: 2 };
    return severityOrder[a.severity] - severityOrder[b.severity];
  });
  
  const topSuggestion = sortedSuggestions[0];
  
  // Severity configuration
  const severityConfig = {
    critical: {
      icon: '⚠️',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-500',
      textColor: 'text-red-900',
      iconBg: 'bg-red-100'
    },
    warning: {
      icon: '⚡',
      bgColor: 'bg-orange-50',
      borderColor: 'border-orange-500',
      textColor: 'text-orange-900',
      iconBg: 'bg-orange-100'
    },
    info: {
      icon: '💡',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-500',
      textColor: 'text-blue-900',
      iconBg: 'bg-blue-100'
    }
  };
  
  const config = severityConfig[topSuggestion.severity];
  
  const handleDismiss = async () => {
    setDismissing(true);
    try {
      await onDismiss(topSuggestion.id);
    } catch (error) {
      console.error('Failed to dismiss suggestion:', error);
    } finally {
      setDismissing(false);
    }
  };
  
  return (
    <div
      className={`${config.bgColor} ${config.borderColor} border-l-4 p-4 rounded-lg shadow-sm mb-4`}
      role="alert"
      aria-live="polite"
      aria-atomic="true"
    >
      <div className="flex justify-between items-start gap-4">
        <div className="flex-1">
          {/* Header with icon and title */}
          <div className="flex items-center gap-3 mb-2">
            <div className={`${config.iconBg} rounded-full p-2 flex items-center justify-center`}>
              <span className="text-2xl" role="img" aria-label={topSuggestion.severity}>
                {config.icon}
              </span>
            </div>
            <h3 className={`font-semibold text-lg ${config.textColor}`}>
              {t('daily.todaysSuggestion', language)}
            </h3>
          </div>
          
          {/* Suggestion content */}
          <div className="ml-14">
            <h4 className={`font-medium mb-1 ${config.textColor}`}>
              {topSuggestion.title}
            </h4>
            <p className={`text-sm ${config.textColor} opacity-90`}>
              {topSuggestion.description}
            </p>
          </div>
        </div>
        
        {/* Dismiss button */}
        <button
          onClick={handleDismiss}
          disabled={dismissing}
          className="ml-2 text-gray-400 hover:text-gray-600 transition-colors p-1 rounded focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
          aria-label={t('dismiss', language)}
          title={t('dismiss', language)}
        >
          {dismissing ? (
            <span className="inline-block animate-spin">⏳</span>
          ) : (
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          )}
        </button>
      </div>
      
      {/* Additional suggestions indicator */}
      {undismissed.length > 1 && (
        <div className="mt-3 ml-14 text-xs text-gray-600">
          +{undismissed.length - 1} {undismissed.length === 2 ? 'more suggestion' : 'more suggestions'}
        </div>
      )}
    </div>
  );
}
