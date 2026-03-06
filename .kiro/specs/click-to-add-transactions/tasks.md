# Implementation Plan: Click-to-Add Transactions

## Overview

This feature enables users to quickly add financial transactions inferred from receipt images (OCR) or CSV file uploads. The system presents inferred transactions to users for confirmation before adding them to daily entries, supporting offline-first architecture with localStorage persistence and preventing duplicate prompts.

## Tasks

- [x] 1. Create core data types and interfaces
  - Define `InferredTransaction` interface with id, date, type, vendor_name, category, amount, source, created_at, deferred_at fields
  - Define `TransactionSource` type as 'receipt' | 'csv'
  - Define `TransactionType` type as 'expense' | 'sale'
  - Add types to `lib/types.ts`
  - _Requirements: 1.1, 2.1, 3.2_

- [x] 2. Implement Transaction Store (localStorage)
  - [x] 2.1 Create transaction store module
    - Implement `getLocalPendingTransactions()` to retrieve all pending transactions sorted by created_at descending
    - Implement `savePendingTransaction(transaction: InferredTransaction)` to persist to localStorage
    - Implement `updatePendingTransaction(id: string, updates: Partial<InferredTransaction>)` for deferred_at updates
    - Implement `removePendingTransaction(id: string)` to delete from localStorage
    - Use localStorage key 'pending_transactions'
    - Enforce maximum 100 pending transactions limit
    - Create file `lib/pending-transaction-store.ts`
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

  - [x] 2.2 Write unit tests for transaction store
    - Test CRUD operations on pending transactions
    - Test sorting by created_at descending
    - Test 100 transaction limit enforcement
    - Test localStorage persistence across operations
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 3. Implement OCR Result Parser
  - [x] 3.1 Create OCR result parser
    - Parse Lambda output JSON from receipt-ocr-processor
    - Extract date, amount, vendor, items from extractedData field
    - Generate deterministic transaction id using hash of source filename and extracted data
    - Set transaction type to 'expense' by default
    - Attempt category inference from vendor_name keywords (pharmacy, restaurant, grocery, etc.)
    - Set source to 'receipt'
    - Add created_at timestamp
    - Create file `lib/parsers/ocr-result-parser.ts`
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7_

  - [x] 3.2 Write unit tests for OCR parser
    - Test parsing valid OCR results
    - Test date format handling (DD/MM/YYYY, MM/DD/YYYY, YYYY-MM-DD)
    - Test amount extraction with currency symbols
    - Test vendor name extraction
    - Test category inference from vendor keywords
    - Test deterministic id generation
    - _Requirements: 9.2, 9.3, 9.4, 9.5, 9.6_

- [x] 4. Implement CSV Parser
  - [x] 4.1 Create CSV parser module
    - Use papaparse library for CSV parsing
    - Detect headers automatically from first row
    - Map common header variations (Date/Transaction Date/date → date field)
    - Parse date fields with multiple format attempts (DD/MM/YYYY, MM/DD/YYYY, YYYY-MM-DD, ISO 8601)
    - Parse amount fields removing currency symbols and handling comma/period decimal separators
    - Map transaction type from values: expense/sale/debit/credit/withdrawal/deposit
    - Handle quoted fields containing commas
    - Generate unique id for each row using hash of row data
    - Set source to 'csv'
    - Skip invalid rows and log warnings
    - Return array of InferredTransaction objects
    - Create file `lib/parsers/csv-parser.ts`
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7_

  - [x] 4.2 Write unit tests for CSV parser
    - Test header detection and mapping
    - Test date format parsing (multiple formats)
    - Test amount parsing with various currency formats
    - Test transaction type mapping
    - Test quoted field handling
    - Test invalid row skipping
    - Test deterministic id generation
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7_

- [x] 5. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Implement Duplicate Detection
  - [x] 6.1 Create duplicate detector module
    - Check if transaction id exists in pending transactions
    - Check if transaction id exists in recently added daily entries (last 30 days)
    - Query localStorage for daily entries within date range
    - Return boolean indicating if duplicate found
    - Create file `lib/duplicate-detector.ts`
    - _Requirements: 8.1, 8.2, 8.3, 8.4_

  - [x] 6.2 Write unit tests for duplicate detector
    - Test detection against pending transactions
    - Test detection against recent daily entries (30 days)
    - Test no false positives for unique transactions
    - Test date range filtering
    - _Requirements: 8.1, 8.2, 8.3, 8.4_

- [x] 7. Create CSV Upload API Endpoint
  - [x] 7.1 Implement CSV upload endpoint
    - Create POST endpoint at `/api/csv-upload`
    - Accept multipart/form-data with CSV file
    - Validate file type (text/csv, application/csv)
    - Validate file size (max 5MB)
    - Validate row count (max 1000 rows)
    - Parse CSV using csv-parser module
    - Check each transaction for duplicates
    - Save non-duplicate transactions to pending store
    - Return success with counts: total rows, valid transactions, duplicates skipped, invalid rows
    - Handle errors with appropriate error codes (CSV_NO_DATA, CSV_INVALID_HEADERS, CSV_TOO_LARGE, CSV_TOO_MANY_ROWS)
    - Create file `app/api/csv-upload/route.ts`
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 8.5, 12.1, 12.2, 12.3, 12.4, 12.5_

  - [x] 7.2 Write integration tests for CSV upload endpoint
    - Test successful CSV upload with valid data
    - Test file size validation
    - Test row count validation
    - Test invalid header handling
    - Test duplicate detection during upload
    - Test error responses
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 12.1, 12.2, 12.3, 12.4, 12.5_

- [x] 8. Create Receipt Status API Endpoint
  - [x] 8.1 Implement receipt status polling endpoint
    - Create GET endpoint at `/api/receipt-status`
    - Accept filename query parameter
    - Check S3 output bucket for processed results JSON
    - Parse OCR result using ocr-result-parser
    - Check for duplicates using duplicate-detector
    - If not duplicate, save to pending store
    - Return status: processing/completed/failed
    - Return extractedData when completed
    - Handle OCR errors with appropriate error codes (OCR_TIMEOUT, OCR_UNREADABLE, OCR_NO_DATA, OCR_SERVICE_ERROR)
    - Create file `app/api/receipt-status/route.ts`
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 8.1, 8.2, 8.3, 11.1, 11.2, 11.3, 11.4, 11.5_

  - [x] 8.2 Write integration tests for receipt status endpoint
    - Test polling for completed OCR results
    - Test processing status handling
    - Test error status handling
    - Test duplicate detection during receipt processing
    - Test error code responses
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 11.1, 11.2, 11.3, 11.4, 11.5_

- [x] 9. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 10. Create Confirmation UI Component
  - [x] 10.1 Implement PendingTransactionConfirmation component
    - Display current pending transaction with all fields (date, amount, type, vendor, category, source)
    - Show transaction counter "X of Y" where X is current position, Y is total pending
    - Provide three action buttons: Add, Later, Discard
    - Allow inline editing of transaction fields before adding
    - Display source indicator badge (receipt icon or CSV icon)
    - Show "No pending transactions" message when queue is empty
    - Handle loading states for async operations
    - Support multi-language translations (en, hi, mr)
    - Create file `components/PendingTransactionConfirmation.tsx`
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 14.1, 14.2_

  - [x] 10.2 Write component tests for confirmation UI
    - Test rendering with pending transaction
    - Test empty state rendering
    - Test transaction counter display
    - Test field editing functionality
    - Test button interactions
    - Test source indicator display
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [x] 11. Implement Add Transaction Action
  - [x] 11.1 Create add transaction handler
    - Accept confirmed transaction data from UI
    - Create DailyEntry using existing daily-entry-sync module
    - Call `createDailyEntry()` with transaction data
    - Remove transaction from pending store on success
    - Sync to DynamoDB when online
    - Queue for sync when offline
    - Return next pending transaction if available
    - Handle errors and rollback on failure
    - Add to `components/PendingTransactionConfirmation.tsx`
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

  - [x] 11.2 Write integration tests for add action
    - Test successful transaction addition
    - Test DailyEntry creation
    - Test pending transaction removal
    - Test online sync behavior
    - Test offline queue behavior
    - Test error handling and rollback
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [x] 12. Implement Later (Defer) Action
  - [x] 12.1 Create defer transaction handler
    - Update transaction with deferred_at timestamp
    - Move transaction to end of pending queue
    - Return next non-deferred pending transaction
    - If all deferred, return oldest deferred transaction
    - Persist deferred state across browser sessions
    - Add to `components/PendingTransactionConfirmation.tsx`
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

  - [x] 12.2 Write unit tests for defer action
    - Test deferred_at timestamp update
    - Test queue reordering
    - Test next transaction selection logic
    - Test all-deferred scenario
    - Test persistence across sessions
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 13. Implement Discard Action
  - [x] 13.1 Create discard transaction handler
    - Permanently remove transaction from pending store
    - Log discard action with transaction id and timestamp
    - Return next pending transaction immediately
    - Ensure no sync to DynamoDB
    - Add to `components/PendingTransactionConfirmation.tsx`
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

  - [x] 13.2 Write unit tests for discard action
    - Test permanent removal from store
    - Test discard logging
    - Test next transaction selection
    - Test no DynamoDB sync
    - Test no undo capability
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [x] 14. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 15. Create CSV Upload UI Component
  - [x] 15.1 Implement CSVUpload component
    - File input accepting .csv files
    - Drag-and-drop support
    - File size validation (5MB max)
    - Upload progress indicator
    - Success message with transaction count summary
    - Error handling with user-friendly messages
    - Multi-language support (en, hi, mr)
    - Create file `components/CSVUpload.tsx`
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 12.1, 12.2, 12.3, 12.4, 12.5_

  - [x] 15.2 Write component tests for CSV upload UI
    - Test file selection
    - Test drag-and-drop
    - Test file size validation
    - Test upload flow
    - Test success message display
    - Test error message display
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [x] 16. Add Pending Transaction Badge to Navigation
  - [x] 16.1 Create pending transaction counter hook
    - Create custom hook `usePendingTransactionCount()`
    - Subscribe to localStorage changes for pending_transactions
    - Return current count of pending transactions
    - Exclude deferred transactions from badge count (but include in total)
    - Create file `lib/hooks/usePendingTransactionCount.ts`
    - _Requirements: 14.3, 14.4, 14.5_

  - [x] 16.2 Add badge to main navigation
    - Display badge with pending count in navigation bar
    - Hide badge when count is 0
    - Update badge reactively when count changes
    - Link badge to pending transactions page
    - Style badge with attention-grabbing color (orange/red)
    - Update `app/page.tsx` or navigation component
    - _Requirements: 14.3, 14.4, 14.5_

- [x] 17. Integrate with Existing Receipt OCR Flow
  - [x] 17.1 Update ReceiptOCR component
    - After successful OCR, parse result using ocr-result-parser
    - Check for duplicates using duplicate-detector
    - Save to pending store instead of immediate use
    - Show notification: "Transaction added to pending review"
    - Redirect or show link to pending transactions page
    - Maintain backward compatibility with existing onDataExtracted callback
    - Update `components/ReceiptOCR.tsx`
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5_

  - [x] 17.2 Write integration tests for receipt OCR flow
    - Test end-to-end receipt upload to pending store
    - Test duplicate detection during receipt processing
    - Test notification display
    - Test backward compatibility
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5_

- [x] 18. Create Pending Transactions Page
  - [x] 18.1 Create pending transactions page
    - Display PendingTransactionConfirmation component
    - Display CSVUpload component
    - Show pending transaction count and summary
    - Provide link back to main dashboard
    - Support multi-language (en, hi, mr)
    - Create file `app/pending-transactions/page.tsx`
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 14.1, 14.2_

  - [x] 18.2 Add navigation link to pending transactions
    - Add "Pending Transactions" link to main navigation
    - Show badge with count next to link
    - Highlight link when pending transactions exist
    - Update navigation component
    - _Requirements: 14.3, 14.4_

- [x] 19. Add Translation Keys
  - [x] 19.1 Add translation keys for all UI text
    - Add keys for confirmation UI (add, later, discard, edit, etc.)
    - Add keys for CSV upload UI (upload, drag-drop, errors, etc.)
    - Add keys for pending transactions page
    - Add keys for error messages (OCR errors, CSV errors)
    - Add keys for success messages
    - Support English, Hindi, and Marathi
    - Update `lib/translations.ts`
    - _Requirements: 4.1, 4.2, 4.3, 11.1, 11.2, 11.3, 11.4, 12.1, 12.2, 12.3, 12.4_

- [x] 20. Final Integration and Testing
  - [x] 20.1 End-to-end integration testing
    - Test complete receipt upload → pending → add flow
    - Test complete CSV upload → pending → add flow
    - Test defer and discard actions
    - Test duplicate detection across sources
    - Test offline functionality
    - Test multi-language support
    - Test badge updates
    - _Requirements: All_

  - [x] 20.2 Write end-to-end tests
    - Test receipt to daily entry flow
    - Test CSV to daily entry flow
    - Test mixed source handling
    - Test offline/online sync
    - _Requirements: All_

- [x] 21. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- The feature integrates with existing daily-entry-sync and session-manager modules
- Offline-first architecture is maintained throughout
- All UI components support multi-language (en, hi, mr)
- Duplicate detection prevents data integrity issues
- Transaction store uses localStorage for offline capability
