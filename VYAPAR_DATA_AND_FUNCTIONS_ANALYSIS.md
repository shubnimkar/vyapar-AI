# Vyapar AI - Complete Data Fields & Functions Analysis

## Executive Summary

This document provides a comprehensive analysis of all data fields required for Vyapar AI to function and all available functions in the application. This analysis is based on the codebase structure, type definitions, and implementation files.

---

## Part 1: Data Fields Required for Display

### 1.1 User Profile Data

**Required Fields:**
- `id` (string) - Unique user identifier
- `phoneNumber` (string) - User's phone number (authentication)
- `shopName` (string) - Business name
- `userName` (string) - Owner's name
- `language` (Language: 'en' | 'hi' | 'mr') - Preferred language
- `business_type` (BusinessType: 'kirana' | 'salon' | 'pharmacy' | 'restaurant' | 'other') - Business category
- `city_tier` (CityTier: 'tier1' | 'tier2' | 'tier3' | null) - Location classification
- `explanation_mode` ('simple' | 'detailed') - AI explanation complexity preference

**Optional Fields:**
- `deviceId` (string) - Device identifier
- `city` (string) - City name
- `subscriptionTier` ('free' | 'premium')
- `deletionRequestedAt` (string) - Account deletion timestamp
- `deletionScheduledAt` (string) - Scheduled deletion date

**Preferences:**
- `dataRetentionDays` (number: 30-365)
- `autoArchive` (boolean)
- `notificationsEnabled` (boolean)
- `currency` (string) - ISO 4217 code

**Status:**
- `createdAt` (string) - ISO timestamp
- `lastActiveAt` (string) - ISO timestamp
- `isActive` (boolean)

---

### 1.2 Daily Entry Data

**Core Financial Metrics:**
- `date` (string) - ISO date (YYYY-MM-DD)
- `totalSales` (number) - Total sales for the day
- `totalExpense` (number) - Total expenses for the day
- `cashInHand` (number, optional) - Available cash

**Calculated Metrics (Auto-computed):**
- `estimatedProfit` (number) - Sales - Expenses
- `expenseRatio` (number) - Expenses / Sales
- `profitMargin` (number) - Profit / Sales

**Metadata:**
- `entryId` (string) - Unique entry identifier
- `notes` (string, optional) - User notes
- `createdAt` (string) - ISO timestamp
- `updatedAt` (string) - ISO timestamp

**Daily Suggestions (Auto-generated):**
- Array of `DailySuggestion` objects (see section 1.7)

---

### 1.3 Credit Tracking Data

**Credit Entry Fields:**
- `id` (string) - Unique credit identifier
- `customerName` (string) - Customer name
- `amount` (number) - Credit amount
- `dateGiven` (string) - ISO date when credit was given
- `dueDate` (string) - ISO date when payment is due
- `isPaid` (boolean) - Payment status
- `phoneNumber` (string, optional) - For WhatsApp reminders
- `paidDate` (string, optional) - ISO date when paid
- `lastReminderAt` (string, optional) - Last reminder timestamp

**Calculated Fields (for Overdue Credits):**
- `daysOverdue` (number) - Days past due date
- `daysSinceReminder` (number | null) - Days since last reminder

**Credit Summary (Aggregated):**
- `totalOutstanding` (number) - Total unpaid credit
- `totalOverdue` (number) - Total overdue amount
- `overdueCount` (number) - Number of overdue customers

---

### 1.4 Health Score Data

**Health Score Breakdown:**
- `score` (number: 0-100) - Overall health score
- `marginScore` (number: 0-30) - Profit margin component
- `expenseScore` (number: 0-30) - Expense ratio component
- `cashScore` (number: 0-20) - Cash availability component
- `creditScore` (number: 0-20) - Credit management component

**Scoring Thresholds:**
- Margin: >20% = 30pts, >10% = 20pts, >0% = 10pts
- Expense: <60% = 30pts, <75% = 20pts, <90% = 10pts
- Cash: >0 = 20pts, >=0 = 10pts
- Credit: 0 overdue = 20pts, 1-2 overdue = 10pts, 3+ = 0pts

---

### 1.5 Stress Index Data

**Stress Index Result:**
- `score` (number: 0-100) - Overall stress score (higher = more stress)
- `calculatedAt` (string) - ISO timestamp

**Component Breakdown:**
- `creditRatioScore` (number: 0-40) - Credit exposure stress
- `cashBufferScore` (number: 0-35) - Cash reserve stress
- `expenseVolatilityScore` (number: 0-25) - Expense unpredictability stress

**Input Parameters (for transparency):**
- `creditRatio` (number) - Outstanding credits / Total sales
- `cashBuffer` (number) - Cash in hand / Avg monthly expenses
- `expenseVolatility` (number) - Std dev / Avg daily expense

**Visual Indicators:**
- Color: 'green' (0-33), 'yellow' (34-66), 'red' (67-100)
- Label: 'Low Stress', 'Moderate Stress', 'High Stress'
- Severity: 'low', 'medium', 'high'

---

### 1.6 Affordability Index Data

**Affordability Index Result:**
- `score` (number: 0-100) - Affordability score (higher = more affordable)
- `calculatedAt` (string) - ISO timestamp

**Component Breakdown:**
- `costToProfitRatio` (number) - Planned cost / Avg monthly profit
- `affordabilityCategory` (string) - Category label

**Categories:**
- 'Easily Affordable' (score >= 90)
- 'Affordable' (score >= 70)
- 'Stretch' (score >= 50)
- 'Risky' (score >= 30)
- 'Not Recommended' (score < 30)

**Input Parameters:**
- `plannedCost` (number) - Amount of planned expense
- `avgMonthlyProfit` (number) - Average monthly profit

**Visual Indicators:**
- Color: 'green' (>=70), 'yellow' (50-69), 'red' (<50)

---

### 1.7 Daily Suggestions Data

**Suggestion Fields:**
- `id` (string) - Unique suggestion ID
- `created_at` (string) - ISO timestamp
- `severity` ('critical' | 'warning' | 'info')
- `title` (string) - Localized title
- `description` (string) - Localized description
- `dismissed_at` (string, optional) - Dismissal timestamp

**Translation Keys (for real-time language switching):**
- `title_key` (string) - Translation key for title
- `description_key` (string) - Translation key for description
- `description_params` (object, optional) - Interpolation parameters

**Metadata:**
- `rule_type` ('high_credit' | 'margin_drop' | 'low_cash' | 'healthy_state')
- `context_data` (object, optional) - Additional context

**Suggestion Rules:**
1. High Credit: Credit > 40% of sales (critical)
2. Margin Drop: Current margin < 70% of 30-day avg (warning)
3. Low Cash: Cash buffer < 7 days (critical)
4. Healthy State: Score >= 70, no issues (info)

---

### 1.8 Segment Benchmark Data

**Segment Data:**
- `segmentKey` (string) - Format: SEGMENT#{tier}#{type}
- `medianHealthScore` (number: 0-100)
- `medianMargin` (number: 0-1) - e.g., 0.25 = 25%
- `sampleSize` (number) - Number of businesses in segment
- `lastUpdated` (string) - ISO timestamp

**Comparison Result:**
- `healthScoreComparison`:
  - `userValue` (number)
  - `segmentMedian` (number)
  - `percentile` (number: 0-100)
  - `category` ('above_average' | 'at_average' | 'below_average')
- `marginComparison`: (same structure)

**Visual Indicators:**
- Above Average: Green, ↑ icon
- At Average: Yellow, → icon
- Below Average: Red, ↓ icon

---

### 1.9 Inferred Transactions (Click-to-Add)

**Inferred Transaction Fields:**
- `id` (string) - Deterministic hash
- `date` (string) - ISO date (YYYY-MM-DD)
- `type` ('expense' | 'sale')
- `amount` (number)
- `source` ('receipt' | 'csv' | 'voice')
- `vendor_name` (string, optional)
- `category` (string, optional)
- `created_at` (string) - ISO timestamp
- `deferred_at` (string, optional) - If user clicked "Later"
- `raw_data` (any, optional) - Original OCR/CSV data

**User Actions:**
- Add: Confirm and add to daily entry
- Later: Defer decision (stored in localStorage)
- Discard: Permanently remove

---

### 1.10 Voice Entry Data

**Voice Upload:**
- `id` (string) - Unique upload ID
- `s3Key` (string) - S3 object key
- `status` ('processing' | 'completed' | 'failed')
- `errorMessage` (string | null)
- `createdAt` (string) - ISO timestamp
- `processedAt` (string | null)

**Extracted Voice Data:**
- `sales` (number | null)
- `expenses` (number | null)
- `expenseCategory` (string | null)
- `inventoryChanges` (string | null)
- `date` (string) - ISO date
- `confidence` (number: 0-1)

---

### 1.11 Cash Flow Prediction Data

**Daily Prediction:**
- `date` (string) - ISO date
- `predictedBalance` (number)
- `trend` ('up' | 'down' | 'stable')
- `confidence` (number: 0-1)
- `isNegative` (boolean) - Alert flag

**Prediction Result:**
- `predictions` (array of DailyPrediction)
- `insufficientData` (boolean)
- `historicalDays` (number) - Days of data used

---

### 1.12 Report Data

**Daily Report:**
- `id` (string) - Unique report ID
- `date` (string) - ISO date
- `generatedAt` (string) - ISO timestamp
- `totalSales` (number)
- `totalExpenses` (number)
- `netProfit` (number)
- `topExpenseCategories` (array of ExpenseCategory)
- `insights` (string) - AI-generated insights

**Report Automation:**
- `automationEnabled` (boolean)
- `reportTime` (string) - Scheduled time

---

### 1.13 Expense Alert Data

**Expense Alert:**
- `type` ('high_amount' | 'unusual_category' | 'unusual_timing')
- `explanation` (string)
- `severity` ('warning' | 'critical')
- `expenseAmount` (number)
- `category` (string)

---

## Part 2: All Available Functions

### 2.1 Deterministic Financial Calculations

**Core Calculations (`lib/calculations.ts`):**
- `calculateProfit(sales, expenses)` → number
- `calculateExpenseRatio(expenses, sales)` → number
- `calculateProfitMargin(profit, sales)` → number
- `calculateHealthScore(profitMargin, expenseRatio, cashInHand, creditSummary)` → HealthScoreResult
- `calculateCreditSummary(creditEntries)` → CreditSummary
- `calculateBlockedInventory(inventory)` → number
- `calculateDailyMetrics(totalSales, totalExpense)` → DailyCalculations

**Stress Index (`lib/finance/calculateStressIndex.ts`):**
- `validateStressInputs(creditRatio, cashBuffer, expenseVolatility)` → ValidationResult
- `calculateStressIndex(creditRatio, cashBuffer, expenseVolatility)` → StressIndexResult

**Affordability Index (`lib/finance/calculateAffordabilityIndex.ts`):**
- `validateAffordabilityInputs(plannedCost, avgMonthlyProfit)` → ValidationResult
- `calculateAffordabilityIndex(plannedCost, avgMonthlyProfit)` → AffordabilityIndexResult

**Daily Suggestions (`lib/finance/generateDailySuggestions.ts`):**
- `generateDailySuggestions(context)` → DailySuggestion[]
- `evaluateHighCreditRule(context)` → DailySuggestion | null
- `evaluateMarginDropRule(context)` → DailySuggestion | null
- `evaluateLowCashBufferRule(context)` → DailySuggestion | null
- `evaluateHealthyStateRule(context, hasOtherSuggestions)` → DailySuggestion | null

**Segment Benchmark (`lib/finance/`):**
- `compareWithSegment(userMetrics, segmentData)` → BenchmarkComparison
- `categorizePerformance(percentile)` → ComparisonCategory
- `calculatePercentile(userValue, segmentMedian)` → number

---

### 2.2 Data Sync Functions

**Daily Entry Sync (`lib/daily-entry-sync.ts`):**
- `getLocalEntries()` → LocalDailyEntry[]
- `saveLocalEntry(entry)` → void
- `getLocalEntry(date)` → LocalDailyEntry | null
- `deleteLocalEntry(date)` → void
- `createDailyEntry(date, sales, expense, cash, notes, markAsSynced)` → LocalDailyEntry
- `updateDailyEntry(date, updates, markAsSynced)` → LocalDailyEntry | null
- `syncPendingEntries(userId)` → Promise<{success, failed}>
- `pullEntriesFromCloud(userId)` → Promise<void>
- `fullSync(userId)` → Promise<{pulled, pushed, failed}>
- `instantSyncEntry(userId, entry)` → Promise<boolean>
- `clearLocalData()` → void

**Credit Sync (`lib/credit-sync.ts`):**
- `getLocalEntries()` → LocalCreditEntry[]
- `saveLocalEntry(entry)` → void
- `getLocalEntry(id)` → LocalCreditEntry | null
- `deleteLocalEntry(id)` → void
- `createCreditEntry(name, amount, dueDate, dateGiven, phone, markAsSynced)` → LocalCreditEntry
- `updateCreditEntry(id, updates, markAsSynced)` → LocalCreditEntry | null
- `markCreditAsPaid(id, markAsSynced)` → LocalCreditEntry | null
- `updateCreditReminder(creditId, userId, reminderAt)` → Promise<void>
- `syncPendingEntries(userId)` → Promise<{success, failed}>
- `pullEntriesFromCloud(userId)` → Promise<void>
- `fullSync(userId)` → Promise<{pulled, pushed, failed}>
- `instantSyncCreditEntry(userId, entry)` → Promise<boolean>
- `clearLocalData()` → void

**Index Sync (`lib/index-sync.ts`):**
- `saveIndexToLocalStorage(indexData)` → void
- `getLatestIndexFromLocalStorage(userId)` → IndexData | null
- `getHistoricalIndicesFromLocalStorage(userId, startDate, endDate)` → IndexData[]
- `saveIndexToDynamoDB(indexData)` → Promise<void>
- `getLatestIndexFromDynamoDB(userId)` → Promise<IndexData | null>
- `getHistoricalIndicesFromDynamoDB(userId, startDate, endDate)` → Promise<IndexData[]>
- `IndexSyncManager.saveIndex(indexData)` → Promise<void>
- `IndexSyncManager.getLatestIndex(userId)` → Promise<IndexData | null>
- `IndexSyncManager.syncPendingIndices(userId)` → Promise<SyncResult>
- `clearLocalData()` → void

---

### 2.3 AI Functions

**Prompt Builder (`lib/ai/prompt-builder.ts`):**
- `buildPersonaPrompt(context, promptType, data)` → PromptStructure
- `buildExplainPrompt(data, language)` → string
- `buildAnalyzePrompt(data, language)` → string
- `buildAskPrompt(data, language)` → string
- `buildIndexExplanationPrompt(context, data)` → PromptStructure
- `formatMetricsForPrompt(metrics)` → string

**AI Provider Abstraction (`lib/ai/`):**
- `BedrockProvider.generateText(prompt)` → Promise<string>
- `PuterProvider.generateText(prompt)` → Promise<string>
- `MockProvider.generateText(prompt)` → Promise<string>
- `FallbackOrchestrator.generateText(prompt, context)` → Promise<string>

**Benchmark Prompt Builder (`lib/ai/benchmarkPromptBuilder.ts`):**
- `buildBenchmarkExplanationPrompt(context, comparison)` → PromptStructure

---

### 2.4 Segment Benchmark Functions

**Benchmark Service (`lib/benchmarkService.ts`):**
- `BenchmarkService.getUserSegment(userProfile)` → {cityTier, businessType} | null
- `BenchmarkService.getSegmentData(cityTier, businessType)` → Promise<SegmentData | null>
- `BenchmarkService.getBenchmarkComparison(userProfile, userMetrics)` → Promise<BenchmarkComparison | null>

**Segment Store (`lib/segmentStore.ts`):**
- `SegmentStore.getSegmentData(cityTier, businessType)` → Promise<SegmentData | null>
- `SegmentStore.saveSegmentData(segmentData)` → Promise<void>

**Segment Cache Manager (`lib/segmentCacheManager.ts`):**
- `SegmentCacheManager.getFromCache(cityTier, businessType)` → CachedSegmentData | null
- `SegmentCacheManager.saveToCache(segmentData)` → void
- `SegmentCacheManager.isCacheStale(cachedData)` → boolean
- `SegmentCacheManager.clearCache()` → void

---

### 2.5 Credit Management Functions

**Credit Manager (`lib/credit-manager.ts`):**
- `getOverdueCredits(credits, thresholdDays)` → OverdueCredit[]
- `calculateOverdueStatus(credit, thresholdDays)` → OverdueStatus
- `sortOverdueCredits(credits)` → OverdueCredit[]

**Reminder Tracker (`lib/reminder-tracker.ts`):**
- `shouldShowReminder(credit, cooldownDays)` → boolean
- `canSendReminder(credit, cooldownDays)` → boolean
- `getDaysSinceReminder(credit)` → number | null

**WhatsApp Link Generator (`lib/whatsapp-link-generator.ts`):**
- `generateWhatsAppLink(config)` → string
- `formatReminderMessage(config)` → string

---

### 2.6 Utility Functions

**Logger (`lib/logger.ts`):**
- `logger.debug(message, context)` → void
- `logger.info(message, context)` → void
- `logger.warn(message, context)` → void
- `logger.error(message, context)` → void

**Error Utils (`lib/error-utils.ts`):**
- `formatErrorResponse(code, message, language)` → APIResponse
- `getLocalizedErrorMessage(code, language)` → string

**Translations (`lib/translations.ts`):**
- `t(key, language, params)` → string
- `getTranslation(key, language)` → string

**Username Validator (`lib/username-validator.ts`):**
- `validateUsername(username)` → ValidationResult
- `isValidUsernameFormat(username)` → boolean

**Duplicate Detector (`lib/duplicate-detector.ts`):**
- `isDuplicateTransaction(transaction, existingTransactions)` → boolean
- `generateTransactionHash(transaction)` → string

**CSV Parser (`lib/parsers/csv-parser.ts`):**
- `parseCSV(file)` → Promise<ParsedCSV>
- `inferTransactionsFromCSV(parsedData)` → InferredTransaction[]

**OCR Result Parser (`lib/parsers/ocr-result-parser.ts`):**
- `parseOCRResult(ocrData)` → InferredTransaction | null

---

### 2.7 API Endpoints

**Authentication:**
- `POST /api/auth/signup` - Create new user account
- `POST /api/auth/login` - User login
- `GET /api/auth/check-username` - Check username availability

**Daily Entries:**
- `POST /api/daily` - Create/update daily entry
- `GET /api/daily` - Get all daily entries for user

**Credit Tracking:**
- `POST /api/credit` - Create/update credit entry
- `GET /api/credit` - Get all credit entries for user
- `GET /api/credit/overdue` - Get overdue credits
- `PUT /api/credit/reminder` - Update reminder timestamp

**Indices:**
- `POST /api/indices/calculate` - Calculate stress/affordability indices
- `GET /api/indices/latest` - Get latest indices for user
- `POST /api/indices/explain` - Get AI explanation of indices

**Segment Benchmark:**
- `GET /api/benchmark` - Get benchmark comparison
- `POST /api/benchmark/explain` - Get AI explanation of benchmark

**AI Endpoints:**
- `POST /api/analyze` - Analyze business data
- `POST /api/ask` - Ask AI a question
- `POST /api/explain` - Explain a specific metric

**File Upload:**
- `POST /api/upload` - Upload CSV file
- `POST /api/receipt-ocr` - Upload receipt for OCR
- `GET /api/receipt-status` - Check OCR processing status
- `POST /api/voice-entry` - Upload voice recording

**Reports:**
- `GET /api/reports` - Get all reports
- `POST /api/reports/generate` - Generate new report

**Expense Alerts:**
- `POST /api/expense-alert` - Check for expense anomalies

**Cash Flow:**
- `POST /api/predict-cashflow` - Get cash flow predictions

**User Profile:**
- `GET /api/profile` - Get user profile
- `POST /api/profile/setup` - Setup user profile
- `PUT /api/profile` - Update user profile
- `POST /api/profile/delete` - Request account deletion
- `POST /api/profile/cancel-deletion` - Cancel deletion request

---

## Part 3: Data Flow Summary

### 3.1 Offline-First Architecture

**localStorage Keys:**
- `vyapar-daily-entries` - Daily financial entries
- `vyapar-credits` - Credit tracking entries
- `vyapar_indices` - Stress/affordability indices
- `vyapar-pending-transactions` - Inferred transactions awaiting confirmation
- `vyapar-segment-cache` - Cached segment benchmark data
- `vyapar-language` - User language preference
- `vyapar-business-type` - User business type
- `vyapar-explanation-mode` - AI explanation mode

**Sync Status:**
- `vyapar-daily-sync-status` - Daily entry sync metadata
- `vyapar-credit-sync-status` - Credit entry sync metadata

### 3.2 DynamoDB Schema

**Single-Table Design:**
- PK = `USER#{user_id}`
- SK patterns:
  - `DAILY_ENTRY#{date}` - Daily entries
  - `CREDIT#{credit_id}` - Credit entries
  - `INDEX#{date}` - Stress/affordability indices
  - `SESSION#{session_id}` - User sessions
  - `PROFILE` - User profile
  - `SEGMENT#{tier}#{type}` - Segment statistics

**TTL Fields:**
- Sessions: 2 hours
- Expired credits: Based on due date
- Temporary artifacts: 7-30 days

### 3.3 S3 Storage

**Buckets:**
- Receipts: 7-day lifecycle
- Voice recordings: 1-day lifecycle
- Reports: 30-day lifecycle

**Access:**
- Pre-signed URLs for uploads
- Lambda triggers for processing

---

## Part 4: Critical Data Dependencies

### 4.1 Minimum Data for Core Features

**Health Score:**
- Requires: totalSales, totalExpense, cashInHand (optional), creditEntries
- Calculates: profitMargin, expenseRatio, health score (0-100)

**Daily Suggestions:**
- Requires: health_score, total_sales, total_expenses, total_credit_outstanding, current_margin, avg_margin_last_30_days, cash_buffer_days
- Generates: 0-4 suggestions based on rules

**Stress Index:**
- Requires: creditRatio, cashBuffer, expenseVolatility
- Needs: 30+ days of historical data for accurate calculation

**Affordability Index:**
- Requires: plannedCost, avgMonthlyProfit
- Needs: 30+ days of historical data for profit average

**Segment Benchmark:**
- Requires: city_tier, business_type, healthScore, profitMargin
- Needs: Segment data from DynamoDB or cache

**Udhaar Follow-up:**
- Requires: creditEntries with dueDate, isPaid, lastReminderAt
- Filters: Overdue credits (>= threshold days)

---

## Part 5: Demo Data Requirements

### 5.1 Sample Data Scenarios

**Scenario 1: High Credit Ratio**
- Sales: ₹10,000
- Expenses: ₹6,000
- Credit Outstanding: ₹5,000 (50% of sales)
- Expected: Critical "high_credit" suggestion

**Scenario 2: Margin Drop**
- Current Margin: 20%
- 30-day Average: 35%
- Expected: Warning "margin_drop" suggestion

**Scenario 3: Low Cash Buffer**
- Cash in Hand: ₹25,000
- Daily Expenses: ₹5,000
- Buffer: 5 days
- Expected: Critical "low_cash" suggestion

**Scenario 4: Healthy State**
- Health Score: 80
- No issues detected
- Expected: Info "healthy_state" suggestion with optimization tip

**Scenario 5: Multiple Issues**
- High credit + Margin drop + Low cash
- Expected: Multiple suggestions sorted by severity

---

## Conclusion

This analysis provides a complete map of:
1. All data fields required for Vyapar AI to display information
2. All available functions for data processing and business logic
3. Data flow patterns (offline-first, sync, caching)
4. Critical dependencies for each feature
5. Demo data scenarios for testing

The application follows a **Hybrid Intelligence** architecture where:
- **Deterministic Core**: All financial calculations are pure TypeScript functions
- **AI Layer**: Only explains pre-calculated metrics, never computes them
- **Offline-First**: All data stored in localStorage with DynamoDB sync when online
- **Last-Write-Wins**: Conflict resolution based on timestamps

All functions are designed to be:
- Pure (no side effects)
- Testable (unit and property-based tests)
- Deterministic (same input = same output)
- Offline-capable (no network dependency for core logic)
