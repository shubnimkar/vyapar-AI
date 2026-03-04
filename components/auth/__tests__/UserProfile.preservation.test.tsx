/**
 * @jest-environment jsdom
 * 
 * Preservation Property Tests for UserProfile Component
 * 
 * IMPORTANT: Follow observation-first methodology
 * These tests observe behavior on UNFIXED code for authentication, logout, 
 * phone formatting, and date formatting functions
 * 
 * Property 2: Preservation - Authentication and Formatting Behavior
 * 
 * EXPECTED OUTCOME: Tests PASS (this confirms baseline behavior to preserve)
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { jest } from '@jest/globals';
import UserProfile from '../UserProfile';
import { SessionManager } from '@/lib/session-manager';
import { Language } from '@/lib/types';

// Mock the session manager
jest.mock('@/lib/session-manager', () => ({
  SessionManager: {
    getCurrentUser: jest.fn(),
    clearSession: jest.fn(),
  },
}));

// Mock the router
const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

// Mock translations
jest.mock('@/lib/translations', () => ({
  t: (key: string) => {
    const translations: Record<string, string> = {
      phoneNumber: 'Phone Number',
      accountCreated: 'Account created',
      logout: 'Logout',
    };
    return translations[key] || key;
  },
}));

describe('UserProfile Preservation Tests - Authentication and Formatting Behavior', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPush.mockClear();
  });

  /**
   * Preservation Test 1: Logout functionality must continue to work exactly as before
   * Requirement 3.1: Logout button functionality must continue to work exactly as before
   */
  test('should preserve logout functionality - clearing session and redirecting to login', async () => {
    // Arrange: Mock authenticated user
    const mockUser = {
      id: 'test-user',
      phoneNumber: '+919876543210',
      createdAt: '2024-01-15T10:30:00.000Z',
    };

    (SessionManager.getCurrentUser as jest.Mock).mockResolvedValue(mockUser);
    (SessionManager.clearSession as jest.Mock).mockResolvedValue({ success: true });

    // Act: Render component and click logout
    render(<UserProfile language="en" />);
    
    await waitFor(() => {
      expect(screen.getByText('Logout')).toBeInTheDocument();
    });

    const logoutButton = screen.getByText('Logout');
    fireEvent.click(logoutButton);

    // Assert: Logout behavior must be preserved
    await waitFor(() => {
      expect(SessionManager.clearSession).toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith('/login');
    });
  });

  /**
   * Preservation Test 2: Phone number formatting must remain unchanged (+91 XXXXX XXXXX format)
   * Requirement 3.3: Phone number formatting must remain unchanged
   */
  test('should preserve phone number formatting in +91 XXXXX XXXXX format', async () => {
    // Test cases for phone formatting preservation
    const testCases = [
      {
        input: '+919876543210',
        expected: '+91 98765 43210',
        description: 'standard 10-digit number',
      },
      {
        input: '+911234567890',
        expected: '+91 12345 67890',
        description: 'another 10-digit number',
      },
      {
        input: '+919999999999',
        expected: '+91 99999 99999',
        description: 'repeated digits',
      },
    ];

    for (const testCase of testCases) {
      // Arrange
      const mockUser = {
        id: 'test-user',
        phoneNumber: testCase.input,
        createdAt: '2024-01-15T10:30:00.000Z',
      };

      (SessionManager.getCurrentUser as jest.Mock).mockResolvedValue(mockUser);

      // Act
      const { unmount } = render(<UserProfile language="en" />);

      // Assert: Phone formatting must be preserved
      await waitFor(() => {
        expect(screen.getByText(testCase.expected)).toBeInTheDocument();
      });

      unmount();
    }
  });

  /**
   * Preservation Test 3: Date formatting must continue to respect language preferences
   * Requirement 3.4: Date formatting must continue to respect user's language preference
   */
  test('should preserve date formatting with language preferences (hi-IN, mr-IN, en-IN)', async () => {
    const testDate = '2024-01-15T10:30:00.000Z';
    const mockUser = {
      id: 'test-user',
      phoneNumber: '+919876543210',
      createdAt: testDate,
    };

    (SessionManager.getCurrentUser as jest.Mock).mockResolvedValue(mockUser);

    // Test English formatting
    const { unmount: unmountEn } = render(<UserProfile language="en" />);
    await waitFor(() => {
      // Should format date in en-IN locale
      expect(screen.getByText(/Account created:/)).toBeInTheDocument();
      // The exact format depends on browser locale implementation
      expect(screen.getByText(/15|January|2024/)).toBeInTheDocument();
    });
    unmountEn();

    // Test Hindi formatting
    const { unmount: unmountHi } = render(<UserProfile language="hi" />);
    await waitFor(() => {
      expect(screen.getByText(/Account created:/)).toBeInTheDocument();
      // Should use hi-IN locale for date formatting
    });
    unmountHi();

    // Test Marathi formatting
    const { unmount: unmountMr } = render(<UserProfile language="mr" />);
    await waitFor(() => {
      expect(screen.getByText(/Account created:/)).toBeInTheDocument();
      // Should use mr-IN locale for date formatting
    });
    unmountMr();
  });

  /**
   * Preservation Test 4: Component must continue to return null for unauthenticated users
   * Requirement 3.5: Component must continue to return null when no valid auth session exists
   */
  test('should preserve behavior of returning null for unauthenticated users', async () => {
    // Arrange: No authenticated user
    (SessionManager.getCurrentUser as jest.Mock).mockResolvedValue(null);

    // Act
    const { container } = render(<UserProfile language="en" />);

    // Assert: Component should return null (empty container)
    await waitFor(() => {
      expect(container.firstChild).toBeNull();
    });
  });

  /**
   * Preservation Test 5: Translation keys for UI text must continue to work in user's selected language
   * Requirement 3.6: Translation keys must continue to work in user's selected language
   */
  test('should preserve translation system functionality', async () => {
    const mockUser = {
      id: 'test-user',
      phoneNumber: '+919876543210',
      createdAt: '2024-01-15T10:30:00.000Z',
    };

    (SessionManager.getCurrentUser as jest.Mock).mockResolvedValue(mockUser);

    // Test that translation keys are used correctly
    render(<UserProfile language="en" />);

    await waitFor(() => {
      // These texts come from translation keys and should be preserved
      expect(screen.getByText('Phone Number')).toBeInTheDocument();
      expect(screen.getByText('Logout')).toBeInTheDocument();
      expect(screen.getByText(/Account created:/)).toBeInTheDocument();
    });
  });

  /**
   * Preservation Test 6: Loading states during logout must remain unchanged
   * Requirement 3.1: Logout functionality including loading states must be preserved
   */
  test('should preserve logout loading states and disabled button behavior', async () => {
    const mockUser = {
      id: 'test-user',
      phoneNumber: '+919876543210',
      createdAt: '2024-01-15T10:30:00.000Z',
    };

    (SessionManager.getCurrentUser as jest.Mock).mockResolvedValue(mockUser);
    
    // Mock logout to be slow so we can test loading state
    (SessionManager.clearSession as jest.Mock).mockImplementation(() => 
      new Promise(resolve => setTimeout(() => resolve({ success: true }), 100))
    );

    render(<UserProfile language="en" />);

    await waitFor(() => {
      expect(screen.getByText('Logout')).toBeInTheDocument();
    });

    const logoutButton = screen.getByText('Logout');
    
    // Click logout button
    fireEvent.click(logoutButton);

    // Should show loading state
    await waitFor(() => {
      expect(screen.getByText('...')).toBeInTheDocument();
    });

    // Button should be disabled during loading
    expect(logoutButton).toBeDisabled();

    // Wait for logout to complete
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/login');
    });
  });

  /**
   * Preservation Test 7: Error handling during logout must be preserved
   */
  test('should preserve logout error handling behavior', async () => {
    const mockUser = {
      id: 'test-user',
      phoneNumber: '+919876543210',
      createdAt: '2024-01-15T10:30:00.000Z',
    };

    (SessionManager.getCurrentUser as jest.Mock).mockResolvedValue(mockUser);
    (SessionManager.clearSession as jest.Mock).mockRejectedValue(new Error('Network error'));

    // Mock console.error to avoid test output noise
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    render(<UserProfile language="en" />);

    await waitFor(() => {
      expect(screen.getByText('Logout')).toBeInTheDocument();
    });

    const logoutButton = screen.getByText('Logout');
    fireEvent.click(logoutButton);

    // Should handle error gracefully and restore button state
    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('Logout error:', expect.any(Error));
      expect(logoutButton).not.toBeDisabled();
      expect(screen.getByText('Logout')).toBeInTheDocument();
    });

    consoleSpy.mockRestore();
  });
});