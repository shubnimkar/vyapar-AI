'use client';

import { useState, useEffect, type ComponentType } from 'react';
import AuthGuard from '@/components/auth/AuthGuard';
import UserProfile from '@/components/auth/UserProfile';
import LanguageSelector from '@/components/LanguageSelector';
import SyncStatus from '@/components/SyncStatus';
import TrustBanner from '@/components/TrustBanner';
import ReceiptOCR from '@/components/ReceiptOCR';
import { HybridSyncManager } from '@/lib/hybrid-sync-dynamodb';
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
import Toast, { ToastType } from '@/components/Toast';
import { logger } from '@/lib/logger';
import ShareWhatsApp from '@/components/ShareWhatsApp';
import ExportPDF from '@/components/ExportPDF';
import { Language, BusinessInsights, FileType, BenchmarkData, InferredTransaction } from '@/lib/types';
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
} from 'lucide-react';
import { SessionManager } from '@/lib/session-manager';
import { getLocalEntries as getLocalDailyEntries } from '@/lib/daily-entry-sync';
import { getLocalEntries as getLocalCreditEntries } from '@/lib/credit-sync';
import { calculateCreditSummary, calculateHealthScore } from '@/lib/calculations';
import { usePendingTransactionCount } from '@/lib/hooks/usePendingTransactionCount';
import IndicesDashboard from '@/components/IndicesDashboard';
import BenchmarkDisplay from '@/components/BenchmarkDisplay';
import { BenchmarkComparison } from '@/lib/types';

type AppSection = 'dashboard' | 'entries' | 'credit' | 'pending' | 'analysis' | 'chat' | 'account';

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
  const [language, setLanguage] = useState<Language>('en');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<Set<FileType>>(new Set());
  const [insights, setInsights] = useState<BusinessInsights | null>(null);
  const [benchmark, setBenchmark] = useState<BenchmarkData | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [advancedModeExpanded, setAdvancedModeExpanded] = useState(false);
  const [healthScore, setHealthScore] = useState<number | null>(null);
  const [healthBreakdown, setHealthBreakdown] = useState<HealthBreakdown | null>(null);
  const [user, setUser] = useState<{ userId: string; username: string } | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [activeSection, setActiveSection] = useState<AppSection>('dashboard');
  
  // Segment Benchmark state
  const [benchmarkComparison, setBenchmarkComparison] = useState<BenchmarkComparison | null>(null);
  const [benchmarkLoading, setBenchmarkLoading] = useState(false);
  const [benchmarkError, setBenchmarkError] = useState<string | null>(null);
  
  // Toast notification state
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
  
  // Get pending transaction count for badge
  const pendingCount = usePendingTransactionCount();

  useEffect(() => {
    const initSession = async () => {
      const currentUser = SessionManager.getCurrentUser();
      if (currentUser) {
        setUser(currentUser);

        try {
          await HybridSyncManager.syncToCloud(currentUser.userId);
          logger.info('Initial sync completed');
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
  }, []);

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

  // Refresh data when switching to dashboard section
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
      if (e.key === 'vyapar-daily-entries' && user) {
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

  const loadUserProfile = async () => {
    if (!user) return;
    
    try {
      const response = await fetch(`/api/profile?userId=${user.userId}`);
      const result = await response.json();
      
      if (result.success && result.data) {
        setUserProfile(result.data);
      } else {
        logger.debug('Profile not found or incomplete', { error: result.error });
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
    
    // Re-generate AI content (recommendations and alerts) in the new language
    if (insights) {
      regenerateAIContent(lang);
    }
  };

  const regenerateAIContent = async (lang: Language) => {
    try {
      const { generateMockRecommendations, generateMockAlerts } = await import('@/lib/bedrock-client-mock');
      
      setInsights(prev => {
        if (!prev) return prev;
        
        return {
          ...prev,
          recommendations: generateMockRecommendations(lang),
          alerts: generateMockAlerts(lang),
        };
      });
      
      logger.debug('AI content regenerated for language', { language: lang });
    } catch (error) {
      logger.warn('Failed to regenerate AI content', { error });
    }
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

  const handleDailyEntrySubmitted = () => {
    refreshHealthScore();
    recalculateIndices();
    fetchBenchmarkData();
  };

  const handleCreditChange = () => {
    refreshHealthScore();
    recalculateIndices();
  };

  const handleAddTransaction = async (transaction: InferredTransaction) => {
    if (!user) {
      logger.error('No user found when adding transaction');
      setToast({
        message: language === 'hi' 
          ? 'कृपया पहले लॉगिन करें'
          : language === 'mr'
          ? 'कृपया प्रथम लॉगिन करा'
          : 'Please login first',
        type: 'error'
      });
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
        
        setToast({
          message: successMessage,
          type: 'success'
        });

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
      
      setToast({
        message: errorMessage,
        type: 'error'
      });
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

      // daily-entry-sync returns newest-first
      const latestEntry = dailyEntries[0];

      const profitMargin =
        typeof latestEntry.profitMargin === 'number'
          ? latestEntry.profitMargin
          : latestEntry.totalSales > 0
          ? (latestEntry.totalSales - latestEntry.totalExpense) / latestEntry.totalSales
          : 0;

      const expenseRatio =
        typeof latestEntry.expenseRatio === 'number'
          ? latestEntry.expenseRatio
          : latestEntry.totalSales > 0
          ? latestEntry.totalExpense / latestEntry.totalSales
          : 0;

      const creditEntries = getLocalCreditEntries();
      const creditSummary = calculateCreditSummary(
        creditEntries.map((entry) => ({
          amount: entry.amount,
          dueDate: entry.dueDate,
          isPaid: entry.isPaid,
        }))
      );

      const result = calculateHealthScore(profitMargin, expenseRatio, latestEntry.cashInHand, {
        overdueCount: creditSummary.overdueCount,
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

  const handleAnalyze = async () => {
    if (!sessionId) {
      setError(t('uploadDataFirst', language));
      return;
    }

    setAnalyzing(true);
    setError(null);

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId,
          language,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setInsights(data.insights);
        setBenchmark(data.benchmark || null);
      } else {
        setError(data.error || t('analysisFailed', language));
      }
    } catch {
      setError(t('analysisFailed', language));
    } finally {
      setAnalyzing(false);
    }
  };

  const handleLoadSampleData = async () => {
    const { sampleSalesData, sampleExpensesData, sampleInventoryData, createSampleFile } =
      await import('@/lib/sample-data');

    const salesFile = createSampleFile(sampleSalesData, 'sample-sales.csv');
    const expensesFile = createSampleFile(sampleExpensesData, 'sample-expenses.csv');
    const inventoryFile = createSampleFile(sampleInventoryData, 'sample-inventory.csv');

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
          ? `रसीद प्रोसेस हो गई!\n\nतारीख: ${data.date}\nराशि: ₹${data.amount}\nदुकान: ${data.vendor}\nवस्तुएं: ${itemsList}\n\nयह खर्च आपके दैनिक प्रविष्टियों में जोड़ दिया गया है।`
          : language === 'mr'
          ? `पावती प्रक्रिया झाली!\n\nतारीख: ${data.date}\nरक्कम: ₹${data.amount}\nदुकान: ${data.vendor}\nवस्तू: ${itemsList}\n\nहा खर्च तुमच्या दैनिक नोंदींमध्ये जोडला गेला आहे।`
          : `Receipt processed!\n\nDate: ${data.date}\nAmount: ₹${data.amount}\nVendor: ${data.vendor}\nItems: ${itemsList}\n\nThis expense has been added to your daily entries.`;

      alert(message);
    } catch (error) {
      logger.error('Failed to add receipt to daily entries', { error });
      const errorMessage =
        language === 'hi'
          ? 'खर्च जोड़ने में विफल। कृपया मैन्युअल रूप से जोड़ें।'
          : language === 'mr'
          ? 'खर्च जोडण्यात अयशस्वी. कृपया मॅन्युअली जोडा.'
          : 'Failed to add expense. Please add manually.';
      alert(errorMessage);
    }
  };

  const getSectionLabel = (section: AppSection): string => {
    const labelsEn: Record<AppSection, string> = {
      dashboard: 'Dashboard',
      entries: 'Daily Entry',
      credit: 'Credit',
      pending: 'Pending',
      analysis: 'Analysis',
      chat: 'Q&A',
      account: 'Account',
    };

    const labelsHi: Record<AppSection, string> = {
      dashboard: 'डैशबोर्ड',
      entries: 'दैनिक एंट्री',
      credit: 'उधारी',
      pending: 'लंबित',
      analysis: 'विश्लेषण',
      chat: 'प्रश्नोत्तर',
      account: 'खाता',
    };

    const labelsMr: Record<AppSection, string> = {
      dashboard: 'डॅशबोर्ड',
      entries: 'दैनिक नोंद',
      credit: 'उधार',
      pending: 'प्रलंबित',
      analysis: 'विश्लेषण',
      chat: 'प्रश्नोत्तर',
      account: 'खाते',
    };

    if (language === 'hi') return labelsHi[section];
    if (language === 'mr') return labelsMr[section];
    return labelsEn[section];
  };

  const sectionItems: Array<{ id: AppSection; icon: ComponentType<{ className?: string }> }> = [
    { id: 'dashboard', icon: LayoutDashboard },
    { id: 'entries', icon: ClipboardList },
    { id: 'credit', icon: CreditCard },
    { id: 'pending', icon: Bell },
    { id: 'analysis', icon: BarChart3 },
    { id: 'chat', icon: MessageSquare },
    { id: 'account', icon: UserCircle },
  ];

  const renderAnalysisPanel = () => (
    <section className="space-y-4">
      <button
        onClick={() => setAdvancedModeExpanded(!advancedModeExpanded)}
        className="w-full bg-white rounded-lg shadow-md p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-xl font-bold text-gray-800">{t('advancedMode', language)}</span>
          <span className="text-sm text-gray-500">
            ({uploadedFiles.size} {language === 'hi' ? 'फाइलें' : language === 'mr' ? 'फाइल्स' : 'files'})
          </span>
        </div>
        {advancedModeExpanded ? (
          <ChevronUp className="w-6 h-6 text-gray-600" />
        ) : (
          <ChevronDown className="w-6 h-6 text-gray-600" />
        )}
      </button>

      {advancedModeExpanded && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-800">{t('uploadCSV', language)}</h3>
              <button
                onClick={handleLoadSampleData}
                className="px-4 py-2 bg-purple-500 text-white rounded-lg text-sm font-medium hover:bg-purple-600 transition-colors"
              >
                Try Sample Data
              </button>
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
            <button
              onClick={handleAnalyze}
              disabled={analyzing}
              className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white py-4 px-6 rounded-lg font-bold text-lg hover:from-blue-600 hover:to-indigo-700 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl min-h-[56px]"
            >
              {analyzing ? t('analyzing', language) : t('analyzeButton', language)}
            </button>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">{error}</div>
          )}

          {insights && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <ShareWhatsApp insights={insights} language={language} />
                <ExportPDF insights={insights} language={language} />
              </div>

              {insights.alerts && insights.alerts.length > 0 && <Alerts alerts={insights.alerts} language={language} />}
              {insights.recommendations && insights.recommendations.length > 0 && (
                <Recommendations recommendations={insights.recommendations} language={language} />
              )}
              {insights.chartData && <Charts chartData={insights.chartData} language={language} />}
              {benchmark && <Benchmark benchmark={benchmark} language={language} />}
              <InsightsDisplay insights={insights} language={language} />
            </div>
          )}
        </div>
      )}
    </section>
  );

  return (
    <AuthGuard>
      {/* Toast notification */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
      
      <div className="min-h-screen bg-slate-100">
        <header className="bg-white border-b border-slate-200 sticky top-0 z-20">
          <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{t('appTitle', language)}</h1>
                <p className="text-sm text-gray-600 mt-1">{t('appSubtitle', language)}</p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
                <LanguageSelector currentLanguage={language} onLanguageChange={handleLanguageChange} />
                <SyncStatus language={language} />
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-6">
            <aside className="bg-white rounded-xl border border-slate-200 p-3 h-fit lg:sticky lg:top-24">
              <nav className="flex lg:flex-col gap-2 overflow-x-auto lg:overflow-visible pb-1 lg:pb-0">
                {sectionItems.map((section) => {
                  const Icon = section.icon;
                  const active = activeSection === section.id;
                  const showBadge = section.id === 'pending' && pendingCount.badge > 0;
                  
                  return (
                    <button
                      key={section.id}
                      onClick={() => setActiveSection(section.id)}
                      className={`flex items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-colors relative ${
                        active
                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                          : 'text-slate-700 hover:bg-slate-50 border border-transparent'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {getSectionLabel(section.id)}
                      {showBadge && (
                        <span className="ml-auto flex items-center justify-center min-w-[20px] h-5 px-1.5 bg-orange-500 text-white text-xs font-bold rounded-full">
                          {pendingCount.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </nav>

              <div className="mt-4 hidden lg:block">
                <UserProfile language={language} />
              </div>
            </aside>

            <section className="space-y-6">
              {activeSection === 'dashboard' && (
                <>
                  <TrustBanner language={language} />

                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                    <ReceiptOCR language={language} onDataExtracted={handleReceiptDataExtracted} />

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
                      />
                    ) : (
                      <div className="bg-white rounded-lg shadow-md p-6 border border-slate-200">
                        <h3 className="text-lg font-semibold text-slate-800 mb-2">
                          {language === 'hi' ? 'स्वास्थ्य स्कोर' : language === 'mr' ? 'हेल्थ स्कोअर' : 'Health Score'}
                        </h3>
                        <p className="text-sm text-slate-600">
                          {language === 'hi'
                            ? 'दैनिक एंट्री के बाद स्कोर दिखेगा।'
                            : language === 'mr'
                            ? 'दैनिक नोंदीनंतर स्कोअर दिसेल.'
                            : 'Score will appear after daily entries are added.'}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Segment Benchmark Display - positioned near health score */}
                  <BenchmarkDisplay
                    comparison={benchmarkComparison}
                    language={language}
                    isLoading={benchmarkLoading}
                    error={benchmarkError || undefined}
                  />

                  {/* Stress & Affordability Index Dashboard */}
                  {user && userProfile && (
                    <IndicesDashboard
                      userId={user.userId}
                      userProfile={userProfile}
                      language={language}
                    />
                  )}

                  {user && <DailyEntryForm language={language} onEntrySubmitted={handleDailyEntrySubmitted} />}
                  {user && <CreditTracking userId={user.userId} language={language} onCreditChange={handleCreditChange} />}
                </>
              )}

              {activeSection === 'entries' && (
                <>
                  <ReceiptOCR language={language} onDataExtracted={handleReceiptDataExtracted} />
                  {user && <DailyEntryForm language={language} onEntrySubmitted={handleDailyEntrySubmitted} />}
                </>
              )}

              {activeSection === 'credit' && user && (
                <>
                  <CreditTracking userId={user.userId} language={language} onCreditChange={handleCreditChange} />
                  <FollowUpPanel userId={user.userId} language={language} overdueThreshold={3} onCreditChange={handleCreditChange} />
                </>
              )}

              {activeSection === 'analysis' && renderAnalysisPanel()}

              {activeSection === 'chat' &&
                (sessionId ? (
                  <QAChat sessionId={sessionId} language={language} />
                ) : (
                  <div className="bg-white rounded-lg shadow-md p-6 text-slate-600">
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
                  <CSVUpload language={language} />
                </div>
              )}

              {activeSection === 'account' && <UserProfile language={language} />}
            </section>
          </div>
        </main>
      </div>
    </AuthGuard>
  );
}
