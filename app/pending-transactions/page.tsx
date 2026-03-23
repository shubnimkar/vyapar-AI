'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function PendingTransactionsRedirect() {
  const router = useRouter();

  useEffect(() => {
    sessionStorage.setItem('vyapar-active-section', 'pending');
    router.replace('/');
  }, [router]);

  return null;
}
