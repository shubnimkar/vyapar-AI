/**
 * Property-based test for Follow-Up Panel Display Order
 * 
 * Feature: udhaar-follow-up-helper
 * Property 5: Display Order Preservation
 * Validates: Requirements 2.3
 * 
 * @jest-environment jsdom
 */

import React from 'react';
import * as fc from 'fast-check';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import FollowUpPanel from '../FollowUpPanel';
import { getOverdueCredits } from '@/lib/credit-manager';
import type { CreditEntry, Language } from '@/lib/types';

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

// Generator for overdue credits (guaranteed to be overdue)
const overdueCreditArbitrary = fc.record({
  id: fc.string({ minLength: 10, maxLength: 30 }),
  userId: fc.constant('test-user'),
  customerName: fc.string({ minLength: 3, maxLength: 50 })
    .filter(name => name.trim().length >= 3 && /[a-zA-Z]/.test(name))
    .map(name => name.trim()), // Trim to avoid whitespace issues in rendering
  phoneNumber: fc.option(fc.string({ minLength: 10, maxLength: 10 })),
  amount: fc.integer({ min: 100, max: 1000000 }),
  dateGiven: fc.integer({ min: 30, max: 365 }).map(daysAgo => {
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);
    return date.toISOString().split('T')[0];
  }),
  dueDate: fc.integer({ min: 3, max: 100 }).map(daysAgo => {
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);
    return date.toISOString().split('T')[0];
  }),
  isPaid: fc.constant(false),
  createdAt: fc.date({ min: new Date('2020-01-01'), max: new Date() })
    .filter(d => !isNaN(d.getTime()))
    .map(d => d.toISOString()),
  updatedAt: fc.date({ min: new Date('2020-01-01'), max: new Date() })
    .filter(d => !isNaN(d.getTime()))
    .map(d => d.toISOString()),
});

describe('Property 5: Display Order Preservation', () => {
  /**
   * **Validates: Requirements 2.3**
   * 
   * Property: For any ordered list of overdue credits from the Credit Manager,
   * the Follow-Up Panel should display them in the same order.
   * 
   * This ensures that the UI respects the deterministic sorting from the
   * Credit Manager (days overdue DESC, then amount DESC).
   */

  beforeEach(() => {
    localStorageMock.clear();
  });

  it('should display credits in the same order as Credit Manager returns them', () => {
    fc.assert(
      fc.property(
        // Generate array of overdue credits with unique names
        fc.array(overdueCreditArbitrary, { minLength: 2, maxLength: 10 }).map(credits =>
          credits.map((credit, index) => ({
            ...credit,
            id: `credit-${index}`,
            customerName: `Customer-${index}-${credit.customerName.substring(0, 10).trim()}`,
          }))
        ),
        fc.constantFrom<Language>('en', 'hi', 'mr'),
        fc.integer({ min: 0, max: 10 }), // threshold
        (credits, language, threshold) => {
          // Setup localStorage with credits
          localStorageMock.setItem('vyapar-credit-entries', JSON.stringify(credits));

          // Get expected order from Credit Manager (deterministic)
          const expectedOrder = getOverdueCredits(credits, threshold);

          // Render the component
          const { container } = render(
            <FollowUpPanel
              userId="test-user"
              language={language}
              overdueThreshold={threshold}
            />
          );

          // Property: If Credit Manager returns credits, they should appear in the same order
          if (expectedOrder.length > 0) {
            // Extract customer names from rendered HTML in order
            const customerNameElements = container.querySelectorAll('h3.font-semibold');
            const renderedNames = Array.from(customerNameElements).map(el => el.textContent?.trim() || '');

            // Expected names in order
            const expectedNames = expectedOrder.map(credit => credit.customerName);

            // Property: Rendered order must match Credit Manager order
            expect(renderedNames).toEqual(expectedNames);

            // Property: Length must match
            expect(renderedNames.length).toBe(expectedNames.length);

            // Property: Each credit must appear in correct position
            expectedNames.forEach((name, index) => {
              expect(renderedNames[index]).toBe(name);
            });
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should preserve order when credits have different days overdue', () => {
    fc.assert(
      fc.property(
        // Generate credits with varying days overdue
        fc.array(
          fc.record({
            daysOverdue: fc.integer({ min: 3, max: 100 }),
            amount: fc.integer({ min: 100, max: 100000 }),
            customerName: fc.string({ minLength: 5, maxLength: 30 })
              .filter(name => name.trim().length >= 5 && /[a-zA-Z]/.test(name))
              .map(name => name.trim()), // Trim to avoid whitespace issues
          }),
          { minLength: 2, maxLength: 5 }
        ).map(items =>
          items.map((item, index) => {
            const today = new Date();
            const dueDate = new Date(today);
            dueDate.setDate(dueDate.getDate() - item.daysOverdue);

            return {
              id: `credit-${index}`,
              userId: 'test-user',
              customerName: `${item.customerName}-${index}`,
              amount: item.amount,
              dateGiven: '2024-01-01',
              dueDate: dueDate.toISOString().split('T')[0],
              isPaid: false,
              createdAt: '2024-01-01T00:00:00Z',
              updatedAt: '2024-01-01T00:00:00Z',
            } as CreditEntry;
          })
        ),
        fc.constantFrom<Language>('en', 'hi', 'mr'),
        (credits, language) => {
          localStorageMock.clear();
          localStorageMock.setItem('vyapar-credit-entries', JSON.stringify(credits));

          // Get expected order from Credit Manager
          const expectedOrder = getOverdueCredits(credits, 3);

          // Render component
          const { container } = render(
            <FollowUpPanel
              userId="test-user"
              language={language}
              overdueThreshold={3}
            />
          );

          if (expectedOrder.length > 0) {
            const customerNameElements = container.querySelectorAll('h3.font-semibold');
            const renderedNames = Array.from(customerNameElements).map(el => el.textContent?.trim() || '');
            const expectedNames = expectedOrder.map(credit => credit.customerName);

            // Property: Order must be preserved
            expect(renderedNames).toEqual(expectedNames);

            // Property: Most overdue should be first
            if (expectedOrder.length >= 2) {
              expect(expectedOrder[0].daysOverdue).toBeGreaterThanOrEqual(expectedOrder[1].daysOverdue);
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should preserve order when credits have same days overdue but different amounts', () => {
    fc.assert(
      fc.property(
        // Generate credits with same days overdue but different amounts
        fc.integer({ min: 5, max: 30 }), // common days overdue
        fc.array(fc.integer({ min: 100, max: 100000 }), { minLength: 2, maxLength: 5 }), // amounts
        fc.constantFrom<Language>('en', 'hi', 'mr'),
        (daysOverdue, amounts, language) => {
          const today = new Date();
          const dueDate = new Date(today);
          dueDate.setDate(dueDate.getDate() - daysOverdue);
          const dueDateStr = dueDate.toISOString().split('T')[0];

          const credits: CreditEntry[] = amounts.map((amount, index) => ({
            id: `credit-${index}`,
            userId: 'test-user',
            customerName: `Customer-${index}-Amount${amount}`,
            amount,
            dateGiven: '2024-01-01',
            dueDate: dueDateStr,
            isPaid: false,
            createdAt: '2024-01-01T00:00:00Z',
            updatedAt: '2024-01-01T00:00:00Z',
          }));

          localStorageMock.clear();
          localStorageMock.setItem('vyapar-credit-entries', JSON.stringify(credits));

          // Get expected order from Credit Manager
          const expectedOrder = getOverdueCredits(credits, 3);

          // Render component
          const { container } = render(
            <FollowUpPanel
              userId="test-user"
              language={language}
              overdueThreshold={3}
            />
          );

          if (expectedOrder.length > 0) {
            const customerNameElements = container.querySelectorAll('h3.font-semibold');
            const renderedNames = Array.from(customerNameElements).map(el => el.textContent?.trim() || '');
            const expectedNames = expectedOrder.map(credit => credit.customerName);

            // Property: Order must be preserved
            expect(renderedNames).toEqual(expectedNames);

            // Property: When days overdue are equal, higher amounts should come first
            if (expectedOrder.length >= 2) {
              for (let i = 0; i < expectedOrder.length - 1; i++) {
                if (expectedOrder[i].daysOverdue === expectedOrder[i + 1].daysOverdue) {
                  expect(expectedOrder[i].amount).toBeGreaterThanOrEqual(expectedOrder[i + 1].amount);
                }
              }
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should maintain order consistency across re-renders', () => {
    fc.assert(
      fc.property(
        fc.array(overdueCreditArbitrary, { minLength: 2, maxLength: 5 }).map(credits =>
          credits.map((credit, index) => ({
            ...credit,
            id: `credit-${index}`,
            customerName: `Customer-${index}-${credit.customerName.substring(0, 10).trim()}`,
          }))
        ),
        fc.constantFrom<Language>('en', 'hi', 'mr'),
        (credits, language) => {
          localStorageMock.clear();
          localStorageMock.setItem('vyapar-credit-entries', JSON.stringify(credits));

          // Get expected order
          const expectedOrder = getOverdueCredits(credits, 3);

          // Render multiple times
          const result1 = render(
            <FollowUpPanel
              userId="test-user"
              language={language}
              overdueThreshold={3}
            />
          );

          const names1 = Array.from(result1.container.querySelectorAll('h3.font-semibold'))
            .map(el => el.textContent?.trim() || '');

          result1.unmount();

          const result2 = render(
            <FollowUpPanel
              userId="test-user"
              language={language}
              overdueThreshold={3}
            />
          );

          const names2 = Array.from(result2.container.querySelectorAll('h3.font-semibold'))
            .map(el => el.textContent?.trim() || '');

          // Property: Order should be consistent across renders
          if (expectedOrder.length > 0) {
            expect(names1).toEqual(names2);
            expect(names1).toEqual(expectedOrder.map(c => c.customerName));
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should handle edge case: single credit maintains its position', () => {
    fc.assert(
      fc.property(
        overdueCreditArbitrary,
        fc.constantFrom<Language>('en', 'hi', 'mr'),
        (credit, language) => {
          localStorageMock.clear();
          localStorageMock.setItem('vyapar-credit-entries', JSON.stringify([credit]));

          const expectedOrder = getOverdueCredits([credit], 3);

          const { container } = render(
            <FollowUpPanel
              userId="test-user"
              language={language}
              overdueThreshold={3}
            />
          );

          if (expectedOrder.length === 1) {
            const customerNameElements = container.querySelectorAll('h3.font-semibold');
            expect(customerNameElements).toHaveLength(1);
            expect(customerNameElements[0].textContent?.trim()).toBe(credit.customerName);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
