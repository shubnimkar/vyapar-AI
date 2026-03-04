'use client';

import { useState, useEffect } from 'react';
import { Language } from '@/lib/types';
import { t } from '@/lib/translations';
import { logger } from '@/lib/logger';

interface SignupFormProps {
  onSubmit: (data: SignupData) => Promise<void>;
  loading: boolean;
  error: string;
  language: Language;
}

export interface SignupData {
  username: string;
  password: string;
  confirmPassword: string;
  shopName: string;
  ownerName: string;
  businessType: 'retail' | 'wholesale' | 'services' | 'manufacturing' | 'restaurant' | 'other';
  city: string;
  phoneNumber?: string;
  language: Language;
}

export default function SignupForm({ onSubmit, loading, error, language }: SignupFormProps) {
  const [formData, setFormData] = useState<SignupData>({
    username: '',
    password: '',
    confirmPassword: '',
    shopName: '',
    ownerName: '',
    businessType: 'retail',
    city: '',
    phoneNumber: '',
    language,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [usernameChecking, setUsernameChecking] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [checkTimeout, setCheckTimeout] = useState<NodeJS.Timeout | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState({
    score: 0,
    hasMinLength: false,
    hasUppercase: false,
    hasLowercase: false,
    hasNumber: false,
  });
  const [passwordsMatch, setPasswordsMatch] = useState<boolean | null>(null);

  // Update language when prop changes
  useEffect(() => {
    setFormData(prev => ({ ...prev, language }));
  }, [language]);

  // Check password strength
  useEffect(() => {
    const password = formData.password;
    const hasMinLength = password.length >= 8;
    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    
    let score = 0;
    if (hasMinLength) score++;
    if (hasUppercase) score++;
    if (hasLowercase) score++;
    if (hasNumber) score++;
    
    setPasswordStrength({
      score,
      hasMinLength,
      hasUppercase,
      hasLowercase,
      hasNumber,
    });
  }, [formData.password]);

  // Check if passwords match
  useEffect(() => {
    if (!formData.confirmPassword) {
      setPasswordsMatch(null);
      return;
    }
    
    if (formData.password === formData.confirmPassword) {
      setPasswordsMatch(true);
      // Clear error if passwords match
      setErrors(prev => {
        const { confirmPassword, ...rest } = prev;
        return rest;
      });
    } else {
      setPasswordsMatch(false);
    }
  }, [formData.password, formData.confirmPassword]);

  // Check username availability (debounced)
  useEffect(() => {
    if (formData.username.length < 3) {
      setUsernameAvailable(null);
      return;
    }

    // Clear previous timeout
    if (checkTimeout) {
      clearTimeout(checkTimeout);
    }

    // Set new timeout
    const timeout = setTimeout(async () => {
      setUsernameChecking(true);
      try {
        const response = await fetch(`/api/auth/check-username?username=${encodeURIComponent(formData.username)}`);
        const result = await response.json();
        
        if (result.valid) {
          setUsernameAvailable(result.available);
          if (!result.available) {
            setErrors(prev => ({ ...prev, username: t('usernameTaken', language) }));
          } else {
            setErrors(prev => {
              const { username, ...rest } = prev;
              return rest;
            });
          }
        } else {
          setUsernameAvailable(false);
          setErrors(prev => ({ ...prev, username: result.error || 'Invalid username' }));
        }
      } catch (err) {
        logger.error('Username check error', { error: err });
      } finally {
        setUsernameChecking(false);
      }
    }, 500);

    setCheckTimeout(timeout);

    return () => {
      if (timeout) clearTimeout(timeout);
    };
  }, [formData.username]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.username || formData.username.length < 3) {
      newErrors.username = t('error.required', language);
    }

    if (!formData.password || formData.password.length < 8) {
      newErrors.password = t('weakPassword', language);
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = t('passwordsNoMatch', language);
    }

    if (!formData.shopName) {
      newErrors.shopName = t('error.required', language);
    }

    if (!formData.ownerName) {
      newErrors.ownerName = t('error.required', language);
    }

    if (!formData.city) {
      newErrors.city = t('error.required', language);
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    if (usernameAvailable === false) {
      return;
    }

    await onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Username */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {t('usernameLabel', language)} <span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <input
            type="text"
            value={formData.username}
            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
            className={`w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              errors.username ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder={language === 'hi' ? 'उपयोगकर्ता नाम' : language === 'mr' ? 'वापरकर्ता नाव' : 'Username'}
            disabled={loading}
          />
          {usernameChecking && (
            <div className="absolute right-3 top-3">
              <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
            </div>
          )}
          {!usernameChecking && usernameAvailable === true && formData.username.length >= 3 && (
            <div className="absolute right-3 top-3 text-green-500">✓</div>
          )}
        </div>
        {errors.username && (
          <p className="mt-1 text-sm text-red-600">{errors.username}</p>
        )}
        {!errors.username && usernameAvailable === true && (
          <p className="mt-1 text-sm text-green-600">{t('usernameAvailable', language)}</p>
        )}
      </div>

      {/* Password */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {t('passwordLabel', language)} <span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <input
            type={showPassword ? 'text' : 'password'}
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            className={`w-full px-4 py-2 pr-10 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              errors.password ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder={language === 'hi' ? 'पासवर्ड' : language === 'mr' ? 'पासवर्ड' : 'Password'}
            disabled={loading}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
            tabIndex={-1}
          >
            {showPassword ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            )}
          </button>
        </div>
        
        {/* Password Strength Bar */}
        {formData.password && (
          <div className="mt-2">
            <div className="flex gap-1 mb-2">
              {[1, 2, 3, 4].map((level) => (
                <div
                  key={level}
                  className={`h-1 flex-1 rounded-full transition-colors ${
                    passwordStrength.score >= level
                      ? passwordStrength.score === 1
                        ? 'bg-red-500'
                        : passwordStrength.score === 2
                        ? 'bg-orange-500'
                        : passwordStrength.score === 3
                        ? 'bg-yellow-500'
                        : 'bg-green-500'
                      : 'bg-gray-200'
                  }`}
                />
              ))}
            </div>
            
            {/* Password Requirements */}
            <div className="space-y-1 text-xs">
              <div className={`flex items-center gap-1 ${passwordStrength.hasMinLength ? 'text-green-600' : 'text-gray-500'}`}>
                {passwordStrength.hasMinLength ? '✓' : '○'} 
                {language === 'hi' ? ' कम से कम 8 अक्षर' : language === 'mr' ? ' किमान 8 वर्ण' : ' At least 8 characters'}
              </div>
              <div className={`flex items-center gap-1 ${passwordStrength.hasUppercase ? 'text-green-600' : 'text-gray-500'}`}>
                {passwordStrength.hasUppercase ? '✓' : '○'} 
                {language === 'hi' ? ' एक बड़ा अक्षर (A-Z)' : language === 'mr' ? ' एक मोठे अक्षर (A-Z)' : ' One uppercase letter (A-Z)'}
              </div>
              <div className={`flex items-center gap-1 ${passwordStrength.hasLowercase ? 'text-green-600' : 'text-gray-500'}`}>
                {passwordStrength.hasLowercase ? '✓' : '○'} 
                {language === 'hi' ? ' एक छोटा अक्षर (a-z)' : language === 'mr' ? ' एक लहान अक्षर (a-z)' : ' One lowercase letter (a-z)'}
              </div>
              <div className={`flex items-center gap-1 ${passwordStrength.hasNumber ? 'text-green-600' : 'text-gray-500'}`}>
                {passwordStrength.hasNumber ? '✓' : '○'} 
                {language === 'hi' ? ' एक संख्या (0-9)' : language === 'mr' ? ' एक संख्या (0-9)' : ' One number (0-9)'}
              </div>
            </div>
          </div>
        )}
        
        {errors.password && (
          <p className="mt-1 text-sm text-red-600">{errors.password}</p>
        )}
      </div>

      {/* Confirm Password */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {t('confirmPasswordLabel', language)} <span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <input
            type={showConfirmPassword ? 'text' : 'password'}
            value={formData.confirmPassword}
            onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
            className={`w-full px-4 py-2 pr-10 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              errors.confirmPassword 
                ? 'border-red-500' 
                : passwordsMatch === true 
                ? 'border-green-500' 
                : passwordsMatch === false 
                ? 'border-red-500' 
                : 'border-gray-300'
            }`}
            placeholder={language === 'hi' ? 'पासवर्ड की पुष्टि करें' : language === 'mr' ? 'पासवर्डची पुष्टी करा' : 'Confirm password'}
            disabled={loading}
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
            tabIndex={-1}
          >
            {showConfirmPassword ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            )}
          </button>
        </div>
        
        {/* Password Match Indicator */}
        {formData.confirmPassword && (
          <div className="mt-2">
            {passwordsMatch === true ? (
              <div className="flex items-center gap-1 text-sm text-green-600">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                {language === 'hi' ? 'पासवर्ड मेल खाते हैं' : language === 'mr' ? 'पासवर्ड जुळतात' : 'Passwords match'}
              </div>
            ) : passwordsMatch === false ? (
              <div className="flex items-center gap-1 text-sm text-red-600">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                {language === 'hi' ? 'पासवर्ड मेल नहीं खाते' : language === 'mr' ? 'पासवर्ड जुळत नाहीत' : 'Passwords do not match'}
              </div>
            ) : null}
          </div>
        )}
        
        {errors.confirmPassword && (
          <p className="mt-1 text-sm text-red-600">{errors.confirmPassword}</p>
        )}
      </div>

      {/* Shop Name */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {t('profile.setup.shopName', language)} <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={formData.shopName}
          onChange={(e) => setFormData({ ...formData, shopName: e.target.value })}
          className={`w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
            errors.shopName ? 'border-red-500' : 'border-gray-300'
          }`}
          placeholder={language === 'hi' ? 'दुकान का नाम' : language === 'mr' ? 'दुकानाचे नाव' : 'Shop name'}
          disabled={loading}
        />
        {errors.shopName && (
          <p className="mt-1 text-sm text-red-600">{errors.shopName}</p>
        )}
      </div>

      {/* Owner Name */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {t('ownerNameLabel', language)} <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={formData.ownerName}
          onChange={(e) => setFormData({ ...formData, ownerName: e.target.value })}
          className={`w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
            errors.ownerName ? 'border-red-500' : 'border-gray-300'
          }`}
          placeholder={language === 'hi' ? 'मालिक का नाम' : language === 'mr' ? 'मालकाचे नाव' : 'Owner name'}
          disabled={loading}
        />
        {errors.ownerName && (
          <p className="mt-1 text-sm text-red-600">{errors.ownerName}</p>
        )}
      </div>

      {/* Business Type */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {t('profile.setup.businessType', language)} <span className="text-red-500">*</span>
        </label>
        <select
          value={formData.businessType}
          onChange={(e) => setFormData({ ...formData, businessType: e.target.value as any })}
          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          disabled={loading}
        >
          <option value="retail">{t('businessType.retail', language)}</option>
          <option value="wholesale">{t('businessType.wholesale', language)}</option>
          <option value="services">{t('businessType.services', language)}</option>
          <option value="manufacturing">{t('businessType.manufacturing', language)}</option>
          <option value="restaurant">{t('businessType.restaurant', language)}</option>
          <option value="other">{t('businessType.other', language)}</option>
        </select>
      </div>

      {/* City */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {t('profile.setup.city', language)} <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={formData.city}
          onChange={(e) => setFormData({ ...formData, city: e.target.value })}
          className={`w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
            errors.city ? 'border-red-500' : 'border-gray-300'
          }`}
          placeholder={language === 'hi' ? 'शहर' : language === 'mr' ? 'शहर' : 'City'}
          disabled={loading}
        />
        {errors.city && (
          <p className="mt-1 text-sm text-red-600">{errors.city}</p>
        )}
      </div>

      {/* Phone Number (Optional) */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {t('phoneLabel', language)}
        </label>
        <input
          type="tel"
          value={formData.phoneNumber}
          onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="+91 9876543210"
          disabled={loading}
        />
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={loading || usernameAvailable === false}
        className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {loading 
          ? (language === 'hi' ? 'खाता बना रहे हैं...' : language === 'mr' ? 'खाते तयार करत आहे...' : 'Creating account...')
          : t('signupButton', language)
        }
      </button>
    </form>
  );
}
