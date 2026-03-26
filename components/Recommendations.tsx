'use client';

import { ActionableRecommendation, Language } from '@/lib/types';
import { Card } from './ui/Card';

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
        return 'bg-primary-50 border-primary-200 text-primary-800';
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
    <Card className="rounded-2xl">
      <h2 className="mb-4 text-2xl font-semibold text-neutral-900">{title}</h2>

      <div className="space-y-3">
        {recommendations.map((rec, idx) => (
          <div
            key={idx}
            className={`rounded-2xl border p-5 ${getSeverityColor(rec.severity)}`}
          >
            <div className="flex items-start gap-3">
              <span className="text-2xl flex-shrink-0">
                {getSeverityIcon(rec.severity)}
              </span>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold">
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
    </Card>
  );
}
