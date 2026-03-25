/**
 * Daily Health Coach Service
 * 
 * Service layer that integrates suggestion generation with daily entries.
 * Handles context building and error recovery.
 */

import { DailyEntry, CreditEntry, DailySuggestion, Language } from '../types';
import { generateDailySuggestions } from './generateDailySuggestions';
import { buildSuggestionContext } from './suggestionContext';
import { logger } from '../logger';

/**
 * Get user language preference from localStorage or default to English
 */
function getUserLanguage(): Language {
  if (typeof window === 'undefined') return 'en';
  
  try {
    const stored =
      localStorage.getItem('vyapar-lang') ||
      localStorage.getItem('vyapar-language');
    if (stored && ['en', 'hi', 'mr'].includes(stored)) {
      return stored as Language;
    }
  } catch (error) {
    logger.warn('Failed to get language preference', { error });
  }
  
  return 'en';
}

/**
 * Load credit entries from localStorage
 */
function loadCreditEntries(): CreditEntry[] {
  if (typeof window === 'undefined') return [];
  
  try {
    const stored = localStorage.getItem('vyapar-credits');
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    logger.error('Failed to load credit entries', { error });
  }
  
  return [];
}

/**
 * Load historical daily entries from localStorage
 */
function loadHistoricalEntries(): DailyEntry[] {
  if (typeof window === 'undefined') return [];
  
  try {
    const stored = localStorage.getItem('vyapar-daily-entries');
    if (stored) {
      const entries = JSON.parse(stored);
      // Sort by date descending
      return entries.sort((a: DailyEntry, b: DailyEntry) => 
        b.date.localeCompare(a.date)
      );
    }
  } catch (error) {
    logger.error('Failed to load historical entries', { error });
  }
  
  return [];
}

/**
 * Generate suggestions for a daily entry
 * 
 * This function:
 * - Loads historical data and credits from localStorage
 * - Builds suggestion context
 * - Generates suggestions using the deterministic engine
 * - Handles errors gracefully (never throws)
 * 
 * @param entry - The daily entry to generate suggestions for
 * @returns Array of suggestions (empty array on error)
 */
export function generateSuggestionsForEntry(entry: DailyEntry): DailySuggestion[] {
  try {
    // Load data from localStorage
    const historicalEntries = loadHistoricalEntries();
    const creditEntries = loadCreditEntries();
    const language = getUserLanguage();
    
    // Build context
    const context = buildSuggestionContext(
      entry,
      historicalEntries,
      creditEntries,
      language
    );
    
    // Generate suggestions
    const suggestions = generateDailySuggestions(context);
    
    logger.info('Generated suggestions', { 
      date: entry.date, 
      count: suggestions.length 
    });
    
    return suggestions;
    
  } catch (error) {
    logger.error('Failed to generate suggestions', { 
      error, 
      date: entry.date 
    });
    
    // Return empty array on error - never block the save operation
    return [];
  }
}

/**
 * Dismiss a suggestion by setting its dismissed_at timestamp
 * 
 * @param entry - The daily entry containing the suggestion
 * @param suggestionId - ID of the suggestion to dismiss
 * @returns Updated entry with dismissed suggestion
 */
export function dismissSuggestion(
  entry: DailyEntry,
  suggestionId: string
): DailyEntry {
  if (!entry.suggestions) {
    return entry;
  }
  
  const updatedSuggestions = entry.suggestions.map(suggestion => {
    if (suggestion.id === suggestionId && !suggestion.dismissed_at) {
      return {
        ...suggestion,
        dismissed_at: new Date().toISOString()
      };
    }
    return suggestion;
  });
  
  return {
    ...entry,
    suggestions: updatedSuggestions
  };
}

/**
 * Get undismissed suggestions from an entry
 * 
 * @param entry - The daily entry
 * @returns Array of undismissed suggestions sorted by severity
 */
export function getUndismissedSuggestions(entry: DailyEntry): DailySuggestion[] {
  if (!entry.suggestions) {
    return [];
  }
  
  return entry.suggestions
    .filter(s => !s.dismissed_at)
    .sort((a, b) => {
      const severityOrder = { critical: 0, warning: 1, info: 2 };
      return severityOrder[a.severity] - severityOrder[b.severity];
    });
}
