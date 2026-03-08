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
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';
import { ErrorState } from '@/components/ui/ErrorState';

interface DailyEntryFormProps {
  language: Language;
  onEntrySubmitted?: () => void;
  initialData?: {
    date?: string;
    totalSales?: number;
    totalExpense?: number;
    notes?: string;
  };
}

type ViewMode = 'form' | 'history' | 'calendar';

export default function DailyEntryForm({ language, onEntrySubmitted, initialData }: DailyEntryFormProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('form');
  const [entries, setEntries] = useState<LocalDailyEntry[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<LocalDailyEntry | null>(null);
  
  // Form state
  const [date, setDate] = useState(initialData?.date || new Date().toISOString().split('T')[0]);
  const [totalSales, setTotalSales] = useState(initialData?.totalSales?.toString() || '');
  const [totalExpense, setTotalExpense] = useState(initialData?.totalExpense?.toString() || '');
  const [cashInHand, setCashInHand] = useState('');
  const [notes, setNotes] = useState(initialData?.notes || '');
  
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

  // Update form when initialData changes (e.g., from voice input)
  useEffect(() => {
    if (initialData) {
      if (initialData.date) setDate(initialData.date);
      if (initialData.totalSales !== undefined) setTotalSales(initialData.totalSales.toString());
      if (initialData.totalExpense !== undefined) setTotalExpense(initialData.totalExpense.toString());
      if (initialData.notes) setNotes(initialData.notes);
      // Switch to form view to show the populated data
      setViewMode('form');
    }
  }, [initialData]);

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
    <Card elevation="raised" density="comfortable" className="overflow-hidden">
      {/* Header with Tabs */}
      <CardHeader className="border-b border-neutral-200 bg-gradient-to-r from-neutral-50 to-white pb-0 mb-0">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-neutral-900 flex items-center gap-2">
              <Calendar className="w-6 h-6 text-primary-600" />
              {t('daily.title', language)}
            </h2>
            
            {/* Sync Status */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSync}
              disabled={syncing}
              icon={syncing ? <RefreshCw className="w-4 h-4 animate-spin" /> : pendingCount > 0 ? <CloudOff className="w-4 h-4" /> : <Cloud className="w-4 h-4" />}
              iconPosition="left"
            >
              {syncing ? t('daily.syncing', language) : pendingCount > 0 ? `${pendingCount} ${t('daily.pendingSync', language)}` : t('daily.syncSuccess', language)}
            </Button>
          </div>

          {/* Tab Navigation */}
          <div className="flex gap-2">
            <Button
              variant={viewMode === 'form' ? 'primary' : 'secondary'}
              size="md"
              onClick={() => setViewMode('form')}
              icon={<Plus className="w-4 h-4" />}
              iconPosition="left"
            >
              {isEditing ? t('daily.editEntry', language) : t('daily.addNew', language)}
            </Button>
            
            <Button
              variant={viewMode === 'history' ? 'primary' : 'secondary'}
              size="md"
              onClick={() => setViewMode('history')}
              icon={<History className="w-4 h-4" />}
              iconPosition="left"
            >
              {t('daily.history', language)}
              {entries.length > 0 && (
                <span className="px-2 py-0.5 bg-primary-100 text-primary-700 text-xs rounded-full font-semibold">
                  {entries.length}
                </span>
              )}
            </Button>
          </div>
        </div>
      </CardHeader>

      {/* Content Area */}
      <CardBody className="p-6">
        {/* Success/Error Messages */}
        {success && (
          <div className="mb-4 p-4 bg-success-50 border border-success-200 rounded-lg flex items-start gap-3">
            <svg className="w-5 h-5 text-success-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm text-success-800">{success}</p>
          </div>
        )}

        {error && (
          <div className="mb-4 p-4 bg-error-50 border border-error-200 rounded-lg flex items-start gap-3">
            <svg className="w-5 h-5 text-error-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm text-error-800">{error}</p>
          </div>
        )}

        {/* Form View */}
        {viewMode === 'form' && (
          <form onSubmit={handleSubmit} className="space-y-6">
            {isEditing && (
              <div className="flex items-center justify-between p-4 bg-primary-50 border border-primary-200 rounded-lg">
                <div className="flex items-center gap-2">
                  <Edit2 className="w-5 h-5 text-primary-600" />
                  <span className="text-sm font-medium text-primary-900">
                    {t('daily.editEntry', language)} - {formatDate(date)}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="text-primary-600 hover:text-primary-800 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Date */}
              <Input
                type="date"
                label={t('daily.entryDate', language)}
                value={date}
                onChange={(e) => setDate(e.target.value)}
                max={new Date().toISOString().split('T')[0]}
                required
              />

              {/* Cash in Hand */}
              <Input
                type="number"
                label={t('cashInHand', language)}
                value={cashInHand}
                onChange={(e) => setCashInHand(e.target.value)}
                min="0"
                step="0.01"
                prefix="₹"
                placeholder="20000"
              />

              {/* Total Sales */}
              <Input
                type="number"
                label={t('totalSales', language)}
                value={totalSales}
                onChange={(e) => setTotalSales(e.target.value)}
                min="0"
                step="0.01"
                prefix="₹"
                placeholder="50000"
                required
              />

              {/* Total Expenses */}
              <Input
                type="number"
                label={t('totalExpenses', language)}
                value={totalExpense}
                onChange={(e) => setTotalExpense(e.target.value)}
                min="0"
                step="0.01"
                prefix="₹"
                placeholder="35000"
                required
              />
            </div>

            {/* Notes */}
            <Input
              as="textarea"
              rows={3}
              label={t('daily.notes', language)}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t('daily.addNotes', language)}
            />

            {/* Submit Button */}
            <div className="flex gap-3">
              {isEditing && (
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  fullWidth
                  onClick={cancelEdit}
                >
                  {t('cancel', language)}
                </Button>
              )}
              <Button
                type="submit"
                variant="primary"
                size="lg"
                fullWidth
                loading={loading}
                icon={!loading && <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>}
                iconPosition="left"
              >
                {loading ? (isEditing ? t('daily.updating', language) : t('daily.saving', language)) : (isEditing ? t('daily.updateEntry', language) : t('daily.saveEntry', language))}
              </Button>
            </div>
          </form>
        )}

        {/* History View */}
        {viewMode === 'history' && (
          <div className="space-y-4">
            {entries.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-neutral-100 flex items-center justify-center">
                  <History className="w-8 h-8 text-neutral-400" />
                </div>
                <p className="text-neutral-500 mb-4">{t('daily.noEntries', language)}</p>
                <Button
                  variant="primary"
                  size="md"
                  onClick={() => setViewMode('form')}
                  icon={<Plus className="w-5 h-5" />}
                  iconPosition="left"
                >
                  {t('daily.addNew', language)}
                </Button>
              </div>
            ) : (
              entries.map((entry) => (
                <Card
                  key={entry.date}
                  elevation="raised"
                  density="comfortable"
                  className="hover:border-primary-300 transition-all"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-lg font-semibold text-neutral-900">
                          {formatDate(entry.date)}
                        </h3>
                        {entry.syncStatus === 'pending' && (
                          <span className="px-2 py-0.5 bg-warning-100 text-warning-700 text-xs rounded-full font-medium flex items-center gap-1">
                            <CloudOff className="w-3 h-3" />
                            {t('daily.pendingSync', language)}
                          </span>
                        )}
                        {entry.syncStatus === 'synced' && (
                          <span className="px-2 py-0.5 bg-success-100 text-success-700 text-xs rounded-full font-medium flex items-center gap-1">
                            <Cloud className="w-3 h-3" />
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-neutral-500">{entry.date}</p>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(entry)}
                        icon={<Edit2 className="w-4 h-4" />}
                        aria-label={t('daily.editEntry', language)}
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => confirmDelete(entry.date)}
                        icon={<Trash2 className="w-4 h-4" />}
                        className="text-error-600 hover:bg-error-50"
                        aria-label={t('daily.deleteEntry', language)}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-3 bg-neutral-50 rounded-lg">
                      <p className="text-xs text-neutral-500 mb-1">{t('totalSales', language)}</p>
                      <p className="text-lg font-semibold text-neutral-900">₹{entry.totalSales.toLocaleString('en-IN')}</p>
                    </div>
                    
                    <div className="p-3 bg-neutral-50 rounded-lg">
                      <p className="text-xs text-neutral-500 mb-1">{t('totalExpenses', language)}</p>
                      <p className="text-lg font-semibold text-neutral-900">₹{entry.totalExpense.toLocaleString('en-IN')}</p>
                    </div>
                    
                    <div className={`p-3 rounded-lg ${entry.estimatedProfit >= 0 ? 'bg-success-50' : 'bg-error-50'}`}>
                      <p className="text-xs text-neutral-500 mb-1">{t('estimatedProfit', language)}</p>
                      <p className={`text-lg font-semibold flex items-center gap-1 ${entry.estimatedProfit >= 0 ? 'text-success-700' : 'text-error-700'}`}>
                        {entry.estimatedProfit >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                        ₹{Math.abs(entry.estimatedProfit).toLocaleString('en-IN')}
                      </p>
                    </div>
                    
                    <div className="p-3 bg-primary-50 rounded-lg">
                      <p className="text-xs text-neutral-500 mb-1">{t('profitMargin', language)}</p>
                      <p className="text-lg font-semibold text-primary-700">{(entry.profitMargin * 100).toFixed(1)}%</p>
                    </div>
                  </div>

                  {entry.notes && (
                    <div className="mt-4 p-3 bg-neutral-50 rounded-lg">
                      <p className="text-sm text-neutral-700">{entry.notes}</p>
                    </div>
                  )}
                </Card>
              ))
            )}
          </div>
        )}
      </CardBody>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card elevation="elevated" density="comfortable" className="max-w-md w-full">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-error-100 flex items-center justify-center">
                <Trash2 className="w-6 h-6 text-error-600" />
              </div>
              <h3 className="text-lg font-bold text-neutral-900">{t('daily.deleteEntry', language)}</h3>
            </div>
            
            <p className="text-neutral-600 mb-6">{t('daily.confirmDelete', language)}</p>
            
            <div className="flex gap-3">
              <Button
                variant="outline"
                size="md"
                fullWidth
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setDeleteTarget(null);
                }}
              >
                {t('cancel', language)}
              </Button>
              <Button
                variant="danger"
                size="md"
                fullWidth
                loading={loading}
                onClick={() => deleteTarget && handleDelete(deleteTarget)}
              >
                {loading ? t('daily.deleting', language) : t('delete', language)}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </Card>
  );
}
