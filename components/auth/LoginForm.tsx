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
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <Card className="bg-error-50 border border-error-200" density="compact">
          <p className="text-sm text-error-800">{error}</p>
        </Card>
      )}

      {/* Username or Email */}
      <Input
        type="text"
        label={language === 'hi' ? 'यूज़रनेम या ईमेल' : language === 'mr' ? 'वापरकर्तानाव किंवा ईमेल' : 'Username or email'}
        value={usernameOrEmail}
        onChange={(e) => setUsernameOrEmail(e.target.value)}
        placeholder={language === 'hi' ? 'यूज़रनेम / name@business.com' : language === 'mr' ? 'वापरकर्तानाव / name@business.com' : 'username / name@business.com'}
        disabled={loading}
        required
      />

      {/* Password */}
      <div>
        <label className="block text-sm font-medium text-neutral-700 mb-2">
          {t('passwordLabel', language)}
        </label>
        <div className="relative">
          <input
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-3 pr-12 border-2 border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 focus:outline-none transition-all duration-base min-h-[44px] text-base text-neutral-900 placeholder:text-neutral-400 disabled:bg-neutral-100 disabled:cursor-not-allowed"
            placeholder={language === 'hi' ? 'पासवर्ड' : language === 'mr' ? 'पासवर्ड' : 'Password'}
            disabled={loading}
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-700 transition-colors"
            tabIndex={-1}
          >
            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Remember Device */}
      <div>
        <label className="flex items-center space-x-2 cursor-pointer">
          <input
            type="checkbox"
            checked={rememberDevice}
            onChange={(e) => setRememberDevice(e.target.checked)}
            className="w-4 h-4 text-primary-600 border-neutral-300 rounded focus:ring-primary-500"
            disabled={loading}
          />
          <span className="text-sm text-neutral-700">
            {t('rememberDevice', language)}
          </span>
        </label>
      </div>

      {/* Submit Button */}
      <Button
        type="submit"
        disabled={loading}
        loading={loading}
        fullWidth
        variant="primary"
      >
        {loading 
          ? (language === 'hi' ? 'साइन इन हो रहा है...' : language === 'mr' ? 'साइन इन करत आहे...' : 'Signing in...')
          : t('loginButton', language)
        }
      </Button>

      <div className="text-center">
        <a
          href="/forgot-password"
          className="text-sm font-medium text-blue-600 hover:text-blue-700 underline underline-offset-4"
        >
          {language === 'hi'
            ? 'पासवर्ड भूल गए?'
            : language === 'mr'
              ? 'पासवर्ड विसरलात?'
              : 'Forgot password?'}
        </a>
      </div>
    </form>
  );
}
