'use client';

import { useState } from 'react';
import { Language } from '@/lib/types';
import { t } from '@/lib/translations';
import { logger } from '@/lib/logger';

interface AccountDeletionProps {
  language: Language;
  deletionScheduledAt?: string;
  onDeletionRequested: () => void;
  onDeletionCancelled: () => void;
}

export default function AccountDeletion({
  language,
  deletionScheduledAt,
  onDeletionRequested,
  onDeletionCancelled,
}: AccountDeletionProps) {
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string>('');

  const handleRequestDeletion = async () => {
    if (confirmText !== 'DELETE') {
      setError(t('deletion.confirm', language));
      return;
    }

    setIsProcessing(true);
    setError('');

    try {
      const response = await fetch('/api/profile/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const result = await response.json();

      if (result.success) {
        setShowConfirmation(false);
        setConfirmText('');
        onDeletionRequested();
      } else {
        setError(result.error || t('error.profileUpdateFailed', language));
      }
    } catch (err) {
      logger.error('[AccountDeletion] Error requesting deletion', { error: err });
      setError(t('networkError', language));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancelDeletion = async () => {
    setIsProcessing(true);
    setError('');

    try {
      const response = await fetch('/api/profile/cancel-deletion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const result = await response.json();

      if (result.success) {
        onDeletionCancelled();
      } else {
        setError(result.error || t('error.profileUpdateFailed', language));
      }
    } catch (err) {
      logger.error('[AccountDeletion] Error cancelling deletion', { error: err });
      setError(t('networkError', language));
    } finally {
      setIsProcessing(false);
    }
  };

  const getDaysRemaining = () => {
    if (!deletionScheduledAt) return 0;
    const scheduledDate = new Date(deletionScheduledAt);
    const now = new Date();
    const diffTime = scheduledDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  };

  // If deletion is already scheduled, show grace period UI
  if (deletionScheduledAt) {
    const daysRemaining = getDaysRemaining();
    const scheduledDate = new Date(deletionScheduledAt).toLocaleDateString(
      language === 'hi' ? 'hi-IN' : language === 'mr' ? 'mr-IN' : 'en-IN'
    );

    return (
      <div className="bg-white rounded-lg shadow-xl p-8 max-w-2xl mx-auto">
        <div className="text-center mb-6">
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-yellow-100 mb-4">
            <svg className="h-8 w-8 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {t('deletion.title', language)}
          </h2>
          <p className="text-gray-600">
            {t('deletion.scheduledFor', language)}
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-6 mb-6">
          <div className="text-center">
            <p className="text-3xl font-bold text-yellow-800 mb-2">{daysRemaining}</p>
            <p className="text-sm text-yellow-700 mb-4">
              {language === 'hi' 
                ? 'दिन शेष'
                : language === 'mr'
                ? 'दिवस शिल्लक'
                : 'days remaining'}
            </p>
            <p className="text-sm text-gray-700">
              {scheduledDate}
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <p className="text-sm text-gray-600 text-center">
            {language === 'hi'
              ? 'आपका खाता और सभी डेटा स्थायी रूप से हटा दिया जाएगा। आप इस अवधि के भीतर रद्द कर सकते हैं।'
              : language === 'mr'
              ? 'तुमचे खाते आणि सर्व डेटा कायमचा हटवला जाईल. तुम्ही या कालावधीत रद्द करू शकता.'
              : 'Your account and all data will be permanently deleted. You can cancel within this period.'}
          </p>

          <button
            onClick={handleCancelDeletion}
            disabled={isProcessing}
            className="w-full px-6 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {isProcessing
              ? (language === 'hi' ? 'रद्द हो रहा है...' : language === 'mr' ? 'रद्द होत आहे...' : 'Cancelling...')
              : t('deletion.cancel', language)
            }
          </button>
        </div>
      </div>
    );
  }

  // Show confirmation dialog if user clicked delete
  if (showConfirmation) {
    return (
      <div className="bg-white rounded-lg shadow-xl p-8 max-w-2xl mx-auto">
        <div className="text-center mb-6">
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-4">
            <svg className="h-8 w-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {t('deletion.title', language)}
          </h2>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        <div className="bg-red-50 border-2 border-red-200 rounded-lg p-6 mb-6">
          <p className="text-sm text-red-800 mb-4">
            {t('deletion.warning', language)}
          </p>
          <ul className="text-sm text-red-700 space-y-2 list-disc list-inside">
            <li>
              {language === 'hi'
                ? 'सभी दैनिक प्रविष्टियाँ और व्यापार डेटा'
                : language === 'mr'
                ? 'सर्व दैनिक नोंदी आणि व्यवसाय डेटा'
                : 'All daily entries and business data'}
            </li>
            <li>
              {language === 'hi'
                ? 'सभी उधार रिकॉर्ड'
                : language === 'mr'
                ? 'सर्व उधार रेकॉर्ड'
                : 'All credit records'}
            </li>
            <li>
              {language === 'hi'
                ? 'सभी रिपोर्ट और विश्लेषण'
                : language === 'mr'
                ? 'सर्व अहवाल आणि विश्लेषण'
                : 'All reports and analysis'}
            </li>
            <li>
              {language === 'hi'
                ? 'प्रोफ़ाइल और सेटिंग्स'
                : language === 'mr'
                ? 'प्रोफाइल आणि सेटिंग्ज'
                : 'Profile and settings'}
            </li>
          </ul>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('deletion.confirm', language)}
          </label>
          <input
            type="text"
            value={confirmText}
            onChange={(e) => {
              setConfirmText(e.target.value);
              setError('');
            }}
            placeholder="DELETE"
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500 focus:border-transparent"
          />
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => {
              setShowConfirmation(false);
              setConfirmText('');
              setError('');
            }}
            disabled={isProcessing}
            className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {t('cancel', language)}
          </button>
          <button
            onClick={handleRequestDeletion}
            disabled={isProcessing || confirmText !== 'DELETE'}
            className="flex-1 px-6 py-3 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {isProcessing
              ? (language === 'hi' ? 'हटा रहा है...' : language === 'mr' ? 'हटवत आहे...' : 'Deleting...')
              : t('deletion.confirmButton', language)
            }
          </button>
        </div>
      </div>
    );
  }

  // Initial state - show delete button
  return (
    <div className="bg-white rounded-lg shadow-xl p-8 max-w-2xl mx-auto">
      <h2 className="text-xl font-semibold text-gray-800 mb-4">
        {t('settings.deleteAccount', language)}
      </h2>
      
      <p className="text-sm text-gray-600 mb-6">
        {language === 'hi'
          ? 'खाता हटाने से आपका सभी डेटा 30 दिनों के बाद स्थायी रूप से हटा दिया जाएगा। आप इस अवधि के भीतर रद्द कर सकते हैं।'
          : language === 'mr'
          ? 'खाते हटवल्याने तुमचा सर्व डेटा 30 दिवसांनंतर कायमचा हटवला जाईल. तुम्ही या कालावधीत रद्द करू शकता.'
          : 'Deleting your account will permanently remove all your data after 30 days. You can cancel within this period.'}
      </p>

      <button
        onClick={() => setShowConfirmation(true)}
        className="w-full px-6 py-3 bg-red-600 text-white rounded-md hover:bg-red-700 font-medium"
      >
        {t('settings.deleteAccount', language)}
      </button>
    </div>
  );
}
