'use client';

import { Language } from '@/lib/types';
import { t } from '@/lib/translations';
import { Shield } from 'lucide-react';

interface TrustBannerProps {
  language: Language;
}

export default function TrustBanner({ language }: TrustBannerProps) {
  return (
    <div className="bg-white border border-neutral-200 rounded-xl p-4 sm:p-6 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="bg-primary-50 p-2.5 rounded-2xl flex-shrink-0">
          <Shield className="w-5 h-5 text-primary-600" aria-hidden="true" />
        </div>
        <div className="flex-1">
          <h3 className="text-neutral-900 font-semibold text-sm sm:text-base mb-0.5">
            {language === 'hi' ? 'आपका डेटा सुरक्षित है' : language === 'mr' ? 'तुमचा डेटा सुरक्षित आहे' : 'Your Data is Secure'}
          </h3>
          <p className="text-xs sm:text-sm text-neutral-600 leading-relaxed">
            {t('trustBanner', language)}
          </p>
        </div>
      </div>
    </div>
  );
}
