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
  const [explanation, setExplanation] = useState('');

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

  const handleExplainPrediction = async () => {
    if (predictions.length === 0) return;
    
    setExplaining(true);
    setExplanation('');
    
    try {
      const response = await fetch('/api/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          metric: 'cashflowPrediction',
          predictions,
          language,
        }),
      });

      const data = await response.json();
      if (data.success && data.explanation) {
        // Handle both flat string and nested object formats for backward compatibility
        if (typeof data.explanation === 'string') {
          setExplanation(data.explanation);
        } else if (typeof data.explanation === 'object' && data.explanation.content) {
          setExplanation(data.explanation.content);
        } else {
          setExplanation('Unable to generate explanation at this time.');
        }
      } else {
        setExplanation('Unable to generate explanation at this time.');
      }
    } catch (err) {
      setExplanation('Unable to generate explanation at this time.');
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

          {explanation && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{explanation}</p>
            </div>
          )}

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
