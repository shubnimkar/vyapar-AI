'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { SessionManager } from '@/lib/session-manager';
import { Language } from '@/lib/types';
import ProfileContent from '@/components/ProfileContent';

export default function ProfilePage() {
  const router = useRouter();
  const [language, setLanguage] = useState<Language>('en');
  const [user, setUser] = useState<{ userId: string; username: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
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

    setLoading(false);
  };

  if (loading || !user) {
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="w-24"></div>
            
            <h1 className="text-xl font-bold text-gray-900">
              {language === 'hi' ? 'मेरा प्रोफ़ाइल' : language === 'mr' ? 'माझे प्रोफाइल' : 'My Profile'}
            </h1>
            
            <div className="w-24"></div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <ProfileContent language={language} user={user} showBackButton={true} />
      </div>
    </div>
  );
}
