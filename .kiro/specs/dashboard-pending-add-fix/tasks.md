# Implementation Plan

- [x] 1. Write bug condition exploration test
  - **Property 1: Fault Condition** - Dashboard Pending Add Does Nothing
  - **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior - it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate the bug exists
  - **Scoped PBT Approach**: Scope the property to concrete failing case: clicking "Add" from dashboard pending section with missing onAdd callback
  - Test that clicking "Add" on a pending transaction from dashboard's pending section adds the transaction to daily entries (from Fault Condition in design)
  - Test that success toast notification is shown with transaction details
  - Test that dashboard totals and health score are refreshed after add
  - Run test on UNFIXED code
  - **EXPECTED OUTCOME**: Test FAILS (this is correct - it proves the bug exists)
  - Document counterexamples found: transaction disappears but not added to daily entries, no toast shown, no refresh
  - Mark task complete when test is written, run, and failure is documented
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [x] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Non-Dashboard Pending Actions Unchanged
  - **IMPORTANT**: Follow observation-first methodology
  - Observe behavior on UNFIXED code for non-buggy inputs:
    - `/pending-transactions` page "Add" action works correctly
    - Dashboard "Later" action keeps transaction in pending list
    - Dashboard "Discard" action removes transaction without adding
    - Other dashboard sections (entries, credit, analysis, chat, account) work unchanged
  - Write property-based tests capturing observed behavior patterns from Preservation Requirements
  - Property-based testing generates many test cases for stronger guarantees
  - Run tests on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS (this confirms baseline behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

- [x] 3. Fix for dashboard pending add data loss

  - [x] 3.1 Implement the fix in app/page.tsx
    - Add toast state: `const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);`
    - Import Toast and ToastType from `@/components/Toast`
    - Import addTransactionToDailyEntry from `@/lib/add-transaction-to-entry`
    - Import logger from `@/lib/logger`
    - Create handleAddTransaction function following the pattern from `/pending-transactions/page.tsx`:
      - Check if user exists, show error toast if not
      - Call `addTransactionToDailyEntry(transaction, user.userId)`
      - On success: log result, show success toast with transaction details in current language
      - On error: log error, show error toast in current language
      - After success: call `refreshHealthScore()`, `recalculateIndices()`, `fetchBenchmarkData()` to refresh dashboard
    - Pass onAdd callback to PendingTransactionConfirmation: `<PendingTransactionConfirmation language={language} onAdd={handleAddTransaction} />`
    - Add Toast component to render: `{toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}`
    - _Bug_Condition: isBugCondition(input) where input.action === 'Add' AND input.location === 'dashboard-pending-section' AND input.hasOnAddCallback === false_
    - _Expected_Behavior: Transaction is added to daily entries, success toast shown, dashboard refreshed (from design)_
    - _Preservation: All non-dashboard pending add actions continue to work unchanged (from design)_
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

  - [x] 3.2 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - Dashboard Pending Add Works Correctly
    - **IMPORTANT**: Re-run the SAME test from task 1 - do NOT write a new test
    - The test from task 1 encodes the expected behavior
    - When this test passes, it confirms the expected behavior is satisfied
    - Run bug condition exploration test from step 1
    - **EXPECTED OUTCOME**: Test PASSES (confirms bug is fixed)
    - Verify transaction is added to daily entries
    - Verify success toast is shown
    - Verify dashboard is refreshed
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

  - [x] 3.3 Verify preservation tests still pass
    - **Property 2: Preservation** - Non-Dashboard Pending Actions Still Work
    - **IMPORTANT**: Re-run the SAME tests from task 2 - do NOT write new tests
    - Run preservation property tests from step 2
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)
    - Confirm `/pending-transactions` page still works correctly
    - Confirm "Later" and "Discard" actions still work from dashboard
    - Confirm all other dashboard sections still work unchanged

- [x] 4. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
