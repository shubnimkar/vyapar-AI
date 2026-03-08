/**
 * Skeleton Component
 * 
 * A loading placeholder component that displays animated skeleton screens.
 * Used to indicate content is loading while maintaining layout structure.
 * 
 * @see .kiro/specs/ui-ux-redesign/design.md for complete specifications
 */

import React from 'react';
import { cn } from '@/lib/design-system/utils';

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Variant determines the shape of the skeleton */
  variant?: 'text' | 'circular' | 'rectangular';
  /** Width of the skeleton (string or number in pixels) */
  width?: string | number;
  /** Height of the skeleton (string or number in pixels) */
  height?: string | number;
}

/**
 * Skeleton component for loading states
 * 
 * @example
 * <Skeleton variant="text" width="100%" />
 * 
 * @example
 * <Skeleton variant="circular" width={40} height={40} />
 * 
 * @example
 * <Skeleton variant="rectangular" width="100%" height={200} />
 */
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
