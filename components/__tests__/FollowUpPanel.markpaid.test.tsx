/**
 * Unit Tests for Follow-Up Panel - Mark as Paid Functionality
 * 
 * @jest-environment jsdom
 * 
 * Feature: udhaar-follow-up-helper
 * 
 * Tests:
 * - Button click updates credit entry
 * - localStorage update
 * - DynamoDB sync marking
 * - Credit removal from UI
 * - Historical data preservation
 * 
 * Requirements: 8.1, 8.2, 8.3, 8.4, 8.5
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import userEvent from '@testing-library/user-event';
import FollowUpPanel from '../FollowUpPanel';
import type { CreditEntry } from '@/lib/types';

// Mock dependencies
jest.mock('@/lib/credit-manager');
jest.mock('@/lib/whatsapp-link-generator');
jest.mock('@/lib/reminder-tracker');

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock fetch
global.fetch = jest.fn();

describe('FollowUpPanel - Mark as Paid Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.clear();
    
    // Mock getOverdueCredits to return credits with calculated fields
    const { getOverdueCredits } = require('@/lib/credit-manager');
    getOverdueCredits.mockImplementation((credits: CreditEntry[]) => {
      return credits
        .filter(c => !c.isPaid)
        .map(c => ({
          ...c,
          daysOverdue: Math.max(0, Math.floor((Date.now() - new Date(c.dueDate).getTime()) / (1000 * 60 * 60 * 24))),
          daysSinceReminder: c.lastReminderAt
            ? Math.floor((Date.now() - new Date(c.lastReminderAt).getTime()) / (1000 * 60 * 60 * 24))
            : null,
        }))
        .filter(c => c.daysOverdue >= 3)
        .sort((a, b) => {
          if (a.daysOverdue !== b.daysOverdue) {
            return b.daysOverdue - a.daysOverdue;
          }
          return b.amount - a.amount;
        });
    });
  });

  // Test: Button click updates credit entry
  it('should update credit entry when "Mark as Paid" button is clicked', async () => {
    // Setup: Create overdue credit
    const credit: CreditEntry = {
      id: 'credit-1',
      userId: 'test-user',
      customerName: 'John Doe',
      phoneNumber: '9876543210',
      amount: 5000,
      dateGiven: '2024-01-01',
      dueDate: '2024-01-10',
      isPaid: false,
      lastReminderAt: '2024-01-15T10:00:00Z',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    };

    localStorageMock.setItem('vyapar-credit-entries', JSON.stringify([credit]));

    // Mock fetch to succeed
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    });

    // Render component
    render(<FollowUpPanel userId="test-user" language="en" overdueThreshold={3} />);

    // Wait for loading
    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
    });

    // Find and click "Mark as Paid" button
    const markPaidButton = screen.getByRole('button', { name: /mark.*paid/i });
    const user = userEvent.setup();
    await user.click(markPaidButton);

    // Verify: Credit entry updated in localStorage
    await waitFor(() => {
      const stored = localStorageMock.getItem('vyapar-credit-entries');
      expect(stored).toBeTruthy();
      
      const credits = JSON.parse(stored!);
      const updatedCredit = credits.find((c: CreditEntry) => c.id === 'credit-1');
      
      expect(updatedCredit).toBeDefined();
      expect(updatedCredit.isPaid).toBe(true);
      expect(updatedCredit.paidDate).toBeDefined();
    });
  });

  // Test: localStorage update
  it('should update localStorage immediately (optimistic update)', async () => {
    // Setup: Create overdue credit
    const credit: CreditEntry = {
      id: 'credit-2',
      userId: 'test-user',
      customerName: 'Jane Smith',
      amount: 3000,
      dateGiven: '2024-01-05',
      dueDate: '2024-01-15',
      isPaid: false,
      createdAt: '2024-01-05T00:00:00Z',
      updatedAt: '2024-01-05T00:00:00Z',
    };

    localStorageMock.setItem('vyapar-credit-entries', JSON.stringify([credit]));

    // Mock fetch to succeed (but delayed)
    (global.fetch as jest.Mock).mockImplementation(() => 
      new Promise(resolve => 
        setTimeout(() => resolve({
          ok: true,
          json: async () => ({ success: true }),
        }), 100)
      )
    );

    // Render component
    render(<FollowUpPanel userId="test-user" language="en" overdueThreshold={3} />);

    // Wait for loading
    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
    });

    // Click "Mark as Paid" button
    const markPaidButton = screen.getByRole('button', { name: /mark.*paid/i });
    const user = userEvent.setup();
    await user.click(markPaidButton);

    // Verify: localStorage updated immediately (before fetch completes)
    await waitFor(() => {
      const stored = localStorageMock.getItem('vyapar-credit-entries');
      const credits = JSON.parse(stored!);
      const updatedCredit = credits.find((c: CreditEntry) => c.id === 'credit-2');
      
      expect(updatedCredit.isPaid).toBe(true);
    }, { timeout: 50 }); // Check within 50ms (before 100ms fetch delay)
  });

  // Test: DynamoDB sync marking
  it('should mark credit for DynamoDB sync', async () => {
    // Setup: Create overdue credit
    const credit: CreditEntry = {
      id: 'credit-3',
      userId: 'test-user',
      customerName: 'Bob Johnson',
      amount: 7500,
      dateGiven: '2024-01-01',
      dueDate: '2024-01-08',
      isPaid: false,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    };

    localStorageMock.setItem('vyapar-credit-entries', JSON.stringify([credit]));

    // Mock fetch to succeed
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    });

    // Render component
    render(<FollowUpPanel userId="test-user" language="en" overdueThreshold={3} />);

    // Wait for loading
    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
    });

    // Click "Mark as Paid" button
    const markPaidButton = screen.getByRole('button', { name: /mark.*paid/i });
    const user = userEvent.setup();
    await user.click(markPaidButton);

    // Verify: Fetch called with correct data
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/credit',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: expect.stringContaining('"isPaid":true'),
        })
      );
    });

    // Verify: Fetch body contains paidDate
    const fetchCall = (global.fetch as jest.Mock).mock.calls[0];
    const body = JSON.parse(fetchCall[1].body);
    expect(body.isPaid).toBe(true);
    expect(body.paidDate).toBeDefined();
    expect(body.userId).toBe('test-user');
    expect(body.id).toBe('credit-3');
  });

  // Test: Credit removal from UI
  it('should remove credit from overdue list after marking as paid', async () => {
    // Setup: Create multiple overdue credits
    const credits: CreditEntry[] = [
      {
        id: 'credit-4',
        userId: 'test-user',
        customerName: 'Alice Brown',
        amount: 2000,
        dateGiven: '2024-01-01',
        dueDate: '2024-01-10',
        isPaid: false,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      },
      {
        id: 'credit-5',
        userId: 'test-user',
        customerName: 'Charlie Davis',
        amount: 4000,
        dateGiven: '2024-01-02',
        dueDate: '2024-01-12',
        isPaid: false,
        createdAt: '2024-01-02T00:00:00Z',
        updatedAt: '2024-01-02T00:00:00Z',
      },
    ];

    localStorageMock.setItem('vyapar-credit-entries', JSON.stringify(credits));

    // Mock fetch to succeed
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    });

    // Render component
    const { rerender } = render(
      <FollowUpPanel userId="test-user" language="en" overdueThreshold={3} />
    );

    // Wait for loading
    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
    });

    // Verify: Both credits displayed
    expect(screen.getByText('Alice Brown')).toBeInTheDocument();
    expect(screen.getByText('Charlie Davis')).toBeInTheDocument();

    // Get initial button count
    const initialButtons = screen.getAllByRole('button', { name: /mark.*paid/i });
    expect(initialButtons.length).toBe(2);

    // Click first "Mark as Paid" button
    const user = userEvent.setup();
    await user.click(initialButtons[0]);

    // Wait for update
    await waitFor(() => {
      const stored = localStorageMock.getItem('vyapar-credit-entries');
      const updatedCredits = JSON.parse(stored!);
      const paidCount = updatedCredits.filter((c: CreditEntry) => c.isPaid).length;
      expect(paidCount).toBe(1);
    });

    // Re-render to reflect changes
    rerender(<FollowUpPanel userId="test-user" language="en" overdueThreshold={3} />);

    // Verify: Only one credit displayed now
    await waitFor(() => {
      const newButtons = screen.queryAllByRole('button', { name: /mark.*paid/i });
      expect(newButtons.length).toBe(1);
    });
  });

  // Test: Historical data preservation
  it('should preserve historical data when marking as paid', async () => {
    // Setup: Create overdue credit with historical data
    const credit: CreditEntry = {
      id: 'credit-6',
      userId: 'test-user',
      customerName: 'David Wilson',
      phoneNumber: '9123456789',
      amount: 6000,
      dateGiven: '2024-01-01',
      dueDate: '2024-01-10',
      isPaid: false,
      lastReminderAt: '2024-01-15T10:00:00Z',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    };

    localStorageMock.setItem('vyapar-credit-entries', JSON.stringify([credit]));

    // Mock fetch to succeed
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    });

    // Render component
    render(<FollowUpPanel userId="test-user" language="en" overdueThreshold={3} />);

    // Wait for loading
    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
    });

    // Click "Mark as Paid" button
    const markPaidButton = screen.getByRole('button', { name: /mark.*paid/i });
    const user = userEvent.setup();
    await user.click(markPaidButton);

    // Verify: Historical data preserved
    await waitFor(() => {
      const stored = localStorageMock.getItem('vyapar-credit-entries');
      const credits = JSON.parse(stored!);
      const updatedCredit = credits.find((c: CreditEntry) => c.id === 'credit-6');
      
      // Historical fields should remain unchanged
      expect(updatedCredit.dateGiven).toBe('2024-01-01');
      expect(updatedCredit.dueDate).toBe('2024-01-10');
      expect(updatedCredit.lastReminderAt).toBe('2024-01-15T10:00:00Z');
      expect(updatedCredit.customerName).toBe('David Wilson');
      expect(updatedCredit.phoneNumber).toBe('9123456789');
      expect(updatedCredit.amount).toBe(6000);
      expect(updatedCredit.createdAt).toBe('2024-01-01T00:00:00Z');
      
      // Only isPaid and paidDate should change
      expect(updatedCredit.isPaid).toBe(true);
      expect(updatedCredit.paidDate).toBeDefined();
    });
  });

  // Test: Offline mode handling
  it('should handle offline mode gracefully', async () => {
    // Setup: Create overdue credit
    const credit: CreditEntry = {
      id: 'credit-7',
      userId: 'test-user',
      customerName: 'Eve Martinez',
      amount: 3500,
      dateGiven: '2024-01-03',
      dueDate: '2024-01-13',
      isPaid: false,
      createdAt: '2024-01-03T00:00:00Z',
      updatedAt: '2024-01-03T00:00:00Z',
    };

    localStorageMock.setItem('vyapar-credit-entries', JSON.stringify([credit]));

    // Mock fetch to fail (offline)
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

    // Render component
    render(<FollowUpPanel userId="test-user" language="en" overdueThreshold={3} />);

    // Wait for loading
    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
    });

    // Click "Mark as Paid" button
    const markPaidButton = screen.getByRole('button', { name: /mark.*paid/i });
    const user = userEvent.setup();
    await user.click(markPaidButton);

    // Verify: Credit still marked as paid in localStorage (offline-first)
    await waitFor(() => {
      const stored = localStorageMock.getItem('vyapar-credit-entries');
      const credits = JSON.parse(stored!);
      const updatedCredit = credits.find((c: CreditEntry) => c.id === 'credit-7');
      
      expect(updatedCredit.isPaid).toBe(true);
      expect(updatedCredit.paidDate).toBeDefined();
    });

    // Verify: No error thrown (graceful degradation)
    expect(screen.queryByText(/error/i)).not.toBeInTheDocument();
  });

  // Test: Multiple languages
  it('should display "Mark as Paid" button in different languages', async () => {
    // Setup: Create overdue credit
    const credit: CreditEntry = {
      id: 'credit-8',
      userId: 'test-user',
      customerName: 'Frank Lee',
      amount: 4500,
      dateGiven: '2024-01-02',
      dueDate: '2024-01-12',
      isPaid: false,
      createdAt: '2024-01-02T00:00:00Z',
      updatedAt: '2024-01-02T00:00:00Z',
    };

    localStorageMock.setItem('vyapar-credit-entries', JSON.stringify([credit]));

    // Test English
    const { rerender } = render(
      <FollowUpPanel userId="test-user" language="en" overdueThreshold={3} />
    );
    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
    });
    
    // Check button exists (don't check exact text as it varies by language)
    let markPaidButtons = screen.getAllByRole('button');
    let hasPaidButton = markPaidButtons.some(btn => 
      btn.getAttribute('aria-label')?.toLowerCase().includes('mark') ||
      btn.getAttribute('aria-label')?.toLowerCase().includes('paid')
    );
    expect(hasPaidButton).toBe(true);

    // Test Hindi
    rerender(<FollowUpPanel userId="test-user" language="hi" overdueThreshold={3} />);
    await waitFor(() => {
      markPaidButtons = screen.getAllByRole('button');
      hasPaidButton = markPaidButtons.some(btn => 
        btn.getAttribute('aria-label')?.toLowerCase().includes('mark') ||
        btn.getAttribute('aria-label')?.toLowerCase().includes('paid')
      );
      expect(hasPaidButton).toBe(true);
    });

    // Test Marathi
    rerender(<FollowUpPanel userId="test-user" language="mr" overdueThreshold={3} />);
    await waitFor(() => {
      markPaidButtons = screen.getAllByRole('button');
      hasPaidButton = markPaidButtons.some(btn => 
        btn.getAttribute('aria-label')?.toLowerCase().includes('mark') ||
        btn.getAttribute('aria-label')?.toLowerCase().includes('paid')
      );
      expect(hasPaidButton).toBe(true);
    });
  });
});
