/**
 * Mobile Navigation Component
 * 
 * A mobile-only bottom navigation component that displays section icons, labels,
 * active state highlighting, and badge counts for pending items. Optimized for
 * touch interactions with minimum 44px touch targets.
 * 
 * @see .kiro/specs/ui-ux-redesign/design.md for complete specifications
 * @see .kiro/specs/ui-ux-redesign/requirements.md - Requirements 8.3, 8.4, 8.5, 8.8
 */

import React from 'react';
import { cn } from '@/lib/design-system/utils';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export interface NavItem {
  /** Display label for the navigation item */
  label: string;
  /** URL path for the navigation item */
  href: string;
  /** Icon element to display */
  icon: React.ReactNode;
  /** Optional badge count for pending items */
  badge?: number;
}

interface MobileNavProps {
  /** Array of navigation items to display */
  items: NavItem[];
  /** Additional CSS classes */
  className?: string;
}

/**
 * MobileNav Component
 * 
 * Pure presentation component with no business logic (per Vyapar rules).
 * Mobile-only bottom navigation with fixed positioning and horizontal layout.
 * 
 * Features:
 * - Mobile-only display with fixed bottom positioning (Requirement 8.3)
 * - Active state highlighting with primary color (Requirement 8.4)
 * - Badge display for pending items with max 9+ (Requirement 8.5)
 * - Minimum 44px touch targets (Requirement 8.8)
 * - Horizontal scrollable layout for many items
 * - Semantic HTML (nav element)
 * - Keyboard accessible with focus indicators
 * - ARIA labels for accessibility
 * 
 * @example
 * // Basic mobile navigation
 * <MobileNav
 *   items={[
 *     { label: 'Home', href: '/', icon: <Home /> },
 *     { label: 'Credits', href: '/credits', icon: <CreditCard />, badge: 3 },
 *   ]}
 * />
 * 
 * @example
 * // Mobile navigation with many items
 * <MobileNav
 *   items={[
 *     { label: 'Dashboard', href: '/', icon: <Home /> },
 *     { label: 'Credits', href: '/credits', icon: <CreditCard />, badge: 12 },
 *     { label: 'Reports', href: '/reports', icon: <FileText /> },
 *     { label: 'Settings', href: '/settings', icon: <Settings /> },
 *   ]}
 * />
 */
export function MobileNav({ items, className }: MobileNavProps) {
  const pathname = usePathname();

  return (
    <nav
      className={cn(
        // Mobile-only display (Requirement 8.3)
        'desktop:hidden',
        // Fixed bottom positioning (Requirement 8.3)
        'fixed bottom-0 left-0 right-0 z-40',
        // Background and border
        'bg-white border-t border-neutral-200',
        // Padding
        'px-2 py-2',
        // Shadow for elevation
        'shadow-lg',
        className
      )}
      role="navigation"
      aria-label="Mobile navigation"
    >
      <div className="flex items-center justify-around">
        {items.map((item) => {
          const isActive = pathname === item.href;
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                // Base styles
                'flex flex-col items-center gap-1 px-3 py-2 rounded-lg',
                'text-xs font-medium',
                'transition-all duration-base',
                // Minimum 44px touch target (Requirement 8.8)
                'min-w-[60px] min-h-[44px]',
                // Focus styles for keyboard navigation
                'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2',
                // Active state highlighting (Requirement 8.4)
                isActive
                  ? 'text-primary-600'
                  : 'text-neutral-600'
              )}
              aria-current={isActive ? 'page' : undefined}
              aria-label={`${item.label}${item.badge ? ` (${item.badge > 9 ? '9+' : item.badge} pending)` : ''}`}
            >
              {/* Icon container with badge */}
              <div className="relative">
                {/* Icon with active state scale */}
                <span className={cn(
                  'transition-transform duration-base',
                  isActive && 'scale-110'
                )}>
                  {item.icon}
                </span>
                
                {/* Badge for pending items (Requirement 8.5) */}
                {item.badge !== undefined && item.badge > 0 && (
                  <span
                    className="absolute -top-1 -right-1 w-4 h-4 bg-warning-500 text-white text-[10px] rounded-full flex items-center justify-center font-bold"
                    aria-hidden="true"
                  >
                    {item.badge > 9 ? '9+' : item.badge}
                  </span>
                )}
              </div>
              
              {/* Label */}
              <span className="truncate max-w-[60px]">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
