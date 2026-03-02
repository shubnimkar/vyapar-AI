'use client';

import { useState, useEffect } from 'react';
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
import FileUpload from '@/components/FileUpload';
import InsightsDisplay from '@/components/InsightsDisplay';
import QAChat from '@/components/QAChat';
import Charts from '@/components/Charts';
import Recommendations from '@/components/Recommendations';
import Alerts from '@/components/Alerts';
import Benchmark from '@/components/Benchmark';
import ShareWhatsApp from '@/components/ShareWhatsApp';
import ExportPDF from '@/components/ExportPDF';
import { Language, BusinessInsights, FileType, BenchmarkData } from '@/lib/types';
import { t } from '@/lib/translations';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { SessionManager } from '@/lib/session-manager';

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
  const [healthBreakdown, setHealthBreakdown] = useState<any>(null);
  const [user, setUser] = useState<any>(null);

  // Initialize session and sync engine on mount
  useEffect(() => {
    const initSession = async () => {
      // Get current user
      const currentUser = SessionManager.getCurrentUser();
      if (currentUser) {
        setUser(currentUser);
        
        // Perform initial sync with DynamoDB
        try {
          await HybridSyncManager.syncToCloud(currentUser.userId);
          console.log('[App] Initial sync completed');
        } catch (error) {
          console.warn('[App] Initial sync failed:', error);
        }
      }
      
      // Check if we have a session in sessionStorage (survives hot reloads)
      const storedSessionId = typeof window !== 'undefined' ? sessionStorage.getItem('vyapar-session-id') : null;
      
      if (storedSessionId) {
        console.log('Attempting to restore session:', storedSessionId);
        try {
          // Try to restore the session
          const response = await fetch('/api/upload', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ init: true, restoreSessionId: storedSessionId }),
          });
          const data = await response.json();
          if (data.success && data.sessionId) {
            setSessionId(data.sessionId);
            console.log('Session restored:', data.sessionId);
            return;
          }
        } catch (err) {
          console.error('Failed to restore session:', err);
        }
      }
      
      // Create new session
      try {
        const response = await fetch('/api/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ init: true }),
        });
        const data = await response.json();
        if (data.success && data.sessionId) {
          setSessionId(data.sessionId);
          // Store in sessionStorage to survive hot reloads
          if (typeof window !== 'undefined') {
            sessionStorage.setItem('vyapar-session-id', data.sessionId);
          }
          console.log('New session created:', data.sessionId);
        } else {
          console.error('Session initialization failed:', data);
        }
      } catch (err) {
        console.error('Failed to initialize session:', err);
      }
    };
    initSession();
  }, []);

  // Load language preference from localStorage on mount
  useEffect(() => {
    const savedLang = localStorage.getItem('vyapar-lang') as Language;
    if (savedLang && ['en', 'hi', 'mr'].includes(savedLang)) {
      setLanguage(savedLang);
    }
  }, []);

  const handleLanguageChange = (lang: Language) => {
    setLanguage(lang);
    localStorage.setItem('vyapar-lang', lang);
  };

  const handleUploadComplete = (newSessionId: string, fileType: FileType) => {
    // Only update sessionId if we don't have one yet
    if (!sessionId) {
      setSessionId(newSessionId);
      // Store in sessionStorage
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('vyapar-session-id', newSessionId);
      }
    }
    setUploadedFiles((prev) => new Set(prev).add(fileType));
    setError(null);
  };

  const handleDailyEntrySubmitted = () => {
    // Refresh health score or other data if needed
    console.log('Daily entry submitted');
  };

  const handleCreditChange = () => {
    // Refresh health score when credit changes
    console.log('Credit changed');
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
    } catch (err) {
      setError(t('analysisFailed', language));
    } finally {
      setAnalyzing(false);
    }
  };

  const handleLoadSampleData = async () => {
    const { sampleSalesData, sampleExpensesData, sampleInventoryData, createSampleFile } =
      await import('@/lib/sample-data');

    // Create sample files
    const salesFile = createSampleFile(sampleSalesData, 'sample-sales.csv');
    const expensesFile = createSampleFile(sampleExpensesData, 'sample-expenses.csv');
    const inventoryFile = createSampleFile(sampleInventoryData, 'sample-inventory.csv');

    // Upload each file
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
      } catch (err) {
        console.error('Sample data upload failed:', err);
      }
    }
  };

  const hasUploadedData = uploadedFiles.size > 0;

  // Handler for Receipt OCR data extraction
  const handleReceiptDataExtracted = (data: { date: string; amount: number; items: string[]; vendor: string }) => {
    console.log('Receipt data extracted:', data);
    
    // Auto-fill the expense field with receipt amount
    // Note: This is a simple implementation - you can enhance it to:
    // 1. Pre-fill the daily entry form
    // 2. Add to a list of expenses for the day
    // 3. Store vendor and items for reference
    
    // For now, show a confirmation and let user manually enter
    const itemsList = data.items.join(', ');
    const message = language === 'hi' 
      ? `रसीद प्रोसेस हो गई!\n\nतारीख: ${data.date}\nराशि: ₹${data.amount}\nदुकान: ${data.vendor}\nवस्तुएं: ${itemsList}\n\nकृपया इस राशि को अपने दैनिक खर्च में जोड़ें।`
      : language === 'mr'
      ? `पावती प्रक्रिया झाली!\n\nतारीख: ${data.date}\nरक्कम: ₹${data.amount}\nदुकान: ${data.vendor}\nवस्तू: ${itemsList}\n\nकृपया ही रक्कम तुमच्या दैनिक खर्चात जोडा।`
      : `Receipt processed!\n\nDate: ${data.date}\nAmount: ₹${data.amount}\nVendor: ${data.vendor}\nItems: ${itemsList}\n\nPlease add this amount to your daily expenses.`;
    
    alert(message);
    
    // TODO: Implement auto-fill functionality
    // You could:
    // 1. Store extracted data in state
    // 2. Pass it to DailyEntryForm as initialExpense prop
    // 3. Or create a separate "Receipt Expenses" section
  };

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
        {/* Header */}
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                  {t('appTitle', language)}
                </h1>
                <p className="text-sm text-gray-600 mt-1">
                  {t('appSubtitle', language)}
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center">
                <LanguageSelector
                  currentLanguage={language}
                  onLanguageChange={handleLanguageChange}
                />
                <SyncStatus language={language} />
              </div>
            </div>
            {/* User Profile */}
            <div className="mt-4">
              <UserProfile language={language} />
            </div>
          </div>
        </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        {/* 1. Trust Banner (Always Visible) */}
        <TrustBanner language={language} />

        {/* 2. Receipt OCR (NEW FEATURE) */}
        <ReceiptOCR
          language={language}
          onDataExtracted={handleReceiptDataExtracted}
        />

        {/* 3. Daily Entry Form (PRIMARY) */}
        {sessionId && (
          <DailyEntryForm
            sessionId={sessionId}
            language={language}
            onEntrySubmitted={handleDailyEntrySubmitted}
          />
        )}

        {/* 4. Health Score Display (if available) */}
        {healthScore !== null && healthBreakdown && (
          <HealthScoreDisplay
            score={healthScore}
            breakdown={healthBreakdown}
            language={language}
            sessionId={sessionId || undefined}
          />
        )}

        {/* 5. Credit Tracking */}
        {user && (
          <CreditTracking
            userId={user.userId}
            language={language}
            onCreditChange={handleCreditChange}
          />
        )}

        {/* 6. Advanced Analysis Section (Collapsible) */}
        <section className="mb-8">
          <button
            onClick={() => setAdvancedModeExpanded(!advancedModeExpanded)}
            className="w-full bg-white rounded-lg shadow-md p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold text-gray-800">
                {t('advancedMode', language)}
              </span>
              <span className="text-sm text-gray-500">
                ({uploadedFiles.size} {language === 'hi' ? 'फ़ाइलें' : language === 'mr' ? 'फाइल्स' : 'files'})
              </span>
            </div>
            {advancedModeExpanded ? (
              <ChevronUp className="w-6 h-6 text-gray-600" />
            ) : (
              <ChevronDown className="w-6 h-6 text-gray-600" />
            )}
          </button>

          {advancedModeExpanded && (
            <div className="mt-4 space-y-6">
              {/* Upload Section */}
              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-gray-800">
                    {t('uploadCSV', language)}
                  </h3>
                  <button
                    onClick={handleLoadSampleData}
                    className="px-4 py-2 bg-purple-500 text-white rounded-lg text-sm font-medium hover:bg-purple-600 transition-colors"
                  >
                    {language === 'hi'
                      ? '🎯 नमूना डेटा आज़माएं'
                      : language === 'mr'
                      ? '🎯 नमुना डेटा वापरा'
                      : '🎯 Try Sample Data'}
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

              {/* Analyze Button */}
              {hasUploadedData && (
                <button
                  onClick={handleAnalyze}
                  disabled={analyzing}
                  className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white py-4 px-6 rounded-lg font-bold text-lg hover:from-blue-600 hover:to-indigo-700 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl min-h-[56px]"
                >
                  {analyzing ? t('analyzing', language) : t('analyzeButton', language)}
                </button>
              )}

              {/* Error Display */}
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                  {error}
                </div>
              )}

              {/* 6. AI Insights Section (After CSV Analysis) */}
              {insights && (
                <div className="space-y-6">
                  {/* Share and Export Buttons */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <ShareWhatsApp insights={insights} language={language} />
                    <ExportPDF insights={insights} language={language} />
                  </div>

                  {/* Alerts */}
                  {insights.alerts && insights.alerts.length > 0 && (
                    <Alerts alerts={insights.alerts} language={language} />
                  )}

                  {/* Recommendations */}
                  {insights.recommendations && insights.recommendations.length > 0 && (
                    <Recommendations
                      recommendations={insights.recommendations}
                      language={language}
                    />
                  )}

                  {/* Charts */}
                  {insights.chartData && (
                    <Charts chartData={insights.chartData} language={language} />
                  )}

                  {/* Benchmark */}
                  {benchmark && <Benchmark benchmark={benchmark} language={language} />}

                  {/* Original Insights */}
                  <InsightsDisplay insights={insights} language={language} />
                </div>
              )}
            </div>
          )}
        </section>

        {/* 7. Q&A Section (Bottom) */}
        {sessionId && (
          <section>
            <QAChat sessionId={sessionId} language={language} />
          </section>
        )}

        {/* Welcome Message (Only if no session) */}
        {!sessionId && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📊</div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">
              {language === 'hi'
                ? 'स्वागत है!'
                : language === 'mr'
                ? 'स्वागत आहे!'
                : 'Welcome!'}
            </h2>
            <p className="text-gray-600 max-w-md mx-auto">
              {language === 'hi'
                ? 'अपने दैनिक व्यापार की प्रविष्टि से शुरू करें या उन्नत विश्लेषण के लिए CSV फ़ाइलें अपलोड करें'
                : language === 'mr'
                ? 'तुमच्या दैनिक व्यवसायाची नोंद सुरू करा किंवा प्रगत विश्लेषणासाठी CSV फाइल्स अपलोड करा'
                : 'Start with your daily business entry or upload CSV files for advanced analysis'}
            </p>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-12">
        <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          <p className="text-center text-sm text-gray-500">
            {language === 'hi'
              ? 'आपका डेटा सुरक्षित है - हाइब्रिड सिंक के साथ ऑफलाइन और ऑनलाइन दोनों में काम करता है'
              : language === 'mr'
              ? 'तुमचा डेटा सुरक्षित आहे - हायब्रिड सिंकसह ऑफलाइन आणि ऑनलाइन दोन्हीमध्ये काम करते'
              : 'Your data is secure - works offline and online with hybrid sync'}
          </p>
        </div>
      </footer>
      </div>
    </AuthGuard>
  );
}
