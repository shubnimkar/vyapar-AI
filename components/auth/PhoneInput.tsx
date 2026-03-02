'use client';

import { useState } from 'react';
import { Language } from '@/lib/types';
import { t } from '@/lib/translations';

interface PhoneInputProps {
  onSubmit: (phoneNumber: string) => void;
  loading: boolean;
  error?: string;
  language: Language;
}

export default function PhoneInput({ onSubmit, loading, error, language }: PhoneInputProps) {
  const [phone, setPhone] = useState('');
  const [localError, setLocalError] = useState('');

  const validatePhone = (value: string): boolean => {
    // Remove any non-digit characters
    const digits = value.replace(/\D/g, '');
    
    if (digits.length === 0) {
      setLocalError('');
      return false;
    }
    
    if (digits.length < 10) {
      setLocalError(t('phoneTooShort', language));
      return false;
    }
    
    if (digits.length > 10) {
      setLocalError(t('phoneTooLong', language));
      return false;
    }
    
    // Check if starts with 6, 7, 8, or 9
    if (!['6', '7', '8', '9'].includes(digits[0])) {
      setLocalError(t('phoneInvalidFormat', language));
      return false;
    }
    
    setLocalError('');
    return true;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, ''); // Only allow digits
    if (value.length <= 10) {
      setPhone(value);
      validatePhone(value);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (validatePhone(phone) && phone.length === 10) {
      // Format to E.164 format
      const formattedPhone = `+91${phone}`;
      onSubmit(formattedPhone);
    }
  };

  const displayError = error || localError;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
          {t('phoneNumber', language)}
        </label>
        <div className="flex items-center">
          <span className="inline-flex items-center px-3 py-3 text-gray-700 bg-gray-100 border border-r-0 border-gray-300 rounded-l-md">
            +91
          </span>
          <input
            id="phone"
            type="tel"
            inputMode="numeric"
            value={phone}
            onChange={handleChange}
            placeholder={t('enterPhoneNumber', language)}
            disabled={loading}
            className="flex-1 px-4 py-3 border border-gray-300 rounded-r-md focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed text-lg"
            style={{ minHeight: '44px' }}
            autoComplete="tel"
            required
          />
        </div>
        {displayError && (
          <p className="mt-2 text-sm text-red-600">{displayError}</p>
        )}
      </div>

      <button
        type="submit"
        disabled={loading || phone.length !== 10 || !!localError}
        className="w-full px-6 py-3 text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors text-lg font-medium"
        style={{ minHeight: '44px' }}
      >
        {loading ? t('sending', language) : t('sendOTP', language)}
      </button>
    </form>
  );
}
