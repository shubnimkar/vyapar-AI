/**
 * Button Component — "The Digital Concierge"
 *
 * Primary: Deep Indigo gradient (135°) — authoritative CTA
 * Secondary: Soft Gold (#ffe088) — "Value" actions
 * Ghost border fallback for outlined variants
 */

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
  // Indigo-to-container gradient, uppercase tracked label
  primary:
    'bg-primary-gradient text-white hover:opacity-90 focus:ring-primary-600/40 ' +
    'uppercase tracking-wide',
  // Soft Gold — "Value" actions (discounts, delight moments)
  secondary:
    'bg-secondary-fixed text-secondary-700 hover:bg-secondary-400/30 focus:ring-secondary-400/40',
  // Ghost border — surface-lowest bg, outline-variant border
  outline:
    'bg-surface-lowest border border-outline-variant text-on-surface ' +
    'hover:bg-surface-high focus:ring-primary-600/30',
  ghost:
    'bg-transparent text-on-surface hover:bg-surface-high focus:ring-primary-600/30',
  danger:
    'bg-error-600 text-white hover:bg-error-700 focus:ring-error-500/40',
};

const buttonSizes: Record<ButtonSize, string> = {
  sm: 'h-10 px-4 text-sm',
  md: 'h-12 px-5 text-sm',
  lg: 'h-14 px-6 text-base',
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
          'inline-flex items-center justify-center gap-2 whitespace-nowrap',
          'font-semibold rounded-md',
          'transition-all duration-base',
          'focus:outline-none focus:ring-2 focus:ring-offset-2',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          'min-h-[44px]',
          buttonVariants[variant],
          buttonSizes[size],
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
