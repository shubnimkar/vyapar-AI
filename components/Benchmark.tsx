'use client';

import { BenchmarkData, Language } from '@/lib/types';

interface BenchmarkProps {
  benchmark: BenchmarkData;
  language: Language;
}

export default function Benchmark({ benchmark, language }: BenchmarkProps) {
  const title =
    language === 'hi'
      ? '📊 उद्योग तुलना'
      : language === 'mr'
      ? '📊 उद्योग तुलना'
      : '📊 Industry Comparison';

  const getPerformanceColor = () => {
    if (benchmark.yourMetric >= benchmark.topPerformers) return 'text-green-600';
    if (benchmark.yourMetric >= benchmark.industryAverage) return 'text-blue-600';
    return 'text-orange-600';
  };

  const getPerformanceMessage = () => {
    if (benchmark.yourMetric >= benchmark.topPerformers) {
      return language === 'hi'
        ? '🎉 उत्कृष्ट! आप शीर्ष प्रदर्शन करने वालों में हैं'
        : language === 'mr'
        ? '🎉 उत्कृष्ट! तुम्ही शीर्ष कामगिरी करणाऱ्यांमध्ये आहात'
        : '🎉 Excellent! You\'re among top performers';
    }
    if (benchmark.yourMetric >= benchmark.industryAverage) {
      return language === 'hi'
        ? '👍 अच्छा! आप औसत से ऊपर हैं'
        : language === 'mr'
        ? '👍 चांगले! तुम्ही सरासरीपेक्षा वर आहात'
        : '👍 Good! You\'re above average';
    }
    return language === 'hi'
      ? '⚠️ सुधार की आवश्यकता - औसत से नीचे'
      : language === 'mr'
      ? '⚠️ सुधारणा आवश्यक - सरासरीपेक्षा कमी'
      : '⚠️ Needs improvement - below average';
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">{title}</h3>

      <div className="space-y-4">
        <div className={`text-center py-2 ${getPerformanceColor()} font-semibold`}>
          {getPerformanceMessage()}
        </div>

        <div className="space-y-3">
          {/* Your Metric */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">
              {language === 'hi'
                ? 'आपका'
                : language === 'mr'
                ? 'तुमचा'
                : 'Your'}{' '}
              {benchmark.metricName}:
            </span>
            <span className="text-lg font-bold text-blue-600">
              {benchmark.yourMetric}
              {benchmark.unit}
            </span>
          </div>

          {/* Industry Average */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">
              {language === 'hi'
                ? 'उद्योग औसत'
                : language === 'mr'
                ? 'उद्योग सरासरी'
                : 'Industry Average'}:
            </span>
            <span className="text-lg font-semibold text-gray-700">
              {benchmark.industryAverage}
              {benchmark.unit}
            </span>
          </div>

          {/* Top Performers */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">
              {language === 'hi'
                ? 'शीर्ष प्रदर्शनकर्ता'
                : language === 'mr'
                ? 'शीर्ष कामगिरी'
                : 'Top Performers'}:
            </span>
            <span className="text-lg font-semibold text-green-600">
              {benchmark.topPerformers}
              {benchmark.unit}
            </span>
          </div>
        </div>

        {/* Visual Bar */}
        <div className="relative pt-4">
          <div className="h-8 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-orange-400 via-blue-500 to-green-500"
              style={{
                width: `${(benchmark.yourMetric / benchmark.topPerformers) * 100}%`,
              }}
            />
          </div>
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>0{benchmark.unit}</span>
            <span>
              {benchmark.topPerformers}
              {benchmark.unit}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
