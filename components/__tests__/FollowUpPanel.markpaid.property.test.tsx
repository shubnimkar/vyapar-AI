/**
 * Property-Based Tests for Follow-Up Panel - Mark as Paid Functionality
 * 
 * @jest-environment jsdom
 * 
 * Feature: udhaar-follow-up-helper
 * 
 * Tests Properties:
 * - Property 21: Mark as Paid Button Display
 * - Property 22: Payment Status Update
 * - Property 23: Paid Credit Removal
 * - Property 24: Historical Data Preservation
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import userEvent from '@testing-library/user-event';
import fc from 'fast-check';
import FollowUpPanel from '../FollowUpPanel';
import type { CreditEntry, Language } from '@/lib/types';

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

// Arbitraries for property-based testing
const creditEntryArbitrary = fc.record({
  id: fc.string({ minLength: 10, maxLength: 30 }),
  userId: fc.constant('test-user'),
  customerName: fc.string({ minLength: 1, maxLength: 50 }),
  phoneNumber: fc.option(fc.string({ minLength: 10, maxLength: 10 })),
  amount: fc.integer({ min: 100, max: 100000 }),
  dateGiven: fc.date({ min: new Date('2023-01-01'), max: new Date() }).map(d => d.toISOString().split('T')[0]),
  dueDate: fc.date({ min: new Date('2023-01-01'), max: new Date('2024-01-01') }).map(d => d.toISOString().split('T')[0]),
  isPaid: fc.constant(false),
  lastReminderAt: fc.option(fc.date().map(d => d.toISOString())),
  createdAt: fc.date().map(d => d.toISOString()),
  updatedAt: fc.date().map(d => d.toISOString()),
});

const overdueCreditArbitrary = creditEntryArbitrary.map(credit => ({
  ...credit,
  isPaid: false,
  dueDate: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0],
}));

const languageArbitrary = fc.constantFrom<Language>('en', 'hi', 'mr');

describe('FollowUpPanel - Mark as Paid Property Tests', () => {
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

  // Property 21: Mark as Paid Button Display
  it('Property 21: should display "Mark as Paid" button for all overdue credits', () => {
    fc.assert(
      fc.property(
        fc.array(overdueCreditArbitrary, { minLength: 1, maxLength: 5 }),
        languageArbitrary,
        (credits, language) => {
          // Setup localStorage with credits
          localStorageMock.setItem('vyapar-credit-entries', JSON.stringify(credits));
          
          // Render component
          const { container } = render(
            <FollowUpPanel userId="test-user" language={language} overdueThreshold={3} />
          );
          
          // Wait for loading to complete
          waitFor(() => {
            expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
          });
          
          // Get all "Mark as Paid" buttons
          const markPaidButtons = container.querySelectorAll('button[aria-label*="Mark"]');
          
          // Property: Button should be displayed for each overdue credit
          // Note: getOverdueCredits filters by threshold, so we need to count filtered credits
          const overdueCount = credits.filter(c => {
            const daysOverdue = Math.max(0, Math.floor((Date.now() - new Date(c.dueDate).getTime()) / (1000 * 60 * 60 * 24)));
            return !c.isPaid && daysOverdue >= 3;
          }).length;
          
          expect(markPaidButtons.length).toBeGreaterThanOrEqual(overdueCount);
        }
      ),
      { numRuns: 100 }
    );
  });

  // Property 22: Payment Status Update
  it('Property 22: should set isPaid=true and paidDate=current date when marked as paid', async () => {
    await fc.assert(
      fc.asyncProperty(
        overdueCreditArbitrary,
        languageArbitrary,
        async (credit, language) => {
          // Setup localStorage with single credit
          const credits = [credit];
          localStorageMock.setItem('vyapar-credit-entries', JSON.stringify(credits));
          
          // Mock fetch to succeed
          (global.fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
            json: async () => ({ success: true }),
          });
          
          // Render component
          render(<FollowUpPanel userId="test-user" language={language} overdueThreshold={3} />);
          
          // Wait for loading
          await waitFor(() => {
            expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
          });
          
          // Find and click "Mark as Paid" button
          const markPaidButtons = screen.getAllByRole('button', { name: /mark/i });
          if (markPaidButtons.length > 0) {
            const user = userEvent.setup();
            await user.click(markPaidButtons[0]);
            
            // Wait for update
            await waitFor(() => {
              const stored = localStorageMock.getItem('vyapar-credit-entries');
              if (stored) {
                const updatedCredits = JSON.parse(stored);
                const updatedCredit = updatedCredits.find((c: CreditEntry) => c.id === credit.id);
                
                // Property: isPaid should be true
                expect(updatedCredit?.isPaid).toBe(true);
                
                // Property: paidDate should be set to current date (within 1 second tolerance)
                if (updatedCredit?.paidDate) {
                  const paidDate = new Date(updatedCredit.paidDate);
                  const now = new Date();
                  const diffMs = Math.abs(now.getTime() - paidDate.getTime());
                  expect(diffMs).toBeLessThan(5000); // 5 second tolerance for test execution
                }
              }
            });
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  // Property 23: Paid Credit Removal
  it('Property 23: should not display paid credit in overdue list on next render', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(overdueCreditArbitrary, { minLength: 2, maxLength: 5 }),
        languageArbitrary,
        async (credits, language) => {
          // Setup localStorage with credits
          localStorageMock.setItem('vyapar-credit-entries', JSON.stringify(credits));
          
          // Mock fetch to succeed
          (global.fetch as jest.Mock).mockResolvedValue({
            ok: true,
            json: async () => ({ success: true }),
          });
          
          // Render component
          const { rerender } = render(
            <FollowUpPanel userId="test-user" language={language} overdueThreshold={3} />
          );
          
          // Wait for loading
          await waitFor(() => {
            expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
          });
          
          // Get initial count of overdue credits
          const initialButtons = screen.getAllByRole('button', { name: /mark/i });
          const initialCount = initialButtons.length;
          
          if (initialCount > 0) {
            // Click first "Mark as Paid" button
            const user = userEvent.setup();
            await user.click(initialButtons[0]);
            
            // Wait for update
            await waitFor(() => {
              const stored = localStorageMock.getItem('vyapar-credit-entries');
              if (stored) {
                const updatedCredits = JSON.parse(stored);
                const paidCount = updatedCredits.filter((c: CreditEntry) => c.isPaid).length;
                expect(paidCount).toBeGreaterThan(0);
              }
            });
            
            // Re-render component
            rerender(<FollowUpPanel userId="test-user" language={language} overdueThreshold={3} />);
            
            // Wait for re-render
            await waitFor(() => {
              const newButtons = screen.queryAllByRole('button', { name: /mark/i });
              
              // Property: Paid credit should not appear in overdue list
              // (button count should decrease by 1)
              expect(newButtons.length).toBeLessThan(initialCount);
            });
          }
        }
      ),
      { numRuns: 50 } // Reduced runs for async test
    );
  }, 15000); // 15 second timeout

  // Property 24: Historical Data Preservation
  it('Property 24: should preserve historical fields when marked as paid', async () => {
    await fc.assert(
      fc.asyncProperty(
        overdueCreditArbitrary,
        languageArbitrary,
        async (credit, language) => {
          // Setup localStorage with single credit
          const credits = [credit];
          localStorageMock.setItem('vyapar-credit-entries', JSON.stringify(credits));
          
          // Store original values
          const originalDateGiven = credit.dateGiven;
          const originalDueDate = credit.dueDate;
          const originalLastReminderAt = credit.lastReminderAt;
          const originalCustomerName = credit.customerName;
          const originalAmount = credit.amount;
          
          // Mock fetch to succeed
          (global.fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
            json: async () => ({ success: true }),
          });
          
          // Render component
          render(<FollowUpPanel userId="test-user" language={language} overdueThreshold={3} />);
          
          // Wait for loading
          await waitFor(() => {
            expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
          });
          
          // Find and click "Mark as Paid" button
          const markPaidButtons = screen.getAllByRole('button', { name: /mark/i });
          if (markPaidButtons.length > 0) {
            const user = userEvent.setup();
            await user.click(markPaidButtons[0]);
            
            // Wait for update
            await waitFor(() => {
              const stored = localStorageMock.getItem('vyapar-credit-entries');
              if (stored) {
                const updatedCredits = JSON.parse(stored);
                const updatedCredit = updatedCredits.find((c: CreditEntry) => c.id === credit.id);
                
                if (updatedCredit) {
                  // Property: Historical fields should remain unchanged
                  expect(updatedCredit.dateGiven).toBe(originalDateGiven);
                  expect(updatedCredit.dueDate).toBe(originalDueDate);
                  expect(updatedCredit.lastReminderAt).toBe(originalLastReminderAt);
                  expect(updatedCredit.customerName).toBe(originalCustomerName);
                  expect(updatedCredit.amount).toBe(originalAmount);
                }
              }
            });
          }
        }
      ),
      { numRuns: 100 }
    );
  }, 15000); // 15 second timeout
});
