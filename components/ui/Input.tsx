/**
 * Input Component
 * 
 * A versatile input component supporting multiple types with validation states.
 * Follows WCAG 2.1 AA accessibility standards with minimum 44px touch targets.
 * 
 * @see .kiro/specs/ui-ux-redesign/design.md for complete specifications
 * @see .kiro/specs/ui-ux-redesign/requirements.md - Requirements 6.1-6.10
 */

import React from 'react';
import { cn } from '@/lib/design-system/utils';
import { AlertCircle, CheckCircle } from 'lucide-react';

export type InputState = 'default' | 'error' | 'success';
export type InputType = 'text' | 'number' | 'date' | 'email' | 'password' | 'tel' | 'url';

interface BaseInputProps {
  /** Label text displayed above the input */
  label?: string;
  /** Error message displayed below the input */
  error?: string;
  /** Success message displayed below the input */
  success?: string;
  /** Helper text displayed below the input (when no error/success) */
  helperText?: string;
  /** Visual state of the input */
  state?: InputState;
  /** Icon or text displayed at the start of the input */
  prefix?: React.ReactNode;
  /** Icon or text displayed at the end of the input */
  suffix?: React.ReactNode;
}

interface StandardInputProps extends BaseInputProps, Omit<React.InputHTMLAttributes<HTMLInputElement>, 'prefix' | 'suffix'> {
  /** Input type - standard HTML input types */
  type?: InputType;
  /** Not used for standard inputs */
  as?: never;
  /** Not used for standard inputs */
  rows?: never;
}

interface TextareaInputProps extends BaseInputProps, Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'prefix' | 'suffix'> {
  /** Use 'textarea' for multi-line text input */
  as: 'textarea';
  /** Number of visible text rows for textarea */
  rows?: number;
  /** Not used for textarea */
  type?: never;
}

interface SelectInputProps extends BaseInputProps, Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'prefix' | 'suffix'> {
  /** Use 'select' for dropdown selection */
  as: 'select';
  /** Not used for select */
  type?: never;
  /** Not used for select */
  rows?: never;
}

export type InputProps = StandardInputProps | TextareaInputProps | SelectInputProps;

/**
 * State-based border and ring color styles
 * Each state has distinct colors using design tokens for visual feedback
 */
const stateStyles = {
  default: 'border-neutral-200 focus:border-primary-500 focus:ring-primary-500/15',
  error: 'border-error-500 focus:border-error-600 focus:ring-error-500/15',
  success: 'border-success-500 focus:border-success-600 focus:ring-success-500/15',
};

/**
 * Input Component
 * 
 * Pure presentation component with no business logic (per Vyapar rules).
 * Uses React.forwardRef for ref forwarding to support form libraries.
 * Supports text, number, date, textarea, and select input types.
 * 
 * @example
 * // Text input with label
 * <Input label="Name" placeholder="Enter your name" />
 * 
 * @example
 * // Number input with currency prefix
 * <Input type="number" label="Amount" prefix="₹" />
 * 
 * @example
 * // Input with error state
 * <Input label="Email" error="Invalid email address" />
 * 
 * @example
 * // Textarea for multi-line input
 * <Input as="textarea" rows={4} label="Description" />
 * 
 * @example
 * // Select dropdown
 * <Input as="select" label="Category">
 *   <option value="">Select...</option>
 *   <option value="food">Food</option>
 * </Input>
 */
export const Input = React.forwardRef<
  HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement,
  InputProps
>((props, ref) => {
  // Extract our custom props first
  const {
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
    as,
    children,
    ...htmlProps
  } = props as InputProps & { children?: React.ReactNode };

  // Determine the actual input state based on error/success props
  const inputState = error ? 'error' : success ? 'success' : state;

  // Base classes shared by all input types
  const baseClasses = cn(
    // Base styles
    'w-full rounded-xl border bg-white px-4 text-base text-neutral-900',
    'transition-all duration-base',
    'focus:outline-none focus:ring-2 focus:ring-offset-0',
    'placeholder:text-neutral-400',
    'disabled:bg-neutral-50 disabled:text-neutral-500 disabled:cursor-not-allowed',
    'min-h-[44px]', // Touch target (Requirement 6.9)
    as === 'textarea' ? 'py-3 min-h-[120px]' : 'h-12',
    
    // State styles (Requirements 6.3, 6.4, 6.5)
    stateStyles[inputState],
    
    // Prefix/suffix padding (Requirement 6.6)
    prefix && 'pl-12',
    (suffix || inputState === 'error' || inputState === 'success') && 'pr-12',
    
    className
  );

  // Render the appropriate input element
  const renderInput = () => {
    if (as === 'textarea') {
      const { rows = 4 } = htmlProps as TextareaInputProps;
      // Only spread valid textarea HTML attributes
      const validProps = Object.keys(htmlProps).reduce((acc, key) => {
        if (!['type', 'rows', 'as'].includes(key)) {
          acc[key] = (htmlProps as any)[key];
        }
        return acc;
      }, {} as any);
      
      return (
        <textarea
          ref={ref as React.Ref<HTMLTextAreaElement>}
          disabled={disabled}
          rows={rows}
          className={cn(baseClasses, 'resize-y')}
          {...validProps}
        >
          {children}
        </textarea>
      );
    }

    if (as === 'select') {
      // Only spread valid select HTML attributes
      const validProps = Object.keys(htmlProps).reduce((acc, key) => {
        if (!['type', 'rows', 'as'].includes(key)) {
          acc[key] = (htmlProps as any)[key];
        }
        return acc;
      }, {} as any);
      
      return (
        <select
          ref={ref as React.Ref<HTMLSelectElement>}
          disabled={disabled}
          className={cn(baseClasses, 'pr-10 appearance-none bg-no-repeat bg-right', 'cursor-pointer')}
          {...validProps}
        >
          {children}
        </select>
      );
    }

    // Standard input (text, number, date, etc.)
    const { type = 'text' } = htmlProps as StandardInputProps;
    // Only spread valid input HTML attributes
    const validProps = Object.keys(htmlProps).reduce((acc, key) => {
      if (!['type', 'rows', 'as'].includes(key)) {
        acc[key] = (htmlProps as any)[key];
      }
      return acc;
    }, {} as any);
    
    return (
      <input
        ref={ref as React.Ref<HTMLInputElement>}
        type={type}
        disabled={disabled}
        className={baseClasses}
        {...validProps}
      />
    );
  };

  return (
    <div className="w-full">
      {/* Label with required indicator (Requirement 6.2) */}
      {label && (
        <label className="mb-2 block text-sm font-medium text-neutral-700">
          {label}
          {required && <span className="text-error-500 ml-1">*</span>}
        </label>
      )}
      
      {/* Input container with prefix/suffix support */}
      <div className="relative">
        {/* Prefix icon/text (Requirement 6.6) */}
        {prefix && (
          <div className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400">
            {prefix}
          </div>
        )}
        
        {/* Input element */}
        {renderInput()}
        
        {/* Suffix icon/text (Requirement 6.6) */}
        {suffix && !error && !success && (
          <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-neutral-400">
            {suffix}
          </div>
        )}
        
        {/* Error icon (Requirement 6.3) */}
        {inputState === 'error' && (
          <AlertCircle className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-error-500 pointer-events-none" />
        )}
        
        {/* Success icon (Requirement 6.4) */}
        {inputState === 'success' && (
          <CheckCircle className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-success-500 pointer-events-none" />
        )}

        {/* Dropdown arrow for select */}
        {as === 'select' && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
            <svg className="w-5 h-5 text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        )}
      </div>
      
      {/* Error message (Requirement 6.3) */}
      {error && (
        <p className="mt-2 text-sm text-error-600 flex items-center gap-1">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </p>
      )}
      
      {/* Success message (Requirement 6.4) */}
      {success && (
        <p className="mt-2 text-sm text-success-600 flex items-center gap-1">
          <CheckCircle className="w-4 h-4 flex-shrink-0" />
          {success}
        </p>
      )}
      
      {/* Helper text (Requirement 6.10) */}
      {helperText && !error && !success && (
        <p className="mt-2 text-sm text-neutral-500">{helperText}</p>
      )}
    </div>
  );
});

Input.displayName = 'Input';
