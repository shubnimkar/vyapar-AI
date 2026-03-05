/**
 * Unit Tests for Follow-Up Panel Error Handling
 * 
 * Tests error handling scenarios including:
 * - Invalid phone number validation
 * - Network error handling
 * - localStorage quota exceeded
 * - Sync conflict resolution
 * - Error message localization
 * 
 * Requirements: 3.1, 5.2, 6.3
 * 
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import FollowUpPanel from '../FollowUpPanel';
import * as creditManager from '@/lib/credit-manager';
import * as whatsappLinkGenerator from '@/lib/whatsapp-link-generator';
import * as reminderTracker from '@/lib/reminder-tracker';
import * as creditSync from '@/lib/credit-sync';
import { logger } from '@/lib/logger';
import type { CreditEntry, OverdueCredit } from '@/lib/types';

// Mock dependencies
jest.mock('@/lib/credit-manager');
jest.mock('@/lib/whatsapp-link-generator');
jest.mock('@/lib/reminder-tracker');
jest.mock('@/lib/credit-sync');
jest.mock('@/lib/logger');

describe('FollowUpPanel - Error Handling', () => {
  const mockUserId = 'test-user-123';
  const mockLanguage = 'en';
  let mockWindowOpen: jest.Mock;

  const mockCreditEntry: CreditEntry = {
    id: 'credit-1',
    userId: mockUserId,
    customerName: 'Test Customer',
    phoneNumber: '9876543210',
    amount: 5000,
    dateGiven: '2024-01-01',
    dueDate: '2024-01-10',
    isPaid: false,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  };

  const mockOverdueCredit: OverdueCredit = {
    ...mockCreditEntry,
    daysOverdue: 10,
    daysSinceReminder: null,
  };

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
    
    // Mock window.open
    mockWindowOpen = jest.fn();
    Object.defineProperty(window, 'open', {
      writable: true,
      value: mockWindowOpen,
    });

    // Setup localStorage mock
    const localStorageMock: { [key: string]: string } = {
      'vyapar-credit-entries': JSON.stringify([mockCreditEntry]),
      'vyapar-credit-sync-status': JSON.stringify({
        lastSyncTime: '2024-01-15T10:00:00Z',
        pendingCount: 0,
        errorCount: 0,
      }),
    };

    Storage.prototype.getItem = jest.fn((key: string) => localStorageMock[key] || null);
    Storage.prototype.setItem = jest.fn((key: string, value: string) => {
      localStorageMock[key] = value;
    });

    // Mock Credit Manager
    (creditManager.getOverdueCredits as jest.Mock).mockReturnValue([mockOverdueCredit]);

    // Mock navigator.onLine
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: true,
    });
  });

  describe('Invalid Phone Number Validation', () => {
    it('should display error for missing phone number', async () => {
      const creditWithoutPhone: OverdueCredit = {
        ...mockOverdueCredit,
        phoneNumber: undefined,
      };

      (creditManager.getOverdueCredits as jest.Mock).mockReturnValue([creditWithoutPhone]);

      render(<FollowUpPanel userId={mockUserId} language={mockLanguage} />);

      await waitFor(() => {
        expect(screen.getByText('Test Customer')).toBeInTheDocument();
      });

      // WhatsApp button should not be rendered
      expect(screen.queryByText(/Send WhatsApp Reminder/i)).not.toBeInTheDocument();
    });

    it('should display error for invalid phone number format (too short)', async () => {
      const creditWithInvalidPhone: OverdueCredit = {
        ...mockOverdueCredit,
        phoneNumber: '12345', // Too short
      };

      (creditManager.getOverdueCredits as jest.Mock).mockReturnValue([creditWithInvalidPhone]);

      render(<FollowUpPanel userId={mockUserId} language={mockLanguage} />);

      await waitFor(() => {
        expect(screen.getByText('Test Customer')).toBeInTheDocument();
      });

      const reminderButton = screen.getByText(/Send WhatsApp Reminder/i);
      fireEvent.click(reminderButton);

      await waitFor(() => {
        expect(screen.getByText(/Invalid phone number/i)).toBeInTheDocument();
      });

      expect(logger.warn).toHaveBeenCalledWith(
        'Invalid phone number format',
        expect.objectContaining({
          userId: mockUserId,
          creditId: 'credit-1',
        })
      );
    });

    it('should display error for invalid phone number format (non-numeric)', async () => {
      const creditWithInvalidPhone: OverdueCredit = {
        ...mockOverdueCredit,
        phoneNumber: '98765abc10', // Non-numeric
      };

      (creditManager.getOverdueCredits as jest.Mock).mockReturnValue([creditWithInvalidPhone]);

      render(<FollowUpPanel userId={mockUserId} language={mockLanguage} />);

      await waitFor(() => {
        expect(screen.getByText('Test Customer')).toBeInTheDocument();
      });

      const reminderButton = screen.getByText(/Send WhatsApp Reminder/i);
      fireEvent.click(reminderButton);

      await waitFor(() => {
        expect(screen.getByText(/Invalid phone number/i)).toBeInTheDocument();
      });

      expect(logger.warn).toHaveBeenCalledWith(
        'Invalid phone number format',
        expect.objectContaining({
          userId: mockUserId,
          creditId: 'credit-1',
        })
      );
    });

    it('should display error for invalid phone number format (too long)', async () => {
      const creditWithInvalidPhone: OverdueCredit = {
        ...mockOverdueCredit,
        phoneNumber: '98765432101234', // Too long
      };

      (creditManager.getOverdueCredits as jest.Mock).mockReturnValue([creditWithInvalidPhone]);

      render(<FollowUpPanel userId={mockUserId} language={mockLanguage} />);

      await waitFor(() => {
        expect(screen.getByText('Test Customer')).toBeInTheDocument();
      });

      const reminderButton = screen.getByText(/Send WhatsApp Reminder/i);
      fireEvent.click(reminderButton);

      await waitFor(() => {
        expect(screen.getByText(/Invalid phone number/i)).toBeInTheDocument();
      });
    });
  });

  describe('Network Error Handling', () => {
    it('should handle network error during sync gracefully', async () => {
      // Mock sync failure
      const mockSyncPendingEntries = jest.fn().mockRejectedValue(new Error('Network error'));
      (creditSync as any).syncPendingEntries = mockSyncPendingEntries;

      render(<FollowUpPanel userId={mockUserId} language={mockLanguage} />);

      await waitFor(() => {
        expect(screen.getByText('Test Customer')).toBeInTheDocument();
      });

      // Trigger sync by simulating online event
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: true,
      });

      fireEvent(window, new Event('online'));

      await waitFor(() => {
        expect(logger.error).toHaveBeenCalledWith(
          'Sync failed',
          expect.objectContaining({
            userId: mockUserId,
          })
        );
      });
    });

    it('should handle network error during mark as paid sync', async () => {
      const mockMarkCreditAsPaid = jest.fn();
      (creditSync as any).markCreditAsPaid = mockMarkCreditAsPaid;

      // Mock fetch to fail
      global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

      render(<FollowUpPanel userId={mockUserId} language={mockLanguage} />);

      await waitFor(() => {
        expect(screen.getByText('Test Customer')).toBeInTheDocument();
      });

      const markPaidButton = screen.getByText(/Mark as Paid/i);
      fireEvent.click(markPaidButton);

      await waitFor(() => {
        expect(mockMarkCreditAsPaid).toHaveBeenCalledWith('credit-1', false);
      });

      // Should log warning about network error
      await waitFor(() => {
        expect(logger.warn).toHaveBeenCalledWith(
          'Network error during payment sync, will retry later',
          expect.objectContaining({
            userId: mockUserId,
            creditId: 'credit-1',
          })
        );
      });
    });
  });

  describe('localStorage Quota Exceeded', () => {
    it('should display error when localStorage quota is exceeded during load', async () => {
      Storage.prototype.getItem = jest.fn().mockImplementation(() => {
        const error = new Error('QuotaExceededError');
        error.name = 'QuotaExceededError';
        throw error;
      });

      render(<FollowUpPanel userId={mockUserId} language={mockLanguage} />);

      await waitFor(() => {
        expect(screen.getByText(/Storage full/i)).toBeInTheDocument();
      });

      expect(logger.error).toHaveBeenCalledWith(
        'localStorage quota exceeded',
        expect.objectContaining({
          userId: mockUserId,
        })
      );
    });

    it('should display error when localStorage quota is exceeded during reminder', async () => {
      (whatsappLinkGenerator.generateReminderLink as jest.Mock).mockReturnValue(
        'https://wa.me/+919876543210?text=test'
      );

      (reminderTracker.recordReminder as jest.Mock).mockImplementation(() => {
        const error = new Error('QuotaExceededError');
        error.name = 'QuotaExceededError';
        throw error;
      });

      render(<FollowUpPanel userId={mockUserId} language={mockLanguage} />);

      await waitFor(() => {
        expect(screen.getByText('Test Customer')).toBeInTheDocument();
      });

      const reminderButton = screen.getByText(/Send WhatsApp Reminder/i);
      fireEvent.click(reminderButton);

      await waitFor(() => {
        expect(screen.getByText(/Storage full/i)).toBeInTheDocument();
      });

      expect(logger.error).toHaveBeenCalledWith(
        'localStorage quota exceeded while sending reminder',
        expect.objectContaining({
          userId: mockUserId,
          creditId: 'credit-1',
        })
      );
    });

    it('should display error when localStorage quota is exceeded during mark as paid', async () => {
      const mockMarkCreditAsPaid = jest.fn().mockImplementation(() => {
        const error = new Error('QuotaExceededError');
        error.name = 'QuotaExceededError';
        throw error;
      });
      (creditSync as any).markCreditAsPaid = mockMarkCreditAsPaid;

      render(<FollowUpPanel userId={mockUserId} language={mockLanguage} />);

      await waitFor(() => {
        expect(screen.getByText('Test Customer')).toBeInTheDocument();
      });

      const markPaidButton = screen.getByText(/Mark as Paid/i);
      fireEvent.click(markPaidButton);

      await waitFor(() => {
        expect(screen.getByText(/Storage full/i)).toBeInTheDocument();
      });

      expect(logger.error).toHaveBeenCalledWith(
        'localStorage quota exceeded while marking as paid',
        expect.objectContaining({
          userId: mockUserId,
          creditId: 'credit-1',
        })
      );
    });
  });

  describe('Sync Conflict Resolution', () => {
    it('should display error message for sync conflict', async () => {
      const mockSyncPendingEntries = jest.fn().mockRejectedValue(new Error('Sync conflict detected'));
      (creditSync as any).syncPendingEntries = mockSyncPendingEntries;

      render(<FollowUpPanel userId={mockUserId} language={mockLanguage} />);

      await waitFor(() => {
        expect(screen.getByText('Test Customer')).toBeInTheDocument();
      });

      // Trigger sync
      fireEvent(window, new Event('online'));

      await waitFor(() => {
        expect(screen.getByText(/Sync conflict detected/i)).toBeInTheDocument();
      });

      expect(logger.warn).toHaveBeenCalledWith(
        'Sync conflict detected',
        expect.objectContaining({
          userId: mockUserId,
        })
      );
    });
  });

  describe('Error Message Localization', () => {
    it('should display error messages in Hindi', async () => {
      const creditWithInvalidPhone: OverdueCredit = {
        ...mockOverdueCredit,
        phoneNumber: '12345',
      };

      (creditManager.getOverdueCredits as jest.Mock).mockReturnValue([creditWithInvalidPhone]);

      render(<FollowUpPanel userId={mockUserId} language="hi" />);

      await waitFor(() => {
        expect(screen.getByText('Test Customer')).toBeInTheDocument();
      });

      const reminderButton = screen.getByText(/WhatsApp/i);
      fireEvent.click(reminderButton);

      await waitFor(() => {
        expect(screen.getByText(/अमान्य फ़ोन नंबर/i)).toBeInTheDocument();
      });
    });

    it('should display error messages in Marathi', async () => {
      const creditWithInvalidPhone: OverdueCredit = {
        ...mockOverdueCredit,
        phoneNumber: '12345',
      };

      (creditManager.getOverdueCredits as jest.Mock).mockReturnValue([creditWithInvalidPhone]);

      render(<FollowUpPanel userId={mockUserId} language="mr" />);

      await waitFor(() => {
        expect(screen.getByText('Test Customer')).toBeInTheDocument();
      });

      const reminderButton = screen.getByText(/WhatsApp/i);
      fireEvent.click(reminderButton);

      await waitFor(() => {
        expect(screen.getByText(/अवैध फोन नंबर/i)).toBeInTheDocument();
      });
    });

    it('should display storage quota error in Hindi', async () => {
      Storage.prototype.getItem = jest.fn().mockImplementation(() => {
        const error = new Error('QuotaExceededError');
        error.name = 'QuotaExceededError';
        throw error;
      });

      render(<FollowUpPanel userId={mockUserId} language="hi" />);

      await waitFor(() => {
        expect(screen.getByText(/स्टोरेज भरा हुआ है/i)).toBeInTheDocument();
      });
    });

    it('should display storage quota error in Marathi', async () => {
      Storage.prototype.getItem = jest.fn().mockImplementation(() => {
        const error = new Error('QuotaExceededError');
        error.name = 'QuotaExceededError';
        throw error;
      });

      render(<FollowUpPanel userId={mockUserId} language="mr" />);

      await waitFor(() => {
        expect(screen.getByText(/स्टोरेज भरले आहे/i)).toBeInTheDocument();
      });
    });
  });

  describe('Error Dismissal', () => {
    it('should allow user to dismiss error messages', async () => {
      const creditWithInvalidPhone: OverdueCredit = {
        ...mockOverdueCredit,
        phoneNumber: '12345',
      };

      (creditManager.getOverdueCredits as jest.Mock).mockReturnValue([creditWithInvalidPhone]);

      render(<FollowUpPanel userId={mockUserId} language={mockLanguage} />);

      await waitFor(() => {
        expect(screen.getByText('Test Customer')).toBeInTheDocument();
      });

      const reminderButton = screen.getByText(/Send WhatsApp Reminder/i);
      fireEvent.click(reminderButton);

      await waitFor(() => {
        expect(screen.getByText(/Invalid phone number/i)).toBeInTheDocument();
      });

      // Find and click dismiss button
      const dismissButton = screen.getByText(/Dismiss/i);
      fireEvent.click(dismissButton);

      await waitFor(() => {
        expect(screen.queryByText(/Invalid phone number/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('Error Logging', () => {
    it('should log errors with proper context', async () => {
      const creditWithInvalidPhone: OverdueCredit = {
        ...mockOverdueCredit,
        phoneNumber: '12345',
      };

      (creditManager.getOverdueCredits as jest.Mock).mockReturnValue([creditWithInvalidPhone]);

      render(<FollowUpPanel userId={mockUserId} language={mockLanguage} />);

      await waitFor(() => {
        expect(screen.getByText('Test Customer')).toBeInTheDocument();
      });

      const reminderButton = screen.getByText(/Send WhatsApp Reminder/i);
      fireEvent.click(reminderButton);

      await waitFor(() => {
        expect(logger.warn).toHaveBeenCalledWith(
          'Invalid phone number format',
          expect.objectContaining({
            userId: mockUserId,
            creditId: 'credit-1',
            phoneNumber: 5, // length
          })
        );
      });
    });

    it('should log successful operations', async () => {
      (whatsappLinkGenerator.generateReminderLink as jest.Mock).mockReturnValue(
        'https://wa.me/+919876543210?text=test'
      );
      (reminderTracker.recordReminder as jest.Mock).mockResolvedValue(undefined);

      render(<FollowUpPanel userId={mockUserId} language={mockLanguage} />);

      await waitFor(() => {
        expect(screen.getByText('Test Customer')).toBeInTheDocument();
      });

      const reminderButton = screen.getByText(/Send WhatsApp Reminder/i);
      fireEvent.click(reminderButton);

      await waitFor(() => {
        expect(logger.info).toHaveBeenCalledWith(
          'WhatsApp reminder sent',
          expect.objectContaining({
            userId: mockUserId,
            creditId: 'credit-1',
            customerName: 'Test Customer',
          })
        );
      });
    });
  });

  describe('Button Disabled States', () => {
    it('should disable WhatsApp button when validation error occurs', async () => {
      const creditWithInvalidPhone: OverdueCredit = {
        ...mockOverdueCredit,
        phoneNumber: '12345',
      };

      (creditManager.getOverdueCredits as jest.Mock).mockReturnValue([creditWithInvalidPhone]);

      render(<FollowUpPanel userId={mockUserId} language={mockLanguage} />);

      await waitFor(() => {
        expect(screen.getByText('Test Customer')).toBeInTheDocument();
      });

      const reminderButton = screen.getByRole('button', { name: /Send WhatsApp Reminder/i });
      fireEvent.click(reminderButton);

      await waitFor(() => {
        expect(screen.getByText(/Invalid phone number/i)).toBeInTheDocument();
      });

      // Button should be disabled after error
      await waitFor(() => {
        expect(reminderButton).toBeDisabled();
      });
    });

    it('should disable mark as paid button when error occurs', async () => {
      const mockMarkCreditAsPaid = jest.fn().mockImplementation(() => {
        throw new Error('Test error');
      });
      (creditSync as any).markCreditAsPaid = mockMarkCreditAsPaid;

      render(<FollowUpPanel userId={mockUserId} language={mockLanguage} />);

      await waitFor(() => {
        expect(screen.getByText('Test Customer')).toBeInTheDocument();
      });

      const markPaidButton = screen.getByRole('button', { name: /Mark as Paid/i });
      fireEvent.click(markPaidButton);

      await waitFor(() => {
        expect(screen.getByText(/Failed to mark as paid/i)).toBeInTheDocument();
      });

      // Button should be disabled after error
      await waitFor(() => {
        expect(markPaidButton).toBeDisabled();
      });
    });
  });
});
