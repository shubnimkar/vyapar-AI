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

    // Initial sync check - run immediately if online and user exists
    if (navigator.onLine && currentUser) {
      checkSyncStatus(currentUser);
    } else if (navigator.onLine && !currentUser) {
      // Online but no user - show as synced (no data to sync)
      setSyncStatus('synced');
    }

    // Check sync status periodically
    const interval = setInterval(() => {
      const latestUser = SessionManager.getCurrentUser();
      if (navigator.onLine && latestUser) {
        checkSyncStatus(latestUser);
      } else if (navigator.onLine && !latestUser) {
        // Online but no user - show as synced
        setSyncStatus('synced');
      }
    }, 10000); // Check every 10 seconds

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run once on mount

  const checkSyncStatus = (currentUser?: { userId: string } | null) => {
    const userToCheck = currentUser !== undefined ? currentUser : user;
    
    if (!userToCheck || !navigator.onLine) {
      // If online but no user, show synced (nothing to sync)
      if (navigator.onLine && !userToCheck) {
        setSyncStatus('synced');
      }
      return;
    }

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
      return <CloudOff className="w-5 h-5" />;
    }
    
    if (syncing) {
      return <RefreshCw className="w-5 h-5 animate-spin" />;
    }
    
    switch (syncStatus) {
      case 'synced':
        return (
          <div className="relative">
            <Cloud className="w-5 h-5" fill="currentColor" />
            <Check className="w-3 h-3 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" strokeWidth={3} />
          </div>
        );
      case 'error':
        return <AlertCircle className="w-5 h-5" />;
      case 'pending':
        return <Cloud className="w-5 h-5" />;
      default:
        return <Cloud className="w-5 h-5" />;
    }
  };

  const getStatusText = () => {
    if (!online) {
      return language === 'hi' 
        ? 'Sync: ऑफ़लाइन' 
        : language === 'mr' 
        ? 'Sync: ऑफलाइन' 
        : 'Sync: Offline';
    }
    
    if (syncing) {
      return language === 'hi' 
        ? 'Sync: सिंक हो रहा है...' 
        : language === 'mr' 
        ? 'Sync: सिंक होत आहे...' 
        : 'Sync: Syncing...';
    }
    
    switch (syncStatus) {
      case 'synced':
        return language === 'hi' 
          ? 'Sync: सक्रिय' 
          : language === 'mr' 
          ? 'Sync: सक्रिय' 
          : 'Sync: Active';
      case 'error':
        return language === 'hi' 
          ? 'Sync: विफल' 
          : language === 'mr' 
          ? 'Sync: अयशस्वी' 
          : 'Sync: Failed';
      case 'pending':
        const pendingText = language === 'hi' 
          ? `Sync: ${pendingCount} लंबित` 
          : language === 'mr' 
          ? `Sync: ${pendingCount} प्रलंबित` 
          : `Sync: ${pendingCount} pending`;
        return pendingText;
      default:
        return language === 'hi' 
          ? 'Sync: ऑफ़लाइन' 
          : language === 'mr' 
          ? 'Sync: ऑफलाइन' 
          : 'Sync: Offline';
    }
  };

  const getStatusColor = () => {
    if (!online) return 'text-gray-600';
    if (syncing) return 'text-blue-600';
    
    switch (syncStatus) {
      case 'synced':
        return 'text-green-600';
      case 'error':
        return 'text-red-600';
      case 'pending':
        return 'text-yellow-600';
      default:
        return 'text-gray-600';
    }
  };

  return (
    <div className="flex items-center gap-2">
      <div className={`flex items-center gap-2 text-sm font-semibold ${getStatusColor()}`}>
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
