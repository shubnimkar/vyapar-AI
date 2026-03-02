# Implementation Plan: AWS Hackathon Features

## Overview

This implementation plan breaks down the four AWS-powered features into discrete, incremental coding tasks. The approach prioritizes getting each feature working end-to-end before moving to the next, with Lambda functions and infrastructure setup integrated into the development flow. Each feature includes property-based tests to validate correctness properties from the design document.

The implementation order is optimized for hackathon demo impact: Voice-to-Entry (high wow factor), Smart Expense Alerts (real-time AI), Predictive Cash Flow (AI depth), and Automated Reports (automation showcase).

## Tasks

### 1. Project Setup and Shared Infrastructure

- [x] 1.1 Set up AWS SDK configuration and shared utilities
  - Create `lib/aws-config.ts` with AWS SDK v3 client initialization
  - Add environment variables for AWS credentials and region
  - Create shared error handling utilities for Lambda responses
  - Create shared logging utilities for CloudWatch
  - _Requirements: 10.2, 10.3, 10.4_

- [x] 1.2 Create Supabase schema extensions
  - Run SQL migration to create `voice_uploads` table
  - Run SQL migration to create `reports` table
  - Run SQL migration to create or extend `user_preferences` table
  - Add indexes for performance
  - _Requirements: Data Models section_

- [ ] 1.3 Set up S3 buckets with lifecycle policies
  - Create `vyapar-voice` bucket with 1-day lifecycle policy
  - Configure `vyapar-receipts` bucket with 7-day lifecycle policy (if not exists)
  - Set buckets to private access
  - Enable server-side encryption
  - _Requirements: 3.1, 3.2, 3.4, 14.1, 14.2, 14.4, 14.5_

- [x] 1.4 Create shared TypeScript types
  - Add types to `lib/types.ts`: `VoiceUpload`, `ExtractedVoiceData`, `DailyPrediction`, `DailyReport`, `ExpenseAlert`, `UserPreferences`
  - Add error response types
  - Add API request/response types
  - _Requirements: Data Models section_

### 2. Voice-to-Entry Feature

- [x] 2.1 Create VoiceRecorder component UI
  - Create `components/VoiceRecorder.tsx` with record button, waveform visualization, status display
  - Implement MediaRecorder API integration for audio capture
  - Add recording duration timer
  - Add visual feedback for recording state
  - _Requirements: 1.1, 1.2_

- [ ]* 2.2 Write property test for recording lifecycle
  - **Property 1: Recording lifecycle completeness**
  - **Validates: Requirements 1.1, 1.3**

- [ ] 2.3 Implement audio file creation and format handling
  - Add logic to stop recording and create Blob in MP3/WAV/M4A format
  - Validate audio format before upload
  - Handle recording errors with localized messages
  - _Requirements: 1.3, 1.7_

- [ ]* 2.4 Write property test for error message localization
  - **Property 5: Error message localization**
  - **Validates: Requirements 1.7**

- [ ] 2.5 Implement offline queue management
  - Create `lib/voice-upload-queue.ts` for managing upload queue in localStorage
  - Add logic to queue files when offline
  - Add online/offline detection using navigator.onLine
  - Implement queue status display in UI
  - _Requirements: 1.6, 12.1, 12.2, 12.4_

- [ ]* 2.6 Write property test for offline queue and retry
  - **Property 4: Offline queue and retry**
  - **Validates: Requirements 1.6, 12.1, 12.2, 12.3**

- [x] 2.7 Create /api/voice-entry API route
  - Create `app/api/voice-entry/route.ts` with POST handler
  - Add request validation (file type, size, authentication)
  - Generate pre-signed S3 URL for upload
  - Upload audio file to S3 vyapar-voice bucket
  - Return upload confirmation
  - _Requirements: 1.4, 3.3, 11.1, 11.2, 11.6, 11.7_

- [ ]* 2.8 Write property test for S3 upload with correct bucket
  - **Property 3: S3 upload with correct bucket**
  - **Validates: Requirements 1.4**

- [ ]* 2.9 Write property test for pre-signed URL generation
  - **Property 9: Pre-signed URL generation**
  - **Validates: Requirements 3.3**

- [ ] 2.10 Create voice-processor Lambda function
  - Create `lambda/voice-processor/index.mjs` with S3 trigger handler
  - Implement Transcribe job creation with language code 'hi-IN'
  - Implement polling logic to wait for transcription completion
  - Add error handling and CloudWatch logging
  - Set timeout to 60s and memory to 512MB
  - _Requirements: 2.1, 2.2, 2.7, 10.1, 10.2, 10.3, 10.4_

- [ ] 2.11 Implement Bedrock NLP data extraction in Lambda
  - Add Bedrock client initialization
  - Create prompt for extracting sales, expenses, category, inventory, date
  - Parse Bedrock response into structured JSON
  - Return extracted data with confidence score
  - _Requirements: 2.3, 2.4_

- [ ]* 2.12 Write property test for voice processing pipeline
  - **Property 6: Voice processing pipeline**
  - **Validates: Requirements 2.2, 2.3, 2.4**

- [ ]* 2.13 Write property test for transcription error handling
  - **Property 7: Transcription error handling**
  - **Validates: Requirements 2.5**

- [ ] 2.14 Deploy voice-processor Lambda and configure S3 trigger
  - Deploy Lambda function to AWS
  - Configure S3 bucket trigger on vyapar-voice for object creation
  - Set environment variables (BEDROCK_MODEL_ID, SUPABASE_URL, SUPABASE_KEY)
  - Test trigger with sample audio file
  - _Requirements: 1.5, 2.1, 14.3_

- [ ] 2.15 Implement form auto-fill from extracted data
  - Update VoiceRecorder component to poll for Lambda results
  - Add callback to populate DailyEntryForm fields
  - Handle partial data extraction (some fields null)
  - Show success notification when form is filled
  - _Requirements: 2.6_

- [ ]* 2.16 Write property test for form auto-fill
  - **Property 8: Form auto-fill from extracted data**
  - **Validates: Requirements 2.6**

- [ ] 2.17 Implement upload queue completion handling
  - Add logic to clear queue when all uploads complete
  - Show notification when queue is empty
  - Update queue status display
  - _Requirements: 12.5_

- [ ]* 2.18 Write property test for queue completion notification
  - **Property 11: Queue completion notification**
  - **Validates: Requirements 12.5**

- [ ] 2.19 Checkpoint - Test voice-to-entry end-to-end
  - Ensure all tests pass, ask the user if questions arise.

### 3. Smart Expense Alerts Feature

- [ ] 3.1 Create expense-alert Lambda function
  - Create `lambda/expense-alert/index.mjs` with handler
  - Implement Supabase query for historical expenses by category
  - Add error handling and CloudWatch logging
  - Set timeout to 20s and memory to 256MB
  - _Requirements: 8.2, 8.8, 10.2, 10.3, 10.4_

- [ ]* 3.2 Write property test for historical expense query
  - **Property 28: Historical expense query by category**
  - **Validates: Requirements 8.2, 8.3**

- [ ] 3.3 Implement Bedrock anomaly detection in Lambda
  - Create prompt for anomaly detection (high amount, unusual category, unusual timing)
  - Call Bedrock with expense and historical data
  - Parse response for anomaly flag, type, explanation, severity
  - Return alert object if anomaly detected
  - _Requirements: 8.3, 8.4, 8.5_

- [ ]* 3.4 Write property test for alert response format
  - **Property 29: Alert response format**
  - **Validates: Requirements 8.5**

- [ ] 3.5 Deploy expense-alert Lambda function
  - Deploy Lambda to AWS
  - Set environment variables (BEDROCK_MODEL_ID, SUPABASE_URL, SUPABASE_KEY)
  - Test with sample expense data
  - _Requirements: 8.8_

- [ ] 3.6 Create /api/expense-alert API route
  - Create `app/api/expense-alert/route.ts` with POST handler
  - Add request validation and authentication
  - Invoke expense-alert Lambda with AWS SDK
  - Forward Lambda response to client
  - Handle Lambda errors
  - _Requirements: 8.1, 11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 11.7_

- [ ]* 3.7 Write property test for Lambda invocation on expense submission
  - **Property 27: Lambda invocation on expense submission**
  - **Validates: Requirements 8.1**

- [ ] 3.8 Create ExpenseAlertBanner component
  - Create `components/ExpenseAlertBanner.tsx` with alert display
  - Add dismiss button
  - Style with warning colors based on severity
  - Position at top of daily entry form
  - _Requirements: 8.6, 8.7, 9.2, 9.3_

- [ ]* 3.9 Write property test for alert banner display
  - **Property 30: Alert banner display with content**
  - **Validates: Requirements 8.6, 8.7**

- [ ] 3.10 Integrate alert system with DailyEntryForm
  - Update DailyEntryForm to call /api/expense-alert on expense submission
  - Display ExpenseAlertBanner when alert is received
  - Implement dismiss functionality
  - Ensure alert persists until dismissed
  - _Requirements: 8.1, 9.4, 9.5_

- [ ]* 3.11 Write property test for alert lifecycle management
  - **Property 31: Alert lifecycle management**
  - **Validates: Requirements 9.2, 9.4, 9.5**

- [ ] 3.12 Checkpoint - Test expense alerts end-to-end
  - Ensure all tests pass, ask the user if questions arise.

### 4. Predictive Cash Flow Feature

- [ ] 4.1 Create cashflow-predictor Lambda function
  - Create `lambda/cashflow-predictor/index.mjs` with handler
  - Implement Supabase query for last 30 days of daily entries
  - Add check for insufficient data (< 7 days)
  - Add error handling and CloudWatch logging
  - Set timeout to 30s and memory to 256MB
  - _Requirements: 4.1, 4.6, 4.7, 10.2, 10.3, 10.4_

- [ ]* 4.2 Write property test for historical data query range
  - **Property 12: Historical data query range**
  - **Validates: Requirements 4.1**

- [ ] 4.3 Implement Bedrock prediction generation in Lambda
  - Create prompt for 7-day cash flow prediction
  - Call Bedrock with historical data
  - Parse response into array of 7 predictions with date, predictedBalance, trend, confidence
  - Flag predictions with negative balance
  - Return predictions array
  - _Requirements: 4.2, 4.3, 4.4, 4.5_

- [ ]* 4.4 Write property test for prediction generation completeness
  - **Property 13: Prediction generation completeness**
  - **Validates: Requirements 4.2, 4.3, 4.5**

- [ ]* 4.5 Write property test for negative balance alert flagging
  - **Property 14: Negative balance alert flagging**
  - **Validates: Requirements 4.4**

- [ ] 4.6 Deploy cashflow-predictor Lambda function
  - Deploy Lambda to AWS
  - Set environment variables (BEDROCK_MODEL_ID, SUPABASE_URL, SUPABASE_KEY)
  - Test with sample historical data
  - _Requirements: 4.6_

- [ ] 4.7 Create /api/predict-cashflow API route
  - Create `app/api/predict-cashflow/route.ts` with POST handler
  - Add authentication validation
  - Invoke cashflow-predictor Lambda with AWS SDK
  - Forward Lambda response to client
  - Handle insufficient data response
  - Handle Lambda errors
  - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 11.7_

- [ ] 4.8 Create CashFlowPredictor component
  - Create `components/CashFlowPredictor.tsx` with chart display
  - Add button to trigger prediction
  - Implement loading state
  - Handle insufficient data message
  - _Requirements: 5.1_

- [ ]* 4.9 Write property test for chart data visualization
  - **Property 15: Chart data visualization**
  - **Validates: Requirements 5.1**

- [ ] 4.10 Implement chart rendering with historical and predicted data
  - Use chart library (recharts or similar) to render line chart
  - Display historical data in one color, predictions in another
  - Add visual distinction (dashed line for predictions)
  - Make chart responsive
  - _Requirements: 5.1, 5.2_

- [ ] 4.11 Add alert badge for negative predictions
  - Check if any prediction has isNegative flag
  - Display alert badge with warning color
  - Show count of negative days
  - _Requirements: 5.3_

- [ ]* 4.12 Write property test for alert badge display
  - **Property 16: Alert badge display on negative prediction**
  - **Validates: Requirements 5.3**

- [ ] 4.13 Implement tooltip on hover
  - Add hover handler to chart data points
  - Display tooltip with date, balance, trend, confidence
  - Style tooltip for readability
  - _Requirements: 5.5_

- [ ]* 4.14 Write property test for tooltip on hover
  - **Property 17: Tooltip on hover**
  - **Validates: Requirements 5.5**

- [ ] 4.15 Integrate CashFlowPredictor into main app
  - Add CashFlowPredictor to dashboard or dedicated page
  - Connect to existing user authentication
  - Test with real user data
  - _Requirements: 13.4_

- [ ] 4.16 Checkpoint - Test predictive cash flow end-to-end
  - Ensure all tests pass, ask the user if questions arise.

### 5. Automated Daily Reports Feature

- [ ] 5.1 Create report-generator Lambda function
  - Create `lambda/report-generator/index.mjs` with handler
  - Implement Supabase query for users with automation enabled
  - Implement per-user query for today's daily entries
  - Add error handling with isolation (continue on user failure)
  - Add CloudWatch logging
  - Set timeout to 60s and memory to 512MB
  - _Requirements: 6.2, 6.3, 6.6, 6.7, 10.2, 10.3, 10.4_

- [ ]* 5.2 Write property test for user query
  - **Property 18: User query for report generation**
  - **Validates: Requirements 6.2**

- [ ]* 5.3 Write property test for per-user daily data retrieval
  - **Property 19: Per-user daily data retrieval**
  - **Validates: Requirements 6.3**

- [ ] 5.4 Implement Bedrock report generation in Lambda
  - Create prompt for daily insights summary
  - Call Bedrock with daily data
  - Parse response into report object with totalSales, totalExpenses, netProfit, topExpenseCategories, insights
  - Store report in Supabase reports table
  - _Requirements: 6.4, 6.5_

- [ ]* 5.5 Write property test for report insights completeness
  - **Property 20: Report insights completeness**
  - **Validates: Requirements 6.4**

- [ ]* 5.6 Write property test for report storage with metadata
  - **Property 21: Report storage with metadata**
  - **Validates: Requirements 6.5**

- [ ]* 5.7 Write property test for error isolation in batch processing
  - **Property 22: Error isolation in batch processing**
  - **Validates: Requirements 6.7**

- [ ] 5.8 Deploy report-generator Lambda function
  - Deploy Lambda to AWS
  - Set environment variables (BEDROCK_MODEL_ID, SUPABASE_URL, SUPABASE_KEY)
  - Test with sample user data
  - _Requirements: 6.6_

- [ ] 5.9 Configure EventBridge scheduler
  - Create EventBridge rule with cron expression for 8 PM IST (2:30 PM UTC)
  - Set target to report-generator Lambda
  - Test trigger manually
  - _Requirements: 6.1_

- [ ] 5.10 Create /api/reports API route
  - Create `app/api/reports/route.ts` with GET and POST handlers
  - GET: Query user's reports from Supabase, sorted by date descending
  - POST: Update user's automation preference in user_preferences table
  - Add authentication validation
  - _Requirements: 7.1, 7.3, 11.6, 11.7_

- [ ]* 5.11 Write property test for report list sorting
  - **Property 23: Report list sorting**
  - **Validates: Requirements 7.1**

- [ ] 5.12 Create ReportViewer component
  - Create `components/ReportViewer.tsx` with reports list
  - Display reports sorted by date
  - Add automation toggle switch
  - Show last generation timestamp
  - _Requirements: 7.1, 7.3, 7.5_

- [ ]* 5.13 Write property test for automation toggle persistence
  - **Property 25: Automation toggle persistence**
  - **Validates: Requirements 7.3, 7.4**

- [ ] 5.14 Implement report detail view
  - Add click handler to display full report
  - Show all report fields (sales, expenses, profit, categories, insights)
  - Add back button to return to list
  - _Requirements: 7.2_

- [ ]* 5.15 Write property test for report detail display
  - **Property 24: Report detail display**
  - **Validates: Requirements 7.2**

- [ ] 5.16 Integrate ReportViewer into main app
  - Add ReportViewer to dashboard or dedicated page
  - Connect to existing user authentication
  - Test with generated reports
  - _Requirements: 13.4_

- [ ] 5.17 Checkpoint - Test automated reports end-to-end
  - Ensure all tests pass, ask the user if questions arise.

### 6. API Route Testing and Integration

- [ ]* 6.1 Write property tests for API route validation
  - **Property 35: Request payload validation**
  - **Validates: Requirements 11.2**

- [ ]* 6.2 Write property tests for Lambda invocation
  - **Property 36: Lambda invocation via AWS SDK**
  - **Validates: Requirements 11.3**

- [ ]* 6.3 Write property tests for response forwarding
  - **Property 37: Response forwarding**
  - **Validates: Requirements 11.4**

- [ ]* 6.4 Write property tests for error handling
  - **Property 38: Lambda failure error handling**
  - **Validates: Requirements 11.5**

- [ ]* 6.5 Write property tests for POST method enforcement
  - **Property 39: POST method enforcement**
  - **Validates: Requirements 11.6**

- [ ]* 6.6 Write property tests for authentication
  - **Property 40: Authentication requirement**
  - **Validates: Requirements 11.7**

### 7. Lambda Error Handling Testing

- [ ]* 7.1 Write property tests for structured error responses
  - **Property 32: Structured error responses**
  - **Validates: Requirements 10.2**

- [ ]* 7.2 Write property tests for error logging
  - **Property 33: Error logging to CloudWatch**
  - **Validates: Requirements 10.3**

- [ ]* 7.3 Write property tests for execution milestone logging
  - **Property 34: Execution milestone logging**
  - **Validates: Requirements 10.4**

### 8. Integration and Final Testing

- [ ]* 8.1 Write property test for component integration
  - **Property 41: Component integration with existing features**
  - **Validates: Requirements 13.4**

- [ ] 8.2 End-to-end testing for all four features
  - Test voice recording → transcription → extraction → form fill
  - Test cash flow prediction with real data
  - Test expense alert with various expense patterns
  - Test report generation and viewing
  - Verify offline queue works correctly
  - _Requirements: 15.1, 15.2_

- [ ] 8.3 Create deployment documentation
  - Document Lambda deployment steps
  - Document S3 bucket configuration
  - Document EventBridge scheduler setup
  - Document environment variables for each Lambda
  - Document testing procedures
  - _Requirements: 15.3, 15.4, 15.5, 15.6, 15.7_

- [ ] 8.4 Final checkpoint - Verify all features working
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each Lambda function includes error handling and CloudWatch logging by default
- S3 lifecycle policies ensure automatic cleanup of old files
- EventBridge scheduler runs daily at 8 PM IST for automated reports
- All API routes require authentication using existing auth system
- Property tests validate universal correctness properties with 100+ iterations
- Unit tests validate specific examples and edge cases
- Checkpoints ensure incremental validation at feature completion
