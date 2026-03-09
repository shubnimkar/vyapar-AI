'use client';

import { useState, useEffect, useRef } from 'react';
import { Language, ProfileSetupData, CityTier, BusinessType } from '@/lib/types';
import { t } from '@/lib/translations';
import { logger } from '@/lib/logger';

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
  language,
  initialData,
  isEditMode = false,
}: ProfileSetupFormProps) {
  const [formData, setFormData] = useState<ProfileSetupData>(
    initialData || {
      shopName: '',
      userName: '',
      language,
      businessType: undefined,
      business_type: undefined,
      city: undefined,
      city_tier: null,
      explanation_mode: 'simple',
    }
  );
  const [phoneNumberValue, setPhoneNumberValue] = useState(phoneNumber || '');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const shopNameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    shopNameRef.current?.focus();
  }, []);

  const validateForm = (): boolean => {
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
    if (!validateForm()) {
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
          business_type: skipOptional ? formData.business_type ?? 'other' : formData.businessType ?? 'other',
          city: skipOptional ? undefined : formData.city,
          city_tier: skipOptional ? formData.city_tier ?? null : (formData.city_tier ?? null),
          explanation_mode: formData.explanation_mode ?? 'simple',
        }),
      });

      const result = await response.json();

      if (result.success) {
        if (formData.language) {
          localStorage.setItem('vyapar-lang', formData.language);
        }
        onComplete();
      } else {
        if (result.errors) {
          const errorMap: Record<string, string> = {};
          result.errors.forEach((err: { field: string; message: string }) => {
            errorMap[err.field] = err.message;
          });
          setErrors(errorMap);
        } else {
          setErrors({ general: result.error || t('error.profileUpdateFailed', language) });
        }
      }
    } catch (error) {
      logger.error('[ProfileSetup] Error', { error });
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
    <div className="w-full h-full flex flex-col">
      {/* Header Section */}
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-900">
          {isEditMode 
            ? (language === 'hi' ? 'प्रोफ़ाइल संपादित करें' : language === 'mr' ? 'प्रोफाइल संपादित करा' : 'Edit Profile')
            : t('profile.setup.title', language)
          }
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          {language === 'hi' 
            ? 'बेहतर AI इनसाइट्स पाने के लिए अपनी दुकान की जानकारी और व्यवसाय की प्राथमिकताएं अपडेट करें।'
            : language === 'mr'
            ? 'चांगले AI इनसाइट्स मिळवण्यासाठी तुमच्या दुकानाची माहिती आणि व्यवसाय प्राधान्ये अपडेट करा.'
            : 'Update your shop details and business preferences to get better AI insights.'}
        </p>
      </div>

      {/* Main Form Card */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 flex-1 overflow-auto">
        <div className="p-6">
          {errors.general && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
              <svg className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-xs text-red-800">{errors.general}</p>
            </div>
          )}

          <form onSubmit={(e) => { e.preventDefault(); handleSubmit(false); }} className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">

            {/* Shop Name */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-700" htmlFor="shop_name">
                {t('profile.setup.shopName', language)} <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                <input
                  ref={shopNameRef}
                  type="text"
                  id="shop_name"
                  value={formData.shopName}
                  onChange={(e) => {
                    setFormData({ ...formData, shopName: e.target.value });
                    if (errors.shopName) setErrors({ ...errors, shopName: '' });
                  }}
                  className={`w-full pl-9 pr-3 py-2 text-sm rounded-lg border ${
                    errors.shopName ? 'border-red-500 bg-red-50' : 'border-slate-300'
                  } bg-white text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all`}
                  placeholder={language === 'hi' ? 'दुकान का नाम दर्ज करें' : language === 'mr' ? 'दुकानाचे नाव प्रविष्ट करा' : 'Enter shop name'}
                  required
                />
              </div>
              {errors.shopName && (
                <p className="text-xs text-red-600 flex items-center gap-1">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {errors.shopName}
                </p>
              )}
            </div>

            {/* Owner Name */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-700" htmlFor="owner_name">
                {t('profile.setup.userName', language)} <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <input
                  type="text"
                  id="owner_name"
                  value={formData.userName}
                  onChange={(e) => {
                    setFormData({ ...formData, userName: e.target.value });
                    if (errors.userName) setErrors({ ...errors, userName: '' });
                  }}
                  className={`w-full pl-9 pr-3 py-2 text-sm rounded-lg border ${
                    errors.userName ? 'border-red-500 bg-red-50' : 'border-slate-300'
                  } bg-white text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all`}
                  placeholder={language === 'hi' ? 'मालिक का नाम दर्ज करें' : language === 'mr' ? 'मालकाचे नाव प्रविष्ट करा' : 'Enter owner name'}
                  required
                />
              </div>
              {errors.userName && (
                <p className="text-xs text-red-600 flex items-center gap-1">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {errors.userName}
                </p>
              )}
            </div>

            {/* Phone Number */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-700" htmlFor="phone">
                {t('phoneNumber', language)} ({language === 'hi' ? 'भारतीय प्रारूप' : language === 'mr' ? 'भारतीय स्वरूप' : 'Indian Format'})
              </label>
              <div className="flex">
                <span className="inline-flex items-center px-3 rounded-l-lg border border-r-0 border-slate-300 bg-slate-50 text-slate-500 text-xs font-medium">
                  +91
                </span>
                <input
                  type="tel"
                  id="phone"
                  value={phoneNumberValue}
                  onChange={(e) => {
                    setPhoneNumberValue(e.target.value);
                    if (errors.phoneNumber) {
                      setErrors({ ...errors, phoneNumber: '' });
                    }
                  }}
                  pattern="[6-9][0-9]{9}"
                  className={`flex-1 px-3 py-2 text-sm rounded-r-lg border ${
                    errors.phoneNumber ? 'border-red-500 bg-red-50' : 'border-slate-300'
                  } bg-white text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all`}
                  placeholder="9876543210"
                />
              </div>
              {errors.phoneNumber && (
                <p className="text-xs text-red-600 flex items-center gap-1">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {errors.phoneNumber}
                </p>
              )}
            </div>

            {/* Language Dropdown */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-700" htmlFor="language">
                {t('profile.setup.language', language)} <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                </svg>
                <select
                  id="language"
                  value={formData.language}
                  onChange={(e) => {
                    setFormData({ ...formData, language: e.target.value as Language });
                    if (errors.language) setErrors({ ...errors, language: '' });
                  }}
                  className={`w-full pl-9 pr-8 py-2 text-sm rounded-lg border ${
                    errors.language ? 'border-red-500 bg-red-50' : 'border-slate-300'
                  } bg-white text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none transition-all`}
                  required
                >
                  <option value="en">English</option>
                  <option value="hi">हिंदी (Hindi)</option>
                  <option value="mr">मराठी (Marathi)</option>
                </select>
                <svg className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
              {errors.language && (
                <p className="text-xs text-red-600 flex items-center gap-1">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {errors.language}
                </p>
              )}
            </div>

            {/* Business Type Dropdown */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-700" htmlFor="business_type">
                {t('profile.setup.businessType', language)}
              </label>
              <div className="relative">
                <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
                <select
                  id="business_type"
                  value={formData.businessType ?? ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      businessType: e.target.value as BusinessType,
                      business_type: e.target.value as BusinessType,
                    })
                  }
                  className="w-full pl-9 pr-8 py-2 text-sm rounded-lg border border-slate-300 bg-white text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none transition-all"
                >
                  <option value="">
                    {language === 'hi' ? 'प्रकार चुनें' : language === 'mr' ? 'प्रकार निवडा' : 'Select type'}
                  </option>
                  <option value="kirana">
                    {language === 'hi' ? 'किराना' : language === 'mr' ? 'किराणा' : 'Kirana'}
                  </option>
                  <option value="salon">
                    {language === 'hi' ? 'सैलून' : language === 'mr' ? 'सलून' : 'Salon'}
                  </option>
                  <option value="pharmacy">
                    {language === 'hi' ? 'फार्मेसी' : language === 'mr' ? 'फार्मसी' : 'Pharmacy'}
                  </option>
                  <option value="restaurant">
                    {language === 'hi' ? 'रेस्तरां' : language === 'mr' ? 'रेस्टॉरंट' : 'Restaurant'}
                  </option>
                  <option value="other">
                    {language === 'hi' ? 'अन्य' : language === 'mr' ? 'इतर' : 'Other'}
                  </option>
                </select>
                <svg className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>

            {/* City Tier Dropdown */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-700" htmlFor="city_tier">
                {language === 'hi' ? 'शहर का स्तर' : language === 'mr' ? 'शहर स्तर' : 'City Tier'}
              </label>
              <div className="relative">
                <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                <select
                  id="city_tier"
                  value={formData.city_tier || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      city_tier: (e.target.value || null) as CityTier | null,
                      city: e.target.value as CityTier | undefined,
                    })
                  }
                  className="w-full pl-9 pr-8 py-2 text-sm rounded-lg border border-slate-300 bg-white text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none transition-all"
                >
                  <option value="">
                    {language === 'hi' ? 'स्तर चुनें' : language === 'mr' ? 'स्तर निवडा' : 'Select tier'}
                  </option>
                  <option value="tier1">
                    {language === 'hi' ? 'टियर 1 (मेट्रो)' : language === 'mr' ? 'टियर 1 (मेट्रो)' : 'Tier 1 (Metro)'}
                  </option>
                  <option value="tier2">
                    {language === 'hi' ? 'टियर 2' : language === 'mr' ? 'टियर 2' : 'Tier 2'}
                  </option>
                  <option value="tier3">
                    {language === 'hi' ? 'टियर 3' : language === 'mr' ? 'टियर 3' : 'Tier 3'}
                  </option>
                  <option value="rural">
                    {language === 'hi' ? 'ग्रामीण' : language === 'mr' ? 'ग्रामीण' : 'Rural'}
                  </option>
                </select>
                <svg className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="md:col-span-2 flex flex-col sm:flex-row gap-3 mt-4 border-t border-slate-100 pt-4">
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 bg-blue-600 text-white font-semibold text-sm py-2.5 px-4 rounded-lg hover:bg-blue-700 shadow-md shadow-blue-600/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                    {language === 'hi' ? 'सहेज रहा है...' : language === 'mr' ? 'जतन करत आहे...' : 'Saving...'}
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {isEditMode 
                      ? (language === 'hi' ? 'परिवर्तन सहेजें' : language === 'mr' ? 'बदल जतन करा' : 'Save Changes')
                      : t('profile.setup.complete', language)
                    }
                  </>
                )}
              </button>
              {!isEditMode && (
                <button
                  type="button"
                  onClick={handleSkip}
                  disabled={isSubmitting}
                  className="flex-1 bg-slate-100 text-slate-700 font-semibold text-sm py-2.5 px-4 rounded-lg hover:bg-slate-200 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  {t('profile.setup.skip', language)}
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
