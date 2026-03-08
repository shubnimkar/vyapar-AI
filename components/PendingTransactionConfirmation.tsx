'use client';

import React, { useState, useEffect } from 'react';
import { InferredTransaction, Language } from '@/lib/types';
import {
  getLocalPendingTransactions,
  removePendingTransaction,
  updatePendingTransaction,
} from '@/lib/pending-transaction-store';
import { Receipt, FileText, Calendar, DollarSign, Tag, User, X, Check, Clock, Trash2, Edit2 } from 'lucide-react';
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

/**
 * PendingTransactionConfirmation Component
 * 
 * Displays pending inferred transactions from receipt OCR or CSV uploads
 * for user confirmation. Provides Add, Later, and Discard actions with
 * inline editing capabilities.
 * 
 * Features:
 * - Display transaction details with all fields
 * - Transaction counter (X of Y)
 * - Three action buttons: Add, Later, Discard
 * - Inline field editing before adding
 * - Source indicator badge (receipt/CSV)
 * - Empty state message
 * - Loading states for async operations
 * - Multi-language support (en, hi, mr)
 */
export default function PendingTransactionConfirmation({
  language,
  onAdd,
  onLater,
  onDiscard,
}: PendingTransactionConfirmationProps) {
  const [transactions, setTransactions] = useState<InferredTransaction[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Editable fields
  const [editedDate, setEditedDate] = useState('');
  const [editedAmount, setEditedAmount] = useState('');
  const [editedType, setEditedType] = useState<'expense' | 'sale'>('expense');
  const [editedVendor, setEditedVendor] = useState('');
  const [editedCategory, setEditedCategory] = useState('');

  useEffect(() => {
    loadTransactions();
  }, []);

  const loadTransactions = () => {
    const pending = getLocalPendingTransactions();
    setTransactions(pending);
    
    // Reset to first transaction if current index is out of bounds
    if (currentIndex >= pending.length) {
      setCurrentIndex(0);
    }
    
    // Initialize edit fields with current transaction
    if (pending.length > 0 && pending[currentIndex]) {
      initializeEditFields(pending[currentIndex]);
    }
  };

  const initializeEditFields = (transaction: InferredTransaction) => {
    setEditedDate(transaction.date);
    setEditedAmount(transaction.amount.toString());
    setEditedType(transaction.type);
    setEditedVendor(transaction.vendor_name || '');
    setEditedCategory(transaction.category || '');
  };

  const currentTransaction = transactions[currentIndex];

  useEffect(() => {
    if (currentTransaction) {
      initializeEditFields(currentTransaction);
    }
  }, [currentIndex, currentTransaction]);

  const handleAdd = async () => {
    if (!currentTransaction) return;
    
    setLoading(true);
    try {
      // Create updated transaction with edited fields
      const updatedTransaction: InferredTransaction = {
        ...currentTransaction,
        date: editedDate,
        amount: parseFloat(editedAmount),
        type: editedType,
        vendor_name: editedVendor || undefined,
        category: editedCategory || undefined,
      };
      
      // Call parent callback if provided and WAIT for it to complete
      if (onAdd) {
        await onAdd(updatedTransaction);
      }
      
      // Only remove from pending store AFTER successfully adding to daily entry
      removePendingTransaction(currentTransaction.id);
      
      // Reload and move to next
      loadTransactions();
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to add transaction:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLater = async () => {
    if (!currentTransaction) return;
    
    setLoading(true);
    try {
      // Mark as deferred
      updatePendingTransaction(currentTransaction.id, {
        deferred_at: new Date().toISOString(),
      });
      
      // Call parent callback if provided
      if (onLater) {
        onLater(currentTransaction);
      }
      
      // Reload and move to next
      loadTransactions();
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to defer transaction:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDiscard = async () => {
    if (!currentTransaction) return;
    
    setLoading(true);
    try {
      // Call parent callback if provided
      if (onDiscard) {
        onDiscard(currentTransaction);
      }
      
      // Remove from pending store
      removePendingTransaction(currentTransaction.id);
      
      // Reload and move to next
      loadTransactions();
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to discard transaction:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleEdit = () => {
    if (isEditing) {
      // Cancel edit - reset to original values
      if (currentTransaction) {
        initializeEditFields(currentTransaction);
      }
    }
    setIsEditing(!isEditing);
  };

  // Empty state
  if (transactions.length === 0) {
    return (
      <Card className="text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-neutral-100 flex items-center justify-center">
          <Receipt className="w-8 h-8 text-neutral-400" />
        </div>
        <h3 className="text-lg font-semibold text-neutral-900 mb-2">
          {language === 'hi' 
            ? 'कोई लंबित लेनदेन नहीं'
            : language === 'mr'
            ? 'कोणतेही प्रलंबित व्यवहार नाहीत'
            : 'No Pending Transactions'}
        </h3>
        <p className="text-neutral-500 text-sm">
          {language === 'hi'
            ? 'रसीद या CSV फ़ाइल अपलोड करें'
            : language === 'mr'
            ? 'पावती किंवा CSV फाइल अपलोड करा'
            : 'Upload a receipt or CSV file to get started'}
        </p>
      </Card>
    );
  }

  // Source icon and label
  const sourceConfig = {
    receipt: {
      icon: Receipt,
      label: language === 'hi' ? 'रसीद' : language === 'mr' ? 'पावती' : 'Receipt',
      color: 'bg-blue-100 text-blue-700',
    },
    csv: {
      icon: FileText,
      label: 'CSV',
      color: 'bg-green-100 text-green-700',
    },
  };

  const source = sourceConfig[currentTransaction.source];
  const SourceIcon = source.icon;

  return (
    <Card className="overflow-hidden" density="compact">
      {/* Header with counter */}
      <div className="bg-gradient-to-r from-info-50 to-primary-50 px-6 py-4 border-b border-neutral-200 -m-4 mb-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-neutral-900">
            {language === 'hi'
              ? 'लेनदेन की समीक्षा करें'
              : language === 'mr'
              ? 'व्यवहाराचे पुनरावलोकन करा'
              : 'Review Transaction'}
          </h2>
          
          {/* Counter */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-neutral-600">
              {currentIndex + 1} {language === 'hi' ? 'का' : language === 'mr' ? 'चा' : 'of'} {transactions.length}
            </span>
            
            {/* Source badge */}
            <Badge variant={currentTransaction.source === 'receipt' ? 'info' : 'success'}>
              <SourceIcon className="w-3 h-3 mr-1" />
              {source.label}
            </Badge>
          </div>
        </div>
      </div>

      {/* Transaction details */}
      <div className="space-y-4">
        {/* Date */}
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-neutral-100 flex items-center justify-center flex-shrink-0">
            <Calendar className="w-5 h-5 text-neutral-600" />
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-neutral-700 mb-1">
              {language === 'hi' ? 'तिथि' : language === 'mr' ? 'तारीख' : 'Date'}
            </label>
            {isEditing ? (
              <input
                type="date"
                value={editedDate}
                onChange={(e) => setEditedDate(e.target.value)}
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent min-h-[44px]"
              />
            ) : (
              <p className="text-neutral-900 font-medium">
                {new Date(currentTransaction.date).toLocaleDateString(
                  language === 'hi' ? 'hi-IN' : language === 'mr' ? 'mr-IN' : 'en-IN',
                  { day: 'numeric', month: 'long', year: 'numeric' }
                )}
              </p>
            )}
          </div>
        </div>

        {/* Amount */}
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-neutral-100 flex items-center justify-center flex-shrink-0">
            <DollarSign className="w-5 h-5 text-neutral-600" />
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-neutral-700 mb-1">
              {language === 'hi' ? 'राशि' : language === 'mr' ? 'रक्कम' : 'Amount'}
            </label>
            {isEditing ? (
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500">₹</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={editedAmount}
                  onChange={(e) => setEditedAmount(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent min-h-[44px]"
                />
              </div>
            ) : (
              <p className="text-2xl font-bold text-neutral-900">
                {formatCurrency(currentTransaction.amount)}
              </p>
            )}
          </div>
        </div>

        {/* Type */}
        <div className="flex items-start gap-3">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
            currentTransaction.type === 'expense' ? 'bg-error-100' : 'bg-success-100'
          }`}>
            <Tag className={`w-5 h-5 ${currentTransaction.type === 'expense' ? 'text-error-600' : 'text-success-600'}`} />
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-neutral-700 mb-1">
              {language === 'hi' ? 'प्रकार' : language === 'mr' ? 'प्रकार' : 'Type'}
            </label>
            {isEditing ? (
              <select
                value={editedType}
                onChange={(e) => setEditedType(e.target.value as 'expense' | 'sale')}
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent min-h-[44px]"
              >
                <option value="expense">
                  {language === 'hi' ? 'खर्च' : language === 'mr' ? 'खर्च' : 'Expense'}
                </option>
                <option value="sale">
                  {language === 'hi' ? 'बिक्री' : language === 'mr' ? 'विक्री' : 'Sale'}
                </option>
              </select>
            ) : (
              <Badge variant={currentTransaction.type === 'expense' ? 'error' : 'success'}>
                {currentTransaction.type === 'expense'
                  ? (language === 'hi' ? 'खर्च' : language === 'mr' ? 'खर्च' : 'Expense')
                  : (language === 'hi' ? 'बिक्री' : language === 'mr' ? 'विक्री' : 'Sale')}
              </Badge>
            )}
          </div>
        </div>

        {/* Vendor */}
        {(currentTransaction.vendor_name || isEditing) && (
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-neutral-100 flex items-center justify-center flex-shrink-0">
              <User className="w-5 h-5 text-neutral-600" />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                {language === 'hi' ? 'विक्रेता' : language === 'mr' ? 'विक्रेता' : 'Vendor'}
              </label>
              {isEditing ? (
                <input
                  type="text"
                  value={editedVendor}
                  onChange={(e) => setEditedVendor(e.target.value)}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent min-h-[44px]"
                  placeholder={language === 'hi' ? 'विक्रेता का नाम' : language === 'mr' ? 'विक्रेत्याचे नाव' : 'Vendor name'}
                />
              ) : (
                <p className="text-neutral-900">{currentTransaction.vendor_name}</p>
              )}
            </div>
          </div>
        )}

        {/* Category */}
        {(currentTransaction.category || isEditing) && (
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-neutral-100 flex items-center justify-center flex-shrink-0">
              <Tag className="w-5 h-5 text-neutral-600" />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                {language === 'hi' ? 'श्रेणी' : language === 'mr' ? 'श्रेणी' : 'Category'}
              </label>
              {isEditing ? (
                <input
                  type="text"
                  value={editedCategory}
                  onChange={(e) => setEditedCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent min-h-[44px]"
                  placeholder={language === 'hi' ? 'श्रेणी' : language === 'mr' ? 'श्रेणी' : 'Category'}
                />
              ) : (
                <p className="text-neutral-900">{currentTransaction.category}</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="mt-6 pt-4 border-t border-neutral-200 -mx-4 px-4 -mb-4 pb-4 bg-neutral-50">
        <div className="flex gap-3">
          {/* Edit/Cancel Edit button */}
          <Button
            onClick={toggleEdit}
            disabled={loading}
            variant="outline"
            icon={isEditing ? <X className="w-4 h-4" /> : <Edit2 className="w-4 h-4" />}
          >
            {isEditing 
              ? (language === 'hi' ? 'रद्द करें' : language === 'mr' ? 'रद्द करा' : 'Cancel')
              : (language === 'hi' ? 'संपादित करें' : language === 'mr' ? 'संपादित करा' : 'Edit')}
          </Button>

          {/* Discard button */}
          <Button
            onClick={handleDiscard}
            disabled={loading}
            variant="danger"
            icon={<Trash2 className="w-4 h-4" />}
          >
            {language === 'hi' ? 'हटाएं' : language === 'mr' ? 'टाकून द्या' : 'Discard'}
          </Button>

          {/* Later button */}
          <Button
            onClick={handleLater}
            disabled={loading}
            variant="secondary"
            icon={<Clock className="w-4 h-4" />}
          >
            {language === 'hi' ? 'बाद में' : language === 'mr' ? 'नंतर' : 'Later'}
          </Button>

          {/* Add button */}
          <Button
            onClick={handleAdd}
            disabled={loading}
            loading={loading}
            variant="primary"
            fullWidth
            icon={<Check className="w-5 h-5" />}
          >
            {loading 
              ? (language === 'hi' ? 'जोड़ रहे हैं...' : language === 'mr' ? 'जोडत आहे...' : 'Adding...')
              : (language === 'hi' ? 'जोड़ें' : language === 'mr' ? 'जोडा' : 'Add')}
          </Button>
        </div>
      </div>
    </Card>
  );
}
