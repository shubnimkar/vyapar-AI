/**
 * User Profile Card Component
 * 
 * A compact, professional user profile display for the sidebar footer.
 * Shows user avatar, name, and shop name with clean styling.
 */

import React from 'react';
import { cn } from '@/lib/design-system/utils';
import { Store } from 'lucide-react';
import Link from 'next/link';
import ProfileAvatar from './ProfileAvatar';

interface UserProfileCardProps {
  userName: string;
  shopName?: string;
  avatarUrl?: string;
  className?: string;
}

export function UserProfileCard({
  userName,
  shopName,
  avatarUrl,
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
      <ProfileAvatar src={avatarUrl} name={userName} size="sm" className="flex-shrink-0" />
      
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
