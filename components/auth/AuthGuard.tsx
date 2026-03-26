'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { SessionManager } from '@/lib/session-manager';
import { logger } from '@/lib/logger';

interface AuthGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export default function AuthGuard({ children, fallback }: AuthGuardProps) {
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const router = useRouter();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      logger.debug('[AuthGuard] Checking authentication...');
      
      // Check if user is authenticated
      if (SessionManager.isAuthenticated()) {
        logger.debug('[AuthGuard] User is authenticated');
        setAuthenticated(true);
      } else {
        logger.debug('[AuthGuard] User not authenticated, redirecting to login');
        router.push('/login');
      }
    } catch (error) {
      logger.error('[AuthGuard] Auth check failed', { error });
      router.push('/login');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f9f9fb]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-[#7a7c7e]">Loading...</p>
        </div>
      </div>
    );
  }

  if (!authenticated) {
    return fallback || null;
  }

  return <>{children}</>;
}
