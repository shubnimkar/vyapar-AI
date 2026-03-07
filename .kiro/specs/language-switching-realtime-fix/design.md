# Language Switching Real-Time Fix - Bugfix Design

## Overview

The Vyapar AI application supports three languages (English, Hindi, Marathi) with a language selector component. However, the "Listen" feature (text-to-speech) in InsightsDisplay.tsx always plays audio in English, regardless of the selected language. This occurs because while the code sets the `utterance.lang` property correctly, it does not explicitly select a voice that supports the target language from the browser's available voices.

This bugfix implements a voice selection algorithm that queries available voices, filters by language, and selects an appropriate voice for Hindi/Marathi speech synthesis. It also includes fallback handling when target language voices are unavailable, and ensures all UI components re-render properly when language changes.

## Glossary

- **Bug_Condition (C)**: The condition that triggers the bug - when a user switches to Hindi or Marathi and clicks the Listen button, but the speech synthesis speaks in English instead of the selected language
- **Property (P)**: The desired behavior - the Listen button should select and use a voice that supports the target language (Hindi/Marathi/English) for speech synthesis
- **Preservation**: Existing language switching behavior, localStorage persistence, and all other UI functionality that must remain unchanged by the fix
- **SpeechSynthesisUtterance**: The Web Speech API object that represents a speech request, containing text and voice settings
- **window.speechSynthesis.getVoices()**: Browser API that returns an array of available speech synthesis voices
- **utterance.voice**: The SpeechSynthesisVoice object that determines which voice will be used for speech synthesis
- **utterance.lang**: The BCP 47 language tag (e.g., 'hi-IN', 'mr-IN') that hints at the desired language, but does not guarantee voice selection
- **Voice Selection Algorithm**: The logic that filters available voices by language code and selects the most appropriate one

## Bug Details

### Fault Condition

The bug manifests when a user switches the application language to Hindi or Marathi and then clicks the "Listen" button on any insight card in the InsightsDisplay component. The `handleSpeak` function correctly sets `utterance.lang` to 'hi-IN' or 'mr-IN', but it does not set `utterance.voice` to a voice that supports that language. As a result, the browser's speech synthesis engine uses the default voice (typically English), causing the content to be spoken in English even though the language code is set correctly.

**Formal Specification:**
```
FUNCTION isBugCondition(input)
  INPUT: input of type { language: Language, hasAvailableVoice: boolean }
  OUTPUT: boolean
  
  RETURN input.language IN ['hi', 'mr']
         AND input.hasAvailableVoice = true
         AND utterance.voice is NOT set to a voice matching input.language
         AND speech is spoken in English instead of target language
END FUNCTION
```

### Examples

- **Example 1**: User switches to Hindi (हिंदी), clicks Listen on "True Profit Analysis" card
  - Expected: Speech synthesis speaks in Hindi using a Hindi voice
  - Actual: Speech synthesis speaks in English using the default English voice

- **Example 2**: User switches to Marathi (मराठी), clicks Listen on "Blocked Inventory Cash" card
  - Expected: Speech synthesis speaks in Marathi using a Marathi voice
  - Actual: Speech synthesis speaks in English using the default English voice

- **Example 3**: User switches to English, clicks Listen on any insight card
  - Expected: Speech synthesis speaks in English using an English voice
  - Actual: Speech synthesis speaks in English (works correctly, but should be explicit)

- **Edge Case**: User switches to Hindi, but browser has no Hindi voices available
  - Expected: System displays a user-friendly message indicating text-to-speech is not available for Hindi
  - Actual: Speech synthesis speaks in English without informing the user

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- Language preference must continue to be stored in localStorage as 'vyapar-lang'
- LanguageSelector component must continue to highlight the currently selected language
- Clicking Listen while speech is playing must continue to stop current speech and toggle state
- Listen button must continue to be hidden when speech synthesis is not supported
- All existing functionality (daily entries, credit tracking, health score, etc.) must continue to work correctly
- Translation system must continue to use the t() function from lib/translations.ts
- Components must continue to receive and use the language prop for displaying translated text

**Scope:**
All inputs that do NOT involve the Listen button's speech synthesis should be completely unaffected by this fix. This includes:
- Text translations and UI rendering
- Language selector interaction
- Data entry and calculation features
- Navigation and routing
- localStorage operations for non-speech features

## Hypothesized Root Cause

Based on the bug description and code analysis, the root cause is:

1. **Missing Voice Selection**: The `handleSpeak` function in `InsightsDisplay.tsx` sets `utterance.lang` but does not set `utterance.voice`. The Web Speech API requires explicit voice selection to use non-default voices.

2. **Browser Voice Selection Behavior**: When `utterance.voice` is not set, browsers use their default voice regardless of the `utterance.lang` property. The lang property is only a hint and does not force voice selection.

3. **Asynchronous Voice Loading**: The `window.speechSynthesis.getVoices()` API may return an empty array initially on some browsers (especially Chrome). Voices are loaded asynchronously, and the code needs to handle the 'voiceschanged' event.

4. **No Fallback Handling**: The current implementation does not check if voices are available for the target language or provide user feedback when they are not.

## Correctness Properties

Property 1: Fault Condition - Speech Synthesis Uses Correct Language Voice

_For any_ user interaction where the language is set to Hindi or Marathi and the Listen button is clicked, the fixed handleSpeak function SHALL query available voices, filter by the target language code, select an appropriate voice, and set utterance.voice to that voice, causing the speech to be spoken in the correct language.

**Validates: Requirements 2.1, 2.2, 2.3**

Property 2: Preservation - Non-Speech Functionality Unchanged

_For any_ user interaction that does NOT involve clicking the Listen button (language switching UI, text translations, data entry, navigation), the fixed code SHALL produce exactly the same behavior as the original code, preserving all existing functionality for non-speech interactions.

**Validates: Requirements 3.1, 3.2, 3.4, 3.5, 3.6, 3.7**

## Fix Implementation

### Changes Required

**File**: `components/InsightsDisplay.tsx`

**Function**: `handleSpeak`

**Specific Changes**:

1. **Add Voice Selection Helper Function**: Create a `selectVoiceForLanguage` function that:
   - Takes a language code ('hi-IN', 'mr-IN', 'en-IN') as input
   - Calls `window.speechSynthesis.getVoices()` to get available voices
   - Filters voices by matching the language code (exact match or prefix match)
   - Returns the first matching voice, or null if none found

2. **Handle Asynchronous Voice Loading**: Add logic to handle the 'voiceschanged' event:
   - Check if voices are already loaded
   - If not, wait for the 'voiceschanged' event before attempting voice selection
   - Implement a timeout to prevent indefinite waiting

3. **Modify handleSpeak Function**: Update the speech synthesis logic to:
   - Call the voice selection helper function with the appropriate language code
   - Set `utterance.voice` to the selected voice if one is found
   - If no voice is found, display a user-friendly error message to the user
   - Keep the existing `utterance.lang` setting as a fallback hint

4. **Add User Feedback for Missing Voices**: Implement state and UI to:
   - Track when a voice is not available for the selected language
   - Display a toast notification or inline message informing the user
   - Suggest using English as an alternative

5. **Add Voice Availability Check**: Before showing the Listen button:
   - Check if at least one voice is available for the current language
   - Optionally hide or disable the Listen button if no voices are available
   - Or show the button but display a message when clicked

### Voice Selection Algorithm Pseudocode

```
FUNCTION selectVoiceForLanguage(langCode: string): SpeechSynthesisVoice | null
  INPUT: langCode (e.g., 'hi-IN', 'mr-IN', 'en-IN')
  OUTPUT: SpeechSynthesisVoice object or null
  
  voices := window.speechSynthesis.getVoices()
  
  IF voices.length = 0 THEN
    RETURN null
  END IF
  
  // Try exact match first (e.g., 'hi-IN')
  FOR EACH voice IN voices DO
    IF voice.lang = langCode THEN
      RETURN voice
    END IF
  END FOR
  
  // Try prefix match (e.g., 'hi' matches 'hi-IN', 'hi-GB')
  langPrefix := langCode.split('-')[0]
  FOR EACH voice IN voices DO
    IF voice.lang.startsWith(langPrefix) THEN
      RETURN voice
    END IF
  END FOR
  
  RETURN null
END FUNCTION
```

### Component Re-rendering Strategy

The current implementation already handles re-rendering correctly:
- Language is stored in React state in the parent component (app/page.tsx)
- Language is passed as a prop to InsightsDisplay
- When language changes, React automatically re-renders InsightsDisplay with the new prop
- The sections array is recreated on each render with updated translations

**No changes needed** for re-rendering strategy, as React's default behavior handles this correctly.

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that demonstrate the bug on unfixed code, then verify the fix works correctly and preserves existing behavior.

### Exploratory Fault Condition Checking

**Goal**: Surface counterexamples that demonstrate the bug BEFORE implementing the fix. Confirm that speech synthesis uses English voices even when Hindi/Marathi is selected.

**Test Plan**: Write tests that simulate language switching and Listen button clicks. Mock the Web Speech API to observe which voice is selected. Run these tests on the UNFIXED code to observe failures and confirm the root cause.

**Test Cases**:
1. **Hindi Voice Selection Test**: Switch to Hindi, click Listen, verify that no Hindi voice is selected (will fail on unfixed code)
2. **Marathi Voice Selection Test**: Switch to Marathi, click Listen, verify that no Marathi voice is selected (will fail on unfixed code)
3. **English Voice Selection Test**: Switch to English, click Listen, verify voice selection behavior (may pass or fail on unfixed code)
4. **No Voices Available Test**: Mock empty voices array, click Listen, verify no error handling (will fail on unfixed code)

**Expected Counterexamples**:
- `utterance.voice` is undefined or set to default English voice when Hindi/Marathi is selected
- No user feedback when voices are unavailable for the target language
- Possible cause: Missing voice selection logic, no handling of asynchronous voice loading

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds (Hindi/Marathi selected, voices available), the fixed function selects the correct voice.

**Pseudocode:**
```
FOR ALL input WHERE isBugCondition(input) DO
  result := handleSpeak_fixed(text, language)
  ASSERT result.utterance.voice.lang matches language code
  ASSERT speech is spoken in correct language
END FOR
```

**Test Cases**:
1. Verify Hindi voice is selected when language is 'hi' and Hindi voices are available
2. Verify Marathi voice is selected when language is 'mr' and Marathi voices are available
3. Verify English voice is selected when language is 'en'
4. Verify fallback message is shown when target language voice is not available
5. Verify voice selection works after 'voiceschanged' event fires

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold (non-Listen interactions), the fixed function produces the same result as the original function.

**Pseudocode:**
```
FOR ALL input WHERE NOT isBugCondition(input) DO
  ASSERT originalBehavior(input) = fixedBehavior(input)
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking because:
- It generates many test cases automatically across the input domain
- It catches edge cases that manual unit tests might miss
- It provides strong guarantees that behavior is unchanged for all non-speech inputs

**Test Plan**: Observe behavior on UNFIXED code first for language switching, text rendering, and other interactions, then write property-based tests capturing that behavior.

**Test Cases**:
1. **Language Switching Preservation**: Verify that switching languages updates UI text correctly (unchanged)
2. **localStorage Preservation**: Verify that language preference is still stored in localStorage
3. **Translation Preservation**: Verify that all translated text continues to display correctly
4. **Stop Button Preservation**: Verify that clicking Listen while speaking still stops speech
5. **Component Rendering Preservation**: Verify that insight cards render correctly with all content
6. **Button Visibility Preservation**: Verify that Listen button visibility logic is unchanged when speech synthesis is not supported

### Unit Tests

- Test `selectVoiceForLanguage` function with various language codes and voice arrays
- Test voice selection with exact matches (e.g., 'hi-IN' voice for 'hi-IN' request)
- Test voice selection with prefix matches (e.g., 'hi-GB' voice for 'hi-IN' request)
- Test voice selection when no matching voices are available (returns null)
- Test handleSpeak with mocked speech synthesis API for each language
- Test error handling when voices array is empty
- Test that utterance.lang is still set as a fallback

### Property-Based Tests

- Generate random language selections and verify correct voice selection for each
- Generate random voice availability scenarios and verify appropriate fallback behavior
- Generate random insight content and verify speech synthesis works correctly
- Test that all non-speech interactions produce identical results before and after fix

### Integration Tests

- Test full user flow: switch to Hindi → click Listen → verify Hindi speech
- Test full user flow: switch to Marathi → click Listen → verify Marathi speech
- Test full user flow: switch to English → click Listen → verify English speech
- Test voice loading timing: verify behavior when voices load asynchronously
- Test fallback flow: verify user feedback when target language voice is unavailable
- Test that switching languages mid-speech stops current speech and uses new language
