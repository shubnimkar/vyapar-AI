'use client';

import { useState, useEffect, useRef } from 'react';
import { Language, ProfileSetupData } from '@/lib/types';
import { t } from '@/lib/translations';

interface ProfileSetupFormProps {
  phoneNumber: string;
  userId: string;
  onComplete: () => void;
  onSkip: () => void;
  language: Language;
  initialData?: ProfileSetupData;
  isEditMode?: boolean;
}

export default function ProfileSetupForm({
  phoneNumber,
  userId,
  onComplete,
  onSkip,
  language,
  initialData,
  isEditMode = false,
}: ProfileSetupFormProps) {
  const [formData, setFormData] = useState<ProfileSetupData>(
    initialData || {
      shopName: '',
      userName: '',
      language: language,
      businessType: '',
      city: '',
    }
  );
  const [phoneNumberValue, setPhoneNumberValue] = useState(phoneNumber || '');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const shopNameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    shopNameRef.current?.focus();
  }, []);

  const validateForm = (skipOptional: boolean = false): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.shopName.trim()) {
      newErrors.shopName = t('error.required', language);
    }

    if (!formData.userName.trim()) {
      newErrors.userName = t('error.required', language);
    }

    if (!formData.language) {
      newErrors.language = t('error.required', language);
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validatePhoneNumber = (phone: string): boolean => {
    if (!phone) return true;
    
    const cleaned = phone.replace(/[\s-]/g, '');
    const isValid = /^(\+91)?[6-9]\d{9}$/.test(cleaned);
    
    if (!isValid) {
      setErrors(prev => ({ 
        ...prev, 
        phoneNumber: language === 'hi' 
          ? 'मान्य फ़ोन नंबर दर्ज करें' 
          : language === 'mr'
          ? 'वैध फोन नंबर प्रविष्ट करा'
          : 'Enter a valid phone number'
      }));
    }
    
    return isValid;
  };

  const handleSubmit = async (skipOptional: boolean = false) => {
    if (!validateForm(skipOptional)) {
      return;
    }

    if (phoneNumberValue && !validatePhoneNumber(phoneNumberValue)) {
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/profile/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          userId,
          phoneNumber: phoneNumberValue || undefined,
          businessType: skipOptional ? undefined : formData.businessType,
          city: skipOptional ? undefined : formData.city,
        }),
      });

      const result = await response.json();

      if (result.success) {
        onComplete();
      } else {
        if (result.errors) {
          const errorMap: Record<string, string> = {};
          result.errors.forEach((err: any) => {
            errorMap[err.field] = err.message;
          });
          setErrors(errorMap);
        } else {
          setErrors({ general: result.error || t('error.profileUpdateFailed', language) });
        }
      }
    } catch (error) {
      console.error('[ProfileSetup] Error:', error);
      setErrors({ general: t('networkError', language) });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkip = () => {
    setFormData({
      ...formData,
      shopName: formData.shopName || 'My Shop',
      userName: formData.userName || phoneNumber,
    });
    
    handleSubmit(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center h-16">
            <h1 className="text-xl font-bold text-gray-900">
              {isEditMode 
                ? (language === 'hi' ? 'प्रोफ़ाइल संपादित करें' : language === 'mr' ? 'प्रोफाइल संपादित करा' : 'Edit Profile')
                : t('profile.setup.title', language)
              }
            </h1>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {/* Progress Indicator */}
          {!isEditMode && (
            <div className="h-1 bg-gray-100">
              <div className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 w-2/3 transition-all"></div>
            </div>
          )}

          <div className="p-8">
            {/* Header Text */}
            <div className="text-center mb-8">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center">
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <p className="text-gray-600 text-sm">
                {language === 'hi' 
                  ? 'अपने व्यवसाय की जानकारी दर्ज करें'
                  : language === 'mr'
                  ? 'तुमच्या व्यवसायाची माहिती प्रविष्ट करा'
                  : 'Enter your business information'}
              </p>
            </div>

            {errors.general && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
                <svg className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm text-red-800">{errors.general}</p>
              </div>
            )}

            <form onSubmit={(e) => { e.preventDefault(); handleSubmit(false); }} className="space-y-6">
              {/* Required Fields Section */}
              <div className="space-y-6">
                <div className="flex items-center gap-2 pb-2 border-b border-gray-200">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
                    {language === 'hi' ? 'आवश्यक जानकारी' : language === 'mr' ? 'आवश्यक माहिती' : 'Required Information'}
                  </h3>
                </div>

                {/* Shop Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('profile.setup.shopName', language)} <span className="text-red-500">*</span>
                  </label>
                  <input
                    ref={shopNameRef}
                    type="text"
                    value={formData.shopName}
                    onChange={(e) => {
                      setFormData({ ...formData, shopName: e.target.value });
                      if (errors.shopName) setErrors({ ...errors, shopName: '' });
                    }}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                      errors.shopName ? 'border-red-500 bg-red-50' : 'border-gray-300 hover:border-gray-400'
                    }`}
                    placeholder={language === 'hi' ? 'दुकान का नाम' : language === 'mr' ? 'दुकानाचे नाव' : 'Shop name'}
                  />
                  {errors.shopName && (
                    <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {errors.shopName}
                    </p>
                  )}
                </div>

                {/* User Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('profile.setup.userName', language)} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.userName}
                    onChange={(e) => {
                      setFormData({ ...formData, userName: e.target.value });
                      if (errors.userName) setErrors({ ...errors, userName: '' });
                    }}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                      errors.userName ? 'border-red-500 bg-red-50' : 'border-gray-300 hover:border-gray-400'
                    }`}
                    placeholder={language === 'hi' ? 'आपका नाम' : language === 'mr' ? 'तुमचे नाव' : 'Your name'}
                  />
                  {errors.userName && (
                    <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {errors.userName}
                    </p>
                  )}
                </div>

                {/* Language */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('profile.setup.language', language)} <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.language}
                    onChange={(e) => {
                      setFormData({ ...formData, language: e.target.value as Language });
                      if (errors.language) setErrors({ ...errors, language: '' });
                    }}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                      errors.language ? 'border-red-500 bg-red-50' : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    <option value="en">English</option>
                    <option value="hi">हिंदी (Hindi)</option>
                    <option value="mr">मराठी (Marathi)</option>
                  </select>
                  {errors.language && (
                    <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {errors.language}
                    </p>
                  )}
                </div>
              </div>

              {/* Optional Fields Section */}
              <div className="space-y-6 pt-6">
                <div className="flex items-center gap-2 pb-2 border-b border-gray-200">
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
                    {language === 'hi' ? 'अतिरिक्त जानकारी' : language === 'mr' ? 'अतिरिक्त माहिती' : 'Additional Information'}
                  </h3>
                  <span className="text-xs text-gray-500">
                    ({language === 'hi' ? 'वैकल्पिक' : language === 'mr' ? 'ऐच्छिक' : 'Optional'})
                  </span>
                </div>

                {/* Phone Number */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('phoneNumber', language)}
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                    </div>
                    <input
                      type="tel"
                      value={phoneNumberValue}
                      onChange={(e) => {
                        setPhoneNumberValue(e.target.value);
                        if (errors.phoneNumber) {
                          setErrors({ ...errors, phoneNumber: '' });
                        }
                      }}
                      className={`w-full pl-12 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                        errors.phoneNumber ? 'border-red-500 bg-red-50' : 'border-gray-300 hover:border-gray-400'
                      }`}
                      placeholder="+91 9876543210"
                    />
                  </div>
                  {errors.phoneNumber ? (
                    <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {errors.phoneNumber}
                    </p>
                  ) : (
                    <p className="mt-2 text-xs text-gray-500">
                      {language === 'hi' 
                        ? 'वैकल्पिक - भारतीय मोबाइल नंबर (+91 से शुरू)'
                        : language === 'mr'
                        ? 'ऐच्छिक - भारतीय मोबाइल नंबर (+91 पासून सुरू)'
                        : 'Optional - Indian mobile number (starts with +91)'}
                    </p>
                  )}
                </div>

                {/* Business Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('profile.setup.businessType', language)}
                  </label>
                  <select
                    value={formData.businessType}
                    onChange={(e) => setFormData({ ...formData, businessType: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent hover:border-gray-400 transition-all"
                  >
                    <option value="">
                      {language === 'hi' ? 'चुनें' : language === 'mr' ? 'निवडा' : 'Select'}
                    </option>
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('profile.setup.city', language)}
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                    <input
                      type="text"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent hover:border-gray-400 transition-all"
                      placeholder={language === 'hi' ? 'शहर' : language === 'mr' ? 'शहर' : 'City'}
                    />
                  </div>
                </div>
              </div>

              {/* Buttons */}
              <div className="flex gap-3 pt-6">
                {!isEditMode && (
                  <button
                    type="button"
                    onClick={handleSkip}
                    disabled={isSubmitting}
                    className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 hover:border-gray-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium"
                  >
                    {t('profile.setup.skip', language)}
                  </button>
                )}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`${isEditMode ? 'w-full' : 'flex-1'} px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium shadow-lg hover:shadow-xl flex items-center justify-center gap-2`}
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></div>
                      {language === 'hi' ? 'सहेज रहा है...' : language === 'mr' ? 'जतन करत आहे...' : 'Saving...'}
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      {isEditMode 
                        ? (language === 'hi' ? 'अपडेट करें' : language === 'mr' ? 'अपडेट करा' : 'Update Profile')
                        : t('profile.setup.complete', language)
                      }
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Help Text */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-500">
            {language === 'hi' 
              ? 'आपकी जानकारी सुरक्षित और निजी है'
              : language === 'mr'
              ? 'तुमची माहिती सुरक्षित आणि खाजगी आहे'
              : 'Your information is secure and private'}
          </p>
        </div>
      </div>
    </div>
  );
}
