'use client';

import { Language } from '@/lib/types';
import { t } from '@/lib/translations';
import { Shield } from 'lucide-react';

interface TrustBannerProps {
  language: Language;
}

export default function TrustBanner({ language }: TrustBannerProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
      <div className="flex items-start gap-4">
        <div className="bg-blue-50 p-3 rounded-lg flex-shrink-0">
          <Shield className="w-6 h-6 text-blue-600" aria-hidden="true" />
        </div>
        <div className="flex-1">
          <h3 className="text-gray-900 font-semibold text-base mb-1">
            {language === 'hi' ? 'आपका डेटा सुरक्षित है' : language === 'mr' ? 'तुमचा डेटा सुरक्षित आहे' : 'Your Data is Secure'}
          </h3>
          <p className="text-sm text-gray-600 leading-relaxed">
            {t('trustBanner', language)}
          </p>
        </div>
      </div>
    </div>
  );
}
