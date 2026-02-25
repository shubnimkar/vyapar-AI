'use client';

import { ActionableRecommendation, Language } from '@/lib/types';

interface RecommendationsProps {
  recommendations: ActionableRecommendation[];
  language: Language;
}

export default function Recommendations({
  recommendations,
  language,
}: RecommendationsProps) {
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-50 border-red-200 text-red-800';
      case 'warning':
        return 'bg-orange-50 border-orange-200 text-orange-800';
      case 'good':
        return 'bg-green-50 border-green-200 text-green-800';
      default:
        return 'bg-blue-50 border-blue-200 text-blue-800';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return '🔴';
      case 'warning':
        return '🟡';
      case 'good':
        return '🟢';
      default:
        return '🔵';
    }
  };

  const title =
    language === 'hi'
      ? '🎯 कार्रवाई योग्य सिफारिशें'
      : language === 'mr'
      ? '🎯 कृती योग्य शिफारसी'
      : '🎯 Actionable Recommendations';

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <h2 className="text-xl font-bold text-gray-800 mb-4">{title}</h2>

      <div className="space-y-3">
        {recommendations.map((rec, idx) => (
          <div
            key={idx}
            className={`border rounded-lg p-4 ${getSeverityColor(rec.severity)}`}
          >
            <div className="flex items-start gap-3">
              <span className="text-2xl flex-shrink-0">
                {getSeverityIcon(rec.severity)}
              </span>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-semibold px-2 py-0.5 bg-white rounded">
                    {language === 'hi'
                      ? `प्राथमिकता ${rec.priority}`
                      : language === 'mr'
                      ? `प्राधान्य ${rec.priority}`
                      : `Priority ${rec.priority}`}
                  </span>
                </div>
                <p className="font-semibold text-sm mb-1">{rec.action}</p>
                <p className="text-xs opacity-90">
                  {language === 'hi'
                    ? '💡 प्रभाव: '
                    : language === 'mr'
                    ? '💡 प्रभाव: '
                    : '💡 Impact: '}
                  {rec.impact}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
