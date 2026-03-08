'use client';

import { useState, useEffect } from 'react';
import { Language } from '@/lib/types';
import { t } from '@/lib/translations';
import { logger } from '@/lib/logger';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Badge } from '../ui/Badge';
import { Spinner } from '../ui/Spinner';
import { Eye, EyeOff, Check, X } from 'lucide-react';

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
        <Card className="bg-error-50 border border-error-200" density="compact">
          <p className="text-sm text-error-800">{error}</p>
        </Card>
      )}

      {/* Username */}
      <div>
        <label className="block text-sm font-medium text-neutral-700 mb-2">
          {t('usernameLabel', language)} <span className="text-error-500">*</span>
        </label>
        <div className="relative">
          <input
            type="text"
            value={formData.username}
            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
            className={`w-full px-4 py-3 pr-12 border-2 rounded-lg focus:ring-2 focus:ring-offset-0 focus:outline-none transition-all duration-base min-h-[44px] text-base text-neutral-900 placeholder:text-neutral-400 disabled:bg-neutral-100 disabled:cursor-not-allowed ${
              errors.username ? 'border-error-500 focus:border-error-500 focus:ring-error-500' : 'border-neutral-300 focus:border-primary-500 focus:ring-primary-500'
            }`}
            placeholder={language === 'hi' ? 'उपयोगकर्ता नाम' : language === 'mr' ? 'वापरकर्ता नाव' : 'Username'}
            disabled={loading}
          />
          {usernameChecking && (
            <div className="absolute right-4 top-1/2 -translate-y-1/2">
              <Spinner size="sm" />
            </div>
          )}
          {!usernameChecking && usernameAvailable === true && formData.username.length >= 3 && (
            <Check className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-success-500" />
          )}
        </div>
        {errors.username && (
          <p className="mt-2 text-sm text-error-600">{errors.username}</p>
        )}
        {!errors.username && usernameAvailable === true && (
          <p className="mt-2 text-sm text-success-600">{t('usernameAvailable', language)}</p>
        )}
      </div>

      {/* Password */}
      <div>
        <label className="block text-sm font-medium text-neutral-700 mb-2">
          {t('passwordLabel', language)} <span className="text-error-500">*</span>
        </label>
        <div className="relative">
          <input
            type={showPassword ? 'text' : 'password'}
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            className={`w-full px-4 py-3 pr-12 border-2 rounded-lg focus:ring-2 focus:ring-offset-0 focus:outline-none transition-all duration-base min-h-[44px] text-base text-neutral-900 placeholder:text-neutral-400 disabled:bg-neutral-100 disabled:cursor-not-allowed ${
              errors.password ? 'border-error-500 focus:border-error-500 focus:ring-error-500' : 'border-neutral-300 focus:border-primary-500 focus:ring-primary-500'
            }`}
            placeholder={language === 'hi' ? 'पासवर्ड' : language === 'mr' ? 'पासवर्ड' : 'Password'}
            disabled={loading}
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
                        ? 'bg-error-500'
                        : passwordStrength.score === 2
                        ? 'bg-warning-500'
                        : passwordStrength.score === 3
                        ? 'bg-warning-400'
                        : 'bg-success-500'
                      : 'bg-neutral-200'
                  }`}
                />
              ))}
            </div>
            
            {/* Password Requirements */}
            <div className="space-y-1 text-xs">
              <div className={`flex items-center gap-1 ${passwordStrength.hasMinLength ? 'text-success-600' : 'text-neutral-500'}`}>
                {passwordStrength.hasMinLength ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                {language === 'hi' ? ' कम से कम 8 अक्षर' : language === 'mr' ? ' किमान 8 वर्ण' : ' At least 8 characters'}
              </div>
              <div className={`flex items-center gap-1 ${passwordStrength.hasUppercase ? 'text-success-600' : 'text-neutral-500'}`}>
                {passwordStrength.hasUppercase ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                {language === 'hi' ? ' एक बड़ा अक्षर (A-Z)' : language === 'mr' ? ' एक मोठे अक्षर (A-Z)' : ' One uppercase letter (A-Z)'}
              </div>
              <div className={`flex items-center gap-1 ${passwordStrength.hasLowercase ? 'text-success-600' : 'text-neutral-500'}`}>
                {passwordStrength.hasLowercase ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                {language === 'hi' ? ' एक छोटा अक्षर (a-z)' : language === 'mr' ? ' एक लहान अक्षर (a-z)' : ' One lowercase letter (a-z)'}
              </div>
              <div className={`flex items-center gap-1 ${passwordStrength.hasNumber ? 'text-success-600' : 'text-neutral-500'}`}>
                {passwordStrength.hasNumber ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                {language === 'hi' ? ' एक संख्या (0-9)' : language === 'mr' ? ' एक संख्या (0-9)' : ' One number (0-9)'}
              </div>
            </div>
          </div>
        )}
        
        {errors.password && (
          <p className="mt-2 text-sm text-error-600">{errors.password}</p>
        )}
      </div>

      {/* Confirm Password */}
      <div>
        <label className="block text-sm font-medium text-neutral-700 mb-2">
          {t('confirmPasswordLabel', language)} <span className="text-error-500">*</span>
        </label>
        <div className="relative">
          <input
            type={showConfirmPassword ? 'text' : 'password'}
            value={formData.confirmPassword}
            onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
            className={`w-full px-4 py-3 pr-12 border-2 rounded-lg focus:ring-2 focus:ring-offset-0 focus:outline-none transition-all duration-base min-h-[44px] text-base text-neutral-900 placeholder:text-neutral-400 disabled:bg-neutral-100 disabled:cursor-not-allowed ${
              errors.confirmPassword 
                ? 'border-error-500 focus:border-error-500 focus:ring-error-500' 
                : passwordsMatch === true 
                ? 'border-success-500 focus:border-success-500 focus:ring-success-500' 
                : passwordsMatch === false 
                ? 'border-error-500 focus:border-error-500 focus:ring-error-500' 
                : 'border-neutral-300 focus:border-primary-500 focus:ring-primary-500'
            }`}
            placeholder={language === 'hi' ? 'पासवर्ड की पुष्टि करें' : language === 'mr' ? 'पासवर्डची पुष्टी करा' : 'Confirm password'}
            disabled={loading}
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-700 transition-colors"
            tabIndex={-1}
          >
            {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          </button>
        </div>
        
        {/* Password Match Indicator */}
        {formData.confirmPassword && (
          <div className="mt-2">
            {passwordsMatch === true ? (
              <div className="flex items-center gap-1 text-sm text-success-600">
                <Check className="w-4 h-4" />
                {language === 'hi' ? 'पासवर्ड मेल खाते हैं' : language === 'mr' ? 'पासवर्ड जुळतात' : 'Passwords match'}
              </div>
            ) : passwordsMatch === false ? (
              <div className="flex items-center gap-1 text-sm text-error-600">
                <X className="w-4 h-4" />
                {language === 'hi' ? 'पासवर्ड मेल नहीं खाते' : language === 'mr' ? 'पासवर्ड जुळत नाहीत' : 'Passwords do not match'}
              </div>
            ) : null}
          </div>
        )}
        
        {errors.confirmPassword && (
          <p className="mt-2 text-sm text-error-600">{errors.confirmPassword}</p>
        )}
      </div>

      {/* Shop Name */}
      <Input
        type="text"
        label={`${t('profile.setup.shopName', language)} *`}
        value={formData.shopName}
        onChange={(e) => setFormData({ ...formData, shopName: e.target.value })}
        error={errors.shopName}
        placeholder={language === 'hi' ? 'दुकान का नाम' : language === 'mr' ? 'दुकानाचे नाव' : 'Shop name'}
        disabled={loading}
      />

      {/* Owner Name */}
      <Input
        type="text"
        label={`${t('ownerNameLabel', language)} *`}
        value={formData.ownerName}
        onChange={(e) => setFormData({ ...formData, ownerName: e.target.value })}
        error={errors.ownerName}
        placeholder={language === 'hi' ? 'मालिक का नाम' : language === 'mr' ? 'मालकाचे नाव' : 'Owner name'}
        disabled={loading}
      />

      {/* Business Type */}
      <Input
        as="select"
        label={`${t('profile.setup.businessType', language)} *`}
        value={formData.businessType}
        onChange={(e) => setFormData({ ...formData, businessType: e.target.value as any })}
        disabled={loading}
      >
        <option value="retail">{t('businessType.retail', language)}</option>
        <option value="wholesale">{t('businessType.wholesale', language)}</option>
        <option value="services">{t('businessType.services', language)}</option>
        <option value="manufacturing">{t('businessType.manufacturing', language)}</option>
        <option value="restaurant">{t('businessType.restaurant', language)}</option>
        <option value="other">{t('businessType.other', language)}</option>
      </Input>

      {/* City */}
      <Input
        type="text"
        label={`${t('profile.setup.city', language)} *`}
        value={formData.city}
        onChange={(e) => setFormData({ ...formData, city: e.target.value })}
        error={errors.city}
        placeholder={language === 'hi' ? 'शहर' : language === 'mr' ? 'शहर' : 'City'}
        disabled={loading}
      />

      {/* Phone Number (Optional) */}
      <Input
        type="tel"
        label={t('phoneLabel', language)}
        value={formData.phoneNumber}
        onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
        placeholder="+91 9876543210"
        disabled={loading}
      />

      {/* Submit Button */}
      <Button
        type="submit"
        disabled={loading || usernameAvailable === false}
        loading={loading}
        fullWidth
        variant="primary"
      >
        {loading 
          ? (language === 'hi' ? 'खाता बना रहे हैं...' : language === 'mr' ? 'खाते तयार करत आहे...' : 'Creating account...')
          : t('signupButton', language)
        }
      </Button>
    </form>
  );
}
