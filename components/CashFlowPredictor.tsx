'use client';

import { useState } from 'react';
import { DailyPrediction } from '@/lib/types';

interface CashFlowPredictorProps {
  userId: string;
  language: 'en' | 'hi';
}

export default function CashFlowPredictor({ userId, language }: CashFlowPredictorProps) {
  const [predictions, setPredictions] = useState<DailyPrediction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [insufficientData, setInsufficientData] = useState(false);

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
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const hasNegativePredictions = predictions.some((p) => p.isNegative);
  const negativeCount = predictions.filter((p) => p.isNegative).length;

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
    <div className="bg-white rounded-lg shadow-md p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-800">{t.title}</h3>
        {hasNegativePredictions && (
          <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-sm font-medium">
            ⚠️ {negativeCount} {language === 'hi' ? 'दिन' : 'days'}
          </span>
        )}
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
                    <div className="font-medium text-gray-800">
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

          <button
            onClick={fetchPredictions}
            disabled={isLoading}
            className="w-full bg-gray-200 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors text-sm"
          >
            🔄 {language === 'hi' ? 'रीफ्रेश करें' : 'Refresh'}
          </button>
        </div>
      )}
    </div>
  );
}
