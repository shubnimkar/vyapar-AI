/**
 * ErrorState Component
 * 
 * Displays clear error messages and recovery options.
 * Provides actionable recovery options for users.
 * 
 * @see .kiro/specs/ui-ux-redesign/design.md for complete specifications
 * @see .kiro/specs/ui-ux-redesign/requirements.md - Requirements 11.1-11.7
 */

import React from 'react';
import { cn } from '@/lib/design-system/utils';
import { AlertCircle } from 'lucide-react';
import { Button } from './Button';
import { Card } from './Card';

interface ErrorStateProps {
  /** Title text (text-lg, font-semibold, error-900) */
  title: string;
  /** Error message text (text-sm, error-600, max-w-md, centered) */
  message: string;
  /** Primary recovery action (e.g., "Try Again" button) */
  action?: {
    label: string;
    onClick: () => void;
  };
  /** Secondary recovery action (e.g., "Go Back" button) */
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  /** Additional CSS classes */
  className?: string;
}

/**
 * ErrorState Component
 * 
 * Pure presentation component with no business logic (per Vyapar rules).
 * Centers content vertically and horizontally within container.
 * Supports multi-language text via props.
 * Uses error color (red) for icon and heading to indicate severity.
 * 
 * @example
 * // Error state with retry action
 * <ErrorState
 *   title="Failed to load data"
 *   message="Unable to fetch your daily entries. Please check your connection and try again."
 *   action={{ label: "Try Again", onClick: handleRetry }}
 *   secondaryAction={{ label: "Go Back", onClick: handleGoBack }}
 * />
 * 
 * @example
 * // Error state without actions
 * <ErrorState
 *   title="Access Denied"
 *   message="You don't have permission to view this page."
 * />
 */
export function ErrorState({
  title,
  message,
  action,
  secondaryAction,
  className,
}: ErrorStateProps) {
  return (
    <Card className={cn('', className)}>
      <div className="flex flex-col items-center justify-center text-center py-12 px-4">
        {/* Error icon - AlertCircle, 48px size, error-500 color (Requirement 11.1) */}
        <div className="w-12 h-12 mb-4 rounded-full bg-error-100 flex items-center justify-center">
          <AlertCircle className="w-8 h-8 text-error-600" />
        </div>
        
        {/* Title - text-lg, font-semibold, error-900 (Requirement 11.2) */}
        <h3 className="text-lg font-semibold text-error-900 mb-2">
          {title}
        </h3>
        
        {/* Error message - text-sm, error-600, max-w-md, centered (Requirement 11.3) */}
        <p className="text-sm text-error-600 mb-6 max-w-md">
          {message}
        </p>
        
        {/* Recovery actions (Requirement 11.4) */}
        {(action || secondaryAction) && (
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
        )}
      </div>
    </Card>
  );
}
