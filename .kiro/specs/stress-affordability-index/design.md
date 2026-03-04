# Design Document: Stress & Affordability Index

## Overview

The Stress & Affordability Index feature provides two deterministic financial health metrics that help Vyapar AI shop owners understand their financial position and make informed decisions about expenses. This feature follows the Hybrid Intelligence Principle where deterministic TypeScript functions compute all financial metrics, and AI only provides persona-aware explanations.

### Key Design Principles

1. **Deterministic Core**: All calculations are pure TypeScript functions with no AI involvement
2. **Offline-First**: Calculations work entirely from localStorage data when offline
3. **Explainable**: Each index provides component breakdowns showing how the score was calculated
4. **Multi-Language**: Full support for English, Hindi, and Marathi
5. **Performance**: Sub-10ms calculation time for real-time UI updates

### Feature Scope

**Stress Index**: Measures financial pressure based on:
- Credit ratio (outstanding credits vs sales)
- Cash buffer (available cash vs monthly expenses)
- Expense volatility (standard deviation of daily expenses)

**Affordability Index**: Evaluates planned expense viability based on:
- Planned expense amount
- Average monthly profit from historical data

Both indices output scores from 0-100 with detailed component breakdowns for transparency.


## Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                        Dashboard UI                          │
│  ┌──────────────────┐         ┌──────────────────┐         │
│  │  Stress Index    │         │ Affordability    │         │
│  │  Visual Display  │         │  Planning UI     │         │
│  └────────┬─────────┘         └────────┬─────────┘         │
└───────────┼──────────────────────────────┼──────────────────┘
            │                              │
            ▼                              ▼
┌─────────────────────────────────────────────────────────────┐
│              Index Calculation Orchestrator                  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Data Aggregation Layer                              │  │
│  │  - aggregateStressInputs()                           │  │
│  │  - aggregateAffordabilityInputs()                    │  │
│  └──────────────────────────────────────────────────────┘  │
└───────────┬──────────────────────────────┬──────────────────┘
            │                              │
            ▼                              ▼
┌──────────────────────┐      ┌──────────────────────────────┐
│  Stress Calculator   │      │  Affordability Calculator    │
│  (Pure Function)     │      │  (Pure Function)             │
│                      │      │                              │
│  calculateStress     │      │  calculateAffordability      │
│  Index()             │      │  Index()                     │
└──────────┬───────────┘      └──────────┬───────────────────┘
           │                             │
           └──────────────┬──────────────┘
                          ▼
           ┌──────────────────────────────┐
           │      Index Store Service     │
           │  - saveIndex()               │
           │  - getLatestIndex()          │
           │  - getHistoricalIndices()    │
           └──────────┬───────────────────┘
                      │
        ┌─────────────┴─────────────┐
        ▼                           ▼
┌───────────────┐          ┌────────────────┐
│  localStorage │          │   DynamoDB     │
│  (Offline)    │◄────────►│   (Online)     │
└───────────────┘   Sync   └────────────────┘
                   Manager
```

### Data Flow

1. **Input Aggregation**: Historical data (daily entries, credits) is aggregated into calculation inputs
2. **Index Calculation**: Pure functions compute indices and component breakdowns
3. **Storage**: Results saved to localStorage (always) and DynamoDB (when online)
4. **Display**: UI renders indices with color coding and breakdowns
5. **AI Explanation** (Optional): Deterministic results sent to AI for persona-aware interpretation


## Components and Interfaces

### Core Calculation Functions

#### Stress Index Calculator

**Location**: `/lib/finance/calculateStressIndex.ts`

```typescript
/**
 * Component breakdown for stress index calculation
 */
export interface StressComponentBreakdown {
  creditRatioScore: number;      // 0-40 points (40% weight)
  cashBufferScore: number;        // 0-35 points (35% weight)
  expenseVolatilityScore: number; // 0-25 points (25% weight)
}

/**
 * Result of stress index calculation
 */
export interface StressIndexResult {
  score: number;                  // 0-100 (higher = more stress)
  breakdown: StressComponentBreakdown;
  calculatedAt: string;           // ISO timestamp
  inputParameters: {
    creditRatio: number;
    cashBuffer: number;
    expenseVolatility: number;
  };
}

/**
 * Calculate financial stress index
 * 
 * Pure function - no side effects, deterministic output
 * 
 * @param creditRatio - Outstanding credits / Total sales (0-1+ range)
 * @param cashBuffer - Cash in hand / Avg monthly expenses (0+ range)
 * @param expenseVolatility - Std dev of daily expenses / Avg daily expense (0-1+ range)
 * @returns Stress index result with score and breakdown
 */
export function calculateStressIndex(
  creditRatio: number,
  cashBuffer: number,
  expenseVolatility: number
): StressIndexResult;
```

**Algorithm**:

```
Credit Ratio Score (0-40 points):
  - creditRatio >= 0.7: 40 points (critical stress)
  - creditRatio >= 0.5: 30 points (high stress)
  - creditRatio >= 0.3: 20 points (moderate stress)
  - creditRatio >= 0.1: 10 points (low stress)
  - creditRatio < 0.1: 0 points (minimal stress)

Cash Buffer Score (0-35 points):
  - cashBuffer < 0.5: 35 points (critical - less than 2 weeks expenses)
  - cashBuffer < 1.0: 25 points (high - less than 1 month expenses)
  - cashBuffer < 2.0: 15 points (moderate - less than 2 months)
  - cashBuffer < 3.0: 5 points (low - less than 3 months)
  - cashBuffer >= 3.0: 0 points (healthy buffer)

Expense Volatility Score (0-25 points):
  - expenseVolatility >= 0.5: 25 points (very unpredictable)
  - expenseVolatility >= 0.3: 15 points (moderately unpredictable)
  - expenseVolatility >= 0.15: 8 points (slightly unpredictable)
  - expenseVolatility < 0.15: 0 points (stable expenses)

Total Stress Score = creditRatioScore + cashBufferScore + expenseVolatilityScore
```


#### Affordability Index Calculator

**Location**: `/lib/finance/calculateAffordabilityIndex.ts`

```typescript
/**
 * Component breakdown for affordability index calculation
 */
export interface AffordabilityComponentBreakdown {
  costToProfitRatio: number;      // The ratio used for calculation
  affordabilityCategory: string;  // Category label
}

/**
 * Result of affordability index calculation
 */
export interface AffordabilityIndexResult {
  score: number;                  // 0-100 (higher = more affordable)
  breakdown: AffordabilityComponentBreakdown;
  calculatedAt: string;           // ISO timestamp
  inputParameters: {
    plannedCost: number;
    avgMonthlyProfit: number;
  };
}

/**
 * Calculate affordability index for a planned expense
 * 
 * Pure function - no side effects, deterministic output
 * 
 * @param plannedCost - Amount of planned expense
 * @param avgMonthlyProfit - Average monthly profit from historical data
 * @returns Affordability index result with score and breakdown
 */
export function calculateAffordabilityIndex(
  plannedCost: number,
  avgMonthlyProfit: number
): AffordabilityIndexResult;
```

**Algorithm**:

```
Cost-to-Profit Ratio = plannedCost / avgMonthlyProfit

Edge Cases:
  - If avgMonthlyProfit <= 0: return score = 0 (unaffordable)
  - If plannedCost <= 0: return score = 100 (no cost)

Affordability Score Calculation:
  - ratio < 0.1: score = 100 (easily affordable - less than 10% of monthly profit)
  - ratio < 0.2: score = 95 (very affordable)
  - ratio < 0.3: score = 90 (affordable)
  - ratio < 0.5: score = 80 (reasonably affordable)
  - ratio < 0.7: score = 70 (affordable with planning)
  - ratio < 1.0: score = 55 (stretch - requires careful planning)
  - ratio < 1.5: score = 40 (risky - exceeds monthly profit)
  - ratio < 2.0: score = 25 (very risky)
  - ratio >= 2.0: score = 10 (not recommended)

Affordability Category:
  - score >= 90: "Easily Affordable"
  - score >= 70: "Affordable"
  - score >= 50: "Stretch"
  - score >= 30: "Risky"
  - score < 30: "Not Recommended"
```


### Data Aggregation Functions

#### Stress Index Input Aggregation

**Location**: `/lib/finance/aggregateStressInputs.ts`

```typescript
/**
 * Historical data required for stress index calculation
 */
export interface HistoricalData {
  dailyEntries: DailyEntry[];
  creditEntries: CreditEntry[];
}

/**
 * Aggregated inputs for stress index calculation
 */
export interface StressIndexInputs {
  creditRatio: number;
  cashBuffer: number;
  expenseVolatility: number;
  dataPoints: number;           // Number of days used
  calculationPeriod: {
    startDate: string;
    endDate: string;
  };
}

/**
 * Aggregate historical data into stress index inputs
 * 
 * @param data - Historical daily entries and credit entries
 * @param currentDate - Reference date for calculations (defaults to today)
 * @returns Aggregated inputs or null if insufficient data
 */
export function aggregateStressInputs(
  data: HistoricalData,
  currentDate?: Date
): StressIndexInputs | null;
```

**Calculation Logic**:

```typescript
// Credit Ratio Calculation (last 30 days)
const last30Days = filterEntriesByDateRange(dailyEntries, 30);
const totalSales = sum(last30Days.map(e => e.totalSales));
const unpaidCredits = creditEntries.filter(c => !c.isPaid);
const totalOutstanding = sum(unpaidCredits.map(c => c.amount));
const creditRatio = totalSales > 0 ? totalOutstanding / totalSales : 0;

// Cash Buffer Calculation (last 90 days for average)
const last90Days = filterEntriesByDateRange(dailyEntries, 90);
const avgMonthlyExpenses = (sum(last90Days.map(e => e.totalExpense)) / 90) * 30;
const latestCashInHand = dailyEntries[0]?.cashInHand ?? 0;
const cashBuffer = avgMonthlyExpenses > 0 ? latestCashInHand / avgMonthlyExpenses : 0;

// Expense Volatility Calculation (last 30 days)
const expenses = last30Days.map(e => e.totalExpense);
const avgExpense = mean(expenses);
const stdDev = standardDeviation(expenses);
const expenseVolatility = avgExpense > 0 ? stdDev / avgExpense : 0;

// Data Sufficiency Check
if (last30Days.length < 7) {
  return null; // Insufficient data
}
```


#### Affordability Index Input Aggregation

**Location**: `/lib/finance/aggregateAffordabilityInputs.ts`

```typescript
/**
 * Aggregated inputs for affordability index calculation
 */
export interface AffordabilityIndexInputs {
  avgMonthlyProfit: number;
  dataPoints: number;           // Number of days used
  calculationPeriod: {
    startDate: string;
    endDate: string;
  };
}

/**
 * Aggregate historical data into affordability index inputs
 * 
 * @param dailyEntries - Historical daily entries
 * @param currentDate - Reference date for calculations (defaults to today)
 * @returns Aggregated inputs or null if insufficient data
 */
export function aggregateAffordabilityInputs(
  dailyEntries: DailyEntry[],
  currentDate?: Date
): AffordabilityIndexInputs | null;
```

**Calculation Logic**:

```typescript
// Average Monthly Profit Calculation (last 90 days)
const last90Days = filterEntriesByDateRange(dailyEntries, 90);

if (last90Days.length < 7) {
  return null; // Insufficient data
}

const totalProfit = sum(last90Days.map(e => e.estimatedProfit));
const avgDailyProfit = totalProfit / last90Days.length;
const avgMonthlyProfit = avgDailyProfit * 30;

return {
  avgMonthlyProfit,
  dataPoints: last90Days.length,
  calculationPeriod: {
    startDate: last90Days[last90Days.length - 1].date,
    endDate: last90Days[0].date
  }
};
```

### Utility Functions

**Location**: `/lib/finance/statisticsUtils.ts`

```typescript
/**
 * Calculate mean of an array of numbers
 */
export function mean(values: number[]): number;

/**
 * Calculate standard deviation of an array of numbers
 */
export function standardDeviation(values: number[]): number;

/**
 * Filter entries by date range (last N days from reference date)
 */
export function filterEntriesByDateRange<T extends { date: string }>(
  entries: T[],
  days: number,
  referenceDate?: Date
): T[];

/**
 * Sum an array of numbers
 */
export function sum(values: number[]): number;
```


## Data Models

### TypeScript Interfaces

**Location**: `/lib/types.ts` (additions)

```typescript
// ============================================
// Stress & Affordability Index Types
// ============================================

/**
 * Stress index component breakdown
 */
export interface StressComponentBreakdown {
  creditRatioScore: number;      // 0-40 points
  cashBufferScore: number;        // 0-35 points
  expenseVolatilityScore: number; // 0-25 points
}

/**
 * Stress index calculation result
 */
export interface StressIndexResult {
  score: number;                  // 0-100 (higher = more stress)
  breakdown: StressComponentBreakdown;
  calculatedAt: string;           // ISO timestamp
  inputParameters: {
    creditRatio: number;
    cashBuffer: number;
    expenseVolatility: number;
  };
}

/**
 * Affordability index component breakdown
 */
export interface AffordabilityComponentBreakdown {
  costToProfitRatio: number;
  affordabilityCategory: 'Easily Affordable' | 'Affordable' | 'Stretch' | 'Risky' | 'Not Recommended';
}

/**
 * Affordability index calculation result
 */
export interface AffordabilityIndexResult {
  score: number;                  // 0-100 (higher = more affordable)
  breakdown: AffordabilityComponentBreakdown;
  calculatedAt: string;           // ISO timestamp
  inputParameters: {
    plannedCost: number;
    avgMonthlyProfit: number;
  };
}

/**
 * Combined index data for storage and display
 */
export interface IndexData {
  userId: string;
  date: string;                   // ISO date (YYYY-MM-DD)
  stressIndex: StressIndexResult | null;
  affordabilityIndex: AffordabilityIndexResult | null;
  dataPoints: number;             // Number of historical days used
  calculationPeriod: {
    startDate: string;
    endDate: string;
  };
  createdAt: string;              // ISO timestamp
  syncedAt?: string;              // ISO timestamp (when synced to DynamoDB)
}

/**
 * Planned expense with affordability assessment
 */
export interface PlannedExpense {
  id: string;
  userId: string;
  description: string;
  amount: number;
  affordabilityIndex: AffordabilityIndexResult;
  createdAt: string;
  isPurchased: boolean;
  purchasedAt?: string;
}

/**
 * Color coding for visual indicators
 */
export type StressColor = 'green' | 'yellow' | 'red';
export type AffordabilityColor = 'green' | 'yellow' | 'red';

/**
 * Visual indicator configuration
 */
export interface IndexVisualConfig {
  score: number;
  color: StressColor | AffordabilityColor;
  label: string;
  severity: 'low' | 'medium' | 'high';
}
```


### DynamoDB Schema

**Table Name**: `vyapar-ai-data` (single-table design)

#### Index Storage Items

```typescript
// Partition Key: PK = USER#{user_id}
// Sort Key: SK = INDEX#{YYYY-MM-DD}

{
  PK: "USER#user123",
  SK: "INDEX#2024-01-15",
  
  // Entity metadata
  entityType: "INDEX",
  userId: "user123",
  date: "2024-01-15",
  
  // Stress index data
  stressIndex: {
    score: 45,
    breakdown: {
      creditRatioScore: 20,
      cashBufferScore: 15,
      expenseVolatilityScore: 10
    },
    calculatedAt: "2024-01-15T10:30:00Z",
    inputParameters: {
      creditRatio: 0.35,
      cashBuffer: 1.2,
      expenseVolatility: 0.25
    }
  },
  
  // Affordability index data (optional - only if user checked affordability)
  affordabilityIndex: {
    score: 75,
    breakdown: {
      costToProfitRatio: 0.4,
      affordabilityCategory: "Affordable"
    },
    calculatedAt: "2024-01-15T10:30:00Z",
    inputParameters: {
      plannedCost: 20000,
      avgMonthlyProfit: 50000
    }
  },
  
  // Calculation metadata
  dataPoints: 45,
  calculationPeriod: {
    startDate: "2023-12-01",
    endDate: "2024-01-15"
  },
  
  // Timestamps
  createdAt: "2024-01-15T10:30:00Z",
  updatedAt: "2024-01-15T10:30:00Z",
  
  // TTL (optional - for data retention policies)
  ttl: 1739635200  // Unix timestamp for expiration
}
```

#### Planned Expense Items

```typescript
// Partition Key: PK = USER#{user_id}
// Sort Key: SK = PLANNED_EXPENSE#{expense_id}

{
  PK: "USER#user123",
  SK: "PLANNED_EXPENSE#exp456",
  
  // Entity metadata
  entityType: "PLANNED_EXPENSE",
  userId: "user123",
  expenseId: "exp456",
  
  // Expense details
  description: "New refrigerator for shop",
  amount: 25000,
  
  // Affordability assessment
  affordabilityIndex: {
    score: 70,
    breakdown: {
      costToProfitRatio: 0.5,
      affordabilityCategory: "Affordable"
    },
    calculatedAt: "2024-01-15T11:00:00Z",
    inputParameters: {
      plannedCost: 25000,
      avgMonthlyProfit: 50000
    }
  },
  
  // Status
  isPurchased: false,
  purchasedAt: null,
  
  // Timestamps
  createdAt: "2024-01-15T11:00:00Z",
  updatedAt: "2024-01-15T11:00:00Z"
}
```

#### Query Patterns

```typescript
// Get latest index for a user
PK = USER#{user_id}
SK begins_with INDEX#
ScanIndexForward = false
Limit = 1

// Get historical indices for trend analysis
PK = USER#{user_id}
SK between INDEX#{start_date} and INDEX#{end_date}
ScanIndexForward = false

// Get all planned expenses for a user
PK = USER#{user_id}
SK begins_with PLANNED_EXPENSE#
```


### localStorage Schema

**Key Patterns**:

```typescript
// Index data
localStorage.setItem('vyapar_indices', JSON.stringify(IndexData[]));

// Planned expenses
localStorage.setItem('vyapar_planned_expenses', JSON.stringify(PlannedExpense[]));

// Sync metadata
localStorage.setItem('vyapar_indices_last_sync', ISO_TIMESTAMP);
```

**Data Structure**:

```typescript
// vyapar_indices
[
  {
    userId: "user123",
    date: "2024-01-15",
    stressIndex: { /* StressIndexResult */ },
    affordabilityIndex: null,
    dataPoints: 45,
    calculationPeriod: {
      startDate: "2023-12-01",
      endDate: "2024-01-15"
    },
    createdAt: "2024-01-15T10:30:00Z",
    syncedAt: "2024-01-15T10:31:00Z"  // null if not synced
  },
  // ... more entries
]

// vyapar_planned_expenses
[
  {
    id: "exp456",
    userId: "user123",
    description: "New refrigerator",
    amount: 25000,
    affordabilityIndex: { /* AffordabilityIndexResult */ },
    createdAt: "2024-01-15T11:00:00Z",
    isPurchased: false,
    purchasedAt: null
  },
  // ... more expenses
]
```

**Storage Management**:

- Maximum 90 days of index history in localStorage
- Older entries automatically pruned when new ones added
- Planned expenses kept until marked as purchased or manually deleted
- Sync status tracked per entry


## Offline-First Architecture

### Sync Manager Service

**Location**: `/lib/index-sync.ts`

```typescript
/**
 * Sync manager for index data between localStorage and DynamoDB
 */
export class IndexSyncManager {
  /**
   * Save index data (localStorage always, DynamoDB when online)
   */
  async saveIndex(indexData: IndexData): Promise<void>;
  
  /**
   * Get latest index from localStorage or DynamoDB
   */
  async getLatestIndex(userId: string): Promise<IndexData | null>;
  
  /**
   * Get historical indices for trend analysis
   */
  async getHistoricalIndices(
    userId: string,
    startDate: string,
    endDate: string
  ): Promise<IndexData[]>;
  
  /**
   * Sync pending localStorage indices to DynamoDB
   */
  async syncPendingIndices(userId: string): Promise<SyncResult>;
  
  /**
   * Check if online and DynamoDB is accessible
   */
  async isOnline(): Promise<boolean>;
}

/**
 * Sync result with success/failure details
 */
export interface SyncResult {
  success: boolean;
  syncedCount: number;
  failedCount: number;
  errors: string[];
}
```

### Sync Strategy

**Conflict Resolution**: Last-write-wins based on `createdAt` timestamp

**Sync Triggers**:
1. When user comes online (network state change)
2. When new index is calculated (attempt immediate sync)
3. Manual sync button in UI
4. Background sync every 5 minutes when online

**Sync Flow**:

```
1. Check network connectivity
2. If offline:
   - Save to localStorage only
   - Mark as pending sync
   - Return success
   
3. If online:
   - Save to localStorage
   - Attempt DynamoDB save
   - If DynamoDB succeeds:
     - Mark as synced in localStorage
     - Update syncedAt timestamp
   - If DynamoDB fails:
     - Keep as pending sync
     - Retry on next sync trigger
```

### Offline Calculation Flow

```typescript
// User adds daily entry or credit entry
// → Triggers index recalculation

async function recalculateIndices(userId: string): Promise<void> {
  // 1. Load data from localStorage
  const dailyEntries = loadDailyEntriesFromLocalStorage(userId);
  const creditEntries = loadCreditEntriesFromLocalStorage(userId);
  
  // 2. Aggregate inputs (pure function, no network)
  const stressInputs = aggregateStressInputs({ dailyEntries, creditEntries });
  
  if (!stressInputs) {
    // Insufficient data - show message to user
    return;
  }
  
  // 3. Calculate indices (pure functions, no network)
  const stressIndex = calculateStressIndex(
    stressInputs.creditRatio,
    stressInputs.cashBuffer,
    stressInputs.expenseVolatility
  );
  
  // 4. Create index data object
  const indexData: IndexData = {
    userId,
    date: new Date().toISOString().split('T')[0],
    stressIndex,
    affordabilityIndex: null,
    dataPoints: stressInputs.dataPoints,
    calculationPeriod: stressInputs.calculationPeriod,
    createdAt: new Date().toISOString(),
    syncedAt: undefined
  };
  
  // 5. Save (handles online/offline automatically)
  await syncManager.saveIndex(indexData);
  
  // 6. Update UI
  updateDashboardDisplay(indexData);
}
```


## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property Reflection

Before defining properties, we eliminate redundancy by analyzing logical relationships:

**Redundancy Analysis**:
- Properties 1.4, 1.5, 1.6 (individual monotonicity checks) are subsumed by Property 2 (comprehensive monotonicity)
- Property 1.7 (pure function) and Property 1.10 (deterministic) are equivalent - both test function purity
- Property 2.7 and 2.10 are equivalent to 1.7 and 1.10 for affordability calculator

**Consolidation Decisions**:
- Combine all monotonicity checks into single comprehensive property
- Use single determinism property for each calculator
- Combine component structure validation with breakdown accuracy

### Stress Index Properties

### Property 1: Range Constraint (Invariant)

*For any* valid numeric inputs `creditRatio`, `cashBuffer`, and `expenseVolatility`, the stress score returned by `calculateStressIndex()` must be between 0 and 100 inclusive.

**Validates: Requirements 1.1, 1.2**

### Property 2: Monotonicity (Metamorphic)

*For any* two sets of inputs where only one parameter differs:
- Increasing `creditRatio` must never decrease the stress score
- Decreasing `cashBuffer` must never decrease the stress score  
- Increasing `expenseVolatility` must never decrease the stress score

**Validates: Requirements 1.4, 1.5, 1.6**

### Property 3: Component Sum Consistency (Invariant)

*For any* valid inputs, the sum of component scores in the breakdown must equal the total stress score (within 0.01 tolerance for floating-point rounding).

**Validates: Requirements 1.3**

### Property 4: Determinism (Idempotence)

*For any* valid inputs, calling `calculateStressIndex()` multiple times with the same inputs must produce identical results (same score, same breakdown, same input parameters).

**Validates: Requirements 1.7, 1.10**


### Affordability Index Properties

### Property 5: Range Constraint (Invariant)

*For any* valid numeric inputs `plannedCost` and `avgMonthlyProfit`, the affordability score returned by `calculateAffordabilityIndex()` must be between 0 and 100 inclusive.

**Validates: Requirements 2.1, 2.2**

### Property 6: Inverse Relationship (Metamorphic)

*For any* two sets of inputs where only one parameter differs:
- Increasing `plannedCost` must never increase the affordability score
- Increasing `avgMonthlyProfit` must never decrease the affordability score

**Validates: Requirements 2.4, 2.5**

### Property 7: Zero Profit Edge Case

*For any* positive `plannedCost`, when `avgMonthlyProfit` is zero or negative, the affordability score must be exactly 0.

**Validates: Requirements 2.6**

### Property 8: Scaling Invariance (Metamorphic)

*For any* positive `plannedCost` and `avgMonthlyProfit`, and any positive scaling factor `k`, the affordability score must remain unchanged when both inputs are scaled by the same factor:
```
calculateAffordabilityIndex(plannedCost, avgMonthlyProfit).score === 
calculateAffordabilityIndex(plannedCost * k, avgMonthlyProfit * k).score
```

**Validates: Requirements 2.1, 2.2**

### Property 9: Threshold Behavior

*For any* `avgMonthlyProfit` > 0:
- When `plannedCost` > `avgMonthlyProfit`, the score must be less than 50
- When `plannedCost` < 0.1 * `avgMonthlyProfit`, the score must be greater than 90

**Validates: Requirements 2.4, 2.5**

### Property 10: Determinism (Idempotence)

*For any* valid inputs, calling `calculateAffordabilityIndex()` multiple times with the same inputs must produce identical results.

**Validates: Requirements 2.7, 2.10**


### Data Aggregation Properties

### Property 11: Credit Ratio Calculation

*For any* set of daily entries and credit entries, the calculated credit ratio must equal the sum of unpaid credit amounts divided by the sum of sales over the period (or 0 if sales is 0).

**Validates: Requirements 3.1**

### Property 12: Cash Buffer Calculation

*For any* set of daily entries with at least 7 days of data, the calculated cash buffer must equal the latest cash in hand divided by the average monthly expenses (or 0 if average expenses is 0).

**Validates: Requirements 3.2**

### Property 13: Expense Volatility Calculation

*For any* set of daily entries, the calculated expense volatility must equal the standard deviation of daily expenses divided by the mean daily expense (or 0 if mean is 0).

**Validates: Requirements 3.3**

### Property 14: Average Monthly Profit Calculation

*For any* set of daily entries, the calculated average monthly profit must equal the sum of daily profits divided by the number of days, multiplied by 30.

**Validates: Requirements 3.4**

### Property 15: Data Sufficiency Check

*For any* set of daily entries with fewer than 7 entries, the aggregation functions must return null, indicating insufficient data for calculation.

**Validates: Requirements 3.5**

### Storage and Retrieval Properties

### Property 16: Round-Trip Persistence (Round-Trip)

*For any* valid `IndexData` object, saving it to storage and then retrieving it must return an equivalent object (all fields match).

**Validates: Requirements 4.1, 4.3, 4.4**

### Property 17: Latest Index Retrieval

*For any* user with multiple index entries, retrieving the latest index must return the entry with the most recent date.

**Validates: Requirements 4.8**

### Property 18: Historical Index Ordering

*For any* user and date range, retrieving historical indices must return entries in descending date order (newest first).

**Validates: Requirements 4.9**


### UI and Display Properties

### Property 19: Stress Color Coding

*For any* stress score:
- Score in [0, 33] must map to green color
- Score in [34, 66] must map to yellow color
- Score in [67, 100] must map to red color

**Validates: Requirements 5.1**

### Property 20: Affordability Color Coding

*For any* affordability score:
- Score in [0, 33] must map to red color
- Score in [34, 66] must map to yellow color
- Score in [67, 100] must map to green color

**Validates: Requirements 5.2**

### Property 21: Affordability Guidance Mapping

*For any* affordability score, the guidance category must be:
- [90, 100]: "Easily Affordable"
- [70, 89]: "Affordable"
- [50, 69]: "Stretch"
- [30, 49]: "Risky"
- [0, 29]: "Not Recommended"

**Validates: Requirements 7.5**

### Validation Properties

### Property 22: Positive Cost Validation

*For any* input to the affordability planning interface, the validation function must reject non-positive values for `plannedCost`.

**Validates: Requirements 7.2**

### Offline Calculation Properties

### Property 23: Calculation Location Independence (Confluence)

*For any* identical set of daily entries and credit entries, calculating indices offline (using localStorage data) must produce the same results as calculating online (using DynamoDB data).

**Validates: Requirements 8.3**

### Property 24: Conflict Resolution

*For any* two index entries with the same userId and date but different timestamps, the sync manager must keep the entry with the later `createdAt` timestamp (last-write-wins).

**Validates: Requirements 8.7**


## Error Handling

### Input Validation

**Stress Index Calculator**:

```typescript
function validateStressInputs(
  creditRatio: number,
  cashBuffer: number,
  expenseVolatility: number
): ValidationResult {
  const errors: string[] = [];
  
  // Check for NaN or undefined
  if (isNaN(creditRatio) || creditRatio === undefined) {
    errors.push('creditRatio must be a valid number');
  }
  if (isNaN(cashBuffer) || cashBuffer === undefined) {
    errors.push('cashBuffer must be a valid number');
  }
  if (isNaN(expenseVolatility) || expenseVolatility === undefined) {
    errors.push('expenseVolatility must be a valid number');
  }
  
  // Check for negative values (ratios should be non-negative)
  if (creditRatio < 0) {
    errors.push('creditRatio cannot be negative');
  }
  if (cashBuffer < 0) {
    errors.push('cashBuffer cannot be negative');
  }
  if (expenseVolatility < 0) {
    errors.push('expenseVolatility cannot be negative');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}
```

**Affordability Index Calculator**:

```typescript
function validateAffordabilityInputs(
  plannedCost: number,
  avgMonthlyProfit: number
): ValidationResult {
  const errors: string[] = [];
  
  // Check for NaN or undefined
  if (isNaN(plannedCost) || plannedCost === undefined) {
    errors.push('plannedCost must be a valid number');
  }
  if (isNaN(avgMonthlyProfit) || avgMonthlyProfit === undefined) {
    errors.push('avgMonthlyProfit must be a valid number');
  }
  
  // Planned cost should be positive
  if (plannedCost <= 0) {
    errors.push('plannedCost must be greater than 0');
  }
  
  // Note: avgMonthlyProfit can be zero or negative (edge case handled in calculation)
  
  return {
    isValid: errors.length === 0,
    errors
  };
}
```

### Insufficient Data Handling

```typescript
// When aggregation returns null due to insufficient data
if (!stressInputs) {
  return {
    success: false,
    code: 'INSUFFICIENT_DATA',
    message: t('indices.insufficientData', userLanguage),
    requiredDays: 7,
    availableDays: dailyEntries.length
  };
}
```

### Network Error Handling

```typescript
// Sync manager handles network failures gracefully
async function saveIndex(indexData: IndexData): Promise<SaveResult> {
  // Always save to localStorage first
  saveToLocalStorage(indexData);
  
  // Attempt DynamoDB save if online
  try {
    if (await isOnline()) {
      await saveToDynamoDB(indexData);
      return { success: true, location: 'both' };
    } else {
      return { success: true, location: 'localStorage', pendingSync: true };
    }
  } catch (error) {
    // Log error but don't fail - data is safe in localStorage
    logger.warn('DynamoDB save failed, will retry on next sync', { error });
    return { success: true, location: 'localStorage', pendingSync: true };
  }
}
```

### Calculation Edge Cases

**Division by Zero**:
- Credit ratio: If total sales = 0, return creditRatio = 0
- Cash buffer: If avg expenses = 0, return cashBuffer = 0
- Expense volatility: If mean expense = 0, return expenseVolatility = 0
- Affordability: If avg profit ≤ 0, return score = 0

**Extreme Values**:
- Very high credit ratio (>2.0): Cap stress contribution at maximum
- Very high cash buffer (>10.0): Minimum stress contribution
- Very high cost-to-profit ratio (>5.0): Minimum affordability score

**Empty Data Sets**:
- Return null from aggregation functions
- Display user-friendly message in UI
- Suggest adding more daily entries


## Testing Strategy

### Dual Testing Approach

This feature requires both unit tests and property-based tests for comprehensive coverage:

**Unit Tests**: Verify specific examples, edge cases, and error conditions
**Property Tests**: Verify universal properties across all inputs

Both approaches are complementary and necessary. Unit tests catch concrete bugs with known inputs, while property tests verify general correctness across the input space.

### Property-Based Testing

**Library**: `fast-check` (TypeScript property-based testing library)

**Configuration**: Minimum 100 iterations per property test (due to randomization)

**Test Organization**: Each correctness property from the design document must be implemented as a single property-based test.

#### Stress Index Property Tests

**Location**: `/lib/finance/__tests__/calculateStressIndex.property.test.ts`

```typescript
import fc from 'fast-check';
import { calculateStressIndex } from '../calculateStressIndex';

describe('Stress Index - Property-Based Tests', () => {
  
  // Property 1: Range Constraint
  it('should always return score between 0 and 100', () => {
    fc.assert(
      fc.property(
        fc.float({ min: 0, max: 2 }),  // creditRatio
        fc.float({ min: 0, max: 10 }), // cashBuffer
        fc.float({ min: 0, max: 1 }),  // expenseVolatility
        (creditRatio, cashBuffer, expenseVolatility) => {
          const result = calculateStressIndex(creditRatio, cashBuffer, expenseVolatility);
          return result.score >= 0 && result.score <= 100;
        }
      ),
      { numRuns: 100 }
    );
  });
  // Tag: Feature: stress-affordability-index, Property 1: Range Constraint
  
  // Property 2: Monotonicity - Credit Ratio
  it('should increase stress when credit ratio increases', () => {
    fc.assert(
      fc.property(
        fc.float({ min: 0, max: 1 }),
        fc.float({ min: 0, max: 1 }),
        fc.float({ min: 0, max: 10 }),
        fc.float({ min: 0, max: 1 }),
        (cr1, cr2, cb, ev) => {
          fc.pre(cr1 < cr2); // Precondition: cr1 < cr2
          const result1 = calculateStressIndex(cr1, cb, ev);
          const result2 = calculateStressIndex(cr2, cb, ev);
          return result1.score <= result2.score;
        }
      ),
      { numRuns: 100 }
    );
  });
  // Tag: Feature: stress-affordability-index, Property 2: Monotonicity
  
  // Property 2: Monotonicity - Cash Buffer
  it('should increase stress when cash buffer decreases', () => {
    fc.assert(
      fc.property(
        fc.float({ min: 0, max: 2 }),
        fc.float({ min: 0.1, max: 10 }),
        fc.float({ min: 0.1, max: 10 }),
        fc.float({ min: 0, max: 1 }),
        (cr, cb1, cb2, ev) => {
          fc.pre(cb1 > cb2); // Precondition: cb1 > cb2
          const result1 = calculateStressIndex(cr, cb1, ev);
          const result2 = calculateStressIndex(cr, cb2, ev);
          return result1.score <= result2.score;
        }
      ),
      { numRuns: 100 }
    );
  });
  // Tag: Feature: stress-affordability-index, Property 2: Monotonicity
  
  // Property 2: Monotonicity - Expense Volatility
  it('should increase stress when expense volatility increases', () => {
    fc.assert(
      fc.property(
        fc.float({ min: 0, max: 2 }),
        fc.float({ min: 0, max: 10 }),
        fc.float({ min: 0, max: 0.5 }),
        fc.float({ min: 0, max: 0.5 }),
        (cr, cb, ev1, ev2) => {
          fc.pre(ev1 < ev2); // Precondition: ev1 < ev2
          const result1 = calculateStressIndex(cr, cb, ev1);
          const result2 = calculateStressIndex(cr, cb, ev2);
          return result1.score <= result2.score;
        }
      ),
      { numRuns: 100 }
    );
  });
  // Tag: Feature: stress-affordability-index, Property 2: Monotonicity
  
  // Property 3: Component Sum Consistency
  it('should have component scores sum to total score', () => {
    fc.assert(
      fc.property(
        fc.float({ min: 0, max: 2 }),
        fc.float({ min: 0, max: 10 }),
        fc.float({ min: 0, max: 1 }),
        (creditRatio, cashBuffer, expenseVolatility) => {
          const result = calculateStressIndex(creditRatio, cashBuffer, expenseVolatility);
          const componentSum = 
            result.breakdown.creditRatioScore +
            result.breakdown.cashBufferScore +
            result.breakdown.expenseVolatilityScore;
          return Math.abs(result.score - componentSum) < 0.01;
        }
      ),
      { numRuns: 100 }
    );
  });
  // Tag: Feature: stress-affordability-index, Property 3: Component Sum Consistency
  
  // Property 4: Determinism
  it('should produce identical results for same inputs', () => {
    fc.assert(
      fc.property(
        fc.float({ min: 0, max: 2 }),
        fc.float({ min: 0, max: 10 }),
        fc.float({ min: 0, max: 1 }),
        (creditRatio, cashBuffer, expenseVolatility) => {
          const result1 = calculateStressIndex(creditRatio, cashBuffer, expenseVolatility);
          const result2 = calculateStressIndex(creditRatio, cashBuffer, expenseVolatility);
          return result1.score === result2.score &&
                 result1.breakdown.creditRatioScore === result2.breakdown.creditRatioScore &&
                 result1.breakdown.cashBufferScore === result2.breakdown.cashBufferScore &&
                 result1.breakdown.expenseVolatilityScore === result2.breakdown.expenseVolatilityScore;
        }
      ),
      { numRuns: 100 }
    );
  });
  // Tag: Feature: stress-affordability-index, Property 4: Determinism
  
});
```


#### Affordability Index Property Tests

**Location**: `/lib/finance/__tests__/calculateAffordabilityIndex.property.test.ts`

```typescript
import fc from 'fast-check';
import { calculateAffordabilityIndex } from '../calculateAffordabilityIndex';

describe('Affordability Index - Property-Based Tests', () => {
  
  // Property 5: Range Constraint
  it('should always return score between 0 and 100', () => {
    fc.assert(
      fc.property(
        fc.float({ min: 0.01, max: 1000000 }), // plannedCost
        fc.float({ min: -10000, max: 1000000 }), // avgMonthlyProfit (can be negative)
        (plannedCost, avgMonthlyProfit) => {
          const result = calculateAffordabilityIndex(plannedCost, avgMonthlyProfit);
          return result.score >= 0 && result.score <= 100;
        }
      ),
      { numRuns: 100 }
    );
  });
  // Tag: Feature: stress-affordability-index, Property 5: Range Constraint
  
  // Property 6: Inverse Relationship - Planned Cost
  it('should decrease affordability when planned cost increases', () => {
    fc.assert(
      fc.property(
        fc.float({ min: 1, max: 50000 }),
        fc.float({ min: 1, max: 50000 }),
        fc.float({ min: 1000, max: 100000 }),
        (pc1, pc2, ap) => {
          fc.pre(pc1 < pc2); // Precondition: pc1 < pc2
          const result1 = calculateAffordabilityIndex(pc1, ap);
          const result2 = calculateAffordabilityIndex(pc2, ap);
          return result1.score >= result2.score;
        }
      ),
      { numRuns: 100 }
    );
  });
  // Tag: Feature: stress-affordability-index, Property 6: Inverse Relationship
  
  // Property 6: Inverse Relationship - Average Profit
  it('should increase affordability when average profit increases', () => {
    fc.assert(
      fc.property(
        fc.float({ min: 1000, max: 100000 }),
        fc.float({ min: 1000, max: 50000 }),
        fc.float({ min: 1000, max: 50000 }),
        (pc, ap1, ap2) => {
          fc.pre(ap1 < ap2); // Precondition: ap1 < ap2
          const result1 = calculateAffordabilityIndex(pc, ap1);
          const result2 = calculateAffordabilityIndex(pc, ap2);
          return result1.score <= result2.score;
        }
      ),
      { numRuns: 100 }
    );
  });
  // Tag: Feature: stress-affordability-index, Property 6: Inverse Relationship
  
  // Property 7: Zero Profit Edge Case
  it('should return score of 0 when profit is zero or negative', () => {
    fc.assert(
      fc.property(
        fc.float({ min: 0.01, max: 100000 }),
        fc.float({ min: -10000, max: 0 }),
        (plannedCost, avgMonthlyProfit) => {
          const result = calculateAffordabilityIndex(plannedCost, avgMonthlyProfit);
          return result.score === 0;
        }
      ),
      { numRuns: 100 }
    );
  });
  // Tag: Feature: stress-affordability-index, Property 7: Zero Profit Edge Case
  
  // Property 8: Scaling Invariance
  it('should maintain same score when both inputs scaled equally', () => {
    fc.assert(
      fc.property(
        fc.float({ min: 100, max: 10000 }),
        fc.float({ min: 1000, max: 50000 }),
        fc.float({ min: 1.1, max: 10 }),
        (plannedCost, avgMonthlyProfit, scale) => {
          const result1 = calculateAffordabilityIndex(plannedCost, avgMonthlyProfit);
          const result2 = calculateAffordabilityIndex(
            plannedCost * scale,
            avgMonthlyProfit * scale
          );
          return Math.abs(result1.score - result2.score) < 0.01;
        }
      ),
      { numRuns: 100 }
    );
  });
  // Tag: Feature: stress-affordability-index, Property 8: Scaling Invariance
  
  // Property 9: Threshold Behavior
  it('should return score < 50 when cost exceeds profit', () => {
    fc.assert(
      fc.property(
        fc.float({ min: 1000, max: 50000 }),
        fc.float({ min: 1000, max: 50000 }),
        (ap, extra) => {
          fc.pre(extra > 0);
          const plannedCost = ap + extra; // Ensure cost > profit
          const result = calculateAffordabilityIndex(plannedCost, ap);
          return result.score < 50;
        }
      ),
      { numRuns: 100 }
    );
  });
  // Tag: Feature: stress-affordability-index, Property 9: Threshold Behavior
  
  it('should return score > 90 when cost is less than 10% of profit', () => {
    fc.assert(
      fc.property(
        fc.float({ min: 10000, max: 100000 }),
        (avgMonthlyProfit) => {
          const plannedCost = avgMonthlyProfit * 0.05; // 5% of profit
          const result = calculateAffordabilityIndex(plannedCost, avgMonthlyProfit);
          return result.score > 90;
        }
      ),
      { numRuns: 100 }
    );
  });
  // Tag: Feature: stress-affordability-index, Property 9: Threshold Behavior
  
  // Property 10: Determinism
  it('should produce identical results for same inputs', () => {
    fc.assert(
      fc.property(
        fc.float({ min: 0.01, max: 100000 }),
        fc.float({ min: 1000, max: 100000 }),
        (plannedCost, avgMonthlyProfit) => {
          const result1 = calculateAffordabilityIndex(plannedCost, avgMonthlyProfit);
          const result2 = calculateAffordabilityIndex(plannedCost, avgMonthlyProfit);
          return result1.score === result2.score &&
                 result1.breakdown.costToProfitRatio === result2.breakdown.costToProfitRatio &&
                 result1.breakdown.affordabilityCategory === result2.breakdown.affordabilityCategory;
        }
      ),
      { numRuns: 100 }
    );
  });
  // Tag: Feature: stress-affordability-index, Property 10: Determinism
  
});
```


### Unit Tests

**Purpose**: Test specific examples, edge cases, and integration points

#### Stress Index Unit Tests

**Location**: `/lib/finance/__tests__/calculateStressIndex.test.ts`

```typescript
import { calculateStressIndex } from '../calculateStressIndex';

describe('Stress Index - Unit Tests', () => {
  
  it('should return 0 stress for ideal conditions', () => {
    const result = calculateStressIndex(0.05, 5.0, 0.1);
    expect(result.score).toBe(0);
  });
  
  it('should return maximum stress for worst conditions', () => {
    const result = calculateStressIndex(1.0, 0.3, 0.6);
    expect(result.score).toBe(100);
  });
  
  it('should handle zero credit ratio', () => {
    const result = calculateStressIndex(0, 2.0, 0.2);
    expect(result.breakdown.creditRatioScore).toBe(0);
  });
  
  it('should handle very high cash buffer', () => {
    const result = calculateStressIndex(0.2, 10.0, 0.2);
    expect(result.breakdown.cashBufferScore).toBe(0);
  });
  
  it('should include calculation timestamp', () => {
    const result = calculateStressIndex(0.3, 1.5, 0.2);
    expect(result.calculatedAt).toBeDefined();
    expect(new Date(result.calculatedAt).getTime()).toBeGreaterThan(0);
  });
  
  it('should store input parameters', () => {
    const result = calculateStressIndex(0.35, 1.2, 0.25);
    expect(result.inputParameters).toEqual({
      creditRatio: 0.35,
      cashBuffer: 1.2,
      expenseVolatility: 0.25
    });
  });
  
  it('should handle boundary values correctly', () => {
    // Credit ratio at 0.5 threshold
    const result1 = calculateStressIndex(0.5, 2.0, 0.1);
    expect(result1.breakdown.creditRatioScore).toBe(30);
    
    // Cash buffer at 1.0 threshold
    const result2 = calculateStressIndex(0.2, 1.0, 0.1);
    expect(result2.breakdown.cashBufferScore).toBe(25);
    
    // Expense volatility at 0.3 threshold
    const result3 = calculateStressIndex(0.2, 2.0, 0.3);
    expect(result3.breakdown.expenseVolatilityScore).toBe(15);
  });
  
});
```

#### Affordability Index Unit Tests

**Location**: `/lib/finance/__tests__/calculateAffordabilityIndex.test.ts`

```typescript
import { calculateAffordabilityIndex } from '../calculateAffordabilityIndex';

describe('Affordability Index - Unit Tests', () => {
  
  it('should return 100 for very small expense relative to profit', () => {
    const result = calculateAffordabilityIndex(1000, 50000);
    expect(result.score).toBe(100);
    expect(result.breakdown.affordabilityCategory).toBe('Easily Affordable');
  });
  
  it('should return low score for expense exceeding profit', () => {
    const result = calculateAffordabilityIndex(100000, 40000);
    expect(result.score).toBeLessThan(50);
    expect(result.breakdown.affordabilityCategory).toBe('Not Recommended');
  });
  
  it('should return 0 for zero profit', () => {
    const result = calculateAffordabilityIndex(10000, 0);
    expect(result.score).toBe(0);
  });
  
  it('should return 0 for negative profit', () => {
    const result = calculateAffordabilityIndex(10000, -5000);
    expect(result.score).toBe(0);
  });
  
  it('should calculate correct cost-to-profit ratio', () => {
    const result = calculateAffordabilityIndex(20000, 50000);
    expect(result.breakdown.costToProfitRatio).toBe(0.4);
  });
  
  it('should assign correct category for each score range', () => {
    expect(calculateAffordabilityIndex(4000, 50000).breakdown.affordabilityCategory)
      .toBe('Easily Affordable'); // ratio 0.08
    expect(calculateAffordabilityIndex(12000, 50000).breakdown.affordabilityCategory)
      .toBe('Affordable'); // ratio 0.24
    expect(calculateAffordabilityIndex(30000, 50000).breakdown.affordabilityCategory)
      .toBe('Stretch'); // ratio 0.6
    expect(calculateAffordabilityIndex(60000, 50000).breakdown.affordabilityCategory)
      .toBe('Risky'); // ratio 1.2
    expect(calculateAffordabilityIndex(120000, 50000).breakdown.affordabilityCategory)
      .toBe('Not Recommended'); // ratio 2.4
  });
  
  it('should include calculation timestamp', () => {
    const result = calculateAffordabilityIndex(20000, 50000);
    expect(result.calculatedAt).toBeDefined();
    expect(new Date(result.calculatedAt).getTime()).toBeGreaterThan(0);
  });
  
  it('should store input parameters', () => {
    const result = calculateAffordabilityIndex(25000, 60000);
    expect(result.inputParameters).toEqual({
      plannedCost: 25000,
      avgMonthlyProfit: 60000
    });
  });
  
});
```


#### Data Aggregation Unit Tests

**Location**: `/lib/finance/__tests__/aggregateStressInputs.test.ts`

```typescript
import { aggregateStressInputs } from '../aggregateStressInputs';
import { DailyEntry, CreditEntry } from '@/lib/types';

describe('Stress Input Aggregation - Unit Tests', () => {
  
  it('should return null for insufficient data', () => {
    const dailyEntries: DailyEntry[] = [
      { date: '2024-01-15', totalSales: 5000, totalExpense: 3000, estimatedProfit: 2000, expenseRatio: 0.6, profitMargin: 0.4 }
    ];
    const creditEntries: CreditEntry[] = [];
    
    const result = aggregateStressInputs({ dailyEntries, creditEntries });
    expect(result).toBeNull();
  });
  
  it('should calculate credit ratio correctly', () => {
    const dailyEntries: DailyEntry[] = createDailyEntries(30, 5000, 3000);
    const creditEntries: CreditEntry[] = [
      { id: '1', customerName: 'A', amount: 10000, dueDate: '2024-01-20', isPaid: false, createdAt: '2024-01-10' },
      { id: '2', customerName: 'B', amount: 5000, dueDate: '2024-01-25', isPaid: false, createdAt: '2024-01-12' }
    ];
    
    const result = aggregateStressInputs({ dailyEntries, creditEntries });
    expect(result).not.toBeNull();
    // Total outstanding: 15000, Total sales: 5000 * 30 = 150000
    expect(result!.creditRatio).toBeCloseTo(0.1, 2);
  });
  
  it('should calculate cash buffer correctly', () => {
    const dailyEntries: DailyEntry[] = createDailyEntries(90, 5000, 3000);
    dailyEntries[0].cashInHand = 90000; // Latest entry
    
    const result = aggregateStressInputs({ dailyEntries, creditEntries: [] });
    expect(result).not.toBeNull();
    // Avg monthly expenses: (3000 * 90 / 90) * 30 = 90000
    expect(result!.cashBuffer).toBeCloseTo(1.0, 2);
  });
  
  it('should calculate expense volatility correctly', () => {
    const dailyEntries: DailyEntry[] = [
      ...createDailyEntries(15, 5000, 3000),
      ...createDailyEntries(15, 5000, 5000) // Higher expenses
    ];
    
    const result = aggregateStressInputs({ dailyEntries, creditEntries: [] });
    expect(result).not.toBeNull();
    expect(result!.expenseVolatility).toBeGreaterThan(0);
  });
  
  it('should handle zero sales gracefully', () => {
    const dailyEntries: DailyEntry[] = createDailyEntries(30, 0, 3000);
    const creditEntries: CreditEntry[] = [
      { id: '1', customerName: 'A', amount: 5000, dueDate: '2024-01-20', isPaid: false, createdAt: '2024-01-10' }
    ];
    
    const result = aggregateStressInputs({ dailyEntries, creditEntries });
    expect(result).not.toBeNull();
    expect(result!.creditRatio).toBe(0);
  });
  
  it('should only include unpaid credits', () => {
    const dailyEntries: DailyEntry[] = createDailyEntries(30, 5000, 3000);
    const creditEntries: CreditEntry[] = [
      { id: '1', customerName: 'A', amount: 10000, dueDate: '2024-01-20', isPaid: false, createdAt: '2024-01-10' },
      { id: '2', customerName: 'B', amount: 5000, dueDate: '2024-01-25', isPaid: true, createdAt: '2024-01-12', paidAt: '2024-01-24' }
    ];
    
    const result = aggregateStressInputs({ dailyEntries, creditEntries });
    expect(result).not.toBeNull();
    // Only unpaid credit (10000) should be counted
    expect(result!.creditRatio).toBeCloseTo(10000 / 150000, 2);
  });
  
});

// Helper function
function createDailyEntries(count: number, sales: number, expense: number): DailyEntry[] {
  const entries: DailyEntry[] = [];
  for (let i = 0; i < count; i++) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    entries.push({
      date: date.toISOString().split('T')[0],
      totalSales: sales,
      totalExpense: expense,
      estimatedProfit: sales - expense,
      expenseRatio: expense / sales,
      profitMargin: (sales - expense) / sales
    });
  }
  return entries;
}
```

### Integration Tests

**Location**: `/lib/finance/__tests__/index-calculation.integration.test.ts`

```typescript
describe('Index Calculation Integration Tests', () => {
  
  it('should calculate both indices from raw daily entries', async () => {
    // Create realistic daily entries
    const dailyEntries = createRealisticDailyEntries(60);
    const creditEntries = createRealisticCreditEntries();
    
    // Aggregate inputs
    const stressInputs = aggregateStressInputs({ dailyEntries, creditEntries });
    const affordabilityInputs = aggregateAffordabilityInputs(dailyEntries);
    
    expect(stressInputs).not.toBeNull();
    expect(affordabilityInputs).not.toBeNull();
    
    // Calculate indices
    const stressIndex = calculateStressIndex(
      stressInputs!.creditRatio,
      stressInputs!.cashBuffer,
      stressInputs!.expenseVolatility
    );
    
    const affordabilityIndex = calculateAffordabilityIndex(
      20000,
      affordabilityInputs!.avgMonthlyProfit
    );
    
    // Verify results
    expect(stressIndex.score).toBeGreaterThanOrEqual(0);
    expect(stressIndex.score).toBeLessThanOrEqual(100);
    expect(affordabilityIndex.score).toBeGreaterThanOrEqual(0);
    expect(affordabilityIndex.score).toBeLessThanOrEqual(100);
  });
  
  it('should handle complete offline calculation flow', async () => {
    // Simulate offline scenario
    const userId = 'test-user-123';
    
    // Load from localStorage
    const dailyEntries = loadDailyEntriesFromLocalStorage(userId);
    const creditEntries = loadCreditEntriesFromLocalStorage(userId);
    
    // Calculate
    const stressInputs = aggregateStressInputs({ dailyEntries, creditEntries });
    if (stressInputs) {
      const stressIndex = calculateStressIndex(
        stressInputs.creditRatio,
        stressInputs.cashBuffer,
        stressInputs.expenseVolatility
      );
      
      // Save to localStorage
      const indexData: IndexData = {
        userId,
        date: new Date().toISOString().split('T')[0],
        stressIndex,
        affordabilityIndex: null,
        dataPoints: stressInputs.dataPoints,
        calculationPeriod: stressInputs.calculationPeriod,
        createdAt: new Date().toISOString()
      };
      
      saveIndexToLocalStorage(indexData);
      
      // Verify saved
      const retrieved = getLatestIndexFromLocalStorage(userId);
      expect(retrieved).not.toBeNull();
      expect(retrieved!.stressIndex.score).toBe(stressIndex.score);
    }
  });
  
});
```

### Performance Tests

```typescript
describe('Index Calculation Performance', () => {
  
  it('should calculate stress index in under 10ms', () => {
    const start = performance.now();
    calculateStressIndex(0.35, 1.5, 0.25);
    const end = performance.now();
    
    expect(end - start).toBeLessThan(10);
  });
  
  it('should calculate affordability index in under 5ms', () => {
    const start = performance.now();
    calculateAffordabilityIndex(25000, 50000);
    const end = performance.now();
    
    expect(end - start).toBeLessThan(5);
  });
  
});
```


## Multi-Language Support

### Translation Keys

**Location**: `/lib/translations.ts` (additions)

```typescript
export const translations: Translations = {
  // ... existing translations
  
  // Stress Index
  'indices.stressIndex': {
    en: 'Stress Index',
    hi: 'तनाव सूचकांक',
    mr: 'ताण निर्देशांक',
  },
  'indices.stressScore': {
    en: 'Stress Score',
    hi: 'तनाव स्कोर',
    mr: 'ताण स्कोअर',
  },
  'indices.stressLow': {
    en: 'Low Stress',
    hi: 'कम तनाव',
    mr: 'कमी ताण',
  },
  'indices.stressMedium': {
    en: 'Moderate Stress',
    hi: 'मध्यम तनाव',
    mr: 'मध्यम ताण',
  },
  'indices.stressHigh': {
    en: 'High Stress',
    hi: 'उच्च तनाव',
    mr: 'उच्च ताण',
  },
  
  // Stress Components
  'indices.creditRatio': {
    en: 'Credit Ratio',
    hi: 'उधार अनुपात',
    mr: 'उधार प्रमाण',
  },
  'indices.cashBuffer': {
    en: 'Cash Buffer',
    hi: 'नकद बफर',
    mr: 'रोकड बफर',
  },
  'indices.expenseVolatility': {
    en: 'Expense Volatility',
    hi: 'खर्च अस्थिरता',
    mr: 'खर्च अस्थिरता',
  },
  
  // Affordability Index
  'indices.affordabilityIndex': {
    en: 'Affordability Index',
    hi: 'वहनीयता सूचकांक',
    mr: 'परवडणारी निर्देशांक',
  },
  'indices.affordabilityScore': {
    en: 'Affordability Score',
    hi: 'वहनीयता स्कोर',
    mr: 'परवडणारी स्कोअर',
  },
  'indices.plannedExpense': {
    en: 'Planned Expense',
    hi: 'नियोजित खर्च',
    mr: 'नियोजित खर्च',
  },
  'indices.enterAmount': {
    en: 'Enter amount you plan to spend',
    hi: 'वह राशि दर्ज करें जो आप खर्च करने की योजना बना रहे हैं',
    mr: 'तुम्ही खर्च करण्याची योजना आखत असलेली रक्कम प्रविष्ट करा',
  },
  'indices.checkAffordability': {
    en: 'Check Affordability',
    hi: 'वहनीयता जांचें',
    mr: 'परवडणारी तपासा',
  },
  
  // Affordability Categories
  'indices.easilyAffordable': {
    en: 'Easily Affordable',
    hi: 'आसानी से वहनीय',
    mr: 'सहज परवडणारे',
  },
  'indices.affordable': {
    en: 'Affordable',
    hi: 'वहनीय',
    mr: 'परवडणारे',
  },
  'indices.stretch': {
    en: 'Stretch',
    hi: 'खिंचाव',
    mr: 'ताणलेले',
  },
  'indices.risky': {
    en: 'Risky',
    hi: 'जोखिम भरा',
    mr: 'धोकादायक',
  },
  'indices.notRecommended': {
    en: 'Not Recommended',
    hi: 'अनुशंसित नहीं',
    mr: 'शिफारस केलेली नाही',
  },
  
  // Guidance Messages
  'indices.affordabilityGuidance.easilyAffordable': {
    en: 'This expense is well within your budget. You can comfortably afford it.',
    hi: 'यह खर्च आपके बजट के भीतर है। आप इसे आराम से वहन कर सकते हैं।',
    mr: 'हा खर्च तुमच्या बजेटमध्ये आहे. तुम्ही हे सहजपणे परवडू शकता.',
  },
  'indices.affordabilityGuidance.affordable': {
    en: 'This expense is affordable based on your current profit levels.',
    hi: 'आपके वर्तमान लाभ स्तर के आधार पर यह खर्च वहनीय है।',
    mr: 'तुमच्या सध्याच्या नफ्याच्या पातळीवर आधारित हा खर्च परवडणारा आहे.',
  },
  'indices.affordabilityGuidance.stretch': {
    en: 'This expense will stretch your budget. Plan carefully before proceeding.',
    hi: 'यह खर्च आपके बजट को खींचेगा। आगे बढ़ने से पहले सावधानी से योजना बनाएं।',
    mr: 'हा खर्च तुमचे बजेट ताणेल. पुढे जाण्यापूर्वी काळजीपूर्वक योजना करा.',
  },
  'indices.affordabilityGuidance.risky': {
    en: 'This expense exceeds your monthly profit. Consider postponing or reducing the amount.',
    hi: 'यह खर्च आपके मासिक लाभ से अधिक है। स्थगित करने या राशि कम करने पर विचार करें।',
    mr: 'हा खर्च तुमच्या मासिक नफ्यापेक्षा जास्त आहे. पुढे ढकलणे किंवा रक्कम कमी करण्याचा विचार करा.',
  },
  'indices.affordabilityGuidance.notRecommended': {
    en: 'This expense is not recommended. It significantly exceeds your profit capacity.',
    hi: 'यह खर्च अनुशंसित नहीं है। यह आपकी लाभ क्षमता से काफी अधिक है।',
    mr: 'हा खर्च शिफारस केलेला नाही. हे तुमच्या नफ्याच्या क्षमतेपेक्षा लक्षणीय जास्त आहे.',
  },
  
  // Insufficient Data
  'indices.insufficientData': {
    en: 'Not enough data to calculate indices. Please add at least 7 days of entries.',
    hi: 'सूचकांक की गणना के लिए पर्याप्त डेटा नहीं है। कृपया कम से कम 7 दिनों की प्रविष्टियां जोड़ें।',
    mr: 'निर्देशांक मोजण्यासाठी पुरेसा डेटा नाही. कृपया किमान 7 दिवसांच्या नोंदी जोडा.',
  },
  'indices.addMoreEntries': {
    en: 'Add more daily entries to see your financial health indices.',
    hi: 'अपने वित्तीय स्वास्थ्य सूचकांक देखने के लिए अधिक दैनिक प्रविष्टियां जोड़ें।',
    mr: 'तुमचे आर्थिक आरोग्य निर्देशांक पाहण्यासाठी अधिक दैनिक नोंदी जोडा.',
  },
  
  // Component Breakdown
  'indices.breakdown': {
    en: 'Score Breakdown',
    hi: 'स्कोर विवरण',
    mr: 'स्कोअर तपशील',
  },
  'indices.viewBreakdown': {
    en: 'View Breakdown',
    hi: 'विवरण देखें',
    mr: 'तपशील पहा',
  },
  'indices.hideBreakdown': {
    en: 'Hide Breakdown',
    hi: 'विवरण छुपाएं',
    mr: 'तपशील लपवा',
  },
  
  // Calculation Period
  'indices.calculatedFrom': {
    en: 'Calculated from',
    hi: 'से गणना की गई',
    mr: 'पासून मोजले',
  },
  'indices.dataPoints': {
    en: 'data points',
    hi: 'डेटा बिंदु',
    mr: 'डेटा पॉइंट्स',
  },
  'indices.lastUpdated': {
    en: 'Last updated',
    hi: 'अंतिम अपडेट',
    mr: 'शेवटचे अपडेट',
  },
  
  // Sync Status
  'indices.syncing': {
    en: 'Syncing indices...',
    hi: 'सूचकांक सिंक हो रहे हैं...',
    mr: 'निर्देशांक सिंक होत आहेत...',
  },
  'indices.syncSuccess': {
    en: 'Indices synced successfully',
    hi: 'सूचकांक सफलतापूर्वक सिंक किए गए',
    mr: 'निर्देशांक यशस्वीरित्या सिंक केले',
  },
  'indices.syncError': {
    en: 'Failed to sync indices. Will retry later.',
    hi: 'सूचकांक सिंक करने में विफल। बाद में पुनः प्रयास करेंगे।',
    mr: 'निर्देशांक सिंक करण्यात अयशस्वी. नंतर पुन्हा प्रयत्न करू.',
  },
  
};
```


## API Integration

### API Routes

#### Calculate Indices Endpoint

**Location**: `/app/api/indices/calculate/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { aggregateStressInputs, aggregateAffordabilityInputs } from '@/lib/finance/aggregateInputs';
import { calculateStressIndex } from '@/lib/finance/calculateStressIndex';
import { calculateAffordabilityIndex } from '@/lib/finance/calculateAffordabilityIndex';
import { IndexSyncManager } from '@/lib/index-sync';
import { t } from '@/lib/translations';

export async function POST(request: NextRequest) {
  try {
    const { userId, plannedCost, language = 'en' } = await request.json();
    
    if (!userId) {
      return NextResponse.json({
        success: false,
        code: 'MISSING_USER_ID',
        message: t('error.required', language)
      }, { status: 400 });
    }
    
    // Load historical data
    const syncManager = new IndexSyncManager();
    const dailyEntries = await syncManager.getDailyEntries(userId);
    const creditEntries = await syncManager.getCreditEntries(userId);
    
    // Aggregate inputs
    const stressInputs = aggregateStressInputs({ dailyEntries, creditEntries });
    
    if (!stressInputs) {
      return NextResponse.json({
        success: false,
        code: 'INSUFFICIENT_DATA',
        message: t('indices.insufficientData', language),
        requiredDays: 7,
        availableDays: dailyEntries.length
      }, { status: 400 });
    }
    
    // Calculate stress index
    const stressIndex = calculateStressIndex(
      stressInputs.creditRatio,
      stressInputs.cashBuffer,
      stressInputs.expenseVolatility
    );
    
    // Calculate affordability index if planned cost provided
    let affordabilityIndex = null;
    if (plannedCost && plannedCost > 0) {
      const affordabilityInputs = aggregateAffordabilityInputs(dailyEntries);
      if (affordabilityInputs) {
        affordabilityIndex = calculateAffordabilityIndex(
          plannedCost,
          affordabilityInputs.avgMonthlyProfit
        );
      }
    }
    
    // Create index data
    const indexData = {
      userId,
      date: new Date().toISOString().split('T')[0],
      stressIndex,
      affordabilityIndex,
      dataPoints: stressInputs.dataPoints,
      calculationPeriod: stressInputs.calculationPeriod,
      createdAt: new Date().toISOString()
    };
    
    // Save (handles online/offline automatically)
    await syncManager.saveIndex(indexData);
    
    return NextResponse.json({
      success: true,
      data: indexData
    });
    
  } catch (error) {
    console.error('Index calculation error:', error);
    return NextResponse.json({
      success: false,
      code: 'CALCULATION_ERROR',
      message: 'Failed to calculate indices'
    }, { status: 500 });
  }
}
```

#### Get Latest Indices Endpoint

**Location**: `/app/api/indices/latest/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { IndexSyncManager } from '@/lib/index-sync';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    
    if (!userId) {
      return NextResponse.json({
        success: false,
        code: 'MISSING_USER_ID',
        message: 'User ID is required'
      }, { status: 400 });
    }
    
    const syncManager = new IndexSyncManager();
    const latestIndex = await syncManager.getLatestIndex(userId);
    
    if (!latestIndex) {
      return NextResponse.json({
        success: false,
        code: 'NO_DATA',
        message: 'No index data found'
      }, { status: 404 });
    }
    
    return NextResponse.json({
      success: true,
      data: latestIndex
    });
    
  } catch (error) {
    console.error('Get latest index error:', error);
    return NextResponse.json({
      success: false,
      code: 'RETRIEVAL_ERROR',
      message: 'Failed to retrieve index data'
    }, { status: 500 });
  }
}
```

#### AI Explanation Endpoint

**Location**: `/app/api/indices/explain/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { buildIndexExplanationPrompt } from '@/lib/ai/prompts';
import { invokeBedrockModel } from '@/lib/bedrock-client';

export async function POST(request: NextRequest) {
  try {
    const { 
      stressIndex, 
      affordabilityIndex, 
      userProfile, 
      language = 'en' 
    } = await request.json();
    
    if (!stressIndex) {
      return NextResponse.json({
        success: false,
        code: 'MISSING_DATA',
        message: 'Stress index data is required'
      }, { status: 400 });
    }
    
    // Build prompt (no hardcoded prompts in routes)
    const prompt = buildIndexExplanationPrompt({
      stressIndex,
      affordabilityIndex,
      businessType: userProfile.businessType,
      explanationMode: userProfile.explanationMode || 'simple',
      language
    });
    
    // Invoke AI (centralized client)
    const explanation = await invokeBedrockModel(prompt);
    
    return NextResponse.json({
      success: true,
      data: {
        explanation,
        stressIndex,
        affordabilityIndex
      }
    });
    
  } catch (error) {
    console.error('AI explanation error:', error);
    return NextResponse.json({
      success: false,
      code: 'EXPLANATION_ERROR',
      message: 'Failed to generate explanation'
    }, { status: 500 });
  }
}
```


### AI Prompt Builder

**Location**: `/lib/ai/prompts.ts` (additions)

```typescript
/**
 * Build prompt for index explanation
 * 
 * NO HARDCODED PROMPTS IN ROUTES - all prompts built via helper functions
 */
export function buildIndexExplanationPrompt(params: {
  stressIndex: StressIndexResult;
  affordabilityIndex?: AffordabilityIndexResult | null;
  businessType: string;
  explanationMode: 'simple' | 'detailed';
  language: Language;
}): string {
  const { stressIndex, affordabilityIndex, businessType, explanationMode, language } = params;
  
  // Persona context
  const personaContext = getPersonaContext(businessType);
  
  // Explanation complexity
  const complexityInstruction = explanationMode === 'simple'
    ? 'Provide 2-3 bullet points with no jargon. Use short sentences.'
    : 'Provide 5-7 bullet points. Explain financial concepts like margin and cash flow.';
  
  // Language instruction
  const languageInstruction = language === 'hi' 
    ? 'Respond in Hindi.'
    : language === 'mr'
    ? 'Respond in Marathi.'
    : 'Respond in English.';
  
  const prompt = `You are a financial advisor for a ${personaContext.businessName} owner.

IMPORTANT: You are ONLY explaining pre-calculated metrics. DO NOT recalculate any values.

Stress Index: ${stressIndex.score}/100
- Credit Ratio Score: ${stressIndex.breakdown.creditRatioScore}/40
- Cash Buffer Score: ${stressIndex.breakdown.cashBufferScore}/35
- Expense Volatility Score: ${stressIndex.breakdown.expenseVolatilityScore}/25

Input Parameters:
- Credit Ratio: ${stressIndex.inputParameters.creditRatio.toFixed(2)}
- Cash Buffer: ${stressIndex.inputParameters.cashBuffer.toFixed(2)}
- Expense Volatility: ${stressIndex.inputParameters.expenseVolatility.toFixed(2)}

${affordabilityIndex ? `
Affordability Index: ${affordabilityIndex.score}/100
- Category: ${affordabilityIndex.breakdown.affordabilityCategory}
- Cost-to-Profit Ratio: ${affordabilityIndex.breakdown.costToProfitRatio.toFixed(2)}
- Planned Cost: ₹${affordabilityIndex.inputParameters.plannedCost}
- Avg Monthly Profit: ₹${affordabilityIndex.inputParameters.avgMonthlyProfit}
` : ''}

Explain what these scores mean for the business owner and provide actionable advice.

${complexityInstruction}
${languageInstruction}

Focus on:
1. What the stress score indicates about financial pressure
2. Which component is contributing most to stress
3. Practical steps to reduce stress
${affordabilityIndex ? '4. Whether the planned expense is wise given current financial health' : ''}

Remember: You are explaining, NOT calculating. Use the provided numbers as-is.`;

  return prompt;
}

/**
 * Get persona context for business type
 */
function getPersonaContext(businessType: string): { businessName: string; context: string } {
  const personas: Record<string, { businessName: string; context: string }> = {
    kirana: {
      businessName: 'kirana store',
      context: 'small retail shop selling daily essentials'
    },
    salon: {
      businessName: 'salon',
      context: 'beauty and grooming service business'
    },
    pharmacy: {
      businessName: 'pharmacy',
      context: 'medical store selling medicines and health products'
    },
    restaurant: {
      businessName: 'restaurant',
      context: 'food service business'
    },
    other: {
      businessName: 'small business',
      context: 'local business'
    }
  };
  
  return personas[businessType] || personas.other;
}
```


## UI Components

### Stress Index Display Component

**Location**: `/components/StressIndexDisplay.tsx`

```typescript
'use client';

import { StressIndexResult } from '@/lib/types';
import { t } from '@/lib/translations';
import { useState } from 'react';

interface StressIndexDisplayProps {
  stressIndex: StressIndexResult;
  language: Language;
}

export function StressIndexDisplay({ stressIndex, language }: StressIndexDisplayProps) {
  const [showBreakdown, setShowBreakdown] = useState(false);
  
  // Determine color based on score
  const getColor = (score: number): 'green' | 'yellow' | 'red' => {
    if (score <= 33) return 'green';
    if (score <= 66) return 'yellow';
    return 'red';
  };
  
  const color = getColor(stressIndex.score);
  const colorClasses = {
    green: 'bg-green-100 text-green-800 border-green-300',
    yellow: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    red: 'bg-red-100 text-red-800 border-red-300'
  };
  
  return (
    <div className="p-4 border rounded-lg">
      <h3 className="text-lg font-semibold mb-2">
        {t('indices.stressIndex', language)}
      </h3>
      
      {/* Score Display */}
      <div className={`p-6 rounded-lg border-2 ${colorClasses[color]}`}>
        <div className="text-4xl font-bold text-center">
          {stressIndex.score}
          <span className="text-xl">/100</span>
        </div>
        <div className="text-center mt-2">
          {color === 'green' && t('indices.stressLow', language)}
          {color === 'yellow' && t('indices.stressMedium', language)}
          {color === 'red' && t('indices.stressHigh', language)}
        </div>
      </div>
      
      {/* Breakdown Toggle */}
      <button
        onClick={() => setShowBreakdown(!showBreakdown)}
        className="mt-4 text-blue-600 hover:underline"
      >
        {showBreakdown 
          ? t('indices.hideBreakdown', language)
          : t('indices.viewBreakdown', language)
        }
      </button>
      
      {/* Component Breakdown */}
      {showBreakdown && (
        <div className="mt-4 space-y-2">
          <div className="flex justify-between">
            <span>{t('indices.creditRatio', language)}</span>
            <span className="font-semibold">
              {stressIndex.breakdown.creditRatioScore}/40
            </span>
          </div>
          <div className="flex justify-between">
            <span>{t('indices.cashBuffer', language)}</span>
            <span className="font-semibold">
              {stressIndex.breakdown.cashBufferScore}/35
            </span>
          </div>
          <div className="flex justify-between">
            <span>{t('indices.expenseVolatility', language)}</span>
            <span className="font-semibold">
              {stressIndex.breakdown.expenseVolatilityScore}/25
            </span>
          </div>
        </div>
      )}
      
      {/* Calculation Metadata */}
      <div className="mt-4 text-sm text-gray-600">
        {t('indices.lastUpdated', language)}: {' '}
        {new Date(stressIndex.calculatedAt).toLocaleString()}
      </div>
    </div>
  );
}
```

### Affordability Planning Component

**Location**: `/components/AffordabilityPlanner.tsx`

```typescript
'use client';

import { useState } from 'react';
import { AffordabilityIndexResult } from '@/lib/types';
import { t } from '@/lib/translations';

interface AffordabilityPlannerProps {
  userId: string;
  language: Language;
  onCalculate: (plannedCost: number) => Promise<AffordabilityIndexResult>;
}

export function AffordabilityPlanner({ userId, language, onCalculate }: AffordabilityPlannerProps) {
  const [plannedCost, setPlannedCost] = useState<string>('');
  const [result, setResult] = useState<AffordabilityIndexResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const handleCalculate = async () => {
    const cost = parseFloat(plannedCost);
    
    // Validation
    if (isNaN(cost) || cost <= 0) {
      setError(t('error.required', language));
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const affordabilityIndex = await onCalculate(cost);
      setResult(affordabilityIndex);
    } catch (err) {
      setError(t('indices.syncError', language));
    } finally {
      setLoading(false);
    }
  };
  
  const getColor = (score: number): 'green' | 'yellow' | 'red' => {
    if (score >= 67) return 'green';
    if (score >= 34) return 'yellow';
    return 'red';
  };
  
  const getGuidanceKey = (category: string): string => {
    const categoryMap: Record<string, string> = {
      'Easily Affordable': 'indices.affordabilityGuidance.easilyAffordable',
      'Affordable': 'indices.affordabilityGuidance.affordable',
      'Stretch': 'indices.affordabilityGuidance.stretch',
      'Risky': 'indices.affordabilityGuidance.risky',
      'Not Recommended': 'indices.affordabilityGuidance.notRecommended'
    };
    return categoryMap[category] || categoryMap['Not Recommended'];
  };
  
  return (
    <div className="p-4 border rounded-lg">
      <h3 className="text-lg font-semibold mb-4">
        {t('indices.affordabilityIndex', language)}
      </h3>
      
      {/* Input */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">
          {t('indices.plannedExpense', language)}
        </label>
        <input
          type="number"
          value={plannedCost}
          onChange={(e) => setPlannedCost(e.target.value)}
          placeholder={t('indices.enterAmount', language)}
          className="w-full p-2 border rounded"
          disabled={loading}
        />
        {error && (
          <p className="text-red-600 text-sm mt-1">{error}</p>
        )}
      </div>
      
      {/* Calculate Button */}
      <button
        onClick={handleCalculate}
        disabled={loading || !plannedCost}
        className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:bg-gray-400"
      >
        {loading 
          ? t('indices.syncing', language)
          : t('indices.checkAffordability', language)
        }
      </button>
      
      {/* Result Display */}
      {result && (
        <div className="mt-6">
          <div className={`p-6 rounded-lg border-2 ${
            getColor(result.score) === 'green' ? 'bg-green-100 text-green-800 border-green-300' :
            getColor(result.score) === 'yellow' ? 'bg-yellow-100 text-yellow-800 border-yellow-300' :
            'bg-red-100 text-red-800 border-red-300'
          }`}>
            <div className="text-4xl font-bold text-center">
              {result.score}
              <span className="text-xl">/100</span>
            </div>
            <div className="text-center mt-2 font-semibold">
              {t(`indices.${result.breakdown.affordabilityCategory.toLowerCase().replace(/ /g, '')}`, language)}
            </div>
          </div>
          
          {/* Guidance */}
          <div className="mt-4 p-4 bg-gray-50 rounded">
            <p className="text-sm">
              {t(getGuidanceKey(result.breakdown.affordabilityCategory), language)}
            </p>
          </div>
          
          {/* Breakdown */}
          <div className="mt-4 text-sm text-gray-600">
            <div className="flex justify-between">
              <span>Cost-to-Profit Ratio:</span>
              <span className="font-semibold">
                {result.breakdown.costToProfitRatio.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between mt-2">
              <span>Avg Monthly Profit:</span>
              <span className="font-semibold">
                ₹{result.inputParameters.avgMonthlyProfit.toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```


## Implementation Guidance

### File Structure

```
lib/
├── finance/
│   ├── calculateStressIndex.ts          # Pure stress calculation function
│   ├── calculateAffordabilityIndex.ts   # Pure affordability calculation function
│   ├── aggregateStressInputs.ts         # Data aggregation for stress inputs
│   ├── aggregateAffordabilityInputs.ts  # Data aggregation for affordability inputs
│   ├── statisticsUtils.ts               # Statistical utility functions
│   └── __tests__/
│       ├── calculateStressIndex.test.ts
│       ├── calculateStressIndex.property.test.ts
│       ├── calculateAffordabilityIndex.test.ts
│       ├── calculateAffordabilityIndex.property.test.ts
│       ├── aggregateStressInputs.test.ts
│       └── index-calculation.integration.test.ts
├── index-sync.ts                        # Sync manager for localStorage ↔ DynamoDB
├── ai/
│   └── prompts.ts                       # AI prompt builders (additions)
├── types.ts                             # Type definitions (additions)
└── translations.ts                      # Translation keys (additions)

app/
└── api/
    └── indices/
        ├── calculate/
        │   └── route.ts                 # POST - Calculate indices
        ├── latest/
        │   └── route.ts                 # GET - Get latest indices
        └── explain/
            └── route.ts                 # POST - AI explanation

components/
├── StressIndexDisplay.tsx               # Stress index UI component
├── AffordabilityPlanner.tsx             # Affordability planning UI
└── IndicesDashboard.tsx                 # Combined dashboard view
```

### Implementation Order

**Phase 1: Core Calculation Functions** (No dependencies)
1. Implement `statisticsUtils.ts` (mean, stdDev, sum, filter)
2. Implement `calculateStressIndex.ts` with validation
3. Implement `calculateAffordabilityIndex.ts` with validation
4. Write unit tests for both calculators
5. Write property-based tests for both calculators

**Phase 2: Data Aggregation** (Depends on Phase 1)
1. Implement `aggregateStressInputs.ts`
2. Implement `aggregateAffordabilityInputs.ts`
3. Write unit tests for aggregation functions
4. Write integration tests for end-to-end calculation

**Phase 3: Storage and Sync** (Depends on Phase 2)
1. Implement localStorage functions in `index-sync.ts`
2. Implement DynamoDB functions in `index-sync.ts`
3. Implement sync manager with conflict resolution
4. Test offline-first behavior

**Phase 4: API Routes** (Depends on Phase 3)
1. Implement `/api/indices/calculate` endpoint
2. Implement `/api/indices/latest` endpoint
3. Test API endpoints with mock data

**Phase 5: AI Integration** (Depends on Phase 4)
1. Implement prompt builder in `/lib/ai/prompts.ts`
2. Implement `/api/indices/explain` endpoint
3. Test AI explanation with mock Bedrock responses

**Phase 6: UI Components** (Depends on Phase 4)
1. Implement `StressIndexDisplay.tsx`
2. Implement `AffordabilityPlanner.tsx`
3. Implement `IndicesDashboard.tsx`
4. Add translations for all UI text
5. Test UI components with various data scenarios

**Phase 7: Integration** (Depends on all phases)
1. Integrate indices into main dashboard
2. Add automatic recalculation on daily entry changes
3. Add sync status indicators
4. Test complete user flows


### Critical Implementation Rules

**From vyapar-rules.md - MUST FOLLOW**:

1. **Deterministic Core (MANDATORY)**
   - All calculation functions MUST be pure TypeScript functions
   - NO AI dependency in calculations
   - NO network dependency in calculations
   - Fully offline capable
   - Fully unit testable
   - NO side effects

2. **File Organization**
   - All financial logic MUST be in `/lib/finance/`
   - All AI prompt building MUST be in `/lib/ai/`
   - NO business logic inside React components

3. **API Routes**
   - Use Next.js App Router
   - API routes MUST be inside `app/api/`
   - Use `export async function POST()` format
   - NO direct Bedrock calls without prompt builder

4. **DynamoDB**
   - Single-table design required
   - Partition key: `PK = USER#{user_id}`
   - Sort key: `SK = INDEX#{YYYY-MM-DD}`
   - NO in-memory business state in production

5. **Offline-First**
   - Use localStorage for all index data
   - Sync when online
   - Last-write-wins conflict resolution
   - UI must never block due to network issues

6. **Error Handling**
   - All APIs must return structured error format:
     ```json
     {
       "success": false,
       "code": "ERROR_CODE",
       "message": "Localized friendly message"
     }
     ```
   - NO stack traces exposed to client
   - NO raw console.log in production (use logger.ts)

7. **Testing**
   - Mandatory unit tests for `calculateStressIndex` and `calculateAffordabilityIndex`
   - Property-based tests using fast-check
   - Minimum 100 iterations per property test
   - Each test must reference design document property

8. **AI Layer**
   - AI is ONLY for explanation, NOT calculation
   - AI must NEVER recalculate metrics
   - AI must NEVER replace deterministic logic
   - Prompts must include persona identity and business context

### Performance Requirements

- Stress index calculation: < 10ms
- Affordability index calculation: < 5ms
- Dashboard render with indices: < 100ms
- Aggregation functions: < 50ms for 90 days of data

### Security Considerations

1. **Input Validation**
   - Validate all numeric inputs for NaN, undefined, negative values
   - Sanitize planned cost input before storage
   - Enforce user_id isolation for all queries

2. **Data Privacy**
   - Index data is user-specific (isolated by userId)
   - No cross-user data access
   - DynamoDB queries must always filter by PK = USER#{user_id}

3. **API Security**
   - Validate userId in all API requests
   - Return 400 for missing/invalid parameters
   - Return 401 for unauthorized access
   - Add body size limits to endpoints


## Integration Points

### Dashboard Integration

The indices integrate into the main Vyapar AI dashboard alongside existing health score:

```
┌─────────────────────────────────────────────────────────┐
│                    Vyapar AI Dashboard                   │
├─────────────────────────────────────────────────────────┤
│  Health Score: 75/100                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │ Stress Index │  │ Affordability│  │   Segment    │ │
│  │    45/100    │  │    Index     │  │  Benchmark   │ │
│  │   (Yellow)   │  │  (On Demand) │  │   (Optional) │ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
├─────────────────────────────────────────────────────────┤
│  Daily Entry Form                                       │
│  Credit Tracking                                        │
│  Daily Health Coach Suggestions                         │
└─────────────────────────────────────────────────────────┘
```

### Automatic Recalculation Triggers

Indices are automatically recalculated when:

1. **New Daily Entry Added**
   - Triggers stress index recalculation
   - Updates affordability inputs (avg monthly profit)
   - Saves new index data to localStorage + DynamoDB

2. **Credit Entry Added/Updated**
   - Triggers stress index recalculation (credit ratio changes)
   - No impact on affordability index

3. **Credit Marked as Paid**
   - Triggers stress index recalculation (credit ratio decreases)
   - May improve stress score

4. **User Requests Affordability Check**
   - On-demand calculation with user-provided planned cost
   - Does not trigger stress index recalculation

### Data Flow with Existing Features

```
Daily Entry Form
    ↓
Save to localStorage + DynamoDB
    ↓
Trigger Index Recalculation
    ↓
Calculate Stress Index (uses daily entries + credit entries)
    ↓
Save Index Data
    ↓
Update Dashboard Display
    ↓
(Optional) User Clicks "Explain"
    ↓
Send to AI Explanation Service
    ↓
Display Persona-Aware Explanation
```

### Health Score vs Stress Index

**Health Score** (existing):
- Measures overall business health
- Based on: profit margin, expense ratio, cash in hand, overdue credits
- Range: 0-100 (higher is better)
- Displayed prominently on dashboard

**Stress Index** (new):
- Measures financial pressure/risk
- Based on: credit ratio, cash buffer, expense volatility
- Range: 0-100 (higher is worse)
- Complements health score with risk assessment

**Relationship**:
- Low health score + high stress index = Critical situation
- High health score + low stress index = Healthy business
- High health score + high stress index = Profitable but risky
- Low health score + low stress index = Struggling but stable


## Demo Scenario

### User Flow for Demo

**Scenario**: Shop owner wants to buy a new refrigerator for ₹25,000

1. **View Current Stress Index**
   - User opens dashboard
   - Sees stress index: 45/100 (Yellow - Moderate Stress)
   - Clicks "View Breakdown" to see components:
     - Credit Ratio: 20/40 (moderate outstanding credits)
     - Cash Buffer: 15/35 (about 1 month of expenses in hand)
     - Expense Volatility: 10/25 (fairly stable expenses)

2. **Check Affordability**
   - User clicks "Check Affordability" button
   - Enters planned expense: ₹25,000
   - System calculates based on avg monthly profit: ₹50,000
   - Shows affordability score: 70/100 (Green - Affordable)
   - Category: "Affordable"
   - Guidance: "This expense is affordable based on your current profit levels."

3. **Get AI Explanation**
   - User clicks "Explain" button
   - AI provides persona-aware explanation (for kirana store owner):
     - "Your stress level is moderate. You have some outstanding credits that need attention."
     - "Your cash buffer covers about 1 month of expenses, which is acceptable but could be better."
     - "The refrigerator purchase is affordable - it's 50% of your monthly profit."
     - "Consider collecting some outstanding credits before making this purchase to improve your cash position."

4. **Make Decision**
   - User sees clear guidance: expense is affordable but stress is moderate
   - Decides to follow up on 2-3 overdue credits first
   - Plans to make purchase next week after collecting ₹10,000 in credits

### Demo Rehearsal Checklist

- [ ] User has at least 30 days of daily entries
- [ ] User has some credit entries (mix of paid and unpaid)
- [ ] Stress index calculates correctly and displays with color coding
- [ ] Affordability planner accepts input and calculates score
- [ ] Component breakdowns display correctly
- [ ] AI explanation generates persona-aware advice
- [ ] All text displays in user's preferred language (test Hindi/Marathi)
- [ ] Offline mode works (disconnect network, indices still calculate)
- [ ] Sync indicator shows correct status


## Summary

This design document specifies a complete implementation of the Stress & Affordability Index feature for Vyapar AI, following the Hybrid Intelligence Principle where deterministic TypeScript functions handle all calculations and AI provides only explanations.

### Key Design Decisions

1. **Pure Function Architecture**: All calculations are pure functions with no side effects, enabling offline operation and comprehensive testing

2. **Component-Based Scoring**: Both indices provide detailed breakdowns showing how each factor contributes to the final score, ensuring transparency and explainability

3. **Offline-First with Sync**: localStorage serves as the primary data store with automatic synchronization to DynamoDB when online, using last-write-wins conflict resolution

4. **Property-Based Testing**: Comprehensive test coverage using fast-check to verify universal properties across the input space, complemented by unit tests for specific scenarios

5. **Multi-Language Support**: Full translation support for English, Hindi, and Marathi across all UI elements and AI explanations

6. **Persona-Aware AI**: AI explanations adapt to business type (kirana, salon, pharmacy, restaurant) and explanation mode (simple/detailed)

### Architecture Highlights

- **Deterministic Core**: `/lib/finance/` contains all calculation logic (no AI, no network)
- **AI Layer**: `/lib/ai/prompts.ts` builds prompts for explanation only
- **Storage**: Single-table DynamoDB design with `PK = USER#{user_id}`, `SK = INDEX#{date}`
- **Sync**: Automatic background sync with manual trigger option
- **Performance**: Sub-10ms calculations enable real-time UI updates

### Compliance with vyapar-rules.md

✅ Deterministic-first architecture  
✅ Pure TypeScript functions in `/lib/finance/`  
✅ No AI in calculation logic  
✅ Offline-first with localStorage  
✅ Single-table DynamoDB design  
✅ Property-based testing approach  
✅ No business logic in React components  
✅ Prompt builders in `/lib/ai/`  
✅ Structured error responses  
✅ Multi-language support  

### Next Steps

Proceed to task creation phase to break down implementation into actionable development tasks.

