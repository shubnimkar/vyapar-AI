# User Data Retrieval Fix Bugfix Design

## Overview

The report generation endpoint (`/api/reports/generate`) is failing to aggregate user data correctly, resulting in zero values for totalSales, totalExpenses, and netProfit even when valid DailyEntry records exist in DynamoDB. The bug stems from incorrect field access in the aggregation logic - the code checks for `entry.type` and `entry.amount` fields that don't exist in the DailyEntry structure, which actually uses `totalSales` and `totalExpense` fields. This causes all entries to be skipped during aggregation, producing zero totals and triggering "No data for user" warnings.

## Glossary

- **Bug_Condition (C)**: The condition that triggers the bug - when DailyEntry records with non-zero totalSales/totalExpense are queried but the aggregation logic produces zero totals
- **Property (P)**: The desired behavior - aggregation should correctly sum totalSales and totalExpense from DailyEntry records
- **Preservation**: Existing DynamoDB query behavior, data storage format, and Bedrock AI integration that must remain unchanged
- **DailyEntry**: The data structure stored in DynamoDB with fields: totalSales, totalExpense, date, userId, etc.
- **Aggregation Logic**: The code in `/api/reports/generate/route.ts` that sums financial data from multiple DailyEntry records
- **Report Generation**: The endpoint that queries DynamoDB entries and generates financial reports with AI insights

## Bug Details

### Bug Condition

The bug manifests when the report generation endpoint queries DynamoDB and receives valid DailyEntry records with non-zero totalSales and totalExpense values, but the aggregation logic produces zero totals because it's checking for non-existent fields (`entry.type` and `entry.amount`).

**Formal Specification:**
```
FUNCTION isBugCondition(input)
  INPUT: input of type { entries: DailyEntry[], aggregationCode: Function }
  OUTPUT: boolean
  
  RETURN input.entries.length > 0
         AND EXISTS entry IN input.entries WHERE (entry.totalSales > 0 OR entry.totalExpense > 0)
         AND input.aggregationCode checks for 'entry.type' field
         AND input.aggregationCode checks for 'entry.amount' field
         AND NOT (DailyEntry has 'type' field)
         AND NOT (DailyEntry has 'amount' field)
END FUNCTION
```

### Examples

- **Example 1**: User has a DailyEntry with totalSales=5000, totalExpense=3000. Report shows totalSales=0, totalExpenses=0, netProfit=0 (bug)
- **Example 2**: User has multiple DailyEntry records with totalSales=[3000, 2000], totalExpense=[1500, 1000]. Report shows all zeros instead of totalSales=5000, totalExpenses=2500, netProfit=2500 (bug)
- **Example 3**: Demo user with 7 days of entries, each with non-zero values. Report generation returns "No data for user" or shows zeros (bug)
- **Edge case**: User has DailyEntry with legitimate zero values (totalSales=0, totalExpense=0). Report should correctly show zeros, not treat as error (expected behavior)

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- DynamoDB query operations using `queryByPK('USER#{userId}', 'ENTRY#')` must continue to work exactly as before
- DailyEntry storage format with PK=`USER#{userId}` and SK=`ENTRY#{date}` must remain unchanged
- Bedrock AI integration for generating insights must continue to work with the same prompt structure
- Report storage in DynamoDB with PK=`USER#{userId}` and SK=`REPORT#daily#{date}` must remain unchanged
- Demo user detection logic (checking for `demo_user_` or `demo-user-` prefix) must remain unchanged
- Date filtering for demo users (last 7 days) and regular users (today only) must remain unchanged
- Error handling for missing userId and credential errors must remain unchanged

**Scope:**
All inputs that do NOT involve the aggregation of DailyEntry financial fields should be completely unaffected by this fix. This includes:
- DynamoDB query operations and connection handling
- Bedrock AI model invocation and response parsing
- Report storage and TTL management
- Authentication and authorization checks
- Logging and error reporting

## Hypothesized Root Cause

Based on the bug description and code analysis, the root cause is:

1. **Incorrect Field Access in Aggregation**: The aggregation logic in `app/api/reports/generate/route.ts` (lines 63-73) checks for `entry.type` and `entry.amount` fields that don't exist in the DailyEntry interface
   - Current code: `if (entry.type === 'sale') { totalSales += entry.amount || 0; }`
   - DailyEntry structure has: `totalSales: number` and `totalExpense: number` (not `type` or `amount`)

2. **Type Mismatch**: The code appears to be written for a Transaction-based structure (with type='sale'|'expense' and amount fields) but is actually processing DailyEntry records (with totalSales and totalExpense fields)

3. **Silent Failure**: Because the conditional checks fail for all entries, the forEach loop processes all entries but never increments the totals, resulting in zeros without throwing an error

4. **Misleading Error Message**: The "No data for user" warning is triggered when totals are zero, but the actual problem is not missing data - it's incorrect field access during aggregation

## Correctness Properties

Property 1: Bug Condition - DailyEntry Aggregation Returns Correct Totals

_For any_ set of DailyEntry records where at least one entry has non-zero totalSales or totalExpense, the fixed report generation endpoint SHALL correctly aggregate the totalSales and totalExpense fields from all entries, producing accurate totals and netProfit calculations.

**Validates: Requirements 2.1, 2.2, 2.3, 2.4**

Property 2: Preservation - Non-Aggregation Behavior Unchanged

_For any_ operation that does NOT involve aggregating DailyEntry financial fields (DynamoDB queries, Bedrock AI calls, report storage, authentication, error handling), the fixed code SHALL produce exactly the same behavior as the original code, preserving all existing functionality.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6**

## Fix Implementation

### Changes Required

Assuming our root cause analysis is correct:

**File**: `app/api/reports/generate/route.ts`

**Function**: `POST` (report generation handler)

**Specific Changes**:
1. **Replace Aggregation Logic** (lines 63-73): Remove the conditional checks for `entry.type` and `entry.amount`
   - Remove: `if (entry.type === 'sale') { totalSales += entry.amount || 0; }`
   - Remove: `else if (entry.type === 'expense') { totalExpenses += entry.amount || 0; }`
   - Add: `totalSales += entry.totalSales || 0;`
   - Add: `totalExpenses += entry.totalExpense || 0;`

2. **Update Type Casting**: Ensure filteredEntries is properly typed as `DailyEntry[]`
   - The existing cast `as DailyEntry[]` should be sufficient
   - Verify TypeScript recognizes the correct interface

3. **Verify Field Names**: Ensure consistency with DailyEntry interface
   - DailyEntry uses `totalExpense` (singular, not `totalExpenses`)
   - Variable name `totalExpenses` in aggregation is fine (it's the sum)

4. **No Changes to Query Logic**: The DynamoDB query using `queryByPK('USER#{userId}', 'ENTRY#')` is correct and should not be modified

5. **No Changes to Storage Logic**: The DailyEntry storage format and PK/SK generation is correct and should not be modified

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that demonstrate the bug on unfixed code, then verify the fix works correctly and preserves existing behavior.

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples that demonstrate the bug BEFORE implementing the fix. Confirm that the aggregation logic produces zeros when it should produce non-zero totals.

**Test Plan**: Write tests that create DailyEntry records with non-zero totalSales and totalExpense, call the report generation endpoint, and assert that the returned totals are correct. Run these tests on the UNFIXED code to observe failures (zeros returned instead of actual values).

**Test Cases**:
1. **Single Entry Test**: Create one DailyEntry with totalSales=5000, totalExpense=3000 (will fail on unfixed code - returns zeros)
2. **Multiple Entries Test**: Create multiple DailyEntry records for same date with different values (will fail on unfixed code - returns zeros)
3. **Property-Based Test**: Generate random DailyEntry values and verify aggregation (will fail on unfixed code - returns zeros)
4. **Zero Values Test**: Create DailyEntry with legitimate zero values (may pass on unfixed code - zeros are correct)

**Expected Counterexamples**:
- Report returns totalSales=0, totalExpenses=0, netProfit=0 when DailyEntry has non-zero values
- Possible causes: incorrect field access (`entry.type`, `entry.amount`), type mismatch, silent conditional failure

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds, the fixed function produces the expected behavior.

**Pseudocode:**
```
FOR ALL entries WHERE isBugCondition(entries, aggregationCode) DO
  result := generateReport_fixed(entries)
  ASSERT result.totalSales = SUM(entry.totalSales FOR entry IN entries)
  ASSERT result.totalExpenses = SUM(entry.totalExpense FOR entry IN entries)
  ASSERT result.netProfit = result.totalSales - result.totalExpenses
END FOR
```

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold, the fixed function produces the same result as the original function.

**Pseudocode:**
```
FOR ALL operation WHERE NOT isAggregationOperation(operation) DO
  ASSERT generateReport_original(operation) = generateReport_fixed(operation)
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking because:
- It generates many test cases automatically across the input domain
- It catches edge cases that manual unit tests might miss
- It provides strong guarantees that behavior is unchanged for all non-aggregation operations

**Test Plan**: Observe behavior on UNFIXED code first for DynamoDB queries, Bedrock calls, and report storage, then write property-based tests capturing that behavior.

**Test Cases**:
1. **DynamoDB Query Preservation**: Verify that queryByPK is called with same parameters and returns same results
2. **Bedrock Integration Preservation**: Verify that AI model invocation and response parsing continue to work
3. **Report Storage Preservation**: Verify that report records are stored in DynamoDB with same PK/SK format
4. **Error Handling Preservation**: Verify that missing userId and credential errors are handled the same way
5. **Demo User Logic Preservation**: Verify that demo user detection and 7-day filtering continue to work
6. **Date Filtering Preservation**: Verify that regular users get today's entries and demo users get last 7 days

### Unit Tests

- Test aggregation logic with single DailyEntry record
- Test aggregation logic with multiple DailyEntry records
- Test edge cases (zero values, negative values, very large values)
- Test that DynamoDB query is called with correct parameters
- Test that Bedrock AI is invoked with correct prompt structure

### Property-Based Tests

- Generate random DailyEntry values and verify correct aggregation across many scenarios
- Generate random userId values and verify DynamoDB queries use correct PK format
- Test that all non-aggregation operations produce identical results before and after fix

### Integration Tests

- Test full report generation flow with real DynamoDB mock data
- Test demo user flow with 7 days of entries
- Test regular user flow with today's entries
- Test error cases (no entries, missing userId, Bedrock failures)
