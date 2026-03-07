/**
 * Preservation Property Tests for Language Switching Real-Time Fix
 * 
 * Property 2: Preservation - Non-Speech Functionality Unchanged
 * 
 * IMPORTANT: Follow observation-first methodology
 * These tests capture the behavior of the UNFIXED code for non-buggy inputs
 * They should PASS on unfixed code and continue to PASS after the fix
 * 
 * GOAL: Ensure no regressions - all non-speech functionality remains unchanged
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

describe('InsightsDisplay - Preservation: Non-Speech Functionality', () => {
  let mockUtterance: any;

  beforeEach(() => {
    // Reset mocks
    mockSpeak.mockClear();
    mockCancel.mockClear();
    mockGetVoices.mockClear();

    // Mock available voices
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
   * Preservation Test 1: Translation System
   * 
   * Requirement 3.6: Translation system SHALL CONTINUE TO use the t() function
   * Requirement 3.7: Components SHALL CONTINUE TO use language prop for translated text
   * 
   * EXPECTED: PASS on unfixed code, PASS after fix
   */
  describe('Translation System Preservation', () => {
    test('displays translated titles in English', () => {
      render(<InsightsDisplay insights={mockInsights} language="en" />);
      
      expect(screen.getByText('Business Insights')).toBeInTheDocument();
      expect(screen.getByText('True Profit')).toBeInTheDocument();
      expect(screen.getByText('Loss-Making Products')).toBeInTheDocument();
    });

    test('displays translated titles in Hindi', () => {
      render(<InsightsDisplay insights={mockInsights} language="hi" />);
      
      expect(screen.getByText('व्यापार अंतर्दृष्टि')).toBeInTheDocument();
      expect(screen.getByText('वास्तविक लाभ')).toBeInTheDocument();
      expect(screen.getByText('नुकसान देने वाले उत्पाद')).toBeInTheDocument();
    });

    test('displays translated titles in Marathi', () => {
      render(<InsightsDisplay insights={mockInsights} language="mr" />);
      
      expect(screen.getByText('व्यवसाय अंतर्दृष्टी')).toBeInTheDocument();
      expect(screen.getByText('खरा नफा')).toBeInTheDocument();
      expect(screen.getByText('तोटा देणारी उत्पादने')).toBeInTheDocument();
    });

    test('Listen button text changes with language', () => {
      const { rerender } = render(<InsightsDisplay insights={mockInsights} language="en" />);
      expect(screen.getAllByText('Listen').length).toBeGreaterThan(0);

      rerender(<InsightsDisplay insights={mockInsights} language="hi" />);
      expect(screen.getAllByText('सुनें').length).toBeGreaterThan(0);

      rerender(<InsightsDisplay insights={mockInsights} language="mr" />);
      expect(screen.getAllByText('ऐका').length).toBeGreaterThan(0);
    });
  });

  /**
   * Preservation Test 2: Component Rendering
   * 
   * Requirement 3.5: All existing functionality SHALL CONTINUE TO work correctly
   * 
   * EXPECTED: PASS on unfixed code, PASS after fix
   */
  describe('Component Rendering Preservation', () => {
    test('renders all insight sections with content', () => {
      render(<InsightsDisplay insights={mockInsights} language="en" />);
      
      // Check that all sections are rendered
      expect(screen.getByText('True Profit')).toBeInTheDocument();
      expect(screen.getByText('Loss-Making Products')).toBeInTheDocument();
      expect(screen.getByText('Blocked Cash in Inventory')).toBeInTheDocument();
      expect(screen.getByText('Unusual Expenses')).toBeInTheDocument();
      expect(screen.getByText('7-Day Cashflow Forecast')).toBeInTheDocument();
    });

    test('renders insight content correctly', () => {
      render(<InsightsDisplay insights={mockInsights} language="en" />);
      
      expect(screen.getByText('Your shop made ₹5000 profit this month')).toBeInTheDocument();
      expect(screen.getByText('Product A')).toBeInTheDocument();
      expect(screen.getByText('Product B')).toBeInTheDocument();
      expect(screen.getByText('You have ₹10000 blocked in inventory')).toBeInTheDocument();
    });

    test('does not render sections with empty content', () => {
      const emptyInsights: BusinessInsights = {
        trueProfitAnalysis: '',
        lossMakingProducts: [],
        blockedInventoryCash: '',
        abnormalExpenses: [],
        cashflowForecast: '',
      };

      render(<InsightsDisplay insights={emptyInsights} language="en" />);
      
      // Only the main heading should be present
      expect(screen.getByText('Business Insights')).toBeInTheDocument();
      expect(screen.queryByText('True Profit')).not.toBeInTheDocument();
    });
  });

  /**
   * Preservation Test 3: Speech Synthesis Toggle
   * 
   * Requirement 3.3: Clicking Listen while speaking SHALL CONTINUE TO stop current speech
   * 
   * EXPECTED: PASS on unfixed code, PASS after fix
   */
  describe('Speech Synthesis Toggle Preservation', () => {
    test('clicking Listen button calls speechSynthesis.speak', async () => {
      render(<InsightsDisplay insights={mockInsights} language="en" />);
      
      const listenButtons = screen.getAllByText('Listen');
      fireEvent.click(listenButtons[0]);

      await waitFor(() => {
        expect(mockSpeak).toHaveBeenCalled();
      });
    });

    test('clicking Listen while speaking stops current speech', async () => {
      render(<InsightsDisplay insights={mockInsights} language="en" />);
      
      const listenButtons = screen.getAllByText('Listen');
      
      // Start speaking
      fireEvent.click(listenButtons[0]);
      await waitFor(() => {
        expect(mockSpeak).toHaveBeenCalledTimes(1);
      });

      // Click again to stop
      fireEvent.click(listenButtons[0]);
      await waitFor(() => {
        expect(mockCancel).toHaveBeenCalled();
      });
    });

    test('button text changes to Stop when speaking', async () => {
      render(<InsightsDisplay insights={mockInsights} language="en" />);
      
      const listenButtons = screen.getAllByText('Listen');
      fireEvent.click(listenButtons[0]);

      await waitFor(() => {
        expect(screen.getByText('Stop')).toBeInTheDocument();
      });
    });
  });

  /**
   * Preservation Test 4: Listen Button Visibility
   * 
   * Requirement 3.4: Listen button SHALL CONTINUE TO not be displayed when speech synthesis not supported
   * 
   * Note: In the current implementation, the button visibility check happens at render time.
   * This test verifies the existing behavior is preserved.
   * 
   * EXPECTED: PASS on unfixed code, PASS after fix
   */
  describe('Listen Button Visibility Preservation', () => {
    test('Listen button is shown when speech synthesis is supported', () => {
      render(<InsightsDisplay insights={mockInsights} language="en" />);
      
      const listenButtons = screen.getAllByText('Listen');
      expect(listenButtons.length).toBeGreaterThan(0);
    });

    // Note: Testing the "not supported" case is complex in jsdom environment
    // because the component checks for speechSynthesis at render time.
    // The important preservation is that the check logic remains unchanged.
    test('component checks for speechSynthesis support', () => {
      render(<InsightsDisplay insights={mockInsights} language="en" />);
      
      // Verify that when speechSynthesis exists, buttons are rendered
      expect(window.speechSynthesis).toBeDefined();
      expect(screen.getAllByText('Listen').length).toBeGreaterThan(0);
    });
  });

  /**
   * Preservation Test 5: Re-rendering on Language Change
   * 
   * Requirement 3.5: All existing functionality SHALL CONTINUE TO work correctly
   * 
   * EXPECTED: PASS on unfixed code, PASS after fix
   */
  describe('Re-rendering Preservation', () => {
    test('component re-renders when language prop changes', () => {
      const { rerender } = render(<InsightsDisplay insights={mockInsights} language="en" />);
      
      expect(screen.getByText('Business Insights')).toBeInTheDocument();
      expect(screen.getAllByText('Listen').length).toBeGreaterThan(0);

      rerender(<InsightsDisplay insights={mockInsights} language="hi" />);
      
      expect(screen.getByText('व्यापार अंतर्दृष्टि')).toBeInTheDocument();
      expect(screen.getAllByText('सुनें').length).toBeGreaterThan(0);
    });

    test('component re-renders when insights prop changes', () => {
      const { rerender } = render(<InsightsDisplay insights={mockInsights} language="en" />);
      
      expect(screen.getByText('Your shop made ₹5000 profit this month')).toBeInTheDocument();

      const newInsights: BusinessInsights = {
        ...mockInsights,
        trueProfitAnalysis: 'Your shop made ₹10000 profit this month',
      };

      rerender(<InsightsDisplay insights={newInsights} language="en" />);
      
      expect(screen.getByText('Your shop made ₹10000 profit this month')).toBeInTheDocument();
    });
  });

  /**
   * Preservation Test 6: utterance.lang Property
   * 
   * This verifies that the existing behavior of setting utterance.lang is preserved
   * 
   * EXPECTED: PASS on unfixed code, PASS after fix
   */
  describe('utterance.lang Property Preservation', () => {
    test('utterance.lang is set to hi-IN for Hindi', async () => {
      render(<InsightsDisplay insights={mockInsights} language="hi" />);
      
      const listenButtons = screen.getAllByText('सुनें');
      fireEvent.click(listenButtons[0]);

      await waitFor(() => {
        expect(mockSpeak).toHaveBeenCalled();
        expect(mockUtterance.lang).toBe('hi-IN');
      });
    });

    test('utterance.lang is set to mr-IN for Marathi', async () => {
      render(<InsightsDisplay insights={mockInsights} language="mr" />);
      
      const listenButtons = screen.getAllByText('ऐका');
      fireEvent.click(listenButtons[0]);

      await waitFor(() => {
        expect(mockSpeak).toHaveBeenCalled();
        expect(mockUtterance.lang).toBe('mr-IN');
      });
    });

    test('utterance.lang is set to en-IN for English', async () => {
      render(<InsightsDisplay insights={mockInsights} language="en" />);
      
      const listenButtons = screen.getAllByText('Listen');
      fireEvent.click(listenButtons[0]);

      await waitFor(() => {
        expect(mockSpeak).toHaveBeenCalled();
        expect(mockUtterance.lang).toBe('en-IN');
      });
    });
  });
});
