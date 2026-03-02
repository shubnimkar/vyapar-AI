'use client';

import { Language } from '@/lib/types';
import { t } from '@/lib/translations';
import { Shield } from 'lucide-react';

interface TrustBannerProps {
  language: Language;
}

export default function TrustBanner({ language }: TrustBannerProps) {
  return (
    <div className="bg-gradient-to-r from-blue-50 to-green-50 border-l-4 border-blue-500 p-4 mb-6 rounded-lg shadow-sm">
      <div className="flex items-center gap-3">
        <Shield className="w-6 h-6 text-blue-600 flex-shrink-0" aria-hidden="true" />
        <p className="text-sm text-gray-700 font-medium">
          {t('trustBanner', language)}
        </p>
      </div>
    </div>
  );
}
