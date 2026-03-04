/**
 * @jest-environment jsdom
 * 
 * Bug Condition Exploration Test for UserProfile Component
 * 
 * CRITICAL: This test MUST FAIL on unfixed code - failure confirms the bug exists
 * DO NOT attempt to fix the test or the code when it fails
 * 
 * Property 1: Fault Condition - Business Profile Display Missing
 * 
 * This test encodes the expected behavior and will validate the fix when it passes after implementation.
 * The goal is to surface counterexamples that demonstrate the bug exists.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { jest } from '@jest/globals';
import UserProfile from '../UserProfile';
import { SessionManager } from '@/lib/session-manager';
import { Language } from '@/lib/types';

// Mock the session manager
jest.mock('@/lib/session-manager', () => ({
  SessionManager: {
    getCurrentUser: jest.fn(),
  },
}));

// Mock the router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
}));

// Mock translations
jest.mock('@/lib/translations', () => ({
  t: (key: string) => {
    const translations: Record<string, string> = {
      phoneNumber: 'Phone Number',
      accountCreated: 'Account created',
      logout: 'Logout',
      shopName: 'Shop Name',
      userName: 'User Name',
    };
    return translations[key] || key;
  },
}));

// Mock fetch for profile API calls
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('UserProfile Bug Exploration - Business Profile Display Missing', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockClear();
  });

  /**
   * Bug Condition Test: User with completed profile setup should see business information prominently
   * 
   * Test Case: User "Rajesh Kumar" with shop "Kumar Electronics" should see business info prominently
   * instead of just phone number and creation date
   * 
   * EXPECTED OUTCOME ON UNFIXED CODE: Test FAILS (this is correct - it proves the bug exists)
   * 
   * The test assertions match the Expected Behavior Properties from design:
   * - Shop name should be displayed prominently
   * - User name should be displayed prominently  
   * - Business profile data should be fetched from API
   */
  test('should display complete business profile information for user with completed profile setup', async () => {
    // Arrange: Mock authenticated user with basic auth session data
    const mockUser = {
      id: 'demo-user-9876543210',
      phoneNumber: '+919876543210',
      createdAt: '2024-01-15T10:30:00.000Z',
    };

    // Mock the getCurrentUser to return basic auth session data (current behavior)
    (SessionManager.getCurrentUser as jest.Mock).mockResolvedValue(mockUser);

    // Mock the profile API response with complete business profile data
    const mockProfileData = {
      success: true,
      data: {
        id: 'demo-user-9876543210',
        phoneNumber: '+919876543210',
        shopName: 'Kumar Electronics',
        userName: 'Rajesh Kumar',
        language: 'en' as Language,
        businessType: 'retail',
        city: 'Mumbai',
        createdAt: '2024-01-15T10:30:00.000Z',
        lastActiveAt: '2024-02-27T10:30:00.000Z',
        isActive: true,
        subscriptionTier: 'free' as const,
        preferences: {
          dataRetentionDays: 90,
          autoArchive: true,
          notificationsEnabled: true,
          currency: 'INR',
        },
      },
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => mockProfileData,
    });

    // Act: Render the UserProfile component
    render(<UserProfile language="en" />);

    // Wait for component to load user data
    await waitFor(() => {
      expect(SessionManager.getCurrentUser).toHaveBeenCalled();
    });

    // Assert: Expected behavior - Business profile information should be displayed prominently
    
    // 1. Shop name should be displayed as primary identifier (most prominent)
    await waitFor(() => {
      expect(screen.getByText('Kumar Electronics')).toBeInTheDocument();
    });

    // 2. User name should be displayed as secondary identifier
    await waitFor(() => {
      expect(screen.getByText('Rajesh Kumar')).toBeInTheDocument();
    });

    // 3. Component should make API call to fetch complete profile data
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/profile?userId=demo-user-9876543210');
    });

    // 4. Business information should be more prominent than phone number
    const shopNameElement = screen.getByText('Kumar Electronics');
    const phoneElement = screen.getByText('+91 98765 43210');
    
    // Shop name should have larger font size or more prominent styling than phone
    const shopNameStyles = window.getComputedStyle(shopNameElement);
    const phoneStyles = window.getComputedStyle(phoneElement);
    
    // Shop name should be more prominent (larger font, bolder, etc.)
    expect(parseInt(shopNameStyles.fontSize)).toBeGreaterThanOrEqual(parseInt(phoneStyles.fontSize));

    // 5. Business type and city should be displayed if available
    if (mockProfileData.data.businessType) {
      await waitFor(() => {
        expect(screen.getByText(/retail/i)).toBeInTheDocument();
      });
    }

    if (mockProfileData.data.city) {
      await waitFor(() => {
        expect(screen.getByText(/Mumbai/i)).toBeInTheDocument();
      });
    }

    // 6. Phone number should still be present but as tertiary information
    expect(screen.getByText('+91 98765 43210')).toBeInTheDocument();
    expect(screen.getByText('Phone Number')).toBeInTheDocument();
  });

  /**
   * Additional test case: Component should handle profile API integration
   */
  test('should integrate with profile API to fetch complete business data', async () => {
    // Arrange
    const mockUser = {
      id: 'demo-user-1234567890',
      phoneNumber: '+911234567890',
      createdAt: '2024-02-01T09:00:00.000Z',
    };

    (SessionManager.getCurrentUser as jest.Mock).mockResolvedValue(mockUser);

    const mockProfileResponse = {
      success: true,
      data: {
        id: 'demo-user-1234567890',
        phoneNumber: '+911234567890',
        shopName: 'Sharma Traders',
        userName: 'Amit Sharma',
        language: 'hi' as Language,
        businessType: 'wholesale',
        city: 'Delhi',
        createdAt: '2024-02-01T09:00:00.000Z',
        lastActiveAt: '2024-02-27T09:00:00.000Z',
        isActive: true,
        subscriptionTier: 'free' as const,
        preferences: {
          dataRetentionDays: 90,
          autoArchive: true,
          notificationsEnabled: true,
          currency: 'INR',
        },
      },
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => mockProfileResponse,
    });

    // Act
    render(<UserProfile language="hi" />);

    // Assert: API integration should work
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/profile?userId=demo-user-1234567890');
    });

    // Business profile data should be displayed
    await waitFor(() => {
      expect(screen.getByText('Sharma Traders')).toBeInTheDocument();
      expect(screen.getByText('Amit Sharma')).toBeInTheDocument();
    });
  });

  /**
   * Test case: Component should manage profile data state
   */
  test('should manage profile data state separately from auth session', async () => {
    // Arrange
    const mockUser = {
      id: 'demo-user-5555555555',
      phoneNumber: '+915555555555',
      createdAt: '2024-01-20T14:00:00.000Z',
    };

    (SessionManager.getCurrentUser as jest.Mock).mockResolvedValue(mockUser);

    // Mock profile API response
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        data: {
          id: 'demo-user-5555555555',
          phoneNumber: '+915555555555',
          shopName: 'Tech Solutions',
          userName: 'Priya Patel',
          language: 'en' as Language,
          createdAt: '2024-01-20T14:00:00.000Z',
          lastActiveAt: '2024-02-27T14:00:00.000Z',
          isActive: true,
          subscriptionTier: 'free' as const,
          preferences: {
            dataRetentionDays: 90,
            autoArchive: true,
            notificationsEnabled: true,
            currency: 'INR',
          },
        },
      }),
    });

    // Act
    render(<UserProfile language="en" />);

    // Assert: Component should manage separate state for profile data
    await waitFor(() => {
      // Should fetch profile data beyond basic auth session
      expect(mockFetch).toHaveBeenCalled();
      
      // Should display business profile information
      expect(screen.getByText('Tech Solutions')).toBeInTheDocument();
      expect(screen.getByText('Priya Patel')).toBeInTheDocument();
    });
  });
});