'use client';

import { useState, useEffect } from 'react';
import { BusinessType, CityTier, Language, UserProfile as UserProfileType } from '@/lib/types';
import { logger } from '@/lib/logger';
import ProfileSetupForm from './ProfileSetupForm';
import { t } from '@/lib/translations';
import ProfileAvatar from './ui/ProfileAvatar';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { getProfileLocalFirst } from '@/lib/profile-sync';

interface ProfileContentProps {
  language: Language;
  user: { userId: string; username: string };
  showBackButton?: boolean;
}

export default function ProfileContent({ language, user, showBackButton = false }: ProfileContentProps) {
  const [profileData, setProfileData] = useState<UserProfileType | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditMode, setIsEditMode] = useState(false);
  const [fetchError, setFetchError] = useState(false);

  useEffect(() => {
    if (user) {
      loadProfileData(user.userId);
    }
  }, [user]);

  const loadProfileData = async (userId: string) => {
    setFetchError(false);
    setLoading(true);
    try {
      const profile = await getProfileLocalFirst(userId);

      if (profile) {
        setProfileData(profile);
      } else {
        setProfileData(null);
        setFetchError(true);
      }
    } catch (err) {
      logger.error('Failed to load profile', { error: err });
      setProfileData(null);
      setFetchError(true);
    } finally {
      setLoading(false);
    }
  };

  const handleEditComplete = () => {
    setIsEditMode(false);
    // Reload profile data
    loadProfileData(user.userId);
  };

  const formatPhoneDisplay = (phone: string) => {
    if (!phone) return null;
    if (phone.startsWith('+91')) {
      const digits = phone.slice(3);
      return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
    }
    return phone;
  };

  const getBusinessTypeLabel = (type: string) => {
    const keyMap: Record<string, string> = {
      kirana: 'businessType.kirana',
      salon: 'businessType.salon',
      pharmacy: 'businessType.pharmacy',
      restaurant: 'businessType.restaurant',
      other: 'businessType.other',
      // legacy values
      retail: 'businessType.other',
      wholesale: 'businessType.other',
      services: 'businessType.salon',
      manufacturing: 'businessType.other',
    };
    const translationKey = keyMap[type?.toLowerCase()] || 'businessType.other';
    return t(translationKey, language);
  };

  const getLanguageLabel = (profileLanguage: Language) => {
    return t(`profile.language.${profileLanguage}`, language);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin h-10 w-10 border-4 border-primary-500 border-t-transparent rounded-full"></div>
          <p className="text-neutral-600 font-medium">{t('profile.loading', language)}</p>
        </div>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="max-w-2xl mx-auto">
        <Card className="p-12 text-center">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-red-50 flex items-center justify-center">
            <svg className="w-10 h-10 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>

          <h3 className="text-2xl font-bold text-neutral-900 mb-3">
            {t('profile.fetchErrorTitle', language)}
          </h3>

          <p className="text-neutral-600 mb-8 max-w-md mx-auto">
            {t('profile.fetchErrorDescription', language)}
          </p>

          <Button
            onClick={() => loadProfileData(user.userId)}
            variant="primary"
            size="md"
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            }
          >
            {t('profile.retry', language)}
          </Button>
        </Card>
      </div>
    );
  }

  const hasProfile = profileData && profileData.shopName && profileData.userName;

  // Show edit form if in edit mode
  if (isEditMode && profileData) {
    return (
      <div className="max-w-4xl mx-auto">
        {showBackButton && (
          <div className="mb-6">
            <button
              onClick={() => setIsEditMode(false)}
              className="flex items-center gap-2 text-neutral-600 hover:text-neutral-900 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span className="font-medium">
                {t('ui.button.back', language)}
              </span>
            </button>
          </div>
        )}
        <ProfileSetupForm
          phoneNumber={profileData.phoneNumber || ''}
          userId={user.userId}
          username={user.username}
          onComplete={handleEditComplete}
          language={language}
          initialData={{
            shopName: profileData.shopName,
            userName: profileData.userName,
            email: profileData.email,
            avatarUrl: profileData.avatarUrl,
            language: profileData.language,
            businessType: (profileData.businessType || profileData.business_type) as BusinessType | undefined,
            city: profileData.city as CityTier | undefined,
            business_type: profileData.business_type,
            city_tier: profileData.city_tier,
            explanation_mode: profileData.explanation_mode,
          }}
          isEditMode={true}
        />
      </div>
    );
  }

  return (
    <div className="w-full h-full overflow-auto">
      <div className="max-w-4xl mx-auto px-6 py-6">
        {hasProfile ? (
          <>
            {/* Profile Header Section */}
            <Card className="mb-8 rounded-3xl bg-gradient-to-br from-surface-low via-white to-primary-50/30 p-8">
              <div className="flex flex-col items-center text-center">
                <div className="relative group">
                  <ProfileAvatar
                    src={profileData!.avatarUrl}
                    name={profileData!.shopName || profileData!.userName}
                    size="xl"
                    className="border-4 border-white shadow-xl"
                  />
                </div>
                <div className="mt-5">
                  <h2 className="text-4xl font-bold tracking-tight text-neutral-900">{profileData!.shopName}</h2>
                  <p className="mt-2 text-lg font-medium text-neutral-500">
                    {profileData!.userName} • {getBusinessTypeLabel(profileData!.business_type || profileData!.businessType || 'other')}
                  </p>
                  {profileData!.city_tier && (
                    <div className="mt-3 inline-flex items-center rounded-full bg-primary-50 px-4 py-1.5 text-sm font-semibold text-primary-700">
                      {profileData!.city_tier === 'tier1' && (language === 'hi' ? 'टियर 1 व्यापारी' : language === 'mr' ? 'टियर 1 व्यापारी' : 'Tier 1 Merchant')}
                      {profileData!.city_tier === 'tier2' && (language === 'hi' ? 'टियर 2 व्यापारी' : language === 'mr' ? 'टियर 2 व्यापारी' : 'Tier 2 Merchant')}
                      {profileData!.city_tier === 'tier3' && (language === 'hi' ? 'टियर 3 व्यापारी' : language === 'mr' ? 'टियर 3 व्यापारी' : 'Tier 3 Merchant')}
                      {profileData!.city_tier === 'rural' && (language === 'hi' ? 'ग्रामीण व्यापारी' : language === 'mr' ? 'ग्रामीण व्यापारी' : 'Rural Merchant')}
                    </div>
                  )}
                </div>
                <div className="mt-6 flex justify-center">
                  <Button
                    onClick={() => setIsEditMode(true)}
                    variant="primary"
                    size="md"
                    icon={
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    }
                  >
                    {t('profile.edit', language)}
                  </Button>
                </div>
              </div>
            </Card>

          {/* Content Grid */}
          <div className="space-y-6">
            {/* Business Information Card */}
            <section className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
              <div className="px-6 py-4 border-b border-neutral-100 flex items-center gap-2">
                <svg className="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <h3 className="font-bold text-lg">
                  {t('profile.businessInformation', language)}
                </h3>
              </div>
              <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-12">
                <div>
                  <label className="text-xs font-semibold text-neutral-400 uppercase tracking-widest">
                    {language === 'hi' ? 'दुकान का नाम' : language === 'mr' ? 'दुकानाचे नाव' : 'Shop Name'}
                  </label>
                  <p className="text-neutral-800 font-medium mt-1">{profileData!.shopName}</p>
                </div>
                <div>
                  <label className="text-xs font-semibold text-neutral-400 uppercase tracking-widest">
                    {t('profile.owner', language)}
                  </label>
                  <p className="text-neutral-800 font-medium mt-1">{profileData!.userName}</p>
                </div>
                <div>
                  <label className="text-xs font-semibold text-neutral-400 uppercase tracking-widest">
                    {language === 'hi' ? 'व्यवसाय का प्रकार' : language === 'mr' ? 'व्यवसाय प्रकार' : 'Business Type'}
                  </label>
                  <p className="text-neutral-800 font-medium mt-1">
                    {getBusinessTypeLabel(profileData!.business_type || profileData!.businessType || 'other')}
                  </p>
                </div>
                {profileData!.city_tier && (
                  <div>
                    <label className="text-xs font-semibold text-neutral-400 uppercase tracking-widest">
                      {t('profile.tierLevel', language)}
                    </label>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-neutral-800 font-medium">
                        {profileData!.city_tier === 'tier1' && (language === 'hi' ? 'टियर 1' : language === 'mr' ? 'टियर 1' : 'Tier 1')}
                        {profileData!.city_tier === 'tier2' && (language === 'hi' ? 'टियर 2' : language === 'mr' ? 'टियर 2' : 'Tier 2')}
                        {profileData!.city_tier === 'tier3' && (language === 'hi' ? 'टियर 3' : language === 'mr' ? 'टियर 3' : 'Tier 3')}
                        {profileData!.city_tier === 'rural' && (language === 'hi' ? 'ग्रामीण' : language === 'mr' ? 'ग्रामीण' : 'Rural')}
                      </span>
                      <svg className="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                      </svg>
                    </div>
                  </div>
                )}
              </div>
            </section>

            {/* Contact & Location Card */}
            <section className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
              <div className="px-6 py-4 border-b border-neutral-100 flex items-center gap-2">
                <svg className="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <h3 className="font-bold text-lg">
                  {t('profile.contactDetails', language)}
                </h3>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  <div className="flex items-start gap-4">
                    <div className="mt-1 bg-neutral-100 p-2 rounded-2xl">
                      <svg className="w-5 h-5 text-neutral-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-neutral-400 uppercase tracking-widest">
                        {t('profile.mobileNumber', language)}
                      </label>
                      {formatPhoneDisplay(profileData?.phoneNumber || '') ? (
                        <p className="text-neutral-800 font-medium">{formatPhoneDisplay(profileData!.phoneNumber)}</p>
                      ) : (
                        <p className="text-neutral-400 italic text-sm">{t('profile.notProvided', language)}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="mt-1 bg-neutral-100 p-2 rounded-2xl">
                      <svg className="w-5 h-5 text-neutral-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-neutral-400 uppercase tracking-widest">
                        {t('profile.emailAddress', language)}
                      </label>
                      {profileData?.email ? (
                        <p className="text-neutral-800 font-medium">{profileData.email}</p>
                      ) : (
                        <p className="text-neutral-400 italic text-sm">{t('profile.notProvided', language)}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Preferences Card */}
            <section className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
              <div className="px-6 py-4 border-b border-neutral-100 flex items-center gap-2">
                <svg className="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <h3 className="font-bold text-lg">
                  {t('profile.appPreferences', language)}
                </h3>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="bg-neutral-100 p-2 rounded-2xl">
                        <svg className="w-5 h-5 text-neutral-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                        </svg>
                      </div>
                      <div>
                        <p className="font-semibold">
                          {t('profile.appLanguage', language)}
                        </p>
                        <p className="text-xs text-neutral-500">
                          {t('profile.chooseDisplayLanguage', language)}
                        </p>
                      </div>
                    </div>
                    <span className="inline-flex items-center rounded-2xl bg-neutral-100 px-4 py-2 text-sm font-medium text-neutral-700">
                      {getLanguageLabel(profileData!.language)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="bg-neutral-100 p-2 rounded-2xl">
                        <svg className="w-5 h-5 text-neutral-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                        </svg>
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <p className="font-semibold">
                            {language === 'hi' ? 'AI जवाब शैली' : language === 'mr' ? 'AI उत्तर शैली' : 'AI Response Style'}
                          </p>
                          <div className="relative group">
                            <svg className="w-3.5 h-3.5 text-neutral-400 cursor-help" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 bg-neutral-900 text-white text-xs rounded-xl p-3 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-10 shadow-lg">
                              <p className="font-semibold mb-1">{language === 'hi' ? 'सरल' : language === 'mr' ? 'साधे' : 'Simple'}</p>
                              <p className="text-neutral-300 mb-2">{language === 'hi' ? '2-3 छोटे बिंदु, आसान भाषा, बिना जटिल शब्दों के।' : language === 'mr' ? '2-3 छोटे मुद्दे, सोपी भाषा, कठीण शब्दांशिवाय.' : '2-3 short insights, plain language, no jargon.'}</p>
                              <p className="font-semibold mb-1">{language === 'hi' ? 'विस्तृत' : language === 'mr' ? 'तपशीलवार' : 'Detailed'}</p>
                              <p className="text-neutral-300">{language === 'hi' ? '5-7 बिंदु, वित्तीय अवधारणाओं की गहरी व्याख्या।' : language === 'mr' ? '5-7 मुद्दे, आर्थिक संकल्पनांचे सखोल स्पष्टीकरण.' : '5-7 insights with deeper financial explanations.'}</p>
                              <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-neutral-900" />
                            </div>
                          </div>
                        </div>
                        <p className="text-xs text-neutral-500">
                          {language === 'hi' ? 'AI इनसाइट्स कितने विस्तृत हों' : language === 'mr' ? 'AI इनसाइट्स किती तपशीलवार असाव्यात' : 'How detailed AI insights should be'}
                        </p>
                      </div>
                    </div>
                    <span className="inline-flex items-center rounded-2xl bg-neutral-100 px-4 py-2 text-sm font-medium text-neutral-700">
                      {(profileData!.explanation_mode ?? 'simple') === 'simple'
                        ? (language === 'hi' ? 'सरल' : language === 'mr' ? 'साधे' : 'Simple')
                        : (language === 'hi' ? 'विस्तृत' : language === 'mr' ? 'तपशीलवार' : 'Detailed')}
                    </span>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </>
      ) : (
        // Empty State
        <div className="max-w-2xl mx-auto">
          <Card className="p-12 text-center">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-primary-100 to-primary-container flex items-center justify-center">
              <svg className="w-10 h-10 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            
            <h3 className="text-2xl font-bold text-neutral-900 mb-3">
              {t('profile.incompleteTitle', language)}
            </h3>
            
            <p className="text-neutral-600 mb-8 max-w-md mx-auto">
              {t('profile.incompleteDescription', language)}
            </p>

            <Button
              onClick={() => setIsEditMode(true)}
              variant="primary"
              size="md"
              icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              }
            >
              {t('profile.setup.complete', language)}
            </Button>
          </Card>
        </div>
      )}
    </div>
    </div>
  );
}
