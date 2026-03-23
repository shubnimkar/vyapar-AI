'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { SessionManager } from '@/lib/session-manager';
import { Language, UserProfile as UserProfileType } from '@/lib/types';
import { t } from '@/lib/translations';
import { logger } from '@/lib/logger';
import { fullSync as dailyFullSync } from '@/lib/daily-entry-sync';
import { fullSync as creditFullSync } from '@/lib/credit-sync';
import ProfileAvatar from '@/components/ui/ProfileAvatar';

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
        logger.debug('[UserProfile] Profile not found or incomplete', { error: result.error });
        setProfileData(null);
      }
    } catch (error) {
      // Network error or API failure - handle gracefully
      logger.warn('[UserProfile] Failed to load profile data', { error });
      const errorMsg = error instanceof Error ? error.message : String(error);
      
      // Check for common connection issues (ISP blocks in India)
      if (errorMsg.includes('fetch failed') || errorMsg.includes('ECONNRESET')) {
        logger.warn('[UserProfile] Connection error detected - using fallback display');
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
        logger.info('[UserProfile] Syncing data before logout...');
        try {
          const [dailyResult, creditResult] = await Promise.all([
            dailyFullSync(user.userId).catch((error) => {
              logger.error('[UserProfile] Daily full sync failed before logout', { error });
              return { pulled: 0, pushed: 0, failed: 1 };
            }),
            creditFullSync(user.userId).catch((error) => {
              logger.error('[UserProfile] Credit full sync failed before logout', { error });
              return { pulled: 0, pushed: 0, failed: 1 };
            }),
          ]);

          logger.info('[UserProfile] Data synced successfully before logout', {
            userId: user.userId,
            daily: dailyResult,
            credit: creditResult,
          });
        } catch (syncError) {
          logger.error('[UserProfile] Failed to sync data before logout', { error: syncError });
          // Continue with logout anyway - data remains in localStorage for offline use
        }
      }
      
      // Logout (clears auth session but keeps user data in localStorage)
      SessionManager.clearSession();
      router.push('/login');
    } catch (error) {
      logger.error('Logout error', { error });
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

  // Compact sidebar version
  const renderSidebarVersion = () => (
    <div className="space-y-2">
      {/* Profile Card - Compact */}
      <div 
        className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-3 shadow-sm"
      >
        {/* Avatar */}
        <ProfileAvatar
          src={profileData?.avatarUrl}
          name={showBusinessProfile ? profileData!.userName : user.username}
          size="sm"
          className="flex-shrink-0"
        />
        
        {/* User Info */}
        <div className="flex-1 min-w-0">
          <p className="truncate text-sm font-semibold text-slate-900">
            {showBusinessProfile ? profileData!.userName : user.username}
          </p>
          {showBusinessProfile && profileData!.shopName && (
            <p className="flex items-center gap-1 truncate text-xs text-slate-500">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              {profileData!.shopName}
            </p>
          )}
        </div>
      </div>
      
      {/* Logout Button */}
      <button
        onClick={handleLogout}
        disabled={loading}
        className="w-full rounded-xl border border-error-200 bg-error-50 px-3 py-2.5 text-sm font-medium text-error-700 transition-colors hover:bg-error-100 focus:outline-none focus:ring-2 focus:ring-error-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? '...' : t('logout', language)}
      </button>
    </div>
  );

  // Full page version
  const renderFullVersion = () => (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          {showBusinessProfile ? (
            <>
              {/* Shop Name */}
              <div className="mb-4">
                <p className="text-sm text-gray-500 mb-1">
                  {language === 'hi' ? 'दुकान का नाम' : language === 'mr' ? 'दुकानाचे नाव' : 'Shop Name'}
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {profileData!.shopName}
                </p>
              </div>

              {/* Owner Name */}
              <div className="mb-4">
                <p className="text-sm text-gray-500 mb-1">
                  {language === 'hi' ? 'मालिक का नाम' : language === 'mr' ? 'मालकाचे नाव' : 'Owner Name'}
                </p>
                <p className="text-lg font-semibold text-gray-700">
                  {profileData!.userName}
                </p>
              </div>

              {/* Business Details */}
              {(profileData!.businessType || profileData!.city) && (
                <div className="mb-4">
                  <p className="text-sm text-gray-600">
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

              {/* Phone */}
              <div className="pt-4 border-t border-gray-200">
                <p className="text-sm text-gray-500 mb-1">{t('phoneNumber', language)}</p>
                <p className="text-base text-gray-700">
                  {profileData?.phoneNumber ? formatPhoneDisplay(profileData.phoneNumber) : 'Not provided'}
                </p>
              </div>
            </>
          ) : (
            <>
              {profileLoading && (
                <p className="text-sm text-gray-500 mb-4">
                  {language === 'hi' ? 'प्रोफ़ाइल लोड हो रहा है...' : 
                   language === 'mr' ? 'प्रोफाइल लोड होत आहे...' : 
                   'Loading profile...'}
                </p>
              )}
              
              <p className="text-sm text-gray-500 mb-1">{t('phoneNumber', language)}</p>
              <p className="text-lg font-semibold text-gray-900 mb-4">
                {profileData?.phoneNumber ? formatPhoneDisplay(profileData.phoneNumber) : 'Not provided'}
              </p>
              
              {profileError === 'connection' && (
                <p className="text-sm text-amber-600 mb-4">
                  {language === 'hi' ? 'कनेक्शन की समस्या' :
                   language === 'mr' ? 'कनेक्शन समस्या' :
                   'Connection issue'}
                </p>
              )}
            </>
          )}
        </div>
        
        <div className="flex flex-col gap-2">
          <button
            onClick={() => router.push('/profile')}
            className="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
          >
            {language === 'hi' ? 'संपादित करें' : language === 'mr' ? 'संपादित करा' : 'Edit Profile'}
          </button>
          <button
            onClick={handleLogout}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? '...' : t('logout', language)}
          </button>
        </div>
      </div>
    </div>
  );

  // Determine which version to render based on context
  // If rendered in sidebar (small container), use compact version
  // If rendered in account section (full page), use full version
  const isInSidebar = typeof window !== 'undefined' && window.innerWidth >= 1024;
  
  return isInSidebar ? renderSidebarVersion() : renderFullVersion();
}
