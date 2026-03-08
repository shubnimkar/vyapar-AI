# Requirements Document

## Introduction

This feature integrates four fully-implemented AWS Hackathon features into the Vyapar AI dashboard UI. All backend Lambda functions, API routes, and React components are complete and functional, but they are not currently accessible to users. This integration will make these high-value features visible and usable for the hackathon demo.

The four features to integrate are:
1. Voice-to-Entry: Voice recording with transcription and NLP extraction
2. Cash Flow Predictor: 7-day cash flow prediction using historical data
3. Automated Reports: Daily automated report generation and viewing
4. Smart Expense Alerts: Real-time expense anomaly detection

## Glossary

- **Dashboard**: The main application page (`app/page.tsx`) where users interact with Vyapar AI
- **VoiceRecorder**: Component that records audio, uploads to S3, and extracts transaction data via Lambda
- **CashFlowPredictor**: Component that displays 7-day cash flow predictions with confidence scores
- **ReportViewer**: Component that displays automated daily reports with insights
- **ExpenseAlertBanner**: Component that shows expense anomaly alerts with severity levels
- **Lambda_Function**: AWS Lambda function that processes data asynchronously
- **API_Route**: Next.js API endpoint that handles HTTP requests
- **Section**: A navigable area in the dashboard (dashboard, entries, credit, pending, analysis, chat, account)
- **Offline_Queue**: LocalStorage-based queue for operations when network is unavailable
- **Toast**: Temporary notification message shown to users
- **Session_Manager**: Service that manages user authentication state
- **Hybrid_Sync**: System that syncs data between localStorage and DynamoDB

## Requirements

### Requirement 1: Voice-to-Entry Integration

**User Story:** As a shop owner, I want to record voice entries for my daily transactions, so that I can quickly add data without typing.

#### Acceptance Criteria

1. WHEN the user navigates to the "entries" section, THE Dashboard SHALL render the VoiceRecorder component
2. WHEN the user clicks the record button, THE VoiceRecorder SHALL request microphone permission
3. WHEN microphone permission is granted, THE VoiceRecorder SHALL start recording audio with waveform visualization
4. WHEN the user stops recording, THE VoiceRecorder SHALL save the audio blob locally
5. WHEN the user clicks upload, THE VoiceRecorder SHALL upload audio to S3 via `/api/voice-entry` endpoint
6. IF the network is offline, THEN THE VoiceRecorder SHALL queue the upload in localStorage
7. WHEN the voice processing completes, THE VoiceRecorder SHALL call the `onDataExtracted` callback with extracted data
8. WHEN voice data is extracted, THE Dashboard SHALL populate the DailyEntryForm with the extracted values
9. THE Dashboard SHALL refresh health score, indices, and benchmark data after voice entry is added
10. WHEN the page becomes online after being offline, THE VoiceRecorder SHALL process queued uploads automatically

### Requirement 2: Cash Flow Predictor Integration

**User Story:** As a shop owner, I want to see predicted cash flow for the next 7 days, so that I can plan for potential shortfalls.

#### Acceptance Criteria

1. WHEN the user navigates to the "dashboard" section, THE Dashboard SHALL render the CashFlowPredictor component
2. THE CashFlowPredictor SHALL be positioned below the health score and benchmark displays
3. WHEN the user clicks "Predict Next 7 Days", THE CashFlowPredictor SHALL call `/api/predict-cashflow` endpoint
4. IF the user has less than 7 days of data, THEN THE CashFlowPredictor SHALL display an "insufficient data" message
5. WHEN predictions are received, THE CashFlowPredictor SHALL display 7 daily predictions with date, balance, trend, and confidence
6. IF any predicted balance is negative, THEN THE CashFlowPredictor SHALL display a warning banner
7. THE CashFlowPredictor SHALL show trend indicators (up, down, stable) for each day
8. THE CashFlowPredictor SHALL format currency amounts using Indian locale (₹)
9. WHEN the user clicks refresh, THE CashFlowPredictor SHALL fetch new predictions
10. THE CashFlowPredictor SHALL handle loading and error states appropriately

### Requirement 3: Automated Reports Integration

**User Story:** As a shop owner, I want to view my automated daily reports, so that I can review my business performance over time.

#### Acceptance Criteria

1. THE Dashboard SHALL add a new "Reports" section to the navigation sidebar
2. WHEN the user clicks the "Reports" navigation item, THE Dashboard SHALL display the ReportViewer component
3. THE ReportViewer SHALL fetch reports from `/api/reports` endpoint on mount
4. THE ReportViewer SHALL display a list of all generated reports sorted by date (newest first)
5. WHEN the user clicks on a report, THE ReportViewer SHALL display full report details including sales, expenses, profit, top categories, and insights
6. THE ReportViewer SHALL show an automation toggle switch
7. WHEN the user toggles automation, THE ReportViewer SHALL call `/api/reports` POST endpoint to update settings
8. IF no reports exist, THEN THE ReportViewer SHALL display a "no reports yet" message
9. THE ReportViewer SHALL format currency amounts using Indian locale (₹)
10. THE ReportViewer SHALL provide a "Back to List" button when viewing a single report

### Requirement 4: Smart Expense Alerts Integration

**User Story:** As a shop owner, I want to see alerts when my expenses are unusually high, so that I can investigate potential issues.

#### Acceptance Criteria

1. THE Dashboard SHALL import and render the ExpenseAlertBanner component in the "dashboard" section
2. THE ExpenseAlertBanner SHALL be positioned at the top of the dashboard, below the header
3. WHEN a daily entry with expenses is submitted, THE Dashboard SHALL call `/api/expense-alert` endpoint
4. THE Dashboard SHALL pass userId, expense amount, category, and date to the alert endpoint
5. IF an alert is returned, THEN THE Dashboard SHALL display the ExpenseAlertBanner with alert details
6. THE ExpenseAlertBanner SHALL show severity level (warning or critical) with appropriate styling
7. THE ExpenseAlertBanner SHALL display the alert explanation in the user's selected language
8. THE ExpenseAlertBanner SHALL show expense amount and category
9. WHEN the user clicks dismiss, THE ExpenseAlertBanner SHALL hide and clear the alert state
10. THE ExpenseAlertBanner SHALL use yellow styling for warnings and red styling for critical alerts

### Requirement 5: Navigation Enhancement

**User Story:** As a shop owner, I want to easily navigate to all available features, so that I can access the tools I need.

#### Acceptance Criteria

1. THE Dashboard SHALL add a "Reports" navigation item to the sidebar
2. THE Reports navigation item SHALL use an appropriate icon (e.g., FileText or Document)
3. THE Dashboard SHALL maintain the existing navigation structure (dashboard, entries, credit, pending, analysis, chat, account)
4. WHEN the user clicks a navigation item, THE Dashboard SHALL update the activeSection state
5. THE Dashboard SHALL highlight the active navigation item with blue background and border
6. THE Dashboard SHALL show the Reports section when activeSection is "reports"
7. THE Dashboard SHALL maintain responsive design for mobile and desktop views
8. THE Dashboard SHALL preserve navigation state during component re-renders
9. THE Dashboard SHALL support keyboard navigation for accessibility
10. THE Dashboard SHALL show navigation labels in the user's selected language (English, Hindi, Marathi)

### Requirement 6: State Management and Data Flow

**User Story:** As a developer, I want proper state management for the new features, so that data flows correctly and the UI stays in sync.

#### Acceptance Criteria

1. THE Dashboard SHALL add state for expense alerts using useState hook
2. THE Dashboard SHALL add state for voice data extraction callback
3. WHEN voice data is extracted, THE Dashboard SHALL populate DailyEntryForm fields
4. WHEN an expense alert is received, THE Dashboard SHALL update the alert state
5. WHEN the user dismisses an alert, THE Dashboard SHALL clear the alert state
6. WHEN a daily entry is submitted, THE Dashboard SHALL check for expense alerts
7. THE Dashboard SHALL refresh health score after voice entry is added
8. THE Dashboard SHALL refresh indices after voice entry is added
9. THE Dashboard SHALL refresh benchmark data after voice entry is added
10. THE Dashboard SHALL maintain existing data refresh logic for other features

### Requirement 7: Error Handling and Offline Support

**User Story:** As a shop owner, I want the new features to work reliably even with poor network connectivity, so that I can use the app anywhere.

#### Acceptance Criteria

1. WHEN voice upload fails due to network error, THE VoiceRecorder SHALL queue the upload in localStorage
2. WHEN the network becomes available, THE VoiceRecorder SHALL automatically process queued uploads
3. THE VoiceRecorder SHALL display the number of queued uploads to the user
4. WHEN cash flow prediction fails, THE CashFlowPredictor SHALL display an error message
5. WHEN report fetching fails, THE ReportViewer SHALL display an error message
6. WHEN expense alert API fails, THE Dashboard SHALL log the error but not block entry submission
7. THE Dashboard SHALL use the logger utility for all error logging
8. THE Dashboard SHALL not expose stack traces or sensitive information to users
9. THE Dashboard SHALL follow the error format from error-utils.ts
10. THE Dashboard SHALL maintain offline-first principles from vyapar-rules.md

### Requirement 8: Localization Support

**User Story:** As a shop owner, I want all new features to support my preferred language, so that I can use the app comfortably.

#### Acceptance Criteria

1. THE VoiceRecorder SHALL display all UI text in the user's selected language (English, Hindi, Marathi)
2. THE CashFlowPredictor SHALL display all UI text in the user's selected language
3. THE ReportViewer SHALL display all UI text in the user's selected language
4. THE ExpenseAlertBanner SHALL display alert explanations in the user's selected language
5. THE Dashboard SHALL pass the language prop to all new components
6. WHEN the user changes language, THE Dashboard SHALL re-render all components with new translations
7. THE Dashboard SHALL add translation keys for "Reports" navigation label
8. THE Dashboard SHALL maintain existing translation structure in translations.ts
9. THE Dashboard SHALL format dates using Indian locale
10. THE Dashboard SHALL format currency using Indian locale (₹)

### Requirement 9: Mobile Responsiveness

**User Story:** As a shop owner using a mobile device, I want all new features to work well on my phone, so that I can manage my business on the go.

#### Acceptance Criteria

1. THE VoiceRecorder SHALL be fully functional on mobile devices with touch support
2. THE CashFlowPredictor SHALL display predictions in a mobile-friendly layout
3. THE ReportViewer SHALL adapt to small screens with responsive grid layouts
4. THE ExpenseAlertBanner SHALL be readable and dismissible on mobile devices
5. THE Dashboard navigation SHALL remain accessible on mobile with horizontal scrolling
6. THE Dashboard SHALL maintain existing responsive breakpoints (sm, md, lg, xl)
7. THE Dashboard SHALL use Tailwind responsive classes for all new components
8. THE Dashboard SHALL ensure touch targets are at least 44x44 pixels
9. THE Dashboard SHALL test all features on viewport widths from 320px to 1920px
10. THE Dashboard SHALL maintain existing mobile-first design principles

### Requirement 10: Testing and Demo Readiness

**User Story:** As a developer preparing for the hackathon demo, I want to ensure all features work end-to-end, so that the demo is successful.

#### Acceptance Criteria

1. THE Dashboard SHALL successfully render all four new components without errors
2. WHEN a user records voice, THE system SHALL process it end-to-end and populate the form
3. WHEN a user requests cash flow prediction, THE system SHALL return predictions within 5 seconds
4. WHEN a user views reports, THE system SHALL display all generated reports
5. WHEN a user submits an expense, THE system SHALL check for alerts and display them if applicable
6. THE Dashboard SHALL maintain all existing functionality (health score, credit tracking, etc.)
7. THE Dashboard SHALL not introduce any console errors or warnings
8. THE Dashboard SHALL pass all existing tests without regression
9. THE Dashboard SHALL follow all rules from vyapar-rules.md (deterministic-first, no business logic in components)
10. THE Dashboard SHALL be ready for a full demo rehearsal covering all four features
