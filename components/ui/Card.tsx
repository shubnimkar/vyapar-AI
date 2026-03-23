/**
 * Card Component
 * 
 * A versatile card component with elevation levels, density options, and interactive variants.
 * Follows the Vyapar AI design system specifications.
 * 
 * @see .kiro/specs/ui-ux-redesign/design.md for complete specifications
 * @see .kiro/specs/ui-ux-redesign/requirements.md - Requirement 7
 */

import React from 'react';
import { cn } from '@/lib/design-system/utils';
import { Skeleton } from './Skeleton';

export type CardElevation = 'flat' | 'raised' | 'elevated';
export type CardDensity = 'compact' | 'comfortable';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Elevation level using shadow tokens */
  elevation?: CardElevation;
  /** Density option for internal spacing */
  density?: CardDensity;
  /** Interactive variant with hover state */
  interactive?: boolean;
  /** Loading state with skeleton placeholders */
  loading?: boolean;
}

const elevationStyles: Record<CardElevation, string> = {
  flat: 'border border-neutral-200',
  raised: 'border border-neutral-200 shadow-sm',
  elevated: 'border border-neutral-200 shadow-md',
};

const densityStyles: Record<CardDensity, string> = {
  compact: 'p-5',
  comfortable: 'p-6',
};

/**
 * Card component with white background, subtle border, and rounded corners
 * 
 * @example
 * <Card elevation="raised" density="comfortable">
 *   <CardHeader>Title</CardHeader>
 *   <CardBody>Content</CardBody>
 * </Card>
 * 
 * @example
 * <Card interactive onClick={() => console.log('clicked')}>
 *   Interactive card with hover effects
 * </Card>
 */
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
        // Base styles - white background, rounded corners (Material Design 3 standard)
        'bg-white rounded-2xl',
        'transition-all duration-base',

        // Elevation - using shadow tokens
        elevationStyles[elevation],

        // Density - internal spacing
        densityStyles[density],

        // Interactive variant - hover state with border color change and shadow increase
        interactive && [
          'cursor-pointer',
          'hover:border-primary-200 hover:shadow-md',
        ],

        // Loading state
        loading && 'animate-pulse',

        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

/**
 * CardHeader sub-component for card header section
 * 
 * @example
 * <CardHeader>
 *   <h2 className="text-xl font-bold">Card Title</h2>
 * </CardHeader>
 */
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

/**
 * CardBody sub-component for main card content
 * 
 * @example
 * <CardBody>
 *   <p>Main content goes here</p>
 * </CardBody>
 */
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

/**
 * CardFooter sub-component for card footer section
 * Includes top border and spacing
 * 
 * @example
 * <CardFooter>
 *   <Button>Action</Button>
 * </CardFooter>
 */
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

/**
 * CardSkeleton component for loading state with skeleton placeholders
 * 
 * @example
 * <CardSkeleton />
 * 
 * @example
 * <CardSkeleton density="compact" />
 */
export function CardSkeleton({
  density = 'comfortable',
  className,
}: {
  density?: CardDensity;
  className?: string;
}) {
  return (
    <Card density={density} loading className={className}>
      <CardHeader>
        <Skeleton variant="text" width="60%" height={24} />
      </CardHeader>
      <CardBody>
        <div className="space-y-3">
          <Skeleton variant="text" width="100%" />
          <Skeleton variant="text" width="90%" />
          <Skeleton variant="text" width="80%" />
        </div>
      </CardBody>
    </Card>
  );
}
