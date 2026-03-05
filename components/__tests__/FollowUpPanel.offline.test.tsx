/**
 * Unit Tests for Follow-Up Panel Offline Functionality
 * Feature: udhaar-follow-up-helper
 * 
 * Tests offline mode handling, sync queue, and localStorage quota errors
 * Requirements: 5.1, 5.4, 5.5
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
import type { CreditEntry, OverdueCredit } from '@/lib/types';

// Mock modules
jest.mock('@/lib/credit-manager');
jest.mock('@/lib/whatsapp-link-generator');
jest.mock('@/lib/reminder-tracker');
jest.mock('@/lib/credit-sync');
jest.mock('@/lib/translations', () => ({
  t: (key: string) => {
    const translations: Record<string, string> = {
      'followUp.title': 'Follow-up & Collections',
      'followUp.noOverdue': 'No overdue credits',
      'followUp.daysOverdue': 'days overdue',
      'followUp.sendReminder': 'Send Reminder',
      'followUp.lastReminder': 'Last reminder',
      'followUp.neverReminded': 'Never reminded',
      'followUp.markPaid': 'Mark as Paid',
      'followUp.threshold': 'Showing credits overdue by {days}+ days',
      'followUp.totalOverdue': 'Total Overdue',
      'daily.syncSuccess': 'Synced',
      'daily.pendingSync': 'pending',
      'daily.offlineMode': 'Offline',
      'daily.syncing': 'Syncing...',
      'daily.entryDate': 'Date Given',
      'daily.daysAgo': 'days ago',
      'dueDate': 'Due Date',
      'overdueCustomers': 'Overdue Customers',
      'error.storageQuotaExceeded': 'Storage full',
    };
    return translations[key] || key;
  },
}));

describe('FollowUpPanel - Offline Functionality', () => {
  const mockUserId = 'user123';
  const mockLanguage = 'en' as const;

  const mockCreditEntry: CreditEntry = {
    id: 'credit1',
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
    // Clear localStorage
    localStorage.clear();

    // Reset mocks
    jest.clearAllMocks();

    // Mock window.open
    global.open = jest.fn();

    // Mock navigator.onLine (default to online)
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: true,
    });

    // Default mock implementations
    (creditManager.getOverdueCredits as jest.Mock).mockReturnValue([mockOverdueCredit]);
    (whatsappLinkGenerator.generateReminderLink as jest.Mock).mockReturnValue(
      'https://wa.me/919876543210?text=Test'
    );
    (reminderTracker.recordReminder as jest.Mock).mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Offline Mode Detection', () => {
    it('should detect offline status on mount', () => {
      // Set navigator to offline
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false,
      });

      // Set up localStorage with pending sync
      localStorage.setItem(
        'vyapar-credit-sync-status',
        JSON.stringify({
          lastSyncTime: '2024-01-01T00:00:00Z',
          pendingCount: 2,
          errorCount: 0,
        })
      );

      localStorage.setItem(
        'vyapar-credit-entries',
        JSON.stringify([mockCreditEntry])
      );

      render(<FollowUpPanel userId={mockUserId} language={mockLanguage} />);

      // Should show offline status
      expect(screen.getByText('Offline')).toBeInTheDocument();
    });

    it('should update status when going offline', async () => {
      localStorage.setItem(
        'vyapar-credit-entries',
        JSON.stringify([mockCreditEntry])
      );

      render(<FollowUpPanel userId={mockUserId} language={mockLanguage} />);

      // Initially online
      await waitFor(() => {
        expect(screen.getByText('Synced')).toBeInTheDocument();
      });

      // Simulate going offline
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false,
      });
      fireEvent(window, new Event('offline'));

      // Should show offline status
      await waitFor(() => {
        expect(screen.getByText('Offline')).toBeInTheDocument();
      });
    });

    it('should update status when coming online', async () => {
      // Start offline
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false,
      });

      localStorage.setItem(
        'vyapar-credit-entries',
        JSON.stringify([mockCreditEntry])
      );

      render(<FollowUpPanel userId={mockUserId} language={mockLanguage} />);

      await waitFor(() => {
        expect(screen.getByText('Offline')).toBeInTheDocument();
      });

      // Mock sync function
      (creditSync.syncPendingEntries as jest.Mock).mockResolvedValue({
        success: 0,
        failed: 0,
      });

      // Simulate coming online
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: true,
      });
      fireEvent(window, new Event('online'));

      // Should trigger sync
      await waitFor(() => {
        expect(creditSync.syncPendingEntries).toHaveBeenCalledWith(mockUserId);
      });
    });
  });

  describe('Offline Operations', () => {
    it('should allow sending reminders while offline', async () => {
      // Set offline
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false,
      });

      localStorage.setItem(
        'vyapar-credit-entries',
        JSON.stringify([mockCreditEntry])
      );

      render(<FollowUpPanel userId={mockUserId} language={mockLanguage} />);

      await waitFor(() => {
        expect(screen.getByText('Test Customer')).toBeInTheDocument();
      });

      // Click send reminder button
      const reminderButton = screen.getByText('Send Reminder');
      fireEvent.click(reminderButton);

      // Should record reminder locally
      await waitFor(() => {
        expect(reminderTracker.recordReminder).toHaveBeenCalledWith(
          mockCreditEntry.id,
          mockUserId
        );
      });

      // Should open WhatsApp
      expect(global.open).toHaveBeenCalledWith(
        'https://wa.me/919876543210?text=Test',
        '_blank'
      );
    });

    it('should allow marking as paid while offline', async () => {
      // Set offline
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false,
      });

      localStorage.setItem(
        'vyapar-credit-entries',
        JSON.stringify([mockCreditEntry])
      );

      (creditSync.markCreditAsPaid as jest.Mock).mockReturnValue({
        ...mockCreditEntry,
        isPaid: true,
        syncStatus: 'pending',
      });

      render(<FollowUpPanel userId={mockUserId} language={mockLanguage} />);

      await waitFor(() => {
        expect(screen.getByText('Test Customer')).toBeInTheDocument();
      });

      // Click mark as paid button
      const paidButton = screen.getByText('Mark as Paid');
      fireEvent.click(paidButton);

      // Should mark as paid locally
      await waitFor(() => {
        expect(creditSync.markCreditAsPaid).toHaveBeenCalledWith(
          mockCreditEntry.id,
          false
        );
      });

      // Should NOT attempt network sync (offline)
      expect(global.fetch).not.toHaveBeenCalled();
    });
  });

  describe('Sync Queue Management', () => {
    it('should display pending sync count', () => {
      localStorage.setItem(
        'vyapar-credit-sync-status',
        JSON.stringify({
          lastSyncTime: '2024-01-01T00:00:00Z',
          pendingCount: 3,
          errorCount: 0,
        })
      );

      localStorage.setItem(
        'vyapar-credit-entries',
        JSON.stringify([mockCreditEntry])
      );

      render(<FollowUpPanel userId={mockUserId} language={mockLanguage} />);

      // Should show pending count
      expect(screen.getByText('3 pending')).toBeInTheDocument();
    });

    it('should trigger sync when coming online with pending items', async () => {
      // Start offline with pending items
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false,
      });

      localStorage.setItem(
        'vyapar-credit-sync-status',
        JSON.stringify({
          lastSyncTime: '2024-01-01T00:00:00Z',
          pendingCount: 2,
          errorCount: 0,
        })
      );

      localStorage.setItem(
        'vyapar-credit-entries',
        JSON.stringify([mockCreditEntry])
      );

      render(<FollowUpPanel userId={mockUserId} language={mockLanguage} />);

      // Mock sync function
      (creditSync.syncPendingEntries as jest.Mock).mockResolvedValue({
        success: 2,
        failed: 0,
      });

      // Come online
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: true,
      });
      fireEvent(window, new Event('online'));

      // Should trigger sync
      await waitFor(() => {
        expect(creditSync.syncPendingEntries).toHaveBeenCalledWith(mockUserId);
      });
    });

    it('should show syncing indicator during sync', async () => {
      localStorage.setItem(
        'vyapar-credit-entries',
        JSON.stringify([mockCreditEntry])
      );

      localStorage.setItem(
        'vyapar-credit-sync-status',
        JSON.stringify({
          lastSyncTime: '2024-01-01T00:00:00Z',
          pendingCount: 1,
          errorCount: 0,
        })
      );

      // Mock sync to take some time
      (creditSync.syncPendingEntries as jest.Mock).mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({ success: 1, failed: 0 }), 100))
      );

      render(<FollowUpPanel userId={mockUserId} language={mockLanguage} />);

      // Trigger sync by coming online
      fireEvent(window, new Event('online'));

      // Should show syncing indicator
      await waitFor(() => {
        expect(screen.getByText('Syncing...')).toBeInTheDocument();
      });
    });
  });

  describe('localStorage Quota Exceeded Handling', () => {
    it('should display error banner when quota exceeded on load', () => {
      // Mock localStorage.getItem to throw QuotaExceededError
      const quotaError = new Error('QuotaExceededError');
      quotaError.name = 'QuotaExceededError';
      
      jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
        throw quotaError;
      });

      render(<FollowUpPanel userId={mockUserId} language={mockLanguage} />);

      // Should show quota error banner
      expect(screen.getByText('Storage full')).toBeInTheDocument();
    });

    it('should display error banner when quota exceeded on reminder', async () => {
      localStorage.setItem(
        'vyapar-credit-entries',
        JSON.stringify([mockCreditEntry])
      );

      render(<FollowUpPanel userId={mockUserId} language={mockLanguage} />);

      await waitFor(() => {
        expect(screen.getByText('Test Customer')).toBeInTheDocument();
      });

      // Mock recordReminder to throw QuotaExceededError
      const quotaError = new Error('QuotaExceededError');
      quotaError.name = 'QuotaExceededError';
      (reminderTracker.recordReminder as jest.Mock).mockRejectedValue(quotaError);

      // Click send reminder button
      const reminderButton = screen.getByText('Send Reminder');
      fireEvent.click(reminderButton);

      // Should show quota error banner
      await waitFor(() => {
        expect(screen.getByText('Storage full')).toBeInTheDocument();
      });
    });

    it('should display error banner when quota exceeded on mark as paid', async () => {
      localStorage.setItem(
        'vyapar-credit-entries',
        JSON.stringify([mockCreditEntry])
      );

      render(<FollowUpPanel userId={mockUserId} language={mockLanguage} />);

      await waitFor(() => {
        expect(screen.getByText('Test Customer')).toBeInTheDocument();
      });

      // Mock markCreditAsPaid to throw QuotaExceededError
      const quotaError = new Error('QuotaExceededError');
      quotaError.name = 'QuotaExceededError';
      (creditSync.markCreditAsPaid as jest.Mock).mockImplementation(() => {
        throw quotaError;
      });

      // Click mark as paid button
      const paidButton = screen.getByText('Mark as Paid');
      fireEvent.click(paidButton);

      // Should show quota error banner
      await waitFor(() => {
        expect(screen.getByText('Storage full')).toBeInTheDocument();
      });
    });
  });

  describe('Sync Status Indicator Display', () => {
    it('should show synced status when all items synced', () => {
      localStorage.setItem(
        'vyapar-credit-sync-status',
        JSON.stringify({
          lastSyncTime: '2024-01-01T00:00:00Z',
          pendingCount: 0,
          errorCount: 0,
        })
      );

      localStorage.setItem(
        'vyapar-credit-entries',
        JSON.stringify([mockCreditEntry])
      );

      render(<FollowUpPanel userId={mockUserId} language={mockLanguage} />);

      expect(screen.getByText('Synced')).toBeInTheDocument();
    });

    it('should show pending status with count', () => {
      localStorage.setItem(
        'vyapar-credit-sync-status',
        JSON.stringify({
          lastSyncTime: '2024-01-01T00:00:00Z',
          pendingCount: 5,
          errorCount: 0,
        })
      );

      localStorage.setItem(
        'vyapar-credit-entries',
        JSON.stringify([mockCreditEntry])
      );

      render(<FollowUpPanel userId={mockUserId} language={mockLanguage} />);

      expect(screen.getByText('5 pending')).toBeInTheDocument();
    });

    it('should show offline status when offline', () => {
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false,
      });

      localStorage.setItem(
        'vyapar-credit-entries',
        JSON.stringify([mockCreditEntry])
      );

      render(<FollowUpPanel userId={mockUserId} language={mockLanguage} />);

      expect(screen.getByText('Offline')).toBeInTheDocument();
    });
  });
});
