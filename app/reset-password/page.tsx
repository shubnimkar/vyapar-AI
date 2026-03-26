import { Suspense } from 'react';
import ResetPasswordClient from './ResetPasswordClient';

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-primary-container px-4 py-6">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-6 sm:p-8">
            <p className="text-sm text-neutral-600">Loading…</p>
          </div>
        </div>
      }
    >
      <ResetPasswordClient />
    </Suspense>
  );
}

