'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Language } from '@/lib/types';
import { t } from '@/lib/translations';

export default function ResetPasswordClient() {
  const params = useSearchParams();
  const router = useRouter();
  const token = useMemo(() => params.get('token') || '', [params]);

  const [language, setLanguage] = useState<Language>('en');
  const [validating, setValidating] = useState(true);
  const [valid, setValid] = useState(false);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      setValidating(true);
      try {
        const res = await fetch(`/api/auth/validate-reset?token=${encodeURIComponent(token)}`);
        const json = await res.json();
        setValid(Boolean(json?.valid));
      } catch {
        setValid(false);
      } finally {
        setValidating(false);
      }
    };
    if (token) run();
    else {
      setValid(false);
      setValidating(false);
    }
  }, [token]);

  useEffect(() => {
    const storedLanguage =
      localStorage.getItem('vyapar-lang') ||
      localStorage.getItem('language') ||
      localStorage.getItem('vyapar-language');

    if (storedLanguage && ['en', 'hi', 'mr'].includes(storedLanguage)) {
      setLanguage(storedLanguage as Language);
      document.documentElement.lang = storedLanguage;
    }
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password !== confirm) {
      setError(t('passwordsNoMatch', language));
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword: password }),
      });
      const json = await res.json();
      if (!res.ok || !json?.success) {
        setError(t('auth.reset.invalidOrExpired', language));
        return;
      }
      setDone(true);
      setTimeout(() => router.push('/login'), 800);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4 py-6">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-6 sm:p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">{t('auth.reset.title', language)}</h1>

        {validating ? (
          <p className="text-sm text-gray-600">{t('auth.reset.validating', language)}</p>
        ) : !valid ? (
          <div className="space-y-4">
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              {t('auth.reset.invalidTitle', language)}
            </div>
            <a className="text-blue-600 underline underline-offset-4" href="/forgot-password">
              {t('auth.reset.requestNewLink', language)}
            </a>
          </div>
        ) : done ? (
          <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-900">
            {t('auth.reset.doneMessage', language)}
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4 mt-4">
            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                {error}
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">{t('auth.reset.newPasswordLabel', language)}</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none"
                required
                minLength={8}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">{t('auth.reset.confirmPasswordLabel', language)}</label>
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none"
                required
                minLength={8}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full min-h-[44px] rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:opacity-60"
            >
              {loading ? t('auth.reset.updating', language) : t('auth.reset.updatePassword', language)}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

