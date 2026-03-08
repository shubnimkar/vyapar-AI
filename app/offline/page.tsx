'use client';

/**
 * Offline Fallback Page
 * 
 * Displayed when the user is offline and tries to access a page that's not cached.
 * Provides a friendly message and shows cached content options using the new design system.
 * 
 * @see .kiro/specs/ui-ux-redesign/requirements.md - Requirement 17.5
 */

import { useRouter } from 'next/navigation';
import { ErrorState } from '@/components/ui/ErrorState';
import { Card, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { WifiOff, Home, RefreshCw, CheckCircle } from 'lucide-react';

export default function OfflinePage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-6">
        {/* Main error state */}
        <ErrorState
          title="You're Offline"
          message="It looks like you've lost your internet connection. Don't worry, Vyapar AI works offline!"
          action={{
            label: 'Try Again',
            onClick: () => window.location.reload(),
          }}
          secondaryAction={{
            label: 'Go to Dashboard',
            onClick: () => router.push('/'),
          }}
        />

        {/* Features Available Offline */}
        <Card elevation="raised">
          <CardBody>
            <h2 className="text-sm font-semibold text-neutral-900 mb-3 flex items-center gap-2">
              <WifiOff className="w-4 h-4 text-neutral-500" />
              Available Offline
            </h2>
            <ul className="space-y-2">
              <li className="flex items-start gap-2 text-sm text-neutral-700">
                <CheckCircle className="w-4 h-4 text-success-600 flex-shrink-0 mt-0.5" />
                <span>View cached daily entries</span>
              </li>
              <li className="flex items-start gap-2 text-sm text-neutral-700">
                <CheckCircle className="w-4 h-4 text-success-600 flex-shrink-0 mt-0.5" />
                <span>Add new entries (will sync when online)</span>
              </li>
              <li className="flex items-start gap-2 text-sm text-neutral-700">
                <CheckCircle className="w-4 h-4 text-success-600 flex-shrink-0 mt-0.5" />
                <span>View health score and indices</span>
              </li>
              <li className="flex items-start gap-2 text-sm text-neutral-700">
                <CheckCircle className="w-4 h-4 text-success-600 flex-shrink-0 mt-0.5" />
                <span>Manage credit entries</span>
              </li>
            </ul>
          </CardBody>
        </Card>

        {/* Connection Status */}
        <Card elevation="flat" className="bg-info-50 border-info-200">
          <CardBody className="text-center">
            <p className="text-xs text-info-700">
              Your data will automatically sync when you're back online
            </p>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

