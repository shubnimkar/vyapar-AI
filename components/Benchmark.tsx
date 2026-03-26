'use client';

import { BenchmarkData, Language } from '@/lib/types';
import { t } from '@/lib/translations';

interface BenchmarkProps {
  benchmark: BenchmarkData;
  language: Language;
}

export default function Benchmark({ benchmark, language }: BenchmarkProps) {
  const title = `📊 ${t('benchmark.title', language)}`;

  const getPerformanceColor = () => {
    if (benchmark.yourMetric >= benchmark.topPerformers) return 'text-success-600';
    if (benchmark.yourMetric >= benchmark.industryAverage) return 'text-primary-600';
    return 'text-orange-600';
  };

  const getPerformanceMessage = () => {
    if (benchmark.yourMetric >= benchmark.topPerformers) {
      return `🎉 ${t('benchmark.category.above_average', language)}`;
    }
    if (benchmark.yourMetric >= benchmark.industryAverage) {
      return `👍 ${t('benchmark.category.at_average', language)}`;
    }
    return `⚠️ ${t('benchmark.category.below_average', language)}`;
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-neutral-200 p-4">
      <h3 className="text-lg font-semibold text-neutral-800 mb-4">{title}</h3>

      <div className="space-y-4">
        <div className={`text-center py-2 ${getPerformanceColor()} font-semibold`}>
          {getPerformanceMessage()}
        </div>

        <div className="space-y-3">
          {/* Your Metric */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-neutral-600">
              {t('benchmark.yourBusiness', language)} {benchmark.metricName}:
            </span>
            <span className="text-lg font-bold text-primary-600">
              {benchmark.yourMetric}
              {benchmark.unit}
            </span>
          </div>

          {/* Industry Average */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-neutral-600">
              {t('benchmark.segmentAverage', language)}:
            </span>
            <span className="text-lg font-semibold text-neutral-700">
              {benchmark.industryAverage}
              {benchmark.unit}
            </span>
          </div>

          {/* Top Performers */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-neutral-600">
              {t('benchmark.category.above_average', language)}:
            </span>
            <span className="text-lg font-semibold text-success-600">
              {benchmark.topPerformers}
              {benchmark.unit}
            </span>
          </div>
        </div>

        {/* Visual Bar */}
        <div className="relative pt-4">
          <div className="h-8 bg-neutral-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-orange-400 via-primary-500 to-green-500"
              style={{
                width: `${(benchmark.yourMetric / benchmark.topPerformers) * 100}%`,
              }}
            />
          </div>
          <div className="flex justify-between text-xs text-neutral-500 mt-1">
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
