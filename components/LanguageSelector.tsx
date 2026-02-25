'use client';

import { useEffect, useState } from 'react';
import { Language } from '@/lib/types';

interface LanguageSelectorProps {
  currentLanguage: Language;
  onLanguageChange: (lang: Language) => void;
}

const languages = [
  { code: 'en' as Language, name: 'English', nativeName: 'English' },
  { code: 'hi' as Language, name: 'Hindi', nativeName: 'हिंदी' },
  { code: 'mr' as Language, name: 'Marathi', nativeName: 'मराठी' },
];

export default function LanguageSelector({
  currentLanguage,
  onLanguageChange,
}: LanguageSelectorProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleLanguageChange = (lang: Language) => {
    // Store in localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('vyapar-lang', lang);
    }
    onLanguageChange(lang);
  };

  if (!mounted) {
    return null; // Avoid hydration mismatch
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-sm text-gray-600">🌐</span>
      {languages.map((lang) => (
        <button
          key={lang.code}
          onClick={() => handleLanguageChange(lang.code)}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            currentLanguage === lang.code
              ? 'bg-blue-500 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          {lang.nativeName}
        </button>
      ))}
    </div>
  );
}
