/**
 * Design Tokens — "The Digital Concierge"
 *
 * Creative North Star: A high-end, tailored workspace for shop owners.
 * Built on Deep Indigo (#0b1a7d) stability + Soft Gold (#735c00) prosperity.
 * Tonal depth replaces harsh borders. Editorial typography guides the eye.
 */

export const tokens = {
  colors: {
    // ── Primary: Deep Indigo ──────────────────────────────────────────
    primary: {
      50:  '#eef0fb',
      100: '#d5d9f5',
      200: '#aab3eb',
      300: '#7f8de0',
      400: '#5467d5',
      500: '#2941ca',   // mid-range
      600: '#0b1a7d',   // brand primary
      700: '#091563',   // hover / pressed
      800: '#060e47',   // deep
      900: '#03082b',   // darkest
      container: '#283593', // gradient end for CTAs
    },

    // ── Secondary: Soft Gold ──────────────────────────────────────────
    secondary: {
      50:  '#fdf8e1',
      100: '#faefc3',
      200: '#f5de87',
      300: '#f0cd4b',
      400: '#d4af37',   // Soft Gold base
      500: '#b8960f',
      600: '#9c7d00',
      700: '#735c00',   // on-secondary text / dark gold
      800: '#4a3b00',
      900: '#211a00',
      fixed: '#ffe088', // secondary-fixed for "Value" action buttons
      onFixed: '#735c00',
    },

    // ── Tertiary: Warm Terracotta (Prosperity Header) ─────────────────
    tertiary: {
      50:  '#fdf3ee',
      100: '#fae3d5',
      200: '#f5c7ab',
      300: '#efab81',
      400: '#e98f57',
      500: '#e3732d',
      600: '#c45a18',
      700: '#9e4712',
      800: '#78340d',
      900: '#522208',
      container: '#fae3d5', // Prosperity Header background
      onContainer: '#522208',
    },

    // ── Surface Hierarchy (The "No-Line" Rule) ────────────────────────
    surface: {
      DEFAULT:  '#f9f9fb',   // Level 0 — Foundation / page background
      low:      '#f3f3f5',   // Level 1 — Sections / sidebar
      lowest:   '#ffffff',   // Level 2 — Cards (maximum "pop")
      high:     '#e8e8ea',   // Level 3 — Hover / active selections
      overlay:  'rgba(249,249,251,0.72)', // Glassmorphism base
    },

    // ── On-Surface Text ───────────────────────────────────────────────
    onSurface: {
      DEFAULT: '#1a1c1d',   // Never pure black — softer visual tone
      muted:   '#4a4c4e',
      subtle:  '#7a7c7e',
      disabled:'#ababab',
    },

    // ── Semantic ──────────────────────────────────────────────────────
    success: {
      50: '#f0fdf4', 100: '#dcfce7', 200: '#bbf7d0',
      300: '#86efac', 400: '#4ade80', 500: '#22c55e',
      600: '#16a34a', 700: '#15803d', 800: '#166534', 900: '#14532d',
    },
    warning: {
      50: '#fffbeb', 100: '#fef3c7', 200: '#fde68a',
      300: '#fcd34d', 400: '#fbbf24', 500: '#f59e0b',
      600: '#d97706', 700: '#b45309', 800: '#92400e', 900: '#78350f',
    },
    error: {
      50: '#fef2f2', 100: '#fee2e2', 200: '#fecaca',
      300: '#fca5a5', 400: '#f87171', 500: '#ef4444',
      600: '#dc2626', 700: '#b91c1c', 800: '#991b1b', 900: '#7f1d1d',
    },
    info: {
      50: '#eef0fb', 100: '#d5d9f5', 200: '#aab3eb',
      300: '#7f8de0', 400: '#5467d5', 500: '#2941ca',
      600: '#0b1a7d', 700: '#091563', 800: '#060e47', 900: '#03082b',
    },

    // ── Neutral (grayscale) ───────────────────────────────────────────
    neutral: {
      0:   '#ffffff',
      50:  '#f9f9fb',
      100: '#f3f3f5',
      200: '#e8e8ea',
      300: '#d1d1d3',
      400: '#9ca3af',
      500: '#7a7c7e',
      600: '#4a4c4e',
      700: '#2e3032',
      800: '#1a1c1d',
      900: '#0d0e0f',
      950: '#030303',
    },

    // ── Financial ─────────────────────────────────────────────────────
    financial: {
      profit:  '#22c55e',
      loss:    '#ef4444',
      neutral: '#7a7c7e',
    },

    // ── Outline (Ghost Border) ────────────────────────────────────────
    outline: {
      DEFAULT: 'rgba(26,28,29,0.12)',  // 12% opacity — "Ghost Border"
      variant: 'rgba(26,28,29,0.20)',  // 20% opacity — input fields
      focus:   'rgba(11,26,125,0.50)', // 50% opacity — focus ring
    },
  },

  typography: {
    fontFamily: {
      sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
      headline: ['Manrope', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
      mono: ['ui-monospace', 'SFMono-Regular', 'monospace'],
      devanagari: ['Noto Sans Devanagari', 'Inter', 'system-ui', 'sans-serif'],
    },
    fontSize: {
      xs:   ['0.75rem',  { lineHeight: '1rem' }],
      sm:   ['0.875rem', { lineHeight: '1.25rem' }],
      base: ['1rem',     { lineHeight: '1.5rem' }],
      lg:   ['1.25rem',  { lineHeight: '1.75rem' }],
      xl:   ['1.375rem', { lineHeight: '1.75rem' }],
      '2xl':['1.5rem',   { lineHeight: '2rem' }],
      '3xl':['1.75rem',  { lineHeight: '2.25rem' }],
      '4xl':['2rem',     { lineHeight: '2.5rem' }],
      '5xl':['2.25rem',  { lineHeight: '2.75rem' }],
      '6xl':['3.5rem',   { lineHeight: '4rem' }],   // display-lg for milestone moments
    },
    fontWeight: {
      light:    '300',
      normal:   '400',
      medium:   '500',
      semibold: '600',
      bold:     '700',
      extrabold:'800',
    },
    lineHeight: {
      tight:   '1.25',
      normal:  '1.5',
      relaxed: '1.75',  // required for Devanagari scripts
      loose:   '2',
    },
    letterSpacing: {
      tight:  '-0.01em',
      normal: '0.3px',
      wide:   '0.05em',  // CTA labels — uppercase tracked out
    },
  },

  spacing: {
    0: '0',
    1: '0.25rem',
    2: '0.5rem',
    3: '0.75rem',
    4: '1rem',
    5: '1.25rem',
    6: '1.5rem',
    8: '2rem',
    10: '2.5rem',
    12: '3rem',
    16: '4rem',
    20: '5rem',
    24: '6rem',
    32: '8rem',
  },

  // ── Ambient Shadows (light, airy, brand-tinted) ─────────────────────
  shadows: {
    none:    'none',
    sm:      '0 1px 2px 0 rgba(26,28,29,0.04)',
    base:    '0 2px 4px 0 rgba(26,28,29,0.06)',
    md:      '0 4px 12px 0 rgba(26,28,29,0.08)',
    lg:      '0 8px 24px 0 rgba(26,28,29,0.06)',   // floating elements spec
    xl:      '0 16px 40px 0 rgba(26,28,29,0.08)',
    '2xl':   '0 24px 64px 0 rgba(11,26,125,0.10)', // brand-tinted deep shadow
    glass:   '0 8px 32px 0 rgba(11,26,125,0.08)',  // glassmorphism panels
  },

  borderRadius: {
    none: '0',
    sm:   '0.25rem',
    base: '0.5rem',
    md:   '0.75rem',   // inputs, buttons
    lg:   '1rem',
    xl:   '1.5rem',
    '2xl':'2rem',      // cards
    full: '9999px',
  },

  animation: {
    duration: { fast: '150ms', base: '300ms', slow: '500ms' },
    easing: {
      easeIn:    'cubic-bezier(0.4, 0, 1, 1)',
      easeOut:   'cubic-bezier(0, 0, 0.2, 1)',
      easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
    },
  },

  breakpoints: {
    mobile:  '0px',
    tablet:  '640px',
    desktop: '1024px',
    wide:    '1280px',
  },

  touchTarget: { minSize: '44px' },
} as const;

export type Tokens = typeof tokens;
