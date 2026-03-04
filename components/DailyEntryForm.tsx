'use client';

import { useState, useEffect } from 'react';
import { Language } from '@/lib/types';
import { t } from '@/lib/translations';
import { SessionManager } from '@/lib/session-manager';
import {
  getLocalEntries,
  createDailyEntry,
  updateDailyEntry,
  deleteLocalEntry,
  LocalDailyEntry,
  getSyncStatus,
  fullSync,
} from '@/lib/daily-entry-sync';
import { TrendingUp, TrendingDown, Calendar, History, Plus, Edit2, Trash2, Cloud, CloudOff, RefreshCw, X } from 'lucide-react';
import { logger } from '@/lib/logger';

interface DailyEntryFormProps {
  language: Language;
  onEntrySubmitted?: () => void;
}

type ViewMode = 'form' | 'history' | 'calendar';

export default function DailyEntryForm({ language, onEntrySubmitted }: DailyEntryFormProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('form');
  const [entries, setEntries] = useState<LocalDailyEntry[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  
  // Form state
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [totalSales, setTotalSales] = useState('');
  const [totalExpense, setTotalExpense] = useState('');
  const [cashInHand, setCashInHand] = useState('');
  const [notes, setNotes] = useState('');
  
  // UI state
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  useEffect(() => {
    loadEntries();
    checkAndSync();
  }, []);

  const loadEntries = () => {
    const localEntries = getLocalEntries();
    setEntries(localEntries);
  };

  const checkAndSync = async () => {
    const user = SessionManager.getCurrentUser();
    if (!user) return;

    try {
      setSyncing(true);
      await fullSync(user.userId);
      loadEntries();
    } catch (error) {
      logger.error('[DailyEntry] Auto-sync failed', { error });
    } finally {
      setSyncing(false);
    }
  };

  const handleSync = async () => {
    const user = SessionManager.getCurrentUser();
    if (!user) {
      setError(t('sessionExpired', language));
      return;
    }

    try {
      setSyncing(true);
      setError('');
      await fullSync(user.userId);
      loadEntries();
      setSuccess(t('daily.syncSuccess', language));
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      logger.error('[DailyEntry] Sync failed', { error });
      setError(t('daily.syncError', language));
    } finally {
      setSyncing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    const user = SessionManager.getCurrentUser();
    if (!user) {
      setError(t('sessionExpired', language));
      setLoading(false);
      return;
    }

    try {
      const salesValue = parseFloat(totalSales);
      const expenseValue = parseFloat(totalExpense);
      const cashValue = cashInHand ? parseFloat(cashInHand) : undefined;

      if (isNaN(salesValue) || isNaN(expenseValue)) {
        setError(t('analysisFailed', language));
        setLoading(false);
        return;
      }

      // Try to sync instantly to DynamoDB
      try {
        const response = await fetch('/api/daily', {
          method: isEditing ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user.userId,
            date,
            totalSales: salesValue,
            totalExpense: expenseValue,
            cashInHand: cashValue,
            notes: notes || undefined,
          }),
        });

        const result = await response.json();

        if (result.success) {
          // Instant sync succeeded - save to localStorage as synced
          if (isEditing) {
            updateDailyEntry(date, {
              totalSales: salesValue,
              totalExpense: expenseValue,
              cashInHand: cashValue,
              notes: notes || undefined,
            }, true); // Mark as synced
          } else {
            createDailyEntry(date, salesValue, expenseValue, cashValue, notes || undefined, true); // Mark as synced
          }
          
          setSuccess(isEditing ? t('success.profileUpdated', language) : t('daily.syncSuccess', language));
        } else {
          throw new Error(result.error);
        }
      } catch (apiError) {
        // API failed - save offline with pending status
        logger.warn('[DailyEntry] API failed, saving offline', { error: apiError });
        
        if (isEditing) {
          updateDailyEntry(date, {
            totalSales: salesValue,
            totalExpense: expenseValue,
            cashInHand: cashValue,
            notes: notes || undefined,
          }, false); // Mark as pending
        } else {
          createDailyEntry(date, salesValue, expenseValue, cashValue, notes || undefined, false); // Mark as pending
        }
        
        setSuccess(t('daily.offlineMode', language));
      }

      // Reset form
      if (!isEditing) {
        setTotalSales('');
        setTotalExpense('');
        setCashInHand('');
        setNotes('');
        setDate(new Date().toISOString().split('T')[0]);
      }
      
      setIsEditing(false);
      setSelectedEntry(null);
      loadEntries();
      
      if (onEntrySubmitted) {
        onEntrySubmitted();
      }

      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : t('analysisFailed', language);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (entry: LocalDailyEntry) => {
    setSelectedEntry(entry);
    setIsEditing(true);
    setDate(entry.date);
    setTotalSales(entry.totalSales.toString());
    setTotalExpense(entry.totalExpense.toString());
    setCashInHand(entry.cashInHand?.toString() || '');
    setNotes(entry.notes || '');
    setViewMode('form');
  };

  const handleDelete = async (entryDate: string) => {
    const user = SessionManager.getCurrentUser();
    if (!user) return;

    setLoading(true);
    setError('');

    try {
      // Try to delete from DynamoDB
      try {
        const response = await fetch(`/api/daily?userId=${user.userId}&date=${entryDate}`, {
          method: 'DELETE',
        });

        const result = await response.json();
        if (!result.success) {
          throw new Error(result.error);
        }
      } catch (apiError) {
        logger.warn('[DailyEntry] API delete failed', { error: apiError });
      }

      // Always delete from localStorage
      deleteLocalEntry(entryDate);
      loadEntries();
      setSuccess(t('daily.deleteEntry', language));
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : t('analysisFailed', language);
      setError(errorMessage);
    } finally {
      setLoading(false);
      setShowDeleteConfirm(false);
      setDeleteTarget(null);
    }
  };

  const confirmDelete = (entryDate: string) => {
    setDeleteTarget(entryDate);
    setShowDeleteConfirm(true);
  };

  const cancelEdit = () => {
    setIsEditing(false);
    setSelectedEntry(null);
    setTotalSales('');
    setTotalExpense('');
    setCashInHand('');
    setNotes('');
    setDate(new Date().toISOString().split('T')[0]);
    setError('');
  };

  const formatDate = (dateString: string) => {
    const entryDate = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (entryDate.toDateString() === today.toDateString()) {
      return t('daily.today', language);
    } else if (entryDate.toDateString() === yesterday.toDateString()) {
      return t('daily.yesterday', language);
    } else {
      return entryDate.toLocaleDateString(language === 'hi' ? 'hi-IN' : language === 'mr' ? 'mr-IN' : 'en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    }
  };

  const syncStatus = getSyncStatus();
  const pendingCount = entries.filter(e => e.syncStatus === 'pending' || e.syncStatus === 'error').length;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      {/* Header with Tabs */}
      <div className="border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Calendar className="w-6 h-6 text-blue-600" />
              {t('daily.title', language)}
            </h2>
            
            {/* Sync Status */}
            <button
              onClick={handleSync}
              disabled={syncing}
              className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50"
            >
              {syncing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
                  <span className="text-gray-600">{t('daily.syncing', language)}</span>
                </>
              ) : pendingCount > 0 ? (
                <>
                  <CloudOff className="w-4 h-4 text-orange-500" />
                  <span className="text-gray-600">{pendingCount} {t('daily.pendingSync', language)}</span>
                </>
              ) : (
                <>
                  <Cloud className="w-4 h-4 text-green-500" />
                  <span className="text-gray-600">{t('daily.syncSuccess', language)}</span>
                </>
              )}
            </button>
          </div>

          {/* Tab Navigation */}
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode('form')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                viewMode === 'form'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Plus className="w-4 h-4" />
              {isEditing ? t('daily.editEntry', language) : t('daily.addNew', language)}
            </button>
            
            <button
              onClick={() => setViewMode('history')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                viewMode === 'history'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              <History className="w-4 h-4" />
              {t('daily.history', language)}
              {entries.length > 0 && (
                <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full font-semibold">
                  {entries.length}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="p-6">
        {/* Success/Error Messages */}
        {success && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3">
            <svg className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm text-green-800">{success}</p>
          </div>
        )}

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
            <svg className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {/* Form View */}
        {viewMode === 'form' && (
          <form onSubmit={handleSubmit} className="space-y-6">
            {isEditing && (
              <div className="flex items-center justify-between p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center gap-2">
                  <Edit2 className="w-5 h-5 text-blue-600" />
                  <span className="text-sm font-medium text-blue-900">
                    {t('daily.editEntry', language)} - {formatDate(date)}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="text-blue-600 hover:text-blue-800 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('daily.entryDate', language)}
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  max={new Date().toISOString().split('T')[0]}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  required
                />
              </div>

              {/* Cash in Hand */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('cashInHand', language)}
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">₹</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={cashInHand}
                    onChange={(e) => setCashInHand(e.target.value)}
                    className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder="20000"
                  />
                </div>
              </div>

              {/* Total Sales */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('totalSales', language)} <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">₹</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={totalSales}
                    onChange={(e) => setTotalSales(e.target.value)}
                    className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder="50000"
                  />
                </div>
              </div>

              {/* Total Expenses */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('totalExpenses', language)} <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">₹</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={totalExpense}
                    onChange={(e) => setTotalExpense(e.target.value)}
                    className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder="35000"
                  />
                </div>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('daily.notes', language)}
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
                placeholder={t('daily.addNotes', language)}
              />
            </div>

            {/* Submit Button */}
            <div className="flex gap-3">
              {isEditing && (
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all font-medium"
                >
                  {t('cancel', language)}
                </button>
              )}
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></div>
                    {isEditing ? t('daily.updating', language) : t('daily.saving', language)}
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {isEditing ? t('daily.updateEntry', language) : t('daily.saveEntry', language)}
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* History View */}
        {viewMode === 'history' && (
          <div className="space-y-4">
            {entries.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                  <History className="w-8 h-8 text-gray-400" />
                </div>
                <p className="text-gray-500 mb-4">{t('daily.noEntries', language)}</p>
                <button
                  onClick={() => setViewMode('form')}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  <Plus className="w-5 h-5" />
                  {t('daily.addNew', language)}
                </button>
              </div>
            ) : (
              entries.map((entry) => (
                <div
                  key={entry.date}
                  className="p-5 border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-md transition-all"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {formatDate(entry.date)}
                        </h3>
                        {entry.syncStatus === 'pending' && (
                          <span className="px-2 py-0.5 bg-orange-100 text-orange-700 text-xs rounded-full font-medium flex items-center gap-1">
                            <CloudOff className="w-3 h-3" />
                            {t('daily.pendingSync', language)}
                          </span>
                        )}
                        {entry.syncStatus === 'synced' && (
                          <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full font-medium flex items-center gap-1">
                            <Cloud className="w-3 h-3" />
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500">{entry.date}</p>
                    </div>
                    
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(entry)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title={t('daily.editEntry', language)}
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => confirmDelete(entry.date)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title={t('daily.deleteEntry', language)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-500 mb-1">{t('totalSales', language)}</p>
                      <p className="text-lg font-semibold text-gray-900">₹{entry.totalSales.toLocaleString('en-IN')}</p>
                    </div>
                    
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-500 mb-1">{t('totalExpenses', language)}</p>
                      <p className="text-lg font-semibold text-gray-900">₹{entry.totalExpense.toLocaleString('en-IN')}</p>
                    </div>
                    
                    <div className={`p-3 rounded-lg ${entry.estimatedProfit >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
                      <p className="text-xs text-gray-500 mb-1">{t('estimatedProfit', language)}</p>
                      <p className={`text-lg font-semibold flex items-center gap-1 ${entry.estimatedProfit >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                        {entry.estimatedProfit >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                        ₹{Math.abs(entry.estimatedProfit).toLocaleString('en-IN')}
                      </p>
                    </div>
                    
                    <div className="p-3 bg-blue-50 rounded-lg">
                      <p className="text-xs text-gray-500 mb-1">{t('profitMargin', language)}</p>
                      <p className="text-lg font-semibold text-blue-700">{(entry.profitMargin * 100).toFixed(1)}%</p>
                    </div>
                  </div>

                  {entry.notes && (
                    <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-700">{entry.notes}</p>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">{t('daily.deleteEntry', language)}</h3>
            </div>
            
            <p className="text-gray-600 mb-6">{t('daily.confirmDelete', language)}</p>
            
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setDeleteTarget(null);
                }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                {t('cancel', language)}
              </button>
              <button
                onClick={() => deleteTarget && handleDelete(deleteTarget)}
                disabled={loading}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors font-medium"
              >
                {loading ? t('daily.deleting', language) : t('delete', language)}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
