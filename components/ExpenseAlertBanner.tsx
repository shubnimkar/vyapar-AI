'use client';

import { ExpenseAlert } from '@/lib/types';

interface ExpenseAlertBannerProps {
  alert: ExpenseAlert | null;
  onDismiss: () => void;
  language: 'en' | 'hi';
}

export default function ExpenseAlertBanner({ alert, onDismiss, language }: ExpenseAlertBannerProps) {
  if (!alert) return null;

  const translations = {
    en: {
      dismiss: 'Dismiss',
      warning: 'Warning',
      critical: 'Critical Alert',
    },
    hi: {
      dismiss: 'खारिज करें',
      warning: 'चेतावनी',
      critical: 'गंभीर चेतावनी',
    },
  };

  const t = translations[language];

  const severityStyles = {
    warning: 'bg-yellow-50 border-yellow-300 text-yellow-800',
    critical: 'bg-red-50 border-red-300 text-red-800',
  };

  const severityIcons = {
    warning: '⚠️',
    critical: '🚨',
  };

  return (
    <div
      className={`border-2 rounded-lg p-4 mb-4 ${severityStyles[alert.severity]}`}
      role="alert"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-2">
            <span className="text-2xl">{severityIcons[alert.severity]}</span>
            <span className="font-bold">
              {alert.severity === 'critical' ? t.critical : t.warning}
            </span>
          </div>
          <p className="text-sm leading-relaxed">{alert.explanation}</p>
          <div className="mt-2 text-xs opacity-75">
            {language === 'hi' ? 'श्रेणी' : 'Category'}: {alert.category} | 
            {language === 'hi' ? ' राशि' : ' Amount'}: ₹{alert.expenseAmount.toLocaleString('en-IN')}
          </div>
        </div>
        <button
          onClick={onDismiss}
          className="ml-4 text-gray-500 hover:text-gray-700 font-bold text-xl"
          aria-label={t.dismiss}
        >
          ×
        </button>
      </div>
    </div>
  );
}
