/**
 * Button Component
 * 
 * A versatile button component with multiple variants, sizes, and states.
 * Follows WCAG 2.1 AA accessibility standards with minimum 44px touch targets.
 * 
 * @see .kiro/specs/ui-ux-redesign/design.md for complete specifications
 * @see .kiro/specs/ui-ux-redesign/requirements.md - Requirements 5.1-5.9
 */

import React from 'react';
import { cn } from '@/lib/design-system/utils';
import { Loader2 } from 'lucide-react';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Visual style variant of the button */
  variant?: ButtonVariant;
  /** Size of the button (affects padding and font size) */
  size?: ButtonSize;
  /** Shows loading spinner and disables interaction */
  loading?: boolean;
  /** Makes button take full width of container */
  fullWidth?: boolean;
  /** Icon to display in the button */
  icon?: React.ReactNode;
  /** Position of the icon relative to text */
  iconPosition?: 'left' | 'right';
}

/**
 * Variant styles mapping
 * Each variant has distinct colors for different states
 */
const buttonVariants: Record<ButtonVariant, string> = {
  primary: 'bg-primary-600 text-white hover:bg-primary-700 focus:ring-primary-500 shadow-sm',
  secondary: 'bg-white text-neutral-800 border border-neutral-200 hover:bg-neutral-50 focus:ring-primary-500 shadow-sm',
  outline: 'bg-white border border-neutral-300 text-neutral-700 hover:bg-neutral-50 focus:ring-primary-500',
  ghost: 'bg-transparent text-neutral-700 hover:bg-neutral-100 focus:ring-primary-500',
  danger: 'bg-error-600 text-white hover:bg-error-700 focus:ring-error-500 shadow-sm',
};

/**
 * Size styles mapping
 * Each size has appropriate padding and font size for different contexts
 */
const buttonSizes: Record<ButtonSize, string> = {
  sm: 'h-10 px-4 text-sm',
  md: 'h-12 px-5 text-sm',
  lg: 'h-14 px-6 text-base',
};

/**
 * Button Component
 * 
 * Pure presentation component with no business logic (per Vyapar rules).
 * Uses React.forwardRef for ref forwarding to support form libraries.
 * 
 * @example
 * // Primary button
 * <Button variant="primary">Save</Button>
 * 
 * @example
 * // Button with loading state
 * <Button loading={true}>Processing...</Button>
 * 
 * @example
 * // Button with icon
 * <Button icon={<Plus />} iconPosition="left">Add Entry</Button>
 * 
 * @example
 * // Full width button for mobile forms
 * <Button fullWidth variant="primary">Submit</Button>
 */
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
          'inline-flex items-center justify-center gap-2 whitespace-nowrap',
          'font-semibold rounded-xl',
          'transition-all duration-base',
          'focus:outline-none focus:ring-2 focus:ring-offset-2',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          'min-h-[44px]', // Touch target (Requirement 5.8)

          // Variant styles (Requirement 5.1)
          buttonVariants[variant],
          
          // Size styles (Requirement 5.2)
          buttonSizes[size],
          
          // Full width (Requirement 5.9)
          fullWidth && 'w-full',
          
          className
        )}
        {...props}
      >
        {/* Loading spinner (Requirement 5.3) */}
        {loading && <Loader2 className="w-4 h-4 animate-spin" />}
        
        {/* Icon on left (Requirement 5.5) */}
        {!loading && icon && iconPosition === 'left' && icon}
        
        {/* Button text */}
        {children}
        
        {/* Icon on right (Requirement 5.5) */}
        {!loading && icon && iconPosition === 'right' && icon}
      </button>
    );
  }
);

Button.displayName = 'Button';
