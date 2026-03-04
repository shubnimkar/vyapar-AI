'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import ProfileSetupForm from '@/components/ProfileSetupForm';
import { SessionManager } from '@/lib/session-manager';
import { Language } from '@/lib/types';
import { logger } from '@/lib/logger';

export default function ProfileSetupPage() {
  const router = useRouter();
  const [language, setLanguage] = useState<Language>('en');
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [existingProfile, setExistingProfile] = useState<any>(null);
  const [isEditMode, setIsEditMode] = useState(false);

  useEffect(() => {
    checkAuthAndLoadProfile();
  }, [router]);

  const checkAuthAndLoadProfile = async () => {
    // Check authentication
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

    // Try to load existing profile
    try {
      const response = await fetch(`/api/profile?userId=${currentUser.userId}`);
      const result = await response.json();
      
      if (result.success && result.data && result.data.shopName) {
        // Profile exists, we're in edit mode
        setExistingProfile(result.data);
        setIsEditMode(true);
      }
    } catch (err) {
      logger.error('Failed to load profile', { error: err });
      // Continue with creation mode
    }

    setLoading(false);
  };

  const handleComplete = () => {
    // Save language preference
    localStorage.setItem('vyapar-language', language);
    
    // Redirect to dashboard
    router.push('/');
  };

  const handleSkip = () => {
    // Save language preference
    localStorage.setItem('vyapar-language', language);
    
    // Redirect to dashboard
    router.push('/');
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <ProfileSetupForm
      phoneNumber={existingProfile?.phoneNumber || ''}
      userId={user.userId}
      onComplete={handleComplete}
      onSkip={handleSkip}
      language={language}
      initialData={existingProfile ? {
        shopName: existingProfile.shopName || '',
        userName: existingProfile.userName || '',
        language: existingProfile.language || language,
        businessType: existingProfile.businessType || '',
        city: existingProfile.city || '',
      } : undefined}
      isEditMode={isEditMode}
    />
  );
}
