'use client';

import { useState } from 'react';
import { Language } from '@/lib/types';
import { t } from '@/lib/translations';

interface CredentialsInputProps {
  onSubmit: (username: string, password: string) => void;
  loading: boolean;
  error?: string;
  language: Language;
}

export default function CredentialsInput({ onSubmit, loading, error, language }: CredentialsInputProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [localErrors, setLocalErrors] = useState({
    username: '',
    password: ''
  });

  const validateUsername = (value: string): boolean => {
    if (value.length === 0) {
      setLocalErrors(prev => ({ ...prev, username: '' }));
      return false;
    }
    
    if (value.trim().length < 2) {
      setLocalErrors(prev => ({ 
        ...prev, 
        username: language === 'hi' ? 'उपयोगकर्ता नाम कम से कम 2 अक्षर का होना चाहिए' :
                  language === 'mr' ? 'वापरकर्ता नाव किमान 2 अक्षरांचे असावे' :
                  'Username must be at least 2 characters'
      }));
      return false;
    }
    
    setLocalErrors(prev => ({ ...prev, username: '' }));
    return true;
  };

  const validatePassword = (value: string): boolean => {
    if (value.length === 0) {
      setLocalErrors(prev => ({ ...prev, password: '' }));
      return false;
    }
    
    if (value.length < 3) {
      setLocalErrors(prev => ({ 
        ...prev, 
        password: language === 'hi' ? 'पासवर्ड कम से कम 3 अक्षर का होना चाहिए' :
                  language === 'mr' ? 'पासवर्ड किमान 3 अक्षरांचा असावा' :
                  'Password must be at least 3 characters'
      }));
      return false;
    }
    
    setLocalErrors(prev => ({ ...prev, password: '' }));
    return true;
  };

  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.trim();
    setUsername(value);
    validateUsername(value);
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setPassword(value);
    validatePassword(value);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const isUsernameValid = validateUsername(username);
    const isPasswordValid = validatePassword(password);
    
    if (isUsernameValid && isPasswordValid) {
      onSubmit(username, password);
    }
  };

  const hasLocalErrors = localErrors.username || localErrors.password;
  const isFormValid = username.trim().length >= 2 && password.length >= 3 && !hasLocalErrors;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Username Field */}
      <div>
        <label htmlFor="username" className="block text-sm font-medium text-[#4a4c4e] mb-2">
          {language === 'hi' ? 'उपयोगकर्ता नाम' : 
           language === 'mr' ? 'वापरकर्ता नाव' : 
           'Username'}
        </label>
        <input
          id="username"
          type="text"
          value={username}
          onChange={handleUsernameChange}
          placeholder={
            language === 'hi' ? 'अपना उपयोगकर्ता नाम दर्ज करें' :
            language === 'mr' ? 'तुमचे वापरकर्ता नाव प्रविष्ट करा' :
            'Enter your username'
          }
          disabled={loading}
          className="w-full px-4 py-3 border border-[rgba(26,28,29,0.20)] rounded-md focus:ring-2 focus:ring-[rgba(11,26,125,0.20)] focus:border-[rgba(11,26,125,0.50)] focus:outline-none disabled:bg-neutral-50 disabled:cursor-not-allowed text-lg"
          style={{ minHeight: '44px' }}
          autoComplete="username"
          required
        />
        {localErrors.username && (
          <p className="mt-2 text-sm text-error-600">{localErrors.username}</p>
        )}
      </div>

      {/* Password Field */}
      <div>
        <label htmlFor="password" className="block text-sm font-medium text-[#4a4c4e] mb-2">
          {language === 'hi' ? 'पासवर्ड' : 
           language === 'mr' ? 'पासवर्ड' : 
           'Password'}
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={handlePasswordChange}
          placeholder={
            language === 'hi' ? 'अपना पासवर्ड दर्ज करें' :
            language === 'mr' ? 'तुमचा पासवर्ड प्रविष्ट करा' :
            'Enter your password'
          }
          disabled={loading}
          className="w-full px-4 py-3 border border-[rgba(26,28,29,0.20)] rounded-md focus:ring-2 focus:ring-[rgba(11,26,125,0.20)] focus:border-[rgba(11,26,125,0.50)] focus:outline-none disabled:bg-neutral-50 disabled:cursor-not-allowed text-lg"
          style={{ minHeight: '44px' }}
          autoComplete="current-password"
          required
        />
        {localErrors.password && (
          <p className="mt-2 text-sm text-error-600">{localErrors.password}</p>
        )}
      </div>

      {/* Server Error Display */}
      {error && (
        <div className="p-3 bg-error-50 border border-error-200 rounded-md">
          <p className="text-sm text-error-600">{error}</p>
        </div>
      )}

      {/* Submit Button */}
      <button
        type="submit"
        disabled={loading || !isFormValid}
        className="w-full px-6 py-3 text-white bg-primary-gradient rounded-md hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-[rgba(11,26,125,0.40)] focus:ring-offset-2 disabled:bg-neutral-400 disabled:cursor-not-allowed transition-colors text-lg font-medium"
        style={{ minHeight: '44px' }}
      >
        {loading ? (
          language === 'hi' ? 'साइन इन हो रहा है...' :
          language === 'mr' ? 'साइन इन होत आहे...' :
          'Signing in...'
        ) : (
          language === 'hi' ? 'साइन इन करें' :
          language === 'mr' ? 'साइन इन करा' :
          'Sign In'
        )}
      </button>

      {/* Demo Credentials Info */}
      <div className="mt-4 p-3 bg-primary-50 border border-primary-100 rounded-md">
        <p className="text-xs text-primary-700">
          {language === 'hi' ? '💡 डेमो के लिए: उपयोगकर्ता नाम "admin" और पासवर्ड "vyapar123" का उपयोग करें' :
           language === 'mr' ? '💡 डेमोसाठी: वापरकर्ता नाव "admin" आणि पासवर्ड "vyapar123" वापरा' :
           '💡 For demo: Use username "admin" and password "vyapar123"'}
        </p>
      </div>
    </form>
  );
}