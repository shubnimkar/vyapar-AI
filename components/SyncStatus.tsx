'use client';

import { useState, useEffect } from 'react';
import { Cloud, CloudOff, RefreshCw, Check, AlertCircle } from 'lucide-react';
import { SessionManager } from '@/lib/session-manager';
import { Language } from '@/lib/types';
import { fullSync as dailyFullSync, getSyncStatus as getDailySyncStatus } from '@/lib/daily-entry-sync';
import { fullSync as creditFullSync, getSyncStatus as getCreditSyncStatus } from '@/lib/credit-sync';
import { logger } from '@/lib/logger';

interface SyncStatusProps {
  language: Language;
}

type SyncState = 'synced' | 'syncing' | 'error' | 'pending' | 'offline';

export default function SyncStatus({ language }: SyncStatusProps) {
  const [online, setOnline] = useState(true);
  const [syncStatus, setSyncStatus] = useState<SyncState>('offline');
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [user, setUser] = useState<{ userId: string } | null>(null);

  useEffect(() => {
    // Get current user
    const currentUser = SessionManager.getCurrentUser();
    setUser(currentUser);

    // Check initial online status
    setOnline(navigator.onLine);

    // Listen for online/offline events
    const handleOnline = () => {
      setOnline(true);
      handleSync();
    };
    
    const handleOffline = () => {
      setOnline(false);
      setSyncStatus('offline');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial sync check
    if (navigator.onLine && currentUser) {
      checkSyncStatus();
    }

    // Check sync status periodically
    const interval = setInterval(() => {
      if (navigator.onLine && currentUser) {
        checkSyncStatus();
      }
    }, 10000); // Check every 10 seconds

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run once on mount

  const checkSyncStatus = () => {
    if (!user || !navigator.onLine) return;

    try {
      const dailyStatus = getDailySyncStatus();
      const creditStatus = getCreditSyncStatus();
      
      const totalPending = dailyStatus.pendingCount + creditStatus.pendingCount;
      const totalErrors = dailyStatus.errorCount + creditStatus.errorCount;
      
      setPendingCount(totalPending);
      
      if (totalErrors > 0) {
        setSyncStatus('error');
      } else if (totalPending > 0) {
        setSyncStatus('pending');
      } else {
        setSyncStatus('synced');
      }
      
      // Use the most recent sync time
      const dailyTime = dailyStatus.lastSyncTime ? new Date(dailyStatus.lastSyncTime) : null;
      const creditTime = creditStatus.lastSyncTime ? new Date(creditStatus.lastSyncTime) : null;
      
      if (dailyTime && creditTime) {
        setLastSyncTime(dailyTime > creditTime ? dailyTime : creditTime);
      } else if (dailyTime) {
        setLastSyncTime(dailyTime);
      } else if (creditTime) {
        setLastSyncTime(creditTime);
      }
    } catch (error) {
      logger.warn('[SyncStatus] Failed to check sync status', { error });
      setSyncStatus('error');
    }
  };

  const handleSync = async () => {
    if (!user || !navigator.onLine) return;

    setSyncing(true);
    setSyncStatus('syncing');

    try {
      // Sync both daily entries and credit entries
      const [dailyResult, creditResult] = await Promise.all([
        dailyFullSync(user.userId).catch(err => {
          logger.error('[SyncStatus] Daily sync failed', { error: err });
          return { pulled: 0, pushed: 0, failed: 1 };
        }),
        creditFullSync(user.userId).catch(err => {
          logger.error('[SyncStatus] Credit sync failed', { error: err });
          return { pulled: 0, pushed: 0, failed: 1 };
        })
      ]);
      
      const totalFailed = dailyResult.failed + creditResult.failed;
      
      if (totalFailed > 0) {
        setSyncStatus('error');
      } else {
        setSyncStatus('synced');
        setLastSyncTime(new Date());
        setPendingCount(0);
      }
      
      // Recheck status after sync
      setTimeout(checkSyncStatus, 500);
    } catch (error) {
      logger.error('[SyncStatus] Sync failed', { error });
      setSyncStatus('error');
    } finally {
      setSyncing(false);
    }
  };

  // Don't show if no user
  if (!user) {
    return null;
  }

  const getStatusIcon = () => {
    if (!online) {
      return <CloudOff className="w-4 h-4 text-gray-400" />;
    }
    
    if (syncing) {
      return <RefreshCw className="w-4 h-4 text-blue-500 animate-spin" />;
    }
    
    switch (syncStatus) {
      case 'synced':
        return <Check className="w-4 h-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      case 'pending':
        return <Cloud className="w-4 h-4 text-yellow-500" />;
      default:
        return <Cloud className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusText = () => {
    if (!online) {
      return language === 'hi' 
        ? 'ऑफ़लाइन' 
        : language === 'mr' 
        ? 'ऑफलाइन' 
        : 'Offline';
    }
    
    if (syncing) {
      return language === 'hi' 
        ? 'सिंक हो रहा है...' 
        : language === 'mr' 
        ? 'सिंक होत आहे...' 
        : 'Syncing...';
    }
    
    switch (syncStatus) {
      case 'synced':
        return language === 'hi' 
          ? 'सिंक हो गया' 
          : language === 'mr' 
          ? 'सिंक झाले' 
          : 'Synced';
      case 'error':
        return language === 'hi' 
          ? 'सिंक विफल' 
          : language === 'mr' 
          ? 'सिंक अयशस्वी' 
          : 'Sync failed';
      case 'pending':
        const pendingText = language === 'hi' 
          ? `${pendingCount} लंबित` 
          : language === 'mr' 
          ? `${pendingCount} प्रलंबित` 
          : `${pendingCount} pending`;
        return pendingText;
      default:
        return language === 'hi' 
          ? 'ऑफ़लाइन' 
          : language === 'mr' 
          ? 'ऑफलाइन' 
          : 'Offline';
    }
  };

  const getStatusColor = () => {
    if (!online) return 'bg-gray-100 text-gray-600';
    if (syncing) return 'bg-blue-50 text-blue-700';
    
    switch (syncStatus) {
      case 'synced':
        return 'bg-green-50 text-green-700';
      case 'error':
        return 'bg-red-50 text-red-700';
      case 'pending':
        return 'bg-yellow-50 text-yellow-700';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  return (
    <div className="flex items-center gap-2">
      <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium ${getStatusColor()}`}>
        {getStatusIcon()}
        <span>{getStatusText()}</span>
      </div>
      
      {online && !syncing && syncStatus !== 'syncing' && (
        <button
          onClick={handleSync}
          className="p-1.5 hover:bg-gray-100 rounded-full transition-colors"
          title={language === 'hi' ? 'अभी सिंक करें' : language === 'mr' ? 'आता सिंक करा' : 'Sync now'}
        >
          <RefreshCw className="w-4 h-4 text-gray-600" />
        </button>
      )}
      
      {lastSyncTime && syncStatus === 'synced' && (
        <span className="text-xs text-gray-500">
          {language === 'hi' 
            ? `अंतिम: ${lastSyncTime.toLocaleTimeString('hi-IN', { hour: '2-digit', minute: '2-digit' })}` 
            : language === 'mr' 
            ? `शेवटचे: ${lastSyncTime.toLocaleTimeString('mr-IN', { hour: '2-digit', minute: '2-digit' })}` 
            : `Last: ${lastSyncTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`}
        </span>
      )}
    </div>
  );
}
