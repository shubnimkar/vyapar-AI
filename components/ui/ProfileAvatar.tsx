'use client';

import { useState } from 'react';

interface ProfileAvatarProps {
  src?: string;
  name: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const sizeClasses = {
  sm: 'w-10 h-10 text-sm',
  md: 'w-12 h-12 text-base',
  lg: 'w-20 h-20 text-2xl',
  xl: 'w-28 h-28 md:w-32 md:h-32 text-3xl',
};

function getInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .map((part) => part[0] || '')
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'U';
}

export default function ProfileAvatar({
  src,
  name,
  size = 'md',
  className = '',
}: ProfileAvatarProps) {
  const [hasImageError, setHasImageError] = useState(false);
  const showImage = Boolean(src && !hasImageError);

  return (
    <div
      className={`overflow-hidden rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-bold flex items-center justify-center ${sizeClasses[size]} ${className}`}
    >
      {showImage ? (
        <img
          src={src}
          alt={name}
          className="w-full h-full object-cover"
          onError={() => setHasImageError(true)}
        />
      ) : (
        <span>{getInitials(name)}</span>
      )}
    </div>
  );
}
