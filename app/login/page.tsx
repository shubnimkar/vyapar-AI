'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, Globe2, ShieldCheck, Sparkles } from 'lucide-react';
import SignupForm, { SignupData } from '@/components/auth/SignupForm';
import LoginForm from '@/components/auth/LoginForm';
import { SessionManager } from '@/lib/session-manager';
import { Language } from '@/lib/types';
import { t } from '@/lib/translations';
import { logger } from '@/lib/logger';
import { fullSync as dailyFullSync } from '@/lib/daily-entry-sync';
import { fullSync as creditFullSync } from '@/lib/credit-sync';

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
    const savedLanguage = localStorage.getItem('vyapar-lang') as Language;
    if (savedLanguage) {
      setLanguage(savedLanguage);
    }
  }, [router]);

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const handleLanguageChange = (newLanguage: Language) => {
    setLanguage(newLanguage);
    localStorage.setItem('vyapar-lang', newLanguage);
  };

  const handleSignup = async (data: SignupData) => {
    setLoading(true);
    setError('');
    
    try {
      logger.info('Submitting signup form', { username: data.username });
      
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await response.json();
      
      if (result.success) {
        logger.info('Account created successfully', { userId: result.userId });
        
        // Create session
        const session = SessionManager.createSession(
          result.userId,
          result.username,
          false
        );
        SessionManager.saveSession(session);
        
        // Save language preference
        localStorage.setItem('vyapar-lang', data.language);
        
        // Redirect to home
        router.push('/');
      } else {
        logger.warn('Signup failed', { error: result.error });
        setError(result.error || t('connectionError', language));
      }
    } catch (err) {
      logger.error('Signup network error', { error: err });
      setError(t('connectionError', language));
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (username: string, password: string, rememberDevice: boolean) => {
    setLoading(true);
    setError('');
    
    try {
      logger.info('Submitting login form', { username });
      
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, rememberDevice }),
      });

      const result = await response.json();
      
      if (result.success && result.user) {
        logger.info('Login successful', { userId: result.user.id });
        
        // Create session
        const session = SessionManager.createSession(
          result.user.id,
          result.user.username,
          rememberDevice
        );
        SessionManager.saveSession(session);

        // Perform full sync of daily and credit data into local offline stores
        try {
          const [dailyResult, creditResult] = await Promise.all([
            dailyFullSync(result.user.id).catch((err) => {
              logger.warn('Daily full sync failed after login', { error: err });
              return { pulled: 0, pushed: 0, failed: 1 };
            }),
            creditFullSync(result.user.id).catch((err) => {
              logger.warn('Credit full sync failed after login', { error: err });
              return { pulled: 0, pushed: 0, failed: 1 };
            }),
          ]);

          logger.info('Full sync completed after login', {
            userId: result.user.id,
            daily: dailyResult,
            credit: creditResult,
          });
        } catch (pullError) {
          logger.warn('Failed to sync data after login', { error: pullError });
        }
        
        // Check if profile exists
        try {
          const profileResponse = await fetch(`/api/profile?userId=${result.user.id}`);
          const profileResult = await profileResponse.json();
          
          if (profileResult.success && profileResult.data) {
            logger.info('Profile found, redirecting to home');
            router.push('/');
          } else {
            logger.info('Profile not found, redirecting to home (profile can be completed inline)');
            router.push('/');
          }
        } catch (profileError) {
          logger.error('Error checking profile', { error: profileError });
          router.push('/');
        }
      } else {
        logger.warn('Login failed', { error: result.error, status: response.status });

        if (response.status === 401) {
          setError(t('authenticationFailed', language));
          return;
        }

        if (result.message) {
          setError(result.message);
          return;
        }

        if (result.error) {
          setError(result.error);
          return;
        }

        setError(t('connectionError', language));
      }
    } catch (err) {
      logger.error('Login network error', { error: err });
      setError(t('connectionError', language));
    } finally {
      setLoading(false);
    }
  };

  const handleModeSwitch = (newMode: AuthMode) => {
    setMode(newMode);
    setError('');
  };

  const authHeading =
    mode === 'signin'
      ? language === 'hi'
        ? 'वापसी पर स्वागत है'
        : language === 'mr'
          ? 'पुन्हा स्वागत आहे'
          : 'Welcome back'
      : language === 'hi'
        ? 'अपना खाता बनाएं'
        : language === 'mr'
          ? 'तुमचे खाते तयार करा'
          : 'Create your account';

  const authSubheading =
    mode === 'signin'
      ? language === 'hi'
        ? 'अपने व्यवसाय को प्रबंधित करने के लिए साइन इन करें।'
        : language === 'mr'
          ? 'तुमचा व्यवसाय व्यवस्थापित करण्यासाठी साइन इन करा.'
          : 'Sign in to continue managing your business.'
      : language === 'hi'
        ? 'कुछ आसान चरणों में Vyapar AI को अपनी दुकान के लिए सेट करें।'
        : language === 'mr'
        ? 'काही सोप्या टप्प्यांत Vyapar AI तुमच्या दुकानासाठी सेट करा.'
          : 'Set up Vyapar AI for your shop in a few steps.';

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.18),_transparent_32%),radial-gradient(circle_at_bottom_right,_rgba(99,102,241,0.16),_transparent_28%),linear-gradient(135deg,#f8fbff_0%,#eef3ff_45%,#f5f7ff_100%)]">
      <div className="grid min-h-screen w-full overflow-hidden bg-white/80 shadow-[0_28px_80px_-32px_rgba(15,23,42,0.35)] backdrop-blur lg:grid-cols-[1.08fr_0.92fr]">
          <section className="relative overflow-hidden bg-[linear-gradient(160deg,#0f1b4d_0%,#16367a_48%,#2b63ff_100%)] px-6 py-8 text-white sm:px-10 sm:py-12 lg:px-12 lg:py-14">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(255,255,255,0.22),_transparent_22%),radial-gradient(circle_at_bottom_left,_rgba(147,197,253,0.22),_transparent_28%)]" />
            <div className="absolute -right-24 top-12 h-56 w-56 rounded-full bg-white/10 blur-3xl" />
            <div className="absolute bottom-0 left-0 h-48 w-48 rounded-full bg-blue-300/20 blur-3xl" />

            <div className="relative flex h-full flex-col justify-between gap-10">
              <div className="space-y-8">
                <div className="inline-flex items-center gap-3 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium text-blue-50">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/16">
                    <Building2 className="h-5 w-5" />
                  </span>
                  <span>{t('appTitle', language)}</span>
                </div>

                <div className="max-w-2xl space-y-4">
                  <p className="inline-flex items-center gap-2 rounded-full border border-blue-200/20 bg-blue-100/10 px-3 py-1 text-xs font-semibold tracking-[0.08em] text-blue-100/90">
                    <Sparkles className="h-3.5 w-3.5" />
                    {language === 'hi'
                      ? 'स्मार्ट बिज़नेस ऑपरेटिंग सिस्टम'
                      : language === 'mr'
                        ? 'स्मार्ट बिझनेस ऑपरेटिंग सिस्टम'
                        : 'Smart Business Operating System'}
                  </p>
                  <h1 className="max-w-2xl text-4xl font-bold leading-tight sm:text-5xl">
                    {language === 'hi'
                      ? 'बिक्री, खर्च, उधार और फॉलो-अप को एक ही जगह संभालें।'
                      : language === 'mr'
                        ? 'विक्री, खर्च, उधारी आणि फॉलो-अप एकाच ठिकाणी सांभाळा.'
                        : 'Track sales, expenses, credit, and collections in one place.'}
                  </h1>
                  <p className="max-w-lg text-base leading-7 text-blue-100/88 sm:text-lg">
                    {language === 'hi'
                      ? 'छोटे व्यवसायों के लिए बनाया गया सरल, तेज और भरोसेमंद कार्यक्षेत्र।'
                      : language === 'mr'
                        ? 'लहान व्यवसायांसाठी तयार केलेले सोपे, जलद आणि विश्वासार्ह कार्यक्षेत्र.'
                        : 'A calmer, faster workspace for shop owners who need clarity every day.'}
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl border border-white/15 bg-white/10 p-4">
                    <Globe2 className="mb-3 h-5 w-5 text-blue-100" />
                    <p className="text-sm font-semibold leading-6">
                      {language === 'hi'
                        ? '3 भाषाओं में काम करता है'
                        : language === 'mr'
                          ? '3 भाषांमध्ये काम करते'
                          : 'Works in 3 languages'}
                    </p>
                    <p className="mt-1 text-sm leading-6 text-blue-100/80">English, हिंदी, मराठी</p>
                  </div>
                  <div className="rounded-2xl border border-white/15 bg-white/10 p-4">
                    <ShieldCheck className="mb-3 h-5 w-5 text-blue-100" />
                    <p className="text-sm font-semibold leading-6">
                      {language === 'hi'
                        ? 'निजी और सुरक्षित'
                        : language === 'mr'
                          ? 'खाजगी आणि सुरक्षित'
                          : 'Private and secure'}
                    </p>
                    <p className="mt-1 text-sm leading-6 text-blue-100/80">
                      {language === 'hi'
                        ? 'सरकारी सिस्टम से जुड़ा नहीं'
                        : language === 'mr'
                          ? 'सरकारी सिस्टीमशी जोडलेले नाही'
                          : 'Not connected to GST or government systems'}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-white/15 bg-white/10 p-4">
                    <Building2 className="mb-3 h-5 w-5 text-blue-100" />
                    <p className="text-sm font-semibold leading-6">
                      {language === 'hi'
                        ? 'छोटे व्यापार के लिए बना'
                        : language === 'mr'
                          ? 'लहान व्यवसायांसाठी बनवलेले'
                          : 'Built for small business'}
                    </p>
                    <p className="mt-1 text-sm leading-6 text-blue-100/80">
                      {language === 'hi'
                        ? 'दुकान, सेवा और रिटेल उपयोग के लिए'
                        : language === 'mr'
                          ? 'दुकान, सेवा आणि रिटेल वापरासाठी'
                          : 'Designed for shops, services, and retail teams'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="relative rounded-3xl border border-white/15 bg-white/10 p-5 backdrop-blur">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/15">
                    <ShieldCheck className="h-6 w-6 text-blue-50" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">
                      {language === 'hi'
                        ? 'आपका व्यवसाय डेटा निजी रहता है'
                        : language === 'mr'
                          ? 'तुमचा व्यवसाय डेटा खाजगी राहतो'
                          : 'Your business data stays private'}
                    </p>
                    <p className="mt-1 text-sm leading-6 text-blue-100/82">
                      {t('trustBanner', language)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="flex min-h-screen flex-col bg-white/90 px-5 py-6 sm:px-8 sm:py-8 lg:px-10 lg:py-10">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-600/80">
                  {t('appTitle', language)}
                </p>
                <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-900">
                  {authHeading}
                </h2>
                <p className="mt-2 max-w-md text-sm leading-6 text-slate-600">
                  {authSubheading}
                </p>
              </div>

              <div className="inline-flex rounded-2xl border border-slate-200 bg-slate-50 p-1 shadow-sm">
                {(['en', 'hi', 'mr'] as Language[]).map((option) => (
                  <button
                    key={option}
                    onClick={() => handleLanguageChange(option)}
                    className={`rounded-xl px-3 py-2 text-sm font-semibold transition-all ${
                      language === option
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-slate-600 hover:bg-white hover:text-slate-900'
                    }`}
                  >
                    {option === 'en' ? 'EN' : option === 'hi' ? 'हिं' : 'मर'}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-6 inline-flex rounded-2xl border border-slate-200 bg-slate-100 p-1">
              <button
                onClick={() => handleModeSwitch('signin')}
                className={`flex-1 rounded-xl px-4 py-3 text-sm font-semibold transition-all ${
                  mode === 'signin'
                    ? 'bg-white text-blue-700 shadow-sm ring-1 ring-slate-200'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {t('loginButton', language)}
              </button>
              <button
                onClick={() => handleModeSwitch('signup')}
                className={`flex-1 rounded-xl px-4 py-3 text-sm font-semibold transition-all ${
                  mode === 'signup'
                    ? 'bg-white text-blue-700 shadow-sm ring-1 ring-slate-200'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {t('signupButton', language)}
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto pr-1 lg:max-h-[calc(100vh-13rem)]">
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
            </div>

            <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
                  <ShieldCheck className="h-4.5 w-4.5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    {language === 'hi'
                      ? 'विश्वास के साथ उपयोग करें'
                      : language === 'mr'
                        ? 'विश्वासाने वापरा'
                        : 'Use with confidence'}
                  </p>
                  <p className="mt-1 text-sm leading-6 text-slate-600">
                    {t('trustBanner', language)}
                  </p>
                </div>
              </div>
            </div>
          </section>
      </div>
    </div>
  );
}
