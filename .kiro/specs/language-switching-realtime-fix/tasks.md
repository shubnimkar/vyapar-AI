# Implementation Plan

- [x] 1. Write bug condition exploration test
  - **Property 1: Fault Condition** - Speech Synthesis Uses English Voice for Hindi/Marathi
  - **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior - it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate the bug exists
  - **Scoped PBT Approach**: For deterministic bugs, scope the property to the concrete failing case(s) to ensure reproducibility
  - Test that when language is 'hi' or 'mr' and handleSpeak is called, utterance.voice is NOT set to a voice matching the target language (from Fault Condition in design)
  - The test assertions should match the Expected Behavior Properties from design: utterance.voice.lang should match the selected language code
  - Mock window.speechSynthesis.getVoices() to return Hindi and Marathi voices
  - Simulate clicking Listen button with Hindi selected
  - Verify that utterance.voice is undefined or set to English voice (bug condition)
  - Run test on UNFIXED code
  - **EXPECTED OUTCOME**: Test FAILS (this is correct - it proves the bug exists)
  - Document counterexamples found to understand root cause (e.g., "utterance.voice is undefined when Hindi is selected")
  - Mark task complete when test is written, run, and failure is documented
  - _Requirements: 2.1, 2.2, 2.3_

- [x] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Non-Speech Functionality Unchanged
  - **IMPORTANT**: Follow observation-first methodology
  - Observe behavior on UNFIXED code for non-buggy inputs (language switching UI, text translations, localStorage persistence)
  - Write property-based tests capturing observed behavior patterns from Preservation Requirements
  - Test that language switching updates localStorage as 'vyapar-lang'
  - Test that LanguageSelector highlights the currently selected language
  - Test that clicking Listen while speaking stops current speech
  - Test that Listen button is hidden when speech synthesis is not supported
  - Test that translation system continues to use t() function correctly
  - Property-based testing generates many test cases for stronger guarantees
  - Run tests on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS (this confirms baseline behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7_

- [x] 3. Fix for speech synthesis language voice selection

  - [x] 3.1 Implement voice selection helper function
    - Create `selectVoiceForLanguage` function in InsightsDisplay.tsx
    - Function takes language code ('hi-IN', 'mr-IN', 'en-IN') as input
    - Query available voices using window.speechSynthesis.getVoices()
    - Filter voices by exact match first (e.g., 'hi-IN')
    - If no exact match, filter by prefix match (e.g., 'hi' matches 'hi-IN', 'hi-GB')
    - Return first matching voice or null if none found
    - _Bug_Condition: isBugCondition(input) where input.language IN ['hi', 'mr'] AND utterance.voice is NOT set_
    - _Expected_Behavior: utterance.voice SHALL be set to a voice matching the target language code_
    - _Preservation: Language preference storage, LanguageSelector highlighting, translation system unchanged_
    - _Requirements: 2.1, 2.2, 2.3, 3.1, 3.2, 3.6, 3.7_

  - [x] 3.2 Handle asynchronous voice loading
    - Add logic to handle 'voiceschanged' event for browsers that load voices asynchronously
    - Check if voices are already loaded before attempting selection
    - If voices array is empty, wait for 'voiceschanged' event
    - Implement timeout to prevent indefinite waiting
    - _Bug_Condition: Voices may not be available immediately on page load_
    - _Expected_Behavior: Voice selection SHALL work correctly after voices are loaded_
    - _Preservation: Existing speech synthesis behavior for browsers with synchronous voice loading_
    - _Requirements: 2.1, 2.2, 2.3_

  - [x] 3.3 Modify handleSpeak function to use voice selection
    - Update handleSpeak to call selectVoiceForLanguage with appropriate language code
    - Map language prop ('hi', 'mr', 'en') to BCP 47 codes ('hi-IN', 'mr-IN', 'en-IN')
    - Set utterance.voice to the selected voice if one is found
    - Keep existing utterance.lang setting as fallback hint
    - _Bug_Condition: handleSpeak does not set utterance.voice, causing English speech_
    - _Expected_Behavior: handleSpeak SHALL set utterance.voice to correct language voice_
    - _Preservation: Stop speech toggle, utterance.lang setting, speech synthesis API usage_
    - _Requirements: 2.1, 2.2, 2.3, 3.3_

  - [x] 3.4 Add user feedback for missing voices
    - Add state to track when voice is not available for selected language
    - Display user-friendly message when no voice is found (e.g., toast notification or inline message)
    - Suggest using English as alternative when target language voice unavailable
    - _Bug_Condition: No user feedback when voices are unavailable_
    - _Expected_Behavior: System SHALL display message when text-to-speech not available for language_
    - _Preservation: Existing UI rendering and component structure_
    - _Requirements: 2.4, 3.5_

  - [x] 3.5 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - Speech Synthesis Selects Correct Language Voice
    - **IMPORTANT**: Re-run the SAME test from task 1 - do NOT write a new test
    - The test from task 1 encodes the expected behavior
    - When this test passes, it confirms the expected behavior is satisfied
    - Run bug condition exploration test from step 1
    - Verify that utterance.voice is now set to a voice matching the target language
    - **EXPECTED OUTCOME**: Test PASSES (confirms bug is fixed)
    - _Requirements: 2.1, 2.2, 2.3_

  - [x] 3.6 Verify preservation tests still pass
    - **Property 2: Preservation** - Non-Speech Functionality Unchanged
    - **IMPORTANT**: Re-run the SAME tests from task 2 - do NOT write new tests
    - Run preservation property tests from step 2
    - Verify language switching, localStorage, translations, and all non-speech features work correctly
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)
    - Confirm all tests still pass after fix (no regressions)

- [x] 4. Checkpoint - Ensure all tests pass
  - Run all unit tests for InsightsDisplay component
  - Run all property-based tests for voice selection and preservation
  - Run integration tests for full language switching flow
  - Verify manual testing: switch to Hindi → click Listen → hear Hindi speech
  - Verify manual testing: switch to Marathi → click Listen → hear Marathi speech
  - Verify manual testing: switch to English → click Listen → hear English speech
  - Ensure all tests pass, ask the user if questions arise
