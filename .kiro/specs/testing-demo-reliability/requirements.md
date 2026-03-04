# Requirements Document

## Introduction

The Testing & Demo Reliability feature establishes a comprehensive testing strategy and demo rehearsal process for Vyapar AI. This feature ensures code quality through unit tests, integration tests, and Lambda function tests, while also providing a structured demo rehearsal workflow to guarantee reliable demonstrations of all key features.

## Glossary

- **Unit_Test**: A test that validates a single function or component in isolation
- **Integration_Test**: A test that validates the interaction between multiple components or services
- **Lambda_Dry_Run_Test**: A test that validates Lambda function behavior without deploying to AWS
- **Demo_Scenario**: A predefined user workflow that demonstrates a key feature
- **Test_Coverage**: The percentage of code lines executed by tests
- **Mock**: A simulated version of an external dependency used in testing
- **Deterministic_Function**: A pure function with no side effects that always returns the same output for the same input
- **Property_Based_Test**: A test that validates correctness properties across many generated inputs
- **Test_Fixture**: Predefined test data used to set up test scenarios
- **Rehearsal_Script**: A step-by-step guide for executing a demo scenario
- **Smoke_Test**: A basic test that verifies critical functionality works
- **E2E_Test**: End-to-end test that validates complete user workflows

## Requirements

### Requirement 1: Unit Tests for Deterministic Financial Functions

**User Story:** As a developer, I want unit tests for all deterministic financial functions, so that I can verify calculations are correct and prevent regressions.

#### Acceptance Criteria

1. THE test suite SHALL include unit tests for generateDailySuggestions function
2. THE test suite SHALL include unit tests for getOverdueCredits function
3. THE test suite SHALL include unit tests for calculateStressIndex function
4. THE test suite SHALL include unit tests for calculateAffordabilityIndex function
5. THE test suite SHALL include unit tests for calculateHealthScore function
6. THE test suite SHALL include unit tests for calculatePercentile function
7. THE test suite SHALL include unit tests for categorizePerformance function
8. WHEN a deterministic function is tested, THE test SHALL verify the function is pure (same input → same output)

### Requirement 2: Property-Based Tests for Financial Calculations

**User Story:** As a developer, I want property-based tests for financial calculations, so that I can verify correctness properties hold across many input combinations.

#### Acceptance Criteria

1. THE test suite SHALL include property-based tests for stress index range constraints (0-100)
2. THE test suite SHALL include property-based tests for affordability index range constraints (0-100)
3. THE test suite SHALL include property-based tests for health score range constraints (0-100)
4. THE test suite SHALL include property-based tests for percentile monotonicity
5. THE test suite SHALL include property-based tests for suggestion generation determinism
6. THE property-based tests SHALL use fast-check library for input generation
7. THE property-based tests SHALL run at least 100 test cases per property

### Requirement 3: Integration Tests for API Routes

**User Story:** As a developer, I want integration tests for API routes, so that I can verify end-to-end workflows function correctly.

#### Acceptance Criteria

1. THE test suite SHALL include integration test for login → create daily entry → fetch entry workflow
2. THE test suite SHALL include integration test for signup → profile setup → first entry workflow
3. THE test suite SHALL include integration test for AI analysis endpoint with mocked Bedrock
4. THE test suite SHALL include integration test for credit creation → overdue detection workflow
5. THE test suite SHALL include integration test for receipt upload → OCR → inferred transaction workflow
6. WHEN testing AI endpoints, THE test SHALL mock Bedrock responses
7. WHEN testing DynamoDB operations, THE test SHALL use local DynamoDB or mocks

### Requirement 4: Lambda Function Dry-Run Tests

**User Story:** As a developer, I want dry-run tests for Lambda functions, so that I can verify Lambda logic without deploying to AWS.

#### Acceptance Criteria

1. THE test suite SHALL include dry-run test for receipt-ocr-processor Lambda
2. THE test suite SHALL include dry-run test for cashflow-predictor Lambda
3. THE test suite SHALL include dry-run test for expense-alert Lambda
4. THE test suite SHALL include dry-run test for voice-processor Lambda
5. THE test suite SHALL include dry-run test for report-generator Lambda
6. WHEN testing Lambda functions, THE test SHALL mock AWS SDK calls
7. WHEN testing Lambda functions, THE test SHALL validate response format

### Requirement 5: Test Coverage Requirements

**User Story:** As a developer, I want minimum test coverage thresholds, so that critical code paths are tested.

#### Acceptance Criteria

1. THE test suite SHALL achieve at least 80% line coverage for /lib/finance/ directory
2. THE test suite SHALL achieve at least 70% line coverage for /lib/ directory (excluding mocks)
3. THE test suite SHALL achieve at least 60% line coverage for /app/api/ directory
4. THE test suite SHALL achieve 100% coverage for all deterministic financial functions
5. THE coverage report SHALL be generated after test execution
6. THE coverage report SHALL identify untested code paths
7. WHEN coverage falls below threshold, THE test run SHALL fail

### Requirement 6: Demo Scenario 1 - New User Onboarding

**User Story:** As a demo presenter, I want a rehearsed new user onboarding scenario, so that I can reliably demonstrate the core workflow.

#### Acceptance Criteria

1. THE demo scenario SHALL include new user signup with username and password
2. THE demo scenario SHALL include profile setup with business type and city tier
3. THE demo scenario SHALL include first daily entry with sales and expenses
4. THE demo scenario SHALL include health score calculation and display
5. THE demo scenario SHALL include daily suggestion generation and display
6. THE rehearsal script SHALL document expected values at each step
7. THE rehearsal script SHALL include screenshots or expected UI states

### Requirement 7: Demo Scenario 2 - Credit Tracking and Follow-up

**User Story:** As a demo presenter, I want a rehearsed credit tracking scenario, so that I can demonstrate the Udhaar follow-up feature.

#### Acceptance Criteria

1. THE demo scenario SHALL include adding a credit entry with customer name and amount
2. THE demo scenario SHALL include marking the credit as overdue (>= 3 days old)
3. THE demo scenario SHALL include displaying the follow-up panel with overdue credits
4. THE demo scenario SHALL include WhatsApp reminder link generation
5. THE demo scenario SHALL include updating last_reminder_at timestamp
6. THE rehearsal script SHALL document expected credit calculations
7. THE rehearsal script SHALL include expected sort order (days overdue → amount)

### Requirement 8: Demo Scenario 3 - AI-Powered Insights

**User Story:** As a demo presenter, I want a rehearsed AI insights scenario, so that I can demonstrate AI capabilities.

#### Acceptance Criteria

1. THE demo scenario SHALL include uploading CSV file with transaction data
2. THE demo scenario SHALL include AI analysis of uploaded data
3. THE demo scenario SHALL include displaying AI-generated insights
4. THE demo scenario SHALL include click-to-add workflow for inferred transactions
5. THE demo scenario SHALL include persona-aware explanation (business type specific)
6. THE rehearsal script SHALL document expected AI responses
7. THE rehearsal script SHALL include fallback plan if AI service fails

### Requirement 9: Demo Scenario 4 - Receipt OCR

**User Story:** As a demo presenter, I want a rehearsed receipt OCR scenario, so that I can demonstrate automated expense capture.

#### Acceptance Criteria

1. THE demo scenario SHALL include uploading a receipt image
2. THE demo scenario SHALL include OCR processing and text extraction
3. THE demo scenario SHALL include inferred expense prompt with extracted data
4. THE demo scenario SHALL include user confirmation (Add / Later / Discard)
5. THE demo scenario SHALL include adding the expense to daily entry
6. THE rehearsal script SHALL document expected OCR accuracy
7. THE rehearsal script SHALL include backup receipt images if primary fails

### Requirement 10: Test Fixtures and Sample Data

**User Story:** As a developer, I want reusable test fixtures, so that I can set up test scenarios consistently.

#### Acceptance Criteria

1. THE test suite SHALL include fixture for sample user profile
2. THE test suite SHALL include fixture for sample daily entries (30 days)
3. THE test suite SHALL include fixture for sample credit entries (paid and unpaid)
4. THE test suite SHALL include fixture for sample segment data
5. THE test suite SHALL include fixture for sample AI responses
6. THE fixtures SHALL be located in /lib/__tests__/fixtures/
7. THE fixtures SHALL be documented with usage examples

### Requirement 11: Mock Services for Testing

**User Story:** As a developer, I want mock services for external dependencies, so that tests run quickly and reliably.

#### Acceptance Criteria

1. THE test suite SHALL include mock for Bedrock client
2. THE test suite SHALL include mock for DynamoDB client
3. THE test suite SHALL include mock for S3 client
4. THE test suite SHALL include mock for Lambda invocation
5. THE mocks SHALL be located in /lib/__tests__/mocks/
6. THE mocks SHALL simulate both success and error responses
7. THE mocks SHALL be configurable for different test scenarios

### Requirement 12: Smoke Tests for Critical Paths

**User Story:** As a developer, I want smoke tests for critical paths, so that I can quickly verify the system is functional.

#### Acceptance Criteria

1. THE test suite SHALL include smoke test for user authentication
2. THE test suite SHALL include smoke test for daily entry creation
3. THE test suite SHALL include smoke test for health score calculation
4. THE test suite SHALL include smoke test for credit tracking
5. THE test suite SHALL include smoke test for AI analysis
6. THE smoke tests SHALL complete in under 30 seconds
7. THE smoke tests SHALL be runnable with npm run test:smoke

### Requirement 13: Demo Rehearsal Checklist

**User Story:** As a demo presenter, I want a pre-demo checklist, so that I can ensure all prerequisites are met.

#### Acceptance Criteria

1. THE checklist SHALL verify AWS services are accessible (DynamoDB, S3, Bedrock)
2. THE checklist SHALL verify demo user accounts are created
3. THE checklist SHALL verify sample data is loaded
4. THE checklist SHALL verify all demo scenarios have been rehearsed
5. THE checklist SHALL verify backup plans are documented
6. THE checklist SHALL verify demo environment is isolated from production
7. THE checklist SHALL be documented in DEMO-CHECKLIST.md

### Requirement 14: Test Execution Scripts

**User Story:** As a developer, I want npm scripts for running different test suites, so that I can execute tests efficiently.

#### Acceptance Criteria

1. THE package.json SHALL include npm run test script for all tests
2. THE package.json SHALL include npm run test:unit script for unit tests only
3. THE package.json SHALL include npm run test:integration script for integration tests
4. THE package.json SHALL include npm run test:lambda script for Lambda dry-run tests
5. THE package.json SHALL include npm run test:smoke script for smoke tests
6. THE package.json SHALL include npm run test:coverage script for coverage report
7. THE package.json SHALL include npm run test:watch script for watch mode

### Requirement 15: Continuous Integration Setup

**User Story:** As a developer, I want tests to run automatically on code changes, so that regressions are caught early.

#### Acceptance Criteria

1. THE CI configuration SHALL run all tests on pull requests
2. THE CI configuration SHALL run all tests on main branch commits
3. THE CI configuration SHALL fail the build if tests fail
4. THE CI configuration SHALL fail the build if coverage drops below threshold
5. THE CI configuration SHALL generate and upload coverage reports
6. THE CI configuration SHALL run smoke tests before full test suite
7. THE CI configuration SHALL be documented in .github/workflows/ or equivalent

## Correctness Properties

### Property 1: Test Determinism

FOR ALL test cases in the test suite:
- Running the same test multiple times MUST produce the same result
- Tests MUST NOT depend on execution order
- Tests MUST NOT share mutable state

### Property 2: Mock Completeness

FOR ALL external dependencies (Bedrock, DynamoDB, S3, Lambda):
- A mock implementation MUST exist
- The mock MUST simulate both success and error cases
- The mock MUST be usable in isolation

### Property 3: Coverage Threshold Enforcement

FOR ALL code in /lib/finance/:
- Line coverage MUST be >= 80%
- Branch coverage MUST be >= 75%
- Function coverage MUST be 100%

### Property 4: Demo Scenario Completeness

FOR ALL demo scenarios:
- A rehearsal script MUST exist
- Expected values MUST be documented
- Fallback plans MUST be documented
- The scenario MUST be executable in under 5 minutes

### Property 5: Property-Based Test Exhaustiveness

FOR ALL deterministic financial functions:
- At least one property-based test MUST exist
- The test MUST run at least 100 cases
- The test MUST validate range constraints
- The test MUST validate determinism

### Property 6: Integration Test Coverage

FOR ALL critical user workflows:
- An integration test MUST exist
- The test MUST validate end-to-end behavior
- The test MUST use mocked external services
- The test MUST validate response format

### Property 7: Lambda Test Isolation

FOR ALL Lambda function tests:
- The test MUST NOT require AWS deployment
- The test MUST mock all AWS SDK calls
- The test MUST validate input/output format
- The test MUST validate error handling

### Property 8: Fixture Reusability

FOR ALL test fixtures:
- The fixture MUST be importable from /lib/__tests__/fixtures/
- The fixture MUST be documented with usage examples
- The fixture MUST be immutable (no shared state)
- The fixture MUST represent realistic data

### Property 9: Smoke Test Speed

FOR ALL smoke tests:
- The test MUST complete in under 5 seconds
- The test MUST validate critical functionality only
- The test MUST NOT depend on external services
- The test MUST be runnable independently

### Property 10: CI Test Reliability

FOR ALL CI test runs:
- Tests MUST pass consistently (no flaky tests)
- Tests MUST complete in under 10 minutes
- Tests MUST fail fast on first error
- Tests MUST provide clear failure messages
