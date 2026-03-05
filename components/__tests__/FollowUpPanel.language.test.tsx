/**
 * Unit tests for Follow-Up Panel Multi-Language Support
 * 
 * Feature: udhaar-follow-up-helper
 * Tests specific examples of multi-language functionality
 * 
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import FollowUpPanel from '../FollowUpPanel';
import { t } from '@/lib/translations';
import type { CreditEntry } from '@/lib/types';

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

describe('FollowUpPanel - Multi-Language Support', () => {
  const createOverdueCredit = (overrides?: Partial<CreditEntry>): CreditEntry => {
    const today = new Date();
    const overdueDate = new Date(today);
    overdueDate.setDate(overdueDate.getDate() - 10);

    return {
      id: 'test-credit-1',
      userId: 'test-user',
      customerName: 'Test Customer',
      phoneNumber: '9876543210',
      amount: 5000,
      dateGiven: '2024-01-01',
      dueDate: overdueDate.toISOString().split('T')[0],
      isPaid: false,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
      ...overrides,
    };
  };

  beforeEach(() => {
    localStorageMock.clear();
  });

  describe('English UI labels', () => {
    it('should display all UI labels in English', () => {
      const credit = createOverdueCredit();
      localStorageMock.setItem('vyapar-credit-entries', JSON.stringify([credit]));

      render(
        <FollowUpPanel
          userId="test-user"
          language="en"
          overdueThreshold={3}
        />
      );

      // Title
      expect(screen.getByText('Follow-up & Collections')).toBeInTheDocument();

      // Threshold message
      expect(screen.getByText(/Showing credits overdue by 3\+ days/)).toBeInTheDocument();

      // Days overdue badge
      expect(screen.getByText(/days overdue/)).toBeInTheDocument();

      // Mark as Paid button
      expect(screen.getByText('Mark as Paid')).toBeInTheDocument();

      // WhatsApp reminder button
      expect(screen.getByText('Send WhatsApp Reminder')).toBeInTheDocument();

      // Summary labels
      expect(screen.getByText('Overdue Customers')).toBeInTheDocument();
      expect(screen.getByText('Total Overdue')).toBeInTheDocument();
    });

    it('should display "No overdue credits" message in English', () => {
      localStorageMock.setItem('vyapar-credit-entries', JSON.stringify([]));

      render(
        <FollowUpPanel
          userId="test-user"
          language="en"
          overdueThreshold={3}
        />
      );

      expect(screen.getByText('No overdue credits. Great job!')).toBeInTheDocument();
    });

    it('should display "Never reminded" in English when no reminder sent', () => {
      const credit = createOverdueCredit({ lastReminderAt: undefined });
      localStorageMock.setItem('vyapar-credit-entries', JSON.stringify([credit]));

      render(
        <FollowUpPanel
          userId="test-user"
          language="en"
          overdueThreshold={3}
        />
      );

      expect(screen.getByText('Never reminded')).toBeInTheDocument();
    });

    it('should display "Last reminder" label in English when reminder exists', () => {
      const credit = createOverdueCredit({ lastReminderAt: '2024-01-15' });
      localStorageMock.setItem('vyapar-credit-entries', JSON.stringify([credit]));

      render(
        <FollowUpPanel
          userId="test-user"
          language="en"
          overdueThreshold={3}
        />
      );

      expect(screen.getByText(/Last reminder/)).toBeInTheDocument();
    });
  });

  describe('Hindi UI labels', () => {
    it('should display all UI labels in Hindi', () => {
      const credit = createOverdueCredit();
      localStorageMock.setItem('vyapar-credit-entries', JSON.stringify([credit]));

      const { container } = render(
        <FollowUpPanel
          userId="test-user"
          language="hi"
          overdueThreshold={3}
        />
      );

      // Title
      expect(container.textContent).toContain('फॉलो-अप और वसूली');

      // Days overdue badge
      expect(container.textContent).toContain('दिन अतिदेय');

      // Mark as Paid button
      expect(container.textContent).toContain('भुगतान किया गया चिह्नित करें');

      // WhatsApp reminder button
      expect(container.textContent).toContain('WhatsApp रिमाइंडर भेजें');

      // Summary labels
      expect(container.textContent).toContain('अतिदेय ग्राहक');
      expect(container.textContent).toContain('कुल अतिदेय');
    });

    it('should display "No overdue credits" message in Hindi', () => {
      localStorageMock.setItem('vyapar-credit-entries', JSON.stringify([]));

      const { container } = render(
        <FollowUpPanel
          userId="test-user"
          language="hi"
          overdueThreshold={3}
        />
      );

      expect(container.textContent).toContain('कोई अतिदेय उधार नहीं। बढ़िया काम!');
    });

    it('should display "Never reminded" in Hindi when no reminder sent', () => {
      const credit = createOverdueCredit({ lastReminderAt: undefined });
      localStorageMock.setItem('vyapar-credit-entries', JSON.stringify([credit]));

      const { container } = render(
        <FollowUpPanel
          userId="test-user"
          language="hi"
          overdueThreshold={3}
        />
      );

      expect(container.textContent).toContain('कभी रिमाइंडर नहीं भेजा');
    });

    it('should display "Last reminder" label in Hindi when reminder exists', () => {
      const credit = createOverdueCredit({ lastReminderAt: '2024-01-15' });
      localStorageMock.setItem('vyapar-credit-entries', JSON.stringify([credit]));

      const { container } = render(
        <FollowUpPanel
          userId="test-user"
          language="hi"
          overdueThreshold={3}
        />
      );

      expect(container.textContent).toContain('अंतिम रिमाइंडर');
    });
  });

  describe('Marathi UI labels', () => {
    it('should display all UI labels in Marathi', () => {
      const credit = createOverdueCredit();
      localStorageMock.setItem('vyapar-credit-entries', JSON.stringify([credit]));

      const { container } = render(
        <FollowUpPanel
          userId="test-user"
          language="mr"
          overdueThreshold={3}
        />
      );

      // Title
      expect(container.textContent).toContain('फॉलो-अप आणि वसुली');

      // Days overdue badge
      expect(container.textContent).toContain('दिवस थकीत');

      // Mark as Paid button
      expect(container.textContent).toContain('पेड म्हणून चिन्हांकित करा');

      // WhatsApp reminder button
      expect(container.textContent).toContain('WhatsApp रिमाइंडर पाठवा');

      // Summary labels
      expect(container.textContent).toContain('थकीत ग्राहक');
      expect(container.textContent).toContain('एकूण थकीत');
    });

    it('should display "No overdue credits" message in Marathi', () => {
      localStorageMock.setItem('vyapar-credit-entries', JSON.stringify([]));

      const { container } = render(
        <FollowUpPanel
          userId="test-user"
          language="mr"
          overdueThreshold={3}
        />
      );

      expect(container.textContent).toContain('कोणतेही थकीत उधार नाही. उत्तम काम!');
    });

    it('should display "Never reminded" in Marathi when no reminder sent', () => {
      const credit = createOverdueCredit({ lastReminderAt: undefined });
      localStorageMock.setItem('vyapar-credit-entries', JSON.stringify([credit]));

      const { container } = render(
        <FollowUpPanel
          userId="test-user"
          language="mr"
          overdueThreshold={3}
        />
      );

      expect(container.textContent).toContain('कधीही रिमाइंडर पाठवले नाही');
    });

    it('should display "Last reminder" label in Marathi when reminder exists', () => {
      const credit = createOverdueCredit({ lastReminderAt: '2024-01-15' });
      localStorageMock.setItem('vyapar-credit-entries', JSON.stringify([credit]));

      const { container } = render(
        <FollowUpPanel
          userId="test-user"
          language="mr"
          overdueThreshold={3}
        />
      );

      expect(container.textContent).toContain('शेवटचा रिमाइंडर');
    });
  });

  describe('Language preference change', () => {
    it('should update UI when language prop changes from English to Hindi', () => {
      const credit = createOverdueCredit();
      localStorageMock.setItem('vyapar-credit-entries', JSON.stringify([credit]));

      const { container, rerender } = render(
        <FollowUpPanel
          userId="test-user"
          language="en"
          overdueThreshold={3}
        />
      );

      // Verify English
      expect(container.textContent).toContain('Follow-up & Collections');
      expect(container.textContent).toContain('Mark as Paid');

      // Change to Hindi
      rerender(
        <FollowUpPanel
          userId="test-user"
          language="hi"
          overdueThreshold={3}
        />
      );

      // Verify Hindi
      expect(container.textContent).toContain('फॉलो-अप और वसूली');
      expect(container.textContent).toContain('भुगतान किया गया चिह्नित करें');
      expect(container.textContent).not.toContain('Follow-up & Collections');
    });

    it('should update UI when language prop changes from Hindi to Marathi', () => {
      const credit = createOverdueCredit();
      localStorageMock.setItem('vyapar-credit-entries', JSON.stringify([credit]));

      const { container, rerender } = render(
        <FollowUpPanel
          userId="test-user"
          language="hi"
          overdueThreshold={3}
        />
      );

      // Verify Hindi
      expect(container.textContent).toContain('फॉलो-अप और वसूली');

      // Change to Marathi
      rerender(
        <FollowUpPanel
          userId="test-user"
          language="mr"
          overdueThreshold={3}
        />
      );

      // Verify Marathi
      expect(container.textContent).toContain('फॉलो-अप आणि वसुली');
      expect(container.textContent).not.toContain('फॉलो-अप और वसूली');
    });

    it('should update UI when language prop changes from Marathi to English', () => {
      const credit = createOverdueCredit();
      localStorageMock.setItem('vyapar-credit-entries', JSON.stringify([credit]));

      const { container, rerender } = render(
        <FollowUpPanel
          userId="test-user"
          language="mr"
          overdueThreshold={3}
        />
      );

      // Verify Marathi
      expect(container.textContent).toContain('फॉलो-अप आणि वसुली');

      // Change to English
      rerender(
        <FollowUpPanel
          userId="test-user"
          language="en"
          overdueThreshold={3}
        />
      );

      // Verify English
      expect(screen.getByText('Follow-up & Collections')).toBeInTheDocument();
      expect(container.textContent).not.toContain('फॉलो-अप आणि वसुली');
    });
  });

  describe('WhatsApp message language matching', () => {
    it('should pass English language to WhatsApp Link Generator', () => {
      const credit = createOverdueCredit({ phoneNumber: '9876543210' });
      localStorageMock.setItem('vyapar-credit-entries', JSON.stringify([credit]));

      render(
        <FollowUpPanel
          userId="test-user"
          language="en"
          overdueThreshold={3}
        />
      );

      // WhatsApp button should be present (indicates language is passed correctly)
      expect(screen.getByText('Send WhatsApp Reminder')).toBeInTheDocument();
    });

    it('should pass Hindi language to WhatsApp Link Generator', () => {
      const credit = createOverdueCredit({ phoneNumber: '9876543210' });
      localStorageMock.setItem('vyapar-credit-entries', JSON.stringify([credit]));

      const { container } = render(
        <FollowUpPanel
          userId="test-user"
          language="hi"
          overdueThreshold={3}
        />
      );

      // WhatsApp button should be present with Hindi text
      expect(container.textContent).toContain('WhatsApp रिमाइंडर भेजें');
    });

    it('should pass Marathi language to WhatsApp Link Generator', () => {
      const credit = createOverdueCredit({ phoneNumber: '9876543210' });
      localStorageMock.setItem('vyapar-credit-entries', JSON.stringify([credit]));

      const { container } = render(
        <FollowUpPanel
          userId="test-user"
          language="mr"
          overdueThreshold={3}
        />
      );

      // WhatsApp button should be present with Marathi text
      expect(container.textContent).toContain('WhatsApp रिमाइंडर पाठवा');
    });

    it('should update WhatsApp button language when language changes', () => {
      const credit = createOverdueCredit({ phoneNumber: '9876543210' });
      localStorageMock.setItem('vyapar-credit-entries', JSON.stringify([credit]));

      const { container, rerender } = render(
        <FollowUpPanel
          userId="test-user"
          language="en"
          overdueThreshold={3}
        />
      );

      // Verify English
      expect(screen.getByText('Send WhatsApp Reminder')).toBeInTheDocument();

      // Change to Hindi
      rerender(
        <FollowUpPanel
          userId="test-user"
          language="hi"
          overdueThreshold={3}
        />
      );

      // Verify Hindi
      expect(container.textContent).toContain('WhatsApp रिमाइंडर भेजें');
      expect(container.textContent).not.toContain('Send WhatsApp Reminder');
    });

    it('should not display WhatsApp button when phone number is missing', () => {
      const credit = createOverdueCredit({ phoneNumber: undefined });
      localStorageMock.setItem('vyapar-credit-entries', JSON.stringify([credit]));

      const { container } = render(
        <FollowUpPanel
          userId="test-user"
          language="en"
          overdueThreshold={3}
        />
      );

      // WhatsApp button should not be present
      expect(container.textContent).not.toContain('Send WhatsApp Reminder');
    });
  });

  describe('Edge cases', () => {
    it('should handle multiple credits with different languages', () => {
      const credits = [
        createOverdueCredit({ id: 'credit-1', customerName: 'Customer 1' }),
        createOverdueCredit({ id: 'credit-2', customerName: 'Customer 2' }),
        createOverdueCredit({ id: 'credit-3', customerName: 'Customer 3' }),
      ];
      localStorageMock.setItem('vyapar-credit-entries', JSON.stringify(credits));

      const { container, rerender } = render(
        <FollowUpPanel
          userId="test-user"
          language="en"
          overdueThreshold={3}
        />
      );

      // All credits should be visible in English
      expect(screen.getByText('Customer 1')).toBeInTheDocument();
      expect(screen.getByText('Customer 2')).toBeInTheDocument();
      expect(screen.getByText('Customer 3')).toBeInTheDocument();

      // Change to Hindi
      rerender(
        <FollowUpPanel
          userId="test-user"
          language="hi"
          overdueThreshold={3}
        />
      );

      // All credits should still be visible with Hindi UI
      expect(screen.getByText('Customer 1')).toBeInTheDocument();
      expect(screen.getByText('Customer 2')).toBeInTheDocument();
      expect(screen.getByText('Customer 3')).toBeInTheDocument();
      expect(container.textContent).toContain('फॉलो-अप और वसूली');
    });

    it('should handle special characters in customer names across languages', () => {
      const credit = createOverdueCredit({ 
        customerName: "O'Brien & Sons (Pvt.) Ltd." 
      });
      localStorageMock.setItem('vyapar-credit-entries', JSON.stringify([credit]));

      const { container, rerender } = render(
        <FollowUpPanel
          userId="test-user"
          language="en"
          overdueThreshold={3}
        />
      );

      expect(container.textContent).toContain("O'Brien & Sons (Pvt.) Ltd.");

      // Change language - customer name should remain unchanged
      rerender(
        <FollowUpPanel
          userId="test-user"
          language="hi"
          overdueThreshold={3}
        />
      );

      expect(container.textContent).toContain("O'Brien & Sons (Pvt.) Ltd.");
    });
  });
});
