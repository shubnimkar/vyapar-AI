/**
 * Bug Condition Exploration Test - Indices Error Fix
 * 
 * **Validates: Requirements 2.2, 2.3, 2.4**
 * 
 * **Property 1: Fault Condition** - Translation Keys Displayed Literally
 * 
 * This test MUST FAIL on unfixed code - failure confirms the bug exists.
 * DO NOT attempt to fix the test or the code when it fails.
 * 
 * This test encodes the expected behavior - it will validate the fix when it passes after implementation.
 * 
 * GOAL: Surface counterexamples that demonstrate the bug exists
 * 
 * Scoped PBT Approach: For deterministic bugs, scope the property to the concrete failing case(s) to ensure reproducibility
 * 
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import IndicesDashboard from '../IndicesDashboard';
import type { UserProfile } from '@/lib/types';

// Mock translations
jest.mock('@/lib/translations', () => ({
  t: (key: string, language: string) => {
    const translations: Record<string, Record<string, string>> = {
      'indices.checking': {
        en: 'Checking...',
        hi: 'जाँच रहा है...',
        mr: 'तपासत आहे...'
      },
      'indices.insufficientData': {
        en: 'Need at least 7 days of data to calculate indices',
        hi: 'सूचकांक की गणना के लिए कम से कम 7 दिनों के डेटा की आवश्यकता है',
        mr: 'निर्देशांक मोजण्यासाठी किमान 7 दिवसांचा डेटा आवश्यक आहे'
      },
      'indices.addMoreData': {
        en: 'Add more daily entries to see your financial health metrics',
        hi: 'अपने वित्तीय स्वास्थ्य मेट्रिक्स देखने के लिए अधिक दैनिक प्रविष्टियाँ जोड़ें',
        mr: 'तुमचे आर्थिक आरोग्य मेट्रिक्स पाहण्यासाठी अधिक दैनिक नोंदी जोडा'
      },
      'indices.error': {
        en: 'Error calculating indices',
        hi: 'सूचकांक की गणना में त्रुटि',
        mr: 'निर्देशांक मोजण्यात त्रुटी'
      },
      'receipt.tryAgain': {
        en: 'Try Again',
        hi: 'पुनः प्रयास करें',
        mr: 'पुन्हा प्रयत्न करा'
      },
      'indices.syncStatus.online': {
        en: 'Online',
        hi: 'ऑनलाइन',
        mr: 'ऑनलाइन'
      },
      'indices.syncStatus.offline': {
        en: 'Offline',
        hi: 'ऑफ़लाइन',
        mr: 'ऑफलाइन'
      },
      'indices.syncStatus.syncing': {
        en: 'Syncing...',
        hi: 'सिंक हो रहा है...',
        mr: 'सिंक होत आहे...'
      }
    };
    return translations[key]?.[language] || translations[key]?.['en'] || key;
  }
}));

// Mock child components
jest.mock('../StressIndexDisplay', () => {
  return function MockStressIndexDisplay() {
    return <div data-testid="stress-index-display">Stress Index Display</div>;
  };
});

jest.mock('../AffordabilityPlanner', () => {
  return function MockAffordabilityPlanner() {
    return <div data-testid="affordability-planner">Affordability Planner</div>;
  };
});

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('IndicesDashboard - Bug Condition Exploration', () => {
  const mockUserProfile: UserProfile = {
    id: 'test-user',
    phoneNumber: '+1234567890',
    shopName: 'Test Shop',
    userName: 'testuser',
    language: 'en',
    businessType: 'kirana',
    createdAt: '2024-01-01T00:00:00Z',
    lastActiveAt: '2024-01-01T00:00:00Z',
    isActive: true,
    subscriptionTier: 'free',
    preferences: {
      dataRetentionDays: 365,
      autoArchive: false,
      notificationsEnabled: true,
      currency: 'INR',
    },
    business_type: 'kirana',
    city_tier: 'tier2',
    explanation_mode: 'simple',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockClear();
  });

  /**
   * Test Case 1: Insufficient Data Error - Translation Key Displayed Literally
   * 
   * Bug Condition: When API returns INVALID_INPUT with errors.insufficientData message,
   * the component displays the literal translation key instead of the translated message.
   * 
   * Expected Behavior (after fix): Component should display the translated message
   * "Need at least 7 days of data to calculate indices" (from indices.insufficientData)
   * or "Insufficient data to calculate indices..." (from errors.insufficientData)
   */
  test('FAULT CONDITION: displays literal translation key for insufficient data error', async () => {
    // Mock /api/indices/latest to return 404 (no indices yet)
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      json: async () => ({
        success: false,
        code: 'NOT_FOUND',
        message: 'No indices found',
      }),
    });

    // Mock /api/indices/calculate to return INVALID_INPUT with errors.insufficientData
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({
        success: false,
        code: 'INVALID_INPUT',
        message: 'errors.insufficientData', // Translation key, not translated
      }),
    });

    render(
      <IndicesDashboard
        userId="test-user"
        userProfile={mockUserProfile}
        language="en"
      />
    );

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText(/Checking/i)).not.toBeInTheDocument();
    });

    // EXPECTED BEHAVIOR (after fix): Should display translated message
    // "Need at least 7 days of data to calculate indices"
    const expectedTranslatedMessage = 'Need at least 7 days of data to calculate indices';
    
    // BUG CONDITION: Component displays literal translation key or generic error
    // This assertion will FAIL on unfixed code, confirming the bug exists
    const translatedMessageElement = screen.queryByText(expectedTranslatedMessage);
    
    // The bug manifests as either:
    // 1. Displaying "errors.insufficientData" literally
    // 2. Displaying "indices.error" literally
    // 3. Not displaying the proper translated message
    
    expect(translatedMessageElement).toBeInTheDocument();
    
    // Additional check: Ensure no literal translation keys are displayed
    expect(screen.queryByText('errors.insufficientData')).not.toBeInTheDocument();
    expect(screen.queryByText('indices.error')).not.toBeInTheDocument();
  });

  /**
   * Test Case 2: Generic Error - Translation Key Not Resolved
   * 
   * Bug Condition: When API returns a server error, the component displays
   * "indices.error" literally instead of translating it to "Error calculating indices"
   */
  test('FAULT CONDITION: displays literal "indices.error" for server errors', async () => {
    // Mock /api/indices/latest to return 500 server error
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({
        success: false,
        code: 'SERVER_ERROR',
        message: 'indices.error', // Translation key
      }),
    });

    render(
      <IndicesDashboard
        userId="test-user"
        userProfile={mockUserProfile}
        language="en"
      />
    );

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText(/Checking/i)).not.toBeInTheDocument();
    });

    // EXPECTED BEHAVIOR (after fix): Should display translated message
    const expectedTranslatedMessage = 'Error calculating indices';
    
    // BUG CONDITION: Component displays literal "indices.error"
    // This assertion will FAIL on unfixed code
    expect(screen.getByText(expectedTranslatedMessage)).toBeInTheDocument();
    
    // Ensure literal translation key is not displayed
    expect(screen.queryByText('indices.error')).not.toBeInTheDocument();
  });

  /**
   * Test Case 3: Error Message String Matching Failure
   * 
   * Bug Condition: Component checks error.includes('Insufficient') to detect
   * insufficient data errors, but this only works if the error is already translated.
   * When the error is a translation key like "errors.insufficientData", the check fails.
   */
  test('FAULT CONDITION: insufficient data UI not shown when error is translation key', async () => {
    // Mock /api/indices/latest to return 404
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      json: async () => ({
        success: false,
        code: 'NOT_FOUND',
        message: 'No indices found',
      }),
    });

    // Mock /api/indices/calculate to return error with translation key
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({
        success: false,
        code: 'INVALID_INPUT',
        message: 'errors.insufficientData', // Translation key - doesn't include 'Insufficient'
      }),
    });

    render(
      <IndicesDashboard
        userId="test-user"
        userProfile={mockUserProfile}
        language="en"
      />
    );

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText(/Checking/i)).not.toBeInTheDocument();
    });

    // EXPECTED BEHAVIOR (after fix): Should show the insufficient data UI with:
    // - 📊 icon
    // - "Need at least 7 days of data to calculate indices" message
    // - "Add more daily entries to see your financial health metrics" guidance
    
    const expectedMessage = 'Need at least 7 days of data to calculate indices';
    const expectedGuidance = 'Add more daily entries to see your financial health metrics';
    
    // BUG CONDITION: Component doesn't recognize this as insufficient data error
    // because error.includes('Insufficient') fails on "errors.insufficientData"
    // This assertion will FAIL on unfixed code
    expect(screen.getByText(expectedMessage)).toBeInTheDocument();
    expect(screen.getByText(expectedGuidance)).toBeInTheDocument();
    expect(screen.getByText('📊')).toBeInTheDocument();
  });

  /**
   * Test Case 4: Error Code Not Checked
   * 
   * Bug Condition: Component doesn't check the error 'code' field to determine
   * error type, relying only on string matching in the error message.
   * This means it can't distinguish between different error types.
   */
  test('FAULT CONDITION: component does not use error code to determine error type', async () => {
    // Mock /api/indices/latest to return 404
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      json: async () => ({
        success: false,
        code: 'NOT_FOUND',
        message: 'No indices found',
      }),
    });

    // Mock /api/indices/calculate to return INVALID_INPUT
    // In the fixed version, this should be INSUFFICIENT_DATA
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({
        success: false,
        code: 'INVALID_INPUT', // Generic code - should be INSUFFICIENT_DATA
        message: 'errors.insufficientData',
      }),
    });

    render(
      <IndicesDashboard
        userId="test-user"
        userProfile={mockUserProfile}
        language="en"
      />
    );

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText(/Checking/i)).not.toBeInTheDocument();
    });

    // EXPECTED BEHAVIOR (after fix): Component should check error code
    // and display appropriate UI for INSUFFICIENT_DATA error type
    
    // The component should display the insufficient data UI
    const expectedMessage = 'Need at least 7 days of data to calculate indices';
    
    // BUG CONDITION: Component doesn't check error code, so it can't
    // properly handle different error types
    // This assertion will FAIL on unfixed code
    expect(screen.getByText(expectedMessage)).toBeInTheDocument();
    
    // Should not display generic error UI
    expect(screen.queryByText(/try again/i)).not.toBeInTheDocument();
  });

  /**
   * Test Case 5: Translation Keys Starting with "errors." or "indices." Not Translated
   * 
   * Bug Condition: When error messages are translation keys (starting with "errors." or "indices."),
   * the component displays them literally instead of resolving them with t() function.
   */
  test('FAULT CONDITION: translation keys not resolved when displaying errors', async () => {
    // Mock /api/indices/latest to return error with translation key
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({
        success: false,
        code: 'SERVER_ERROR',
        error: 'indices.error', // Translation key in 'error' field
      }),
    });

    render(
      <IndicesDashboard
        userId="test-user"
        userProfile={mockUserProfile}
        language="en"
      />
    );

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText(/Checking/i)).not.toBeInTheDocument();
    });

    // EXPECTED BEHAVIOR (after fix): Should translate "indices.error" to
    // "Error calculating indices"
    const expectedTranslatedMessage = 'Error calculating indices';
    
    // BUG CONDITION: Component displays literal "indices.error"
    // This assertion will FAIL on unfixed code
    expect(screen.getByText(expectedTranslatedMessage)).toBeInTheDocument();
    
    // Ensure literal translation key is not displayed
    expect(screen.queryByText(/^indices\.error$/)).not.toBeInTheDocument();
    expect(screen.queryByText(/^errors\./)).not.toBeInTheDocument();
  });
});
