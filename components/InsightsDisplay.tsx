'use client';

import React, { useState } from 'react';
import { BusinessInsights, Language } from '@/lib/types';
import { t } from '@/lib/translations';
import { Card } from './ui/Card';
import { Button } from './ui/Button';

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
  const [voiceUnavailable, setVoiceUnavailable] = useState<boolean>(false);

  /**
   * Selects an appropriate voice for the given language code.
   * Tries exact match first, then prefix match.
   * Returns null if no matching voice is found.
   */
  const selectVoiceForLanguage = (langCode: string): SpeechSynthesisVoice | null => {
    const voices = window.speechSynthesis.getVoices();
    
    if (voices.length === 0) {
      return null;
    }
    
    // Try exact match first (e.g., 'hi-IN')
    const exactMatch = voices.find(voice => voice.lang === langCode);
    if (exactMatch) {
      return exactMatch;
    }
    
    // Try prefix match (e.g., 'hi' matches 'hi-IN', 'hi-GB')
    const langPrefix = langCode.split('-')[0];
    const prefixMatch = voices.find(voice => voice.lang.startsWith(langPrefix));
    if (prefixMatch) {
      return prefixMatch;
    }
    
    return null;
  };

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
    
    // Map language prop to BCP 47 language code
    let langCode: string;
    if (language === 'hi') {
      langCode = 'hi-IN';
      utterance.lang = 'hi-IN';
    } else if (language === 'mr') {
      langCode = 'mr-IN';
      utterance.lang = 'mr-IN';
    } else {
      langCode = 'en-IN';
      utterance.lang = 'en-IN';
    }

    // Handle asynchronous voice loading
    const setVoiceAndSpeak = () => {
      const selectedVoice = selectVoiceForLanguage(langCode);
      
      if (selectedVoice) {
        utterance.voice = selectedVoice;
        setVoiceUnavailable(false);
      } else {
        // No voice available for the target language
        setVoiceUnavailable(true);
        // Still attempt to speak with lang hint as fallback
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

    // Check if voices are already loaded
    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) {
      setVoiceAndSpeak();
    } else {
      // Wait for voices to load (with timeout)
      let voicesLoaded = false;
      const timeout = setTimeout(() => {
        if (!voicesLoaded) {
          // Timeout reached, proceed anyway
          setVoiceAndSpeak();
        }
      }, 1000);

      const handleVoicesChanged = () => {
        voicesLoaded = true;
        clearTimeout(timeout);
        window.speechSynthesis.removeEventListener('voiceschanged', handleVoicesChanged);
        setVoiceAndSpeak();
      };

      window.speechSynthesis.addEventListener('voiceschanged', handleVoicesChanged);
    }
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
        return <p className="text-neutral-600 text-sm">No issues found</p>;
      }
      return (
        <ul className="list-disc list-inside space-y-1">
          {content.map((item, idx) => (
            <li key={idx} className="text-neutral-700 text-sm">
              {item}
            </li>
          ))}
        </ul>
      );
    }
    return <p className="text-neutral-700 text-sm whitespace-pre-wrap">{content}</p>;
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
      <h2 className="text-2xl font-bold text-neutral-800 mb-4">
        {t('insights', language)}
      </h2>

      {voiceUnavailable && (
        <Card className="bg-warning-50 border border-warning-200 mb-4" density="compact">
          <p className="text-sm text-warning-800">
            {language === 'hi' && 'हिंदी के लिए टेक्स्ट-टू-स्पीच उपलब्ध नहीं है। कृपया अंग्रेजी का उपयोग करें।'}
            {language === 'mr' && 'मराठीसाठी टेक्स्ट-टू-स्पीच उपलब्ध नाही. कृपया इंग्रजी वापरा.'}
            {language === 'en' && 'Text-to-speech is not available for the selected language. Please use English.'}
          </p>
        </Card>
      )}

      {sections.map((section) => {
        const hasContent = section.content && 
          (Array.isArray(section.content) ? section.content.length > 0 : section.content.trim());
        
        if (!hasContent) return null;

        return (
          <Card key={section.key}>
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{section.icon}</span>
                <h3 className="text-lg font-semibold text-neutral-800">
                  {section.title}
                </h3>
              </div>

              {isSpeechSupported && (
                <Button
                  onClick={() =>
                    speaking === section.key
                      ? handleStopSpeaking()
                      : handleSpeak(getTextContent(section.content), section.key)
                  }
                  variant="secondary"
                  size="sm"
                >
                  <span>{speaking === section.key ? '⏸️' : '🔊'}</span>
                  <span>
                    {speaking === section.key ? t('stop', language) : t('listen', language)}
                  </span>
                </Button>
              )}
            </div>

            <div className="mt-2">{renderContent(section.content)}</div>
          </Card>
        );
      })}
    </div>
  );
}
