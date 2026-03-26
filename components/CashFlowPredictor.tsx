'use client';

import { useState } from 'react';
import { DailyPrediction, Language } from '@/lib/types';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

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
    <Card className="space-y-5 rounded-2xl">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-semibold text-neutral-900">{t.title}</h3>
        <div className="flex items-center gap-2">
          {predictions.length > 0 && (
            <Button
              onClick={handleExplainPrediction}
              disabled={explaining}
              variant="ghost"
              size="sm"
              className="text-primary-600 hover:bg-transparent hover:text-primary-700"
            >
              ℹ️ {t.explainPrediction}
            </Button>
          )}
          {hasNegativePredictions && (
            <span className="rounded-full border border-error-200 bg-error-50 px-3 py-1 text-sm font-medium text-error-700">
              ⚠️ {negativeCount} {t.days}
            </span>
          )}
        </div>
      </div>

      {predictions.length === 0 && !insufficientData && (
        <Button
          onClick={fetchPredictions}
          disabled={isLoading}
          variant="primary"
          size="md"
          fullWidth
        >
          {isLoading ? `⏳ ${t.loading}` : `🔮 ${t.predict}`}
        </Button>
      )}

      {insufficientData && (
        <div className="rounded-xl border border-yellow-200 bg-warning-50 p-4 text-warning-700">
          ℹ️ {t.insufficientData}
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-error-200 bg-error-50 p-4 text-error-700">
          ⚠️ {t.error}: {error}
        </div>
      )}

      {predictions.length > 0 && (
        <div className="space-y-3">
          {hasNegativePredictions && (
            <div className="rounded-xl border border-error-200 bg-error-50 p-3 text-sm font-medium text-error-700">
              ⚠️ {t.negativeAlert}
            </div>
          )}

          {/* Loading skeleton while fetching all 3 languages */}
          {explaining && !Object.keys(explanations).length && (
              <div className="rounded-xl border border-primary-200 bg-primary-50 p-4 animate-pulse">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-3 h-3 rounded-full bg-primary-300 animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-3 h-3 rounded-full bg-primary-300 animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-3 h-3 rounded-full bg-primary-300 animate-bounce" style={{ animationDelay: '300ms' }} />
                <span className="text-xs text-primary-600 ml-1">
                  {language === 'hi'
                    ? 'AI तीनों भाषाओं में विश्लेषण तैयार कर रहा है…'
                    : language === 'mr'
                      ? 'AI सर्व तीन भाषांमध्ये विश्लेषण तयार करत आहे…'
                      : 'Generating AI explanation in all languages…'}
                </span>
              </div>
              <div className="space-y-2">
                <div className="h-3 bg-primary-200 rounded w-full" />
                <div className="h-3 bg-primary-200 rounded w-5/6" />
                <div className="h-3 bg-primary-200 rounded w-4/6" />
                <div className="h-3 bg-primary-200 rounded w-full mt-3" />
                <div className="h-3 bg-primary-200 rounded w-3/4" />
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
              <div className="rounded-xl border border-primary-200 bg-primary-50 p-4">
                <p className="text-sm text-neutral-700 whitespace-pre-wrap">{anyText}</p>
                {isFallback && (
                  <p className="mt-2 text-xs text-primary-600 italic">
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
                className={`rounded-xl border p-4 ${
                  prediction.isNegative
                    ? 'border-error-300 bg-error-50'
                    : 'border-neutral-200 bg-neutral-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-neutral-900">
                      {new Date(prediction.date).toLocaleDateString('en-IN', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </div>
                    <div
                      className={`text-lg font-bold ${
                        prediction.isNegative ? 'text-error-600' : 'text-success-600'
                      }`}
                    >
                      {formatCurrency(prediction.predictedBalance)}
                    </div>
                  </div>
                    <div className="text-right">
                      <div className="text-2xl">{getTrendEmoji(prediction.trend)}</div>
                    <div className="mt-1 text-xs text-neutral-500">
                      {Math.round(prediction.confidence * 100)}% {t.confidence}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}
