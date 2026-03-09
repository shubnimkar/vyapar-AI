'use client';

import { useState, useEffect } from 'react';
import { Language, CreditSummary } from '@/lib/types';
import { t } from '@/lib/translations';
import { CreditCard, Plus, Check, Trash2, AlertCircle } from 'lucide-react';
import { 
  getLocalEntries, 
  createCreditEntry, 
  updateCreditEntry, 
  deleteLocalEntry,
  fullSync,
  LocalCreditEntry
} from '@/lib/credit-sync';
import { calculateCreditSummary } from '@/lib/calculations';
import { logger } from '@/lib/logger';

interface CreditTrackingProps {
  userId: string;
  language: Language;
  onCreditChange?: () => void;
}

export default function CreditTracking({ userId, language, onCreditChange }: CreditTrackingProps) {
  const [entries, setEntries] = useState<LocalCreditEntry[]>([]);
  const [summary, setSummary] = useState<CreditSummary>({
    totalOutstanding: 0,
    totalOverdue: 0,
    overdueCount: 0,
  });
  const [showForm, setShowForm] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');

  useEffect(() => {
    loadEntries();
    checkAndSync();
  }, [userId]);

  const loadEntries = () => {
    const localEntries = getLocalEntries();
    setEntries(localEntries);
    
    const calculatedSummary = calculateCreditSummary(localEntries);
    setSummary(calculatedSummary);
  };

  const checkAndSync = async () => {
    if (!userId) return;
    
    try {
      await fullSync(userId);
      loadEntries();
    } catch (error) {
      logger.error('[CreditTracking] Auto-sync failed', { error });
    }
  };

  const handleAddEntry = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!userId) {
      alert('Please log in to add credit entries');
      return;
    }

    // Validate phone number format if provided (10 digits, numeric only)
    if (phoneNumber && (phoneNumber.length !== 10 || !/^\d{10}$/.test(phoneNumber))) {
      alert(t('error.invalidPhoneNumber', language));
      return;
    }

    // Generate ID on client side to prevent duplicates
    const entryId = `credit_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    const today = new Date().toISOString().split('T')[0];
    const now = new Date().toISOString();

    try {
      // Try to sync to cloud first
      const response = await fetch('/api/credit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          id: entryId, // Send the client-generated ID
          customerName,
          amount: parseFloat(amount),
          dueDate,
          dateGiven: today,
          phoneNumber: phoneNumber || undefined,
          createdAt: now,
          updatedAt: now,
        }),
      });

      const data = await response.json();
      
      if (data.success && data.data) {
        // API call succeeded - save the returned entry to localStorage as synced
        const { saveLocalEntry } = await import('@/lib/credit-sync');
        const localEntry = {
          ...data.data,
          syncStatus: 'synced' as const,
          lastSyncAttempt: new Date().toISOString(),
        };
        saveLocalEntry(localEntry);
        logger.info('[CreditTracking] Entry synced to cloud');
      } else {
        throw new Error(data.error || 'Failed to sync');
      }
    } catch (error) {
      logger.error('[CreditTracking] Failed to sync, saving offline', { error });
      // API call failed - save to localStorage as pending with the SAME ID
      createCreditEntry(customerName, parseFloat(amount), dueDate, today, phoneNumber || undefined, false);
    }

    // Reload entries and reset form
    loadEntries();
    setCustomerName('');
    setAmount('');
    setDueDate('');
    setPhoneNumber('');
    setShowForm(false);
    if (onCreditChange) onCreditChange();
  };

  const handleMarkPaid = async (id: string) => {
    if (!userId) return;

    try {
      // Find the entry
      const entry = entries.find(e => e.id === id);
      if (!entry) return;

      // Try to sync to cloud first
      const response = await fetch('/api/credit', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          id,
          isPaid: true,
          paidDate: new Date().toISOString(),
        }),
      });

      const data = await response.json();
      
      if (data.success && data.data) {
        // API call succeeded - save the returned entry to localStorage as synced
        const { saveLocalEntry } = await import('@/lib/credit-sync');
        const localEntry = {
          ...data.data,
          syncStatus: 'synced' as const,
          lastSyncAttempt: new Date().toISOString(),
          paidAt: data.data.paidDate, // Alias for backward compatibility
        };
        saveLocalEntry(localEntry);
        logger.info('[CreditTracking] Entry marked paid and synced');
      } else {
        throw new Error(data.error || 'Failed to sync');
      }
    } catch (error) {
      logger.error('[CreditTracking] Failed to sync, saving offline', { error });
      // API call failed - update localStorage as pending
      updateCreditEntry(id, { isPaid: true, paidAt: new Date().toISOString() }, false);
    }

    // Reload entries
    loadEntries();
    if (onCreditChange) onCreditChange();
  };

  const handleDelete = async (id: string) => {
    if (!userId) return;

    if (!confirm(t('confirmDelete', language))) {
      return;
    }

    try {
      // Try to delete from cloud first
      const response = await fetch(`/api/credit?userId=${userId}&id=${id}`, {
        method: 'DELETE',
      });

      const data = await response.json();
      
      if (data.success) {
        logger.info('[CreditTracking] Entry deleted from cloud');
      } else {
        throw new Error(data.error || 'Failed to delete');
      }
    } catch (error) {
      logger.error('[CreditTracking] Failed to delete from cloud', { error });
    }

    // Delete from localStorage regardless
    deleteLocalEntry(id);
    
    // Reload entries
    loadEntries();
    if (onCreditChange) onCreditChange();
  };

  const isOverdue = (dueDate: string) => {
    return new Date(dueDate) < new Date();
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <CreditCard className="w-6 h-6 text-purple-600" />
          {t('creditTracking', language)}
        </h2>
        <div className="flex gap-2">
          <button
            onClick={async () => {
              try {
                // Force clear and re-pull
                console.log('[Force Sync] Clearing localStorage...');
                localStorage.removeItem('vyapar-credit-entries');
                localStorage.removeItem('vyapar-credit-sync-status');
                
                console.log('[Force Sync] Fetching from API...');
                const response = await fetch(`/api/credit?userId=${userId}`);
                
                // Get raw text first
                const rawText = await response.text();
                console.log('[Force Sync] Raw response (first 500 chars):', rawText.substring(0, 500));
                
                // Parse JSON
                const result = JSON.parse(rawText);
                
                console.log('[Force Sync] Parsed result:', {
                  success: result.success,
                  count: result.count,
                  dataType: typeof result.data,
                  dataIsArray: Array.isArray(result.data),
                  dataLength: result.data?.length,
                  dataKeys: result.data ? Object.keys(result.data).slice(0, 5) : []
                });
                
                if (result.success && result.data && Array.isArray(result.data)) {
                  // Directly save to localStorage
                  const entries = result.data.map((entry: any) => ({
                    ...entry,
                    syncStatus: 'synced',
                    paidAt: entry.paidDate
                  }));
                  
                  localStorage.setItem('vyapar-credit-entries', JSON.stringify(entries));
                  console.log('[Force Sync] Saved', entries.length, 'entries to localStorage');
                  
                  loadEntries();
                  alert(`Force sync complete! Loaded ${entries.length} entries.`);
                } else {
                  console.error('[Force Sync] Invalid data:', result);
                  alert('Force sync failed: Invalid data format');
                }
              } catch (error) {
                console.error('[Force Sync] Error:', error);
                alert('Force sync failed: ' + (error as Error).message);
              }
            }}
            className="text-sm bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg"
          >
            🔄 Force Pull
          </button>
          <button
            onClick={async () => {
              try {
                await fullSync(userId);
                loadEntries();
                alert('Sync complete!');
              } catch (error) {
                alert('Sync failed: ' + (error as Error).message);
              }
            }}
            className="text-sm bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
          >
            🔄 Sync
          </button>
          <button
            onClick={() => setShowForm(!showForm)}
            className="text-sm bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg flex items-center gap-1"
          >
            <Plus className="w-4 h-4" />
            {t('addCredit', language)}
          </button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
          <p className="text-xs text-gray-600 mb-1">{t('totalOutstanding', language)}</p>
          <p className="text-xl font-bold text-purple-700">
            ₹{summary.totalOutstanding.toLocaleString('en-IN')}
          </p>
        </div>

        <div className="bg-red-50 p-4 rounded-lg border border-red-200">
          <p className="text-xs text-gray-600 mb-1">{t('totalOverdue', language)}</p>
          <p className="text-xl font-bold text-red-700">
            ₹{summary.totalOverdue.toLocaleString('en-IN')}
          </p>
        </div>

        <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
          <p className="text-xs text-gray-600 mb-1">{t('overdueCustomers', language)}</p>
          <p className="text-xl font-bold text-orange-700">{summary.overdueCount}</p>
        </div>
      </div>

      {/* Add Form */}
      {showForm && (
        <form onSubmit={handleAddEntry} className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('customerName', language)}
              </label>
              <input
                type="text"
                required
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                placeholder={t('enterName', language)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('amount', language)} (₹)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                placeholder="5000"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('dueDate', language)}
              </label>
              <input
                type="date"
                required
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('phoneNumber', language)} ({t('optional', language)})
              </label>
              <input
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                placeholder="9876543210"
                maxLength={10}
                pattern="[0-9]{10}"
              />
              <p className="text-xs text-gray-500 mt-1">
                {language === 'hi' 
                  ? '10 अंकों का मोबाइल नंबर (WhatsApp रिमाइंडर के लिए)'
                  : language === 'mr'
                  ? '10 अंकांचा मोबाइल नंबर (WhatsApp रिमाइंडरसाठी)'
                  : '10-digit mobile number (for WhatsApp reminders)'}
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg"
            >
              {t('save', language)}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="bg-gray-300 hover:bg-gray-400 text-gray-700 px-4 py-2 rounded-lg"
            >
              {t('cancel', language)}
            </button>
          </div>
        </form>
      )}

      {/* Entries List */}
      <div className="space-y-3">
        {entries.length === 0 ? (
          <p className="text-center text-gray-500 py-8">{t('noCreditEntries', language)}</p>
        ) : (
          entries.map((entry) => (
            <div
              key={entry.id}
              className={`p-4 rounded-lg border ${
                entry.isPaid
                  ? 'bg-gray-50 border-gray-200 opacity-60'
                  : isOverdue(entry.dueDate)
                  ? 'bg-red-50 border-red-300'
                  : 'bg-white border-gray-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-gray-800">{entry.customerName}</p>
                    {!entry.isPaid && isOverdue(entry.dueDate) && (
                      <AlertCircle className="w-4 h-4 text-red-500" />
                    )}
                    {entry.isPaid && (
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                        {t('paid', language)}
                      </span>
                    )}
                    {entry.syncStatus === 'pending' && (
                      <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded">
                        {t('pending', language)}
                      </span>
                    )}
                    {entry.syncStatus === 'error' && (
                      <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded">
                        {t('error', language)}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600">
                    {t('due', language)}: {new Date(entry.dueDate).toLocaleDateString()}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <p className="text-lg font-bold text-gray-800">
                    ₹{entry.amount.toLocaleString('en-IN')}
                  </p>

                  {!entry.isPaid && (
                    <button
                      onClick={() => handleMarkPaid(entry.id)}
                      className="text-green-600 hover:text-green-700 p-2"
                      title={t('markPaid', language)}
                    >
                      <Check className="w-5 h-5" />
                    </button>
                  )}

                  <button
                    onClick={() => handleDelete(entry.id)}
                    className="text-red-600 hover:text-red-700 p-2"
                    title={t('delete', language)}
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
