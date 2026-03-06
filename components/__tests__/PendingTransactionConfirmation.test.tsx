/**
 * Unit tests for PendingTransactionConfirmation Component
 * 
 * Feature: click-to-add-transactions
 * Tests specific examples, edge cases, and UI behavior.
 * 
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import PendingTransactionConfirmation from '../PendingTransactionConfirmation';
import type { InferredTransaction, Language } from '@/lib/types';
import * as pendingStore from '@/lib/pending-transaction-store';

// Mock the pending transaction store
jest.mock('@/lib/pending-transaction-store');

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    clear: () => {
      store = {};
    },
    removeItem: (key: string) => {
      delete store[key];
    },
  };
})();

if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'localStorage', {
    value: localStorageMock,
  });
}

describe('PendingTransactionConfirmation - Unit Tests', () => {
  beforeEach(() => {
    localStorageMock.clear();
    jest.clearAllMocks();
  });

  describe('Empty state rendering - Requirements 4.4', () => {
    it('should display "No Pending Transactions" message when list is empty', () => {
      (pendingStore.getLocalPendingTransactions as jest.Mock).mockReturnValue([]);

      render(
        <PendingTransactionConfirmation
          language="en"
        />
      );

      expect(screen.getByText(/No Pending Transactions/i)).toBeInTheDocument();
      expect(screen.getByText(/Upload a receipt or CSV file to get started/i)).toBeInTheDocument();
    });

    it('should display receipt icon in empty state', () => {
      (pendingStore.getLocalPendingTransactions as jest.Mock).mockReturnValue([]);

      const { container } = render(
        <PendingTransactionConfirmation
          language="en"
        />
      );

      // Check for icon container
      const iconContainer = container.querySelector('.bg-gray-100');
      expect(iconContainer).toBeInTheDocument();
    });

    it('should display empty message in Hindi', () => {
      (pendingStore.getLocalPendingTransactions as jest.Mock).mockReturnValue([]);

      render(
        <PendingTransactionConfirmation
          language="hi"
        />
      );

      expect(screen.getByText(/कोई लंबित लेनदेन नहीं/i)).toBeInTheDocument();
      expect(screen.getByText(/रसीद या CSV फ़ाइल अपलोड करें/i)).toBeInTheDocument();
    });

    it('should display empty message in Marathi', () => {
      (pendingStore.getLocalPendingTransactions as jest.Mock).mockReturnValue([]);

      render(
        <PendingTransactionConfirmation
          language="mr"
        />
      );

      expect(screen.getByText(/कोणतेही प्रलंबित व्यवहार नाहीत/i)).toBeInTheDocument();
      expect(screen.getByText(/पावती किंवा CSV फाइल अपलोड करा/i)).toBeInTheDocument();
    });

    it('should not display action buttons in empty state', () => {
      (pendingStore.getLocalPendingTransactions as jest.Mock).mockReturnValue([]);

      render(
        <PendingTransactionConfirmation
          language="en"
        />
      );

      expect(screen.queryByText(/Add/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/Later/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/Discard/i)).not.toBeInTheDocument();
    });
  });

  describe('Rendering with pending transaction - Requirements 4.1, 4.2', () => {
    const mockTransaction: InferredTransaction = {
      id: 'txn-1',
      date: '2024-01-15',
      type: 'expense',
      vendor_name: 'Reliance Fresh',
      category: 'inventory',
      amount: 2464.00,
      source: 'receipt',
      created_at: '2024-01-15T10:30:00.000Z',
    };

    it('should display transaction details correctly', () => {
      (pendingStore.getLocalPendingTransactions as jest.Mock).mockReturnValue([mockTransaction]);

      render(
        <PendingTransactionConfirmation
          language="en"
        />
      );

      expect(screen.getByText(/Review Transaction/i)).toBeInTheDocument();
      expect(screen.getByText(/Reliance Fresh/i)).toBeInTheDocument();
      expect(screen.getByText(/₹2,464.00/i)).toBeInTheDocument();
      expect(screen.getByText(/Expense/i)).toBeInTheDocument();
      expect(screen.getByText(/inventory/i)).toBeInTheDocument();
    });

    it('should display date in localized format', () => {
      (pendingStore.getLocalPendingTransactions as jest.Mock).mockReturnValue([mockTransaction]);

      const { container } = render(
        <PendingTransactionConfirmation
          language="en"
        />
      );

      // Date should be formatted (15 January 2024 or similar)
      expect(container.textContent).toContain('15');
      expect(container.textContent).toContain('January');
      expect(container.textContent).toContain('2024');
    });

    it('should display all action buttons', () => {
      (pendingStore.getLocalPendingTransactions as jest.Mock).mockReturnValue([mockTransaction]);

      render(
        <PendingTransactionConfirmation
          language="en"
        />
      );

      expect(screen.getByText(/^Add$/)).toBeInTheDocument();
      expect(screen.getByText(/^Later$/)).toBeInTheDocument();
      expect(screen.getByText(/^Discard$/)).toBeInTheDocument();
      expect(screen.getByText(/^Edit$/)).toBeInTheDocument();
    });

    it('should display transaction without vendor name', () => {
      const transactionWithoutVendor: InferredTransaction = {
        ...mockTransaction,
        vendor_name: undefined,
      };

      (pendingStore.getLocalPendingTransactions as jest.Mock).mockReturnValue([transactionWithoutVendor]);

      render(
        <PendingTransactionConfirmation
          language="en"
        />
      );

      // Vendor field should not be displayed when not in edit mode
      expect(screen.queryByText(/Vendor/i)).not.toBeInTheDocument();
    });

    it('should display transaction without category', () => {
      const transactionWithoutCategory: InferredTransaction = {
        ...mockTransaction,
        category: undefined,
      };

      (pendingStore.getLocalPendingTransactions as jest.Mock).mockReturnValue([transactionWithoutCategory]);

      render(
        <PendingTransactionConfirmation
          language="en"
        />
      );

      // Category field should not be displayed when not in edit mode
      expect(screen.queryByText(/Category/i)).not.toBeInTheDocument();
    });

    it('should display sale transaction with correct styling', () => {
      const saleTransaction: InferredTransaction = {
        ...mockTransaction,
        type: 'sale',
        amount: 5000,
      };

      (pendingStore.getLocalPendingTransactions as jest.Mock).mockReturnValue([saleTransaction]);

      const { container } = render(
        <PendingTransactionConfirmation
          language="en"
        />
      );

      expect(screen.getByText(/Sale/i)).toBeInTheDocument();
      
      // Check for green styling (sale)
      const saleTag = container.querySelector('.bg-green-100');
      expect(saleTag).toBeInTheDocument();
    });

    it('should display expense transaction with correct styling', () => {
      (pendingStore.getLocalPendingTransactions as jest.Mock).mockReturnValue([mockTransaction]);

      const { container } = render(
        <PendingTransactionConfirmation
          language="en"
        />
      );

      expect(screen.getByText(/Expense/i)).toBeInTheDocument();
      
      // Check for red styling (expense)
      const expenseTag = container.querySelector('.bg-red-100');
      expect(expenseTag).toBeInTheDocument();
    });
  });

  describe('Transaction counter display - Requirements 14.1, 14.2', () => {
    it('should display counter "1 of 1" for single transaction', () => {
      const mockTransaction: InferredTransaction = {
        id: 'txn-1',
        date: '2024-01-15',
        type: 'expense',
        amount: 2464.00,
        source: 'receipt',
        created_at: '2024-01-15T10:30:00.000Z',
      };

      (pendingStore.getLocalPendingTransactions as jest.Mock).mockReturnValue([mockTransaction]);

      const { container } = render(
        <PendingTransactionConfirmation
          language="en"
        />
      );

      expect(container.textContent).toContain('1');
      expect(container.textContent).toContain('of');
      expect(container.textContent).toContain('1');
    });

    it('should display counter "1 of 3" for first of multiple transactions', () => {
      const mockTransactions: InferredTransaction[] = [
        {
          id: 'txn-1',
          date: '2024-01-15',
          type: 'expense',
          amount: 2464.00,
          source: 'receipt',
          created_at: '2024-01-15T10:30:00.000Z',
        },
        {
          id: 'txn-2',
          date: '2024-01-16',
          type: 'sale',
          amount: 5000.00,
          source: 'csv',
          created_at: '2024-01-16T10:30:00.000Z',
        },
        {
          id: 'txn-3',
          date: '2024-01-17',
          type: 'expense',
          amount: 1500.00,
          source: 'receipt',
          created_at: '2024-01-17T10:30:00.000Z',
        },
      ];

      (pendingStore.getLocalPendingTransactions as jest.Mock).mockReturnValue(mockTransactions);

      const { container } = render(
        <PendingTransactionConfirmation
          language="en"
        />
      );

      expect(container.textContent).toContain('1');
      expect(container.textContent).toContain('of');
      expect(container.textContent).toContain('3');
    });

    it('should display counter in Hindi', () => {
      const mockTransaction: InferredTransaction = {
        id: 'txn-1',
        date: '2024-01-15',
        type: 'expense',
        amount: 2464.00,
        source: 'receipt',
        created_at: '2024-01-15T10:30:00.000Z',
      };

      (pendingStore.getLocalPendingTransactions as jest.Mock).mockReturnValue([mockTransaction]);

      const { container } = render(
        <PendingTransactionConfirmation
          language="hi"
        />
      );

      expect(container.textContent).toContain('का');
    });

    it('should display counter in Marathi', () => {
      const mockTransaction: InferredTransaction = {
        id: 'txn-1',
        date: '2024-01-15',
        type: 'expense',
        amount: 2464.00,
        source: 'receipt',
        created_at: '2024-01-15T10:30:00.000Z',
      };

      (pendingStore.getLocalPendingTransactions as jest.Mock).mockReturnValue([mockTransaction]);

      const { container } = render(
        <PendingTransactionConfirmation
          language="mr"
        />
      );

      expect(container.textContent).toContain('चा');
    });
  });

  describe('Source indicator display - Requirements 4.5', () => {
    it('should display receipt badge for receipt source', () => {
      const receiptTransaction: InferredTransaction = {
        id: 'txn-1',
        date: '2024-01-15',
        type: 'expense',
        amount: 2464.00,
        source: 'receipt',
        created_at: '2024-01-15T10:30:00.000Z',
      };

      (pendingStore.getLocalPendingTransactions as jest.Mock).mockReturnValue([receiptTransaction]);

      const { container } = render(
        <PendingTransactionConfirmation
          language="en"
        />
      );

      expect(screen.getByText(/Receipt/i)).toBeInTheDocument();
      
      // Check for blue styling (receipt)
      const badge = container.querySelector('.bg-blue-100');
      expect(badge).toBeInTheDocument();
    });

    it('should display CSV badge for CSV source', () => {
      const csvTransaction: InferredTransaction = {
        id: 'txn-1',
        date: '2024-01-15',
        type: 'expense',
        amount: 2464.00,
        source: 'csv',
        created_at: '2024-01-15T10:30:00.000Z',
      };

      (pendingStore.getLocalPendingTransactions as jest.Mock).mockReturnValue([csvTransaction]);

      const { container } = render(
        <PendingTransactionConfirmation
          language="en"
        />
      );

      expect(screen.getByText(/CSV/i)).toBeInTheDocument();
      
      // Check for green styling (CSV)
      const badge = container.querySelector('.bg-green-100');
      expect(badge).toBeInTheDocument();
    });

    it('should display localized receipt badge in Hindi', () => {
      const receiptTransaction: InferredTransaction = {
        id: 'txn-1',
        date: '2024-01-15',
        type: 'expense',
        amount: 2464.00,
        source: 'receipt',
        created_at: '2024-01-15T10:30:00.000Z',
      };

      (pendingStore.getLocalPendingTransactions as jest.Mock).mockReturnValue([receiptTransaction]);

      render(
        <PendingTransactionConfirmation
          language="hi"
        />
      );

      expect(screen.getByText(/रसीद/i)).toBeInTheDocument();
    });

    it('should display localized receipt badge in Marathi', () => {
      const receiptTransaction: InferredTransaction = {
        id: 'txn-1',
        date: '2024-01-15',
        type: 'expense',
        amount: 2464.00,
        source: 'receipt',
        created_at: '2024-01-15T10:30:00.000Z',
      };

      (pendingStore.getLocalPendingTransactions as jest.Mock).mockReturnValue([receiptTransaction]);

      render(
        <PendingTransactionConfirmation
          language="mr"
        />
      );

      expect(screen.getByText(/पावती/i)).toBeInTheDocument();
    });
  });

  describe('Field editing functionality - Requirements 4.3', () => {
    const mockTransaction: InferredTransaction = {
      id: 'txn-1',
      date: '2024-01-15',
      type: 'expense',
      vendor_name: 'Reliance Fresh',
      category: 'inventory',
      amount: 2464.00,
      source: 'receipt',
      created_at: '2024-01-15T10:30:00.000Z',
    };

    it('should show edit button initially', () => {
      (pendingStore.getLocalPendingTransactions as jest.Mock).mockReturnValue([mockTransaction]);

      render(
        <PendingTransactionConfirmation
          language="en"
        />
      );

      expect(screen.getByText(/^Edit$/)).toBeInTheDocument();
    });

    it('should switch to edit mode when edit button is clicked', () => {
      (pendingStore.getLocalPendingTransactions as jest.Mock).mockReturnValue([mockTransaction]);

      render(
        <PendingTransactionConfirmation
          language="en"
        />
      );

      const editButton = screen.getByText(/^Edit$/);
      fireEvent.click(editButton);

      // Should show Cancel button instead of Edit
      expect(screen.getByText(/Cancel/i)).toBeInTheDocument();
      expect(screen.queryByText(/^Edit$/)).not.toBeInTheDocument();
    });

    it('should display editable date field in edit mode', () => {
      (pendingStore.getLocalPendingTransactions as jest.Mock).mockReturnValue([mockTransaction]);

      render(
        <PendingTransactionConfirmation
          language="en"
        />
      );

      const editButton = screen.getByText(/^Edit$/);
      fireEvent.click(editButton);

      // Should show date input
      const dateInput = screen.getByDisplayValue('2024-01-15');
      expect(dateInput).toBeInTheDocument();
      expect(dateInput).toHaveAttribute('type', 'date');
    });

    it('should display editable amount field in edit mode', () => {
      (pendingStore.getLocalPendingTransactions as jest.Mock).mockReturnValue([mockTransaction]);

      render(
        <PendingTransactionConfirmation
          language="en"
        />
      );

      const editButton = screen.getByText(/^Edit$/);
      fireEvent.click(editButton);

      // Should show amount input
      const amountInput = screen.getByDisplayValue('2464');
      expect(amountInput).toBeInTheDocument();
      expect(amountInput).toHaveAttribute('type', 'number');
    });

    it('should display editable type dropdown in edit mode', () => {
      (pendingStore.getLocalPendingTransactions as jest.Mock).mockReturnValue([mockTransaction]);

      render(
        <PendingTransactionConfirmation
          language="en"
        />
      );

      const editButton = screen.getByText(/^Edit$/);
      fireEvent.click(editButton);

      // Should show type select
      const typeSelect = screen.getByDisplayValue(/Expense/i);
      expect(typeSelect).toBeInTheDocument();
      expect(typeSelect.tagName).toBe('SELECT');
    });

    it('should display editable vendor field in edit mode', () => {
      (pendingStore.getLocalPendingTransactions as jest.Mock).mockReturnValue([mockTransaction]);

      render(
        <PendingTransactionConfirmation
          language="en"
        />
      );

      const editButton = screen.getByText(/^Edit$/);
      fireEvent.click(editButton);

      // Should show vendor input
      const vendorInput = screen.getByDisplayValue('Reliance Fresh');
      expect(vendorInput).toBeInTheDocument();
      expect(vendorInput).toHaveAttribute('type', 'text');
    });

    it('should display editable category field in edit mode', () => {
      (pendingStore.getLocalPendingTransactions as jest.Mock).mockReturnValue([mockTransaction]);

      render(
        <PendingTransactionConfirmation
          language="en"
        />
      );

      const editButton = screen.getByText(/^Edit$/);
      fireEvent.click(editButton);

      // Should show category input
      const categoryInput = screen.getByDisplayValue('inventory');
      expect(categoryInput).toBeInTheDocument();
      expect(categoryInput).toHaveAttribute('type', 'text');
    });

    it('should allow editing amount value', () => {
      (pendingStore.getLocalPendingTransactions as jest.Mock).mockReturnValue([mockTransaction]);

      render(
        <PendingTransactionConfirmation
          language="en"
        />
      );

      const editButton = screen.getByText(/^Edit$/);
      fireEvent.click(editButton);

      const amountInput = screen.getByDisplayValue('2464') as HTMLInputElement;
      fireEvent.change(amountInput, { target: { value: '3000' } });

      expect(amountInput.value).toBe('3000');
    });

    it('should allow editing vendor name', () => {
      (pendingStore.getLocalPendingTransactions as jest.Mock).mockReturnValue([mockTransaction]);

      render(
        <PendingTransactionConfirmation
          language="en"
        />
      );

      const editButton = screen.getByText(/^Edit$/);
      fireEvent.click(editButton);

      const vendorInput = screen.getByDisplayValue('Reliance Fresh') as HTMLInputElement;
      fireEvent.change(vendorInput, { target: { value: 'Big Bazaar' } });

      expect(vendorInput.value).toBe('Big Bazaar');
    });

    it('should allow changing transaction type', () => {
      (pendingStore.getLocalPendingTransactions as jest.Mock).mockReturnValue([mockTransaction]);

      render(
        <PendingTransactionConfirmation
          language="en"
        />
      );

      const editButton = screen.getByText(/^Edit$/);
      fireEvent.click(editButton);

      const typeSelect = screen.getByDisplayValue(/Expense/i) as HTMLSelectElement;
      fireEvent.change(typeSelect, { target: { value: 'sale' } });

      expect(typeSelect.value).toBe('sale');
    });

    it('should reset fields when cancel is clicked', () => {
      (pendingStore.getLocalPendingTransactions as jest.Mock).mockReturnValue([mockTransaction]);

      render(
        <PendingTransactionConfirmation
          language="en"
        />
      );

      // Enter edit mode
      const editButton = screen.getByText(/^Edit$/);
      fireEvent.click(editButton);

      // Change amount
      const amountInput = screen.getByDisplayValue('2464') as HTMLInputElement;
      fireEvent.change(amountInput, { target: { value: '5000' } });
      expect(amountInput.value).toBe('5000');

      // Click cancel
      const cancelButton = screen.getByText(/Cancel/i);
      fireEvent.click(cancelButton);

      // Should exit edit mode
      expect(screen.getByText(/^Edit$/)).toBeInTheDocument();
      expect(screen.queryByText(/Cancel/i)).not.toBeInTheDocument();

      // Re-enter edit mode to check if value was reset
      fireEvent.click(screen.getByText(/^Edit$/));
      const resetAmountInput = screen.getByDisplayValue('2464');
      expect(resetAmountInput).toBeInTheDocument();
    });

    it('should show vendor and category fields in edit mode even if not present', () => {
      const transactionWithoutOptionalFields: InferredTransaction = {
        id: 'txn-1',
        date: '2024-01-15',
        type: 'expense',
        amount: 2464.00,
        source: 'receipt',
        created_at: '2024-01-15T10:30:00.000Z',
      };

      (pendingStore.getLocalPendingTransactions as jest.Mock).mockReturnValue([transactionWithoutOptionalFields]);

      render(
        <PendingTransactionConfirmation
          language="en"
        />
      );

      // Initially vendor and category should not be visible
      expect(screen.queryByText(/Vendor/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/Category/i)).not.toBeInTheDocument();

      // Enter edit mode
      const editButton = screen.getByText(/^Edit$/);
      fireEvent.click(editButton);

      // Now vendor and category fields should be visible
      expect(screen.getByText(/Vendor/i)).toBeInTheDocument();
      expect(screen.getByText(/Category/i)).toBeInTheDocument();
    });
  });

  describe('Button interactions - Requirements 4.2', () => {
    const mockTransaction: InferredTransaction = {
      id: 'txn-1',
      date: '2024-01-15',
      type: 'expense',
      vendor_name: 'Reliance Fresh',
      category: 'inventory',
      amount: 2464.00,
      source: 'receipt',
      created_at: '2024-01-15T10:30:00.000Z',
    };

    it('should call onAdd callback when Add button is clicked', async () => {
      const onAddMock = jest.fn();
      (pendingStore.getLocalPendingTransactions as jest.Mock).mockReturnValue([mockTransaction]);
      (pendingStore.removePendingTransaction as jest.Mock).mockReturnValue(undefined);

      render(
        <PendingTransactionConfirmation
          language="en"
          onAdd={onAddMock}
        />
      );

      const addButton = screen.getByText(/^Add$/);
      fireEvent.click(addButton);

      await waitFor(() => {
        expect(onAddMock).toHaveBeenCalledWith(expect.objectContaining({
          id: 'txn-1',
          date: '2024-01-15',
          type: 'expense',
          amount: 2464.00,
        }));
      });
    });

    it('should call onLater callback when Later button is clicked', async () => {
      const onLaterMock = jest.fn();
      (pendingStore.getLocalPendingTransactions as jest.Mock).mockReturnValue([mockTransaction]);
      (pendingStore.updatePendingTransaction as jest.Mock).mockReturnValue(undefined);

      render(
        <PendingTransactionConfirmation
          language="en"
          onLater={onLaterMock}
        />
      );

      const laterButton = screen.getByText(/^Later$/);
      fireEvent.click(laterButton);

      await waitFor(() => {
        expect(onLaterMock).toHaveBeenCalledWith(mockTransaction);
      });
    });

    it('should call onDiscard callback when Discard button is clicked', async () => {
      const onDiscardMock = jest.fn();
      (pendingStore.getLocalPendingTransactions as jest.Mock).mockReturnValue([mockTransaction]);
      (pendingStore.removePendingTransaction as jest.Mock).mockReturnValue(undefined);

      render(
        <PendingTransactionConfirmation
          language="en"
          onDiscard={onDiscardMock}
        />
      );

      const discardButton = screen.getByText(/^Discard$/);
      fireEvent.click(discardButton);

      await waitFor(() => {
        expect(onDiscardMock).toHaveBeenCalledWith(mockTransaction);
      });
    });

    it('should remove transaction from store when Add is clicked', async () => {
      (pendingStore.getLocalPendingTransactions as jest.Mock).mockReturnValue([mockTransaction]);
      (pendingStore.removePendingTransaction as jest.Mock).mockReturnValue(undefined);

      render(
        <PendingTransactionConfirmation
          language="en"
        />
      );

      const addButton = screen.getByText(/^Add$/);
      fireEvent.click(addButton);

      await waitFor(() => {
        expect(pendingStore.removePendingTransaction).toHaveBeenCalledWith('txn-1');
      });
    });

    it('should update transaction with deferred_at when Later is clicked', async () => {
      (pendingStore.getLocalPendingTransactions as jest.Mock).mockReturnValue([mockTransaction]);
      (pendingStore.updatePendingTransaction as jest.Mock).mockReturnValue(undefined);

      render(
        <PendingTransactionConfirmation
          language="en"
        />
      );

      const laterButton = screen.getByText(/^Later$/);
      fireEvent.click(laterButton);

      await waitFor(() => {
        expect(pendingStore.updatePendingTransaction).toHaveBeenCalledWith(
          'txn-1',
          expect.objectContaining({
            deferred_at: expect.any(String),
          })
        );
      });
    });

    it('should remove transaction from store when Discard is clicked', async () => {
      (pendingStore.getLocalPendingTransactions as jest.Mock).mockReturnValue([mockTransaction]);
      (pendingStore.removePendingTransaction as jest.Mock).mockReturnValue(undefined);

      render(
        <PendingTransactionConfirmation
          language="en"
        />
      );

      const discardButton = screen.getByText(/^Discard$/);
      fireEvent.click(discardButton);

      await waitFor(() => {
        expect(pendingStore.removePendingTransaction).toHaveBeenCalledWith('txn-1');
      });
    });

    it('should show loading state when Add button is clicked', async () => {
      const onAddMock = jest.fn().mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));
      (pendingStore.getLocalPendingTransactions as jest.Mock).mockReturnValue([mockTransaction]);
      (pendingStore.removePendingTransaction as jest.Mock).mockReturnValue(undefined);

      render(
        <PendingTransactionConfirmation
          language="en"
          onAdd={onAddMock}
        />
      );

      const addButton = screen.getByText(/^Add$/);
      fireEvent.click(addButton);

      // Should show loading text
      await waitFor(() => {
        expect(screen.getByText(/Adding.../i)).toBeInTheDocument();
      });
    });

    it('should disable buttons during loading', async () => {
      const onAddMock = jest.fn().mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));
      (pendingStore.getLocalPendingTransactions as jest.Mock).mockReturnValue([mockTransaction]);
      (pendingStore.removePendingTransaction as jest.Mock).mockReturnValue(undefined);

      render(
        <PendingTransactionConfirmation
          language="en"
          onAdd={onAddMock}
        />
      );

      const addButton = screen.getByText(/^Add$/);
      fireEvent.click(addButton);

      await waitFor(() => {
        const laterButton = screen.getByText(/^Later$/);
        const discardButton = screen.getByText(/^Discard$/);
        
        expect(laterButton).toBeDisabled();
        expect(discardButton).toBeDisabled();
      });
    });

    it('should pass edited values to onAdd callback', async () => {
      const onAddMock = jest.fn();
      (pendingStore.getLocalPendingTransactions as jest.Mock).mockReturnValue([mockTransaction]);
      (pendingStore.removePendingTransaction as jest.Mock).mockReturnValue(undefined);

      render(
        <PendingTransactionConfirmation
          language="en"
          onAdd={onAddMock}
        />
      );

      // Enter edit mode
      const editButton = screen.getByText(/^Edit$/);
      fireEvent.click(editButton);

      // Edit amount
      const amountInput = screen.getByDisplayValue('2464') as HTMLInputElement;
      fireEvent.change(amountInput, { target: { value: '3000' } });

      // Edit vendor
      const vendorInput = screen.getByDisplayValue('Reliance Fresh') as HTMLInputElement;
      fireEvent.change(vendorInput, { target: { value: 'Big Bazaar' } });

      // Click Add
      const addButton = screen.getByText(/^Add$/);
      fireEvent.click(addButton);

      await waitFor(() => {
        expect(onAddMock).toHaveBeenCalledWith(expect.objectContaining({
          amount: 3000,
          vendor_name: 'Big Bazaar',
        }));
      });
    });

    it('should reload transactions after Add action', async () => {
      const mockTransactions = [mockTransaction];
      (pendingStore.getLocalPendingTransactions as jest.Mock)
        .mockReturnValueOnce(mockTransactions)
        .mockReturnValueOnce([]); // Empty after add
      (pendingStore.removePendingTransaction as jest.Mock).mockReturnValue(undefined);

      render(
        <PendingTransactionConfirmation
          language="en"
        />
      );

      const addButton = screen.getByText(/^Add$/);
      fireEvent.click(addButton);

      await waitFor(() => {
        // Should call getLocalPendingTransactions again
        expect(pendingStore.getLocalPendingTransactions).toHaveBeenCalledTimes(2);
      });
    });

    it('should exit edit mode after Later action', async () => {
      (pendingStore.getLocalPendingTransactions as jest.Mock).mockReturnValue([mockTransaction]);
      (pendingStore.updatePendingTransaction as jest.Mock).mockReturnValue(undefined);

      render(
        <PendingTransactionConfirmation
          language="en"
        />
      );

      // Enter edit mode
      const editButton = screen.getByText(/^Edit$/);
      fireEvent.click(editButton);
      expect(screen.getByText(/Cancel/i)).toBeInTheDocument();

      // Click Later
      const laterButton = screen.getByText(/^Later$/);
      fireEvent.click(laterButton);

      await waitFor(() => {
        // Should exit edit mode
        expect(screen.queryByText(/Cancel/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('Multi-language support', () => {
    const mockTransaction: InferredTransaction = {
      id: 'txn-1',
      date: '2024-01-15',
      type: 'expense',
      vendor_name: 'Reliance Fresh',
      category: 'inventory',
      amount: 2464.00,
      source: 'receipt',
      created_at: '2024-01-15T10:30:00.000Z',
    };

    it('should display Hindi labels', () => {
      (pendingStore.getLocalPendingTransactions as jest.Mock).mockReturnValue([mockTransaction]);

      render(
        <PendingTransactionConfirmation
          language="hi"
        />
      );

      expect(screen.getByText(/लेनदेन की समीक्षा करें/i)).toBeInTheDocument();
      expect(screen.getByText(/तिथि/i)).toBeInTheDocument();
      expect(screen.getByText(/राशि/i)).toBeInTheDocument();
      expect(screen.getByText(/प्रकार/i)).toBeInTheDocument();
      expect(screen.getByText(/जोड़ें/i)).toBeInTheDocument();
      expect(screen.getByText(/बाद में/i)).toBeInTheDocument();
      expect(screen.getByText(/हटाएं/i)).toBeInTheDocument();
    });

    it('should display Marathi labels', () => {
      (pendingStore.getLocalPendingTransactions as jest.Mock).mockReturnValue([mockTransaction]);

      render(
        <PendingTransactionConfirmation
          language="mr"
        />
      );

      expect(screen.getByText(/व्यवहाराचे पुनरावलोकन करा/i)).toBeInTheDocument();
      expect(screen.getByText(/तारीख/i)).toBeInTheDocument();
      expect(screen.getByText(/रक्कम/i)).toBeInTheDocument();
      expect(screen.getByText(/प्रकार/i)).toBeInTheDocument();
      expect(screen.getByText(/जोडा/i)).toBeInTheDocument();
      expect(screen.getByText(/नंतर/i)).toBeInTheDocument();
      expect(screen.getByText(/टाकून द्या/i)).toBeInTheDocument();
    });

    it('should display Hindi transaction type labels', () => {
      (pendingStore.getLocalPendingTransactions as jest.Mock).mockReturnValue([mockTransaction]);

      render(
        <PendingTransactionConfirmation
          language="hi"
        />
      );

      expect(screen.getByText(/खर्च/i)).toBeInTheDocument();
    });

    it('should display Marathi transaction type labels', () => {
      (pendingStore.getLocalPendingTransactions as jest.Mock).mockReturnValue([mockTransaction]);

      render(
        <PendingTransactionConfirmation
          language="mr"
        />
      );

      expect(screen.getByText(/खर्च/i)).toBeInTheDocument();
    });

    it('should display Hindi loading text', async () => {
      const onAddMock = jest.fn().mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));
      (pendingStore.getLocalPendingTransactions as jest.Mock).mockReturnValue([mockTransaction]);
      (pendingStore.removePendingTransaction as jest.Mock).mockReturnValue(undefined);

      render(
        <PendingTransactionConfirmation
          language="hi"
          onAdd={onAddMock}
        />
      );

      const addButton = screen.getByText(/जोड़ें/i);
      fireEvent.click(addButton);

      await waitFor(() => {
        expect(screen.getByText(/जोड़ रहे हैं.../i)).toBeInTheDocument();
      });
    });

    it('should display Marathi loading text', async () => {
      const onAddMock = jest.fn().mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));
      (pendingStore.getLocalPendingTransactions as jest.Mock).mockReturnValue([mockTransaction]);
      (pendingStore.removePendingTransaction as jest.Mock).mockReturnValue(undefined);

      render(
        <PendingTransactionConfirmation
          language="mr"
          onAdd={onAddMock}
        />
      );

      const addButton = screen.getByText(/जोडा/i);
      fireEvent.click(addButton);

      await waitFor(() => {
        expect(screen.getByText(/जोडत आहे.../i)).toBeInTheDocument();
      });
    });
  });

  describe('Edge cases and error handling', () => {
    it('should handle transaction with very large amount', () => {
      const largeAmountTransaction: InferredTransaction = {
        id: 'txn-1',
        date: '2024-01-15',
        type: 'sale',
        amount: 9999999.99,
        source: 'csv',
        created_at: '2024-01-15T10:30:00.000Z',
      };

      (pendingStore.getLocalPendingTransactions as jest.Mock).mockReturnValue([largeAmountTransaction]);

      const { container } = render(
        <PendingTransactionConfirmation
          language="en"
        />
      );

      // Should format large amount correctly with Indian number system
      expect(container.textContent).toContain('₹99,99,999.99');
    });

    it('should handle transaction with special characters in vendor name', () => {
      const specialCharTransaction: InferredTransaction = {
        id: 'txn-1',
        date: '2024-01-15',
        type: 'expense',
        vendor_name: "O'Brien & Sons (Pvt.) Ltd.",
        amount: 5000,
        source: 'receipt',
        created_at: '2024-01-15T10:30:00.000Z',
      };

      (pendingStore.getLocalPendingTransactions as jest.Mock).mockReturnValue([specialCharTransaction]);

      render(
        <PendingTransactionConfirmation
          language="en"
        />
      );

      expect(screen.getByText("O'Brien & Sons (Pvt.) Ltd.")).toBeInTheDocument();
    });

    it('should handle transaction with decimal amount', () => {
      const decimalTransaction: InferredTransaction = {
        id: 'txn-1',
        date: '2024-01-15',
        type: 'expense',
        amount: 123.45,
        source: 'receipt',
        created_at: '2024-01-15T10:30:00.000Z',
      };

      (pendingStore.getLocalPendingTransactions as jest.Mock).mockReturnValue([decimalTransaction]);

      render(
        <PendingTransactionConfirmation
          language="en"
        />
      );

      expect(screen.getByText(/₹123.45/i)).toBeInTheDocument();
    });

    it('should handle transaction with future date', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 5);

      const futureTransaction: InferredTransaction = {
        id: 'txn-1',
        date: futureDate.toISOString().split('T')[0],
        type: 'expense',
        amount: 1000,
        source: 'csv',
        created_at: '2024-01-15T10:30:00.000Z',
      };

      (pendingStore.getLocalPendingTransactions as jest.Mock).mockReturnValue([futureTransaction]);

      const { container } = render(
        <PendingTransactionConfirmation
          language="en"
        />
      );

      // Should display the future date without error
      expect(container).toBeInTheDocument();
    });

    it('should handle empty vendor name gracefully', () => {
      const emptyVendorTransaction: InferredTransaction = {
        id: 'txn-1',
        date: '2024-01-15',
        type: 'expense',
        vendor_name: '',
        amount: 1000,
        source: 'receipt',
        created_at: '2024-01-15T10:30:00.000Z',
      };

      (pendingStore.getLocalPendingTransactions as jest.Mock).mockReturnValue([emptyVendorTransaction]);

      render(
        <PendingTransactionConfirmation
          language="en"
        />
      );

      // Should render without crashing
      expect(screen.getByText(/Review Transaction/i)).toBeInTheDocument();
    });

    it('should handle error in onAdd callback gracefully', async () => {
      const onAddMock = jest.fn().mockRejectedValue(new Error('Network error'));
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      const mockTransaction: InferredTransaction = {
        id: 'txn-1',
        date: '2024-01-15',
        type: 'expense',
        amount: 1000,
        source: 'receipt',
        created_at: '2024-01-15T10:30:00.000Z',
      };

      (pendingStore.getLocalPendingTransactions as jest.Mock).mockReturnValue([mockTransaction]);
      (pendingStore.removePendingTransaction as jest.Mock).mockReturnValue(undefined);

      render(
        <PendingTransactionConfirmation
          language="en"
          onAdd={onAddMock}
        />
      );

      const addButton = screen.getByText(/^Add$/);
      fireEvent.click(addButton);

      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to add transaction:', expect.any(Error));
      });

      consoleErrorSpy.mockRestore();
    });

    it('should handle multiple rapid button clicks', async () => {
      const onAddMock = jest.fn();
      const mockTransaction: InferredTransaction = {
        id: 'txn-1',
        date: '2024-01-15',
        type: 'expense',
        amount: 1000,
        source: 'receipt',
        created_at: '2024-01-15T10:30:00.000Z',
      };

      (pendingStore.getLocalPendingTransactions as jest.Mock).mockReturnValue([mockTransaction]);
      (pendingStore.removePendingTransaction as jest.Mock).mockReturnValue(undefined);

      render(
        <PendingTransactionConfirmation
          language="en"
          onAdd={onAddMock}
        />
      );

      const addButton = screen.getByText(/^Add$/);
      
      // Click multiple times rapidly
      fireEvent.click(addButton);
      fireEvent.click(addButton);
      fireEvent.click(addButton);

      await waitFor(() => {
        // Should only call once due to loading state
        expect(onAddMock).toHaveBeenCalledTimes(1);
      });
    });

    it('should handle index out of bounds gracefully', () => {
      (pendingStore.getLocalPendingTransactions as jest.Mock).mockReturnValue([]);

      const { container } = render(
        <PendingTransactionConfirmation
          language="en"
        />
      );

      // Should show empty state instead of crashing
      expect(screen.getByText(/No Pending Transactions/i)).toBeInTheDocument();
    });
  });

  describe('Responsive layout', () => {
    const mockTransaction: InferredTransaction = {
      id: 'txn-1',
      date: '2024-01-15',
      type: 'expense',
      vendor_name: 'Test Vendor',
      amount: 1000,
      source: 'receipt',
      created_at: '2024-01-15T10:30:00.000Z',
    };

    it('should render with responsive container classes', () => {
      (pendingStore.getLocalPendingTransactions as jest.Mock).mockReturnValue([mockTransaction]);

      const { container } = render(
        <PendingTransactionConfirmation
          language="en"
        />
      );

      // Check for rounded corners and shadow
      const mainContainer = container.querySelector('.rounded-xl.shadow-sm');
      expect(mainContainer).toBeInTheDocument();
    });

    it('should display header with gradient background', () => {
      (pendingStore.getLocalPendingTransactions as jest.Mock).mockReturnValue([mockTransaction]);

      const { container } = render(
        <PendingTransactionConfirmation
          language="en"
        />
      );

      const header = container.querySelector('.bg-gradient-to-r');
      expect(header).toBeInTheDocument();
    });

    it('should display action buttons in flex layout', () => {
      (pendingStore.getLocalPendingTransactions as jest.Mock).mockReturnValue([mockTransaction]);

      const { container } = render(
        <PendingTransactionConfirmation
          language="en"
        />
      );

      const buttonContainer = container.querySelector('.flex.gap-3');
      expect(buttonContainer).toBeInTheDocument();
    });
  });
});
