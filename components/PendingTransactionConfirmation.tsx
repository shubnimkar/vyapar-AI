'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { InferredTransaction, Language } from '@/lib/types';
import {
  getLocalPendingTransactions,
  removePendingTransaction,
  updatePendingTransaction,
} from '@/lib/pending-transaction-store';
import { Receipt, FileText, Calendar, DollarSign, Tag, User, Clock, Trash2, Check, Mic } from 'lucide-react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { formatCurrency } from '@/lib/design-system/utils';

interface PendingTransactionConfirmationProps {
  language: Language;
  onAdd?: (transaction: InferredTransaction) => void;
  onLater?: (transaction: InferredTransaction) => void;
  onDiscard?: (transaction: InferredTransaction) => void;
}

export default function PendingTransactionConfirmation({
  language,
  onAdd,
  onLater,
  onDiscard,
}: PendingTransactionConfirmationProps) {
  const [transactions, setTransactions] = useState<InferredTransaction[]>([]);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const loadTransactions = useCallback(() => {
    setTransactions(getLocalPendingTransactions());
  }, []);

  useEffect(() => {
    loadTransactions();
    // Re-load whenever savePendingTransaction fires the custom event
    window.addEventListener('pendingTransactionsUpdated', loadTransactions);
    return () => window.removeEventListener('pendingTransactionsUpdated', loadTransactions);
  }, [loadTransactions]);

  const handleAdd = async (transaction: InferredTransaction) => {
    setLoadingId(transaction.id);
    try {
      if (onAdd) await onAdd(transaction);
      removePendingTransaction(transaction.id);
      loadTransactions();
    } catch {
      // error handled by parent
    } finally {
      setLoadingId(null);
    }
  };

  const handleLater = (transaction: InferredTransaction) => {
    updatePendingTransaction(transaction.id, { deferred_at: new Date().toISOString() });
    if (onLater) onLater(transaction);
    loadTransactions();
  };

  const handleDiscard = (transaction: InferredTransaction) => {
    if (onDiscard) onDiscard(transaction);
    removePendingTransaction(transaction.id);
    loadTransactions();
  };

  if (transactions.length === 0) {
    return (
      <Card className="text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-neutral-100 flex items-center justify-center">
          <Receipt className="w-8 h-8 text-neutral-400" />
        </div>
        <h3 className="text-lg font-semibold text-neutral-900 mb-2">
          {language === 'hi' ? 'कोई लंबित लेनदेन नहीं' : language === 'mr' ? 'कोणतेही प्रलंबित व्यवहार नाहीत' : 'No Pending Transactions'}
        </h3>
        <p className="text-neutral-500 text-sm">
          {language === 'hi' ? 'रसीद या CSV फ़ाइल अपलोड करें' : language === 'mr' ? 'पावती किंवा CSV फाइल अपलोड करा' : 'Upload a receipt or CSV file to get started'}
        </p>
      </Card>
    );
  }

  const sourceConfig: Record<string, { icon: typeof Receipt; label: string }> = {
    receipt: { icon: Receipt, label: language === 'hi' ? 'रसीद' : language === 'mr' ? 'पावती' : 'Receipt' },
    csv: { icon: FileText, label: 'CSV' },
    voice: { icon: Mic, label: language === 'hi' ? 'वॉइस' : language === 'mr' ? 'व्हॉइस' : 'Voice' },
  };

  return (
    <div className="space-y-3">
      {/* Count header */}
      <div className="flex items-center justify-between px-1">
        <span className="text-sm font-medium text-neutral-600">
          {transactions.length} {transactions.length === 1
            ? (language === 'hi' ? 'लंबित लेनदेन' : language === 'mr' ? 'प्रलंबित व्यवहार' : 'pending transaction')
            : (language === 'hi' ? 'लंबित लेनदेन' : language === 'mr' ? 'प्रलंबित व्यवहार' : 'pending transactions')}
        </span>
      </div>

      {/* Transaction list */}
      {transactions.map((txn) => {
        const src = sourceConfig[txn.source] || sourceConfig.receipt;
        const SrcIcon = src.icon;
        const isLoading = loadingId === txn.id;
        const isDeferred = !!txn.deferred_at;

        return (
          <div
            key={txn.id}
            className={`bg-white rounded-xl border shadow-sm overflow-hidden ${isDeferred ? 'opacity-60' : 'border-gray-200'}`}
          >
            {/* Card header */}
            <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Badge variant={txn.source === 'receipt' ? 'info' : txn.source === 'voice' ? 'warning' : 'success'}>
                  <SrcIcon className="w-3 h-3 mr-1" />
                  {src.label}
                </Badge>
                {isDeferred && (
                  <span className="text-xs text-amber-600 font-medium">
                    {language === 'hi' ? 'बाद के लिए' : language === 'mr' ? 'नंतरसाठी' : 'Deferred'}
                  </span>
                )}
              </div>
              <span className={`text-lg font-bold ${txn.type === 'sale' ? 'text-green-600' : 'text-red-600'}`}>
                {txn.type === 'sale' ? '+' : '-'}{formatCurrency(txn.amount)}
              </span>
            </div>

            {/* Card body */}
            <div className="px-4 py-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <div className="flex items-center gap-2 text-gray-600">
                <Calendar className="w-4 h-4 flex-shrink-0" />
                <span>{new Date(txn.date).toLocaleDateString(
                  language === 'hi' ? 'hi-IN' : language === 'mr' ? 'mr-IN' : 'en-IN',
                  { day: 'numeric', month: 'short', year: 'numeric' }
                )}</span>
              </div>
              <div className="flex items-center gap-2 text-gray-600">
                <Tag className="w-4 h-4 flex-shrink-0" />
                <Badge variant={txn.type === 'expense' ? 'error' : 'success'}>
                  {txn.type === 'expense'
                    ? (language === 'hi' ? 'खर्च' : language === 'mr' ? 'खर्च' : 'Expense')
                    : (language === 'hi' ? 'बिक्री' : language === 'mr' ? 'विक्री' : 'Sale')}
                </Badge>
              </div>
              {txn.vendor_name && (
                <div className="flex items-center gap-2 text-gray-600">
                  <User className="w-4 h-4 flex-shrink-0" />
                  <span className="truncate">{txn.vendor_name}</span>
                </div>
              )}
              {txn.category && (
                <div className="flex items-center gap-2 text-gray-600">
                  <DollarSign className="w-4 h-4 flex-shrink-0" />
                  <span className="truncate">{txn.category}</span>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="px-4 py-3 border-t border-gray-100 flex gap-2">
              <button
                onClick={() => handleDiscard(txn)}
                disabled={isLoading}
                className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                {language === 'hi' ? 'हटाएं' : language === 'mr' ? 'टाकून द्या' : 'Discard'}
              </button>
              <button
                onClick={() => handleLater(txn)}
                disabled={isLoading || isDeferred}
                className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-amber-600 bg-amber-50 hover:bg-amber-100 rounded-lg transition-colors disabled:opacity-50"
              >
                <Clock className="w-3.5 h-3.5" />
                {language === 'hi' ? 'बाद में' : language === 'mr' ? 'नंतर' : 'Later'}
              </button>
              <button
                onClick={() => handleAdd(txn)}
                disabled={isLoading}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50"
              >
                {isLoading ? (
                  <span className="animate-spin w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full" />
                ) : (
                  <Check className="w-3.5 h-3.5" />
                )}
                {isLoading
                  ? (language === 'hi' ? 'जोड़ रहे हैं...' : language === 'mr' ? 'जोडत आहे...' : 'Adding...')
                  : (language === 'hi' ? 'जोड़ें' : language === 'mr' ? 'जोडा' : 'Add')}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
