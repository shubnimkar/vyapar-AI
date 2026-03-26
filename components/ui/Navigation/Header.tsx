/**
 * Header Navigation Component
 * 
 * A sticky header component that displays app title, language selector, sync status,
 * and user actions. Supports mobile menu toggle and responsive design.
 * 
 * @see .kiro/specs/ui-ux-redesign/design.md for complete specifications
 * @see .kiro/specs/ui-ux-redesign/requirements.md - Requirements 8.1, 8.8, 17.3, 17.4
 */

import React from 'react';
import { cn } from '@/lib/design-system/utils';
import { Menu, Wifi, WifiOff, RefreshCw } from 'lucide-react';

interface HeaderProps {
  /** Main title to display */
  title: string;
  /** Optional subtitle */
  subtitle?: string;
  /** Left action (typically menu button for mobile) */
  leftAction?: React.ReactNode;
  /** Right actions (language selector, sync status, etc.) */
  rightActions?: React.ReactNode;
  /** Callback when menu button is clicked */
  onMenuClick?: () => void;
  /** Whether the app is online */
  isOnline?: boolean;
  /** Whether sync is in progress */
  isSyncing?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Header Component
 * 
 * Pure presentation component with no business logic (per Vyapar rules).
 * Sticky header with app title, language selector, and sync status.
 * 
 * Features:
 * - Sticky positioning at top (Requirement 8.1)
 * - Offline indicator (Requirement 17.3)
 * - Sync status indicator (Requirement 17.4)
 * - Minimum 44px touch targets (Requirement 8.8)
 * - Responsive layout (mobile → desktop)
 * - Semantic HTML (header element)
 * 
 * @example
 * // Basic header
 * <Header
 *   title="Vyapar AI"
 *   subtitle="Your Business Assistant"
 * />
 * 
 * @example
 * // Header with menu and actions
 * <Header
 *   title="Vyapar AI"
 *   onMenuClick={() => setMenuOpen(true)}
 *   rightActions={<LanguageSelector />}
 *   isOnline={true}
 *   isSyncing={false}
 * />
 */
export function Header({
  title,
  subtitle,
  leftAction,
  rightActions,
  onMenuClick,
  isOnline = true,
  isSyncing = false,
  className,
}: HeaderProps) {
  return (
    <header
      className={cn(
        'sticky top-0 z-40',
        // Glassmorphism header — floats over content
        'bg-white/90 backdrop-blur-md',
        'px-6 py-4',
        'shadow-sm',
        className
      )}
      role="banner"
    >
      <div className="flex items-center justify-between gap-4">
        {/* Left section: Menu button + Title */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {/* Mobile menu button */}
          {onMenuClick && (
            <button
              onClick={onMenuClick}
              className={cn(
                'p-2 hover:bg-neutral-100 rounded-xl transition-colors',
                'desktop:hidden',
                'min-w-[44px] min-h-[44px]',
                'focus:outline-none focus:ring-2 focus:ring-[rgba(11,26,125,0.40)] focus:ring-offset-2'
              )}
              aria-label="Open menu"
            >
              <Menu className="w-6 h-6 text-[#4a4c4e]" />
            </button>
          )}

          {/* Custom left action */}
          {leftAction}

          {/* Title and subtitle */}
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-neutral-900 truncate">
              {title}
            </h1>
            {subtitle && (
              <p className="text-sm text-neutral-600 truncate">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        {/* Right section: Status indicators + Actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Offline indicator (Requirement 17.3) */}
          {!isOnline && (
            <div
              className="flex items-center gap-1 px-3 py-1.5 bg-error-50 text-error-700 rounded-lg text-xs font-medium"
              role="status"
              aria-label="Offline"
            >
              <WifiOff className="w-4 h-4" />
              <span className="hidden tablet:inline">Offline</span>
            </div>
          )}

          {/* Sync status indicator (Requirement 17.4) */}
          {isOnline && isSyncing && (
            <div
              className="flex items-center gap-1 px-3 py-1.5 bg-info-50 text-info-700 rounded-lg text-xs font-medium"
              role="status"
              aria-label="Syncing"
            >
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span className="hidden tablet:inline">Syncing</span>
            </div>
          )}

          {/* Online indicator (subtle) */}
          {isOnline && !isSyncing && (
            <div
              className="flex items-center gap-1 px-3 py-1.5 bg-success-50 text-success-700 rounded-lg text-xs font-medium"
              role="status"
              aria-label="Online"
            >
              <Wifi className="w-4 h-4" />
              <span className="hidden tablet:inline">Online</span>
            </div>
          )}

          {/* Custom right actions */}
          {rightActions && (
            <div className="flex items-center gap-2">
              {rightActions}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
