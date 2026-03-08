/**
 * Spinner Component
 * 
 * A loading spinner component with multiple sizes.
 * Uses spin animation and primary color.
 * 
 * @see .kiro/specs/ui-ux-redesign/design.md for complete specifications
 * @see .kiro/specs/ui-ux-redesign/requirements.md - Requirements 9.1-9.7
 */

import React from 'react';
import { cn } from '@/lib/design-system/utils';
import { Loader2 } from 'lucide-react';

export type SpinnerSize = 'sm' | 'md' | 'lg';

interface SpinnerProps {
  /** Size of the spinner (sm: 16px, md: 24px, lg: 32px) */
  size?: SpinnerSize;
  /** Additional CSS classes */
  className?: string;
}

const sizeStyles: Record<SpinnerSize, string> = {
  sm: 'w-4 h-4',   // 16px
  md: 'w-6 h-6',   // 24px
  lg: 'w-8 h-8',   // 32px
};

/**
 * Spinner Component
 * 
 * Pure presentation component with no business logic (per Vyapar rules).
 * Uses Loader2 icon from lucide-react with spin animation.
 * Uses primary-600 color by default.
 * 
 * @example
 * // Default medium spinner
 * <Spinner />
 * 
 * @example
 * // Small spinner for inline loading
 * <Spinner size="sm" />
 * 
 * @example
 * // Large spinner for page loading
 * <Spinner size="lg" />
 * 
 * @example
 * // Custom color spinner
 * <Spinner className="text-success-600" />
 */
export function Spinner({ size = 'md', className }: SpinnerProps) {
  return (
    <Loader2
      className={cn(
        'animate-spin text-primary-600',
        sizeStyles[size],
        className
      )}
      aria-label="Loading"
      role="status"
    />
  );
}
