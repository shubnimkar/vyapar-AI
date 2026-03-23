/**
 * Design Tokens - Single Source of Truth
 * 
 * This file contains all design tokens for the Vyapar AI application.
 * These tokens are used by Tailwind CSS configuration and TypeScript components.
 * 
 * @see .kiro/specs/ui-ux-redesign/design.md for complete specifications
 */

export const tokens = {
  colors: {
    // Primary palette (blue) - Brand identity
    primary: {
      50: '#eff6ff',
      100: '#dbeafe',
      200: '#bfdbfe',
      300: '#93c5fd',
      400: '#60a5fa',
      500: '#3b82f6',  // Base primary
      600: '#2563eb',
      700: '#1d4ed8',
      800: '#1e40af',
      900: '#1e3a8a',
    },
    
    // Success palette (green) - Positive states
    success: {
      50: '#f0fdf4',
      100: '#dcfce7',
      200: '#bbf7d0',
      300: '#86efac',
      400: '#4ade80',
      500: '#22c55e',  // Base success
      600: '#16a34a',
      700: '#15803d',
      800: '#166534',
      900: '#14532d',
    },
    
    // Warning palette (orange/yellow) - Warning states
    warning: {
      50: '#fffbeb',
      100: '#fef3c7',
      200: '#fde68a',
      300: '#fcd34d',
      400: '#fbbf24',
      500: '#f59e0b',  // Base warning
      600: '#d97706',
      700: '#b45309',
      800: '#92400e',
      900: '#78350f',
    },
    
    // Error palette (red) - Error states
    error: {
      50: '#fef2f2',
      100: '#fee2e2',
      200: '#fecaca',
      300: '#fca5a5',
      400: '#f87171',
      500: '#ef4444',  // Base error
      600: '#dc2626',
      700: '#b91c1c',
      800: '#991b1b',
      900: '#7f1d1d',
    },
    
    // Info palette (blue) - Informational states
    info: {
      50: '#eff6ff',
      100: '#dbeafe',
      200: '#bfdbfe',
      300: '#93c5fd',
      400: '#60a5fa',
      500: '#3b82f6',  // Base info
      600: '#2563eb',
      700: '#1d4ed8',
      800: '#1e40af',
      900: '#1e3a8a',
    },
    
    // Neutral palette (grayscale) - Backgrounds, borders, text
    neutral: {
      0: '#ffffff',
      50: '#f9fafb',
      100: '#f3f4f6',
      200: '#e5e7eb',
      300: '#d1d5db',
      400: '#9ca3af',
      500: '#6b7280',
      600: '#4b5563',
      700: '#374151',
      800: '#1f2937',
      900: '#111827',
      950: '#030712',
    },
    
    // Financial data colors - Profit/loss visualization
    financial: {
      profit: '#22c55e',      // Green for positive values
      loss: '#ef4444',        // Red for negative values
      neutral: '#6b7280',     // Gray for zero/neutral
    },
  },
  
  typography: {
    fontFamily: {
      sans: [
        'var(--font-geist-sans)',
        'system-ui',
        '-apple-system',
        'BlinkMacSystemFont',
        'Segoe UI',
        'sans-serif',
      ],
      mono: [
        'var(--font-geist-mono)',
        'ui-monospace',
        'SFMono-Regular',
        'monospace',
      ],
      devanagari: [
        'Noto Sans Devanagari',
        'var(--font-geist-sans)',
        'system-ui',
        'sans-serif',
      ],
    },
    
    fontSize: {
      // Material Design 3 Standard (Google's global standard - compact)
      // RECOMMENDED for data-heavy business apps
      xs: ['0.75rem', { lineHeight: '1rem' }],      // 12px — captions
      sm: ['0.875rem', { lineHeight: '1.25rem' }],  // 14px — body small
      base: ['1rem', { lineHeight: '1.5rem' }],     // 16px — body (standard)
      lg: ['1.25rem', { lineHeight: '1.75rem' }],   // 20px — body large (was 18px)
      xl: ['1.375rem', { lineHeight: '1.75rem' }],   // 22px — headline small (was 20px)
      '2xl': ['1.5rem', { lineHeight: '2rem' }],    // 24px — headline (was 24px)
      '3xl': ['1.75rem', { lineHeight: '2.25rem' }], // 28px — headline large (was 30px)
      '4xl': ['2rem', { lineHeight: '2.5rem' }],    // 32px — display small (was 36px)
      '5xl': ['2.25rem', { lineHeight: '2.75rem' }], // 36px — display medium
      '6xl': ['2.875rem', { lineHeight: '3.5rem' }], // 46px — display large
    },
    
    fontWeight: {
      light: '300',
      normal: '400',
      medium: '500',
      semibold: '600',
      bold: '700',
    },
    
    lineHeight: {
      tight: '1.25',
      normal: '1.5',
      relaxed: '1.75',
      loose: '2',
    },
  },
  
  spacing: {
    0: '0',
    1: '0.25rem',   // 4px
    2: '0.5rem',    // 8px
    3: '0.75rem',   // 12px
    4: '1rem',      // 16px
    5: '1.25rem',   // 20px
    6: '1.5rem',    // 24px
    8: '2rem',      // 32px
    10: '2.5rem',   // 40px
    12: '3rem',     // 48px
    16: '4rem',     // 64px
    20: '5rem',     // 80px
    24: '6rem',     // 96px
    32: '8rem',     // 128px
  },
  
  shadows: {
    none: 'none',
    sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    base: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
    lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
    xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
    '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)',
  },
  
  borderRadius: {
    none: '0',
    sm: '0.25rem',   // 4px
    base: '0.5rem',  // 8px
    md: '0.75rem',   // 12px
    lg: '1rem',      // 16px
    xl: '1.5rem',    // 24px
    '2xl': '2rem',   // 32px
    full: '9999px',
  },
  
  animation: {
    duration: {
      fast: '150ms',
      base: '300ms',
      slow: '500ms',
    },
    easing: {
      easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
      easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
      easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
    },
  },
  
  breakpoints: {
    mobile: '0px',
    tablet: '640px',
    desktop: '1024px',
    wide: '1280px',
  },
  
  touchTarget: {
    minSize: '44px',
  },
} as const;

export type Tokens = typeof tokens;
