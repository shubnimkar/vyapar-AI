/**
 * Progress Component
 * 
 * A progress bar component for displaying percentage-based progress and scores.
 * Used for stress index, affordability index, and other financial metrics.
 * 
 * @see .kiro/specs/ui-ux-redesign/design.md for complete specifications
 * @see .kiro/specs/ui-ux-redesign/requirements.md - Requirements 18.5
 */

import React from 'react';
import { cn } from '@/lib/design-system/utils';

export type ProgressVariant = 'default' | 'success' | 'warning' | 'error';
export type ProgressSize = 'sm' | 'md' | 'lg';

interface ProgressProps {
  /** Progress value from 0 to 100 */
  value: number;
  /** Visual style variant of the progress bar */
  variant?: ProgressVariant;
  /** Size of the progress bar */
  size?: ProgressSize;
  /** Whether to show the percentage label */
  showLabel?: boolean;
  /** Custom className for the container */
  className?: string;
}

/**
 * Variant styles mapping
 * Each variant has distinct colors for the filled portion
 */
const variantStyles: Record<ProgressVariant, string> = {
  default: 'bg-primary-600',
  success: 'bg-success-600',
  warning: 'bg-warning-600',
  error: 'bg-error-600',
};

/**
 * Size styles mapping
 * Each size has appropriate height for different contexts
 */
const sizeStyles: Record<ProgressSize, string> = {
  sm: 'h-1',
  md: 'h-2',
  lg: 'h-3',
};

/**
 * Progress Component
 * 
 * Pure presentation component with no business logic (per Vyapar rules).
 * Displays a horizontal progress bar with optional percentage label.
 * Value is automatically clamped between 0 and 100.
 * 
 * @example
 * // Basic progress bar
 * <Progress value={75} />
 * 
 * @example
 * // Progress with label and variant
 * <Progress value={85} variant="success" showLabel />
 * 
 * @example
 * // Small progress bar for compact displays
 * <Progress value={45} size="sm" variant="warning" />
 * 
 * @example
 * // Large progress bar with error state
 * <Progress value={20} size="lg" variant="error" showLabel />
 */
export function Progress({
  value,
  variant = 'default',
  size = 'md',
  showLabel = false,
  className,
}: ProgressProps) {
  // Clamp value between 0 and 100, handle NaN
  const clampedValue = Math.min(100, Math.max(0, isNaN(value) ? 0 : value));

  return (
    <div className={cn('w-full', className)}>
      {/* Optional percentage label (Requirement 18.5) */}
      {showLabel && (
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-neutral-700">
            {clampedValue.toFixed(0)}%
          </span>
        </div>
      )}
      
      {/* Progress bar container */}
      <div 
        className={cn(
          'w-full bg-neutral-200 rounded-full overflow-hidden',
          sizeStyles[size]
        )}
        role="progressbar"
        aria-valuenow={clampedValue}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={showLabel ? undefined : `${clampedValue}%`}
      >
        {/* Progress bar fill with smooth transition */}
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
