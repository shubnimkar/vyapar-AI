'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { SessionManager } from '@/lib/session-manager';

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
      console.log('[AuthGuard] Checking authentication...');
      
      // Check if user is authenticated
      if (SessionManager.isAuthenticated()) {
        console.log('[AuthGuard] User is authenticated');
        setAuthenticated(true);
      } else {
        console.log('[AuthGuard] User not authenticated, redirecting to login');
        router.push('/login');
      }
    } catch (error) {
      console.error('[AuthGuard] Auth check failed:', error);
      router.push('/login');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!authenticated) {
    return fallback || null;
  }

  return <>{children}</>;
}
