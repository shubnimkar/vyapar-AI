/**
 * Badge Component
 * 
 * A small, compact badge component for displaying counts, labels, and status indicators.
 * Used in navigation for pending item counts and throughout the app for status indicators.
 * 
 * @see .kiro/specs/ui-ux-redesign/design.md for complete specifications
 * @see .kiro/specs/ui-ux-redesign/requirements.md - Requirements 8.5, 18.5
 */

import React from 'react';
import { cn } from '@/lib/design-system/utils';

export type BadgeVariant = 'default' | 'success' | 'warning' | 'error' | 'info';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Visual style variant of the badge */
  variant?: BadgeVariant;
}

/**
 * Variant styles mapping
 * Each variant has distinct background and text colors for semantic meaning
 */
const variantStyles: Record<BadgeVariant, string> = {
  default: 'bg-neutral-100 text-neutral-700',
  success: 'bg-success-100 text-success-700',
  warning: 'bg-warning-100 text-warning-700',
  error: 'bg-error-100 text-error-700',
  info: 'bg-info-100 text-info-700',
};

/**
 * Badge Component
 * 
 * Pure presentation component with no business logic (per Vyapar rules).
 * Small, compact design for displaying counts, labels, and status indicators.
 * 
 * @example
 * // Count badge for navigation
 * <Badge variant="warning">3</Badge>
 * 
 * @example
 * // Status label badge
 * <Badge variant="error">Overdue</Badge>
 * 
 * @example
 * // Success indicator
 * <Badge variant="success">Paid</Badge>
 * 
 * @example
 * // Info badge with custom styling
 * <Badge variant="info" className="ml-2">New</Badge>
 */
export function Badge({
  variant = 'default',
  className,
  children,
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        // Base styles
        'inline-flex items-center',
        'px-2 py-0.5',
        'text-xs font-medium',
        'rounded-full',
        
        // Variant styles (Requirement 8.5, 18.5)
        variantStyles[variant],
        
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
