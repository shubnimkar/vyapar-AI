'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { Language } from '@/lib/types';
import { ChevronDown, Globe } from 'lucide-react';

interface LanguageSelectorProps {
  currentLanguage: Language;
  onLanguageChange: (lang: Language) => void;
}

const languages = [
  { code: 'en' as Language, name: 'English', nativeName: 'English' },
  { code: 'hi' as Language, name: 'Hindi', nativeName: 'हिंदी' },
  { code: 'mr' as Language, name: 'Marathi', nativeName: 'मराठी' },
];

export default function LanguageSelector({
  currentLanguage,
  onLanguageChange,
}: LanguageSelectorProps) {
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const selectedOptionId = `lang-opt-${currentLanguage}`;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!open) return;
    // Move focus to current selection for keyboard users.
    const el = document.getElementById(selectedOptionId) as HTMLButtonElement | null;
    el?.focus?.();
  }, [open, selectedOptionId]);

  const handleLanguageChange = (lang: Language) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('vyapar-lang', lang);
    }
    onLanguageChange(lang);
    setOpen(false);
  };

  if (!mounted) return null;

  const current = languages.find((l) => l.code === currentLanguage);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        className="flex h-9 items-center gap-1.5 rounded-xl border border-neutral-200 bg-white px-3 text-sm font-medium text-neutral-700 shadow-sm transition-colors hover:bg-neutral-50 sm:h-10 sm:px-4"
      >
        <Globe className="h-4 w-4 text-sky-500 shrink-0" />
        <span className="hidden xs:inline sm:inline">{current?.nativeName ?? 'English'}</span>
        <span className="xs:hidden sm:hidden">{current?.code === 'en' ? 'EN' : current?.code === 'hi' ? 'हि' : 'म'}</span>
        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div
          id={menuId}
          role="menu"
          aria-label="Language menu"
          className="absolute right-0 z-50 mt-2 w-40 rounded-xl border border-neutral-200 bg-white p-1 shadow-lg"
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              e.preventDefault();
              setOpen(false);
              return;
            }

            if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
            e.preventDefault();

            const ordered = languages;
            const activeId = (document.activeElement as HTMLElement | null)?.id;
            const currentIndex = ordered.findIndex((l) => `lang-opt-${l.code}` === activeId);
            const nextIndex =
              e.key === 'ArrowDown'
                ? (currentIndex + 1 + ordered.length) % ordered.length
                : (currentIndex - 1 + ordered.length) % ordered.length;

            const nextEl = document.getElementById(`lang-opt-${ordered[nextIndex].code}`) as HTMLButtonElement | null;
            nextEl?.focus?.();
          }}
        >
          {languages.map((lang) => (
            <button
              key={lang.code}
              onClick={() => handleLanguageChange(lang.code)}
              id={`lang-opt-${lang.code}`}
              role="menuitemradio"
              aria-checked={currentLanguage === lang.code}
              tabIndex={currentLanguage === lang.code ? 0 : -1}
              className={`w-full rounded-2xl px-3 py-2 text-left text-sm transition-colors ${
                currentLanguage === lang.code
                  ? 'bg-primary-50 text-primary-700 font-medium'
                  : 'text-neutral-700 hover:bg-neutral-50'
              }`}
            >
              {lang.nativeName}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
