/**
 * Bug Exploration Test for Language Switching Real-Time Fix
 * 
 * Property 1: Fault Condition - Speech Synthesis Uses English Voice for Hindi/Marathi
 * 
 * CRITICAL: This test MUST FAIL on unfixed code - failure confirms the bug exists
 * DO NOT attempt to fix the test or the code when it fails
 * 
 * This test encodes the expected behavior - it will validate the fix when it passes after implementation
 * 
 * GOAL: Surface counterexamples that demonstrate the bug exists
 * 
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import InsightsDisplay from '../InsightsDisplay';
import { BusinessInsights, Language } from '@/lib/types';

// Mock the translation function
jest.mock('@/lib/translations', () => ({
  t: (key: string, language: string) => {
    const translations: Record<string, Record<string, string>> = {
      insights: { en: 'Business Insights', hi: 'व्यापार अंतर्दृष्टि', mr: 'व्यवसाय अंतर्दृष्टी' },
      trueProfitTitle: { en: 'True Profit', hi: 'वास्तविक लाभ', mr: 'खरा नफा' },
      lossMakingProductsTitle: { en: 'Loss-Making Products', hi: 'नुकसान देने वाले उत्पाद', mr: 'तोटा देणारी उत्पादने' },
      blockedCashTitle: { en: 'Blocked Cash in Inventory', hi: 'इन्वेंटरी में फंसा पैसा', mr: 'इन्व्हेंटरीमध्ये अडकलेले पैसे' },
      abnormalExpensesTitle: { en: 'Unusual Expenses', hi: 'असामान्य खर्च', mr: 'असामान्य खर्च' },
      cashflowForecastTitle: { en: '7-Day Cashflow Forecast', hi: '7-दिन का कैशफ्लो पूर्वानुमान', mr: '7-दिवसांचा कॅशफ्लो अंदाज' },
      listen: { en: 'Listen', hi: 'सुनें', mr: 'ऐका' },
      stop: { en: 'Stop', hi: 'रोकें', mr: 'थांबवा' },
    };
    return translations[key]?.[language] || key;
  },
}));

// Mock speech synthesis API
const mockSpeak = jest.fn();
const mockCancel = jest.fn();
const mockGetVoices = jest.fn();

const mockHindiVoice = {
  lang: 'hi-IN',
  name: 'Hindi Voice',
  default: false,
  localService: true,
  voiceURI: 'hindi-voice',
};

const mockMarathiVoice = {
  lang: 'mr-IN',
  name: 'Marathi Voice',
  default: false,
  localService: true,
  voiceURI: 'marathi-voice',
};

const mockEnglishVoice = {
  lang: 'en-US',
  name: 'English Voice',
  default: true,
  localService: true,
  voiceURI: 'english-voice',
};

describe('InsightsDisplay - Bug Exploration: Speech Synthesis Language Voice Selection', () => {
  let mockUtterance: any;

  beforeEach(() => {
    // Reset mocks
    mockSpeak.mockClear();
    mockCancel.mockClear();
    mockGetVoices.mockClear();

    // Mock available voices (Hindi, Marathi, and English)
    mockGetVoices.mockReturnValue([mockHindiVoice, mockMarathiVoice, mockEnglishVoice]);

    // Capture the utterance object when speak is called
    mockUtterance = null;
    mockSpeak.mockImplementation((utterance) => {
      mockUtterance = utterance;
    });

    // Mock window.speechSynthesis
    Object.defineProperty(window, 'speechSynthesis', {
      writable: true,
      value: {
        speak: mockSpeak,
        cancel: mockCancel,
        getVoices: mockGetVoices,
      },
    });

    // Mock SpeechSynthesisUtterance constructor
    global.SpeechSynthesisUtterance = jest.fn().mockImplementation((text) => {
      return {
        text,
        lang: '',
        voice: null,
        onend: null,
        onerror: null,
      };
    }) as any;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const mockInsights: BusinessInsights = {
    trueProfitAnalysis: 'Your shop made ₹5000 profit this month',
    lossMakingProducts: ['Product A', 'Product B'],
    blockedInventoryCash: 'You have ₹10000 blocked in inventory',
    abnormalExpenses: ['Expense 1', 'Expense 2'],
    cashflowForecast: '7-day forecast shows positive trend',
  };

  /**
   * Test Case 1: Hindi Voice Selection
   * 
   * Bug Condition: When language is 'hi' and handleSpeak is called,
   * utterance.voice is NOT set to a voice matching Hindi language
   * 
   * Expected Behavior (after fix): utterance.voice.lang should be 'hi-IN'
   * 
   * EXPECTED OUTCOME ON UNFIXED CODE: Test FAILS
   * - utterance.voice will be undefined or null
   * - This confirms the bug exists
   */
  test('EXPLORATION: Hindi language - utterance.voice should be set to Hindi voice', async () => {
    render(<InsightsDisplay insights={mockInsights} language="hi" />);

    // Find and click the Listen button for the first insight
    const listenButtons = screen.getAllByText(/सुनें|Listen/i);
    expect(listenButtons.length).toBeGreaterThan(0);

    fireEvent.click(listenButtons[0]);

    await waitFor(() => {
      expect(mockSpeak).toHaveBeenCalled();
    });

    // CRITICAL ASSERTION: This will FAIL on unfixed code
    // The bug is that utterance.voice is not set, so it will be null/undefined
    expect(mockUtterance).not.toBeNull();
    expect(mockUtterance.voice).not.toBeNull();
    expect(mockUtterance.voice).not.toBeUndefined();
    
    // Expected behavior: voice should be set to Hindi voice
    expect(mockUtterance.voice.lang).toMatch(/^hi/);
    
    // Document the counterexample if this fails:
    // "utterance.voice is undefined when Hindi is selected"
  });

  /**
   * Test Case 2: Marathi Voice Selection
   * 
   * Bug Condition: When language is 'mr' and handleSpeak is called,
   * utterance.voice is NOT set to a voice matching Marathi language
   * 
   * Expected Behavior (after fix): utterance.voice.lang should be 'mr-IN'
   * 
   * EXPECTED OUTCOME ON UNFIXED CODE: Test FAILS
   */
  test('EXPLORATION: Marathi language - utterance.voice should be set to Marathi voice', async () => {
    render(<InsightsDisplay insights={mockInsights} language="mr" />);

    // Find and click the Listen button
    const listenButtons = screen.getAllByText(/ऐका|Listen/i);
    expect(listenButtons.length).toBeGreaterThan(0);

    fireEvent.click(listenButtons[0]);

    await waitFor(() => {
      expect(mockSpeak).toHaveBeenCalled();
    });

    // CRITICAL ASSERTION: This will FAIL on unfixed code
    expect(mockUtterance).not.toBeNull();
    expect(mockUtterance.voice).not.toBeNull();
    expect(mockUtterance.voice).not.toBeUndefined();
    
    // Expected behavior: voice should be set to Marathi voice
    expect(mockUtterance.voice.lang).toMatch(/^mr/);
    
    // Document the counterexample if this fails:
    // "utterance.voice is undefined when Marathi is selected"
  });

  /**
   * Test Case 3: English Voice Selection
   * 
   * This test verifies that English voice selection should also be explicit
   * 
   * Expected Behavior: utterance.voice should be set to English voice
   */
  test('EXPLORATION: English language - utterance.voice should be set to English voice', async () => {
    render(<InsightsDisplay insights={mockInsights} language="en" />);

    const listenButtons = screen.getAllByText(/Listen/i);
    expect(listenButtons.length).toBeGreaterThan(0);

    fireEvent.click(listenButtons[0]);

    await waitFor(() => {
      expect(mockSpeak).toHaveBeenCalled();
    });

    // This may pass or fail on unfixed code depending on browser defaults
    expect(mockUtterance).not.toBeNull();
    
    // After fix, voice should be explicitly set
    expect(mockUtterance.voice).not.toBeNull();
    expect(mockUtterance.voice).not.toBeUndefined();
    expect(mockUtterance.voice.lang).toMatch(/^en/);
  });

  /**
   * Test Case 4: Verify utterance.lang is set (but not sufficient)
   * 
   * This test confirms that utterance.lang IS being set correctly,
   * but that alone doesn't cause the correct voice to be used
   */
  test('EXPLORATION: utterance.lang is set but voice is not selected', async () => {
    render(<InsightsDisplay insights={mockInsights} language="hi" />);

    const listenButtons = screen.getAllByText(/सुनें/i);
    fireEvent.click(listenButtons[0]);

    await waitFor(() => {
      expect(mockSpeak).toHaveBeenCalled();
    });

    // Verify that lang property IS set (this should pass even on unfixed code)
    expect(mockUtterance.lang).toBe('hi-IN');
    
    // But voice is NOT set (this is the bug)
    // On unfixed code, this will be null/undefined
    expect(mockUtterance.voice).not.toBeNull();
    expect(mockUtterance.voice).not.toBeUndefined();
  });
});
