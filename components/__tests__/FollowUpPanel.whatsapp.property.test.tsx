/**
 * Property Test: Conditional WhatsApp Button Rendering
 * 
 * Feature: udhaar-follow-up-helper
 * Property 7: Conditional WhatsApp Button Rendering
 * 
 * Validates: Requirements 3.3, 3.4
 * 
 * Test that button appears if and only if phoneNumber exists
 * Use React Testing Library with fast-check (100 iterations)
 * 
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import fc from 'fast-check';
import FollowUpPanel from '../FollowUpPanel';
import type { CreditEntry, Language } from '@/lib/types';

// Mock the dependencies
jest.mock('@/lib/credit-manager', () => ({
  getOverdueCredits: jest.fn((credits) => 
    credits
      .filter((c: CreditEntry) => !c.isPaid)
      .map((c: CreditEntry) => ({
        ...c,
        daysOverdue: 5,
        daysSinceReminder: null,
      }))
  ),
}));

jest.mock('@/lib/whatsapp-link-generator', () => ({
  generateReminderLink: jest.fn(() => 'https://wa.me/+911234567890?text=test'),
}));

jest.mock('@/lib/reminder-tracker', () => ({
  recordReminder: jest.fn(() => Promise.resolve()),
}));

jest.mock('@/lib/translations', () => ({
  t: jest.fn((key: string) => key),
}));

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

// Arbitraries for property-based testing
const creditIdArbitrary = fc.string({ minLength: 10, maxLength: 30 });
const userIdArbitrary = fc.string({ minLength: 10, maxLength: 30 });
const customerNameArbitrary = fc.string({ minLength: 1, maxLength: 50 });
const phoneNumberArbitrary = fc.option(
  fc.string({ minLength: 10, maxLength: 10 }).filter(s => /^\d{10}$/.test(s)),
  { nil: undefined }
);
const amountArbitrary = fc.integer({ min: 1, max: 100000 });
const dateArbitrary = fc.date({ min: new Date('2020-01-01'), max: new Date('2025-12-31') })
  .map(d => d.toISOString().split('T')[0]);

const creditEntryArbitrary = fc.record({
  id: creditIdArbitrary,
  userId: userIdArbitrary,
  customerName: customerNameArbitrary,
  phoneNumber: phoneNumberArbitrary,
  amount: amountArbitrary,
  dateGiven: dateArbitrary,
  dueDate: dateArbitrary,
  isPaid: fc.constant(false), // Only unpaid credits for overdue list
  createdAt: fc.date().map(d => d.toISOString()),
  updatedAt: fc.date().map(d => d.toISOString()),
});

describe('FollowUpPanel - Property 7: Conditional WhatsApp Button Rendering', () => {
  beforeEach(() => {
    // Clear localStorage
    localStorageMock.clear();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should display WhatsApp button if and only if phoneNumber exists', () => {
    fc.assert(
      fc.property(
        fc.array(creditEntryArbitrary, { minLength: 1, maxLength: 5 }),
        userIdArbitrary,
        fc.constantFrom<Language>('en', 'hi', 'mr'),
        (credits, userId, language) => {
          // Store credits in localStorage
          localStorage.setItem('vyapar-credit-entries', JSON.stringify(credits));
          
          // Render component
          const { container } = render(
            <FollowUpPanel
              userId={userId}
              language={language}
              overdueThreshold={3}
            />
          );

          // For each credit, verify button presence matches phoneNumber existence
          credits.forEach((credit) => {
            // Find the credit card by customer name
            const creditCards = container.querySelectorAll('[class*="border-gray-200"]');
            
            creditCards.forEach((card) => {
              const cardText = card.textContent || '';
              
              if (cardText.includes(credit.customerName)) {
                // Check if WhatsApp button exists in this card
                const whatsappButtons = card.querySelectorAll('button');
                const hasWhatsAppButton = Array.from(whatsappButtons).some(
                  btn => btn.textContent?.includes('followUp.sendReminder')
                );

                // Property: Button exists if and only if phoneNumber exists
                if (credit.phoneNumber) {
                  expect(hasWhatsAppButton).toBe(true);
                } else {
                  expect(hasWhatsAppButton).toBe(false);
                }
              }
            });
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should not display WhatsApp button when phoneNumber is missing', () => {
    fc.assert(
      fc.property(
        customerNameArbitrary,
        amountArbitrary,
        userIdArbitrary,
        (customerName, amount, userId) => {
          // Create credit without phone number
          const creditWithoutPhone: CreditEntry = {
            id: 'test-credit-no-phone',
            userId,
            customerName,
            amount,
            dateGiven: '2024-01-01',
            dueDate: '2024-01-10',
            isPaid: false,
            createdAt: '2024-01-01T00:00:00Z',
            updatedAt: '2024-01-01T00:00:00Z',
            // phoneNumber is undefined
          };

          localStorage.setItem('vyapar-credit-entries', JSON.stringify([creditWithoutPhone]));

          const { container } = render(
            <FollowUpPanel
              userId={userId}
              language="en"
              overdueThreshold={3}
            />
          );

          // Find the credit card
          const creditCards = container.querySelectorAll('[class*="border-gray-200"]');
          
          creditCards.forEach((card) => {
            const cardText = card.textContent || '';
            
            if (cardText.includes(customerName)) {
              // Check that no WhatsApp button exists
              const whatsappButtons = card.querySelectorAll('button');
              const hasWhatsAppButton = Array.from(whatsappButtons).some(
                btn => btn.textContent?.includes('followUp.sendReminder')
              );

              expect(hasWhatsAppButton).toBe(false);
            }
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should display WhatsApp button when phoneNumber exists', () => {
    fc.assert(
      fc.property(
        customerNameArbitrary,
        amountArbitrary,
        fc.string({ minLength: 10, maxLength: 10 }).filter(s => /^\d{10}$/.test(s)),
        userIdArbitrary,
        (customerName, amount, phoneNumber, userId) => {
          // Create credit with phone number
          const creditWithPhone: CreditEntry = {
            id: 'test-credit-with-phone',
            userId,
            customerName,
            phoneNumber,
            amount,
            dateGiven: '2024-01-01',
            dueDate: '2024-01-10',
            isPaid: false,
            createdAt: '2024-01-01T00:00:00Z',
            updatedAt: '2024-01-01T00:00:00Z',
          };

          localStorage.setItem('vyapar-credit-entries', JSON.stringify([creditWithPhone]));

          const { container } = render(
            <FollowUpPanel
              userId={userId}
              language="en"
              overdueThreshold={3}
            />
          );

          // Find the credit card
          const creditCards = container.querySelectorAll('[class*="border-gray-200"]');
          
          creditCards.forEach((card) => {
            const cardText = card.textContent || '';
            
            if (cardText.includes(customerName)) {
              // Check that WhatsApp button exists
              const whatsappButtons = card.querySelectorAll('button');
              const hasWhatsAppButton = Array.from(whatsappButtons).some(
                btn => btn.textContent?.includes('followUp.sendReminder')
              );

              expect(hasWhatsAppButton).toBe(true);
            }
          });
        }
      ),
      { numRuns: 100 }
    );
  });
});
