'use client';

import { useEffect, useState } from 'react';
import { Language } from '@/lib/types';
import { t } from '@/lib/translations';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [language, setLanguage] = useState<Language>('en');

  // Load language preference from localStorage for consistent i18n.
  const readStoredLanguage = () => {
    const storedLanguage =
      localStorage.getItem('vyapar-lang') ||
      localStorage.getItem('language') ||
      localStorage.getItem('vyapar-language');
    if (storedLanguage && ['en', 'hi', 'mr'].includes(storedLanguage)) return storedLanguage as Language;
    return 'en' as Language;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await fetch('/api/auth/request-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      setSubmitted(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const lang = readStoredLanguage();
    setLanguage(lang);
    document.documentElement.lang = lang;
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4 py-6">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-6 sm:p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">{t('auth.forgot.title', language)}</h1>
        <p className="text-sm text-gray-600 mb-6">{t('auth.forgot.description', language)}</p>

        {submitted ? (
          <div className="space-y-4">
            <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800">
              {t('auth.forgot.sentMessage', language)}
            </div>
            <a className="text-blue-600 underline underline-offset-4" href="/login">
              {t('auth.forgot.backToLogin', language)}
            </a>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">{t('auth.forgot.emailLabel', language)}</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none"
                placeholder="name@business.com"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full min-h-[44px] rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:opacity-60"
            >
              {loading ? t('auth.forgot.sending', language) : t('auth.forgot.sendResetLink', language)}
            </button>
            <div className="text-center">
              <a className="text-sm text-gray-600 underline underline-offset-4" href="/login">
                {t('auth.forgot.backToLogin', language)}
              </a>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

