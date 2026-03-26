'use client';

import { Alert, Language } from '@/lib/types';
import { Card } from './ui/Card';

interface AlertsProps {
  alerts: Alert[];
  language: Language;
}

export default function Alerts({ alerts, language }: AlertsProps) {
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-error-50 border-error-300 text-red-900';
      case 'warning':
        return 'bg-orange-50 border-orange-300 text-orange-900';
      case 'good':
        return 'bg-success-50 border-success-300 text-green-900';
      default:
        return 'bg-primary-50 border-primary-300 text-primary-900';
    }
  };

  const title =
    language === 'hi'
      ? '⚡ स्मार्ट अलर्ट'
      : language === 'mr'
      ? '⚡ स्मार्ट अलर्ट'
      : '⚡ Smart Alerts';

  if (alerts.length === 0) return null;

  return (
    <div className="space-y-4">
      <h3 className="text-2xl font-semibold text-neutral-900">{title}</h3>
      <div className="space-y-3">
        {alerts.map((alert, idx) => (
          <Card
            key={idx}
            className={`rounded-2xl border-l-4 p-4 ${getSeverityColor(alert.severity)}`}
          >
            <div className="flex items-center gap-3">
              <span className="text-lg">{alert.icon}</span>
              <p className="text-sm font-medium">{alert.message}</p>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
