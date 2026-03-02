'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import SignupForm, { SignupData } from '@/components/auth/SignupForm';
import LoginForm from '@/components/auth/LoginForm';
import { SessionManager } from '@/lib/session-manager';
import { Language } from '@/lib/types';
import { t } from '@/lib/translations';

type AuthMode = 'signin' | 'signup';

export default function LoginPage() {
  const [mode, setMode] = useState<AuthMode>('signin');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [language, setLanguage] = useState<Language>('en');
  const router = useRouter();

  useEffect(() => {
    // Check if already authenticated
    if (SessionManager.isAuthenticated()) {
      router.push('/');
    }

    // Load language preference
    const savedLanguage = localStorage.getItem('vyapar-language') as Language;
    if (savedLanguage) {
      setLanguage(savedLanguage);
    }
  }, [router]);

  const handleLanguageChange = (newLanguage: Language) => {
    setLanguage(newLanguage);
    localStorage.setItem('vyapar-language', newLanguage);
  };

  const handleSignup = async (data: SignupData) => {
    setLoading(true);
    setError('');
    
    try {
      console.log('[Signup] Submitting signup form:', { username: data.username });
      
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await response.json();
      
      if (result.success) {
        console.log('[Signup] Account created successfully:', result.userId);
        
        // Create session
        const session = SessionManager.createSession(
          result.userId,
          result.username,
          false
        );
        SessionManager.saveSession(session);
        
        // Save language preference
        localStorage.setItem('vyapar-language', data.language);
        
        // Redirect to home
        router.push('/');
      } else {
        console.log('[Signup] Signup failed:', result.error);
        setError(result.error || t('connectionError', language));
      }
    } catch (err) {
      console.error('[Signup] Network error:', err);
      setError(t('connectionError', language));
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (username: string, password: string, rememberDevice: boolean) => {
    setLoading(true);
    setError('');
    
    try {
      console.log('[Login] Submitting login form:', { username });
      
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, rememberDevice }),
      });

      const result = await response.json();
      
      if (result.success && result.user) {
        console.log('[Login] Login successful:', result.user.id);
        
        // Create session
        const session = SessionManager.createSession(
          result.user.id,
          result.user.username,
          rememberDevice
        );
        SessionManager.saveSession(session);
        
        // Try to pull data from DynamoDB
        try {
          const { HybridSyncManager } = await import('@/lib/hybrid-sync-dynamodb');
          await HybridSyncManager.pullFromCloud(result.user.id);
        } catch (pullError) {
          console.warn('[Login] Failed to pull data from cloud:', pullError);
        }
        
        // Check if profile exists
        try {
          const profileResponse = await fetch(`/api/profile?userId=${result.user.id}`);
          const profileResult = await profileResponse.json();
          
          if (profileResult.success && profileResult.data) {
            console.log('[Login] Profile found, redirecting to home');
            router.push('/');
          } else {
            console.log('[Login] Profile not found, redirecting to profile setup');
            router.push('/profile-setup');
          }
        } catch (profileError) {
          console.error('[Login] Error checking profile:', profileError);
          router.push('/');
        }
      } else {
        console.log('[Login] Login failed:', result.error);
        setError(result.error || t('authenticationFailed', language));
      }
    } catch (err) {
      console.error('[Login] Network error:', err);
      setError(t('connectionError', language));
    } finally {
      setLoading(false);
    }
  };

  const handleModeSwitch = (newMode: AuthMode) => {
    setMode(newMode);
    setError('');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-xl p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {t('appTitle', language)}
          </h1>
          <p className="text-gray-600">
            {t('appSubtitle', language)}
          </p>
        </div>

        {/* Language Selector */}
        <div className="mb-6 flex justify-center space-x-2">
          <button
            onClick={() => handleLanguageChange('en')}
            className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
              language === 'en'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            English
          </button>
          <button
            onClick={() => handleLanguageChange('hi')}
            className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
              language === 'hi'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            हिंदी
          </button>
          <button
            onClick={() => handleLanguageChange('mr')}
            className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
              language === 'mr'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            मराठी
          </button>
        </div>

        {/* Mode Toggle */}
        <div className="mb-6 flex border-b border-gray-200">
          <button
            onClick={() => handleModeSwitch('signin')}
            className={`flex-1 py-2 text-sm font-medium transition-colors ${
              mode === 'signin'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t('loginButton', language)}
          </button>
          <button
            onClick={() => handleModeSwitch('signup')}
            className={`flex-1 py-2 text-sm font-medium transition-colors ${
              mode === 'signup'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t('signupButton', language)}
          </button>
        </div>

        {/* Form */}
        {mode === 'signup' ? (
          <SignupForm
            onSubmit={handleSignup}
            loading={loading}
            error={error}
            language={language}
          />
        ) : (
          <LoginForm
            onSubmit={handleLogin}
            loading={loading}
            error={error}
            language={language}
          />
        )}

        {/* Trust Banner */}
        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500">
            {t('trustBanner', language)}
          </p>
        </div>
      </div>
    </div>
  );
}
