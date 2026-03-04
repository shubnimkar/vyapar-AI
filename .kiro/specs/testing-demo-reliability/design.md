# Design Document: Testing & Demo Reliability

## Overview

The Testing & Demo Reliability feature establishes a comprehensive testing infrastructure and demo rehearsal process for Vyapar AI. This design ensures code quality through multiple testing layers (unit, integration, property-based, Lambda dry-run) while providing structured demo scenarios with rehearsal scripts to guarantee reliable demonstrations.

This is a Track B infrastructure feature that supports the entire Vyapar AI application by:
- Validating deterministic financial calculations are correct
- Ensuring API workflows function end-to-end
- Verifying Lambda functions work before deployment
- Providing reusable test fixtures and mocks
- Establishing coverage thresholds for critical code
- Creating rehearsable demo scenarios for key features

The testing strategy follows the Hybrid Intelligence Principle: deterministic financial functions must be thoroughly tested with both unit and property-based tests, while AI components use mocked responses for predictable testing.

## Architecture

### Testing Layers

The testing architecture consists of four distinct layers, each serving a specific purpose:

```
┌─────────────────────────────────────────────────────────────┐
│                     Testing Pyramid                          │
├─────────────────────────────────────────────────────────────┤
│  Smoke Tests (5 tests, <30s)                                │
│  ├─ Quick validation of critical paths                       │
│  └─ Fast feedback for CI/CD                                  │
├─────────────────────────────────────────────────────────────┤
│  Integration Tests (~10 tests)                               │
│  ├─ End-to-end API workflows                                 │
│  ├─ Mocked external services (Bedrock, DynamoDB)            │
│  └─ Request → Processing → Response validation              │
├─────────────────────────────────────────────────────────────┤
│  Unit Tests (~50+ tests)                                     │
│  ├─ Deterministic financial functions                        │
│  ├─ Pure function validation                                 │
│  └─ Specific examples and edge cases                         │
├─────────────────────────────────────────────────────────────┤
│  Property-Based Tests (~10 properties, 100 runs each)       │
│  ├─ Universal correctness properties                         │
│  ├─ Range constraints (0-100 for scores)                     │
│  ├─ Determinism validation                                   │
│  └─ Monotonicity and invariants                              │
└─────────────────────────────────────────────────────────────┘
```

### Test Organization

```
lib/
├── __tests__/
│   ├── fixtures/
│   │   ├── user-profiles.ts          # Sample user profiles
│   │   ├── daily-entries.ts          # 30 days of sample entries
│   │   ├── credit-entries.ts         # Paid and unpaid credits
│   │   ├── segment-data.ts           # Benchmark segment data
│   │   └── ai-responses.ts           # Mock AI responses
│   ├── mocks/
│   │   ├── bedrock-client.mock.ts    # Bedrock mock
│   │   ├── dynamodb-client.mock.ts   # DynamoDB mock
│   │   ├── s3-client.mock.ts         # S3 mock
│   │   └── lambda-client.mock.ts     # Lambda invocation mock
│   ├── unit/
│   │   ├── calculations.test.ts      # Financial calculations
│   │   ├── suggestions.test.ts       # Daily suggestions
│   │   ├── credit-utils.test.ts      # Credit utilities
│   │   └── ...
│   ├── property/
│   │   ├── calculations.property.test.ts
│   │   ├── suggestions.property.test.ts
│   │   └── ...
│   ├── integration/
│   │   ├── auth-flow.integration.test.ts
│   │   ├── daily-entry-flow.integration.test.ts
│   │   ├── credit-flow.integration.test.ts
│   │   ├── ai-analysis.integration.test.ts
│   │   └── receipt-ocr.integration.test.ts
│   ├── lambda/
│   │   ├── receipt-ocr-processor.test.ts
│   │   ├── cashflow-predictor.test.ts
│   │   ├── expense-alert.test.ts
│   │   ├── voice-processor.test.ts
│   │   └── report-generator.test.ts
│   └── smoke/
│       └── critical-paths.smoke.test.ts
```

### Demo Scenario Structure

```
docs/
├── demo/
│   ├── DEMO-CHECKLIST.md             # Pre-demo verification checklist
│   ├── scenarios/
│   │   ├── 01-new-user-onboarding.md
│   │   ├── 02-credit-tracking.md
│   │   ├── 03-ai-insights.md
│   │   └── 04-receipt-ocr.md
│   └── assets/
│       ├── sample-receipts/          # Backup receipt images
│       ├── sample-csv/               # Sample CSV files
│       └── screenshots/              # Expected UI states
```

## Components and Interfaces

### Test Fixture Interfaces

```typescript
// lib/__tests__/fixtures/types.ts

/**
 * Sample user profile for testing
 */
export interface TestUserProfile {
  username: string;
  user_id: string;
  business_type: 'kirana' | 'salon' | 'pharmacy' | 'restaurant' | 'other';
  city_tier: 'tier1' | 'tier2' | 'tier3';
  explanation_mode: 'simple' | 'detailed';
  created_at: string;
}

/**
 * Sample daily entry for testing
 */
export interface TestDailyEntry {
  date: string;
  total_sales: number;
  total_expense: number;
  cash_in_hand?: number;
  estimated_profit: number;
  expense_ratio: number;
  profit_margin: number;
}

/**
 * Sample credit entry for testing
 */
export interface TestCreditEntry {
  id: string;
  customer_name: string;
  amount: number;
  date: string;
  due_date: string;
  is_paid: boolean;
  paid_date?: string;
  last_reminder_at?: string;
}

/**
 * Sample segment data for testing
 */
export interface TestSegmentData {
  segment_key: string;
  median_health_score: number;
  median_margin: number;
  sample_size: number;
}

/**
 * Mock AI response for testing
 */
export interface TestAIResponse {
  scenario: string;
  prompt: string;
  response: string;
  business_type?: string;
  explanation_mode?: string;
}
```

### Mock Service Interfaces

```typescript
// lib/__tests__/mocks/types.ts

/**
 * Mock configuration for Bedrock client
 */
export interface BedrockMockConfig {
  mode: 'success' | 'error' | 'timeout';
  response?: string;
  error?: Error;
  delay?: number;
}

/**
 * Mock configuration for DynamoDB client
 */
export interface DynamoDBMockConfig {
  mode: 'success' | 'error' | 'not_found';
  data?: any;
  error?: Error;
}

/**
 * Mock configuration for S3 client
 */
export interface S3MockConfig {
  mode: 'success' | 'error' | 'not_found';
  data?: Buffer | string;
  error?: Error;
}

/**
 * Mock configuration for Lambda client
 */
export interface LambdaMockConfig {
  mode: 'success' | 'error' | 'timeout';
  response?: any;
  error?: Error;
  delay?: number;
}
```

### Test Execution Scripts

```json
// package.json scripts section
{
  "scripts": {
    "test": "jest",
    "test:unit": "jest --testPathPattern=__tests__/unit",
    "test:property": "jest --testPathPattern=__tests__/property",
    "test:integration": "jest --testPathPattern=__tests__/integration",
    "test:lambda": "jest --testPathPattern=__tests__/lambda",
    "test:smoke": "jest --testPathPattern=__tests__/smoke --maxWorkers=1",
    "test:coverage": "jest --coverage --coverageDirectory=coverage",
    "test:watch": "jest --watch",
    "test:ci": "npm run test:smoke && npm run test:coverage"
  }
}
```

### Jest Configuration

```javascript
// jest.config.js

module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/lib', '<rootDir>/app', '<rootDir>/components'],
  testMatch: [
    '**/__tests__/**/*.test.ts',
    '**/__tests__/**/*.test.tsx'
  ],
  collectCoverageFrom: [
    'lib/**/*.ts',
    'app/api/**/*.ts',
    '!lib/__tests__/**',
    '!lib/**/*.mock.ts',
    '!**/*.d.ts'
  ],
  coverageThresholds: {
    'lib/finance/': {
      lines: 80,
      branches: 75,
      functions: 100,
      statements: 80
    },
    'lib/': {
      lines: 70,
      branches: 65,
      functions: 70,
      statements: 70
    },
    'app/api/': {
      lines: 60,
      branches: 55,
      functions: 60,
      statements: 60
    }
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1'
  },
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js']
};
```

## Data Models

### Test Result Models

```typescript
/**
 * Unit test result
 */
export interface UnitTestResult {
  testName: string;
  passed: boolean;
  duration: number;
  error?: string;
}

/**
 * Property test result
 */
export interface PropertyTestResult {
  propertyName: string;
  numRuns: number;
  passed: boolean;
  counterexample?: any;
  error?: string;
}

/**
 * Integration test result
 */
export interface IntegrationTestResult {
  workflow: string;
  steps: StepResult[];
  passed: boolean;
  duration: number;
}

export interface StepResult {
  stepName: string;
  passed: boolean;
  response?: any;
  error?: string;
}

/**
 * Coverage report
 */
export interface CoverageReport {
  lines: CoverageMetric;
  branches: CoverageMetric;
  functions: CoverageMetric;
  statements: CoverageMetric;
  uncoveredLines: string[];
}

export interface CoverageMetric {
  total: number;
  covered: number;
  percentage: number;
}
```

### Demo Scenario Models

```typescript
/**
 * Demo scenario definition
 */
export interface DemoScenario {
  id: string;
  title: string;
  description: string;
  estimatedDuration: number; // minutes
  prerequisites: string[];
  steps: DemoStep[];
  fallbackPlan: string;
}

/**
 * Demo step definition
 */
export interface DemoStep {
  stepNumber: number;
  action: string;
  expectedResult: string;
  expectedValues?: Record<string, any>;
  screenshot?: string;
  notes?: string;
}

/**
 * Demo checklist item
 */
export interface DemoChecklistItem {
  id: string;
  category: 'infrastructure' | 'data' | 'rehearsal' | 'environment';
  description: string;
  verified: boolean;
  verifiedAt?: string;
  verifiedBy?: string;
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property Reflection

After analyzing all acceptance criteria, I've identified the following testable properties. Many of the requirements are about test existence (examples) or documentation (not testable), but several key properties emerge:

**Redundancy Analysis:**
- Properties 2.1, 2.2, 2.3 all test range constraints (0-100) for different functions - these can be combined into a single comprehensive property
- Properties about determinism (1.8, 2.5) can be combined into one property about all deterministic functions
- Properties about mock completeness (11.6, 11.7) can be combined into one property about all mocks

**Consolidated Properties:**

### Property 1: Deterministic Function Purity

*For any* deterministic financial function (calculateHealthScore, calculateStressIndex, calculateAffordabilityIndex, generateDailySuggestions, calculatePercentile, categorizePerformance), calling the function multiple times with the same inputs MUST produce identical outputs with no side effects.

**Validates: Requirements 1.8, 2.5**

### Property 2: Score Range Constraints

*For any* valid inputs to score calculation functions (calculateHealthScore, calculateStressIndex, calculateAffordabilityIndex), the output score MUST be within the range [0, 100] inclusive.

**Validates: Requirements 2.1, 2.2, 2.3**

### Property 3: Percentile Monotonicity

*For any* two values A and B where A > B, the percentile calculation MUST satisfy percentile(A) >= percentile(B), maintaining monotonic ordering.

**Validates: Requirements 2.4**

### Property 4: Lambda Response Format Validation

*For all* Lambda function tests, the test MUST validate that the response structure matches the expected format with required fields (statusCode, body, headers).

**Validates: Requirements 4.7**

### Property 5: Coverage Threshold Enforcement

*For any* test run where code coverage falls below the defined thresholds (80% for /lib/finance/, 70% for /lib/, 60% for /app/api/), the test execution MUST fail with a non-zero exit code.

**Validates: Requirements 5.7**

### Property 6: Mock Service Completeness

*For all* mock services (Bedrock, DynamoDB, S3, Lambda), the mock MUST provide methods to simulate both success and error scenarios, and MUST be configurable for different test cases.

**Validates: Requirements 11.6, 11.7**

### Property 7: Smoke Test Performance

*For all* smoke tests in the smoke test suite, each individual test MUST complete execution in under 5 seconds to ensure fast feedback.

**Validates: Requirements 12.6**

## Error Handling

### Test Failure Handling

```typescript
/**
 * Test error categories
 */
export enum TestErrorCategory {
  ASSERTION_FAILURE = 'ASSERTION_FAILURE',
  TIMEOUT = 'TIMEOUT',
  SETUP_ERROR = 'SETUP_ERROR',
  TEARDOWN_ERROR = 'TEARDOWN_ERROR',
  MOCK_ERROR = 'MOCK_ERROR',
  COVERAGE_THRESHOLD = 'COVERAGE_THRESHOLD'
}

/**
 * Test error handler
 */
export class TestErrorHandler {
  static handleTestFailure(error: Error, category: TestErrorCategory): void {
    // Log structured error
    console.error({
      category,
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
    
    // Provide actionable feedback
    switch (category) {
      case TestErrorCategory.ASSERTION_FAILURE:
        console.error('Assertion failed. Check expected vs actual values.');
        break;
      case TestErrorCategory.TIMEOUT:
        console.error('Test timed out. Consider increasing timeout or optimizing test.');
        break;
      case TestErrorCategory.MOCK_ERROR:
        console.error('Mock service error. Verify mock configuration.');
        break;
      case TestErrorCategory.COVERAGE_THRESHOLD:
        console.error('Coverage below threshold. Add more tests or adjust threshold.');
        break;
    }
  }
}
```

### Mock Error Simulation

```typescript
/**
 * Mock error scenarios
 */
export class MockErrorScenarios {
  // Bedrock errors
  static bedrockThrottling(): Error {
    return new Error('ThrottlingException: Rate exceeded');
  }
  
  static bedrockModelNotFound(): Error {
    return new Error('ResourceNotFoundException: Model not found');
  }
  
  // DynamoDB errors
  static dynamoDBProvisionedThroughput(): Error {
    return new Error('ProvisionedThroughputExceededException');
  }
  
  static dynamoDBItemNotFound(): null {
    return null; // DynamoDB returns null for not found
  }
  
  // S3 errors
  static s3NoSuchKey(): Error {
    return new Error('NoSuchKey: The specified key does not exist');
  }
  
  static s3AccessDenied(): Error {
    return new Error('AccessDenied: Access Denied');
  }
  
  // Lambda errors
  static lambdaTimeout(): Error {
    return new Error('Task timed out after 30.00 seconds');
  }
  
  static lambdaInvocationError(): Error {
    return new Error('Unhandled exception in Lambda function');
  }
}
```

### Demo Failure Recovery

```typescript
/**
 * Demo failure recovery strategies
 */
export interface DemoRecoveryStrategy {
  scenario: string;
  failureType: string;
  recoverySteps: string[];
  fallbackDemo?: string;
}

export const demoRecoveryStrategies: DemoRecoveryStrategy[] = [
  {
    scenario: 'AI Insights',
    failureType: 'Bedrock unavailable',
    recoverySteps: [
      'Switch to pre-recorded AI response',
      'Explain that AI is generating insights',
      'Show cached example response'
    ],
    fallbackDemo: 'Show static insights from sample data'
  },
  {
    scenario: 'Receipt OCR',
    failureType: 'OCR processing fails',
    recoverySteps: [
      'Use backup receipt image',
      'Manually enter expense data',
      'Explain OCR typically works'
    ],
    fallbackDemo: 'Manual expense entry workflow'
  },
  {
    scenario: 'Credit Follow-up',
    failureType: 'WhatsApp link not working',
    recoverySteps: [
      'Show the generated message text',
      'Explain link generation logic',
      'Demonstrate reminder timestamp update'
    ]
  }
];
```

## Testing Strategy

### Dual Testing Approach

The testing strategy employs both unit tests and property-based tests as complementary approaches:

**Unit Tests:**
- Verify specific examples and edge cases
- Test integration points between components
- Validate error conditions and boundary cases
- Provide concrete examples of expected behavior
- Fast execution for quick feedback

**Property-Based Tests:**
- Verify universal properties across all inputs
- Comprehensive input coverage through randomization
- Discover edge cases not considered in unit tests
- Validate mathematical properties (range, monotonicity, determinism)
- Run minimum 100 iterations per property

Both approaches are necessary for comprehensive coverage. Unit tests catch concrete bugs and validate specific scenarios, while property tests verify general correctness across the input space.

### Property-Based Testing Configuration

**Library:** fast-check (already installed in package.json)

**Configuration:**
- Minimum 100 iterations per property test (numRuns: 100)
- Each property test references its design document property
- Tag format: `// Feature: testing-demo-reliability, Property {number}: {property_text}`

**Example Property Test Structure:**

```typescript
/**
 * Property 2: Score Range Constraints
 * Feature: testing-demo-reliability, Property 2
 * 
 * For any valid inputs to score calculation functions, the output score
 * MUST be within the range [0, 100] inclusive.
 * 
 * **Validates: Requirements 2.1, 2.2, 2.3**
 */
describe('Property 2: Score Range Constraints', () => {
  it('calculateHealthScore always returns 0-100', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0, max: 1 }), // profitMargin
        fc.double({ min: 0, max: 1 }), // expenseRatio
        fc.option(fc.double({ min: 0, max: 1000000 })), // cashInHand
        fc.integer({ min: 0, max: 100 }), // overdueCount
        (profitMargin, expenseRatio, cashInHand, overdueCount) => {
          const result = calculateHealthScore(
            profitMargin,
            expenseRatio,
            cashInHand,
            { overdueCount }
          );
          
          expect(result.score).toBeGreaterThanOrEqual(0);
          expect(result.score).toBeLessThanOrEqual(100);
        }
      ),
      { numRuns: 100 }
    );
  });
  
  // Similar tests for calculateStressIndex and calculateAffordabilityIndex
});
```

### Test Coverage Requirements

**Coverage Thresholds:**
- `/lib/finance/`: 80% line coverage, 75% branch coverage, 100% function coverage
- `/lib/`: 70% line coverage, 65% branch coverage
- `/app/api/`: 60% line coverage, 55% branch coverage
- All deterministic financial functions: 100% coverage

**Coverage Enforcement:**
- Jest configured with coverageThresholds
- Test run fails if coverage drops below threshold
- Coverage report generated after each test run
- Uncovered code paths identified in report

### Integration Test Strategy

Integration tests validate end-to-end workflows with mocked external services:

```typescript
// Example integration test structure
describe('Integration: Login → Create Daily Entry → Fetch Entry', () => {
  beforeEach(() => {
    // Setup mocks
    mockDynamoDB.reset();
    mockBedrock.reset();
  });
  
  it('should complete full workflow', async () => {
    // Step 1: Login
    const loginResponse = await fetch('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username: 'testuser', password: 'password123' })
    });
    expect(loginResponse.status).toBe(200);
    const { session_id } = await loginResponse.json();
    
    // Step 2: Create daily entry
    const entryResponse = await fetch('/api/daily', {
      method: 'POST',
      headers: { 'x-session-id': session_id },
      body: JSON.stringify({
        date: '2024-01-15',
        total_sales: 5000,
        total_expense: 3000
      })
    });
    expect(entryResponse.status).toBe(200);
    
    // Step 3: Fetch entry
    const fetchResponse = await fetch('/api/daily?date=2024-01-15', {
      headers: { 'x-session-id': session_id }
    });
    expect(fetchResponse.status).toBe(200);
    const entry = await fetchResponse.json();
    expect(entry.total_sales).toBe(5000);
    expect(entry.estimated_profit).toBe(2000);
  });
});
```

### Lambda Dry-Run Test Strategy

Lambda tests validate function logic without AWS deployment:

```typescript
// Example Lambda dry-run test
describe('Lambda: receipt-ocr-processor', () => {
  it('should process receipt and extract data', async () => {
    // Mock S3 getObject
    mockS3.getObject.mockResolvedValue({
      Body: Buffer.from('sample receipt image data')
    });
    
    // Mock Textract (if used)
    mockTextract.analyzeDocument.mockResolvedValue({
      Blocks: [
        { BlockType: 'LINE', Text: 'Total: ₹450' },
        { BlockType: 'LINE', Text: 'Date: 15/01/2024' }
      ]
    });
    
    // Import and invoke Lambda handler
    const { handler } = require('../../lambda/receipt-ocr-processor');
    const event = {
      Records: [{
        s3: {
          bucket: { name: 'test-bucket' },
          object: { key: 'receipts/test.jpg' }
        }
      }]
    };
    
    const result = await handler(event);
    
    expect(result.statusCode).toBe(200);
    const body = JSON.parse(result.body);
    expect(body.amount).toBe(450);
    expect(body.date).toBe('2024-01-15');
  });
  
  it('should handle invalid image gracefully', async () => {
    mockS3.getObject.mockRejectedValue(new Error('NoSuchKey'));
    
    const { handler } = require('../../lambda/receipt-ocr-processor');
    const event = {
      Records: [{
        s3: {
          bucket: { name: 'test-bucket' },
          object: { key: 'receipts/missing.jpg' }
        }
      }]
    };
    
    const result = await handler(event);
    
    expect(result.statusCode).toBe(404);
  });
});
```

### Smoke Test Strategy

Smoke tests provide fast validation of critical paths:

```typescript
// lib/__tests__/smoke/critical-paths.smoke.test.ts
describe('Smoke Tests: Critical Paths', () => {
  // Each test should complete in <5 seconds
  jest.setTimeout(5000);
  
  it('user authentication works', () => {
    const result = authenticateUser('testuser', 'password123');
    expect(result.success).toBe(true);
  });
  
  it('daily entry creation works', () => {
    const entry = createDailyEntry({
      date: '2024-01-15',
      total_sales: 5000,
      total_expense: 3000
    });
    expect(entry.estimated_profit).toBe(2000);
  });
  
  it('health score calculation works', () => {
    const result = calculateHealthScore(0.4, 0.6, 10000, { overdueCount: 0 });
    expect(result.score).toBeGreaterThan(0);
    expect(result.score).toBeLessThanOrEqual(100);
  });
  
  it('credit tracking works', () => {
    const credits = [
      { amount: 1000, dueDate: '2024-01-01', isPaid: false },
      { amount: 500, dueDate: '2024-01-10', isPaid: true }
    ];
    const summary = calculateCreditSummary(credits);
    expect(summary.totalOutstanding).toBe(1000);
  });
  
  it('AI analysis mock works', () => {
    const response = mockBedrockClient.invoke({
      prompt: 'Analyze business health'
    });
    expect(response).toBeDefined();
    expect(typeof response).toBe('string');
  });
});
```

### Demo Rehearsal Process

**Pre-Demo Checklist (DEMO-CHECKLIST.md):**

1. Infrastructure Verification
   - [ ] DynamoDB tables accessible
   - [ ] S3 buckets accessible
   - [ ] Bedrock API accessible
   - [ ] Lambda functions deployed

2. Data Preparation
   - [ ] Demo user accounts created
   - [ ] Sample data loaded
   - [ ] Test receipts uploaded
   - [ ] Sample CSV files prepared

3. Rehearsal Completion
   - [ ] Scenario 1: New User Onboarding (rehearsed)
   - [ ] Scenario 2: Credit Tracking (rehearsed)
   - [ ] Scenario 3: AI Insights (rehearsed)
   - [ ] Scenario 4: Receipt OCR (rehearsed)

4. Backup Plans
   - [ ] Fallback demos documented
   - [ ] Recovery strategies reviewed
   - [ ] Backup assets prepared

5. Environment Isolation
   - [ ] Demo environment separate from production
   - [ ] Test data clearly marked
   - [ ] No real user data in demo

**Demo Scenario Structure:**

Each demo scenario document includes:
- Title and description
- Estimated duration (< 5 minutes)
- Prerequisites
- Step-by-step instructions with expected results
- Expected values at each step
- Screenshots or UI state descriptions
- Fallback plan if primary demo fails

### CI/CD Integration

**GitHub Actions Workflow (.github/workflows/test.yml):**

```yaml
name: Test Suite

on:
  pull_request:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Run smoke tests
        run: npm run test:smoke
        
      - name: Run all tests with coverage
        run: npm run test:coverage
        
      - name: Upload coverage reports
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info
          
      - name: Check coverage thresholds
        run: |
          if [ $? -ne 0 ]; then
            echo "Coverage below threshold"
            exit 1
          fi
```

The CI configuration:
- Runs smoke tests first for fast feedback
- Runs full test suite with coverage
- Fails build if tests fail
- Fails build if coverage drops below threshold
- Uploads coverage reports for tracking
- Runs on pull requests and main branch commits

## Implementation Notes

1. **Test Fixtures:** All fixtures should be immutable and documented with JSDoc comments including usage examples.

2. **Mock Services:** Mocks should be stateless and resettable between tests using `beforeEach` hooks.

3. **Property Tests:** Use fast-check's built-in arbitraries (fc.integer, fc.double, fc.string) for input generation.

4. **Integration Tests:** Use supertest or similar library for HTTP request testing.

5. **Lambda Tests:** Import Lambda handlers directly and invoke with mock events.

6. **Demo Scenarios:** Keep each scenario under 5 minutes to maintain audience engagement.

7. **Coverage Reports:** Generate HTML reports for detailed analysis: `npm run test:coverage -- --coverageReporters=html`

8. **Test Isolation:** Each test should be independent and not rely on execution order.

9. **Async Testing:** Use async/await consistently in integration and Lambda tests.

10. **Error Messages:** Provide clear, actionable error messages in test assertions.
