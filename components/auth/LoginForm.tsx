'use client';

import { useState, useEffect } from 'react';
import { Language } from '@/lib/types';
import { t } from '@/lib/translations';
import { Eye, EyeOff } from 'lucide-react';

const REMEMBER_ME_KEY = 'vyapar-remember-username';

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

  useEffect(() => {
    const saved = localStorage.getItem(REMEMBER_ME_KEY);
    if (saved) { setUsernameOrEmail(saved); setRememberDevice(true); }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    rememberDevice ? localStorage.setItem(REMEMBER_ME_KEY, usernameOrEmail) : localStorage.removeItem(REMEMBER_ME_KEY);
    await onSubmit(usernameOrEmail, password, rememberDevice);
  };

  const inputCls = "w-full rounded-xl border border-[rgba(26,28,29,0.15)] bg-white px-4 py-3.5 text-base text-[#1a1c1d] placeholder:text-[#ababab] focus:border-[#0b1a7d] focus:outline-none focus:ring-2 focus:ring-[rgba(11,26,125,0.10)] disabled:bg-[#f3f3f5] disabled:cursor-not-allowed transition-all";
  const labelCls = "block text-sm font-semibold text-[#1a1c1d] mb-2";

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="rounded-xl bg-error-50 border border-error-200 px-4 py-3">
          <p className="text-sm font-medium text-error-700">{error}</p>
        </div>
      )}

      {/* Username / email */}
      <div>
        <label className={labelCls}>
          {language === 'hi' ? 'यूज़रनेम या ईमेल' : language === 'mr' ? 'वापरकर्तानाव किंवा ईमेल' : 'Username or email'}
          <span className="text-error-500 ml-1">*</span>
        </label>
        <input
          type="text"
          value={usernameOrEmail}
          onChange={(e) => setUsernameOrEmail(e.target.value)}
          className={inputCls}
          placeholder={language === 'hi' ? 'यूज़रनेम / name@business.com' : language === 'mr' ? 'वापरकर्तानाव / name@business.com' : 'username / name@business.com'}
          disabled={loading}
          required
          autoFocus
        />
      </div>

      {/* Password */}
      <div>
        <label className={labelCls}>{t('passwordLabel', language)}</label>
        <div className="relative">
          <input
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={`${inputCls} pr-12`}
            placeholder={language === 'hi' ? 'पासवर्ड' : language === 'mr' ? 'पासवर्ड' : 'Password'}
            disabled={loading}
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-[#7a7c7e] hover:text-[#1a1c1d] transition-colors"
            tabIndex={-1}
          >
            {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Remember + Forgot */}
      <div className="flex items-center justify-between">
        <label className="flex cursor-pointer items-center gap-2.5">
          <input
            type="checkbox"
            checked={rememberDevice}
            onChange={(e) => setRememberDevice(e.target.checked)}
            className="h-4 w-4 rounded border-[rgba(26,28,29,0.25)] accent-[#0b1a7d]"
            disabled={loading}
          />
          <span className="text-sm font-medium text-[#4a4c4e]">{t('rememberDevice', language)}</span>
        </label>
        <a
          href="/forgot-password"
          className="text-sm font-bold text-[#0b1a7d] hover:text-[#091563] transition-colors"
        >
          {language === 'hi' ? 'पासवर्ड भूल गए?' : language === 'mr' ? 'पासवर्ड विसरलात?' : 'Forgot password?'}
        </a>
      </div>

      {/* Submit — deep indigo, full width, large */}
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-xl bg-[#0b1a7d] py-4 text-base font-semibold text-white transition-all hover:bg-[#091563] focus:outline-none focus:ring-2 focus:ring-[rgba(11,26,125,0.40)] focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed min-h-[52px]"
      >
        {loading
          ? (language === 'hi' ? 'साइन इन हो रहा है...' : language === 'mr' ? 'साइन इन करत आहे...' : 'Signing in...')
          : t('loginButton', language)}
      </button>
    </form>
  );
}
