# Benchmark Translation Keys Fix - Design Document

## Overview

The BenchmarkDisplay component displays raw translation keys (e.g., "benchmark.title", "benchmark.yourBusiness") instead of properly translated text. This occurs despite the translation keys existing in `lib/translations.ts` and the component correctly calling the `t()` function. The root cause is likely a module import issue, build configuration problem, or the translations object not being properly exported/imported in the production build.

The fix will ensure that all benchmark labels are properly translated by verifying the import chain, checking for build-time issues, and potentially adding runtime validation to catch translation failures early.

## Glossary

- **Bug_Condition (C)**: The condition where translation keys are rendered as literal strings instead of translated values
- **Property (P)**: The desired behavior where all translation keys are properly resolved to translated text in the user's selected language
- **Preservation**: Existing translation functionality for non-benchmark components must remain unchanged
- **t() function**: The translation function in `lib/translations.ts` that resolves keys to translated strings
- **translations object**: The dictionary in `lib/translations.ts` containing all translation key-value pairs
- **BenchmarkDisplay**: The component in `components/BenchmarkDisplay.tsx` that renders benchmark comparison data

## Bug Details

### Fault Condition

The bug manifests when the BenchmarkDisplay component renders translation keys as raw strings instead of translated text. The `t()` function is being called correctly with the proper key and language parameters, but it returns the key itself instead of the translated value.

**Formal Specification:**
```
FUNCTION isBugCondition(input)
  INPUT: input of type RenderContext
    WHERE input = {
      translationKey: string,
      language: Language,
      renderedText: string
    }
  OUTPUT: boolean
  
  RETURN input.renderedText = input.translationKey
         AND input.translationKey STARTS_WITH 'benchmark.'
         AND translationExists(input.translationKey, input.language)
END FUNCTION
```

### Examples

**Example 1: Title not translated**
- Input: `t('benchmark.title', 'hi')`
- Expected: `"आप कैसे तुलना करते हैं"`
- Actual: `"benchmark.title"`

**Example 2: Label not translated**
- Input: `t('benchmark.yourBusiness', 'mr')`
- Expected: `"तुमचा व्यवसाय"`
- Actual: `"benchmark.yourBusiness"`

**Example 3: Category not translated**
- Input: `t('benchmark.category.above_average', 'en')`
- Expected: `"Above Average"`
- Actual: `"benchmark.category.above_average"`

**Edge Case: Fallback behavior**
- Input: `t('benchmark.nonexistent', 'en')`
- Expected: `"benchmark.nonexistent"` (fallback to key)
- Actual: `"benchmark.nonexistent"` (correct fallback behavior)

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- All non-benchmark translations must continue to work correctly (daily entry, health score, credit tracking, etc.)
- The `t()` function fallback behavior (returning the key when translation is missing) must remain unchanged
- Language switching functionality must continue to work for all other components
- The BenchmarkDisplay component's data display logic (numbers, indicators, visual elements) must remain unchanged
- Test mocks for translations must continue to work correctly

**Scope:**
All inputs that do NOT involve benchmark translation keys should be completely unaffected by this fix. This includes:
- Other translation keys (daily entry, health score, indices, etc.)
- The translation function's fallback mechanism
- Language switching in other components
- Non-translation aspects of BenchmarkDisplay (data fetching, visual indicators, AI explanation)

## Hypothesized Root Cause

Based on the bug description and code analysis, the most likely issues are:

1. **Module Import Issue**: The `translations` object may not be properly imported in the production build
   - Next.js may be tree-shaking the translations object
   - The import statement in BenchmarkDisplay may be resolving incorrectly
   - There may be a circular dependency issue

2. **Build Configuration Problem**: The Next.js build process may be handling the translations file incorrectly
   - The translations object may be too large and getting split incorrectly
   - Server-side vs client-side rendering may be causing import issues
   - The 'use client' directive may not be properly handling the translations import

3. **Runtime Translation Resolution**: The `t()` function may be receiving an undefined translations object
   - The translations object may not be initialized when BenchmarkDisplay renders
   - There may be a timing issue with module loading
   - The translations object may be getting garbage collected or optimized away

4. **Specific Key Structure Issue**: The nested key structure (e.g., 'benchmark.category.above_average') may not be resolving correctly
   - The dot notation in keys may be causing lookup issues
   - The translations object structure may not match the expected format

## Correctness Properties

Property 1: Fault Condition - Benchmark Translation Keys Must Be Translated

_For any_ translation key that starts with 'benchmark.' and exists in the translations object, the BenchmarkDisplay component SHALL render the translated text in the user's selected language, not the raw translation key.

**Validates: Requirements 2.1, 2.2, 2.3, 2.4**

Property 2: Preservation - Non-Benchmark Translation Behavior

_For any_ translation key that does NOT start with 'benchmark.', the fixed code SHALL produce exactly the same translation behavior as the original code, preserving all existing translation functionality across the application.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5**

## Fix Implementation

### Changes Required

Assuming our root cause analysis is correct, we will implement a multi-layered fix:

**File**: `lib/translations.ts`

**Function**: `t(key: string, language: Language): string`

**Specific Changes**:
1. **Add Runtime Validation**: Add defensive checks to ensure translations object is defined
   - Check if translations object exists before lookup
   - Add console warning in development if translation is missing
   - Ensure proper fallback chain (requested language → English → key)

2. **Export Verification**: Ensure translations object is properly exported
   - Verify named export is correct
   - Add explicit type annotations
   - Consider adding a module initialization check

**File**: `components/BenchmarkDisplay.tsx`

**Component**: `BenchmarkDisplay`

**Specific Changes**:
3. **Import Verification**: Verify the import statement is correct
   - Check if import is using correct path
   - Verify import is not being tree-shaken
   - Consider using dynamic import if needed

4. **Runtime Translation Check**: Add development-mode validation
   - Log translation key and result in development
   - Add visual indicator if translation fails
   - Provide fallback UI for missing translations

**File**: `next.config.js` (if needed)

**Specific Changes**:
5. **Build Configuration**: Adjust Next.js configuration if needed
   - Ensure translations module is not being optimized away
   - Add explicit module inclusion rules
   - Configure proper client/server component handling

### Investigation Steps

Before implementing the fix, we need to:

1. **Verify Translation Object Structure**: Confirm translations object has correct structure
   ```typescript
   console.log(translations['benchmark.title']); // Should show {en: '...', hi: '...', mr: '...'}
   ```

2. **Check Import Resolution**: Verify import is resolving correctly
   ```typescript
   import { t, translations } from '@/lib/translations';
   console.log(typeof t); // Should be 'function'
   console.log(typeof translations); // Should be 'object'
   ```

3. **Test in Production Build**: Build and test in production mode
   ```bash
   npm run build
   npm run start
   # Check if translations work in production
   ```

4. **Check Browser Console**: Look for any import errors or warnings in browser console

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that demonstrate the bug on unfixed code, then verify the fix works correctly and preserves existing behavior.

### Exploratory Fault Condition Checking

**Goal**: Surface counterexamples that demonstrate the bug BEFORE implementing the fix. Confirm or refute the root cause analysis. If we refute, we will need to re-hypothesize.

**Test Plan**: Write tests that render the BenchmarkDisplay component in a production-like environment and verify that translation keys are being displayed as raw strings. Run these tests on the UNFIXED code to observe failures and understand the root cause.

**Test Cases**:
1. **Title Translation Test**: Render BenchmarkDisplay and check if "benchmark.title" appears as raw text (will fail on unfixed code)
2. **Label Translation Test**: Render BenchmarkDisplay and check if "benchmark.yourBusiness" appears as raw text (will fail on unfixed code)
3. **Category Translation Test**: Render BenchmarkDisplay and check if "benchmark.category.above_average" appears as raw text (will fail on unfixed code)
4. **Multi-Language Test**: Switch languages and verify raw keys appear in all languages (will fail on unfixed code)

**Expected Counterexamples**:
- Raw translation keys like "benchmark.title" appear in the rendered output
- Possible causes: import issue, build configuration, translations object not available, key lookup failure

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds, the fixed function produces the expected behavior.

**Pseudocode:**
```
FOR ALL input WHERE isBugCondition(input) DO
  result := renderBenchmarkLabel_fixed(input.translationKey, input.language)
  ASSERT result ≠ input.translationKey
  ASSERT result = getTranslation(input.translationKey, input.language)
  ASSERT result.length > 0
END FOR
```

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold, the fixed function produces the same result as the original function.

**Pseudocode:**
```
FOR ALL input WHERE NOT isBugCondition(input) DO
  ASSERT t_original(input.key, input.language) = t_fixed(input.key, input.language)
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking because:
- It generates many test cases automatically across the input domain
- It catches edge cases that manual unit tests might miss
- It provides strong guarantees that behavior is unchanged for all non-buggy inputs

**Test Plan**: Observe behavior on UNFIXED code first for non-benchmark translations, then write property-based tests capturing that behavior.

**Test Cases**:
1. **Daily Entry Translations**: Verify daily entry translations continue to work correctly
2. **Health Score Translations**: Verify health score translations continue to work correctly
3. **Credit Tracking Translations**: Verify credit tracking translations continue to work correctly
4. **Error Message Translations**: Verify error message translations continue to work correctly

### Unit Tests

- Test that `t()` function returns correct translations for benchmark keys
- Test that `t()` function falls back to English when translation is missing
- Test that `t()` function returns key when key doesn't exist
- Test BenchmarkDisplay renders translated text for all benchmark labels
- Test BenchmarkDisplay works in all three languages (en, hi, mr)

### Property-Based Tests

- Generate random benchmark translation keys and verify they are translated correctly
- Generate random languages and verify translations work for all languages
- Generate random component states and verify translations work in all states
- Test that non-benchmark translations are unaffected by the fix

### Integration Tests

- Test full dashboard flow with BenchmarkDisplay showing translated text
- Test language switching with BenchmarkDisplay updating translations
- Test BenchmarkDisplay in production build mode
- Test BenchmarkDisplay with real translation data (not mocked)
