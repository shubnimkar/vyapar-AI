'use client';

import { useState, useRef, useEffect } from 'react';
import { Language } from '@/lib/types';
import { t } from '@/lib/translations';

interface OTPInputProps {
  phoneNumber: string;
  onVerify: (code: string) => void;
  onResend: () => void;
  loading: boolean;
  error?: string;
  canResend: boolean;
  resendCountdown: number;
  language: Language;
}

export default function OTPInput({
  phoneNumber,
  onVerify,
  onResend,
  loading,
  error,
  canResend,
  resendCountdown,
  language,
}: OTPInputProps) {
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    // Auto-focus first input on mount
    inputRefs.current[0]?.focus();
  }, []);

  useEffect(() => {
    // Auto-submit when all 6 digits are entered
    if (otp.every(digit => digit !== '') && !loading) {
      const code = otp.join('');
      onVerify(code);
    }
  }, [otp, loading, onVerify]);

  const handleChange = (index: number, value: string) => {
    // Only allow digits
    const digit = value.replace(/\D/g, '');
    
    if (digit.length > 1) {
      // Handle paste
      handlePaste(digit);
      return;
    }

    const newOtp = [...otp];
    newOtp[index] = digit;
    setOtp(newOtp);

    // Auto-focus next input
    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      // Move to previous input on backspace if current is empty
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (pastedData: string) => {
    const digits = pastedData.replace(/\D/g, '').slice(0, 6);
    const newOtp = [...otp];
    
    for (let i = 0; i < digits.length; i++) {
      newOtp[i] = digits[i];
    }
    
    setOtp(newOtp);
    
    // Focus the next empty input or the last one
    const nextEmptyIndex = newOtp.findIndex(digit => digit === '');
    const focusIndex = nextEmptyIndex === -1 ? 5 : nextEmptyIndex;
    inputRefs.current[focusIndex]?.focus();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const code = otp.join('');
    if (code.length === 6) {
      onVerify(code);
    }
  };

  const formatPhoneDisplay = (phone: string) => {
    // Format +91XXXXXXXXXX to +91 XXXXX XXXXX
    if (phone.startsWith('+91')) {
      const digits = phone.slice(3);
      return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
    }
    return phone;
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="text-center">
        <p className="text-sm text-gray-600 mb-4">
          {t('otpSentTo', language)}: <span className="font-medium">{formatPhoneDisplay(phoneNumber)}</span>
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3 text-center">
          {t('enterOTP', language)}
        </label>
        <div className="flex justify-center gap-2">
          {otp.map((digit, index) => (
            <input
              key={index}
              ref={el => { inputRefs.current[index] = el; }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={e => handleChange(index, e.target.value)}
              onKeyDown={e => handleKeyDown(index, e)}
              disabled={loading}
              className="w-12 h-12 text-center text-2xl font-semibold border-2 border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
              style={{ minHeight: '48px', minWidth: '48px' }}
            />
          ))}
        </div>
        {error && (
          <p className="mt-3 text-sm text-red-600 text-center">{error}</p>
        )}
      </div>

      <div className="space-y-3">
        <button
          type="submit"
          disabled={loading || otp.some(digit => digit === '')}
          className="w-full px-6 py-3 text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors text-lg font-medium"
          style={{ minHeight: '44px' }}
        >
          {loading ? t('verifying', language) : t('verifyOTP', language)}
        </button>

        <button
          type="button"
          onClick={onResend}
          disabled={!canResend || loading}
          className="w-full px-6 py-3 text-blue-600 bg-white border border-blue-600 rounded-md hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-100 disabled:text-gray-400 disabled:border-gray-300 disabled:cursor-not-allowed transition-colors text-lg font-medium"
          style={{ minHeight: '44px' }}
        >
          {canResend 
            ? t('resendOTP', language)
            : `${t('resendIn', language)} ${resendCountdown}${t('seconds', language)}`
          }
        </button>
      </div>
    </form>
  );
}
