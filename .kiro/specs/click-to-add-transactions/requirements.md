# Requirements Document

## Introduction

The Click-to-Add Transactions feature enables users to quickly add financial transactions inferred from receipt images (OCR) or CSV file uploads. The system presents inferred transactions to users for confirmation before adding them to daily entries, supporting offline-first architecture with localStorage persistence and preventing duplicate prompts.

## Glossary

- **Inferred_Transaction**: A transaction extracted from a receipt image or CSV file that requires user confirmation before being added to daily entries
- **Transaction_Store**: The localStorage-based storage system that persists pending inferred transactions
- **OCR_Processor**: The AWS Lambda function that extracts transaction data from receipt images
- **CSV_Parser**: The component that extracts transaction data from uploaded CSV files
- **Confirmation_UI**: The user interface component that displays Add/Later/Discard options for inferred transactions
- **Daily_Entry**: A confirmed financial transaction record (expense or sale) stored in the user's daily financial data
- **Duplicate_Detector**: The component that prevents showing the same inferred transaction multiple times

## Requirements

### Requirement 1: Infer Transactions from Receipt Images

**User Story:** As a shop owner, I want to upload receipt photos, so that I can quickly add expenses without manual data entry.

#### Acceptance Criteria

1. WHEN a receipt image is uploaded, THE OCR_Processor SHALL extract transaction data and return an Inferred_Transaction with id, date, type, vendor_name, category, amount, and source set to 'receipt'
2. IF the OCR_Processor cannot extract required fields (date, amount, type), THEN THE System SHALL return a descriptive error message
3. THE Inferred_Transaction SHALL include a unique id generated from the source file hash and timestamp
4. WHEN OCR processing completes, THE Transaction_Store SHALL persist the Inferred_Transaction to localStorage
5. THE System SHALL support image formats: JPEG, PNG, and HEIC with maximum file size of 10MB

### Requirement 2: Infer Transactions from CSV Files

**User Story:** As a shop owner, I want to upload CSV files from my bank or accounting software, so that I can bulk import transactions efficiently.

#### Acceptance Criteria

1. WHEN a CSV file is uploaded, THE CSV_Parser SHALL extract transaction data and return one or more Inferred_Transaction objects with source set to 'csv'
2. THE CSV_Parser SHALL support CSV files with columns: date, amount, type, vendor_name (optional), category (optional)
3. IF a CSV row is missing required fields (date, amount, type), THEN THE CSV_Parser SHALL skip that row and log a warning
4. WHEN CSV parsing completes, THE Transaction_Store SHALL persist all valid Inferred_Transaction objects to localStorage
5. THE System SHALL support CSV files with maximum size of 5MB and maximum 1000 rows

### Requirement 3: Store Pending Transactions Offline

**User Story:** As a shop owner, I want inferred transactions to be available offline, so that I can review and add them even without internet connectivity.

#### Acceptance Criteria

1. THE Transaction_Store SHALL persist all Inferred_Transaction objects to localStorage under the key 'pending_transactions'
2. WHEN storing an Inferred_Transaction, THE Transaction_Store SHALL include a created_at timestamp
3. THE Transaction_Store SHALL maintain pending transactions until the user takes action (Add, Later, or Discard)
4. WHEN retrieving pending transactions, THE Transaction_Store SHALL return them sorted by created_at in descending order
5. THE Transaction_Store SHALL support storing up to 100 pending transactions per user

### Requirement 4: Display Confirmation UI

**User Story:** As a shop owner, I want to review inferred transactions before they are added, so that I can verify accuracy and make corrections.

#### Acceptance Criteria

1. WHEN pending Inferred_Transaction objects exist, THE Confirmation_UI SHALL display them one at a time with all extracted fields visible
2. THE Confirmation_UI SHALL provide three action buttons: "Add", "Later", and "Discard"
3. THE Confirmation_UI SHALL allow users to edit transaction fields (date, amount, type, vendor_name, category) before adding
4. WHEN no pending transactions exist, THE Confirmation_UI SHALL display a message indicating no pending transactions
5. THE Confirmation_UI SHALL display the transaction source (receipt or csv) as a visual indicator

### Requirement 5: Add Confirmed Transactions

**User Story:** As a shop owner, I want to add confirmed transactions to my daily entries, so that they are included in my financial tracking.

#### Acceptance Criteria

1. WHEN the user clicks "Add" on an Inferred_Transaction, THE System SHALL create a Daily_Entry with the transaction data
2. WHEN a Daily_Entry is created, THE Transaction_Store SHALL remove the corresponding Inferred_Transaction from localStorage
3. THE System SHALL sync the new Daily_Entry to DynamoDB when online
4. WHILE offline, THE System SHALL queue the Daily_Entry for sync when connectivity is restored
5. WHEN the Add action completes, THE Confirmation_UI SHALL display the next pending transaction if available

### Requirement 6: Defer Transaction Review

**User Story:** As a shop owner, I want to skip reviewing a transaction temporarily, so that I can come back to it later when I have more time.

#### Acceptance Criteria

1. WHEN the user clicks "Later" on an Inferred_Transaction, THE Transaction_Store SHALL update the transaction with a deferred_at timestamp
2. THE Transaction_Store SHALL move the deferred transaction to the end of the pending queue
3. THE Confirmation_UI SHALL display the next pending transaction immediately after deferring
4. WHEN all pending transactions have been deferred, THE Confirmation_UI SHALL display the oldest deferred transaction
5. THE System SHALL preserve deferred transactions across browser sessions

### Requirement 7: Discard Unwanted Transactions

**User Story:** As a shop owner, I want to discard incorrect or irrelevant inferred transactions, so that they don't clutter my pending list.

#### Acceptance Criteria

1. WHEN the user clicks "Discard" on an Inferred_Transaction, THE Transaction_Store SHALL permanently remove it from localStorage
2. THE Confirmation_UI SHALL display the next pending transaction immediately after discarding
3. THE System SHALL not sync discarded transactions to DynamoDB
4. WHEN a transaction is discarded, THE System SHALL log the discard action with transaction id and timestamp
5. THE System SHALL not allow undoing a discard action (hackathon scope limitation)

### Requirement 8: Prevent Duplicate Transaction Prompts

**User Story:** As a shop owner, I want to avoid seeing the same transaction multiple times, so that I don't accidentally add duplicates.

#### Acceptance Criteria

1. WHEN generating an Inferred_Transaction id, THE System SHALL use a deterministic hash of source file content and extracted data
2. BEFORE storing an Inferred_Transaction, THE Duplicate_Detector SHALL check if an identical id already exists in pending transactions
3. IF a duplicate id is detected, THEN THE System SHALL skip storing the Inferred_Transaction and notify the user
4. THE Duplicate_Detector SHALL check against both pending transactions and recently added Daily_Entry records (last 30 days)
5. WHEN a duplicate is detected from a CSV file, THE System SHALL continue processing remaining rows

### Requirement 9: Parse Receipt OCR Results

**User Story:** As a developer, I want a standardized parser for OCR results, so that the system consistently handles receipt data.

#### Acceptance Criteria

1. THE OCR_Result_Parser SHALL parse text output from the OCR_Processor Lambda function
2. THE OCR_Result_Parser SHALL extract date using common date formats (DD/MM/YYYY, MM/DD/YYYY, YYYY-MM-DD)
3. THE OCR_Result_Parser SHALL extract amount by identifying currency symbols and numeric patterns
4. THE OCR_Result_Parser SHALL infer transaction type as 'expense' by default for receipts
5. THE OCR_Result_Parser SHALL extract vendor_name from the first line of text or merchant name field
6. THE OCR_Result_Parser SHALL attempt to categorize transactions based on vendor_name keywords (e.g., "pharmacy", "restaurant")
7. FOR ALL valid OCR results, THE OCR_Result_Parser SHALL return an Inferred_Transaction object

### Requirement 10: Parse CSV File Format

**User Story:** As a developer, I want a standardized CSV parser, so that the system handles various CSV formats consistently.

#### Acceptance Criteria

1. THE CSV_Parser SHALL detect CSV headers automatically from the first row
2. THE CSV_Parser SHALL map common header variations to standard fields (e.g., "Date", "Transaction Date", "date" all map to date field)
3. THE CSV_Parser SHALL parse date fields using multiple format attempts (DD/MM/YYYY, MM/DD/YYYY, YYYY-MM-DD, ISO 8601)
4. THE CSV_Parser SHALL parse amount fields by removing currency symbols and handling both comma and period decimal separators
5. THE CSV_Parser SHALL map transaction type from values: "expense", "sale", "debit", "credit", "withdrawal", "deposit"
6. THE CSV_Parser SHALL handle quoted fields containing commas correctly
7. FOR ALL valid CSV rows, THE CSV_Parser SHALL return an Inferred_Transaction object

### Requirement 11: Handle OCR Processing Errors

**User Story:** As a shop owner, I want clear error messages when receipt processing fails, so that I understand what went wrong and can retry.

#### Acceptance Criteria

1. IF the OCR_Processor Lambda times out, THEN THE System SHALL return error code 'OCR_TIMEOUT' with message "Receipt processing took too long. Please try again."
2. IF the receipt image is unreadable, THEN THE System SHALL return error code 'OCR_UNREADABLE' with message "Could not read receipt. Please ensure the image is clear and well-lit."
3. IF the OCR_Processor returns no data, THEN THE System SHALL return error code 'OCR_NO_DATA' with message "No transaction data found in receipt."
4. IF AWS Textract service is unavailable, THEN THE System SHALL return error code 'OCR_SERVICE_ERROR' with message "Receipt processing service temporarily unavailable."
5. WHEN an OCR error occurs, THE System SHALL log the error details for debugging without exposing them to the user

### Requirement 12: Handle CSV Parsing Errors

**User Story:** As a shop owner, I want clear error messages when CSV upload fails, so that I can fix the file and retry.

#### Acceptance Criteria

1. IF the CSV file has no valid rows, THEN THE System SHALL return error code 'CSV_NO_DATA' with message "No valid transactions found in CSV file."
2. IF the CSV file has invalid headers, THEN THE System SHALL return error code 'CSV_INVALID_HEADERS' with message "CSV file must contain 'date', 'amount', and 'type' columns."
3. IF the CSV file exceeds size limits, THEN THE System SHALL return error code 'CSV_TOO_LARGE' with message "CSV file too large. Maximum size is 5MB."
4. IF the CSV file exceeds row limits, THEN THE System SHALL return error code 'CSV_TOO_MANY_ROWS' with message "CSV file has too many rows. Maximum is 1000 rows."
5. WHEN CSV parsing completes with some invalid rows, THE System SHALL return a summary showing successful and failed row counts

### Requirement 13: Integrate with Existing Receipt OCR System

**User Story:** As a developer, I want to reuse the existing receipt-ocr-processor Lambda, so that we maintain consistency and avoid duplication.

#### Acceptance Criteria

1. THE System SHALL use the existing receipt-ocr-processor Lambda function for OCR processing
2. WHEN a receipt is uploaded via the Confirmation_UI, THE System SHALL call the existing /api/receipt-ocr endpoint
3. THE System SHALL transform the receipt-ocr API response into an Inferred_Transaction object
4. THE System SHALL preserve all existing receipt OCR functionality (S3 upload, Textract processing, cleanup)
5. THE System SHALL not modify the receipt-ocr-processor Lambda code unless required for Inferred_Transaction format

### Requirement 14: Provide Transaction Count Indicator

**User Story:** As a shop owner, I want to see how many pending transactions I have, so that I know how much review work remains.

#### Acceptance Criteria

1. THE Confirmation_UI SHALL display a counter showing "X of Y" where X is current position and Y is total pending transactions
2. WHEN the pending transaction count changes, THE counter SHALL update immediately
3. THE System SHALL display a badge or notification indicator showing pending transaction count in the main navigation
4. WHEN no pending transactions exist, THE badge SHALL be hidden
5. THE counter SHALL exclude deferred transactions from the current position but include them in the total count
