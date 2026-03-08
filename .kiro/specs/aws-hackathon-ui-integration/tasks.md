# Implementation Plan: AWS Hackathon UI Integration

## Overview

This plan integrates four fully-implemented AWS Hackathon features into the Vyapar AI dashboard. All Lambda functions, API routes, and React components already exist. This is purely a UI integration task focusing on importing components, managing state, and wiring data flows.

## Tasks

- [x] 1. Add navigation and translations for Reports section
  - Update `AppSection` type in `app/page.tsx` to include 'reports'
  - Add "Reports" navigation item to sidebar with icon and label
  - Add translation keys for "Reports" in `lib/translations.ts` (en, hi, mr)
  - _Requirements: 5.1, 5.2, 5.3, 8.7_

- [x] 2. Import and integrate ExpenseAlertBanner component
  - [x] 2.1 Add state management for expense alerts
    - Import ExpenseAlertBanner component in `app/page.tsx`
    - Add state: `const [expenseAlert, setExpenseAlert] = useState<ExpenseAlert | null>(null)`
    - Define ExpenseAlert type interface
    - _Requirements: 6.1, 6.2_
  
  - [x] 2.2 Render ExpenseAlertBanner in dashboard section
    - Position banner at top of dashboard section (before health score)
    - Pass alert state, dismiss handler, and language props
    - Render only when `activeSection === 'dashboard'` and `expenseAlert !== null`
    - _Requirements: 4.1, 4.2, 4.5_
  
  - [x] 2.3 Add expense alert check to daily entry submission
    - Modify `handleDailyEntrySubmitted` to check if `totalExpense > 0`
    - Call `/api/expense-alert` POST endpoint with userId, expense, category, date
    - Update alert state if alert is returned
    - Use try-catch to prevent blocking entry submission on error
    - Log errors using logger utility without exposing to user
    - _Requirements: 4.3, 4.4, 6.4, 6.6, 7.6, 7.7_

- [x] 2.4 Write unit tests for expense alert integration
  - Test alert API is called with correct parameters when expense > 0
  - Test alert state is updated when API returns alert
  - Test dismiss handler clears alert state
  - Test entry submission completes even if alert API fails
  - Test logger is used for error logging
  - _Requirements: 4.3, 4.4, 6.4, 6.5, 7.6_

- [x] 2.5 Write property test for expense alert integration
  - **Property 3: Expense Alert API Invocation**
  - **Property 4: Alert State Management**
  - **Validates: Requirements 4.3, 4.4, 6.4, 6.5, 6.6**

- [x] 3. Import and integrate VoiceRecorder component
  - [x] 3.1 Add VoiceRecorder to entries section
    - Import VoiceRecorder component in `app/page.tsx`
    - Render in entries section when `activeSection === 'entries'` and user is logged in
    - Position at top of entries section (before DailyEntryForm)
    - Pass language prop
    - _Requirements: 1.1, 8.1_
  
  - [x] 3.2 Implement voice data extraction handler
    - Create `handleVoiceDataExtracted` callback function
    - Accept ExtractedVoiceData parameter with optional sales, expense, category, notes, and required confidence
    - Store extracted data in state or pass to DailyEntryForm
    - Pass callback to VoiceRecorder as `onDataExtracted` prop
    - _Requirements: 1.7, 1.8, 6.3_
  
  - [x] 3.3 Connect voice data to DailyEntryForm
    - Populate DailyEntryForm fields with extracted voice data
    - Trigger health score, indices, and benchmark refresh after voice entry submission
    - Maintain existing refresh logic
    - _Requirements: 1.8, 1.9, 6.7, 6.8, 6.9_

- [x] 3.4 Write unit tests for voice integration
  - Test VoiceRecorder renders in entries section
  - Test handleVoiceDataExtracted populates form with correct data
  - Test refresh functions are called after voice entry submission
  - Test language prop is passed correctly
  - _Requirements: 1.1, 1.7, 1.8, 6.3_

- [x] 3.5 Write property test for voice data integration
  - **Property 1: Voice Data Callback Invocation**
  - **Property 2: Form Population from Voice Data**
  - **Validates: Requirements 1.7, 1.8, 6.3**

- [x] 4. Import and integrate CashFlowPredictor component
  - Import CashFlowPredictor component in `app/page.tsx`
  - Render in dashboard section when `activeSection === 'dashboard'` and user is logged in
  - Position below BenchmarkDisplay component
  - Pass userId and language props
  - _Requirements: 2.1, 2.2, 8.2_

- [x] 4.1 Write unit tests for cash flow predictor integration
  - Test CashFlowPredictor renders in dashboard section
  - Test component is positioned after BenchmarkDisplay
  - Test userId and language props are passed correctly
  - _Requirements: 2.1, 2.2_

- [x] 5. Import and integrate ReportViewer component
  - Import ReportViewer component in `app/page.tsx`
  - Render in reports section when `activeSection === 'reports'` and user is logged in
  - Pass userId and language props
  - _Requirements: 3.1, 3.2, 8.3_

- [x] 5.1 Write unit tests for report viewer integration
  - Test ReportViewer renders in reports section
  - Test navigation to reports section works
  - Test userId and language props are passed correctly
  - _Requirements: 3.1, 3.2_

- [x] 6. Checkpoint - Verify all components render without errors
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Add comprehensive integration tests
  - [x] 7.1 Write integration test for voice-to-entry flow
    - Test voice recording → extraction → form population → submission → refresh
    - _Requirements: 10.2_
  
  - [x] 7.2 Write integration test for expense alert flow
    - Test entry submission → alert check → alert display → dismiss
    - _Requirements: 10.5_
  
  - [x] 7.3 Write integration test for navigation structure
    - Test all navigation items are present including "reports"
    - Test navigation state updates correctly
    - _Requirements: 5.3, 5.4_
  
  - [x] 7.4 Write property test for language prop propagation
    - **Property 6: Language Prop Propagation**
    - **Validates: Requirements 8.5, 5.10**
  
  - [x] 7.5 Write property test for navigation preservation
    - **Property 5: Navigation Structure Preservation**
    - **Validates: Requirements 5.3**
  
  - [x] 7.6 Write property test for error handling
    - **Property 7: Error Handling Without Blocking**
    - **Property 8: Error Message Sanitization**
    - **Validates: Requirements 7.6, 7.8**
  
  - [x] 7.7 Write property test for component rendering
    - **Property 9: Component Rendering Without Errors**
    - **Validates: Requirements 10.1**

- [x] 8. Final checkpoint and demo readiness verification
  - Run all tests to ensure no regressions
  - Verify no console errors or warnings
  - Test all features in English, Hindi, Marathi
  - Test mobile responsiveness (320px to 1920px viewports)
  - Verify offline scenarios work correctly
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- All components are already implemented and tested individually
- This integration focuses on wiring components into the dashboard
- No backend changes required - all Lambda functions and APIs are functional
- Follow vyapar-rules.md: deterministic-first, no business logic in UI components
- Use logger utility for all error logging
- Maintain offline-first principles throughout
