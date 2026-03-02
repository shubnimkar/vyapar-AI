'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { SessionManager } from '@/lib/session-manager';
import { Language, UserProfile as UserProfileType } from '@/lib/types';
import { t } from '@/lib/translations';

interface UserProfileProps {
  language: Language;
}

export default function UserProfile({ language }: UserProfileProps) {
  const [user, setUser] = useState<{ userId: string; username: string } | null>(null);
  const [profileData, setProfileData] = useState<UserProfileType | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    const currentUser = SessionManager.getCurrentUser();
    if (currentUser) {
      setUser(currentUser);
      // Load complete profile data after getting basic auth info
      await loadProfileData(currentUser.userId);
    }
  };

  const loadProfileData = async (userId: string) => {
    setProfileLoading(true);
    setProfileError(null);
    
    try {
      const response = await fetch(`/api/profile?userId=${userId}`);
      const result = await response.json();
      
      if (result.success && result.data) {
        setProfileData(result.data);
      } else {
        // Profile not found or incomplete - user hasn't completed profile setup
        // This is normal for new users, so don't set it as an error
        console.log('[UserProfile] Profile not found or incomplete:', result.error);
        setProfileData(null);
      }
    } catch (error) {
      // Network error or API failure - handle gracefully
      console.warn('[UserProfile] Failed to load profile data:', error);
      const errorMsg = error instanceof Error ? error.message : String(error);
      
      // Check for common connection issues (ISP blocks in India)
      if (errorMsg.includes('fetch failed') || errorMsg.includes('ECONNRESET')) {
        console.warn('[UserProfile] Connection error detected - using fallback display');
        setProfileError('connection');
      } else {
        setProfileError('api');
      }
      setProfileData(null);
    } finally {
      setProfileLoading(false);
    }
  };

  const handleLogout = async () => {
    setLoading(true);
    try {
      // Sync data to cloud before logging out (best effort)
      if (user) {
        console.log('[UserProfile] Syncing data before logout...');
        try {
          const { HybridSyncManager } = await import('@/lib/hybrid-sync-dynamodb');
          await HybridSyncManager.syncToCloud(user.userId);
          console.log('[UserProfile] Data synced successfully');
        } catch (syncError) {
          console.error('[UserProfile] Failed to sync data before logout:', syncError);
          // Continue with logout anyway - data remains in localStorage for offline use
        }
      }
      
      // Logout (clears auth session but keeps user data in localStorage)
      SessionManager.clearSession();
      router.push('/login');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setLoading(false);
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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(language === 'hi' ? 'hi-IN' : language === 'mr' ? 'mr-IN' : 'en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (!user) {
    return null;
  }

  // Determine what to display based on profile data availability
  const hasCompleteProfile = profileData && profileData.shopName && profileData.userName;
  const showBusinessProfile = hasCompleteProfile && !profileLoading;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <div className="flex items-center justify-between gap-4">
        <div 
          className="flex-1 cursor-pointer hover:bg-gray-50 -m-2 p-2 rounded-lg transition-colors"
          onClick={() => router.push('/profile')}
        >
          {showBusinessProfile ? (
            // Display complete business profile information prominently
            <>
              {/* Shop Name - Primary identifier (most prominent) */}
              <div className="mb-2">
                <p className="text-sm text-gray-500 mb-1">
                  {language === 'hi' ? 'दुकान का नाम' : language === 'mr' ? 'दुकानाचे नाव' : 'Shop Name'}
                </p>
                <p className="text-xl font-bold text-gray-900">
                  {profileData!.shopName}
                </p>
              </div>

              {/* User Name - Secondary identifier */}
              <div className="mb-2">
                <p className="text-sm text-gray-500 mb-1">
                  {language === 'hi' ? 'मालिक का नाम' : language === 'mr' ? 'मालकाचे नाव' : 'Owner Name'}
                </p>
                <p className="text-lg font-semibold text-gray-700">
                  {profileData!.userName}
                </p>
              </div>

              {/* Business Type and City - Additional info */}
              {(profileData!.businessType || profileData!.city) && (
                <div className="mb-2">
                  <p className="text-xs text-gray-500">
                    {[
                      profileData!.businessType && (
                        language === 'hi' ? 
                          (profileData!.businessType === 'retail' ? 'खुदरा' :
                           profileData!.businessType === 'wholesale' ? 'थोक' :
                           profileData!.businessType === 'services' ? 'सेवा' :
                           profileData!.businessType === 'manufacturing' ? 'निर्माण' : 'अन्य') :
                        language === 'mr' ?
                          (profileData!.businessType === 'retail' ? 'किरकोळ' :
                           profileData!.businessType === 'wholesale' ? 'घाऊक' :
                           profileData!.businessType === 'services' ? 'सेवा' :
                           profileData!.businessType === 'manufacturing' ? 'उत्पादन' : 'इतर') :
                          (profileData!.businessType === 'retail' ? 'Retail' :
                           profileData!.businessType === 'wholesale' ? 'Wholesale' :
                           profileData!.businessType === 'services' ? 'Services' :
                           profileData!.businessType === 'manufacturing' ? 'Manufacturing' : 'Other')
                      ),
                      profileData!.city
                    ].filter(Boolean).join(' • ')}
                  </p>
                </div>
              )}

              {/* Phone Number - Tertiary information */}
              <div className="mt-3 pt-2 border-t border-gray-100">
                <p className="text-xs text-gray-400 mb-1">{t('phoneNumber', language)}</p>
                <p className="text-sm text-gray-600">
                  {profileData?.phoneNumber ? formatPhoneDisplay(profileData.phoneNumber) : 'Not provided'}
                </p>
              </div>

              {/* View Profile Link */}
              <div className="mt-2">
                <span className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1">
                  {language === 'hi' ? 'प्रोफ़ाइल देखें' : language === 'mr' ? 'प्रोफाइल पहा' : 'View Profile'}
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </span>
              </div>
            </>
          ) : (
            // Fallback to basic auth display (original behavior)
            <>
              {profileLoading && (
                <div className="mb-2">
                  <p className="text-sm text-gray-500">
                    {language === 'hi' ? 'प्रोफ़ाइल लोड हो रहा है...' : 
                     language === 'mr' ? 'प्रोफाइल लोड होत आहे...' : 
                     'Loading profile...'}
                  </p>
                </div>
              )}
              
              <p className="text-sm text-gray-500 mb-1">{t('phoneNumber', language)}</p>
              <p className="text-lg font-semibold text-gray-900">
                {profileData?.phoneNumber ? formatPhoneDisplay(profileData.phoneNumber) : 'Not provided'}
              </p>
              <p className="text-xs text-gray-500 mt-2">
                {t('accountCreated', language)}: {profileData?.createdAt ? formatDate(profileData.createdAt) : 'N/A'}
              </p>

              {profileError === 'connection' && (
                <p className="text-xs text-amber-600 mt-1">
                  {language === 'hi' ? 'कनेक्शन की समस्या - बेसिक जानकारी दिखाई जा रही है' :
                   language === 'mr' ? 'कनेक्शन समस्या - मूलभूत माहिती दाखवली जात आहे' :
                   'Connection issue - showing basic info'}
                </p>
              )}

              {/* View Profile Link */}
              <div className="mt-2">
                <span className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1">
                  {language === 'hi' ? 'प्रोफ़ाइल देखें' : language === 'mr' ? 'प्रोफाइल पहा' : 'View Profile'}
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </span>
              </div>
            </>
          )}
        </div>
        
        <div className="flex flex-col gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              router.push('/profile');
            }}
            className="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors whitespace-nowrap"
          >
            {language === 'hi' ? 'प्रोफ़ाइल' : language === 'mr' ? 'प्रोफाइल' : 'Profile'}
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleLogout();
            }}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-md hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
          >
            {loading ? '...' : t('logout', language)}
          </button>
        </div>
      </div>
    </div>
  );
}