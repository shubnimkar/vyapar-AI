'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { InferredTransaction, Language } from '@/lib/types';
import {
  getLocalPendingTransactions,
  removePendingTransaction,
  updatePendingTransaction,
} from '@/lib/pending-transaction-store';
import {
  Building2,
  Check,
  Clock3,
  FileSpreadsheet,
  Mic,
  Package,
  Receipt,
  ShoppingCart,
  Trash2,
} from 'lucide-react';
import { formatCurrency } from '@/lib/design-system/utils';

interface PendingTransactionConfirmationProps {
  language: Language;
  onAdd?: (transaction: InferredTransaction) => void;
  onLater?: (transaction: InferredTransaction) => void;
  onDiscard?: (transaction: InferredTransaction) => void;
}

type CopyKey =
  | 'emptyTitle'
  | 'emptyBody'
  | 'pendingSingle'
  | 'pendingPlural'
  | 'expense'
  | 'sale'
  | 'discard'
  | 'later'
  | 'deferred'
  | 'add'
  | 'adding'
  | 'voice'
  | 'receipt'
  | 'csv';

const COPY: Record<Language, Record<CopyKey, string>> = {
  en: {
    emptyTitle: 'No pending transactions',
    emptyBody: 'Upload a receipt or CSV file to get started.',
    pendingSingle: 'pending transaction',
    pendingPlural: 'pending transactions',
    expense: 'Expense',
    sale: 'Sale',
    discard: 'Discard',
    later: 'Later',
    deferred: 'Deferred',
    add: 'Add',
    adding: 'Adding...',
    voice: 'Voice',
    receipt: 'Receipt',
    csv: 'CSV',
  },
  hi: {
    emptyTitle: 'कोई लंबित लेनदेन नहीं',
    emptyBody: 'शुरू करने के लिए रसीद या CSV फ़ाइल अपलोड करें।',
    pendingSingle: 'लंबित लेनदेन',
    pendingPlural: 'लंबित लेनदेन',
    expense: 'खर्च',
    sale: 'बिक्री',
    discard: 'हटाएं',
    later: 'बाद में',
    deferred: 'बाद के लिए',
    add: 'जोड़ें',
    adding: 'जोड़ रहे हैं...',
    voice: 'वॉइस',
    receipt: 'रसीद',
    csv: 'CSV',
  },
  mr: {
    emptyTitle: 'कोणतेही प्रलंबित व्यवहार नाहीत',
    emptyBody: 'सुरू करण्यासाठी पावती किंवा CSV फाइल अपलोड करा.',
    pendingSingle: 'प्रलंबित व्यवहार',
    pendingPlural: 'प्रलंबित व्यवहार',
    expense: 'खर्च',
    sale: 'विक्री',
    discard: 'टाकून द्या',
    later: 'नंतर',
    deferred: 'नंतरसाठी',
    add: 'जोडा',
    adding: 'जोडत आहे...',
    voice: 'व्हॉइस',
    receipt: 'पावती',
    csv: 'CSV',
  },
};

const SOURCE_ICON_MAP = {
  receipt: Receipt,
  csv: FileSpreadsheet,
  voice: Mic,
} as const;

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
    window.addEventListener('pendingTransactionsUpdated', loadTransactions);
    return () => window.removeEventListener('pendingTransactionsUpdated', loadTransactions);
  }, [loadTransactions]);

  const copy = COPY[language];

  const handleAdd = async (transaction: InferredTransaction) => {
    setLoadingId(transaction.id);
    try {
      if (onAdd) await onAdd(transaction);
      removePendingTransaction(transaction.id);
      loadTransactions();
    } catch {
      // Parent handles toast/error state.
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

  const formatTxnDate = (date: string) =>
    new Date(date).toLocaleDateString(
      language === 'hi' ? 'hi-IN' : language === 'mr' ? 'mr-IN' : 'en-IN',
      { day: '2-digit', month: 'short', year: 'numeric' }
    );

  const getTransactionLabel = (txn: InferredTransaction) => {
    if (txn.vendor_name?.trim()) return txn.vendor_name.trim();
    if (txn.category?.trim()) return txn.category.trim();
    return txn.type === 'sale' ? copy.sale : copy.expense;
  };

  const getSurfaceIcon = (txn: InferredTransaction) => {
    const lower = `${txn.vendor_name ?? ''} ${txn.category ?? ''}`.toLowerCase();
    if (txn.type === 'sale') return ShoppingCart;
    if (lower.includes('rent') || lower.includes('lease') || lower.includes('office')) return Building2;
    if (lower.includes('stock') || lower.includes('inventory') || lower.includes('product')) return Package;
    return SOURCE_ICON_MAP[txn.source] ?? Receipt;
  };

  if (transactions.length === 0) {
    return (
      <div className="rounded-[28px] border border-[#d9e1ee] bg-white px-8 py-14 text-center shadow-[0_16px_45px_rgba(15,23,42,0.04)]">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#eef4ff] text-[#2563eb]">
          <Receipt className="h-8 w-8" />
        </div>
        <h3 className="mt-5 text-2xl font-bold tracking-tight text-slate-900">{copy.emptyTitle}</h3>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">{copy.emptyBody}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between px-1">
        <span className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
          {transactions.length}{' '}
          {transactions.length === 1 ? copy.pendingSingle : copy.pendingPlural}
        </span>
      </div>

      {transactions.map((txn) => {
        const SourceIcon = SOURCE_ICON_MAP[txn.source] ?? Receipt;
        const SurfaceIcon = getSurfaceIcon(txn);
        const isLoading = loadingId === txn.id;
        const isDeferred = Boolean(txn.deferred_at);
        const typeLabel = txn.type === 'sale' ? copy.sale : copy.expense;
        const amountColor = txn.type === 'sale' ? 'text-emerald-600' : 'text-rose-600';
        const amountPrefix = txn.type === 'sale' ? '+' : '-';
        const typeStyles =
          txn.type === 'sale'
            ? 'bg-emerald-50 text-emerald-700'
            : 'bg-rose-50 text-rose-700';
        const sourceLabel =
          txn.source === 'voice'
            ? copy.voice
            : txn.source === 'csv'
            ? copy.csv
            : copy.receipt;
        const iconWrapStyles =
          txn.type === 'sale'
            ? 'bg-emerald-50 text-emerald-600'
            : 'bg-slate-100 text-[#2563eb]';

        return (
          <div
            key={txn.id}
            className={`group rounded-3xl border bg-white p-6 shadow-[0_14px_40px_rgba(15,23,42,0.05)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_20px_48px_rgba(15,23,42,0.08)] md:flex md:items-center md:justify-between md:gap-6 ${
              isDeferred ? 'border-amber-200 bg-amber-50/40' : 'border-[#d9e1ee]'
            }`}
          >
            <div className="w-full md:w-auto md:flex-1">
              <div className="flex items-center gap-4">
                <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${iconWrapStyles}`}>
                  <SurfaceIcon className="h-7 w-7" />
                </div>
                <div className="min-w-0">
                  <h3 className="truncate text-xl font-extrabold tracking-tight text-slate-900">
                    {getTransactionLabel(txn)}
                  </h3>
                  <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-slate-500">
                    <span>{formatTxnDate(txn.date)}</span>
                    <span className="h-1 w-1 rounded-full bg-slate-300" />
                    <span className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.16em] ${typeStyles}`}>
                      {typeLabel}
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                      <SourceIcon className="h-3.5 w-3.5" />
                      {sourceLabel}
                    </span>
                    {isDeferred && (
                      <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700">
                        {copy.deferred}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-5 flex w-full flex-col gap-5 md:mt-0 md:w-auto md:flex-row md:items-center md:gap-8">
              <div className="text-left md:min-w-[140px] md:text-right">
                <span className={`text-3xl font-extrabold tracking-tight ${amountColor}`}>
                  {amountPrefix}
                  {formatCurrency(txn.amount)}
                </span>
              </div>

              <div className="flex w-full flex-col gap-2 sm:flex-row md:w-auto">
                <button
                  onClick={() => handleDiscard(txn)}
                  disabled={isLoading}
                  className="rounded-full px-5 py-2.5 text-sm font-semibold text-slate-500 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {copy.discard}
                </button>
                <button
                  onClick={() => handleLater(txn)}
                  disabled={isLoading || isDeferred}
                  className="rounded-full px-5 py-2.5 text-sm font-semibold text-slate-500 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {copy.later}
                </button>
                <button
                  onClick={() => handleAdd(txn)}
                  disabled={isLoading}
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-br from-[#005bbf] to-[#1a73e8] px-7 py-2.5 text-sm font-bold text-white shadow-[0_12px_24px_rgba(26,115,232,0.24)] transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isLoading ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      {copy.adding}
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4" />
                      {copy.add}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
