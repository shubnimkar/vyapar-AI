/**
 * Unit Tests: WhatsApp Reminder Functionality
 * 
 * Feature: udhaar-follow-up-helper
 * 
 * Tests:
 * - Button click opens WhatsApp URL
 * - Reminder timestamp is recorded
 * - Button is hidden when phoneNumber is missing
 * - Error handling for invalid phone numbers
 * 
 * Requirements: 3.1, 3.3, 3.4, 4.1
 * 
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import FollowUpPanel from '../FollowUpPanel';
import * as whatsappLinkGenerator from '@/lib/whatsapp-link-generator';
import * as reminderTracker from '@/lib/reminder-tracker';
import type { CreditEntry } from '@/lib/types';

// Mock dependencies
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

jest.mock('@/lib/whatsapp-link-generator');
jest.mock('@/lib/reminder-tracker');

jest.mock('@/lib/translations', () => ({
  t: jest.fn((key: string) => {
    const translations: { [key: string]: string } = {
      'followUp.title': 'Follow-up & Collections',
      'followUp.noOverdue': 'No overdue credits',
      'followUp.daysOverdue': 'days overdue',
      'followUp.sendReminder': 'Send WhatsApp Reminder',
      'followUp.lastReminder': 'Last reminder',
      'followUp.neverReminded': 'Never reminded',
      'followUp.threshold': 'Showing credits overdue by {days}+ days',
      'followUp.totalOverdue': 'Total Overdue',
      'daily.syncSuccess': 'Synced',
      'daily.pendingSync': 'pending',
      'daily.offlineMode': 'Offline',
      'daily.entryDate': 'Date Given',
      'dueDate': 'Due Date',
      'daily.daysAgo': 'days ago',
      'overdueCustomers': 'Overdue Customers',
    };
    return translations[key] || key;
  }),
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

describe('FollowUpPanel - WhatsApp Reminder Functionality', () => {
  const mockWindowOpen = jest.fn();
  
  beforeEach(() => {
    // Clear localStorage
    localStorageMock.clear();

    // Mock window.open
    window.open = mockWindowOpen;

    jest.clearAllMocks();
  });

  describe('Button click opens WhatsApp URL', () => {
    it('should generate WhatsApp URL and open it when button is clicked', async () => {
      const mockWhatsAppUrl = 'https://wa.me/+911234567890?text=Hello%20Test';
      
      (whatsappLinkGenerator.generateReminderLink as jest.Mock).mockReturnValue(mockWhatsAppUrl);
      (reminderTracker.recordReminder as jest.Mock).mockResolvedValue(undefined);

      const creditWithPhone: CreditEntry = {
        id: 'credit-1',
        userId: 'user-1',
        customerName: 'Test Customer',
        phoneNumber: '1234567890',
        amount: 5000,
        dateGiven: '2024-01-01',
        dueDate: '2024-01-10',
        isPaid: false,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      };

      localStorage.setItem('vyapar-credit-entries', JSON.stringify([creditWithPhone]));

      render(
        <FollowUpPanel
          userId="user-1"
          language="en"
          overdueThreshold={3}
        />
      );

      // Find and click WhatsApp button
      const whatsappButton = screen.getByText('Send WhatsApp Reminder');
      fireEvent.click(whatsappButton);

      await waitFor(() => {
        // Verify generateReminderLink was called with correct parameters
        expect(whatsappLinkGenerator.generateReminderLink).toHaveBeenCalledWith(
          '1234567890',
          'Test Customer',
          5000,
          '2024-01-10',
          'en'
        );

        // Verify window.open was called with the generated URL
        expect(mockWindowOpen).toHaveBeenCalledWith(mockWhatsAppUrl, '_blank');
      });
    });

    it('should use correct language for WhatsApp message', async () => {
      (whatsappLinkGenerator.generateReminderLink as jest.Mock).mockReturnValue('https://wa.me/test');
      (reminderTracker.recordReminder as jest.Mock).mockResolvedValue(undefined);

      const creditWithPhone: CreditEntry = {
        id: 'credit-1',
        userId: 'user-1',
        customerName: 'राज कुमार',
        phoneNumber: '9876543210',
        amount: 3000,
        dateGiven: '2024-01-01',
        dueDate: '2024-01-15',
        isPaid: false,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      };

      localStorage.setItem('vyapar-credit-entries', JSON.stringify([creditWithPhone]));

      render(
        <FollowUpPanel
          userId="user-1"
          language="hi"
          overdueThreshold={3}
        />
      );

      const whatsappButton = screen.getByText('Send WhatsApp Reminder');
      fireEvent.click(whatsappButton);

      await waitFor(() => {
        expect(whatsappLinkGenerator.generateReminderLink).toHaveBeenCalledWith(
          '9876543210',
          'राज कुमार',
          3000,
          '2024-01-15',
          'hi' // Hindi language
        );
      });
    });
  });

  describe('Reminder timestamp is recorded', () => {
    it('should call recordReminder when button is clicked', async () => {
      (whatsappLinkGenerator.generateReminderLink as jest.Mock).mockReturnValue('https://wa.me/test');
      (reminderTracker.recordReminder as jest.Mock).mockResolvedValue(undefined);

      const creditWithPhone: CreditEntry = {
        id: 'credit-123',
        userId: 'user-456',
        customerName: 'Test Customer',
        phoneNumber: '1234567890',
        amount: 5000,
        dateGiven: '2024-01-01',
        dueDate: '2024-01-10',
        isPaid: false,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      };

      localStorage.setItem('vyapar-credit-entries', JSON.stringify([creditWithPhone]));

      render(
        <FollowUpPanel
          userId="user-456"
          language="en"
          overdueThreshold={3}
        />
      );

      const whatsappButton = screen.getByText('Send WhatsApp Reminder');
      fireEvent.click(whatsappButton);

      await waitFor(() => {
        // Verify recordReminder was called with correct credit ID and user ID
        expect(reminderTracker.recordReminder).toHaveBeenCalledWith('credit-123', 'user-456');
      });
    });

    it('should reload credits after recording reminder', async () => {
      (whatsappLinkGenerator.generateReminderLink as jest.Mock).mockReturnValue('https://wa.me/test');
      (reminderTracker.recordReminder as jest.Mock).mockResolvedValue(undefined);

      const creditWithPhone: CreditEntry = {
        id: 'credit-1',
        userId: 'user-1',
        customerName: 'Test Customer',
        phoneNumber: '1234567890',
        amount: 5000,
        dateGiven: '2024-01-01',
        dueDate: '2024-01-10',
        isPaid: false,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      };

      localStorage.setItem('vyapar-credit-entries', JSON.stringify([creditWithPhone]));

      const { rerender } = render(
        <FollowUpPanel
          userId="user-1"
          language="en"
          overdueThreshold={3}
        />
      );

      const whatsappButton = screen.getByText('Send WhatsApp Reminder');
      fireEvent.click(whatsappButton);

      await waitFor(() => {
        expect(reminderTracker.recordReminder).toHaveBeenCalled();
      });

      // Update localStorage with reminder timestamp
      const updatedCredit = {
        ...creditWithPhone,
        lastReminderAt: new Date().toISOString(),
      };
      localStorage.setItem('vyapar-credit-entries', JSON.stringify([updatedCredit]));

      // Component should reload and show updated reminder info
      rerender(
        <FollowUpPanel
          userId="user-1"
          language="en"
          overdueThreshold={3}
        />
      );

      // Verify "Never reminded" is no longer shown
      expect(screen.queryByText('Never reminded')).not.toBeInTheDocument();
    });
  });

  describe('Button is hidden when phoneNumber is missing', () => {
    it('should not display WhatsApp button when phoneNumber is undefined', () => {
      const creditWithoutPhone: CreditEntry = {
        id: 'credit-1',
        userId: 'user-1',
        customerName: 'Test Customer',
        // phoneNumber is undefined
        amount: 5000,
        dateGiven: '2024-01-01',
        dueDate: '2024-01-10',
        isPaid: false,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      };

      localStorage.setItem('vyapar-credit-entries', JSON.stringify([creditWithoutPhone]));

      render(
        <FollowUpPanel
          userId="user-1"
          language="en"
          overdueThreshold={3}
        />
      );

      // Verify customer name is displayed
      expect(screen.getByText('Test Customer')).toBeInTheDocument();

      // Verify WhatsApp button is NOT displayed
      expect(screen.queryByText('Send WhatsApp Reminder')).not.toBeInTheDocument();
    });

    it('should not display WhatsApp button when phoneNumber is empty string', () => {
      const creditWithEmptyPhone: CreditEntry = {
        id: 'credit-1',
        userId: 'user-1',
        customerName: 'Test Customer',
        phoneNumber: '', // Empty string
        amount: 5000,
        dateGiven: '2024-01-01',
        dueDate: '2024-01-10',
        isPaid: false,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      };

      localStorage.setItem('vyapar-credit-entries', JSON.stringify([creditWithEmptyPhone]));

      render(
        <FollowUpPanel
          userId="user-1"
          language="en"
          overdueThreshold={3}
        />
      );

      expect(screen.getByText('Test Customer')).toBeInTheDocument();
      expect(screen.queryByText('Send WhatsApp Reminder')).not.toBeInTheDocument();
    });
  });

  describe('Error handling for invalid phone numbers', () => {
    it('should handle error when generateReminderLink throws', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      
      (whatsappLinkGenerator.generateReminderLink as jest.Mock).mockImplementation(() => {
        throw new Error('Invalid phone number');
      });

      const creditWithInvalidPhone: CreditEntry = {
        id: 'credit-1',
        userId: 'user-1',
        customerName: 'Test Customer',
        phoneNumber: '123', // Invalid: too short
        amount: 5000,
        dateGiven: '2024-01-01',
        dueDate: '2024-01-10',
        isPaid: false,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      };

      localStorage.setItem('vyapar-credit-entries', JSON.stringify([creditWithInvalidPhone]));

      render(
        <FollowUpPanel
          userId="user-1"
          language="en"
          overdueThreshold={3}
        />
      );

      const whatsappButton = screen.getByText('Send WhatsApp Reminder');
      fireEvent.click(whatsappButton);

      await waitFor(() => {
        // Verify error was logged
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          'Failed to send reminder:',
          expect.any(Error)
        );

        // Verify window.open was NOT called
        expect(mockWindowOpen).not.toHaveBeenCalled();
      });

      consoleErrorSpy.mockRestore();
    });

    it('should handle error when recordReminder fails', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      
      (whatsappLinkGenerator.generateReminderLink as jest.Mock).mockReturnValue('https://wa.me/test');
      (reminderTracker.recordReminder as jest.Mock).mockRejectedValue(new Error('Sync failed'));

      const creditWithPhone: CreditEntry = {
        id: 'credit-1',
        userId: 'user-1',
        customerName: 'Test Customer',
        phoneNumber: '1234567890',
        amount: 5000,
        dateGiven: '2024-01-01',
        dueDate: '2024-01-10',
        isPaid: false,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      };

      localStorage.setItem('vyapar-credit-entries', JSON.stringify([creditWithPhone]));

      render(
        <FollowUpPanel
          userId="user-1"
          language="en"
          overdueThreshold={3}
        />
      );

      const whatsappButton = screen.getByText('Send WhatsApp Reminder');
      fireEvent.click(whatsappButton);

      await waitFor(() => {
        // Verify error was logged
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          'Failed to send reminder:',
          expect.any(Error)
        );
      });

      consoleErrorSpy.mockRestore();
    });

    it('should not open WhatsApp when phoneNumber is missing', () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      
      const creditWithoutPhone: CreditEntry = {
        id: 'credit-1',
        userId: 'user-1',
        customerName: 'Test Customer',
        // phoneNumber is undefined
        amount: 5000,
        dateGiven: '2024-01-01',
        dueDate: '2024-01-10',
        isPaid: false,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      };

      localStorage.setItem('vyapar-credit-entries', JSON.stringify([creditWithoutPhone]));

      render(
        <FollowUpPanel
          userId="user-1"
          language="en"
          overdueThreshold={3}
        />
      );

      // Button should not exist, so no click can happen
      expect(screen.queryByText('Send WhatsApp Reminder')).not.toBeInTheDocument();
      expect(mockWindowOpen).not.toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });
  });
});
