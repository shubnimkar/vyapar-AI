# Implementation Plan: Testing & Demo Reliability

## Overview

This implementation plan establishes a comprehensive testing infrastructure and demo rehearsal process for Vyapar AI. The plan follows a layered approach: first setting up test infrastructure (fixtures, mocks, configuration), then implementing unit and property-based tests for deterministic functions, followed by integration and Lambda tests, and finally creating demo scenarios with rehearsal scripts.

The implementation uses TypeScript and Jest as the testing framework, with fast-check for property-based testing. All tests follow the Hybrid Intelligence Principle: deterministic financial functions are thoroughly tested, while AI components use mocked responses.

## Tasks

- [ ] 1. Set up testing infrastructure and configuration
  - Create Jest configuration with coverage thresholds
  - Set up test directory structure (/lib/__tests__/)
  - Configure npm test scripts in package.json
  - Install and configure fast-check for property-based testing
  - Create jest.setup.js for global test configuration
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 14.1, 14.2, 14.3, 14.4, 14.5, 14.6, 14.7_

- [ ] 2. Create test fixtures and sample data
  - [ ] 2.1 Create fixture type definitions
    - Create /lib/__tests__/fixtures/types.ts with TestUserProfile, TestDailyEntry, TestCreditEntry, TestSegmentData, TestAIResponse interfaces
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.7_
  
  - [ ] 2.2 Create user profile fixtures
    - Create /lib/__tests__/fixtures/user-profiles.ts with sample profiles for different business types and city tiers
    - Include kirana, salon, pharmacy, restaurant profiles
    - _Requirements: 10.1, 10.7_
  
  - [ ] 2.3 Create daily entry fixtures
    - Create /lib/__tests__/fixtures/daily-entries.ts with 30 days of sample entries
    - Include varied sales, expenses, and profit margins
    - _Requirements: 10.2, 10.7_
  
  - [ ] 2.4 Create credit entry fixtures
    - Create /lib/__tests__/fixtures/credit-entries.ts with paid and unpaid credits
    - Include overdue credits (>= 3 days old)
    - _Requirements: 10.3, 10.7_
  
  - [ ] 2.5 Create segment data and AI response fixtures
    - Create /lib/__tests__/fixtures/segment-data.ts with benchmark data
    - Create /lib/__tests__/fixtures/ai-responses.ts with mock AI responses for different scenarios
    - _Requirements: 10.4, 10.5, 10.7_

- [ ] 3. Create mock services for external dependencies
  - [ ] 3.1 Create mock type definitions
    - Create /lib/__tests__/mocks/types.ts with BedrockMockConfig, DynamoDBMockConfig, S3MockConfig, LambdaMockConfig interfaces
    - _Requirements: 11.5_
  
  - [ ] 3.2 Create Bedrock client mock
    - Create /lib/__tests__/mocks/bedrock-client.mock.ts
    - Implement success, error, and timeout modes
    - Include configurable responses and delays
    - _Requirements: 11.1, 11.6, 11.7_
  
  - [ ] 3.3 Create DynamoDB client mock
    - Create /lib/__tests__/mocks/dynamodb-client.mock.ts
    - Implement success, error, and not_found modes
    - Mock PutItem, GetItem, Query, UpdateItem operations
    - _Requirements: 11.2, 11.6, 11.7_
  
  - [ ] 3.4 Create S3 and Lambda client mocks
    - Create /lib/__tests__/mocks/s3-client.mock.ts with getObject, putObject mocks
    - Create /lib/__tests__/mocks/lambda-client.mock.ts with invoke mock
    - Implement success, error, and timeout modes for both
    - _Requirements: 11.3, 11.4, 11.6, 11.7_

- [ ] 4. Implement unit tests for deterministic financial functions
  - [ ] 4.1 Create unit tests for health score calculation
    - Create /lib/__tests__/unit/calculations.test.ts
    - Test calculateHealthScore with various profit margins, expense ratios, cash amounts
    - Test edge cases: zero values, negative values, missing cash
    - Verify function purity (same input → same output)
    - _Requirements: 1.1, 1.5, 1.8_
  
  - [ ] 4.2 Create unit tests for stress and affordability indices
    - Add tests for calculateStressIndex in calculations.test.ts
    - Add tests for calculateAffordabilityIndex in calculations.test.ts
    - Test edge cases: high credit ratio, low cash buffer, high volatility
    - Verify function purity
    - _Requirements: 1.3, 1.4, 1.8_
  
  - [ ] 4.3 Create unit tests for percentile and categorization
    - Add tests for calculatePercentile in calculations.test.ts
    - Add tests for categorizePerformance in calculations.test.ts
    - Test edge cases: empty arrays, single values, identical values
    - _Requirements: 1.6, 1.7, 1.8_
  
  - [ ] 4.4 Create unit tests for daily suggestions
    - Create /lib/__tests__/unit/suggestions.test.ts
    - Test generateDailySuggestions with various business states
    - Test severity levels: info, warning, critical
    - Test suggestion dismissal logic
    - Verify function purity
    - _Requirements: 1.1, 1.8_
  
  - [ ] 4.5 Create unit tests for credit utilities
    - Create /lib/__tests__/unit/credit-utils.test.ts
    - Test getOverdueCredits with various credit states
    - Test overdue threshold (>= 3 days)
    - Test sorting by days overdue → amount
    - _Requirements: 1.2, 1.8_

- [ ] 5. Implement property-based tests for financial calculations
  - [ ] 5.1 Create property test for score range constraints
    - Create /lib/__tests__/property/calculations.property.test.ts
    - **Property 2: Score Range Constraints**
    - Test calculateHealthScore, calculateStressIndex, calculateAffordabilityIndex always return 0-100
    - Use fast-check with fc.double and fc.integer arbitraries
    - Run 100 test cases per property
    - **Validates: Requirements 2.1, 2.2, 2.3**
  
  - [ ] 5.2 Create property test for percentile monotonicity
    - Add property test to calculations.property.test.ts
    - **Property 3: Percentile Monotonicity**
    - Test that for A > B, percentile(A) >= percentile(B)
    - Use fast-check to generate sorted and unsorted arrays
    - Run 100 test cases
    - **Validates: Requirements 2.4**
  
  - [ ] 5.3 Create property test for suggestion determinism
    - Create /lib/__tests__/property/suggestions.property.test.ts
    - **Property 1: Deterministic Function Purity**
    - Test generateDailySuggestions produces identical output for identical input
    - Use fast-check to generate business state objects
    - Run 100 test cases
    - **Validates: Requirements 2.5, 1.8**
  
  - [ ]* 5.4 Configure property test execution
    - Ensure all property tests use { numRuns: 100 }
    - Add property test tag comments referencing design document properties
    - Verify property tests run with npm run test:property
    - _Requirements: 2.6, 2.7_

- [ ] 6. Checkpoint - Ensure unit and property tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 7. Implement integration tests for API routes
  - [ ] 7.1 Create integration test for auth and daily entry workflow
    - Create /lib/__tests__/integration/auth-flow.integration.test.ts
    - Test login → create daily entry → fetch entry workflow
    - Mock DynamoDB operations
    - Validate response formats and status codes
    - _Requirements: 3.1, 3.7_
  
  - [ ] 7.2 Create integration test for signup and profile setup
    - Create /lib/__tests__/integration/signup-flow.integration.test.ts
    - Test signup → profile setup → first entry workflow
    - Mock DynamoDB operations
    - Validate user profile creation
    - _Requirements: 3.2, 3.7_
  
  - [ ] 7.3 Create integration test for AI analysis endpoint
    - Create /lib/__tests__/integration/ai-analysis.integration.test.ts
    - Test AI analysis endpoint with mocked Bedrock responses
    - Validate persona-aware responses
    - Test error handling when Bedrock fails
    - _Requirements: 3.3, 3.6_
  
  - [ ] 7.4 Create integration test for credit workflow
    - Create /lib/__tests__/integration/credit-flow.integration.test.ts
    - Test credit creation → overdue detection → follow-up panel workflow
    - Mock DynamoDB operations
    - Validate overdue credit sorting and WhatsApp link generation
    - _Requirements: 3.4, 3.7_
  
  - [ ] 7.5 Create integration test for receipt OCR workflow
    - Create /lib/__tests__/integration/receipt-ocr.integration.test.ts
    - Test receipt upload → OCR → inferred transaction workflow
    - Mock S3 and Lambda operations
    - Validate click-to-add prompt generation
    - _Requirements: 3.5, 3.6, 3.7_

- [ ] 8. Implement Lambda function dry-run tests
  - [ ] 8.1 Create test for receipt-ocr-processor Lambda
    - Create /lib/__tests__/lambda/receipt-ocr-processor.test.ts
    - Test S3 event processing and OCR extraction
    - Mock S3 getObject and Textract operations
    - **Property 4: Lambda Response Format Validation**
    - Validate response structure (statusCode, body, headers)
    - Test error handling for invalid images
    - **Validates: Requirements 4.7**
    - _Requirements: 4.1, 4.6, 4.7_
  
  - [ ] 8.2 Create test for cashflow-predictor Lambda
    - Create /lib/__tests__/lambda/cashflow-predictor.test.ts
    - Test prediction logic with sample daily entries
    - Mock DynamoDB Query operations
    - Validate response format
    - Test error handling for insufficient data
    - _Requirements: 4.2, 4.6, 4.7_
  
  - [ ] 8.3 Create tests for remaining Lambda functions
    - Create /lib/__tests__/lambda/expense-alert.test.ts
    - Create /lib/__tests__/lambda/voice-processor.test.ts
    - Create /lib/__tests__/lambda/report-generator.test.ts
    - Mock AWS SDK calls for each function
    - Validate response formats
    - Test error handling scenarios
    - _Requirements: 4.3, 4.4, 4.5, 4.6, 4.7_

- [ ] 9. Implement smoke tests for critical paths
  - [ ] 9.1 Create smoke test suite
    - Create /lib/__tests__/smoke/critical-paths.smoke.test.ts
    - **Property 7: Smoke Test Performance**
    - Test user authentication (< 5 seconds)
    - Test daily entry creation (< 5 seconds)
    - Test health score calculation (< 5 seconds)
    - Test credit tracking (< 5 seconds)
    - Test AI analysis mock (< 5 seconds)
    - **Validates: Requirements 12.6**
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 12.6, 12.7_

- [ ] 10. Configure test coverage enforcement
  - [ ] 10.1 Update Jest configuration with coverage thresholds
    - Set /lib/finance/ thresholds: 80% lines, 75% branches, 100% functions
    - Set /lib/ thresholds: 70% lines, 65% branches
    - Set /app/api/ thresholds: 60% lines, 55% branches
    - **Property 5: Coverage Threshold Enforcement**
    - Configure Jest to fail when coverage drops below thresholds
    - **Validates: Requirements 5.7**
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.7_
  
  - [ ] 10.2 Create coverage reporting script
    - Add npm run test:coverage script
    - Configure coverage report generation (lcov, html)
    - Add coverage report to .gitignore
    - _Requirements: 5.5, 5.6_

- [ ] 11. Checkpoint - Ensure all tests pass with coverage
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 12. Create demo scenario documentation
  - [ ] 12.1 Create demo scenario 1: New User Onboarding
    - Create docs/demo/scenarios/01-new-user-onboarding.md
    - Document signup → profile setup → first entry → health score → suggestions workflow
    - Include expected values at each step
    - Include screenshots or UI state descriptions
    - Estimate duration < 5 minutes
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7_
  
  - [ ] 12.2 Create demo scenario 2: Credit Tracking
    - Create docs/demo/scenarios/02-credit-tracking.md
    - Document add credit → mark overdue → follow-up panel → WhatsApp reminder workflow
    - Include expected credit calculations and sort order
    - Include fallback plan
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7_
  
  - [ ] 12.3 Create demo scenario 3: AI-Powered Insights
    - Create docs/demo/scenarios/03-ai-insights.md
    - Document CSV upload → AI analysis → insights display → click-to-add workflow
    - Include expected AI responses for different business types
    - Include fallback plan if Bedrock unavailable
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7_
  
  - [ ] 12.4 Create demo scenario 4: Receipt OCR
    - Create docs/demo/scenarios/04-receipt-ocr.md
    - Document receipt upload → OCR processing → inferred expense → confirmation workflow
    - Include expected OCR accuracy notes
    - Include backup receipt images
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7_

- [ ] 13. Create demo rehearsal checklist and assets
  - [ ] 13.1 Create pre-demo checklist
    - Create docs/demo/DEMO-CHECKLIST.md
    - Include infrastructure verification (DynamoDB, S3, Bedrock, Lambda)
    - Include data preparation checklist (demo users, sample data, test receipts)
    - Include rehearsal completion checklist
    - Include backup plans and environment isolation checks
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5, 13.6, 13.7_
  
  - [ ] 13.2 Prepare demo assets
    - Create docs/demo/assets/sample-receipts/ directory with backup receipt images
    - Create docs/demo/assets/sample-csv/ directory with sample CSV files
    - Create docs/demo/assets/screenshots/ directory structure
    - Document asset usage in each demo scenario
    - _Requirements: 9.7, 8.7_

- [ ] 14. Set up CI/CD integration
  - [ ] 14.1 Create GitHub Actions workflow
    - Create .github/workflows/test.yml
    - Configure workflow to run on pull requests and main branch commits
    - Add smoke test step (runs first for fast feedback)
    - Add full test suite with coverage step
    - Add coverage threshold check step
    - Configure workflow to fail build if tests fail or coverage drops
    - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.6, 15.7_
  
  - [ ] 14.2 Configure coverage report upload
    - Add codecov or similar coverage upload step
    - Configure coverage report generation in CI
    - _Requirements: 15.5_

- [ ] 15. Final checkpoint - Run full test suite and verify demo readiness
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- All property-based tests use fast-check with minimum 100 iterations
- Each property test includes a comment tag referencing the design document property
- Integration tests use mocked external services (Bedrock, DynamoDB, S3, Lambda)
- Lambda tests import handlers directly and invoke with mock events
- Smoke tests must complete in under 30 seconds total
- Demo scenarios must be executable in under 5 minutes each
- Coverage thresholds are enforced: 80% for /lib/finance/, 70% for /lib/, 60% for /app/api/
- All tests follow the Hybrid Intelligence Principle: deterministic functions are thoroughly tested, AI components use mocks
