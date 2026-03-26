'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Globe2, ShieldCheck, Building2 } from 'lucide-react';
import SignupForm, { SignupData } from '@/components/auth/SignupForm';
import LoginForm from '@/components/auth/LoginForm';
import VyaparLogo from '@/components/VyaparLogo';
import { SessionManager } from '@/lib/session-manager';
import { Language } from '@/lib/types';
import { t } from '@/lib/translations';
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
    if (SessionManager.isAuthenticated()) router.push('/');
    const saved = localStorage.getItem('vyapar-lang') as Language;
    if (saved) setLanguage(saved);
  }, [router]);

  useEffect(() => { document.documentElement.lang = language; }, [language]);

  const handleLanguageChange = (l: Language) => {
    setLanguage(l);
    localStorage.setItem('vyapar-lang', l);
  };

  const handleSignup = async (data: SignupData) => {
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/auth/signup', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
      const result = await res.json();
      if (result.success) {
        SessionManager.saveSession(SessionManager.createSession(result.userId, result.username, false));
        localStorage.setItem('vyapar-lang', data.language);
        router.push('/');
      } else { setError(result.error || t('connectionError', language)); }
    } catch { setError(t('connectionError', language)); }
    finally { setLoading(false); }
  };

  const handleLogin = async (username: string, password: string, rememberDevice: boolean) => {
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password, rememberDevice }) });
      const result = await res.json();
      if (result.success && result.user) {
        SessionManager.saveSession(SessionManager.createSession(result.user.id, result.user.username, rememberDevice));
        try { await Promise.all([dailyFullSync(result.user.id).catch(() => null), creditFullSync(result.user.id).catch(() => null)]); } catch { /* non-blocking */ }
        router.push('/');
      } else {
        if (res.status === 401) { setError(t('authenticationFailed', language)); return; }
        setError(result.message || result.error || t('connectionError', language));
      }
    } catch { setError(t('connectionError', language)); }
    finally { setLoading(false); }
  };

  const handleModeSwitch = (m: AuthMode) => { setMode(m); setError(''); };

  const LangSwitcher = ({ theme }: { theme: 'dark' | 'light' }) => {
    const options = ['en', 'hi', 'mr'] as Language[];
    const activeColor = theme === 'dark' ? 'text-white font-semibold' : 'text-[#1a1c1d] font-semibold';
    const inactiveColor = theme === 'dark' ? 'text-white/60 hover:text-white' : 'text-[#9a9a9e] hover:text-[#1a1c1d]';
    const dotColor = theme === 'dark' ? 'text-white/30' : 'text-[#c8c8cc]';
    return (
      <div className="flex items-center gap-1.5 rounded-full border border-[#d1d1d6] bg-white/60 px-3 py-1.5 w-fit shrink-0 whitespace-nowrap">
        {options.map((opt, i) => {
          const label = opt === 'en' ? 'English' : opt === 'hi' ? 'हिंदी' : 'मराठी';
          const active = language === opt;
          return (
            <span key={opt} className="flex items-center gap-1.5">
              {i > 0 && <span className={`text-xs ${dotColor}`}>•</span>}
              <button
                onClick={() => handleLanguageChange(opt)}
                className={`text-xs font-medium transition-colors text-center ${active ? (theme === 'dark' ? 'text-white' : 'text-[#1a1c1d]') : inactiveColor}`}
                style={{ minWidth: opt === 'en' ? 42 : 32 }}
              >
                {label}
              </button>
            </span>
          );
        })}
      </div>
    );
  };

  const featureCards = [
    {
      icon: <Globe2 className="h-5 w-5 text-[#0b1a7d]" />,
      title: language === 'hi' ? '3 भाषाओं में काम करता है' : language === 'mr' ? '3 भाषांमध्ये काम करते' : 'Works in 3 languages',
      sub: 'English, हिंदी, मराठी',
    },
    {
      icon: <ShieldCheck className="h-5 w-5 text-[#0b1a7d]" />,
      title: language === 'hi' ? 'निजी और सुरक्षित' : language === 'mr' ? 'खाजगी आणि सुरक्षित' : 'Private and secure',
      sub: language === 'hi' ? 'GST या सरकारी सिस्टम से नहीं जुड़ा' : language === 'mr' ? 'GST किंवा सरकारी प्रणालीशी जोडलेले नाही' : 'Not connected to GST or government systems',
    },
    {
      icon: <Building2 className="h-5 w-5 text-[#0b1a7d]" />,
      title: language === 'hi' ? 'छोटे व्यवसाय के लिए' : language === 'mr' ? 'लहान व्यवसायासाठी' : 'Built for small business',
      sub: language === 'hi' ? 'दुकान, सेवाओं और रिटेल टीमों के लिए' : language === 'mr' ? 'दुकाने, सेवा आणि रिटेल टीमसाठी' : 'Designed for shops, services, and retail teams',
    },
  ];

  return (
    <div className="min-h-screen bg-[#f3f4f8] lg:grid lg:grid-cols-2">

      {/* ── LEFT: Hero ── */}
      <section
        className="relative hidden lg:flex flex-col overflow-hidden px-14 pt-6 pb-12"
        style={{ background: 'linear-gradient(160deg, #eef0f8 0%, #f3f4f8 60%, #ede8f5 100%)' }}
      >
        {/* Logo — top left, lang switcher — top right */}
        <div className="flex items-center justify-between">
          <img
            src="/background-removed.png"
            alt="Vyapar AI"
            style={{ height: 100, width: 'auto' }}
            className="shrink-0"
          />
          <LangSwitcher theme="light" />
        </div>

        {/* Content — vertically centered */}
        <div className="mt-12 flex-1 flex flex-col justify-center">

          {/* Headline */}
          <div className="min-h-[13rem]">
            <h1 className="font-headline text-4xl md:text-5xl font-extrabold leading-[1.15] text-[#0b1a7d] max-w-xl">
              {language === 'hi'
                ? <>बिक्री, खर्च, उधार और<br />फॉलो-अप <span style={{ color: '#c9a227' }}>एक ही जगह।</span></>
                : language === 'mr'
                  ? <>विक्री, खर्च, उधारी आणि<br />फॉलो-अप <span style={{ color: '#c9a227' }}>एकाच ठिकाणी.</span></>
                  : <>Track sales, expenses,<br />credit, and collections<br /><span style={{ color: '#c9a227' }}>in one place.</span></>}
            </h1>
            <p className="mt-4 text-base leading-7 max-w-md text-[#4a4c4e]">
              {language === 'hi'
                ? 'छोटे व्यवसायों के लिए बनाया गया सरल, तेज और भरोसेमंद कार्यक्षेत्र।'
                : language === 'mr'
                  ? 'लहान व्यवसायांसाठी तयार केलेले सोपे, जलद आणि विश्वासार्ह कार्यक्षेत्र.'
                  : 'A calmer, faster workspace for shop owners who need clarity every day.'}
            </p>
          </div>

          {/* Feature cards */}
          <div className="grid grid-cols-3 gap-4 mt-2">
            {featureCards.map((c, i) => (
              <div key={i} className="rounded-2xl bg-white/80 border border-white px-4 py-4" style={{ boxShadow: '0 2px 16px rgba(11,26,125,0.06)' }}>
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#0b1a7d]/5 mb-3">
                  {c.icon}
                </div>
                <p className="text-sm font-bold text-[#1a1c1d] leading-5">{c.title}</p>
                <p className="mt-1.5 text-xs leading-5 text-[#7a7c7e]">{c.sub}</p>
              </div>
            ))}
          </div>

          {/* Trust banner */}
          <div className="mt-6 flex items-center gap-3 rounded-2xl bg-white/80 border border-white px-5 py-4" style={{ boxShadow: '0 2px 16px rgba(11,26,125,0.06)' }}>
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#0b1a7d]/5">
              <ShieldCheck className="h-5 w-5 text-[#0b1a7d]" />
            </div>
            <div>
              <p className="text-sm font-semibold text-[#1a1c1d]">
                {language === 'hi' ? 'आपका व्यवसाय डेटा निजी रहता है' : language === 'mr' ? 'तुमचा व्यवसाय डेटा खाजगी राहतो' : 'Your business data stays private'}
              </p>
              <p className="mt-0.5 text-xs text-[#7a7c7e]">{t('trustBanner', language)}</p>
            </div>
          </div>

        </div>
      </section>

      {/* ── RIGHT: Auth card ── */}
      <section className="flex flex-col justify-center bg-[#f8f8fc] px-6 py-10 lg:px-12 lg:py-12">

        {/* Mobile: logo + lang switcher */}
        <div className="flex items-center justify-between mb-6 lg:hidden">
          <VyaparLogo variant="full" height={38} />
          <LangSwitcher theme="light" />
        </div>

        {/* Card */}
        <div className="w-full max-w-md mx-auto rounded-3xl bg-white px-8 py-8 shadow-[0_4px_32px_0_rgba(11,26,125,0.10)]">

          <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#0b1a7d] mb-2">
            {t('appTitle', language)}
          </p>

          <h2 className="text-3xl font-extrabold text-[#1a1c1d] font-headline leading-tight">
            {mode === 'signin'
              ? (language === 'hi' ? 'वापसी पर स्वागत है' : language === 'mr' ? 'पुन्हा स्वागत आहे' : 'Welcome back')
              : (language === 'hi' ? 'अपना खाता बनाएं' : language === 'mr' ? 'तुमचे खाते तयार करा' : 'Create your account')}
          </h2>
          <p className="mt-1 mb-5 text-sm text-[#7a7c7e]">
            {mode === 'signin'
              ? (language === 'hi' ? 'अपने व्यवसाय को प्रबंधित करने के लिए साइन इन करें।' : language === 'mr' ? 'तुमचा व्यवसाय व्यवस्थापित करण्यासाठी साइन इन करा.' : 'Sign in to continue managing your business.')
              : (language === 'hi' ? 'कुछ आसान चरणों में Vyapar AI सेट करें।' : language === 'mr' ? 'काही सोप्या टप्प्यांत Vyapar AI सेट करा.' : 'Set up Vyapar AI for your shop in a few steps.')}
          </p>

          {/* Tab switcher */}
          <div className="mb-6 flex rounded-full bg-[#ebebee] p-1 gap-1">
            <button
              onClick={() => handleModeSwitch('signin')}
              className={`flex-1 rounded-full py-2 text-sm font-semibold transition-all ${mode === 'signin' ? 'bg-[#c9a227] text-[#1a1c1d] shadow-sm' : 'text-[#4a4c4e] hover:text-[#1a1c1d]'}`}
            >
              {t('loginButton', language)}
            </button>
            <button
              onClick={() => handleModeSwitch('signup')}
              className={`flex-1 rounded-full py-2 text-sm font-semibold transition-all ${mode === 'signup' ? 'bg-[#c9a227] text-[#1a1c1d] shadow-sm' : 'text-[#4a4c4e] hover:text-[#1a1c1d]'}`}
            >
              {t('signupButton', language)}
            </button>
          </div>

          {/* Form */}
          <div className={mode === 'signup' ? 'max-h-[55vh] overflow-y-auto' : ''}>
            {mode === 'signup'
              ? <SignupForm onSubmit={handleSignup} loading={loading} error={error} language={language} />
              : <LoginForm onSubmit={handleLogin} loading={loading} error={error} language={language} />}
          </div>

          {/* Trust footer */}
          <div className="mt-5 flex items-center gap-3 rounded-2xl bg-[#f5f5f7] px-4 py-3.5">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#0b1a7d]/10">
              <ShieldCheck className="h-3.5 w-3.5 text-[#0b1a7d]" />
            </div>
            <div>
              <p className="text-sm font-semibold text-[#1a1c1d]">
                {language === 'hi' ? 'विश्वास के साथ उपयोग करें' : language === 'mr' ? 'विश्वासाने वापरा' : 'Use with confidence'}
              </p>
              <p className="mt-0.5 text-xs text-[#7a7c7e]">{t('trustBanner', language)}</p>
            </div>
          </div>

        </div>
      </section>

    </div>
  );
}
