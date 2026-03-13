'use client';

import { useState } from 'react';
import { Language } from '@/lib/types';
import { t } from '@/lib/translations';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Eye, EyeOff } from 'lucide-react';

interface LoginFormProps {
  onSubmit: (usernameOrEmail: string, password: string, rememberDevice: boolean) => Promise<void>;
  loading: boolean;
  error: string;
  language: Language;
}

export default function LoginForm({ onSubmit, loading, error, language }: LoginFormProps) {
  const [usernameOrEmail, setUsernameOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberDevice, setRememberDevice] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(usernameOrEmail, password, rememberDevice);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <Card className="border border-red-200 bg-red-50 shadow-none" density="compact">
          <p className="text-sm font-medium text-red-700">{error}</p>
        </Card>
      )}

      <div className="space-y-4 rounded-3xl border border-slate-200 bg-white p-1">
        <Input
          type="text"
          label={language === 'hi' ? 'यूज़रनेम या ईमेल' : language === 'mr' ? 'वापरकर्तानाव किंवा ईमेल' : 'Username or email'}
          value={usernameOrEmail}
          onChange={(e) => setUsernameOrEmail(e.target.value)}
          placeholder={language === 'hi' ? 'यूज़रनेम / name@business.com' : language === 'mr' ? 'वापरकर्तानाव / name@business.com' : 'username / name@business.com'}
          disabled={loading}
          required
          autoFocus
        />

        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-700">
            {t('passwordLabel', language)}
          </label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3.5 pr-12 text-base text-slate-900 transition-all duration-base placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100"
              placeholder={language === 'hi' ? 'पासवर्ड' : language === 'mr' ? 'पासवर्ड' : 'Password'}
              disabled={loading}
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-slate-600"
              tabIndex={-1}
            >
              {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-4">
        <label className="flex cursor-pointer items-center gap-3">
          <input
            type="checkbox"
            checked={rememberDevice}
            onChange={(e) => setRememberDevice(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
            disabled={loading}
          />
          <span className="text-sm font-medium text-slate-700">
            {t('rememberDevice', language)}
          </span>
        </label>
        <a
          href="/forgot-password"
          className="text-sm font-semibold text-blue-600 underline decoration-blue-200 underline-offset-4 transition-colors hover:text-blue-700"
        >
          {language === 'hi'
            ? 'पासवर्ड भूल गए?'
            : language === 'mr'
              ? 'पासवर्ड विसरलात?'
              : 'Forgot password?'}
        </a>
      </div>

      <Button
        type="submit"
        disabled={loading}
        loading={loading}
        fullWidth
        variant="primary"
        className="min-h-[52px] rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-base font-semibold text-white shadow-[0_18px_32px_-18px_rgba(37,99,235,0.65)] hover:from-blue-700 hover:to-indigo-700 focus:ring-blue-500"
      >
        {loading 
          ? (language === 'hi' ? 'साइन इन हो रहा है...' : language === 'mr' ? 'साइन इन करत आहे...' : 'Signing in...')
          : t('loginButton', language)
        }
      </Button>
    </form>
  );
}
