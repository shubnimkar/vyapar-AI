'use client';

import { useState } from 'react';
import { DailyPrediction, Language } from '@/lib/types';

interface CashFlowPredictorProps {
  userId: string;
  language: Language;
}

export default function CashFlowPredictor({ userId, language }: CashFlowPredictorProps) {
  const [predictions, setPredictions] = useState<DailyPrediction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [insufficientData, setInsufficientData] = useState(false);
  const [explaining, setExplaining] = useState(false);
  const [explanations, setExplanations] = useState<Record<string, string>>({});

  const translations = {
    en: {
      title: 'Cash Flow Prediction',
      predict: 'Predict Next 7 Days',
      loading: 'Analyzing...',
      insufficientData: 'Need at least 7 days of data for prediction',
      error: 'Error',
      negativeAlert: 'Warning: Negative balance predicted',
      date: 'Date',
      balance: 'Balance',
      trend: 'Trend',
      confidence: 'Confidence',
      days: 'days',
      explainPrediction: 'Explain Prediction',
    },
    hi: {
      title: 'कैश फ्लो पूर्वानुमान',
      predict: 'अगले 7 दिनों की भविष्यवाणी करें',
      loading: 'विश्लेषण हो रहा है...',
      insufficientData: 'पूर्वानुमान के लिए कम से कम 7 दिनों का डेटा चाहिए',
      error: 'त्रुटि',
      negativeAlert: 'चेतावनी: नकारात्मक शेष राशि की भविष्यवाणी',
      date: 'तारीख',
      balance: 'शेष राशि',
      trend: 'रुझान',
      confidence: 'विश्वास',
      days: 'दिन',
      explainPrediction: 'पूर्वानुमान समझाएं',
    },
    mr: {
      title: 'रोख प्रवाह अंदाज',
      predict: 'पुढील 7 दिवसांचा अंदाज लावा',
      loading: 'विश्लेषण करत आहे...',
      insufficientData: 'अंदाजासाठी किमान 7 दिवसांचा डेटा आवश्यक आहे',
      error: 'त्रुटी',
      negativeAlert: 'चेतावणी: नकारात्मक शिल्लक अंदाजित',
      date: 'तारीख',
      balance: 'शिल्लक',
      trend: 'ट्रेंड',
      confidence: 'विश्वास',
      days: 'दिवस',
      explainPrediction: 'अंदाज समजावून सांगा',
    },
  };

  const t = translations[language];

  const fetchPredictions = async () => {
    setIsLoading(true);
    setError(null);
    setInsufficientData(false);

    try {
      const response = await fetch('/api/predict-cashflow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Prediction failed');
      }

      if (result.insufficientData) {
        setInsufficientData(true);
        setPredictions([]);
      } else {
        setPredictions(result.predictions || []);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const hasNegativePredictions = predictions.some((p) => p.isNegative);
  const negativeCount = predictions.filter((p) => p.isNegative).length;

  // Fetch explanation for a single language
  const fetchExplanationForLanguage = async (lang: Language): Promise<string> => {
    const response = await fetch('/api/explain', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        metric: 'cashflowPrediction',
        predictions,
        language: lang,
      }),
    });
    const data = await response.json();
    if (data.success && data.explanation) {
      if (typeof data.explanation === 'string') return data.explanation;
      if (typeof data.explanation === 'object' && data.explanation.content) return data.explanation.content;
    }
    throw new Error('Explain failed');
  };

  // Fetch AI explanation for all 3 languages concurrently and cache results
  const handleExplainPrediction = async () => {
    if (predictions.length === 0) return;

    const allLanguages: Language[] = ['en', 'hi', 'mr'];

    // If all languages are already cached, nothing to do
    if (allLanguages.every((l) => explanations[l])) return;

    setExplaining(true);

    try {
      const results = await Promise.allSettled(
        allLanguages.map((lang) => fetchExplanationForLanguage(lang))
      );

      const newCache: Record<string, string> = { ...explanations };
      results.forEach((result, i) => {
        const lang = allLanguages[i];
        if (result.status === 'fulfilled') {
          newCache[lang] = result.value;
        } else {
          newCache[lang] = explanations[lang] || '';
        }
      });

      setExplanations(newCache);
    } finally {
      setExplaining(false);
    }
  };

  const getTrendEmoji = (trend: string) => {
    if (trend === 'up') return '📈';
    if (trend === 'down') return '📉';
    return '➡️';
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 space-y-4 border border-gray-200">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">{t.title}</h3>
        <div className="flex items-center gap-2">
          {predictions.length > 0 && (
            <button
              onClick={handleExplainPrediction}
              disabled={explaining}
              className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1 disabled:text-gray-400 transition-colors"
            >
              ℹ️ {t.explainPrediction}
            </button>
          )}
          {hasNegativePredictions && (
            <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-sm font-medium border border-red-200">
              ⚠️ {negativeCount} {t.days}
            </span>
          )}
        </div>
      </div>

      {predictions.length === 0 && !insufficientData && (
        <button
          onClick={fetchPredictions}
          disabled={isLoading}
          className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:bg-gray-400"
        >
          {isLoading ? `⏳ ${t.loading}` : `🔮 ${t.predict}`}
        </button>
      )}

      {insufficientData && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-yellow-700">
          ℹ️ {t.insufficientData}
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          ⚠️ {t.error}: {error}
        </div>
      )}

      {predictions.length > 0 && (
        <div className="space-y-3">
          {hasNegativePredictions && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm font-medium">
              ⚠️ {t.negativeAlert}
            </div>
          )}

          {/* Loading skeleton while fetching all 3 languages */}
          {explaining && !Object.keys(explanations).length && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg animate-pulse">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-3 h-3 rounded-full bg-blue-300 animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-3 h-3 rounded-full bg-blue-300 animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-3 h-3 rounded-full bg-blue-300 animate-bounce" style={{ animationDelay: '300ms' }} />
                <span className="text-xs text-blue-500 ml-1">
                  {language === 'hi'
                    ? 'AI तीनों भाषाओं में विश्लेषण तैयार कर रहा है…'
                    : language === 'mr'
                      ? 'AI सर्व तीन भाषांमध्ये विश्लेषण तयार करत आहे…'
                      : 'Generating AI explanation in all languages…'}
                </span>
              </div>
              <div className="space-y-2">
                <div className="h-3 bg-blue-200 rounded w-full" />
                <div className="h-3 bg-blue-200 rounded w-5/6" />
                <div className="h-3 bg-blue-200 rounded w-4/6" />
                <div className="h-3 bg-blue-200 rounded w-full mt-3" />
                <div className="h-3 bg-blue-200 rounded w-3/4" />
              </div>
            </div>
          )}

          {/* Explanation — instant language switch from cache */}
          {!explaining && Object.keys(explanations).length > 0 && (() => {
            const currentText = explanations[language];
            const anyText = currentText || Object.values(explanations).find(Boolean);
            const isFallback = !currentText && !!anyText;

            const translateHint: Record<string, string> = {
              hi: 'ऊपर भाषा बदलने पर यही विश्लेषण तुरंत उसी भाषा में दिखेगा।',
              mr: 'वर भाषा बदलल्यास हे विश्लेषण लगेच त्या भाषेत दिसेल.',
              en: 'Switch language at the top to see this explanation in that language instantly.',
            };

            return anyText ? (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{anyText}</p>
                {isFallback && (
                  <p className="mt-2 text-xs text-blue-500 italic">
                    {translateHint[language] || translateHint.en}
                  </p>
                )}
              </div>
            ) : null;
          })()}

          <div className="space-y-2">
            {predictions.map((prediction, index) => (
              <div
                key={index}
                className={`border rounded-lg p-4 ${
                  prediction.isNegative
                    ? 'border-red-300 bg-red-50'
                    : 'border-gray-200 bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-gray-900">
                      {new Date(prediction.date).toLocaleDateString('en-IN', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </div>
                    <div
                      className={`text-lg font-bold ${
                        prediction.isNegative ? 'text-red-600' : 'text-green-600'
                      }`}
                    >
                      {formatCurrency(prediction.predictedBalance)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl">{getTrendEmoji(prediction.trend)}</div>
                    <div className="text-xs text-gray-600 mt-1">
                      {Math.round(prediction.confidence * 100)}% {t.confidence}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
