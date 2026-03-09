'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import UserSettings from '@/components/UserSettings';
import { Language } from '@/lib/types';
import { SessionManager } from '@/lib/session-manager';

export default function SettingsPage() {
  const router = useRouter();
  const [language, setLanguage] = useState<Language>('en');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    if (!SessionManager.isAuthenticated()) {
      router.push('/login');
      return;
    }

    // Get language from localStorage or default to 'en'
    const savedLanguage = localStorage.getItem('vyapar-lang') as Language;
    if (savedLanguage) {
      setLanguage(savedLanguage);
    }

    setIsLoading(false);
  };

  const handleLanguageChange = (newLanguage: Language) => {
    setLanguage(newLanguage);
    localStorage.setItem('vyapar-lang', newLanguage);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return <UserSettings language={language} onLanguageChange={handleLanguageChange} />;
}
