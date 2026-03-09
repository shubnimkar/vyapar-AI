/**
 * User Profile Card Component
 * 
 * A compact, professional user profile display for the sidebar footer.
 * Shows user avatar, name, and shop name with clean styling.
 */

import React from 'react';
import { cn } from '@/lib/design-system/utils';
import { User, Store } from 'lucide-react';
import Link from 'next/link';

interface UserProfileCardProps {
  userName: string;
  shopName?: string;
  className?: string;
}

export function UserProfileCard({
  userName,
  shopName,
  className,
}: UserProfileCardProps) {
  return (
    <Link
      href="/profile"
      className={cn(
        'flex items-center gap-3 p-3 rounded-lg',
        'hover:bg-neutral-50 transition-colors',
        'group cursor-pointer',
        className
      )}
    >
      {/* Avatar */}
      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center">
        <User className="w-5 h-5 text-primary-600" />
      </div>
      
      {/* User info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-neutral-900 truncate">
          {userName}
        </p>
        {shopName && (
          <p className="text-xs text-neutral-500 truncate flex items-center gap-1">
            <Store className="w-3 h-3" />
            {shopName}
          </p>
        )}
      </div>
    </Link>
  );
}
