'use client';

import { Language } from '@/lib/types';

interface ErrorDisplayProps {
  error: string;
  language: Language;
  onRetry?: () => void;
}

export default function ErrorDisplay({
  error,
  language,
  onRetry,
}: ErrorDisplayProps) {
  const retryText = {
    en: 'Try Again',
    hi: 'पुनः प्रयास करें',
    mr: 'पुन्हा प्रयत्न करा',
  };

  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
      <div className="flex items-start gap-3">
        <span className="text-2xl">⚠️</span>
        <div className="flex-1">
          <p className="text-red-800 font-medium mb-2">{error}</p>
          {onRetry && (
            <button
              onClick={onRetry}
              className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-700 transition-colors min-h-[36px]"
            >
              {retryText[language]}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
