# Benchmark Data Auto-Seed Bugfix Design

## Overview

The benchmark comparison feature fails with a 404 error when users attempt to view their performance metrics because benchmark data is not automatically seeded to DynamoDB. Currently, users must manually navigate to `/admin/seed-data` and click a button to seed the data, which breaks the expected workflow and creates a poor user experience.

The fix implements automatic lazy seeding: when the benchmark endpoint detects missing segment data, it will automatically seed all 15 segment combinations to DynamoDB before attempting retrieval. This ensures benchmark data is always available without requiring manual admin intervention, while preserving all existing functionality for cases where data already exists.

The approach follows the "deterministic-first" principle from vyapar-rules.md: the seeding logic is deterministic and testable, with no AI involvement in data generation or storage.

## Glossary

- **Bug_Condition (C)**: The condition that triggers the bug - when benchmark data is requested but does not exist in DynamoDB
- **Property (P)**: The desired behavior when benchmark data is missing - automatic seeding should occur transparently before data retrieval
- **Preservation**: Existing benchmark retrieval, caching, and manual seeding behavior that must remain unchanged
- **SegmentStore**: The DynamoDB client class in `lib/segmentStore.ts` that handles segment data persistence
- **BenchmarkService**: The orchestration class in `lib/benchmarkService.ts` that coordinates benchmark comparison workflow
- **seedDemoData()**: The function in `lib/demoSegmentData.ts` that generates and saves all 15 segment combinations to DynamoDB
- **Lazy Seeding**: The pattern of automatically seeding data on first access rather than at application startup

## Bug Details

### Fault Condition

The bug manifests when a user requests benchmark comparison data and no segment data exists in DynamoDB. The `SegmentStore.getSegmentData()` method returns `null`, causing the `/api/benchmark` endpoint to return a 404 error with message "Benchmark data not available for your segment".

**Formal Specification:**
```
FUNCTION isBugCondition(input)
  INPUT: input of type BenchmarkRequest { userId: string, cityTier: CityTier, businessType: BusinessType }
  OUTPUT: boolean
  
  RETURN userHasValidProfile(input.userId)
         AND userHasDailyEntries(input.userId)
         AND NOT segmentDataExistsInDynamoDB(input.cityTier, input.businessType)
         AND awsCredentialsConfigured()
END FUNCTION
```

### Examples

- **Example 1**: New user completes profile (tier1, kirana), adds daily entry, views dashboard → receives 404 error "Benchmark data not available for your segment"
- **Example 2**: Demo user with profile (tier2, salon) and daily entries attempts benchmark comparison → receives 404 error because DynamoDB is empty
- **Example 3**: User with profile (tier3, pharmacy) views dashboard after fresh deployment → receives 404 error because no seeding occurred
- **Edge Case**: User in offline mode (no AWS credentials) attempts benchmark → should gracefully fall back to cached data without attempting to seed

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- When benchmark data already exists in DynamoDB for a segment, the system must continue to retrieve and return that data without re-seeding
- When the `/api/admin/seed-benchmark` endpoint is called manually, the system must continue to seed benchmark data as it currently does
- When `SegmentStore.saveSegmentData()` is called, the system must continue to save data using the same single-table design pattern (PK: SEGMENT#{city_tier}#{business_type}, SK: METADATA)
- When AWS credentials are not configured (offline mode), the system must continue to handle credential errors gracefully and fall back to cached data
- When `generateDemoSegmentData()` is called, the system must continue to generate the same 15 segment combinations with consistent realistic values
- When benchmark comparison calculation is performed, the system must continue to use the same comparison logic and categorization rules
- When cache-first retrieval is performed, the system must continue to check localStorage before attempting DynamoDB access

**Scope:**
All inputs that do NOT involve missing benchmark data should be completely unaffected by this fix. This includes:
- Requests where segment data already exists in DynamoDB
- Manual seeding via admin endpoint
- Offline mode operations that rely on cached data
- Profile validation and daily entry retrieval logic
- Health score and margin calculation logic

## Hypothesized Root Cause

Based on the bug description and code analysis, the root cause is:

1. **Missing Initialization Logic**: The application has no automatic seeding mechanism at startup or on first use. The `seedDemoData()` function exists but is only called via the manual admin endpoint.

2. **No Lazy Seeding in Retrieval Path**: When `SegmentStore.getSegmentData()` returns `null` (data not found), the `BenchmarkService.getSegmentData()` method simply returns `null` instead of attempting to seed the missing data.

3. **Assumption of Pre-Seeded Data**: The benchmark feature assumes data has been manually seeded, which is not a reasonable assumption for new deployments, demos, or fresh database instances.

4. **No Seeding Trigger**: There is no trigger mechanism (startup script, first-request detection, or lazy initialization) to ensure benchmark data exists before it's needed.

## Correctness Properties

Property 1: Fault Condition - Automatic Seeding on Missing Data

_For any_ benchmark request where the user has a valid profile and daily entries but segment data does not exist in DynamoDB, the fixed system SHALL automatically seed all 15 segment combinations to DynamoDB before attempting to retrieve the requested segment data, ensuring the benchmark comparison succeeds without manual intervention.

**Validates: Requirements 2.1, 2.2, 2.3, 2.4**

Property 2: Preservation - Existing Data Retrieval Behavior

_For any_ benchmark request where segment data already exists in DynamoDB, the fixed system SHALL produce exactly the same behavior as the original system, retrieving the existing data without re-seeding and preserving all caching, comparison, and error handling logic.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6**

## Fix Implementation

### Changes Required

Assuming our root cause analysis is correct:

**File**: `lib/benchmarkService.ts`

**Function**: `getSegmentData()`

**Specific Changes**:
1. **Add Seeding Detection**: After `segmentStore.getSegmentData()` returns `null`, check if this is the first time any segment data is being requested (by attempting to fetch a known segment like tier1/kirana)

2. **Implement Lazy Seeding**: If no segment data exists at all, call `seedDemoData()` to populate all 15 combinations before retrying the original request

3. **Add Seeding Guard**: Use a flag or check to prevent multiple concurrent seeding operations (idempotency)

4. **Preserve Error Handling**: Maintain existing offline mode handling and credential error graceful degradation

5. **Add Logging**: Log when automatic seeding is triggered for visibility and debugging

**Implementation Strategy**:
```typescript
async getSegmentData(
  cityTier: CityTier,
  businessType: BusinessType
): Promise<SegmentData | null> {
  // Existing cache check logic...
  
  // Try DynamoDB
  if (isOnline) {
    try {
      let segmentData = await this.segmentStore.getSegmentData(cityTier, businessType);
      
      // NEW: If not found, check if database is empty and seed if needed
      if (!segmentData) {
        const shouldSeed = await this.shouldAutoSeed();
        if (shouldSeed) {
          logger.info('No benchmark data found, auto-seeding...');
          await seedDemoData();
          // Retry after seeding
          segmentData = await this.segmentStore.getSegmentData(cityTier, businessType);
        }
      }
      
      if (segmentData) {
        this.cacheManager.saveToCache(segmentData);
        return segmentData;
      }
    } catch (error) {
      logger.error('Failed to fetch segment data', { error });
    }
  }
  
  // Existing fallback logic...
}

// NEW: Helper method to determine if auto-seeding should occur
private async shouldAutoSeed(): Promise<boolean> {
  // Check if any segment data exists (probe with tier1/kirana)
  try {
    const probe = await this.segmentStore.getSegmentData('tier1', 'kirana');
    return probe === null; // Seed only if database is completely empty
  } catch (error) {
    return false; // Don't seed on errors
  }
}
```

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that demonstrate the bug on unfixed code, then verify the fix works correctly and preserves existing behavior.

### Exploratory Fault Condition Checking

**Goal**: Surface counterexamples that demonstrate the bug BEFORE implementing the fix. Confirm or refute the root cause analysis. If we refute, we will need to re-hypothesize.

**Test Plan**: Write tests that simulate benchmark requests with empty DynamoDB and valid user data. Run these tests on the UNFIXED code to observe 404 failures and confirm the root cause.

**Test Cases**:
1. **Empty Database Test**: Create user with profile (tier1, kirana) and daily entry, call `/api/benchmark` with empty DynamoDB → will fail with 404 on unfixed code
2. **Fresh Deployment Test**: Simulate fresh deployment scenario with no seeded data, attempt benchmark comparison → will fail with 404 on unfixed code
3. **Multiple Segment Test**: Test with different segment combinations (tier2/salon, tier3/pharmacy) on empty database → all will fail with 404 on unfixed code
4. **Offline Mode Test**: Test with no AWS credentials configured → should gracefully return null without attempting to seed (may work correctly on unfixed code)

**Expected Counterexamples**:
- `SegmentStore.getSegmentData()` returns `null` when database is empty
- `/api/benchmark` endpoint returns 404 with "Benchmark data not available for your segment"
- Possible causes: no automatic seeding mechanism, no lazy initialization, assumption of pre-seeded data

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds, the fixed function produces the expected behavior.

**Pseudocode:**
```
FOR ALL input WHERE isBugCondition(input) DO
  result := getBenchmarkComparison_fixed(input)
  ASSERT result IS NOT NULL
  ASSERT result.healthScoreComparison IS VALID
  ASSERT result.marginComparison IS VALID
  ASSERT segmentDataExistsInDynamoDB(input.cityTier, input.businessType)
END FOR
```

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold, the fixed function produces the same result as the original function.

**Pseudocode:**
```
FOR ALL input WHERE NOT isBugCondition(input) DO
  ASSERT getBenchmarkComparison_original(input) = getBenchmarkComparison_fixed(input)
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking because:
- It generates many test cases automatically across the input domain
- It catches edge cases that manual unit tests might miss
- It provides strong guarantees that behavior is unchanged for all non-buggy inputs

**Test Plan**: Observe behavior on UNFIXED code first for existing data scenarios, then write property-based tests capturing that behavior.

**Test Cases**:
1. **Existing Data Preservation**: Pre-seed database with segment data, verify benchmark requests return same results before and after fix
2. **Cache Behavior Preservation**: Verify cache-first retrieval continues to work identically (check cache before DynamoDB)
3. **Manual Seeding Preservation**: Verify `/api/admin/seed-benchmark` endpoint continues to work identically
4. **Offline Mode Preservation**: Verify offline fallback to cached data continues to work identically
5. **Error Handling Preservation**: Verify credential errors and other exceptions are handled identically

### Unit Tests

- Test `shouldAutoSeed()` helper method returns true when database is empty, false when data exists
- Test `getSegmentData()` calls `seedDemoData()` when database is empty
- Test `getSegmentData()` does NOT call `seedDemoData()` when data already exists
- Test seeding is idempotent (multiple concurrent requests don't cause duplicate seeding)
- Test offline mode skips seeding attempt and falls back to cache

### Property-Based Tests

- Generate random segment combinations and verify auto-seeding works for all 15 combinations
- Generate random user profiles and verify benchmark comparison succeeds after auto-seeding
- Test that seeding preserves existing data (no overwrites or data loss)
- Test that cache behavior is identical before and after fix across many scenarios

### Integration Tests

- Test full flow: new user → profile setup → daily entry → benchmark request → auto-seed → successful comparison
- Test fresh deployment scenario: empty database → first benchmark request → auto-seed → all subsequent requests succeed
- Test concurrent requests: multiple users requesting different segments simultaneously → seeding occurs once
- Test manual seeding still works: call admin endpoint → verify data is seeded → verify benchmark requests work
