'use client';

import { useState } from 'react';
import { BusinessInsights, Language } from '@/lib/types';
import { t } from '@/lib/translations';

interface InsightsDisplayProps {
  insights: BusinessInsights;
  language: Language;
}

interface InsightSection {
  title: string;
  icon: string;
  content: string | string[];
  key: keyof BusinessInsights;
}

export default function InsightsDisplay({
  insights,
  language,
}: InsightsDisplayProps) {
  const [speaking, setSpeaking] = useState<string | null>(null);

  const sections: InsightSection[] = [
    {
      title: t('trueProfitTitle', language),
      icon: '💵',
      content: insights.trueProfitAnalysis,
      key: 'trueProfitAnalysis',
    },
    {
      title: t('lossMakingProductsTitle', language),
      icon: '⚠️',
      content: insights.lossMakingProducts,
      key: 'lossMakingProducts',
    },
    {
      title: t('blockedCashTitle', language),
      icon: '📦',
      content: insights.blockedInventoryCash,
      key: 'blockedInventoryCash',
    },
    {
      title: t('abnormalExpensesTitle', language),
      icon: '💰',
      content: insights.abnormalExpenses,
      key: 'abnormalExpenses',
    },
    {
      title: t('cashflowForecastTitle', language),
      icon: '📊',
      content: insights.cashflowForecast,
      key: 'cashflowForecast',
    },
  ];

  const handleSpeak = (text: string, key: string) => {
    if (!('speechSynthesis' in window)) {
      return; // Speech synthesis not supported
    }

    // Stop any ongoing speech
    if (speaking) {
      window.speechSynthesis.cancel();
      if (speaking === key) {
        setSpeaking(null);
        return;
      }
    }

    const utterance = new SpeechSynthesisUtterance(text);
    
    // Set language for speech
    if (language === 'hi') {
      utterance.lang = 'hi-IN';
    } else if (language === 'mr') {
      utterance.lang = 'mr-IN';
    } else {
      utterance.lang = 'en-IN';
    }

    utterance.onend = () => {
      setSpeaking(null);
    };

    utterance.onerror = () => {
      setSpeaking(null);
    };

    setSpeaking(key);
    window.speechSynthesis.speak(utterance);
  };

  const handleStopSpeaking = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setSpeaking(null);
    }
  };

  const renderContent = (content: string | string[]) => {
    if (Array.isArray(content)) {
      if (content.length === 0) {
        return <p className="text-gray-600 text-sm">No issues found</p>;
      }
      return (
        <ul className="list-disc list-inside space-y-1">
          {content.map((item, idx) => (
            <li key={idx} className="text-gray-700 text-sm">
              {item}
            </li>
          ))}
        </ul>
      );
    }
    return <p className="text-gray-700 text-sm whitespace-pre-wrap">{content}</p>;
  };

  const getTextContent = (content: string | string[]): string => {
    if (Array.isArray(content)) {
      return content.join('. ');
    }
    return content;
  };

  const isSpeechSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-gray-800 mb-4">
        {t('insights', language)}
      </h2>

      {sections.map((section) => {
        const hasContent = section.content && 
          (Array.isArray(section.content) ? section.content.length > 0 : section.content.trim());
        
        if (!hasContent) return null;

        return (
          <div
            key={section.key}
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-4"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{section.icon}</span>
                <h3 className="text-lg font-semibold text-gray-800">
                  {section.title}
                </h3>
              </div>

              {isSpeechSupported && (
                <button
                  onClick={() =>
                    speaking === section.key
                      ? handleStopSpeaking()
                      : handleSpeak(getTextContent(section.content), section.key)
                  }
                  className="flex items-center gap-1 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors min-h-[36px]"
                >
                  <span>{speaking === section.key ? '⏸️' : '🔊'}</span>
                  <span>
                    {speaking === section.key ? t('stop', language) : t('listen', language)}
                  </span>
                </button>
              )}
            </div>

            <div className="mt-2">{renderContent(section.content)}</div>
          </div>
        );
      })}
    </div>
  );
}
