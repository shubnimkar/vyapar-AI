# Design Document: UI/UX Redesign

## Overview

This design document specifies the technical implementation for a comprehensive UI/UX redesign of the Vyapar AI application. The redesign establishes an international-grade design system that ensures consistency, accessibility, and performance across all components and pages.

### Goals

1. **Design System Foundation**: Create a centralized design token system that serves as the single source of truth for all visual design decisions
2. **Component Library**: Build a comprehensive library of reusable, accessible components following WCAG 2.1 AA standards
3. **Mobile-First Experience**: Optimize for small shop owners in India using low-end devices on 3G networks
4. **Multi-Language Support**: Provide seamless support for English, Hindi, and Marathi with proper Devanagari script rendering
5. **PWA Excellence**: Implement PWA UI patterns that make the app feel native and work reliably offline
6. **Performance**: Ensure fast load times (FCP < 1.5s, TTI < 3s) on low-end devices

### Key Design Principles

1. **Deterministic-First Architecture**: All UI state management follows the hybrid intelligence principle - deterministic core with AI interpretation layer
2. **Offline-First**: UI must never block due to network issues; all interactions work offline with sync indicators
3. **Accessibility by Default**: Every component meets WCAG 2.1 AA standards from the start
4. **Progressive Enhancement**: Start with mobile (320px) and enhance for larger screens
5. **Performance Budget**: Every component optimized for low-end devices and 3G networks

## Architecture

### Design System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Design Token Layer                       │
│  (Single Source of Truth - tokens.ts + tailwind.config.ts)  │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                   Component Library Layer                    │
│  (Reusable Components - components/ui/*)                    │
│  - Buttons, Inputs, Cards, Navigation, etc.                 │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                   Feature Components Layer                   │
│  (Business Logic Components - components/*)                 │
│  - DailyEntryForm, FollowUpPanel, etc.                     │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                        Page Layer                            │
│  (Next.js Pages - app/*)                                    │
└─────────────────────────────────────────────────────────────┘
```

### File Structure

```
lib/
  design-system/
    tokens.ts              # Design tokens (colors, spacing, typography, etc.)
    theme.ts               # Theme configuration
    utils.ts               # Design system utilities (cn, variants, etc.)

components/
  ui/                      # Base component library
    Button.tsx
    Input.tsx
    Card.tsx
    Toast.tsx
    Modal.tsx
    Skeleton.tsx
    EmptyState.tsx
    ErrorState.tsx
    Badge.tsx
    Progress.tsx
    Spinner.tsx
    Navigation/
      Header.tsx
      Sidebar.tsx
      MobileNav.tsx
    
  [existing feature components]

app/
  globals.css             # Global styles + Tailwind imports
  [existing pages]

tailwind.config.ts        # Tailwind configuration using design tokens
```

### Technology Stack

- **Styling**: Tailwind CSS 3.x with custom design tokens
- **Component Library**: React 18+ with TypeScript
- **Icons**: Lucide React (already in use)
- **Fonts**: Noto Sans Devanagari (Google Fonts)
- **Animation**: CSS transitions + Tailwind animations
- **Utilities**: clsx for conditional classes, tailwind-merge for class merging

## Components and Interfaces

### 1. Design Token System

#### Token Structure

```typescript
// lib/design-system/tokens.ts

export const tokens = {
  colors: {
    // Primary palette (blue)
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
    
    // Semantic colors
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
    
    // Neutral palette
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
    
    // Financial data colors
    financial: {
      profit: '#22c55e',      // Green for positive
      loss: '#ef4444',        // Red for negative
      neutral: '#6b7280',     // Gray for zero/neutral
    },
  },
  
  typography: {
    fontFamily: {
      sans: [
        'system-ui',
        '-apple-system',
        'BlinkMacSystemFont',
        'Segoe UI',
        'Roboto',
        'Noto Sans',
        'sans-serif',
      ],
      devanagari: [
        'Noto Sans Devanagari',
        'system-ui',
        'sans-serif',
      ],
    },
    
    fontSize: {
      xs: ['0.75rem', { lineHeight: '1rem' }],      // 12px
      sm: ['0.875rem', { lineHeight: '1.25rem' }],  // 14px
      base: ['1rem', { lineHeight: '1.5rem' }],     // 16px
      lg: ['1.125rem', { lineHeight: '1.75rem' }],  // 18px
      xl: ['1.25rem', { lineHeight: '1.75rem' }],   // 20px
      '2xl': ['1.5rem', { lineHeight: '2rem' }],    // 24px
      '3xl': ['1.875rem', { lineHeight: '2.25rem' }], // 30px
      '4xl': ['2.25rem', { lineHeight: '2.5rem' }], // 36px
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
```

#### Tailwind Configuration

```typescript
// tailwind.config.ts (updated)

import type { Config } from "tailwindcss";
import { tokens } from "./lib/design-system/tokens";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: tokens.colors.primary,
        success: tokens.colors.success,
        warning: tokens.colors.warning,
        error: tokens.colors.error,
        info: tokens.colors.info,
        neutral: tokens.colors.neutral,
        financial: tokens.colors.financial,
      },
      fontFamily: {
        sans: tokens.typography.fontFamily.sans,
        devanagari: tokens.typography.fontFamily.devanagari,
      },
      fontSize: tokens.typography.fontSize,
      fontWeight: tokens.typography.fontWeight,
      lineHeight: tokens.typography.lineHeight,
      spacing: tokens.spacing,
      boxShadow: tokens.shadows,
      borderRadius: tokens.borderRadius,
      screens: {
        tablet: tokens.breakpoints.tablet,
        desktop: tokens.breakpoints.desktop,
        wide: tokens.breakpoints.wide,
      },
      transitionDuration: {
        fast: tokens.animation.duration.fast,
        base: tokens.animation.duration.base,
        slow: tokens.animation.duration.slow,
      },
      transitionTimingFunction: {
        'ease-in': tokens.animation.easing.easeIn,
        'ease-out': tokens.animation.easing.easeOut,
        'ease-in-out': tokens.animation.easing.easeInOut,
      },
    },
  },
  plugins: [],
};

export default config;
```

### 2. Utility Functions

```typescript
// lib/design-system/utils.ts

import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merge Tailwind classes with proper precedence
 * Combines clsx for conditional classes and tailwind-merge for deduplication
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format currency in Indian format
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format percentage with 1 decimal place
 */
export function formatPercentage(value: number): string {
  return `${value.toFixed(1)}%`;
}

/**
 * Get financial color based on value
 */
export function getFinancialColor(value: number): string {
  if (value > 0) return 'text-financial-profit';
  if (value < 0) return 'text-financial-loss';
  return 'text-financial-neutral';
}

/**
 * Get financial background color based on value
 */
export function getFinancialBgColor(value: number): string {
  if (value > 0) return 'bg-success-50';
  if (value < 0) return 'bg-error-50';
  return 'bg-neutral-50';
}
```

### 3. Base Component Library

#### Button Component

```typescript
// components/ui/Button.tsx

import React from 'react';
import { cn } from '@/lib/design-system/utils';
import { Loader2 } from 'lucide-react';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  fullWidth?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
}

const buttonVariants: Record<ButtonVariant, string> = {
  primary: 'bg-primary-600 text-white hover:bg-primary-700 focus:ring-primary-500 shadow-sm',
  secondary: 'bg-neutral-100 text-neutral-900 hover:bg-neutral-200 focus:ring-neutral-500',
  outline: 'border-2 border-neutral-300 text-neutral-700 hover:bg-neutral-50 focus:ring-neutral-500',
  ghost: 'text-neutral-700 hover:bg-neutral-100 focus:ring-neutral-500',
  danger: 'bg-error-600 text-white hover:bg-error-700 focus:ring-error-500 shadow-sm',
};

const buttonSizes: Record<ButtonSize, string> = {
  sm: 'px-3 py-2 text-sm',
  md: 'px-4 py-3 text-base',
  lg: 'px-6 py-4 text-lg',
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      loading = false,
      fullWidth = false,
      icon,
      iconPosition = 'left',
      className,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || loading;

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        className={cn(
          // Base styles
          'inline-flex items-center justify-center gap-2',
          'font-medium rounded-lg',
          'transition-all duration-base',
          'focus:outline-none focus:ring-2 focus:ring-offset-2',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          'min-h-[44px]', // Touch target
          
          // Hover effect
          'hover:scale-[1.02] active:scale-[0.98]',
          
          // Variant styles
          buttonVariants[variant],
          
          // Size styles
          buttonSizes[size],
          
          // Full width
          fullWidth && 'w-full',
          
          className
        )}
        {...props}
      >
        {loading && <Loader2 className="w-4 h-4 animate-spin" />}
        {!loading && icon && iconPosition === 'left' && icon}
        {children}
        {!loading && icon && iconPosition === 'right' && icon}
      </button>
    );
  }
);

Button.displayName = 'Button';
```

#### Input Component

```typescript
// components/ui/Input.tsx

import React from 'react';
import { cn } from '@/lib/design-system/utils';
import { AlertCircle, CheckCircle } from 'lucide-react';

export type InputState = 'default' | 'error' | 'success';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  success?: string;
  helperText?: string;
  state?: InputState;
  prefix?: React.ReactNode;
  suffix?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      success,
      helperText,
      state = 'default',
      prefix,
      suffix,
      className,
      required,
      disabled,
      ...props
    },
    ref
  ) => {
    const inputState = error ? 'error' : success ? 'success' : state;

    const stateStyles = {
      default: 'border-neutral-300 focus:border-primary-500 focus:ring-primary-500',
      error: 'border-error-500 focus:border-error-500 focus:ring-error-500',
      success: 'border-success-500 focus:border-success-500 focus:ring-success-500',
    };

    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-neutral-700 mb-2">
            {label}
            {required && <span className="text-error-500 ml-1">*</span>}
          </label>
        )}
        
        <div className="relative">
          {prefix && (
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500">
              {prefix}
            </div>
          )}
          
          <input
            ref={ref}
            disabled={disabled}
            className={cn(
              // Base styles
              'w-full px-4 py-3 rounded-lg',
              'text-base text-neutral-900',
              'border-2',
              'transition-all duration-base',
              'focus:outline-none focus:ring-2 focus:ring-offset-0',
              'placeholder:text-neutral-400 placeholder:opacity-50',
              'disabled:bg-neutral-100 disabled:cursor-not-allowed',
              'min-h-[44px]', // Touch target
              
              // State styles
              stateStyles[inputState],
              
              // Prefix/suffix padding
              prefix && 'pl-10',
              suffix && 'pr-10',
              
              className
            )}
            {...props}
          />
          
          {suffix && (
            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-500">
              {suffix}
            </div>
          )}
          
          {inputState === 'error' && (
            <AlertCircle className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-error-500" />
          )}
          
          {inputState === 'success' && (
            <CheckCircle className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-success-500" />
          )}
        </div>
        
        {error && (
          <p className="mt-2 text-sm text-error-600 flex items-center gap-1">
            <AlertCircle className="w-4 h-4" />
            {error}
          </p>
        )}
        
        {success && (
          <p className="mt-2 text-sm text-success-600 flex items-center gap-1">
            <CheckCircle className="w-4 h-4" />
            {success}
          </p>
        )}
        
        {helperText && !error && !success && (
          <p className="mt-2 text-sm text-neutral-500">{helperText}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
```

#### Card Component

```typescript
// components/ui/Card.tsx

import React from 'react';
import { cn } from '@/lib/design-system/utils';

export type CardElevation = 'flat' | 'raised' | 'elevated';
export type CardDensity = 'compact' | 'comfortable';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  elevation?: CardElevation;
  density?: CardDensity;
  interactive?: boolean;
  loading?: boolean;
}

const elevationStyles: Record<CardElevation, string> = {
  flat: 'border border-neutral-200',
  raised: 'border border-neutral-200 shadow-sm',
  elevated: 'border border-neutral-200 shadow-md',
};

const densityStyles: Record<CardDensity, string> = {
  compact: 'p-4',
  comfortable: 'p-6',
};

export function Card({
  elevation = 'raised',
  density = 'comfortable',
  interactive = false,
  loading = false,
  className,
  children,
  ...props
}: CardProps) {
  return (
    <div
      className={cn(
        // Base styles
        'bg-white rounded-lg',
        'transition-all duration-base',
        
        // Elevation
        elevationStyles[elevation],
        
        // Density
        densityStyles[density],
        
        // Interactive
        interactive && [
          'cursor-pointer',
          'hover:border-primary-300 hover:shadow-lg',
          'active:scale-[0.99]',
        ],
        
        // Loading
        loading && 'animate-pulse',
        
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('mb-4', className)} {...props}>
      {children}
    </div>
  );
}

export function CardBody({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('', className)} {...props}>
      {children}
    </div>
  );
}

export function CardFooter({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('mt-4 pt-4 border-t border-neutral-200', className)} {...props}>
      {children}
    </div>
  );
}
```


#### Skeleton Component

```typescript
// components/ui/Skeleton.tsx

import React from 'react';
import { cn } from '@/lib/design-system/utils';

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'text' | 'circular' | 'rectangular';
  width?: string | number;
  height?: string | number;
}

export function Skeleton({
  variant = 'rectangular',
  width,
  height,
  className,
  ...props
}: SkeletonProps) {
  const variantStyles = {
    text: 'h-4 rounded',
    circular: 'rounded-full',
    rectangular: 'rounded-lg',
  };

  return (
    <div
      className={cn(
        'bg-neutral-200 animate-pulse',
        variantStyles[variant],
        className
      )}
      style={{
        width: typeof width === 'number' ? `${width}px` : width,
        height: typeof height === 'number' ? `${height}px` : height,
      }}
      {...props}
    />
  );
}
```

#### Empty State Component

```typescript
// components/ui/EmptyState.tsx

import React from 'react';
import { cn } from '@/lib/design-system/utils';
import { Button } from './Button';

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center py-12 px-4',
        className
      )}
    >
      <div className="w-16 h-16 mb-4 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-400">
        {icon}
      </div>
      
      <h3 className="text-lg font-semibold text-neutral-900 mb-2">
        {title}
      </h3>
      
      {description && (
        <p className="text-sm text-neutral-500 mb-6 max-w-md">
          {description}
        </p>
      )}
      
      {action && (
        <Button onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </div>
  );
}
```

#### Error State Component

```typescript
// components/ui/ErrorState.tsx

import React from 'react';
import { cn } from '@/lib/design-system/utils';
import { AlertCircle } from 'lucide-react';
import { Button } from './Button';

interface ErrorStateProps {
  title: string;
  message: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export function ErrorState({
  title,
  message,
  action,
  secondaryAction,
  className,
}: ErrorStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center py-12 px-4',
        className
      )}
    >
      <div className="w-16 h-16 mb-4 rounded-full bg-error-100 flex items-center justify-center">
        <AlertCircle className="w-8 h-8 text-error-600" />
      </div>
      
      <h3 className="text-lg font-semibold text-error-900 mb-2">
        {title}
      </h3>
      
      <p className="text-sm text-neutral-600 mb-6 max-w-md">
        {message}
      </p>
      
      <div className="flex gap-3">
        {action && (
          <Button onClick={action.onClick} variant="primary">
            {action.label}
          </Button>
        )}
        
        {secondaryAction && (
          <Button onClick={secondaryAction.onClick} variant="outline">
            {secondaryAction.label}
          </Button>
        )}
      </div>
    </div>
  );
}
```

#### Spinner Component

```typescript
// components/ui/Spinner.tsx

import React from 'react';
import { cn } from '@/lib/design-system/utils';
import { Loader2 } from 'lucide-react';

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeStyles = {
  sm: 'w-4 h-4',
  md: 'w-6 h-6',
  lg: 'w-8 h-8',
};

export function Spinner({ size = 'md', className }: SpinnerProps) {
  return (
    <Loader2
      className={cn(
        'animate-spin text-primary-600',
        sizeStyles[size],
        className
      )}
    />
  );
}
```

#### Badge Component

```typescript
// components/ui/Badge.tsx

import React from 'react';
import { cn } from '@/lib/design-system/utils';

export type BadgeVariant = 'default' | 'success' | 'warning' | 'error' | 'info';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

const variantStyles: Record<BadgeVariant, string> = {
  default: 'bg-neutral-100 text-neutral-700',
  success: 'bg-success-100 text-success-700',
  warning: 'bg-warning-100 text-warning-700',
  error: 'bg-error-100 text-error-700',
  info: 'bg-info-100 text-info-700',
};

export function Badge({
  variant = 'default',
  className,
  children,
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5',
        'text-xs font-medium rounded-full',
        variantStyles[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
```

#### Progress Component

```typescript
// components/ui/Progress.tsx

import React from 'react';
import { cn } from '@/lib/design-system/utils';

interface ProgressProps {
  value: number; // 0-100
  variant?: 'default' | 'success' | 'warning' | 'error';
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

const variantStyles = {
  default: 'bg-primary-600',
  success: 'bg-success-600',
  warning: 'bg-warning-600',
  error: 'bg-error-600',
};

const sizeStyles = {
  sm: 'h-1',
  md: 'h-2',
  lg: 'h-3',
};

export function Progress({
  value,
  variant = 'default',
  size = 'md',
  showLabel = false,
  className,
}: ProgressProps) {
  const clampedValue = Math.min(100, Math.max(0, value));

  return (
    <div className={cn('w-full', className)}>
      {showLabel && (
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-neutral-700">
            {clampedValue}%
          </span>
        </div>
      )}
      
      <div className={cn('w-full bg-neutral-200 rounded-full overflow-hidden', sizeStyles[size])}>
        <div
          className={cn(
            'h-full transition-all duration-base',
            variantStyles[variant]
          )}
          style={{ width: `${clampedValue}%` }}
        />
      </div>
    </div>
  );
}
```

### 4. Navigation Components

#### Header Component

```typescript
// components/ui/Navigation/Header.tsx

import React from 'react';
import { cn } from '@/lib/design-system/utils';
import { Menu } from 'lucide-react';

interface HeaderProps {
  title: string;
  leftAction?: React.ReactNode;
  rightActions?: React.ReactNode;
  onMenuClick?: () => void;
  className?: string;
}

export function Header({
  title,
  leftAction,
  rightActions,
  onMenuClick,
  className,
}: HeaderProps) {
  return (
    <header
      className={cn(
        'sticky top-0 z-40',
        'bg-white border-b border-neutral-200',
        'px-4 py-3',
        'shadow-sm',
        className
      )}
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {onMenuClick && (
            <button
              onClick={onMenuClick}
              className="p-2 hover:bg-neutral-100 rounded-lg transition-colors desktop:hidden"
              aria-label="Open menu"
            >
              <Menu className="w-6 h-6 text-neutral-700" />
            </button>
          )}
          
          {leftAction}
          
          <h1 className="text-xl font-bold text-neutral-900 truncate">
            {title}
          </h1>
        </div>
        
        {rightActions && (
          <div className="flex items-center gap-2">
            {rightActions}
          </div>
        )}
      </div>
    </header>
  );
}
```

#### Sidebar Component

```typescript
// components/ui/Navigation/Sidebar.tsx

import React from 'react';
import { cn } from '@/lib/design-system/utils';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  badge?: number;
}

interface SidebarProps {
  items: NavItem[];
  footer?: React.ReactNode;
  className?: string;
}

export function Sidebar({ items, footer, className }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        'hidden desktop:flex flex-col',
        'w-60 h-screen',
        'bg-white border-r border-neutral-200',
        'sticky top-0',
        className
      )}
    >
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {items.map((item) => {
          const isActive = pathname === item.href;
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-4 py-3 rounded-lg',
                'text-sm font-medium',
                'transition-all duration-base',
                'min-h-[44px]', // Touch target
                isActive
                  ? 'bg-primary-50 text-primary-700 border-l-4 border-primary-600'
                  : 'text-neutral-700 hover:bg-neutral-50'
              )}
            >
              <span className={cn(isActive ? 'text-primary-600' : 'text-neutral-500')}>
                {item.icon}
              </span>
              
              <span className="flex-1">{item.label}</span>
              
              {item.badge !== undefined && item.badge > 0 && (
                <span className="px-2 py-0.5 bg-warning-100 text-warning-700 text-xs rounded-full font-semibold">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
      
      {footer && (
        <div className="p-4 border-t border-neutral-200">
          {footer}
        </div>
      )}
    </aside>
  );
}
```

#### Mobile Navigation Component

```typescript
// components/ui/Navigation/MobileNav.tsx

import React from 'react';
import { cn } from '@/lib/design-system/utils';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  badge?: number;
}

interface MobileNavProps {
  items: NavItem[];
  className?: string;
}

export function MobileNav({ items, className }: MobileNavProps) {
  const pathname = usePathname();

  return (
    <nav
      className={cn(
        'desktop:hidden',
        'fixed bottom-0 left-0 right-0 z-40',
        'bg-white border-t border-neutral-200',
        'px-2 py-2',
        'shadow-lg',
        className
      )}
    >
      <div className="flex items-center justify-around">
        {items.map((item) => {
          const isActive = pathname === item.href;
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center gap-1 px-3 py-2 rounded-lg',
                'text-xs font-medium',
                'transition-all duration-base',
                'min-w-[60px] min-h-[44px]', // Touch target
                isActive
                  ? 'text-primary-600'
                  : 'text-neutral-600'
              )}
            >
              <div className="relative">
                <span className={cn(isActive && 'scale-110')}>
                  {item.icon}
                </span>
                
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-warning-500 text-white text-[10px] rounded-full flex items-center justify-center font-bold">
                    {item.badge > 9 ? '9+' : item.badge}
                  </span>
                )}
              </div>
              
              <span className="truncate max-w-[60px]">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
```

## Data Models

### Design Token Types

```typescript
// lib/design-system/types.ts

export type ColorShade = 50 | 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900;

export interface ColorPalette {
  50: string;
  100: string;
  200: string;
  300: string;
  400: string;
  500: string;
  600: string;
  700: string;
  800: string;
  900: string;
}

export interface TypographyScale {
  fontSize: string;
  lineHeight: string;
}

export interface SpacingScale {
  [key: string]: string;
}

export interface ShadowScale {
  none: string;
  sm: string;
  base: string;
  md: string;
  lg: string;
  xl: string;
  '2xl': string;
}

export interface BorderRadiusScale {
  none: string;
  sm: string;
  base: string;
  md: string;
  lg: string;
  xl: string;
  '2xl': string;
  full: string;
}

export interface AnimationTokens {
  duration: {
    fast: string;
    base: string;
    slow: string;
  };
  easing: {
    easeIn: string;
    easeOut: string;
    easeInOut: string;
  };
}

export interface Breakpoints {
  mobile: string;
  tablet: string;
  desktop: string;
  wide: string;
}
```

### Component Prop Types

```typescript
// lib/design-system/component-types.ts

export type Size = 'sm' | 'md' | 'lg';
export type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
export type State = 'default' | 'hover' | 'active' | 'focus' | 'disabled';
export type Elevation = 'flat' | 'raised' | 'elevated';
export type Density = 'compact' | 'comfortable';

export interface BaseComponentProps {
  className?: string;
  children?: React.ReactNode;
}

export interface InteractiveComponentProps extends BaseComponentProps {
  disabled?: boolean;
  loading?: boolean;
  onClick?: () => void;
}

export interface FormComponentProps extends BaseComponentProps {
  label?: string;
  error?: string;
  helperText?: string;
  required?: boolean;
  disabled?: boolean;
}
```



## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property Reflection

After analyzing all acceptance criteria, I identified the following redundancies:
- Multiple criteria test touch target size (4.4, 5.8, 6.9, 8.8) - consolidated into one property
- Multiple criteria test contrast ratios (2.7, 3.4) - consolidated into one property
- Multiple criteria test animation duration limits (15.1, 15.8) - consolidated into one property
- Component-specific loading states (5.3, 9.3) - kept separate as they test different components
- Interactive hover states (5.7, 7.3, 15.4) - kept separate as they test different components

### Property 1: Design Token Completeness

*For any* design token category (colors, typography, spacing, shadows, borderRadius, animation, breakpoints), the tokens object SHALL contain all required properties with valid values.

**Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7**

### Property 2: Color Palette Structure

*For any* semantic color palette (primary, success, warning, error, info, neutral), the palette SHALL contain all shades from 50 to 900 with valid hex color values.

**Validates: Requirements 3.1, 3.2, 3.3**

### Property 3: Typography Scale Completeness

*For any* typography token set, it SHALL contain at least 8 font size levels with corresponding line heights.

**Validates: Requirements 2.2**

### Property 4: Spacing Scale Consistency

*For any* spacing token value (except 0), it SHALL follow the 8px base unit pattern (multiples of 8px or 0.5rem).

**Validates: Requirements 4.1**

### Property 5: WCAG Contrast Compliance

*For any* text color and background color combination used in the design system, the contrast ratio SHALL meet WCAG 2.1 AA requirements (4.5:1 for normal text, 3:1 for large text).

**Validates: Requirements 2.7, 3.4**

### Property 6: Touch Target Minimum Size

*For any* interactive component (Button, Input, navigation items), the rendered element SHALL have a minimum height of 44px to meet touch target accessibility requirements.

**Validates: Requirements 4.4, 5.8, 6.9, 8.8**

### Property 7: Button Variant Rendering

*For any* Button variant (primary, secondary, outline, ghost, danger), the component SHALL apply the correct CSS classes for that variant's visual style.

**Validates: Requirements 5.1**

### Property 8: Button Size Rendering

*For any* Button size (sm, md, lg), the component SHALL apply the correct padding and font size classes.

**Validates: Requirements 5.2**

### Property 9: Button Loading State

*For any* Button with loading=true, the component SHALL render a spinner icon and be disabled.

**Validates: Requirements 5.3**

### Property 10: Button Disabled State

*For any* Button with disabled=true, the component SHALL have opacity-50 and cursor-not-allowed classes applied.

**Validates: Requirements 5.4**


### Property 11: Button Icon Configuration

*For any* Button with icon prop, the component SHALL render the icon in the correct position (left or right) relative to the text.

**Validates: Requirements 5.5**

### Property 12: Button Full Width

*For any* Button with fullWidth=true, the component SHALL have w-full class applied.

**Validates: Requirements 5.9**

### Property 13: Input State Rendering

*For any* Input component state (default, error, success), the component SHALL apply the correct border color and ring color classes.

**Validates: Requirements 6.1, 6.3, 6.4**

### Property 14: Input Label with Required Indicator

*For any* Input with label and required props, the component SHALL render the label text with a red asterisk.

**Validates: Requirements 6.2**

### Property 15: Input Prefix and Suffix

*For any* Input with prefix or suffix props, the component SHALL render them in the correct position and adjust padding accordingly.

**Validates: Requirements 6.6**

### Property 16: Input Helper Text

*For any* Input with helperText prop (and no error/success), the component SHALL render the helper text below the input field.

**Validates: Requirements 6.10**

### Property 17: Card Elevation Rendering

*For any* Card elevation level (flat, raised, elevated), the component SHALL apply the correct shadow classes.

**Validates: Requirements 7.2**

### Property 18: Card Interactive Hover

*For any* Card with interactive=true, the component SHALL have hover classes for border color change and shadow increase.

**Validates: Requirements 7.3**

### Property 19: Card Loading State

*For any* Card with loading=true, the component SHALL have animate-pulse class applied.

**Validates: Requirements 7.7**

### Property 20: Card Density Rendering

*For any* Card density option (compact, comfortable), the component SHALL apply the correct padding classes.

**Validates: Requirements 7.8**

### Property 21: Navigation Active State

*For any* navigation item (Sidebar or MobileNav) where the current pathname matches the item's href, the item SHALL be highlighted with primary color classes.

**Validates: Requirements 8.4**

### Property 22: Navigation Badge Display

*For any* navigation item with a badge value greater than 0, the component SHALL render a badge with the count.

**Validates: Requirements 8.5**

### Property 23: Loading Component Animation

*For any* loading component (Spinner, Skeleton), the component SHALL have animation classes (animate-spin or animate-pulse) applied.

**Validates: Requirements 9.5**

### Property 24: Toast Type Rendering

*For any* Toast type (success, error, warning, info), the component SHALL render the correct icon and color classes for that type.

**Validates: Requirements 12.2**

### Property 25: Toast Auto-Dismiss

*For any* Toast component, it SHALL call the onClose callback after the specified duration (default 3000ms for success/info, 5000ms for error/warning).

**Validates: Requirements 12.3**

### Property 26: Spacing Relative Units

*For any* spacing token value, it SHALL use relative units (rem) instead of fixed pixels for scalability.

**Validates: Requirements 13.6**

### Property 27: Component Keyboard Accessibility

*For any* interactive component (Button, Input, navigation items), the component SHALL have focus:ring classes for visible focus indicators.

**Validates: Requirements 14.2**

### Property 28: Component ARIA Labels

*For any* icon-only interactive element, the component SHALL have an aria-label attribute for screen reader accessibility.

**Validates: Requirements 14.3**

### Property 29: Semantic HTML Elements

*For any* navigation component (Header, Sidebar, MobileNav), the component SHALL render semantic HTML elements (header, nav, aside).

**Validates: Requirements 14.4**

### Property 30: Financial Data Color with Icons

*For any* financial data display, the system SHALL use both color (green/red) and icons (TrendingUp/TrendingDown) to convey positive/negative values.

**Validates: Requirements 14.5**

### Property 31: Component ARIA Attributes

*For any* interactive component, the component SHALL have appropriate ARIA attributes (role, aria-label, aria-disabled) when needed.

**Validates: Requirements 14.6**

### Property 32: Animation Duration Tokens

*For any* animation duration token, the value SHALL be less than or equal to 500ms to avoid perceived slowness.

**Validates: Requirements 15.1, 15.8**

### Property 33: Animation Easing Tokens

*For any* animation easing token, the system SHALL define ease-in for exit animations and ease-out for enter animations.

**Validates: Requirements 15.2**

### Property 34: Currency Formatting

*For any* number passed to formatCurrency utility, the function SHALL return a string with ₹ symbol and Indian number formatting (e.g., ₹1,00,000).

**Validates: Requirements 18.2**

### Property 35: Percentage Formatting

*For any* number passed to formatPercentage utility, the function SHALL return a string with % symbol and 1 decimal place precision.

**Validates: Requirements 18.4**

### Property 36: Animation Performance

*For any* component animation, the system SHALL use CSS transform properties instead of layout-triggering properties (width, height, top, left) for better performance.

**Validates: Requirements 19.4**



## Error Handling

### Design Token Validation

**Error Scenario**: Invalid or missing design tokens
- **Detection**: TypeScript type checking at compile time
- **Handling**: Build fails with clear error message indicating which token is missing or invalid
- **Recovery**: Developer must fix tokens.ts to match the required structure

**Error Scenario**: Color contrast ratio below WCAG requirements
- **Detection**: Automated tests using contrast calculation library
- **Handling**: Test fails with specific color combinations that don't meet requirements
- **Recovery**: Adjust color values in tokens to meet contrast requirements

### Component Prop Validation

**Error Scenario**: Invalid prop values passed to components
- **Detection**: TypeScript type checking at compile time
- **Handling**: Build fails with type error
- **Recovery**: Developer must pass valid prop values matching the component's interface

**Error Scenario**: Missing required props
- **Detection**: TypeScript type checking at compile time
- **Handling**: Build fails with error indicating missing required prop
- **Recovery**: Developer must provide all required props

### Runtime Errors

**Error Scenario**: Component rendering fails
- **Detection**: React error boundaries
- **Handling**: Display ErrorState component with user-friendly message
- **Recovery**: Provide "Try Again" button to re-render component

**Error Scenario**: Animation performance issues on low-end devices
- **Detection**: Performance monitoring (FPS drops)
- **Handling**: Respect prefers-reduced-motion media query
- **Recovery**: Disable animations when user has reduced motion preference

### Accessibility Errors

**Error Scenario**: Missing ARIA labels on interactive elements
- **Detection**: Automated accessibility testing (axe-core)
- **Handling**: Test fails with specific elements missing labels
- **Recovery**: Add appropriate aria-label or aria-labelledby attributes

**Error Scenario**: Insufficient color contrast
- **Detection**: Automated accessibility testing
- **Handling**: Test fails with specific color combinations
- **Recovery**: Adjust colors to meet WCAG 2.1 AA requirements



## Testing Strategy

### Dual Testing Approach

The UI/UX redesign requires both unit tests and property-based tests to ensure comprehensive coverage:

**Unit Tests**: Verify specific examples, edge cases, and component rendering
- Component snapshot tests for visual regression
- Specific prop combination tests
- Edge cases (empty states, error states, loading states)
- Integration tests for component composition

**Property-Based Tests**: Verify universal properties across all inputs
- Design token structure validation
- Color contrast ratio compliance
- Component prop handling across all variants
- Accessibility attribute presence
- Animation duration limits

Together, unit tests catch concrete bugs while property tests verify general correctness across all possible inputs.

### Property-Based Testing Configuration

**Library**: fast-check (already in use in the project)

**Iterations**: Minimum 100 iterations per property test

**Tagging**: Each property test must reference its design document property

Example tag format:
```typescript
// Feature: ui-ux-redesign, Property 1: Design Token Completeness
```

Each correctness property MUST be implemented by a SINGLE property-based test.

### Test Organization

```
lib/design-system/__tests__/
  tokens.test.ts                    # Unit tests for token structure
  tokens.property.test.ts           # Property tests for token completeness
  utils.test.ts                     # Unit tests for utility functions
  utils.property.test.ts            # Property tests for formatting functions
  contrast.property.test.ts         # Property tests for WCAG compliance

components/ui/__tests__/
  Button.test.tsx                   # Unit tests for Button component
  Button.property.test.tsx          # Property tests for Button variants/sizes
  Input.test.tsx                    # Unit tests for Input component
  Input.property.test.tsx           # Property tests for Input states
  Card.test.tsx                     # Unit tests for Card component
  Card.property.test.tsx            # Property tests for Card elevation/density
  Toast.test.tsx                    # Unit tests for Toast component
  Toast.property.test.tsx           # Property tests for Toast auto-dismiss
  Skeleton.test.tsx                 # Unit tests for Skeleton component
  EmptyState.test.tsx               # Unit tests for EmptyState component
  ErrorState.test.tsx               # Unit tests for ErrorState component
  Spinner.test.tsx                  # Unit tests for Spinner component
  Badge.test.tsx                    # Unit tests for Badge component
  Progress.test.tsx                 # Unit tests for Progress component
  Navigation/
    Header.test.tsx                 # Unit tests for Header component
    Sidebar.test.tsx                # Unit tests for Sidebar component
    Sidebar.property.test.tsx       # Property tests for Sidebar active state
    MobileNav.test.tsx              # Unit tests for MobileNav component
    MobileNav.property.test.tsx     # Property tests for MobileNav active state

__tests__/
  accessibility.test.tsx            # Accessibility compliance tests
  accessibility.property.test.tsx   # Property tests for ARIA attributes
  responsive.test.tsx               # Responsive design tests
  performance.test.tsx              # Performance optimization tests
```

### Test Coverage Requirements

- **Design Tokens**: 100% coverage of token structure and values
- **Utility Functions**: 100% coverage of all utility functions
- **UI Components**: 90%+ coverage of component logic and rendering
- **Accessibility**: 100% coverage of WCAG 2.1 AA requirements
- **Property Tests**: All 36 correctness properties must have corresponding property-based tests

### Continuous Integration

All tests must pass before merging:
1. Unit tests (Jest + React Testing Library)
2. Property-based tests (fast-check)
3. Accessibility tests (jest-axe)
4. Visual regression tests (Jest snapshots)
5. Type checking (TypeScript)
6. Linting (ESLint)

