'use client';

import { useState, useEffect, type ComponentType } from 'react';
import { useRouter } from 'next/navigation';
import AuthGuard from '@/components/auth/AuthGuard';
import UserProfile from '@/components/auth/UserProfile';
import ProfileContent from '@/components/ProfileContent';
import LanguageSelector from '@/components/LanguageSelector';
import SyncStatus from '@/components/SyncStatus';
import TrustBanner from '@/components/TrustBanner';
import ReceiptOCR from '@/components/ReceiptOCR';
import DailyEntryForm from '@/components/DailyEntryForm';
import HealthScoreDisplay from '@/components/HealthScoreDisplay';
import CreditTracking from '@/components/CreditTracking';
import FollowUpPanel from '@/components/FollowUpPanel';
import FileUpload from '@/components/FileUpload';
import InsightsDisplay from '@/components/InsightsDisplay';
import QAChat from '@/components/QAChat';
import Charts from '@/components/Charts';
import Recommendations from '@/components/Recommendations';
import Alerts from '@/components/Alerts';
import Benchmark from '@/components/Benchmark';
import PendingTransactionConfirmation from '@/components/PendingTransactionConfirmation';
import CSVUpload from '@/components/CSVUpload';
import ExpenseAlertBanner from '@/components/ExpenseAlertBanner';
import VoiceRecorder from '@/components/VoiceRecorder';
import ReportViewer from '@/components/ReportViewer';
import { useToast } from '@/components/ui/Toast';
import { Button } from '@/components/ui/Button';
import { logger } from '@/lib/logger';
import ShareWhatsApp from '@/components/ShareWhatsApp';
import ExportPDF from '@/components/ExportPDF';
import { Language, BusinessInsights, CreditEntry, DailyReport, FileType, BenchmarkData, InferredTransaction, ExpenseAlert, ExtractedVoiceData, TransactionSource } from '@/lib/types';
import { t } from '@/lib/translations';
import { addTransactionToDailyEntry } from '@/lib/add-transaction-to-entry';
import {
  ChevronDown,
  ChevronUp,
  LayoutDashboard,
  ClipboardList,
  CreditCard,
  BarChart3,
  MessageSquare,
  UserCircle,
  Bell,
  FileText,
  Heart,
} from 'lucide-react';
import { SessionManager } from '@/lib/session-manager';
import { getLocalEntries as getLocalDailyEntries } from '@/lib/daily-entry-sync';
import { getLocalEntries as getLocalCreditEntries } from '@/lib/credit-sync';
import { getLocalPendingTransactions } from '@/lib/pending-transaction-store';
import { calculateCreditSummary, calculateHealthScore } from '@/lib/calculations';
import { usePendingTransactionCount } from '@/lib/hooks/usePendingTransactionCount';
import { resolveProfileForDemoData } from '@/lib/demo-profile-resolver';
import { fullAppSync } from '@/lib/app-sync';
import { getProfileLocalFirst } from '@/lib/profile-sync';
import { getReportsLocalFirst } from '@/lib/report-sync';
import { isUserScopedKey } from '@/lib/user-scoped-storage';
import IndicesDashboard from '@/components/IndicesDashboard';
import BenchmarkDisplay from '@/components/BenchmarkDisplay';
import CashFlowPredictor from '@/components/CashFlowPredictor';
import { BenchmarkComparison } from '@/lib/types';

type AppSection =
  | 'dashboard'
  | 'health'
  | 'entries'
  | 'credit'
  | 'pending'
  | 'analysis'
  | 'chat'
  | 'account'
  | 'reports';

type HealthBreakdown = {
  marginScore: number;
  expenseScore: number;
  cashScore: number;
  creditScore: number;
};

function isValidHealthBreakdown(value: unknown): value is HealthBreakdown {
  if (!value || typeof value !== 'object') {
    logger.debug('healthBreakdown is not an object', { value });
    return false;
  }
  const breakdown = value as Record<string, unknown>;

  // Check if it's an error object
  if ('success' in breakdown || 'error' in breakdown || 'errorType' in breakdown) {
    logger.debug('healthBreakdown is an error object', { breakdown });
    return false;
  }

  const isValid = (
    typeof breakdown.marginScore === 'number' &&
    Number.isFinite(breakdown.marginScore) &&
    typeof breakdown.expenseScore === 'number' &&
    Number.isFinite(breakdown.expenseScore) &&
    typeof breakdown.cashScore === 'number' &&
    Number.isFinite(breakdown.cashScore) &&
    typeof breakdown.creditScore === 'number' &&
    Number.isFinite(breakdown.creditScore)
  );

  if (!isValid) {
    logger.debug('healthBreakdown has invalid structure', { breakdown });
  }

  return isValid;
}

export default function Home() {
  const router = useRouter();
  const [language, setLanguage] = useState<Language>('en');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<Set<FileType>>(new Set());
  const [insights, setInsights] = useState<BusinessInsights | null>(null);
  const [insightsCache, setInsightsCache] = useState<Record<string, BusinessInsights>>({});
  const [benchmark, setBenchmark] = useState<BenchmarkData | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [advancedModeExpanded, setAdvancedModeExpanded] = useState(false);
  const [healthScore, setHealthScore] = useState<number | null>(null);
  const [healthBreakdown, setHealthBreakdown] = useState<HealthBreakdown | null>(null);
  const [user, setUser] = useState<{ userId: string; username: string } | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [activeSection, setActiveSection] = useState<AppSection>(() => {
    // Restore last active section from sessionStorage on reload
    if (typeof window !== 'undefined') {
      const saved = sessionStorage.getItem('vyapar-active-section') as AppSection | null;
      if (saved && ['dashboard','health','entries','credit','pending','analysis','chat','account','reports'].includes(saved)) {
        return saved;
      }
    }
    return 'dashboard';
  });

  // Segment Benchmark state
  const [benchmarkComparison, setBenchmarkComparison] = useState<BenchmarkComparison | null>(null);
  const [benchmarkLoading, setBenchmarkLoading] = useState(false);
  const [benchmarkError, setBenchmarkError] = useState<string | null>(null);

  // Expense Alert state
  const [expenseAlert, setExpenseAlert] = useState<ExpenseAlert | null>(null);

  const { showToast } = useToast();

  const [qaReports, setQaReports] = useState<DailyReport[]>([]);
  const [qaPendingTransactions, setQaPendingTransactions] = useState<InferredTransaction[]>([]);
  const [qaInitialMessages, setQaInitialMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string; sourcesUsed?: string[]; contentByLanguage?: Partial<Record<Language, string>> }>>([]);
  const [voiceInitialData, setVoiceInitialData] = useState<{ date?: string; totalSales?: number; totalExpense?: number; notes?: string } | null>(null);

  // Get pending transaction count for badge
  const pendingCount = usePendingTransactionCount();
  const qaDailyEntries = typeof window !== 'undefined' ? getLocalDailyEntries() : [];
  const qaCreditEntries: CreditEntry[] = (typeof window !== 'undefined' ? getLocalCreditEntries() : []).map((entry) => ({
    ...entry,
    userId: user?.userId || '',
  }));
  const qaDataSources = {
    dailyEntries: qaDailyEntries.length,
    creditEntries: qaCreditEntries.length,
    reports: qaReports.length,
    salesData: uploadedFiles.has('sales'),
    expensesData: uploadedFiles.has('expenses'),
    inventoryData: uploadedFiles.has('inventory'),
  };
  const qaAppContext = {
    activeSection,
    pendingCount: pendingCount.total,
    pendingTransactions: qaPendingTransactions,
    healthScore,
    healthBreakdown,
    benchmark: benchmarkComparison
      ? {
          healthScore: benchmarkComparison.healthScoreComparison.userValue,
          marginPercent: benchmarkComparison.marginComparison.userValue * 100,
          benchmarkHealthScore: benchmarkComparison.healthScoreComparison.segmentMedian,
          benchmarkMarginPercent: benchmarkComparison.marginComparison.segmentMedian * 100,
          category: benchmarkComparison.healthScoreComparison.category,
          sampleSize: benchmarkComparison.segmentInfo.sampleSize,
        }
      : null,
    reports: qaReports,
  };

  useEffect(() => {
    const initSession = async () => {
      const currentUser = SessionManager.getCurrentUser();
      if (currentUser) {
        setUser(currentUser);

        try {
          const preferredLanguage =
            (typeof window !== 'undefined' && (localStorage.getItem('vyapar-lang') as Language | null)) ||
            language;

          // Perform a full hybrid sync to ensure local stores and cloud are consistent
          const syncResult = await fullAppSync(currentUser.userId, preferredLanguage);

          logger.info('Initial full sync completed', {
            userId: currentUser.userId,
            ...syncResult,
          });
        } catch (syncError) {
          logger.warn('Initial sync failed', { error: syncError });
        }
      }

      const storedSessionId = typeof window !== 'undefined' ? sessionStorage.getItem('vyapar-session-id') : null;

      if (storedSessionId) {
        try {
          const response = await fetch('/api/upload', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ init: true, restoreSessionId: storedSessionId }),
          });
          const data = await response.json();
          if (data.success && data.sessionId) {
            setSessionId(data.sessionId);
            if (data.dataSources) {
              const restoredFiles = new Set<FileType>();
              if (data.dataSources.salesData) restoredFiles.add('sales');
              if (data.dataSources.expensesData) restoredFiles.add('expenses');
              if (data.dataSources.inventoryData) restoredFiles.add('inventory');
              setUploadedFiles(restoredFiles);
            }
            if (Array.isArray(data.conversationHistory)) {
              setQaInitialMessages(data.conversationHistory);
            }
            return;
          }
        } catch {
          logger.error('Failed to restore session');
        }
      }

      try {
        const response = await fetch('/api/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ init: true }),
        });
        const data = await response.json();
        if (data.success && data.sessionId) {
          setSessionId(data.sessionId);
          if (data.dataSources) {
            const restoredFiles = new Set<FileType>();
            if (data.dataSources.salesData) restoredFiles.add('sales');
            if (data.dataSources.expensesData) restoredFiles.add('expenses');
            if (data.dataSources.inventoryData) restoredFiles.add('inventory');
            setUploadedFiles(restoredFiles);
          }
          if (Array.isArray(data.conversationHistory)) {
            setQaInitialMessages(data.conversationHistory);
          }
          if (typeof window !== 'undefined') {
            sessionStorage.setItem('vyapar-session-id', data.sessionId);
          }
        } else {
          logger.error('Session initialization failed', { data });
        }
      } catch {
        logger.error('Failed to initialize session');
      }
    };

    initSession();
  }, []);

  useEffect(() => {
    const savedLang = localStorage.getItem('vyapar-lang') as Language;
    if (savedLang && ['en', 'hi', 'mr'].includes(savedLang)) {
      setLanguage(savedLang);
    }

    const syncLang = () => {
      const lang = localStorage.getItem('vyapar-lang') as Language;
      if (lang && ['en', 'hi', 'mr'].includes(lang)) {
        setLanguage(lang);
      }
    };
    window.addEventListener('vyapar-lang-changed', syncLang);
    return () => window.removeEventListener('vyapar-lang-changed', syncLang);
  }, []);

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  useEffect(() => {
    // PWA installed shortcuts use query actions like /?action=add-entry.
    // We intentionally read from window to avoid Next.js suspense requirements with useSearchParams().
    if (typeof window === 'undefined') return;

    const action = new URLSearchParams(window.location.search).get('action');
    if (!action) return;

    const actionToSection: Partial<Record<string, AppSection>> = {
      'add-entry': 'entries',
      'health-score': 'health',
      credits: 'credit',
    };

    const next = actionToSection[action];
    if (next) setActiveSection(next);
  }, []);

  useEffect(() => {
    const refreshPendingTransactions = () => {
      setQaPendingTransactions(getLocalPendingTransactions(SessionManager.getCurrentUser()?.userId));
    };

    refreshPendingTransactions();
    window.addEventListener('pendingTransactionsUpdated', refreshPendingTransactions);
    window.addEventListener('storage', refreshPendingTransactions);

    return () => {
      window.removeEventListener('pendingTransactionsUpdated', refreshPendingTransactions);
      window.removeEventListener('storage', refreshPendingTransactions);
    };
  }, []);

  useEffect(() => {
    const loadQAReports = async () => {
      if (!user?.userId || activeSection !== 'chat') {
        return;
      }

      try {
        const result = await getReportsLocalFirst(user.userId, language);

        if (result.success) {
          setQaReports(result.data || []);
        }
      } catch (fetchError) {
        logger.warn('Failed to load reports for Q&A context', { error: fetchError, userId: user.userId });
      }
    };

    loadQAReports();
  }, [activeSection, user, language]);

  useEffect(() => {
    const refreshReportsForQA = async () => {
      if (!user?.userId) {
        return;
      }

      try {
        const result = await getReportsLocalFirst(user.userId, language);

        if (result.success) {
          setQaReports(result.data || []);
        }
      } catch (fetchError) {
        logger.warn('Failed to refresh reports after update', { error: fetchError, userId: user.userId });
      }
    };

    const handleReportsUpdated = () => {
      refreshReportsForQA();
    };

    window.addEventListener('reportsUpdated', handleReportsUpdated);

    return () => {
      window.removeEventListener('reportsUpdated', handleReportsUpdated);
    };
  }, [user, language]);

  useEffect(() => {
    if (user) {
      refreshHealthScore();
      loadUserProfile();
      fetchBenchmarkData();
    }
  }, [user]);

  // Refresh data when page becomes visible (e.g., when navigating back from pending transactions)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && user) {
        logger.debug('Page became visible, refreshing data');
        refreshHealthScore();
        recalculateIndices();
        fetchBenchmarkData();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user]);

  // Persist active section so reload returns to the same page
  useEffect(() => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('vyapar-active-section', activeSection);
    }
  }, [activeSection]);

  useEffect(() => {
    if (activeSection === 'dashboard' && user) {
      logger.debug('Switched to dashboard, refreshing data');
      refreshHealthScore();
      recalculateIndices();
      fetchBenchmarkData();
    }
  }, [activeSection, user]);

  // Listen for localStorage changes (e.g., when transactions are added from pending page)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (isUserScopedKey(e.key, 'vyapar-daily-entries') && user) {
        logger.debug('Daily entries changed in localStorage, refreshing');
        refreshHealthScore();
        recalculateIndices();
        fetchBenchmarkData();
      }
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [user]);

  // Listen for custom daily entries changed event (same-tab changes)
  useEffect(() => {
    const handleDailyEntriesChanged = (e: Event) => {
      if (user) {
        const customEvent = e as CustomEvent;
        logger.debug('Daily entries changed (custom event)', { detail: customEvent.detail });
        refreshHealthScore();
        recalculateIndices();
        fetchBenchmarkData();
      }
    };

    window.addEventListener('vyapar-daily-entries-changed', handleDailyEntriesChanged);

    return () => {
      window.removeEventListener('vyapar-daily-entries-changed', handleDailyEntriesChanged);
    };
  }, [user]);

  // Listen for credit entries changes (same-tab)
  useEffect(() => {
    const handleCreditEntriesChanged = () => {
      if (user) {
        refreshHealthScore();
        recalculateIndices();
        fetchBenchmarkData();
      }
    };
    window.addEventListener('vyapar-credit-entries-changed', handleCreditEntriesChanged);
    return () => window.removeEventListener('vyapar-credit-entries-changed', handleCreditEntriesChanged);
  }, [user]);

  const loadUserProfile = async () => {
    if (!user) return;

    try {
      const profile = await getProfileLocalFirst(user.userId);
      if (profile) {
        setUserProfile(profile);
      } else {
        logger.debug('Profile not found or incomplete', { userId: user.userId });
        setUserProfile(null);
      }
    } catch (error) {
      logger.warn('Failed to load profile data', { error });
      setUserProfile(null);
    }
  };

  const fetchBenchmarkData = async () => {
    if (!user) return;

    setBenchmarkLoading(true);
    setBenchmarkError(null);

    try {
      const response = await fetch(`/api/benchmark?userId=${user.userId}`);
      const result = await response.json();

      if (result.success && result.data) {
        setBenchmarkComparison(result.data);
      } else {
        // Handle specific error cases
        if (result.code === 'PROFILE_INCOMPLETE') {
          setBenchmarkError(t('benchmark.profileIncomplete', language));
        } else if (result.code === 'NO_DAILY_ENTRIES') {
          setBenchmarkError(t('benchmark.noDailyEntries', language));
        } else if (result.code === 'SEGMENT_NOT_FOUND') {
          setBenchmarkError(t('benchmark.segmentUnavailable', language));
        } else {
          setBenchmarkError(result.message || 'Failed to load benchmark data');
        }
        setBenchmarkComparison(null);
      }
    } catch (error) {
      logger.warn('Failed to fetch benchmark data', { error });
      setBenchmarkError('Network error. Please try again later.');
      setBenchmarkComparison(null);
    } finally {
      setBenchmarkLoading(false);
    }
  };

  const recalculateIndices = async () => {
    if (!user) return;

    try {
      logger.debug('Triggering index recalculation', { userId: user.userId });

      const response = await fetch('/api/indices/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.userId, language }),
      });

      const result = await response.json();

      if (result.success) {
        logger.info('Indices recalculated successfully', { userId: user.userId });
      } else {
        logger.debug('Index recalculation returned no data', { error: result.error });
      }
    } catch (error) {
      logger.warn('Failed to recalculate indices', { error });
    }
  };

  const handleLanguageChange = (lang: Language) => {
    setLanguage(lang);
    localStorage.setItem('vyapar-lang', lang);

    // Instantly swap to cached insights for the new language (no API call needed)
    if (insightsCache[lang]) {
      setInsights(insightsCache[lang]);
    }
  };

  // Retained for backward compatibility — re-applies cached insights for the given language
  const regenerateAIContent = async (lang: Language) => {
    if (insightsCache[lang]) {
      setInsights(insightsCache[lang]);
    }
    // No mock data — alerts/recommendations come from the analyze API response
  };

  const handleUploadComplete = (newSessionId: string, fileType: FileType) => {
    if (!sessionId) {
      setSessionId(newSessionId);
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('vyapar-session-id', newSessionId);
      }
    }
    setUploadedFiles((prev) => new Set(prev).add(fileType));
    setError(null);
  };

  const handleDailyEntrySubmitted = async () => {
    // Refresh health score and indices
    refreshHealthScore();
    recalculateIndices();
    fetchBenchmarkData();

    // Check for expense alerts
    if (!user) return;

    try {
      // Get the latest daily entry from localStorage
      const dailyEntries = getLocalDailyEntries();
      if (!dailyEntries || dailyEntries.length === 0) return;

      // daily-entry-sync returns newest-first
      const latestEntry = dailyEntries[0];

      // Only check for alerts if there's an expense
      if (latestEntry.totalExpense > 0) {
        try {
          const response = await fetch('/api/expense-alert', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: user.userId,
              expense: {
                amount: latestEntry.totalExpense,
                category: latestEntry.notes || 'general',
                date: latestEntry.date,
              },
            }),
          });

          const result = await response.json();

          if (result.success && result.alert) {
            setExpenseAlert(result.alert);
          }
        } catch (alertError) {
          // Log error but don't block entry submission
          logger.error('Expense alert check failed', {
            error: alertError,
            userId: user.userId,
            date: latestEntry.date,
            expense: latestEntry.totalExpense
          });
          // Do not show error to user - alerts are optional enhancement
        }
      }
    } catch (error) {
      // Log error but don't block entry submission
      logger.error('Failed to process expense alert check', { error });
    }
  };

  const handleCreditChange = () => {
    refreshHealthScore();
    recalculateIndices();
  };

  const handleAddTransaction = async (transaction: InferredTransaction) => {
    if (!user) {
      logger.error('No user found when adding transaction');
      showToast(
        'error',
        language === 'hi'
          ? 'कृपया पहले लॉगिन करें'
          : language === 'mr'
            ? 'कृपया प्रथम लॉगिन करा'
            : 'Please login first'
      );
      return;
    }

    try {
      // Use the proper utility function to add transaction
      const result = await addTransactionToDailyEntry(transaction, user.userId);

      if (result.success) {
        logger.info('Transaction successfully added', {
          transactionId: transaction.id,
          date: transaction.date,
          totalSales: result.dailyEntry?.totalSales,
          totalExpense: result.dailyEntry?.totalExpense
        });

        // Show success toast with transaction details
        const typeLabel = transaction.type === 'sale'
          ? (language === 'hi' ? 'बिक्री' : language === 'mr' ? 'विक्री' : 'Sale')
          : (language === 'hi' ? 'खर्च' : language === 'mr' ? 'खर्च' : 'Expense');

        const successMessage = language === 'hi'
          ? `₹${transaction.amount.toLocaleString('en-IN')} ${typeLabel} जोड़ा गया!`
          : language === 'mr'
            ? `₹${transaction.amount.toLocaleString('en-IN')} ${typeLabel} जोडला!`
            : `₹${transaction.amount.toLocaleString('en-IN')} ${typeLabel} added!`;

        showToast('success', successMessage);

        // Refresh dashboard data
        refreshHealthScore();
        recalculateIndices();
        fetchBenchmarkData();
      } else {
        throw new Error(result.error || 'Failed to add transaction');
      }
    } catch (error) {
      logger.error('Failed to add transaction', { error, transactionId: transaction.id });

      // Show error toast
      const errorMessage = language === 'hi'
        ? 'लेनदेन जोड़ने में विफल'
        : language === 'mr'
          ? 'व्यवहार जोडण्यात अयशस्वी'
          : 'Failed to add transaction';

      showToast('error', errorMessage);
    }
  };

  const handleVoiceDataExtracted = async (data: ExtractedVoiceData) => {
    if (!user) {
      logger.error('No user found when processing voice data');
      showToast(
        'error',
        language === 'hi'
          ? 'कृपया पहले लॉगिन करें'
          : language === 'mr'
            ? 'कृपया प्रथम लॉगिन करा'
            : 'Please login first'
      );
      return;
    }

    try {
      // Import pending transaction utilities
      const { savePendingTransaction } = await import('@/lib/pending-transaction-store');
      const { isDuplicate } = await import('@/lib/duplicate-detector');

      // Determine transaction type based on which field has data
      const type: 'expense' | 'sale' = data.expenses && data.expenses > 0 ? 'expense' : 'sale';
      const amount = type === 'expense' ? (data.expenses || 0) : (data.sales || 0);

      // Generate deterministic ID based on voice data
      const idString = `voice-${data.date}-${amount}-${type}-${data.confidence}`;
      const encoder = new TextEncoder();
      const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(idString));
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const id = hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 16);

      // Create InferredTransaction object
      const inferredTransaction: InferredTransaction = {
        id,
        date: data.date,
        type,
        amount,
        category: data.expenseCategory || undefined,
        source: 'voice' as TransactionSource,
        created_at: new Date().toISOString(),
        raw_data: data,
      };

      // Check for duplicates
      const duplicate = isDuplicate({
        date: inferredTransaction.date,
        amount: inferredTransaction.amount,
        type: inferredTransaction.type,
        category: inferredTransaction.category,
        source: inferredTransaction.source
      });

      if (duplicate) {
        logger.info('Duplicate voice transaction detected', { transactionId: inferredTransaction.id });
        showToast(
          'error',
          language === 'hi'
            ? 'यह लेनदेन पहले से जोड़ा जा चुका है'
            : language === 'mr'
              ? 'हा व्यवहार आधीच जोडला गेला आहे'
              : 'This transaction has already been added'
        );
        return;
      }

      // Save to pending store
      const saved = savePendingTransaction(inferredTransaction, SessionManager.getCurrentUser()?.userId);

      if (saved) {
        logger.info('Voice transaction saved to pending', {
          transactionId: inferredTransaction.id,
          type,
          amount,
          confidence: data.confidence
        });

        // Show success toast with confidence level
        const successMessage = language === 'hi'
          ? `वॉइस डेटा निकाला गया! (विश्वास: ${Math.round(data.confidence * 100)}%) लंबित टैब में जाएं।`
          : language === 'mr'
            ? `व्हॉइस डेटा काढला! (विश्वास: ${Math.round(data.confidence * 100)}%) प्रलंबित टॅबमध्ये जा.`
            : `Voice data extracted! (Confidence: ${Math.round(data.confidence * 100)}%) Go to Pending tab.`;

        showToast('success', successMessage);

        // Switch to pending section to show the transaction
        setActiveSection('pending');
      } else {
        throw new Error('Failed to save to pending store');
      }
    } catch (error) {
      logger.error('Failed to process voice data', { error });

      // Show error toast
      const errorMessage = language === 'hi'
        ? 'वॉइस डेटा प्रोसेस करने में विफल'
        : language === 'mr'
          ? 'व्हॉइस डेटा प्रक्रिया करण्यात अयशस्वी'
          : 'Failed to process voice data';

      showToast('error', errorMessage);
    }
  };

  const refreshHealthScore = () => {
    try {
      const dailyEntries = getLocalDailyEntries();
      if (!dailyEntries || dailyEntries.length === 0) {
        setHealthScore(null);
        setHealthBreakdown(null);
        return;
      }

      // Aggregate across last 30 days of entries for a stable, meaningful score
      // Using only the latest entry causes 0 scores on expense-only days
      const recentEntries = dailyEntries.slice(0, 30);

      const totalSalesAgg = recentEntries.reduce((sum, e) => sum + (e.totalSales || 0), 0);
      const totalExpenseAgg = recentEntries.reduce((sum, e) => sum + (e.totalExpense || 0), 0);

      // Aggregate profit margin and expense ratio across all recent entries
      const profitMargin = totalSalesAgg > 0
        ? (totalSalesAgg - totalExpenseAgg) / totalSalesAgg
        : 0;

      const expenseRatio = totalSalesAgg > 0
        ? totalExpenseAgg / totalSalesAgg
        : 0;

      // Use most recent entry that has cashInHand recorded
      // (users may only fill it occasionally, don't always use the very latest entry)
      const entryWithCash = dailyEntries.find(
        (e) => typeof e.cashInHand === 'number' && !isNaN(e.cashInHand)
      );
      const cashInHand = entryWithCash ? entryWithCash.cashInHand : undefined;

      const creditEntries = getLocalCreditEntries();
      // Only include credit entries whose dueDate is within the last 90 days
      // Older stale/demo entries should not permanently damage the score
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
      const recentCreditEntries = creditEntries.filter((entry) => {
        const due = new Date(entry.dueDate);
        return due >= ninetyDaysAgo;
      });
      const creditSummary = calculateCreditSummary(
        recentCreditEntries.map((entry) => ({
          amount: entry.amount,
          dueDate: entry.dueDate,
          isPaid: entry.isPaid,
        }))
      );

      const result = calculateHealthScore(profitMargin, expenseRatio, cashInHand, {
        overdueCount: creditSummary.overdueCount,
        totalOutstanding: creditSummary.totalOutstanding,
        totalOverdue: creditSummary.totalOverdue,
      });

      if (typeof result.score === 'number' && Number.isFinite(result.score) && isValidHealthBreakdown(result.breakdown)) {
        setHealthScore(result.score);
        setHealthBreakdown(result.breakdown);
      } else {
        logger.warn('Invalid health score payload', { result });
        setHealthScore(null);
        setHealthBreakdown(null);
      }
    } catch (calcError) {
      logger.error('Failed to refresh health score', { error: calcError });
      setHealthScore(null);
      setHealthBreakdown(null);
    }
  };

  // Fetch analysis for a single language — returns { insights, benchmark }
  const fetchAnalysisForLanguage = async (lang: Language): Promise<{ insights: BusinessInsights; benchmark: BenchmarkData | null }> => {
    const response = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, language: lang }),
    });
    const data = await response.json();
    if (data.success && data.insights) return { insights: data.insights, benchmark: data.benchmark || null };
    throw new Error(data.error || 'Analysis failed');
  };

  const handleAnalyze = async () => {
    if (!sessionId) {
      setError(t('uploadDataFirst', language));
      return;
    }

    setAnalyzing(true);
    setError(null);

    const allLanguages: Language[] = ['en', 'hi', 'mr'];

    try {
      const results = await Promise.allSettled(
        allLanguages.map((lang) => fetchAnalysisForLanguage(lang))
      );

      const newCache: Record<string, BusinessInsights> = {};
      let firstSuccess: BusinessInsights | null = null;
      let resolvedBenchmark: BenchmarkData | null = null;

      results.forEach((result, i) => {
        const lang = allLanguages[i];
        if (result.status === 'fulfilled') {
          newCache[lang] = result.value.insights;
          // Use the current language's benchmark if available, otherwise first one
          if (!resolvedBenchmark || lang === language) {
            resolvedBenchmark = result.value.benchmark;
          }
          if (!firstSuccess || lang === language) {
            firstSuccess = result.value.insights;
          }
        }
      });

      if (Object.keys(newCache).length === 0) {
        setError(t('analysisFailed', language));
        return;
      }

      setInsightsCache(newCache);
      setInsights(newCache[language] || firstSuccess);
      if (resolvedBenchmark) setBenchmark(resolvedBenchmark);
    } catch {
      setError(t('analysisFailed', language));
    } finally {
      setAnalyzing(false);
    }
  };

  const handleLoadSampleData = async () => {
    const { getDemoDataPaths } = await import('@/lib/demo-data-index');
    const resolvedProfile = await resolveProfileForDemoData(userProfile);

    // Pick demo data based on user's profile
    const paths = getDemoDataPaths(
      resolvedProfile?.business_type || resolvedProfile?.businessType,
      resolvedProfile?.city_tier
    );

    const fetchFile = async (url: string, name: string) => {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Failed to fetch ${url}`);
      const text = await res.text();
      return new File([text], name, { type: 'text/csv' });
    };

    const [salesFile, expensesFile, inventoryFile] = await Promise.all([
      fetchFile(paths.sales, 'sample-sales.csv'),
      fetchFile(paths.expenses, 'sample-expenses.csv'),
      fetchFile(paths.inventory, 'sample-inventory.csv'),
    ]);

    const files = [
      { file: salesFile, type: 'sales' as FileType },
      { file: expensesFile, type: 'expenses' as FileType },
      { file: inventoryFile, type: 'inventory' as FileType },
    ];

    for (const { file, type } of files) {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('fileType', type);
      if (sessionId) {
        formData.append('sessionId', sessionId);
      }

      try {
        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });

        const data = await response.json();
        if (data.success) {
          handleUploadComplete(data.sessionId, type);
        }
      } catch (uploadError) {
        logger.error('Sample data upload failed', { error: uploadError });
      }
    }
  };

  const hasUploadedData = uploadedFiles.size > 0;

  const handleReceiptDataExtracted = async (data: { date: string; amount: number; items: string[]; vendor: string }) => {
    const itemsList = data.items.join(', ');

    // Automatically add to daily entries
    try {
      const entry = {
        date: data.date,
        sales: 0,
        expenses: data.amount,
        notes: `${data.vendor} - ${itemsList}`,
      };

      const response = await fetch('/api/daily', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entry),
      });

      if (!response.ok) throw new Error('Failed to save entry');

      // Refresh health score which will reload entries
      refreshHealthScore();

      const message =
        language === 'hi'
          ? `रसीद प्रोसेस हो गई! तारीख: ${data.date} राशि: ₹${data.amount} दुकान: ${data.vendor} वस्तुएं: ${itemsList}. यह खर्च आपके दैनिक प्रविष्टियों में जोड़ दिया गया है।`
          : language === 'mr'
            ? `पावती प्रक्रिया झाली! तारीख: ${data.date} रक्कम: ₹${data.amount} दुकान: ${data.vendor} वस्तू: ${itemsList}. हा खर्च तुमच्या दैनिक नोंदींमध्ये जोडला गेला आहे।`
            : `Receipt processed! Date: ${data.date} Amount: ₹${data.amount} Vendor: ${data.vendor} Items: ${itemsList}. This expense has been added to your daily entries.`;

      showToast('success', message);
    } catch (error) {
      logger.error('Failed to add receipt to daily entries', { error });
      const errorMessage =
        language === 'hi'
          ? 'खर्च जोड़ने में विफल। कृपया मैन्युअल रूप से जोड़ें।'
          : language === 'mr'
            ? 'खर्च जोडण्यात अयशस्वी. कृपया मॅन्युअली जोडा.'
            : 'Failed to add expense. Please add manually.';
      showToast('error', errorMessage);
    }
  };

  const getSectionLabel = (section: AppSection): string => {
    const labelsEn: Record<AppSection, string> = {
      dashboard: 'Dashboard',
      health: 'Health & Planning',
      entries: 'Daily Entry',
      credit: 'Credit',
      pending: 'Pending',
      analysis: 'Analysis',
      chat: t('nav.chat', 'en'),
      account: 'Account',
      reports: 'Reports',
    };

    const labelsHi: Record<AppSection, string> = {
      dashboard: 'डैशबोर्ड',
      health: 'सेहत और योजना',
      entries: 'दैनिक एंट्री',
      credit: 'उधारी',
      pending: 'लंबित',
      analysis: 'विश्लेषण',
      chat: t('nav.chat', 'hi'),
      account: 'खाता',
      reports: 'रिपोर्ट',
    };

    const labelsMr: Record<AppSection, string> = {
      dashboard: 'डॅशबोर्ड',
      health: 'आरोग्य आणि योजना',
      entries: 'दैनिक नोंद',
      credit: 'उधार',
      pending: 'प्रलंबित',
      analysis: 'विश्लेषण',
      chat: t('nav.chat', 'mr'),
      account: 'खाते',
      reports: 'अहवाल',
    };

    if (language === 'hi') return labelsHi[section];
    if (language === 'mr') return labelsMr[section];
    return labelsEn[section];
  };

  const sectionItems: Array<{ id: AppSection; icon: ComponentType<{ className?: string }> }> = [
    { id: 'dashboard', icon: LayoutDashboard },
    { id: 'health', icon: Heart },
    { id: 'entries', icon: ClipboardList },
    { id: 'credit', icon: CreditCard },
    { id: 'pending', icon: Bell },
    { id: 'reports', icon: FileText },
    { id: 'analysis', icon: BarChart3 },
    { id: 'chat', icon: MessageSquare },
    { id: 'account', icon: UserCircle },
  ];

  const renderAnalysisPanel = () => (
    <section className="space-y-6">
      <button
        onClick={() => setAdvancedModeExpanded(!advancedModeExpanded)}
        className="flex w-full items-center justify-between rounded-2xl border border-neutral-200 bg-white p-5 text-left shadow-sm transition-colors hover:bg-neutral-50"
      >
        <div className="flex items-center gap-2">
          <span className="text-2xl font-semibold text-neutral-900">{t('advancedMode', language)}</span>
          <span className="text-sm text-neutral-500">
            ({uploadedFiles.size} {language === 'hi' ? 'फाइलें' : language === 'mr' ? 'फाइल्स' : 'files'})
          </span>
        </div>
        {advancedModeExpanded ? (
          <ChevronUp className="w-6 h-6 text-neutral-500" />
        ) : (
          <ChevronDown className="w-6 h-6 text-neutral-500" />
        )}
      </button>

      {advancedModeExpanded && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-2xl font-semibold text-neutral-900">{t('uploadCSV', language)}</h3>
              <Button
                onClick={handleLoadSampleData}
                variant="secondary"
                size="sm"
              >
                Try Sample Data
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FileUpload
                fileType="sales"
                sessionId={sessionId}
                language={language}
                onUploadComplete={handleUploadComplete}
              />
              <FileUpload
                fileType="expenses"
                sessionId={sessionId}
                language={language}
                onUploadComplete={handleUploadComplete}
              />
              <FileUpload
                fileType="inventory"
                sessionId={sessionId}
                language={language}
                onUploadComplete={handleUploadComplete}
              />
            </div>
          </div>

          {hasUploadedData && (
            <Button
              onClick={handleAnalyze}
              disabled={analyzing}
              size="lg"
              fullWidth
            >
              {analyzing ? t('analyzing', language) : t('analyzeButton', language)}
            </Button>
          )}

          {error && (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-red-700">{error}</div>
          )}

          {insights && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <ShareWhatsApp insights={insights} language={language} />
                <ExportPDF insights={insights} language={language} benchmark={benchmark} />
              </div>

              {insights.alerts && insights.alerts.length > 0 && <Alerts alerts={insights.alerts} language={language} />}
              {insights.recommendations && insights.recommendations.length > 0 && (
                <Recommendations recommendations={insights.recommendations} language={language} />
              )}
              {insights.chartData && <Charts chartData={insights.chartData} language={language} />}
              {benchmark && <Benchmark benchmark={benchmark} language={language} />}
              {/* Translate hint when switching language after analysis */}
              {insights && (() => {
                const isCached = !!insightsCache[language];
                const hasOtherLanguages = Object.keys(insightsCache).length > 1;
                const translateHint: Record<string, string> = {
                  hi: 'विश्लेषण तीनों भाषाओं में तैयार है — ऊपर भाषा बदलें, तुरंत दिखेगा।',
                  mr: 'विश्लेषण तिन्ही भाषांमध्ये तयार आहे — वर भाषा बदला, लगेच दिसेल.',
                  en: 'Analysis ready in all languages — switch language above to see it instantly.',
                };
                return (!isCached && hasOtherLanguages) ? (
                  <p className="text-xs text-primary-500 italic text-center">
                    {translateHint[language] || translateHint.en}
                  </p>
                ) : null;
              })()}
              <InsightsDisplay insights={insightsCache[language] || insights} language={language} />
            </div>
          )}
        </div>
      )}
    </section>
  );

  const handleLogoutClick = () => {
    SessionManager.clearSession();
    router.push('/login');
  };

  return (
    <AuthGuard>
      <div className="min-h-screen overflow-hidden bg-neutral-50 flex flex-col lg:flex-row">
        {/* Sidebar */}
        <aside className="sticky top-0 hidden h-screen w-56 flex-col border-r border-neutral-200 bg-white lg:flex">
          {/* Logo */}
          <div className="flex h-[89px] shrink-0 items-center justify-center border-b border-neutral-200 bg-white/95 px-4 backdrop-blur-md">
            <div className="flex items-center justify-center">
              <img
                src="/background-removed.png"
                alt="Vyapar AI"
                style={{ height: 55, width: 'auto', objectFit: 'contain' }}
              />
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-2 overflow-y-auto px-4 py-5">
            {sectionItems.map((section) => {
              const Icon = section.icon;
              const active = activeSection === section.id;
              const showBadge = section.id === 'pending' && pendingCount.badge > 0;

              return (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  aria-current={active ? 'page' : undefined}
                  className={`w-full flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition-all ${active
                    ? 'bg-primary-50 text-primary-700 shadow-sm ring-1 ring-primary-100'
                    : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900'
                    }`}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  <span className="flex-1 text-left">{getSectionLabel(section.id)}</span>
                  {showBadge && (
                    <span className="rounded-full bg-primary-600 px-2 py-0.5 text-[10px] font-bold text-white">
                      {pendingCount.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* User Profile Footer */}
          <div className="mt-auto border-t border-neutral-200 p-4">
            <UserProfile language={language} />
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex h-screen flex-1 flex-col overflow-hidden bg-neutral-50">
          {/* Header */}
          <header className="sticky top-0 z-30 border-b border-neutral-200 bg-white/95 backdrop-blur-md">
            {/* Top bar: title + controls */}
            <div className="flex items-center justify-between gap-2 px-4 h-14 sm:px-6 lg:px-10 lg:h-16">
              {/* Mobile: show logo; Desktop: show section title */}
              <div className="flex items-center gap-3 shrink min-w-0">
                <img
                  src="/background-removed.png"
                  alt="Vyapar AI"
                  className="lg:hidden"
                  style={{ height: 40, width: 'auto', objectFit: 'contain' }}
                />
                <h2 className="hidden lg:block text-lg font-bold tracking-tight text-neutral-900 truncate sm:text-2xl">
                  {activeSection === 'pending' ? t('nav.pending', language) : getSectionLabel(activeSection)}
                </h2>
              </div>
              {/* Right side: language dropdown (desktop only) + sync */}
              <div className="flex items-center gap-2 shrink-0">
                <div className="hidden lg:block">
                  <LanguageSelector currentLanguage={language} onLanguageChange={handleLanguageChange} />
                </div>
                <SyncStatus language={language} />
              </div>
            </div>

            {/* Mobile nav pills row — separate sticky row, scrollable */}
            <div className="overflow-x-auto lg:hidden border-t border-neutral-100 bg-white px-4 py-2">
              <div className="flex gap-2">
                {sectionItems.map((section) => {
                  const Icon = section.icon;
                  const active = activeSection === section.id;
                  const showBadge = section.id === 'pending' && pendingCount.badge > 0;
                  return (
                    <button
                      key={section.id}
                      onClick={() => setActiveSection(section.id)}
                      className={`flex items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${
                        active
                          ? 'border-primary-600 bg-primary-600 text-white shadow-sm'
                          : 'border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5 shrink-0" />
                      <span>{getSectionLabel(section.id)}</span>
                      {showBadge && (
                        <span className="ml-1 rounded-full bg-white/25 px-1.5 py-0.5 text-[10px]">
                          {pendingCount.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Desktop subtitle row */}
            <div className="hidden lg:block px-10 pb-2 -mt-1">
              <p className="text-sm text-neutral-500 truncate">
                {activeSection === 'pending' && t('pendingSubtitle', language)}
                {activeSection === 'chat' && t('askAISubtitle', language)}
                {activeSection === 'reports' && (language === 'hi' ? 'अवधि सारांश बनाएं, प्रदर्शन रुझान ट्रैक करें।' : language === 'mr' ? 'कालावधी सारांश तयार करा, कामगिरीचे ट्रेंड ट्रॅक करा.' : 'Generate summaries and track performance trends.')}
                {activeSection === 'analysis' && (language === 'hi' ? 'CSV डेटा अपलोड करें और AI से अंतर्दृष्टि पाएं।' : language === 'mr' ? 'CSV डेटा अपलोड करा आणि AI कडून अंतर्दृष्टी मिळवा.' : 'Upload CSV data to get AI-powered insights.')}
                {activeSection === 'credit' && (language === 'hi' ? 'ग्राहकों का उधार ट्रैक करें, बकाया भुगतान का फॉलो-अप करें।' : language === 'mr' ? 'ग्राहकांचे उधार ट्रॅक करा आणि थकीत पेमेंटचा फॉलो-अप करा.' : 'Track customer credit, follow up on overdue payments.')}
                {activeSection === 'entries' && (language === 'hi' ? 'आज की बिक्री, खर्च और नकद दर्ज करें।' : language === 'mr' ? 'आजची विक्री, खर्च आणि रोकड नोंदवा.' : "Log today's sales, expenses, and cash.")}
                {activeSection === 'dashboard' && (language === 'hi' ? 'अपने व्यवसाय का आज का स्वास्थ्य देखें।' : language === 'mr' ? 'आजचे व्यवसाय आरोग्य पाहा.' : 'Your business health at a glance.')}
                {activeSection === 'health' && (language === 'hi' ? 'तनाव सूचकांक, वहनीयता और नकदी प्रवाह पूर्वानुमान देखें।' : language === 'mr' ? 'ताण निर्देशांक, परवडणारेपणा आणि रोख प्रवाह अंदाज पाहा.' : 'Stress index, affordability, and cash flow forecast.')}
                {activeSection === 'account' && (language === 'hi' ? 'अपनी प्रोफ़ाइल और प्राथमिकताएं प्रबंधित करें।' : language === 'mr' ? 'तुमची प्रोफाइल आणि प्राधान्ये व्यवस्थापित करा.' : 'Manage your profile and preferences.')}
              </p>
            </div>
          </header>

          {/* Scrollable Dashboard Content */}
          <div
            className={`flex-1 overflow-y-auto px-3 py-4 pb-6 sm:px-6 sm:py-6 sm:pb-8 lg:px-10 lg:py-10 ${
              activeSection === 'credit' ? 'bg-white' : 'bg-neutral-50'
            }`}
          >
            <div
              className={
                activeSection === 'health'
                  ? 'w-full space-y-4 sm:space-y-8'
                  : 'mx-auto w-full max-w-7xl space-y-4 sm:space-y-6 lg:space-y-8'
              }
            >
              {activeSection === 'dashboard' && (
                <>
                  {/* Top Banners */}
                  <TrustBanner language={language} />

                  {expenseAlert && (
                    <ExpenseAlertBanner
                      alert={expenseAlert}
                      onDismiss={() => setExpenseAlert(null)}
                      language={language}
                    />
                  )}
                </>
              )}

               {activeSection === 'entries' && (
                <>
                  {user && <VoiceRecorder onDataExtracted={handleVoiceDataExtracted} language={language} />}
                  <ReceiptOCR language={language} onDataExtracted={handleReceiptDataExtracted} />
                  {user && (
                    <DailyEntryForm 
                      language={language} 
                      onEntrySubmitted={() => {
                        handleDailyEntrySubmitted();
                        setVoiceInitialData(null);
                      }} 
                      initialData={voiceInitialData || undefined}
                    />
                  )}
                  <CSVUpload language={language} />
                </>
              )}

              {activeSection === 'credit' && user && (
                <>
                  <CreditTracking userId={user.userId} language={language} onCreditChange={handleCreditChange} />
                  <FollowUpPanel userId={user.userId} language={language} overdueThreshold={3} onCreditChange={handleCreditChange} />
                </>
              )}

              {activeSection === 'analysis' && renderAnalysisPanel()}

              {activeSection === 'health' && user && (
                <>
                  {/* Business Health Score */}
                  {typeof healthScore === 'number' &&
                    Number.isFinite(healthScore) &&
                    healthBreakdown &&
                    isValidHealthBreakdown(healthBreakdown) &&
                    !('success' in healthBreakdown) &&
                    !('error' in healthBreakdown) ? (
                    <HealthScoreDisplay
                      score={healthScore}
                      breakdown={healthBreakdown}
                      language={language}
                      sessionId={sessionId || undefined}
                      userId={user.userId}
                    />
                  ) : (
                    <div className="bg-white rounded-xl p-6 shadow-sm border border-neutral-200">
                      <h3 className="text-lg font-semibold text-neutral-900 mb-2">
                        {language === 'hi' ? 'स्वास्थ्य स्कोर' : language === 'mr' ? 'हेल्थ स्कोअर' : 'Health Score'}
                      </h3>
                      <p className="text-sm text-neutral-600">
                        {language === 'hi'
                          ? 'दैनिक एंट्री के बाद स्कोर दिखेगा।'
                          : language === 'mr'
                            ? 'दैनिक नोंदीनंतर स्कोअर दिसेल.'
                            : 'Score will appear after daily entries are added.'}
                      </p>
                    </div>
                  )}

                  {/* Segment Benchmark */}
                  <BenchmarkDisplay
                    comparison={benchmarkComparison}
                    language={language}
                    isLoading={benchmarkLoading}
                    error={benchmarkError || undefined}
                    userId={user.userId}
                  />

                  {/* Stress & Affordability Indices */}
                  {userProfile && (
                    <IndicesDashboard
                      userId={user.userId}
                      userProfile={userProfile}
                      language={language}
                    />
                  )}

                  {/* Cash Flow Predictor */}
                  <CashFlowPredictor
                    userId={user.userId}
                    language={language}
                  />
                </>
              )}

              {activeSection === 'chat' &&
                (sessionId ? (
                  <QAChat
                    sessionId={sessionId}
                    language={language}
                    dataSources={qaDataSources}
                    contextData={{
                      dailyEntries: qaDailyEntries,
                      creditEntries: qaCreditEntries,
                    }}
                    appContext={qaAppContext}
                    initialMessages={qaInitialMessages}
                  />
                ) : (
                  <div className="bg-white rounded-lg shadow-md p-6 text-neutral-600">
                    {language === 'hi'
                      ? 'चैट शुरू करने से पहले डेटा अपलोड करें।'
                      : language === 'mr'
                        ? 'चॅट सुरू करण्यापूर्वी डेटा अपलोड करा.'
                        : 'Upload data first to start Q&A chat.'}
                  </div>
                ))}

              {activeSection === 'pending' && (
                <div className="space-y-6">
                  <PendingTransactionConfirmation
                    language={language}
                    onAdd={handleAddTransaction}
                  />
                </div>
              )}

              {activeSection === 'reports' && user && (
                <ReportViewer
                  userId={user.userId}
                  language={language}
                />
              )}

              {activeSection === 'account' && user && (
                <>
                  <ProfileContent language={language} user={user} />
                  {/* Logout — visible on mobile where sidebar is hidden */}
                  <div className="lg:hidden">
                    <button
                      onClick={handleLogoutClick}
                      className="w-full rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 transition-colors hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                    >
                      {language === 'hi' ? 'लॉग आउट' : language === 'mr' ? 'लॉग आउट' : 'Log Out'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </main>
      </div>
    </AuthGuard>
  );
}
