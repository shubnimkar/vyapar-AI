'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Language, InferredTransaction } from '@/lib/types';
import PendingTransactionConfirmation from '@/components/PendingTransactionConfirmation';
import CSVUpload from '@/components/CSVUpload';
import Toast, { ToastType } from '@/components/Toast';
import { usePendingTransactionCount } from '@/lib/hooks/usePendingTransactionCount';
import { addTransactionToDailyEntry } from '@/lib/add-transaction-to-entry';
import { SessionManager } from '@/lib/session-manager';
import { logger } from '@/lib/logger';
import { ArrowLeft, FileText, Receipt } from 'lucide-react';

/**
 * Pending Transactions Page
 * 
 * Displays pending inferred transactions from receipt OCR or CSV uploads
 * for user review and confirmation. Provides both the confirmation UI
 * and CSV upload component.
 * 
 * Features:
 * - Display PendingTransactionConfirmation component
 * - Display CSVUpload component
 * - Show pending transaction count and summary
 * - Link back to main dashboard
 * - Multi-language support (en, hi, mr)
 * 
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 14.1, 14.2
 */
export default function PendingTransactionsPage() {
  const router = useRouter();
  const [language, setLanguage] = useState<Language>('en');
  const [user, setUser] = useState<{ userId: string; username: string } | null>(null);
  const pendingCount = usePendingTransactionCount();
  
  // Toast notification state
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

  useEffect(() => {
    // Get current user
    const currentUser = SessionManager.getCurrentUser();
    if (currentUser) {
      setUser(currentUser);
    }

    // Get language preference from localStorage
    const storedLanguage = localStorage.getItem('language') as Language;
    if (storedLanguage && ['en', 'hi', 'mr'].includes(storedLanguage)) {
      setLanguage(storedLanguage);
    }
  }, []);

  const translations = {
    en: {
      title: 'Pending Transactions',
      subtitle: 'Review and confirm transactions from receipts and CSV uploads',
      backToDashboard: 'Back to Dashboard',
      pendingCount: 'pending transaction',
      pendingCountPlural: 'pending transactions',
      reviewSection: 'Review Transactions',
      uploadSection: 'Upload New Data',
      noTransactions: 'No pending transactions',
      noTransactionsDesc: 'Upload a receipt or CSV file to get started',
    },
    hi: {
      title: 'लंबित लेनदेन',
      subtitle: 'रसीद और CSV अपलोड से लेनदेन की समीक्षा और पुष्टि करें',
      backToDashboard: 'डैशबोर्ड पर वापस जाएं',
      pendingCount: 'लंबित लेनदेन',
      pendingCountPlural: 'लंबित लेनदेन',
      reviewSection: 'लेनदेन की समीक्षा करें',
      uploadSection: 'नया डेटा अपलोड करें',
      noTransactions: 'कोई लंबित लेनदेन नहीं',
      noTransactionsDesc: 'शुरू करने के लिए रसीद या CSV फ़ाइल अपलोड करें',
    },
    mr: {
      title: 'प्रलंबित व्यवहार',
      subtitle: 'पावती आणि CSV अपलोडमधून व्यवहारांचे पुनरावलोकन आणि पुष्टी करा',
      backToDashboard: 'डॅशबोर्डवर परत जा',
      pendingCount: 'प्रलंबित व्यवहार',
      pendingCountPlural: 'प्रलंबित व्यवहार',
      reviewSection: 'व्यवहारांचे पुनरावलोकन करा',
      uploadSection: 'नवीन डेटा अपलोड करा',
      noTransactions: 'कोणतेही प्रलंबित व्यवहार नाहीत',
      noTransactionsDesc: 'सुरू करण्यासाठी पावती किंवा CSV फाइल अपलोड करा',
    },
  };

  const t = translations[language];

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

  const handleLaterTransaction = (transaction: InferredTransaction) => {
    logger.info('Transaction deferred', { transactionId: transaction.id });
  };

  const handleDiscardTransaction = (transaction: InferredTransaction) => {
    logger.info('Transaction discarded', { transactionId: transaction.id });
  };

  const handleUploadSuccess = (summary: {
    totalRows: number;
    validRows: number;
    invalidRows: number;
  }) => {
    logger.info('CSV upload successful', summary);
  };

  const handleUploadError = (error: string) => {
    logger.error('CSV upload failed', { error });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Toast notification */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
      
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/')}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
                <span className="text-sm font-medium">{t.backToDashboard}</span>
              </button>
            </div>
            
            {/* Language selector */}
            <div className="flex items-center gap-2">
              <select
                value={language}
                onChange={(e) => {
                  const newLang = e.target.value as Language;
                  setLanguage(newLang);
                  localStorage.setItem('language', newLang);
                }}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="en">English</option>
                <option value="hi">हिंदी</option>
                <option value="mr">मराठी</option>
              </select>
            </div>
          </div>

          <div className="mt-4">
            <h1 className="text-3xl font-bold text-gray-900">{t.title}</h1>
            <p className="text-gray-600 mt-1">{t.subtitle}</p>
            
            {/* Pending count summary */}
            {pendingCount.total > 0 && (
              <div className="mt-4 flex items-center gap-4">
                <div className="flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-lg">
                  <FileText className="w-5 h-5" />
                  <span className="font-semibold">{pendingCount.total}</span>
                  <span className="text-sm">
                    {pendingCount.total === 1 ? t.pendingCount : t.pendingCountPlural}
                  </span>
                </div>
                
                {pendingCount.deferred > 0 && (
                  <div className="text-sm text-gray-600">
                    ({pendingCount.deferred} deferred)
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left column - Review transactions (2/3 width) */}
          <div className="lg:col-span-2 space-y-6">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Receipt className="w-5 h-5 text-gray-700" />
                <h2 className="text-xl font-semibold text-gray-900">{t.reviewSection}</h2>
              </div>
              
              <PendingTransactionConfirmation
                language={language}
                onAdd={handleAddTransaction}
                onLater={handleLaterTransaction}
                onDiscard={handleDiscardTransaction}
              />
            </div>
          </div>

          {/* Right column - Upload section (1/3 width) */}
          <div className="space-y-6">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <FileText className="w-5 h-5 text-gray-700" />
                <h2 className="text-xl font-semibold text-gray-900">{t.uploadSection}</h2>
              </div>
              
              <CSVUpload
                language={language}
                onUploadSuccess={handleUploadSuccess}
                onUploadError={handleUploadError}
              />
            </div>

            {/* Info card */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 mb-2">
                {language === 'hi' ? 'सुझाव' : language === 'mr' ? 'टीप' : 'Tip'}
              </h3>
              <p className="text-sm text-blue-700">
                {language === 'hi'
                  ? 'आप रसीद की तस्वीरें या CSV फ़ाइलें अपलोड कर सकते हैं। सिस्टम स्वचालित रूप से लेनदेन विवरण निकालेगा।'
                  : language === 'mr'
                  ? 'तुम्ही पावतीचे फोटो किंवा CSV फाइल्स अपलोड करू शकता. सिस्टम आपोआप व्यवहार तपशील काढेल.'
                  : 'You can upload receipt photos or CSV files. The system will automatically extract transaction details.'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
