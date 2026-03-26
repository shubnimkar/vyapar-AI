/**
 * Sidebar Navigation Component
 * 
 * A desktop sidebar navigation component that displays section icons, labels,
 * active state highlighting, and badge counts for pending items. Supports
 * keyboard navigation with arrow keys and follows WCAG 2.1 AA accessibility standards.
 * 
 * @see .kiro/specs/ui-ux-redesign/design.md for complete specifications
 * @see .kiro/specs/ui-ux-redesign/requirements.md - Requirements 8.2, 8.4, 8.5, 8.6, 8.7, 8.8
 */

import React from 'react';
import { cn } from '@/lib/design-system/utils';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Badge } from '../Badge';

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

interface SidebarProps {
  /** Array of navigation items to display */
  items: NavItem[];
  /** Optional footer content (e.g., user profile section) */
  footer?: React.ReactNode;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Sidebar Component
 * 
 * Pure presentation component with no business logic (per Vyapar rules).
 * Desktop-only sidebar (240px width) with sticky positioning and keyboard navigation support.
 * 
 * Features:
 * - Desktop-only display (240px width) (Requirement 8.2)
 * - Active state highlighting with primary color (Requirement 8.4)
 * - Badge display for pending items (Requirement 8.5)
 * - Keyboard navigation with arrow keys (Requirement 8.6)
 * - User profile section at bottom (Requirement 8.7)
 * - Minimum 44px touch targets (Requirement 8.8)
 * - Semantic HTML (aside, nav elements)
 * 
 * @example
 * // Basic sidebar with navigation items
 * <Sidebar
 *   items={[
 *     { label: 'Dashboard', href: '/', icon: <Home /> },
 *     { label: 'Credits', href: '/credits', icon: <CreditCard />, badge: 3 },
 *   ]}
 * />
 * 
 * @example
 * // Sidebar with user profile footer
 * <Sidebar
 *   items={navItems}
 *   footer={<UserProfile />}
 * />
 */
export function Sidebar({ items, footer, className }: SidebarProps) {
  const pathname = usePathname();
  const navRef = React.useRef<HTMLElement>(null);

  /**
   * Handle keyboard navigation with arrow keys (Requirement 8.6)
   * Up/Down arrows navigate between items, Enter activates the focused item
   */
  const handleKeyDown = React.useCallback((event: React.KeyboardEvent<HTMLElement>) => {
    if (!navRef.current) return;

    const links = Array.from(navRef.current.querySelectorAll('a')) as HTMLAnchorElement[];
    const currentIndex = links.findIndex(link => link === document.activeElement);

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      const nextIndex = (currentIndex + 1) % links.length;
      links[nextIndex]?.focus();
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      const prevIndex = currentIndex <= 0 ? links.length - 1 : currentIndex - 1;
      links[prevIndex]?.focus();
    }
  }, []);

  return (
    <aside
      className={cn(
        'hidden desktop:flex flex-col',
        'w-60 h-screen',
        // Level 1 surface — no border, tonal separation from page background
        'bg-[#f3f3f5]',
        'sticky top-0',
        className
      )}
      aria-label="Main navigation"
    >
      {/* Header — logo */}
      <div className="px-4 py-4 flex-shrink-0">
        <img
          src="/background-removed.png"
          alt="Vyapar AI"
          style={{ height: 64, width: 'auto' }}
        />
      </div>

      {/* Navigation items section */}
      <nav
        ref={navRef}
        className="flex-1 p-4 space-y-1 overflow-y-auto"
        onKeyDown={handleKeyDown}
        role="navigation"
      >
        {items.map((item) => {
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-4 py-3 rounded-xl',
                'text-sm font-medium',
                'transition-all duration-base',
                'min-h-[44px]',
                'focus:outline-none focus:ring-2 focus:ring-[rgba(11,26,125,0.40)] focus:ring-offset-2',
                // Active: Level 2 surface (white) + indigo accent — no border-l
                isActive
                  ? 'bg-white text-[#0b1a7d] shadow-base'
                  : 'text-[#4a4c4e] hover:bg-[#e8e8ea]'
              )}
              aria-current={isActive ? 'page' : undefined}
            >
              <span className={cn('flex-shrink-0', isActive ? 'text-[#0b1a7d]' : 'text-[#7a7c7e]')}>
                {item.icon}
              </span>

              {/* Label */}
              <span className="flex-1">{item.label}</span>

              {/* Badge for pending items (Requirement 8.5) */}
              {item.badge !== undefined && item.badge > 0 && (
                <Badge variant="warning" aria-label={`${item.badge} pending items`}>
                  {item.badge}
                </Badge>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer — no border, spacing creates separation */}
      {footer && (
        <div className="p-4">
          {footer}
        </div>
      )}
    </aside>
  );
}
