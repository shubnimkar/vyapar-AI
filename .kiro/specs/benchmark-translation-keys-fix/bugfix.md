# Bugfix Requirements Document

## Introduction

The benchmark comparison feature in Vyapar AI displays raw translation keys (e.g., "benchmark.title", "benchmark.yourBusiness", "benchmark.segmentAverage") instead of properly translated text in the user's selected language. This affects both the Dashboard and Analysis sections where the BenchmarkDisplay component is used, degrading the user experience for non-English speakers and making the interface appear broken.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN a user views the benchmark section on the Dashboard with any language selected THEN the system displays raw translation keys like "benchmark.title" instead of translated text

1.2 WHEN a user views the benchmark section on the Analysis page with any language selected THEN the system displays raw translation keys like "benchmark.yourBusiness", "benchmark.segmentAverage" instead of translated text

1.3 WHEN the BenchmarkDisplay component renders benchmark labels THEN the system shows untranslated keys instead of language-specific text (English: "How You Compare", Hindi: "आप कैसे तुलना करते हैं", Marathi: "तुमची तुलना कशी आहे")

### Expected Behavior (Correct)

2.1 WHEN a user views the benchmark section on the Dashboard with English selected THEN the system SHALL display "How You Compare", "Your Business", "Similar Businesses" in English

2.2 WHEN a user views the benchmark section with Hindi selected THEN the system SHALL display "आप कैसे तुलना करते हैं", "आपका व्यापार", "समान व्यापार" in Hindi

2.3 WHEN a user views the benchmark section with Marathi selected THEN the system SHALL display "तुमची तुलना कशी आहे", "तुमचा व्यवसाय", "समान व्यवसाय" in Marathi

2.4 WHEN the BenchmarkDisplay component renders THEN the system SHALL correctly invoke the t() translation function with the appropriate translation key and language parameter

### Unchanged Behavior (Regression Prevention)

3.1 WHEN a user views other sections of the application with translated text THEN the system SHALL CONTINUE TO display properly translated text in those sections

3.2 WHEN the BenchmarkDisplay component receives benchmark comparison data THEN the system SHALL CONTINUE TO display the numerical values, performance indicators, and visual elements correctly

3.3 WHEN a user switches languages in the application THEN the system SHALL CONTINUE TO update all other translated text in real-time

3.4 WHEN the benchmark AI explanation feature is used THEN the system SHALL CONTINUE TO function correctly with proper translations

3.5 WHEN the BenchmarkDisplay component shows loading, error, or no-data states THEN the system SHALL CONTINUE TO display those states with proper translations


## Bug Condition Derivation

### Bug Condition Function

The bug occurs when translation keys are rendered as literal strings instead of being translated:

```pascal
FUNCTION isBugCondition(X)
  INPUT: X of type BenchmarkRenderContext
    WHERE X = {
      translationKey: string,
      language: Language,
      renderedText: string
    }
  OUTPUT: boolean
  
  // Returns true when a translation key is displayed as raw text
  // instead of the translated value
  RETURN X.renderedText = X.translationKey
END FUNCTION
```

### Property Specification - Fix Checking

The fix ensures that all benchmark translation keys are properly translated:

```pascal
// Property: Fix Checking - Translation Keys Must Be Translated
FOR ALL X WHERE isBugCondition(X) DO
  result ← renderBenchmarkLabel'(X.translationKey, X.language)
  ASSERT result ≠ X.translationKey AND
         result = getTranslation(X.translationKey, X.language) AND
         result.length > 0
END FOR
```

**Key Definitions:**
- **renderBenchmarkLabel**: The original (unfixed) rendering function that displays raw keys
- **renderBenchmarkLabel'**: The fixed rendering function that properly translates keys
- **getTranslation**: The translation lookup function from lib/translations.ts

### Property Specification - Preservation Checking

The fix must not break existing translation functionality:

```pascal
// Property: Preservation Checking - Non-Benchmark Translations Unchanged
FOR ALL X WHERE NOT isBugCondition(X) DO
  ASSERT renderBenchmarkLabel(X) = renderBenchmarkLabel'(X)
END FOR
```

This ensures that:
- Other translated sections continue to work correctly
- Numerical values and performance indicators remain unchanged
- Language switching functionality is preserved
- Loading, error, and no-data states continue to display properly

### Concrete Examples

**Buggy Input (Current Behavior):**
```typescript
// Example 1: Title not translated
{
  translationKey: "benchmark.title",
  language: "hi",
  renderedText: "benchmark.title"  // BUG: Raw key displayed
}

// Example 2: Label not translated
{
  translationKey: "benchmark.yourBusiness",
  language: "mr",
  renderedText: "benchmark.yourBusiness"  // BUG: Raw key displayed
}
```

**Expected Output (Correct Behavior):**
```typescript
// Example 1: Title properly translated
{
  translationKey: "benchmark.title",
  language: "hi",
  renderedText: "आप कैसे तुलना करते हैं"  // CORRECT: Hindi translation
}

// Example 2: Label properly translated
{
  translationKey: "benchmark.yourBusiness",
  language: "mr",
  renderedText: "तुमचा व्यवसाय"  // CORRECT: Marathi translation
}
```

### Affected Translation Keys

The following translation keys are affected by this bug:
- `benchmark.title`
- `benchmark.yourBusiness`
- `benchmark.segmentAverage`
- `benchmark.healthScore`
- `benchmark.profitMargin`
- `benchmark.category.above_average`
- `benchmark.category.at_average`
- `benchmark.category.below_average`
- `benchmark.sampleSize`
- `benchmark.limitedData`
- `benchmark.staleData`
- `benchmark.noData`
- `benchmark.getAiExplanation`
- `benchmark.aiExplanation`
- `benchmark.hide`
