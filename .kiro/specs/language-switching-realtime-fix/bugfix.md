# Bugfix Requirements Document: Language Switching Real-Time Fix

## Introduction

The Vyapar AI application supports three languages (English, Hindi, Marathi) with a language selector component. However, there are two critical issues affecting the user experience:

1. The "Listen" feature (text-to-speech) in InsightsDisplay.tsx always plays audio in English, regardless of the selected language
2. Some UI components may not be re-rendering in real-time when the language is switched

This bugfix addresses both issues to ensure seamless, real-time language switching across all UI elements and audio features.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN user switches language to Hindi or Marathi THEN the Listen button in InsightsDisplay component sets `utterance.lang` to 'hi-IN' or 'mr-IN' but the speech synthesis still speaks in English

1.2 WHEN user switches language to Hindi or Marathi THEN the speech synthesis uses the default English voice instead of selecting a voice that supports the target language

1.3 WHEN user switches language THEN some UI components may not immediately re-render with the new language text due to missing React state dependencies

### Expected Behavior (Correct)

2.1 WHEN user switches language to Hindi THEN the Listen button SHALL select an available Hindi voice from `window.speechSynthesis.getVoices()` and speak the content in Hindi

2.2 WHEN user switches language to Marathi THEN the Listen button SHALL select an available Marathi voice from `window.speechSynthesis.getVoices()` and speak the content in Marathi

2.3 WHEN user switches language to English THEN the Listen button SHALL select an available English voice and speak the content in English

2.4 WHEN no voice is available for the selected language THEN the system SHALL display a user-friendly message indicating that text-to-speech is not available for that language

2.5 WHEN user switches language THEN all UI components SHALL immediately re-render with the new language text without requiring page refresh

### Unchanged Behavior (Regression Prevention)

3.1 WHEN user switches language THEN the language preference SHALL CONTINUE TO be stored in localStorage as 'vyapar-lang'

3.2 WHEN user switches language THEN the LanguageSelector component SHALL CONTINUE TO highlight the currently selected language

3.3 WHEN user clicks the Listen button while speech is playing THEN the system SHALL CONTINUE TO stop the current speech and toggle the speaking state

3.4 WHEN speech synthesis is not supported by the browser THEN the Listen button SHALL CONTINUE TO not be displayed

3.5 WHEN user switches language THEN all existing functionality (daily entries, credit tracking, health score, etc.) SHALL CONTINUE TO work correctly

3.6 WHEN user switches language THEN the translation system SHALL CONTINUE TO use the t() function from lib/translations.ts

3.7 WHEN components receive the language prop THEN they SHALL CONTINUE TO use it to display translated text via the t() function
