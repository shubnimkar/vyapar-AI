/**
 * Property-based tests for Follow-Up Panel Multi-Language Support
 * 
 * Feature: udhaar-follow-up-helper
 * Property 19: UI Language Translation
 * Property 20: Language Change Reactivity
 * 
 * @jest-environment jsdom
 */

import React from 'react';
import * as fc from 'fast-check';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import FollowUpPanel from '../FollowUpPanel';
import { t } from '@/lib/translations';
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
    .filter(name => name.trim().length >= 3 && /[a-zA-Z]/.test(name)),
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

describe('Property 19: UI Language Translation', () => {
  /**
   * **Validates: Requirements 7.1, 7.4**
   * 
   * Property: For any language preference (English, Hindi, or Marathi),
   * all UI labels in the Follow-Up Panel should be displayed in the
   * corresponding language.
   */

  beforeEach(() => {
    localStorageMock.clear();
  });

  it('should display all UI labels in the corresponding language for any language', () => {
    fc.assert(
      fc.property(
        fc.constantFrom<Language>('en', 'hi', 'mr'),
        fc.array(overdueCreditArbitrary, { minLength: 1, maxLength: 3 }),
        (language, credits) => {
          // Setup localStorage with credits
          localStorageMock.setItem('vyapar-credit-entries', JSON.stringify(credits));

          // Render the component with the specified language
          const { container } = render(
            <FollowUpPanel
              userId="test-user"
              language={language}
              overdueThreshold={3}
            />
          );

          // Property: Title should be in the correct language
          const titleText = t('followUp.title', language);
          expect(container.textContent).toContain(titleText);

          // Property: "days overdue" label should be in the correct language
          const daysOverdueText = t('followUp.daysOverdue', language);
          expect(container.textContent).toContain(daysOverdueText);

          // Property: "Mark as Paid" button should be in the correct language
          const markPaidText = t('followUp.markPaid', language);
          expect(container.textContent).toContain(markPaidText);

          // Property: Threshold message should be in the correct language
          const thresholdText = t('followUp.threshold', language).replace('{days}', '3');
          expect(container.textContent).toContain(thresholdText);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should display "No overdue credits" message in correct language when list is empty', () => {
    fc.assert(
      fc.property(
        fc.constantFrom<Language>('en', 'hi', 'mr'),
        (language) => {
          // Setup empty credits list
          localStorageMock.setItem('vyapar-credit-entries', JSON.stringify([]));

          // Render the component
          const { container } = render(
            <FollowUpPanel
              userId="test-user"
              language={language}
              overdueThreshold={3}
            />
          );

          // Property: "No overdue credits" message should be in correct language
          const noOverdueText = t('followUp.noOverdue', language);
          expect(container.textContent).toContain(noOverdueText);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should display WhatsApp reminder button text in correct language', () => {
    fc.assert(
      fc.property(
        fc.constantFrom<Language>('en', 'hi', 'mr'),
        overdueCreditArbitrary,
        (language, credit) => {
          // Ensure credit has phone number for WhatsApp button
          const creditWithPhone = {
            ...credit,
            phoneNumber: '9876543210',
          };

          localStorageMock.setItem('vyapar-credit-entries', JSON.stringify([creditWithPhone]));

          const { container } = render(
            <FollowUpPanel
              userId="test-user"
              language={language}
              overdueThreshold={3}
            />
          );

          // Property: WhatsApp button text should be in correct language
          const sendReminderText = t('followUp.sendReminder', language);
          expect(container.textContent).toContain(sendReminderText);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should display reminder status labels in correct language', () => {
    fc.assert(
      fc.property(
        fc.constantFrom<Language>('en', 'hi', 'mr'),
        overdueCreditArbitrary,
        fc.boolean(), // Whether to include lastReminderAt
        (language, credit, hasReminder) => {
          const creditData = hasReminder
            ? { ...credit, lastReminderAt: '2024-01-15' }
            : { ...credit, lastReminderAt: undefined };

          localStorageMock.setItem('vyapar-credit-entries', JSON.stringify([creditData]));

          const { container } = render(
            <FollowUpPanel
              userId="test-user"
              language={language}
              overdueThreshold={3}
            />
          );

          if (hasReminder) {
            // Property: "Last reminder" label should be in correct language
            const lastReminderText = t('followUp.lastReminder', language);
            expect(container.textContent).toContain(lastReminderText);
          } else {
            // Property: "Never reminded" text should be in correct language
            const neverRemindedText = t('followUp.neverReminded', language);
            expect(container.textContent).toContain(neverRemindedText);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should display summary labels in correct language', () => {
    fc.assert(
      fc.property(
        fc.constantFrom<Language>('en', 'hi', 'mr'),
        fc.array(overdueCreditArbitrary, { minLength: 1, maxLength: 5 }),
        (language, credits) => {
          localStorageMock.setItem('vyapar-credit-entries', JSON.stringify(credits));

          const { container } = render(
            <FollowUpPanel
              userId="test-user"
              language={language}
              overdueThreshold={3}
            />
          );

          // Property: "Total Overdue" label should be in correct language
          const totalOverdueText = t('followUp.totalOverdue', language);
          expect(container.textContent).toContain(totalOverdueText);

          // Property: "Overdue Customers" label should be in correct language
          const overdueCustomersText = t('overdueCustomers', language);
          expect(container.textContent).toContain(overdueCustomersText);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should display all three languages correctly', () => {
    fc.assert(
      fc.property(
        overdueCreditArbitrary,
        (credit) => {
          const languages: Language[] = ['en', 'hi', 'mr'];

          languages.forEach(language => {
            localStorageMock.clear();
            localStorageMock.setItem('vyapar-credit-entries', JSON.stringify([credit]));

            const { container, unmount } = render(
              <FollowUpPanel
                userId="test-user"
                language={language}
                overdueThreshold={3}
              />
            );

            // Property: Each language should display its own translations
            const titleText = t('followUp.title', language);
            expect(container.textContent).toContain(titleText);

            const daysOverdueText = t('followUp.daysOverdue', language);
            expect(container.textContent).toContain(daysOverdueText);

            const markPaidText = t('followUp.markPaid', language);
            expect(container.textContent).toContain(markPaidText);

            unmount();
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should not mix languages - all labels should be in the same language', () => {
    fc.assert(
      fc.property(
        fc.constantFrom<Language>('en', 'hi', 'mr'),
        overdueCreditArbitrary,
        (language, credit) => {
          localStorageMock.setItem('vyapar-credit-entries', JSON.stringify([credit]));

          const { container } = render(
            <FollowUpPanel
              userId="test-user"
              language={language}
              overdueThreshold={3}
            />
          );

          // Property: Should not contain text from other languages
          const otherLanguages = (['en', 'hi', 'mr'] as Language[]).filter(l => l !== language);

          otherLanguages.forEach(otherLang => {
            // Check that key phrases from other languages are NOT present
            const otherTitle = t('followUp.title', otherLang);
            const currentTitle = t('followUp.title', language);

            // Only check if the translations are actually different
            if (otherTitle !== currentTitle) {
              expect(container.textContent).not.toContain(otherTitle);
            }
          });
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('Property 20: Language Change Reactivity', () => {
  /**
   * **Validates: Requirements 7.5**
   * 
   * Property: For any language preference change, the Follow-Up Panel
   * should re-render with all labels in the new language.
   */

  beforeEach(() => {
    localStorageMock.clear();
  });

  it('should re-render with new language when language prop changes', () => {
    fc.assert(
      fc.property(
        fc.constantFrom<Language>('en', 'hi', 'mr'),
        fc.constantFrom<Language>('en', 'hi', 'mr'),
        overdueCreditArbitrary,
        (initialLanguage, newLanguage, credit) => {
          // Skip if languages are the same
          if (initialLanguage === newLanguage) {
            return true;
          }

          localStorageMock.setItem('vyapar-credit-entries', JSON.stringify([credit]));

          // Render with initial language
          const { container, rerender } = render(
            <FollowUpPanel
              userId="test-user"
              language={initialLanguage}
              overdueThreshold={3}
            />
          );

          // Verify initial language is displayed
          const initialTitle = t('followUp.title', initialLanguage);
          expect(container.textContent).toContain(initialTitle);

          // Re-render with new language
          rerender(
            <FollowUpPanel
              userId="test-user"
              language={newLanguage}
              overdueThreshold={3}
            />
          );

          // Property: Should now display new language
          const newTitle = t('followUp.title', newLanguage);
          expect(container.textContent).toContain(newTitle);

          // Property: Should NOT display old language (if translations differ)
          if (initialTitle !== newTitle) {
            expect(container.textContent).not.toContain(initialTitle);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should update all UI labels when language changes', () => {
    fc.assert(
      fc.property(
        overdueCreditArbitrary,
        (credit) => {
          const creditWithPhone = {
            ...credit,
            phoneNumber: '9876543210',
          };

          localStorageMock.setItem('vyapar-credit-entries', JSON.stringify([creditWithPhone]));

          // Start with English
          const { container, rerender } = render(
            <FollowUpPanel
              userId="test-user"
              language="en"
              overdueThreshold={3}
            />
          );

          // Verify English labels
          expect(container.textContent).toContain(t('followUp.title', 'en'));
          expect(container.textContent).toContain(t('followUp.markPaid', 'en'));
          expect(container.textContent).toContain(t('followUp.sendReminder', 'en'));

          // Change to Hindi
          rerender(
            <FollowUpPanel
              userId="test-user"
              language="hi"
              overdueThreshold={3}
            />
          );

          // Property: All labels should now be in Hindi
          expect(container.textContent).toContain(t('followUp.title', 'hi'));
          expect(container.textContent).toContain(t('followUp.markPaid', 'hi'));
          expect(container.textContent).toContain(t('followUp.sendReminder', 'hi'));

          // Change to Marathi
          rerender(
            <FollowUpPanel
              userId="test-user"
              language="mr"
              overdueThreshold={3}
            />
          );

          // Property: All labels should now be in Marathi
          expect(container.textContent).toContain(t('followUp.title', 'mr'));
          expect(container.textContent).toContain(t('followUp.markPaid', 'mr'));
          expect(container.textContent).toContain(t('followUp.sendReminder', 'mr'));
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should update reminder status labels when language changes', () => {
    fc.assert(
      fc.property(
        overdueCreditArbitrary,
        fc.boolean(),
        (credit, hasReminder) => {
          const creditData = hasReminder
            ? { ...credit, lastReminderAt: '2024-01-15' }
            : { ...credit, lastReminderAt: undefined };

          localStorageMock.setItem('vyapar-credit-entries', JSON.stringify([creditData]));

          // Start with English
          const { container, rerender } = render(
            <FollowUpPanel
              userId="test-user"
              language="en"
              overdueThreshold={3}
            />
          );

          if (hasReminder) {
            expect(container.textContent).toContain(t('followUp.lastReminder', 'en'));
          } else {
            expect(container.textContent).toContain(t('followUp.neverReminded', 'en'));
          }

          // Change to Hindi
          rerender(
            <FollowUpPanel
              userId="test-user"
              language="hi"
              overdueThreshold={3}
            />
          );

          // Property: Reminder labels should update to Hindi
          if (hasReminder) {
            expect(container.textContent).toContain(t('followUp.lastReminder', 'hi'));
          } else {
            expect(container.textContent).toContain(t('followUp.neverReminded', 'hi'));
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should update empty state message when language changes', () => {
    fc.assert(
      fc.property(
        fc.constantFrom<Language>('en', 'hi', 'mr'),
        fc.constantFrom<Language>('en', 'hi', 'mr'),
        (lang1, lang2) => {
          if (lang1 === lang2) {
            return true;
          }

          // Empty credits list
          localStorageMock.setItem('vyapar-credit-entries', JSON.stringify([]));

          const { container, rerender } = render(
            <FollowUpPanel
              userId="test-user"
              language={lang1}
              overdueThreshold={3}
            />
          );

          // Verify first language
          const noOverdueText1 = t('followUp.noOverdue', lang1);
          expect(container.textContent).toContain(noOverdueText1);

          // Change language
          rerender(
            <FollowUpPanel
              userId="test-user"
              language={lang2}
              overdueThreshold={3}
            />
          );

          // Property: Empty state message should update to new language
          const noOverdueText2 = t('followUp.noOverdue', lang2);
          expect(container.textContent).toContain(noOverdueText2);
        }
      ),
      { numRuns: 100 }
    );
  });
});
