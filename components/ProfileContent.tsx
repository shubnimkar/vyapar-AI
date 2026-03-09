'use client';

import { useState, useEffect } from 'react';
import { Language, UserProfile as UserProfileType } from '@/lib/types';
import { logger } from '@/lib/logger';
import ProfileSetupForm from './ProfileSetupForm';

interface ProfileContentProps {
  language: Language;
  user: { userId: string; username: string };
  showBackButton?: boolean;
}

export default function ProfileContent({ language, user, showBackButton = false }: ProfileContentProps) {
  const [profileData, setProfileData] = useState<UserProfileType | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditMode, setIsEditMode] = useState(false);

  useEffect(() => {
    if (user) {
      loadProfileData(user.userId);
    }
  }, [user]);

  const loadProfileData = async (userId: string) => {
    try {
      const response = await fetch(`/api/profile?userId=${userId}`);
      const result = await response.json();
      
      if (result.success && result.data) {
        setProfileData(result.data);
      }
    } catch (err) {
      logger.error('Failed to load profile', { error: err });
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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(language === 'hi' ? 'hi-IN' : language === 'mr' ? 'mr-IN' : 'en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getBusinessTypeLabel = (type: string) => {
    const labels: Record<string, Record<Language, string>> = {
      retail: { en: 'Retail', hi: 'खुदरा', mr: 'किरकोळ' },
      wholesale: { en: 'Wholesale', hi: 'थोक', mr: 'घाऊक' },
      services: { en: 'Services', hi: 'सेवा', mr: 'सेवा' },
      manufacturing: { en: 'Manufacturing', hi: 'निर्माण', mr: 'उत्पादन' },
      restaurant: { en: 'Restaurant', hi: 'रेस्तरां', mr: 'रेस्टॉरंट' },
      other: { en: 'Other', hi: 'अन्य', mr: 'इतर' },
    };
    return labels[type]?.[language] || type;
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin h-10 w-10 border-4 border-blue-500 border-t-transparent rounded-full"></div>
          <p className="text-gray-600 font-medium">
            {language === 'hi' ? 'लोड हो रहा है...' : language === 'mr' ? 'लोड होत आहे...' : 'Loading...'}
          </p>
        </div>
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
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span className="font-medium">
                {language === 'hi' ? 'वापस' : language === 'mr' ? 'मागे' : 'Back'}
              </span>
            </button>
          </div>
        )}
        <ProfileSetupForm
          phoneNumber={profileData.phoneNumber || ''}
          userId={user.userId}
          onComplete={handleEditComplete}
          onSkip={() => setIsEditMode(false)}
          language={language}
          initialData={{
            shopName: profileData.shopName,
            userName: profileData.userName,
            language: profileData.language,
            businessType: profileData.business_type,
            city: profileData.city_tier,
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
            <div className="flex flex-col items-center text-center mb-8">
            <div className="relative group">
              <div className="w-28 h-28 md:w-32 md:h-32 rounded-full border-4 border-white shadow-xl overflow-hidden bg-slate-200">
                <div className="w-full h-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-3xl font-bold">
                  {getInitials(profileData!.shopName)}
                </div>
              </div>
              <button className="absolute bottom-1 right-1 bg-blue-600 text-white p-2 rounded-full shadow-lg hover:scale-105 transition-transform">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
            </div>
            <div className="mt-4">
              <h2 className="text-2xl font-bold">{profileData!.shopName}</h2>
              <p className="text-slate-500 font-medium">
                {profileData!.userName} • {getBusinessTypeLabel(profileData!.businessType || 'other')}
              </p>
              {profileData!.city_tier && (
                <div className="mt-2 inline-flex items-center px-3 py-1 rounded-full bg-blue-600/10 text-blue-600 text-xs font-semibold uppercase tracking-wider">
                  {profileData!.city_tier === 'tier1' && (language === 'hi' ? 'टियर 1 व्यापारी' : language === 'mr' ? 'टियर 1 व्यापारी' : 'Tier 1 Merchant')}
                  {profileData!.city_tier === 'tier2' && (language === 'hi' ? 'टियर 2 व्यापारी' : language === 'mr' ? 'टियर 2 व्यापारी' : 'Tier 2 Merchant')}
                  {profileData!.city_tier === 'tier3' && (language === 'hi' ? 'टियर 3 व्यापारी' : language === 'mr' ? 'टियर 3 व्यापारी' : 'Tier 3 Merchant')}
                  {profileData!.city_tier === 'rural' && (language === 'hi' ? 'ग्रामीण व्यापारी' : language === 'mr' ? 'ग्रामीण व्यापारी' : 'Rural Merchant')}
                </div>
              )}
            </div>
            <div className="mt-6 flex gap-3 w-full sm:w-auto justify-center">
              <button
                onClick={() => setIsEditMode(true)}
                className="sm:flex-none px-6 py-2.5 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-600/90 transition-colors flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                {language === 'hi' ? 'प्रोफ़ाइल संपादित करें' : language === 'mr' ? 'प्रोफाइल संपादित करा' : 'Edit Profile'}
              </button>
            </div>
          </div>

          {/* Content Grid */}
          <div className="space-y-6">
            {/* Business Information Card */}
            <section className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <h3 className="font-bold text-lg">
                  {language === 'hi' ? 'व्यवसाय की जानकारी' : language === 'mr' ? 'व्यवसाय माहिती' : 'Business Information'}
                </h3>
              </div>
              <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-12">
                <div>
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
                    {language === 'hi' ? 'दुकान का नाम' : language === 'mr' ? 'दुकानाचे नाव' : 'Shop Name'}
                  </label>
                  <p className="text-slate-800 font-medium mt-1">{profileData!.shopName}</p>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
                    {language === 'hi' ? 'मालिक' : language === 'mr' ? 'मालक' : 'Owner'}
                  </label>
                  <p className="text-slate-800 font-medium mt-1">{profileData!.userName}</p>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
                    {language === 'hi' ? 'व्यवसाय का प्रकार' : language === 'mr' ? 'व्यवसाय प्रकार' : 'Business Type'}
                  </label>
                  <p className="text-slate-800 font-medium mt-1">
                    {getBusinessTypeLabel(profileData!.businessType || 'other')}
                  </p>
                </div>
                {profileData!.city_tier && (
                  <div>
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
                      {language === 'hi' ? 'टियर स्तर' : language === 'mr' ? 'टियर स्तर' : 'Tier Level'}
                    </label>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-slate-800 font-medium">
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
            <section className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <h3 className="font-bold text-lg">
                  {language === 'hi' ? 'संपर्क विवरण' : language === 'mr' ? 'संपर्क तपशील' : 'Contact Details'}
                </h3>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  <div className="flex items-start gap-4">
                    <div className="mt-1 bg-slate-100 p-2 rounded-lg">
                      <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
                        {language === 'hi' ? 'मोबाइल नंबर' : language === 'mr' ? 'मोबाइल नंबर' : 'Mobile Number'}
                      </label>
                      {formatPhoneDisplay(profileData?.phoneNumber || '') ? (
                        <p className="text-slate-800 font-medium">{formatPhoneDisplay(profileData!.phoneNumber)}</p>
                      ) : (
                        <p className="text-slate-400 italic text-sm">
                          {language === 'hi' ? 'प्रदान नहीं किया गया' : language === 'mr' ? 'प्रदान केले नाही' : 'Not provided'}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="mt-1 bg-slate-100 p-2 rounded-lg">
                      <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
                        {language === 'hi' ? 'ईमेल पता' : language === 'mr' ? 'ईमेल पत्ता' : 'Email Address'}
                      </label>
                      <p className="text-slate-800 font-medium">{user.username}@vyapar-ai.com</p>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Preferences Card */}
            <section className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <h3 className="font-bold text-lg">
                  {language === 'hi' ? 'ऐप प्राथमिकताएं' : language === 'mr' ? 'अॅप प्राधान्ये' : 'App Preferences'}
                </h3>
              </div>
              <div className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="bg-slate-100 p-2 rounded-lg">
                      <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-semibold">
                        {language === 'hi' ? 'ऐप भाषा' : language === 'mr' ? 'अॅप भाषा' : 'App Language'}
                      </p>
                      <p className="text-xs text-slate-500">
                        {language === 'hi' ? 'अपनी पसंदीदा प्रदर्शन भाषा चुनें' : language === 'mr' ? 'तुमची पसंतीची प्रदर्शन भाषा निवडा' : 'Choose your preferred display language'}
                      </p>
                    </div>
                  </div>
                  <select
                    value={profileData!.language}
                    disabled
                    className="bg-slate-100 border-none rounded-lg text-sm font-medium py-2 pl-3 pr-8 text-slate-700"
                  >
                    <option value="en">English (US)</option>
                    <option value="hi">Hindi (हिन्दी)</option>
                    <option value="mr">Marathi (मराठी)</option>
                  </select>
                </div>
              </div>
            </section>
          </div>
        </>
      ) : (
        // Empty State
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center">
              <svg className="w-10 h-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            
            <h3 className="text-2xl font-bold text-gray-900 mb-3">
              {language === 'hi' ? 'प्रोफ़ाइल अधूरा है' : language === 'mr' ? 'प्रोफाइल अपूर्ण आहे' : 'Profile Incomplete'}
            </h3>
            
            <p className="text-gray-600 mb-8 max-w-md mx-auto">
              {language === 'hi' 
                ? 'अपने व्यवसाय की पूरी जानकारी जोड़कर Vyapar AI का अधिकतम लाभ उठाएं'
                : language === 'mr'
                ? 'तुमच्या व्यवसायाची संपूर्ण माहिती जोडून Vyapar AI चा जास्तीत जास्त फायदा घ्या'
                : 'Complete your business profile to get the most out of Vyapar AI'}
            </p>

            <button
              onClick={() => setIsEditMode(true)}
              className="inline-flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 font-medium shadow-lg hover:shadow-xl transition-all"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              {language === 'hi' ? 'प्रोफ़ाइल पूरा करें' : language === 'mr' ? 'प्रोफाइल पूर्ण करा' : 'Complete Profile'}
            </button>
          </div>
        </div>
      )}
    </div>
    </div>
  );
}
