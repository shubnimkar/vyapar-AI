'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { SessionManager } from '@/lib/session-manager';
import { Language, UserProfile as UserProfileType } from '@/lib/types';
import { t } from '@/lib/translations';

export default function ProfilePage() {
  const router = useRouter();
  const [language, setLanguage] = useState<Language>('en');
  const [user, setUser] = useState<{ userId: string; username: string } | null>(null);
  const [profileData, setProfileData] = useState<UserProfileType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkAuthAndLoadProfile();
  }, []);

  const checkAuthAndLoadProfile = async () => {
    if (!SessionManager.isAuthenticated()) {
      router.push('/login');
      return;
    }

    const currentUser = SessionManager.getCurrentUser();
    if (!currentUser) {
      router.push('/login');
      return;
    }

    setUser(currentUser);

    // Load language preference
    const savedLanguage = localStorage.getItem('vyapar-language') as Language;
    if (savedLanguage) {
      setLanguage(savedLanguage);
    }

    // Load profile data
    await loadProfileData(currentUser.userId);
    setLoading(false);
  };

  const loadProfileData = async (userId: string) => {
    try {
      const response = await fetch(`/api/profile?userId=${userId}`);
      const result = await response.json();
      
      if (result.success && result.data) {
        setProfileData(result.data);
      } else {
        setError('Profile not found');
      }
    } catch (err) {
      console.error('Failed to load profile:', err);
      setError('Failed to load profile data');
    }
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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin h-10 w-10 border-4 border-blue-500 border-t-transparent rounded-full"></div>
          <p className="text-gray-600 font-medium">
            {language === 'hi' ? 'लोड हो रहा है...' : language === 'mr' ? 'लोड होत आहे...' : 'Loading...'}
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const hasProfile = profileData && profileData.shopName && profileData.userName;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <button
              onClick={() => router.push('/')}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span className="font-medium">
                {language === 'hi' ? 'वापस' : language === 'mr' ? 'मागे' : 'Back'}
              </span>
            </button>
            
            <h1 className="text-xl font-bold text-gray-900">
              {language === 'hi' ? 'मेरा प्रोफ़ाइल' : language === 'mr' ? 'माझे प्रोफाइल' : 'My Profile'}
            </h1>
            
            <div className="w-24"></div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {hasProfile ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Profile Card */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                {/* Profile Header with Gradient */}
                <div className="h-24 bg-gradient-to-r from-blue-500 to-indigo-600"></div>
                
                {/* Avatar */}
                <div className="px-6 pb-6">
                  <div className="flex flex-col items-center -mt-12">
                    <div className="w-24 h-24 rounded-full bg-white shadow-lg flex items-center justify-center border-4 border-white">
                      <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-2xl font-bold">
                        {getInitials(profileData!.shopName)}
                      </div>
                    </div>
                    
                    <h2 className="mt-4 text-2xl font-bold text-gray-900 text-center">
                      {profileData!.shopName}
                    </h2>
                    
                    <p className="text-sm text-gray-500 mt-1">
                      @{user.username}
                    </p>

                    {profileData!.businessType && (
                      <span className="mt-3 px-3 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded-full">
                        {getBusinessTypeLabel(profileData!.businessType)}
                      </span>
                    )}

                    <button
                      onClick={() => router.push('/profile-setup')}
                      className="mt-6 w-full px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center justify-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      {language === 'hi' ? 'प्रोफ़ाइल संपादित करें' : language === 'mr' ? 'प्रोफाइल संपादित करा' : 'Edit Profile'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Quick Stats */}
              <div className="mt-6 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-4">
                  {language === 'hi' ? 'खाता जानकारी' : language === 'mr' ? 'खाते माहिती' : 'Account Info'}
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-sm">
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <div>
                      <p className="text-gray-500 text-xs">
                        {language === 'hi' ? 'सदस्य बने' : language === 'mr' ? 'सदस्य झाले' : 'Member since'}
                      </p>
                      <p className="text-gray-900 font-medium">
                        {profileData?.createdAt ? formatDate(profileData.createdAt) : 'N/A'}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 text-sm">
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                      <p className="text-gray-500 text-xs">
                        {language === 'hi' ? 'स्थिति' : language === 'mr' ? 'स्थिती' : 'Status'}
                      </p>
                      <p className="text-green-600 font-medium flex items-center gap-1">
                        <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                        {language === 'hi' ? 'सक्रिय' : language === 'mr' ? 'सक्रिय' : 'Active'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column - Details */}
            <div className="lg:col-span-2 space-y-6">
              {/* Business Information */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    {language === 'hi' ? 'व्यवसाय की जानकारी' : language === 'mr' ? 'व्यवसाय माहिती' : 'Business Information'}
                  </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                      {language === 'hi' ? 'मालिक का नाम' : language === 'mr' ? 'मालकाचे नाव' : 'Owner Name'}
                    </label>
                    <p className="text-base font-semibold text-gray-900">
                      {profileData!.userName}
                    </p>
                  </div>

                  {profileData!.city && (
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                        {language === 'hi' ? 'शहर' : language === 'mr' ? 'शहर' : 'City'}
                      </label>
                      <p className="text-base font-semibold text-gray-900 flex items-center gap-2">
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        {profileData!.city}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Contact Information */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-6">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  {language === 'hi' ? 'संपर्क जानकारी' : language === 'mr' ? 'संपर्क माहिती' : 'Contact Information'}
                </h3>

                <div className="space-y-4">
                  <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg">
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <label className="text-xs font-medium text-gray-500 uppercase tracking-wide block mb-1">
                        {t('phoneNumber', language)}
                      </label>
                      {formatPhoneDisplay(profileData?.phoneNumber || '') ? (
                        <p className="text-base font-semibold text-gray-900">
                          {formatPhoneDisplay(profileData!.phoneNumber)}
                        </p>
                      ) : (
                        <p className="text-sm text-gray-400 italic">
                          {language === 'hi' ? 'प्रदान नहीं किया गया' : language === 'mr' ? 'प्रदान केले नाही' : 'Not provided'}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Actions Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button
                  onClick={() => router.push('/settings')}
                  className="p-5 bg-white rounded-xl shadow-sm border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all text-left group"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900 mb-1">
                        {language === 'hi' ? 'सेटिंग्स' : language === 'mr' ? 'सेटिंग्ज' : 'Settings'}
                      </h4>
                      <p className="text-sm text-gray-500">
                        {language === 'hi' ? 'भाषा और खाता प्रबंधन' : language === 'mr' ? 'भाषा आणि खाते व्यवस्थापन' : 'Language and account management'}
                      </p>
                    </div>
                    <svg className="w-5 h-5 text-gray-400 group-hover:text-blue-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </button>

                <button
                  onClick={() => router.push('/')}
                  className="p-5 bg-white rounded-xl shadow-sm border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all text-left group"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900 mb-1">
                        {language === 'hi' ? 'डैशबोर्ड' : language === 'mr' ? 'डॅशबोर्ड' : 'Dashboard'}
                      </h4>
                      <p className="text-sm text-gray-500">
                        {language === 'hi' ? 'मुख्य पृष्ठ पर जाएं' : language === 'mr' ? 'मुख्य पृष्ठावर जा' : 'Go to main page'}
                      </p>
                    </div>
                    <svg className="w-5 h-5 text-gray-400 group-hover:text-blue-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </button>
              </div>
            </div>
          </div>
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
                onClick={() => router.push('/profile-setup')}
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
