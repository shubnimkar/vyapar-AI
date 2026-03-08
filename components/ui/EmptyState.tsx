/**
 * EmptyState Component
 * 
 * Displays helpful guidance when no data is available.
 * Provides context-specific messaging and actionable guidance.
 * 
 * @see .kiro/specs/ui-ux-redesign/design.md for complete specifications
 * @see .kiro/specs/ui-ux-redesign/requirements.md - Requirements 10.1-10.7
 */

import React from 'react';
import { cn } from '@/lib/design-system/utils';
import { Button } from './Button';
import { Card } from './Card';

interface EmptyStateProps {
  /** Icon to display (from lucide-react, size 48px) */
  icon: React.ReactNode;
  /** Title text (text-lg, font-semibold, neutral-900) */
  title: string;
  /** Optional description text (text-sm, neutral-600, max-w-md, centered) */
  description?: string;
  /** Optional action button */
  action?: {
    label: string;
    onClick: () => void;
  };
  /** Additional CSS classes */
  className?: string;
}

/**
 * EmptyState Component
 * 
 * Pure presentation component with no business logic (per Vyapar rules).
 * Centers content vertically and horizontally within container.
 * Supports multi-language text via props.
 * 
 * @example
 * // Basic empty state
 * <EmptyState
 *   icon={<FileText className="w-12 h-12" />}
 *   title="No daily entries yet"
 *   description="Start tracking your business by adding your first daily entry"
 *   action={{ label: "Add Entry", onClick: handleAddEntry }}
 * />
 * 
 * @example
 * // Empty state without action
 * <EmptyState
 *   icon={<CreditCard className="w-12 h-12" />}
 *   title="No pending transactions"
 *   description="All transactions have been processed"
 * />
 */
export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <Card className={cn('', className)}>
      <div className="flex flex-col items-center justify-center text-center py-12 px-4">
        {/* Icon - 48px size, neutral-400 color (Requirement 10.1) */}
        <div className="w-12 h-12 mb-4 text-neutral-400">
          {icon}
        </div>
        
        {/* Title - text-lg, font-semibold, neutral-900 (Requirement 10.2) */}
        <h3 className="text-lg font-semibold text-neutral-900 mb-2">
          {title}
        </h3>
        
        {/* Description - text-sm, neutral-600, max-w-md, centered (Requirement 10.3) */}
        {description && (
          <p className="text-sm text-neutral-600 mb-6 max-w-md">
            {description}
          </p>
        )}
        
        {/* Action button (Requirement 10.4) */}
        {action && (
          <Button onClick={action.onClick}>
            {action.label}
          </Button>
        )}
      </div>
    </Card>
  );
}
