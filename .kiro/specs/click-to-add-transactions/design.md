# Click-to-Add Transactions - Design Document

## Overview

The Click-to-Add Transactions feature enables shop owners to quickly add financial transactions by uploading receipt images or CSV files. The system extracts transaction data using OCR (via AWS Bedrock Vision) or CSV parsing, stores pending transactions in localStorage for offline access, and presents them to users for confirmation before adding to daily entries.

### Key Design Principles

1. **Offline-First Architecture**: All pending transactions stored in localStorage, synced to DynamoDB when online
2. **User Confirmation Required**: No automatic transaction insertion - users must explicitly Add, defer (Later), or Discard
3. **Duplicate Prevention**: Deterministic hashing prevents showing the same transaction multiple times
4. **Integration with Existing Systems**: Reuses existing receipt-ocr-processor Lambda and DynamoDB session store
5. **Deterministic Core**: All parsing and validation logic is pure TypeScript - no AI dependency for data extraction decisions

### User Flow

```
Receipt/CSV Upload → Parse & Extract → Store in localStorage → Display Confirmation UI
                                                                         ↓
                                                    User Action: Add / Later / Discard
                                                                         ↓
                                        Add: Create Daily Entry → Sync to DynamoDB
                                        Later: Move to end of queue
                                        Discard: Remove permanently
```

## Architecture

### System Components

```mermaid
graph TB
    subgraph "Frontend (Next.js)"
        UI[Confirmation UI Component]
        Store[Transaction Store Service]
        Upload[File Upload Handler]
    end
    
    subgraph "API Routes"
        ReceiptAPI[/api/receipt-ocr]
        StatusAPI[/api/receipt-status]
        CSVAPI[/api/csv-parse]
        DailyAPI[/api/daily]
    end
    
    subgraph "Parsers (Deterministic)"
        OCRParser[OCR Result Parser]
        CSVParser[CSV Parser]
        DupDetector[Duplicate Detector]
    end
    
    subgraph "Storage"
        LocalStorage[(localStorage)]
        DynamoDB[(DynamoDB)]
    end
    
    subgraph "AWS Services"
        S3[S3 Receipts Bucket]
        Lambda[receipt-ocr-processor]
        Bedrock[Bedrock Vision]
    end
    
    UI --> Store
    UI --> Upload
    Upload --> ReceiptAPI
    Upload --> CSVAPI
    
    ReceiptAPI --> S3
    S3 --> Lambda
    Lambda --> Bedrock
    Lambda --> S3
    StatusAPI --> S3
    
    CSVAPI --> CSVParser
    StatusAPI --> OCRParser
    
    OCRParser --> DupDetector
    CSVParser --> DupDetector
    
    DupDetector --> Store
    Store --> LocalStorage
    Store --> DailyAPI
    DailyAPI --> DynamoDB
```

### Data Flow

#### Receipt Upload Flow

1. User uploads receipt image via Confirmation UI
2. Frontend calls `/api/receipt-ocr` with image file
3. API uploads image to S3 `vyapar-receipts-input` bucket
4. S3 event triggers `receipt-ocr-processor` Lambda
5. Lambda processes image with Bedrock Vision, extracts data, saves JSON to S3 `vyapar-receipts-output` bucket
6. Frontend polls `/api/receipt-status` for results
7. OCR Result Parser transforms Lambda output to InferredTransaction
8. Duplicate Detector checks for existing transaction
9. Transaction Store saves to localStorage
10. Confirmation UI displays transaction for user action

#### CSV Upload Flow

1. User uploads CSV file via Confirmation UI
2. Frontend calls `/api/csv-parse` with CSV file
3. CSV Parser extracts transactions from rows
4. Duplicate Detector checks each transaction
5. Transaction Store saves all valid transactions to localStorage
6. Confirmation UI displays first transaction for user action

#### Add Transaction Flow

1. User clicks "Add" on pending transaction
2. Transaction Store creates Daily Entry
3. Transaction Store removes from localStorage pending queue
4. Daily Entry synced to DynamoDB (if online) or queued for sync (if offline)
5. Confirmation UI displays next pending transaction

### Component Responsibilities

#### Confirmation UI Component (`components/PendingTransactionReview.tsx`)

- Display pending transactions one at a time
- Show transaction details: date, amount, type, vendor, category, source
- Provide Add/Later/Discard action buttons
- Allow inline editing of transaction fields
- Display transaction counter (X of Y)
- Handle empty state (no pending transactions)

#### Transaction Store Service (`lib/transaction-store.ts`)

- CRUD operations for pending transactions in localStorage
- Generate unique transaction IDs using deterministic hashing
- Sort transactions by created_at (descending)
- Move deferred transactions to end of queue
- Integrate with Duplicate Detector
- Create Daily Entry from confirmed transaction
- Trigger sync to DynamoDB

#### OCR Result Parser (`lib/parsers/ocr-result-parser.ts`)

- Parse JSON output from receipt-ocr-processor Lambda
- Extract: date, amount, vendor, items
- Infer type as 'expense' (default for receipts)
- Attempt category inference from vendor name keywords
- Generate unique ID from file hash + extracted data
- Return InferredTransaction object

#### CSV Parser (`lib/parsers/csv-parser.ts`)

- Detect CSV headers from first row
- Map header variations to standard fields
- Parse date fields (multiple format support)
- Parse amount fields (handle currency symbols, decimal separators)
- Map transaction type from various values
- Handle quoted fields with commas
- Skip invalid rows with logging
- Generate unique ID per row
- Return array of InferredTransaction objects

#### Duplicate Detector (`lib/parsers/duplicate-detector.ts`)

- Generate deterministic hash from transaction data
- Check against pending transactions in localStorage
- Check against recent Daily Entries (last 30 days)
- Return boolean: isDuplicate

#### File Upload Handler (`components/FileUploadHandler.tsx`)

- Handle receipt image uploads (JPEG, PNG, HEIC, max 10MB)
- Handle CSV file uploads (max 5MB, max 1000 rows)
- Display upload progress
- Show error messages
- Trigger appropriate API endpoint

## Components and Interfaces

### Core Data Types

```typescript
// Inferred transaction from OCR or CSV
interface InferredTransaction {
  id: string;                    // Deterministic hash
  date: string;                  // ISO date string (YYYY-MM-DD)
  type: 'expense' | 'sale';
  vendor_name?: string;
  category?: string;
  amount: number;
  source: 'receipt' | 'csv';
  created_at: string;            // ISO timestamp
  deferred_at?: string;          // ISO timestamp (if user clicked Later)
  raw_data?: any;                // Original OCR/CSV data for debugging
}

// Storage structure in localStorage
interface PendingTransactionStore {
  transactions: InferredTransaction[];
  last_updated: string;          // ISO timestamp
}

// OCR Lambda output format (existing)
interface OCRLambdaResult {
  success: boolean;
  filename: string;
  extractedData: {
    date: string;
    amount: number;
    vendor: string;
    items: string[];
  };
  processedAt: string;
  processingTimeMs: number;
  method: string;
}

// CSV row format (flexible headers)
interface CSVRow {
  [key: string]: string | number;
}

// Parsed CSV structure
interface ParsedCSVData {
  headers: string[];
  rows: CSVRow[];
  validCount: number;
  invalidCount: number;
  errors: string[];
}
```

### API Endpoints

#### POST `/api/receipt-ocr` (Existing - No Changes)

**Request:**
```typescript
FormData {
  file: File  // Image file (JPEG, PNG, HEIC)
}
```

**Response:**
```typescript
{
  success: boolean;
  message: string;
  filename: string;
  timestamp: number;
}
```

#### GET `/api/receipt-status?filename={filename}` (New)

**Query Parameters:**
- `filename`: S3 key of uploaded receipt

**Response:**
```typescript
{
  status: 'processing' | 'completed' | 'error';
  extractedData?: {
    date: string;
    amount: number;
    vendor: string;
    items: string[];
  };
  error?: string;
}
```

**Implementation:**
- Check S3 `vyapar-receipts-output` bucket for `{filename}.json`
- Parse JSON result from Lambda
- Return status and extracted data

#### POST `/api/csv-parse` (New)

**Request:**
```typescript
FormData {
  file: File  // CSV file (max 5MB, max 1000 rows)
}
```

**Response:**
```typescript
{
  success: boolean;
  transactions: InferredTransaction[];
  summary: {
    totalRows: number;
    validRows: number;
    invalidRows: number;
    errors: string[];
  };
  error?: string;
  code?: string;  // Error code (CSV_NO_DATA, CSV_INVALID_HEADERS, etc.)
}
```

**Validation:**
- File size ≤ 5MB
- Row count ≤ 1000
- Required headers: date, amount, type
- At least one valid row

### Service Interfaces

#### Transaction Store Service

```typescript
class TransactionStore {
  // Get all pending transactions (sorted by created_at desc)
  getPendingTransactions(): InferredTransaction[];
  
  // Get next transaction to display (excludes recently deferred)
  getNextTransaction(): InferredTransaction | null;
  
  // Add new inferred transaction (with duplicate check)
  addTransaction(transaction: Omit<InferredTransaction, 'id' | 'created_at'>): 
    { success: boolean; id?: string; isDuplicate?: boolean };
  
  // Add multiple transactions (bulk import from CSV)
  addTransactions(transactions: Omit<InferredTransaction, 'id' | 'created_at'>[]): 
    { success: boolean; added: number; duplicates: number };
  
  // Mark transaction as deferred (move to end of queue)
  deferTransaction(id: string): boolean;
  
  // Remove transaction permanently
  removeTransaction(id: string): boolean;
  
  // Create Daily Entry from transaction and remove from pending
  confirmTransaction(id: string, editedData?: Partial<InferredTransaction>): 
    Promise<{ success: boolean; dailyEntry?: DailyEntry }>;
  
  // Get transaction count
  getCount(): { total: number; pending: number; deferred: number };
  
  // Check if transaction is duplicate
  isDuplicate(transaction: Omit<InferredTransaction, 'id' | 'created_at'>): boolean;
}
```

#### OCR Result Parser

```typescript
class OCRResultParser {
  // Parse Lambda OCR result to InferredTransaction
  parse(ocrResult: OCRLambdaResult, fileHash: string): InferredTransaction;
  
  // Infer category from vendor name
  private inferCategory(vendorName: string): string | undefined;
  
  // Generate deterministic ID
  private generateId(fileHash: string, data: any): string;
}
```

#### CSV Parser

```typescript
class CSVParser {
  // Parse CSV file to InferredTransaction array
  parse(csvContent: string): ParsedCSVData;
  
  // Detect and map headers
  private detectHeaders(firstRow: string[]): Map<string, string>;
  
  // Parse single row to InferredTransaction
  private parseRow(row: CSVRow, headers: Map<string, string>, rowIndex: number): 
    InferredTransaction | null;
  
  // Parse date with multiple format attempts
  private parseDate(dateStr: string): string | null;
  
  // Parse amount (remove currency, handle decimals)
  private parseAmount(amountStr: string): number | null;
  
  // Map transaction type
  private parseType(typeStr: string): 'expense' | 'sale' | null;
  
  // Generate deterministic ID for CSV row
  private generateId(row: CSVRow, rowIndex: number): string;
}
```

#### Duplicate Detector

```typescript
class DuplicateDetector {
  // Check if transaction is duplicate
  isDuplicate(transaction: Omit<InferredTransaction, 'id' | 'created_at'>): boolean;
  
  // Generate deterministic hash for transaction
  generateHash(transaction: Omit<InferredTransaction, 'id' | 'created_at'>): string;
  
  // Check against pending transactions
  private checkPending(hash: string): boolean;
  
  // Check against recent Daily Entries (last 30 days)
  private checkRecentEntries(hash: string): boolean;
}
```

## Data Models

### localStorage Schema

#### Key: `pending_transactions`

```typescript
{
  transactions: [
    {
      id: "hash_abc123",
      date: "2024-01-15",
      type: "expense",
      vendor_name: "Reliance Fresh",
      category: "inventory",
      amount: 2464.00,
      source: "receipt",
      created_at: "2024-01-15T10:30:00.000Z",
      deferred_at: undefined,
      raw_data: { /* original OCR data */ }
    },
    // ... more transactions
  ],
  last_updated: "2024-01-15T10:30:00.000Z"
}
```

#### Key: `transaction_hashes` (for duplicate detection)

```typescript
{
  hashes: [
    "hash_abc123",
    "hash_def456",
    // ... more hashes
  ],
  last_cleaned: "2024-01-15T00:00:00.000Z"  // Clean old hashes daily
}
```

### DynamoDB Schema (Existing - No Changes)

Transactions are added as Daily Entries using existing schema:

```
PK: USER#{user_id}
SK: DAILY_ENTRY#{date}

Attributes:
- date: string
- totalSales: number
- totalExpense: number
- cashInHand: number
- estimatedProfit: number
- expenseRatio: number
- profitMargin: number
- transactions: [
    {
      id: string
      type: 'expense' | 'sale'
      amount: number
      vendor_name?: string
      category?: string
      source: 'manual' | 'receipt' | 'csv'
    }
  ]
```

### Hash Generation Algorithm

Deterministic hash ensures same transaction data always produces same ID:

```typescript
function generateTransactionHash(transaction: {
  date: string;
  amount: number;
  type: string;
  vendor_name?: string;
  source: string;
}): string {
  // Normalize data
  const normalized = {
    date: transaction.date,
    amount: Math.round(transaction.amount * 100), // Cents to avoid float issues
    type: transaction.type,
    vendor: (transaction.vendor_name || '').toLowerCase().trim(),
    source: transaction.source
  };
  
  // Create deterministic string
  const hashInput = JSON.stringify(normalized);
  
  // Generate hash (using crypto.subtle.digest or simple hash function)
  const hash = simpleHash(hashInput);
  
  return `txn_${hash}`;
}
```

## 
CSV Header Mapping

The CSV Parser supports flexible header variations to handle different CSV formats:

| Standard Field | Accepted Header Variations |
|---------------|---------------------------|
| date | "date", "Date", "DATE", "Transaction Date", "transaction_date", "txn_date" |
| amount | "amount", "Amount", "AMOUNT", "value", "Value", "total", "Total" |
| type | "type", "Type", "TYPE", "transaction_type", "txn_type", "category" |
| vendor_name | "vendor", "Vendor", "merchant", "Merchant", "shop", "Shop", "vendor_name" |
| category | "category", "Category", "expense_category", "type" |

### Date Format Support

The parser attempts multiple date formats in order:

1. ISO 8601: `YYYY-MM-DD`, `YYYY-MM-DDTHH:mm:ss`
2. Indian format: `DD-MM-YYYY`, `DD/MM/YYYY`, `DD.MM.YYYY`
3. US format: `MM-DD-YYYY`, `MM/DD/YYYY`
4. Short year: `DD-MM-YY`, `MM-DD-YY`

### Amount Parsing Rules

1. Remove currency symbols: ₹, Rs, Rs., INR, $
2. Remove thousand separators: commas
3. Handle decimal separators: period or comma
4. Parse negative amounts: prefix `-` or suffix `()`
5. Default to 0 if parsing fails (with warning)

### Transaction Type Mapping

| Input Value | Mapped Type |
|------------|-------------|
| "expense", "debit", "withdrawal", "payment", "out" | expense |
| "sale", "credit", "deposit", "income", "in" | sale |

## Error Handling

### Error Codes and Messages

#### Receipt OCR Errors

| Error Code | User Message | Technical Cause |
|-----------|-------------|----------------|
| OCR_TIMEOUT | "Receipt processing took too long. Please try again." | Lambda timeout (>30s) |
| OCR_UNREADABLE | "Could not read receipt. Please ensure the image is clear and well-lit." | Bedrock Vision low confidence |
| OCR_NO_DATA | "No transaction data found in receipt." | Empty extraction result |
| OCR_SERVICE_ERROR | "Receipt processing service temporarily unavailable." | AWS service error |
| OCR_INVALID_FILE | "Invalid file format. Please upload JPEG, PNG, or HEIC image." | Unsupported file type |
| OCR_FILE_TOO_LARGE | "Image file too large. Maximum size is 10MB." | File size > 10MB |

#### CSV Parsing Errors

| Error Code | User Message | Technical Cause |
|-----------|-------------|----------------|
| CSV_NO_DATA | "No valid transactions found in CSV file." | Zero valid rows |
| CSV_INVALID_HEADERS | "CSV file must contain 'date', 'amount', and 'type' columns." | Missing required headers |
| CSV_TOO_LARGE | "CSV file too large. Maximum size is 5MB." | File size > 5MB |
| CSV_TOO_MANY_ROWS | "CSV file has too many rows. Maximum is 1000 rows." | Row count > 1000 |
| CSV_PARSE_ERROR | "Failed to parse CSV file. Please check file format." | Malformed CSV |

#### Transaction Store Errors

| Error Code | User Message | Technical Cause |
|-----------|-------------|----------------|
| DUPLICATE_TRANSACTION | "This transaction has already been added." | Hash collision |
| STORAGE_FULL | "Cannot add more transactions. Please review pending transactions first." | >100 pending transactions |
| TRANSACTION_NOT_FOUND | "Transaction not found." | Invalid transaction ID |
| SYNC_FAILED | "Failed to sync transaction. Will retry when online." | Network error |

### Error Handling Strategy

#### Frontend Error Display

1. **Toast Notifications**: Brief errors (duplicate, not found)
2. **Inline Alerts**: Validation errors (file size, format)
3. **Modal Dialogs**: Critical errors (storage full, sync failed)
4. **Retry Buttons**: Transient errors (timeout, service unavailable)

#### Backend Error Logging

All errors logged with structured format:

```typescript
{
  timestamp: string;
  errorCode: string;
  errorMessage: string;
  userId?: string;
  context: {
    filename?: string;
    fileSize?: number;
    rowCount?: number;
    transactionId?: string;
  };
  stackTrace?: string;
}
```

#### Graceful Degradation

1. **OCR Failure**: Allow manual entry with pre-filled defaults
2. **CSV Parse Failure**: Show partial results with error summary
3. **Duplicate Detection Failure**: Allow user to manually confirm
4. **Sync Failure**: Queue for background sync, show offline indicator

### Validation Rules

#### Receipt Image Validation

- File type: JPEG, PNG, HEIC only
- File size: ≤ 10MB
- Minimum dimensions: 200x200 pixels (recommended)
- Maximum dimensions: 4096x4096 pixels

#### CSV File Validation

- File type: .csv, .txt with CSV content
- File size: ≤ 5MB
- Row count: ≤ 1000 rows
- Encoding: UTF-8 (with BOM detection)
- Required columns: date, amount, type

#### Transaction Data Validation

```typescript
interface TransactionValidation {
  date: {
    required: true;
    format: 'YYYY-MM-DD';
    range: [2020-01-01, today + 1 day];
  };
  amount: {
    required: true;
    type: 'number';
    min: 0.01;
    max: 1000000;
    decimals: 2;
  };
  type: {
    required: true;
    enum: ['expense', 'sale'];
  };
  vendor_name: {
    required: false;
    type: 'string';
    maxLength: 100;
  };
  category: {
    required: false;
    type: 'string';
    maxLength: 50;
  };
}
```

## Testing Strategy

### Dual Testing Approach

This feature requires both unit tests and property-based tests for comprehensive coverage:

- **Unit Tests**: Verify specific examples, edge cases, error conditions, and integration points
- **Property Tests**: Verify universal properties across all inputs using randomized test data

### Unit Testing Focus Areas

#### Parser Unit Tests

1. **OCR Result Parser**
   - Valid OCR result → InferredTransaction
   - Missing vendor → default "Unknown Vendor"
   - Invalid date → fallback to today
   - Category inference from vendor keywords
   - ID generation consistency

2. **CSV Parser**
   - Valid CSV with all columns → InferredTransaction array
   - Missing optional columns → partial data
   - Invalid rows → skip with warning
   - Header variations → correct mapping
   - Date format variations → correct parsing
   - Amount format variations → correct parsing
   - Type mapping variations → correct type

3. **Duplicate Detector**
   - Same transaction data → same hash
   - Different transaction data → different hash
   - Duplicate in pending → isDuplicate = true
   - Duplicate in recent entries → isDuplicate = true
   - No duplicate → isDuplicate = false

#### Transaction Store Unit Tests

1. **CRUD Operations**
   - Add transaction → appears in pending list
   - Defer transaction → moves to end of queue
   - Remove transaction → no longer in list
   - Confirm transaction → creates Daily Entry and removes from pending

2. **Duplicate Prevention**
   - Add duplicate → rejected with isDuplicate flag
   - Add after confirm → allowed (not in pending anymore)

3. **Queue Management**
   - Get next transaction → returns oldest non-deferred
   - All deferred → returns oldest deferred
   - Empty queue → returns null

#### API Endpoint Unit Tests

1. **POST /api/receipt-ocr** (existing tests)
2. **GET /api/receipt-status**
   - Processing → status: 'processing'
   - Completed → status: 'completed' with data
   - Error → status: 'error' with message
   - Not found → 404

3. **POST /api/csv-parse**
   - Valid CSV → success with transactions
   - Invalid headers → CSV_INVALID_HEADERS error
   - Too large → CSV_TOO_LARGE error
   - Too many rows → CSV_TOO_MANY_ROWS error
   - No valid rows → CSV_NO_DATA error
   - Partial success → success with error summary

#### Integration Tests

1. **Receipt Upload Flow**
   - Upload image → poll status → receive InferredTransaction → store in localStorage
2. **CSV Upload Flow**
   - Upload CSV → parse → store multiple transactions → display first
3. **Add Transaction Flow**
   - Confirm transaction → create Daily Entry → sync to DynamoDB → remove from pending
4. **Offline Sync Flow**
   - Add transaction offline → queue for sync → come online → sync to DynamoDB

### Property-Based Testing Configuration

- **Library**: fast-check (TypeScript/JavaScript property-based testing)
- **Iterations**: Minimum 100 runs per property test
- **Tagging**: Each test tagged with `Feature: click-to-add-transactions, Property {number}: {property_text}`

### Property-Based Testing Focus Areas

Property tests will be written after completing the Correctness Properties section. Each correctness property will be implemented as a property-based test with randomized inputs.

### Test Data Generators

For property-based tests, we need generators for:

```typescript
// Generate random InferredTransaction
fc.record({
  date: fc.date({ min: new Date('2020-01-01'), max: new Date() })
    .map(d => d.toISOString().split('T')[0]),
  type: fc.constantFrom('expense', 'sale'),
  amount: fc.float({ min: 0.01, max: 100000, noNaN: true })
    .map(n => Math.round(n * 100) / 100),
  vendor_name: fc.option(fc.string({ minLength: 2, maxLength: 50 })),
  category: fc.option(fc.constantFrom('inventory', 'rent', 'utilities', 'salary')),
  source: fc.constantFrom('receipt', 'csv')
});

// Generate random CSV content
fc.array(
  fc.record({
    date: fc.date().map(d => formatDate(d)),
    amount: fc.float({ min: 0.01, max: 10000 }),
    type: fc.constantFrom('expense', 'sale', 'debit', 'credit'),
    vendor: fc.option(fc.string({ minLength: 2, maxLength: 30 }))
  }),
  { minLength: 1, maxLength: 100 }
).map(rows => convertToCSV(rows));

// Generate random OCR result
fc.record({
  date: fc.string({ minLength: 8, maxLength: 10 }), // Various date formats
  amount: fc.float({ min: 1, max: 10000 }),
  vendor: fc.string({ minLength: 3, maxLength: 50 }),
  items: fc.array(fc.string({ minLength: 3, maxLength: 30 }), { minLength: 1, maxLength: 10 })
});
```

### Edge Cases to Test

1. **Date Edge Cases**
   - Leap year dates (Feb 29)
   - Year boundaries (Dec 31, Jan 1)
   - Invalid dates (Feb 30, Apr 31)
   - Future dates (today + 1)
   - Very old dates (< 2020)

2. **Amount Edge Cases**
   - Very small amounts (0.01)
   - Very large amounts (999999.99)
   - Zero amount (invalid)
   - Negative amounts (invalid)
   - Amounts with many decimals (123.456789)

3. **String Edge Cases**
   - Empty strings
   - Very long strings (>100 chars)
   - Special characters (emoji, unicode)
   - SQL injection attempts
   - XSS attempts

4. **CSV Edge Cases**
   - Empty file
   - Only headers, no data
   - Quoted fields with commas
   - Mixed line endings (CRLF, LF)
   - BOM marker
   - Extra columns
   - Missing columns

5. **Storage Edge Cases**
   - localStorage full
   - 100 pending transactions (limit)
   - Concurrent modifications
   - Corrupted data

### Mock Strategy

#### AWS Service Mocks

- **S3 Client**: Mock PutObjectCommand, GetObjectCommand
- **Bedrock Client**: Mock InvokeModelCommand with sample responses
- **Lambda**: Mock event triggers and responses

#### localStorage Mock

```typescript
class LocalStorageMock {
  private store: Map<string, string> = new Map();
  
  getItem(key: string): string | null {
    return this.store.get(key) || null;
  }
  
  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }
  
  removeItem(key: string): void {
    this.store.delete(key);
  }
  
  clear(): void {
    this.store.clear();
  }
}
```

### Test Coverage Goals

- **Unit Test Coverage**: ≥ 90% for parsers, store, and duplicate detector
- **Integration Test Coverage**: All critical user flows
- **Property Test Coverage**: All correctness properties from design
- **Edge Case Coverage**: All identified edge cases

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property Reflection

After analyzing all acceptance criteria, I identified several areas of redundancy:

1. **Storage Properties**: Multiple criteria test that transactions are stored in localStorage (1.4, 2.4, 3.1). These can be consolidated into a single property about persistence.

2. **Parser Output Structure**: Multiple criteria test that parsers return InferredTransaction objects (1.1, 9.7, 10.7). These can be combined into properties about parser output structure.

3. **UI Flow Properties**: Multiple criteria test that UI displays next transaction after actions (5.5, 6.3, 7.2). These can be combined into a single property about UI state transitions.

4. **Duplicate Detection**: Multiple criteria test duplicate detection (8.2, 8.3, 8.4). These can be consolidated into comprehensive duplicate detection properties.

5. **Date/Amount Parsing**: Multiple criteria test parsing flexibility (9.2, 9.3, 10.3, 10.4). These can be combined into round-trip properties.

The following properties represent the unique, non-redundant validation requirements:

### Property 1: Hash Determinism

*For any* transaction data (date, amount, type, vendor_name, source), generating a hash twice should produce identical IDs.

**Validates: Requirements 1.3, 8.1**

### Property 2: OCR Result Structure

*For any* valid OCR Lambda result, the OCR Result Parser should return an InferredTransaction object containing all required fields (id, date, type, amount, source='receipt') with correct types.

**Validates: Requirements 1.1, 9.7**

### Property 3: CSV Parser Structure

*For any* valid CSV row with required fields (date, amount, type), the CSV Parser should return an InferredTransaction object with source='csv' and all extracted fields.

**Validates: Requirements 2.1, 10.7**

### Property 4: CSV Header Mapping

*For any* CSV file with header variations (e.g., "Date", "date", "Transaction Date"), the CSV Parser should correctly map them to standard fields.

**Validates: Requirements 2.2, 10.1, 10.2**

### Property 5: Invalid Row Skipping

*For any* CSV file containing rows with missing required fields, the CSV Parser should skip invalid rows, continue processing valid rows, and return a summary with valid and invalid counts.

**Validates: Requirements 2.3, 8.5, 12.5**

### Property 6: Transaction Persistence

*For any* InferredTransaction added to the Transaction Store, it should appear in localStorage under the 'pending_transactions' key with a created_at timestamp.

**Validates: Requirements 1.4, 2.4, 3.1, 3.2**

### Property 7: Transaction Ordering

*For any* set of pending transactions with different created_at timestamps, retrieving them from the Transaction Store should return them sorted by created_at in descending order (newest first).

**Validates: Requirements 3.4**

### Property 8: Transaction Persistence Across Actions

*For any* pending transaction, it should remain in localStorage until the user explicitly takes an action (Add, Later, or Discard).

**Validates: Requirements 3.3**

### Property 9: Duplicate Detection - Pending

*For any* transaction, if an identical transaction (same hash) already exists in pending transactions, the Duplicate Detector should return isDuplicate=true and the Transaction Store should reject it.

**Validates: Requirements 8.2, 8.3**

### Property 10: Duplicate Detection - Recent Entries

*For any* transaction, if an identical transaction (same hash) exists in Daily Entries from the last 30 days, the Duplicate Detector should return isDuplicate=true.

**Validates: Requirements 8.4**

### Property 11: Add Transaction Creates Daily Entry

*For any* pending InferredTransaction, when the user confirms it (Add action), the system should create a Daily Entry with matching transaction data (date, amount, type, vendor_name, category).

**Validates: Requirements 5.1**

### Property 12: Add Transaction Removes from Pending

*For any* pending InferredTransaction, when the user confirms it (Add action), the Transaction Store should remove it from localStorage pending queue.

**Validates: Requirements 5.2**

### Property 13: Online Sync

*For any* confirmed transaction, when the system is online, it should sync the Daily Entry to DynamoDB immediately.

**Validates: Requirements 5.3**

### Property 14: Offline Queue

*For any* confirmed transaction, when the system is offline, it should queue the Daily Entry for sync and successfully sync it when connectivity is restored.

**Validates: Requirements 5.4**

### Property 15: Defer Adds Timestamp

*For any* pending InferredTransaction, when the user clicks "Later", the Transaction Store should update it with a deferred_at timestamp.

**Validates: Requirements 6.1**

### Property 16: Defer Moves to End

*For any* pending InferredTransaction, when the user clicks "Later", the transaction should move to the end of the queue (appear last when retrieving pending transactions).

**Validates: Requirements 6.2**

### Property 17: Defer Persistence

*For any* deferred transaction, it should remain in localStorage with its deferred_at timestamp across browser sessions (page reload).

**Validates: Requirements 6.5**

### Property 18: Discard Removes Permanently

*For any* pending InferredTransaction, when the user clicks "Discard", the Transaction Store should permanently remove it from localStorage.

**Validates: Requirements 7.1**

### Property 19: Discard No Sync

*For any* discarded transaction, the system should not sync it to DynamoDB.

**Validates: Requirements 7.3**

### Property 20: Discard Logging

*For any* discarded transaction, the system should log the discard action with transaction ID and timestamp.

**Validates: Requirements 7.4**

### Property 21: Date Format Flexibility

*For any* date string in common formats (DD/MM/YYYY, MM/DD/YYYY, YYYY-MM-DD, DD-MM-YYYY), the parsers should successfully parse it to ISO format (YYYY-MM-DD).

**Validates: Requirements 9.2, 10.3**

### Property 22: Amount Format Flexibility

*For any* amount string with currency symbols (₹, Rs, $) and various decimal separators (comma, period), the parsers should successfully extract the numeric value.

**Validates: Requirements 9.3, 10.4**

### Property 23: Transaction Type Mapping

*For any* type string from the set ("expense", "sale", "debit", "credit", "withdrawal", "deposit"), the CSV Parser should correctly map it to either 'expense' or 'sale'.

**Validates: Requirements 10.5**

### Property 24: Quoted Field Handling

*For any* CSV row with quoted fields containing commas, the CSV Parser should correctly parse the field without splitting on internal commas.

**Validates: Requirements 10.6**

### Property 25: Receipt Default Type

*For any* OCR result without an explicit type field, the OCR Result Parser should default the transaction type to 'expense'.

**Validates: Requirements 9.4**

### Property 26: Vendor Extraction

*For any* OCR result containing vendor information, the OCR Result Parser should extract the vendor_name field.

**Validates: Requirements 9.5**

### Property 27: Category Inference

*For any* vendor_name containing category keywords (e.g., "pharmacy", "restaurant", "salon"), the OCR Result Parser should infer the appropriate category.

**Validates: Requirements 9.6**

### Property 28: UI Transaction Display

*For any* pending InferredTransaction, the Confirmation UI should display all extracted fields (date, amount, type, vendor_name, category, source) in the rendered output.

**Validates: Requirements 4.1, 4.5**

### Property 29: UI Field Editing

*For any* pending InferredTransaction displayed in the Confirmation UI, editing any field (date, amount, type, vendor_name, category) should update the transaction data before confirmation.

**Validates: Requirements 4.3**

### Property 30: UI State Transition

*For any* pending transaction queue, after a user action (Add, Later, or Discard), the Confirmation UI should display the next pending transaction if one exists.

**Validates: Requirements 5.5, 6.3, 7.2**

### Property 31: Transaction Counter Accuracy

*For any* pending transaction queue, the Confirmation UI counter should display "X of Y" where X is the current position (excluding deferred) and Y is the total count (including deferred).

**Validates: Requirements 14.1, 14.5**

### Property 32: Counter Reactivity

*For any* change to the pending transaction queue (add, remove, defer), the transaction counter should update immediately to reflect the new count.

**Validates: Requirements 14.2**

### Property 33: Badge Display

*For any* pending transaction count > 0, the system should display a badge in the main navigation showing the count; when count = 0, the badge should be hidden.

**Validates: Requirements 14.3, 14.4**

### Property 34: OCR API Integration

*For any* receipt upload through the Confirmation UI, the system should call the /api/receipt-ocr endpoint and transform the response into an InferredTransaction object.

**Validates: Requirements 13.2, 13.3**

### Property 35: Error Logging Without Exposure

*For any* OCR or CSV parsing error, the system should log detailed error information for debugging but return only user-friendly error messages to the client.

**Validates: Requirements 11.5**


## Implementation Details

### File Structure

```
lib/
  parsers/
    ocr-result-parser.ts          # OCR Lambda result → InferredTransaction
    csv-parser.ts                  # CSV file → InferredTransaction[]
    duplicate-detector.ts          # Hash generation & duplicate checking
  transaction-store.ts             # localStorage CRUD for pending transactions
  daily-entry-sync.ts              # Existing sync logic (reuse)
  
components/
  PendingTransactionReview.tsx     # Main confirmation UI
  FileUploadHandler.tsx            # Receipt/CSV upload component
  TransactionCounter.tsx           # "X of Y" counter display
  
app/api/
  receipt-ocr/route.ts             # Existing endpoint (no changes)
  receipt-status/route.ts          # New: Poll for Lambda results
  csv-parse/route.ts               # New: Parse CSV file
```

### Key Algorithms

#### Deterministic Hash Generation

```typescript
import crypto from 'crypto';

function generateTransactionHash(transaction: {
  date: string;
  amount: number;
  type: string;
  vendor_name?: string;
  source: string;
}): string {
  // Normalize to prevent float precision issues
  const normalized = {
    date: transaction.date,
    amount: Math.round(transaction.amount * 100), // Convert to cents
    type: transaction.type.toLowerCase(),
    vendor: (transaction.vendor_name || '').toLowerCase().trim(),
    source: transaction.source
  };
  
  // Create deterministic string (sorted keys)
  const hashInput = JSON.stringify(normalized, Object.keys(normalized).sort());
  
  // Generate SHA-256 hash
  const hash = crypto.createHash('sha256').update(hashInput).digest('hex');
  
  // Return first 16 characters with prefix
  return `txn_${hash.substring(0, 16)}`;
}
```

#### CSV Header Detection

```typescript
function detectHeaders(firstRow: string[]): Map<string, string> {
  const headerMap = new Map<string, string>();
  
  const mappings = {
    date: ['date', 'transaction date', 'txn_date', 'transaction_date'],
    amount: ['amount', 'value', 'total', 'price'],
    type: ['type', 'transaction_type', 'txn_type', 'category'],
    vendor_name: ['vendor', 'merchant', 'shop', 'vendor_name', 'merchant_name'],
    category: ['category', 'expense_category', 'expense_type']
  };
  
  for (const header of firstRow) {
    const normalized = header.toLowerCase().trim();
    
    for (const [standardField, variations] of Object.entries(mappings)) {
      if (variations.includes(normalized)) {
        headerMap.set(header, standardField);
        break;
      }
    }
  }
  
  return headerMap;
}
```

#### Multi-Format Date Parser

```typescript
function parseDate(dateStr: string): string | null {
  const formats = [
    // ISO 8601
    /^(\d{4})-(\d{2})-(\d{2})/,
    // DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
    /^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})/,
    // MM/DD/YYYY (US format)
    /^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})/,
    // DD/MM/YY
    /^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2})$/
  ];
  
  for (const format of formats) {
    const match = dateStr.match(format);
    if (match) {
      // Parse based on format
      // ... (implementation details)
      return isoDate;
    }
  }
  
  return null; // Parsing failed
}
```

#### Queue Management for Deferred Transactions

```typescript
function getNextTransaction(): InferredTransaction | null {
  const transactions = getPendingTransactions();
  
  // First, try to get non-deferred transactions
  const nonDeferred = transactions.filter(t => !t.deferred_at);
  if (nonDeferred.length > 0) {
    return nonDeferred[0]; // Already sorted by created_at desc
  }
  
  // If all are deferred, return the oldest deferred (earliest deferred_at)
  const deferred = transactions.filter(t => t.deferred_at);
  if (deferred.length > 0) {
    return deferred.sort((a, b) => 
      new Date(a.deferred_at!).getTime() - new Date(b.deferred_at!).getTime()
    )[0];
  }
  
  return null; // No transactions
}
```

### Integration Points

#### With Existing Receipt OCR System

The feature integrates with the existing receipt-ocr-processor Lambda without modifications:

1. **Upload Flow**: Reuses `/api/receipt-ocr` endpoint
2. **S3 Buckets**: Uses existing `vyapar-receipts-input` and `vyapar-receipts-output` buckets
3. **Lambda Function**: No changes to `receipt-ocr-processor` code
4. **Result Format**: Transforms existing Lambda JSON output to InferredTransaction

#### With Daily Entry System

The feature integrates with the existing daily entry system:

1. **Data Structure**: Confirmed transactions added to existing Daily Entry format
2. **Sync Logic**: Reuses existing `daily-entry-sync.ts` for DynamoDB sync
3. **Offline Queue**: Leverages existing offline sync queue mechanism
4. **localStorage Keys**: Uses separate key for pending transactions to avoid conflicts

#### With DynamoDB Session Store

The feature stores transaction hashes for duplicate detection:

```
PK: USER#{user_id}
SK: TRANSACTION_HASH#{hash}

Attributes:
- hash: string
- created_at: string (ISO timestamp)
- ttl: number (30 days from creation)
```

This allows duplicate detection across devices and sessions.

### Performance Considerations

#### localStorage Limits

- Maximum 100 pending transactions per user (enforced)
- Estimated storage: ~50KB for 100 transactions
- Well within 5-10MB localStorage limits

#### CSV Parsing Performance

- Maximum 1000 rows enforced
- Streaming parser not required for this size
- Expected parse time: <500ms for 1000 rows

#### Duplicate Detection Performance

- Hash generation: O(1) per transaction
- Pending check: O(n) where n ≤ 100
- Recent entries check: O(m) where m ≤ 30 days of transactions
- Total: O(n + m), acceptable for small n and m

#### Polling Strategy for OCR Results

- Poll interval: 2 seconds
- Maximum attempts: 20 (40 seconds total)
- Exponential backoff not required (Lambda typically completes in 5-10 seconds)

### Security Considerations

#### File Upload Validation

- File type whitelist (MIME type checking)
- File size limits enforced server-side
- Virus scanning not in scope (hackathon limitation)

#### Input Sanitization

- All user-editable fields sanitized before storage
- XSS prevention via React's built-in escaping
- SQL injection not applicable (DynamoDB, localStorage)

#### Data Privacy

- Pending transactions stored locally (not synced until confirmed)
- Discarded transactions not sent to server
- OCR results stored in private S3 bucket with 7-day lifecycle

#### Rate Limiting

- Upload endpoints should have rate limits (not in scope for hackathon)
- DynamoDB write capacity monitoring

### Monitoring and Observability

#### Metrics to Track

- OCR success rate
- OCR processing time (p50, p95, p99)
- CSV parse success rate
- Duplicate detection rate
- Transaction confirmation rate (Add vs Later vs Discard)
- Sync failure rate

#### Logging Strategy

All operations logged with structured format:

```typescript
{
  timestamp: string;
  level: 'debug' | 'info' | 'warn' | 'error';
  operation: string;
  userId?: string;
  transactionId?: string;
  duration?: number;
  success: boolean;
  errorCode?: string;
  metadata?: Record<string, any>;
}
```

### Accessibility Considerations

- Keyboard navigation for Add/Later/Discard buttons
- Screen reader announcements for transaction count changes
- ARIA labels for all interactive elements
- Focus management when displaying next transaction
- High contrast mode support

### Localization

The feature supports English, Hindi, and Marathi:

- All UI text via translation keys
- Error messages localized
- Date format respects locale (display only, storage always ISO)
- Currency symbol based on user profile

### Future Enhancements (Out of Scope)

1. **Bulk Edit**: Edit multiple pending transactions at once
2. **Smart Categorization**: ML-based category prediction
3. **Receipt Image Preview**: Show thumbnail in confirmation UI
4. **Undo Discard**: 24-hour undo window for discarded transactions
5. **Export Pending**: Export pending transactions to CSV
6. **Voice Input**: Add transactions via voice commands
7. **Recurring Transactions**: Detect and suggest recurring patterns
8. **Multi-Currency**: Support for multiple currencies in CSV

