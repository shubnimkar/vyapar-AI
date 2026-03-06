# Click-to-Add Transactions - Manual Testing Checklist

## Overview

This document provides a comprehensive manual testing checklist for the Click-to-Add Transactions feature. Complete all test scenarios to verify end-to-end functionality.

**Testing Date:** _____________  
**Tester:** _____________  
**Environment:** _____________

---

## Test Environment Setup

### Prerequisites
- [ ] Application running locally or on test server
- [ ] Browser DevTools open (for localStorage inspection)
- [ ] Test CSV files prepared (see Test Data section)
- [ ] Test receipt images prepared (clear, readable receipts)
- [ ] Network throttling available (for offline testing)

### Test Data Files

Create these test files before starting:

1. **valid-transactions.csv**
```csv
date,amount,type,vendor_name,category
2024-01-15,100.50,expense,Test Vendor,inventory
2024-01-16,200.00,sale,Customer A,sales
2024-01-17,150.75,expense,Pharmacy,medical
```

2. **large-file.csv** (>5MB - for size validation)
3. **too-many-rows.csv** (>1000 rows - for row limit validation)
4. **invalid-headers.csv**
```csv
wrong,headers,here
2024-01-15,100.50,expense
```

5. **mixed-valid-invalid.csv**
```csv
date,amount,type
2024-01-15,100.50,expense
invalid-date,200.00,sale
2024-01-17,150.00,expense
```

---

## Test Scenarios

### 1. Receipt Upload Flow

#### 1.1 Basic Receipt Upload
- [ ] Navigate to receipt upload page
- [ ] Upload a clear receipt image (JPEG/PNG)
- [ ] Verify "Uploading..." status appears
- [ ] Verify "Extracting data..." status appears
- [ ] Wait for OCR processing (5-10 seconds)
- [ ] Verify success message: "Transaction added to pending review"
- [ ] Verify extracted data is displayed (date, amount, vendor)
- [ ] Verify "View Pending Transactions" link appears
- [ ] Verify receipt preview image is shown

**Expected Result:** Transaction successfully added to pending store

#### 1.2 Receipt Upload with Category Inference
- [ ] Upload receipt from pharmacy (e.g., "Apollo Pharmacy")
- [ ] Verify category is inferred as "medical"
- [ ] Upload receipt from restaurant
- [ ] Verify category is inferred as "food" or "restaurant"
- [ ] Upload receipt from grocery store
- [ ] Verify category is inferred as "inventory" or "grocery"

**Expected Result:** Categories correctly inferred from vendor names

#### 1.3 Receipt Upload Error Handling
- [ ] Upload invalid file type (e.g., .txt, .pdf)
- [ ] Verify error: "Invalid file format"
- [ ] Upload file >10MB
- [ ] Verify error: "Image file too large"
- [ ] Upload blurry/unreadable receipt
- [ ] Verify error: "Could not read receipt"

**Expected Result:** Appropriate error messages displayed

#### 1.4 Receipt Upload Timeout
- [ ] Simulate slow network (throttle to Slow 3G)
- [ ] Upload receipt
- [ ] Wait for timeout (40 seconds)
- [ ] Verify error: "Receipt processing took too long"
- [ ] Verify "Try Again" button appears

**Expected Result:** Timeout handled gracefully with retry option

---

### 2. CSV Upload Flow

#### 2.1 Valid CSV Upload
- [ ] Navigate to pending transactions page
- [ ] Click CSV upload area or drag-and-drop
- [ ] Upload valid-transactions.csv
- [ ] Verify upload progress indicator
- [ ] Verify success message with counts
  - Total rows: 3
  - Valid transactions: 3
  - Duplicates skipped: 0
  - Invalid rows: 0
  - Saved: 3
- [ ] Verify badge shows "3" pending transactions

**Expected Result:** All 3 transactions added to pending store

#### 2.2 CSV with Header Variations
- [ ] Create CSV with headers: "Date", "Amount", "Type"
- [ ] Upload and verify successful parsing
- [ ] Create CSV with headers: "Transaction Date", "Value", "transaction_type"
- [ ] Upload and verify successful parsing

**Expected Result:** Different header formats correctly mapped

#### 2.3 CSV with Mixed Valid/Invalid Rows
- [ ] Upload mixed-valid-invalid.csv
- [ ] Verify summary shows:
  - Total rows: 3
  - Valid transactions: 2
  - Invalid rows: 1
- [ ] Verify only valid transactions added to pending

**Expected Result:** Invalid rows skipped, valid rows processed

#### 2.4 CSV File Size Validation
- [ ] Upload large-file.csv (>5MB)
- [ ] Verify error: "CSV file too large. Maximum size is 5MB"
- [ ] Verify no transactions added

**Expected Result:** File rejected before processing

#### 2.5 CSV Row Count Validation
- [ ] Upload too-many-rows.csv (>1000 rows)
- [ ] Verify error: "CSV file has too many rows. Maximum is 1000 rows"
- [ ] Verify no transactions added

**Expected Result:** File rejected before processing

#### 2.6 CSV Invalid Headers
- [ ] Upload invalid-headers.csv
- [ ] Verify error: "CSV file must contain 'date', 'amount', and 'type' columns"
- [ ] Verify no transactions added

**Expected Result:** Missing required headers detected

#### 2.7 CSV with No Data
- [ ] Upload CSV with only headers (no data rows)
- [ ] Verify error: "No valid transactions found in CSV file"

**Expected Result:** Empty file rejected

---

### 3. Pending Transaction Confirmation UI

#### 3.1 Display Pending Transaction
- [ ] Navigate to /pending-transactions
- [ ] Verify first pending transaction is displayed
- [ ] Verify all fields shown:
  - Date
  - Amount (formatted with currency symbol)
  - Type (expense/sale)
  - Vendor name (if available)
  - Category (if available)
  - Source badge (receipt icon or CSV icon)
- [ ] Verify transaction counter shows "1 of X"
- [ ] Verify three action buttons: Add, Later, Discard

**Expected Result:** Transaction displayed with all details

#### 3.2 Empty State
- [ ] Clear all pending transactions (discard all)
- [ ] Navigate to /pending-transactions
- [ ] Verify message: "No pending transactions"
- [ ] Verify CSV upload component still visible

**Expected Result:** Empty state displayed correctly

#### 3.3 Field Editing
- [ ] Display a pending transaction
- [ ] Click on date field and edit
- [ ] Click on amount field and edit
- [ ] Click on vendor name field and edit
- [ ] Click on category field and edit
- [ ] Verify changes are reflected in UI
- [ ] Click "Add" button
- [ ] Verify edited values are saved to daily entry

**Expected Result:** Fields editable before confirmation

---

### 4. Add Transaction Action

#### 4.1 Add Expense Transaction
- [ ] Display pending expense transaction
- [ ] Click "Add" button
- [ ] Verify transaction removed from pending
- [ ] Verify next transaction displayed (if available)
- [ ] Verify badge count decremented
- [ ] Navigate to daily entries
- [ ] Verify expense added to correct date
- [ ] Verify totalExpense updated

**Expected Result:** Expense added to daily entry

#### 4.2 Add Sale Transaction
- [ ] Display pending sale transaction
- [ ] Click "Add" button
- [ ] Verify transaction removed from pending
- [ ] Navigate to daily entries
- [ ] Verify sale added to correct date
- [ ] Verify totalSales updated

**Expected Result:** Sale added to daily entry

#### 4.3 Add with Edited Fields
- [ ] Display pending transaction
- [ ] Edit amount from 100 to 150
- [ ] Edit vendor from "Test" to "Updated Vendor"
- [ ] Click "Add" button
- [ ] Navigate to daily entries
- [ ] Verify edited values (150, "Updated Vendor") saved

**Expected Result:** Edited values persisted

#### 4.4 Add Multiple Transactions
- [ ] Upload CSV with 5 transactions
- [ ] Add first transaction
- [ ] Verify counter shows "1 of 4" (remaining)
- [ ] Add second transaction
- [ ] Verify counter shows "1 of 3"
- [ ] Continue until all added
- [ ] Verify empty state displayed

**Expected Result:** All transactions added sequentially

---

### 5. Later (Defer) Action

#### 5.1 Defer Single Transaction
- [ ] Display pending transaction
- [ ] Click "Later" button
- [ ] Verify next transaction displayed immediately
- [ ] Verify counter updated
- [ ] Continue through all transactions
- [ ] Verify deferred transaction appears at end

**Expected Result:** Transaction moved to end of queue

#### 5.2 Defer All Transactions
- [ ] Upload 3 transactions
- [ ] Click "Later" on first transaction
- [ ] Click "Later" on second transaction
- [ ] Click "Later" on third transaction
- [ ] Verify first deferred transaction displayed again
- [ ] Verify counter shows "1 of 3"

**Expected Result:** Oldest deferred transaction shown when all deferred

#### 5.3 Defer Persistence
- [ ] Defer a transaction
- [ ] Refresh page (F5)
- [ ] Navigate back to /pending-transactions
- [ ] Verify deferred transaction still at end of queue

**Expected Result:** Deferred state persists across sessions

---

### 6. Discard Action

#### 6.1 Discard Single Transaction
- [ ] Display pending transaction
- [ ] Click "Discard" button
- [ ] Verify transaction removed permanently
- [ ] Verify next transaction displayed
- [ ] Verify badge count decremented
- [ ] Check localStorage (DevTools)
- [ ] Verify discarded transaction not in pending_transactions

**Expected Result:** Transaction permanently removed

#### 6.2 Discard Multiple Transactions
- [ ] Upload 5 transactions
- [ ] Discard 1st, 3rd, and 5th transactions
- [ ] Verify only 2nd and 4th remain
- [ ] Verify counter shows "1 of 2"

**Expected Result:** Only non-discarded transactions remain

#### 6.3 No Undo for Discard
- [ ] Discard a transaction
- [ ] Verify no "Undo" button appears
- [ ] Refresh page
- [ ] Verify transaction still gone

**Expected Result:** Discard is permanent, no undo

---

### 7. Duplicate Detection

#### 7.1 Duplicate Receipt Upload
- [ ] Upload receipt A
- [ ] Verify success message
- [ ] Upload same receipt A again
- [ ] Verify error: "This transaction has already been added"
- [ ] Verify transaction NOT added to pending
- [ ] Verify badge count unchanged

**Expected Result:** Duplicate detected and rejected

#### 7.2 Duplicate in CSV
- [ ] Upload CSV with 3 transactions
- [ ] Verify all 3 added (summary shows 3 saved)
- [ ] Upload same CSV again
- [ ] Verify summary shows:
  - Valid transactions: 3
  - Duplicates skipped: 3
  - Saved: 0
- [ ] Verify badge count unchanged

**Expected Result:** All duplicates skipped

#### 7.3 Duplicate Across Sources
- [ ] Upload receipt for ₹100 on 2024-01-15 from "Test Vendor"
- [ ] Verify added to pending
- [ ] Upload CSV with same transaction (₹100, 2024-01-15, "Test Vendor")
- [ ] Verify duplicate detected
- [ ] Verify CSV transaction skipped

**Expected Result:** Duplicate detected across receipt and CSV

#### 7.4 Duplicate After Add
- [ ] Upload receipt A
- [ ] Add transaction to daily entry
- [ ] Upload same receipt A again
- [ ] Verify duplicate detected (checks recent daily entries)

**Expected Result:** Duplicate detected against daily entries

---

### 8. Offline Functionality

#### 8.1 Offline CSV Upload
- [ ] Open DevTools Network tab
- [ ] Set to "Offline" mode
- [ ] Upload CSV file
- [ ] Verify transactions added to localStorage
- [ ] Verify pending transactions displayed
- [ ] Verify badge updated

**Expected Result:** CSV parsing works offline

#### 8.2 Offline Add Transaction
- [ ] Ensure offline mode
- [ ] Display pending transaction
- [ ] Click "Add" button
- [ ] Verify transaction added to daily entry locally
- [ ] Verify transaction removed from pending
- [ ] Go back online
- [ ] Wait for sync
- [ ] Verify transaction synced to DynamoDB

**Expected Result:** Add works offline, syncs when online

#### 8.3 Offline Later/Discard
- [ ] Ensure offline mode
- [ ] Click "Later" on transaction
- [ ] Verify deferred state saved locally
- [ ] Click "Discard" on transaction
- [ ] Verify removed from localStorage
- [ ] Refresh page
- [ ] Verify changes persisted

**Expected Result:** Later/Discard work offline

#### 8.4 Receipt Upload Requires Online
- [ ] Set to offline mode
- [ ] Try to upload receipt
- [ ] Verify error: Network error or upload failed
- [ ] Go back online
- [ ] Upload receipt
- [ ] Verify success

**Expected Result:** Receipt upload requires internet (AWS Lambda)

---

### 9. Multi-Language Support

#### 9.1 English (en)
- [ ] Set language to English
- [ ] Upload receipt
- [ ] Verify messages in English:
  - "Transaction added to pending review"
  - "View Pending Transactions"
  - "Add", "Later", "Discard" buttons
- [ ] Upload CSV
- [ ] Verify error messages in English

**Expected Result:** All UI text in English

#### 9.2 Hindi (hi)
- [ ] Set language to Hindi
- [ ] Upload receipt
- [ ] Verify messages in Hindi:
  - "लेनदेन समीक्षा के लिए जोड़ा गया"
  - "लंबित लेनदेन देखें"
- [ ] Verify button labels in Hindi
- [ ] Upload CSV with errors
- [ ] Verify error messages in Hindi

**Expected Result:** All UI text in Hindi

#### 9.3 Marathi (mr)
- [ ] Set language to Marathi
- [ ] Upload receipt
- [ ] Verify messages in Marathi:
  - "व्यवहार पुनरावलोकनासाठी जोडला"
  - "प्रलंबित व्यवहार पहा"
- [ ] Verify button labels in Marathi
- [ ] Upload CSV with errors
- [ ] Verify error messages in Marathi

**Expected Result:** All UI text in Marathi

---

### 10. Badge Updates

#### 10.1 Badge Visibility
- [ ] Clear all pending transactions
- [ ] Verify badge hidden (not visible)
- [ ] Upload 1 transaction
- [ ] Verify badge shows "1"
- [ ] Upload CSV with 5 transactions
- [ ] Verify badge shows "6"

**Expected Result:** Badge shows correct count, hidden when 0

#### 10.2 Badge Updates on Actions
- [ ] Start with 5 pending transactions (badge shows "5")
- [ ] Add 1 transaction
- [ ] Verify badge shows "4"
- [ ] Discard 1 transaction
- [ ] Verify badge shows "3"
- [ ] Defer 1 transaction
- [ ] Verify badge still shows "3" (deferred still counted)

**Expected Result:** Badge updates immediately after actions

#### 10.3 Badge Across Pages
- [ ] Upload 3 transactions
- [ ] Verify badge shows "3" on current page
- [ ] Navigate to home page
- [ ] Verify badge shows "3" in navigation
- [ ] Navigate to profile page
- [ ] Verify badge shows "3" in navigation

**Expected Result:** Badge visible and consistent across all pages

---

### 11. Transaction Counter

#### 11.1 Counter Display
- [ ] Upload 5 transactions
- [ ] Navigate to pending transactions page
- [ ] Verify counter shows "1 of 5"
- [ ] Click "Add"
- [ ] Verify counter shows "1 of 4"
- [ ] Click "Later"
- [ ] Verify counter shows "1 of 4" (deferred moved to end)

**Expected Result:** Counter shows current position and total

#### 11.2 Counter with Deferred
- [ ] Upload 3 transactions
- [ ] Defer first transaction
- [ ] Verify counter shows "1 of 3" (showing 2nd transaction)
- [ ] Defer second transaction
- [ ] Verify counter shows "1 of 3" (showing 3rd transaction)
- [ ] Add third transaction
- [ ] Verify counter shows "1 of 2" (showing first deferred)

**Expected Result:** Counter excludes deferred from current position

---

### 12. Integration with Daily Entries

#### 12.1 New Daily Entry Creation
- [ ] Ensure no entry exists for 2024-01-25
- [ ] Upload transaction dated 2024-01-25
- [ ] Add transaction
- [ ] Navigate to daily entries
- [ ] Verify new entry created for 2024-01-25
- [ ] Verify totalExpense or totalSales updated

**Expected Result:** New daily entry created

#### 12.2 Existing Daily Entry Update
- [ ] Create daily entry for 2024-01-26 (sales: 1000, expense: 500)
- [ ] Upload transaction dated 2024-01-26 (expense: 300)
- [ ] Add transaction
- [ ] Navigate to daily entries
- [ ] Verify entry for 2024-01-26 updated
- [ ] Verify totalExpense = 800 (500 + 300)

**Expected Result:** Existing entry updated with new transaction

#### 12.3 Transaction Source Tracking
- [ ] Add transaction from receipt
- [ ] Navigate to daily entries
- [ ] Inspect transaction details
- [ ] Verify source = "receipt"
- [ ] Add transaction from CSV
- [ ] Verify source = "csv"

**Expected Result:** Source tracked in daily entry

---

### 13. Error Handling

#### 13.1 Network Errors
- [ ] Simulate network failure during receipt upload
- [ ] Verify error message displayed
- [ ] Verify "Try Again" button appears
- [ ] Restore network
- [ ] Click "Try Again"
- [ ] Verify upload succeeds

**Expected Result:** Network errors handled gracefully

#### 13.2 Storage Full
- [ ] Add 100 pending transactions (maximum limit)
- [ ] Try to upload another transaction
- [ ] Verify error: "Cannot add more transactions. Please review pending transactions first."

**Expected Result:** Storage limit enforced

#### 13.3 Invalid Transaction Data
- [ ] Manually edit localStorage to add invalid transaction
- [ ] Navigate to pending transactions page
- [ ] Verify app doesn't crash
- [ ] Verify invalid transaction skipped or error shown

**Expected Result:** Invalid data handled gracefully

---

### 14. Performance

#### 14.1 Large CSV Processing
- [ ] Upload CSV with 1000 rows (maximum)
- [ ] Measure processing time
- [ ] Verify completes in <5 seconds
- [ ] Verify all valid transactions added

**Expected Result:** Large CSV processed efficiently

#### 14.2 Receipt OCR Speed
- [ ] Upload clear receipt
- [ ] Measure OCR processing time
- [ ] Verify completes in 5-15 seconds
- [ ] Verify data extracted correctly

**Expected Result:** OCR completes in reasonable time

#### 14.3 UI Responsiveness
- [ ] Upload 50 transactions
- [ ] Navigate through pending transactions
- [ ] Verify UI remains responsive
- [ ] Verify no lag when clicking Add/Later/Discard

**Expected Result:** UI remains responsive with many transactions

---

### 15. Browser Compatibility

#### 15.1 Chrome
- [ ] Test all flows in Chrome
- [ ] Verify localStorage works
- [ ] Verify file upload works
- [ ] Verify all UI elements render correctly

**Expected Result:** Full functionality in Chrome

#### 15.2 Firefox
- [ ] Test all flows in Firefox
- [ ] Verify localStorage works
- [ ] Verify file upload works
- [ ] Verify all UI elements render correctly

**Expected Result:** Full functionality in Firefox

#### 15.3 Safari
- [ ] Test all flows in Safari
- [ ] Verify localStorage works
- [ ] Verify file upload works
- [ ] Verify all UI elements render correctly

**Expected Result:** Full functionality in Safari

#### 15.4 Mobile Browsers
- [ ] Test on mobile Chrome (Android)
- [ ] Test on mobile Safari (iOS)
- [ ] Verify touch interactions work
- [ ] Verify responsive layout

**Expected Result:** Mobile-friendly experience

---

## Test Results Summary

### Pass/Fail Summary

| Category | Total Tests | Passed | Failed | Notes |
|----------|-------------|--------|--------|-------|
| Receipt Upload | | | | |
| CSV Upload | | | | |
| Confirmation UI | | | | |
| Add Action | | | | |
| Later Action | | | | |
| Discard Action | | | | |
| Duplicate Detection | | | | |
| Offline Functionality | | | | |
| Multi-Language | | | | |
| Badge Updates | | | | |
| Transaction Counter | | | | |
| Daily Entry Integration | | | | |
| Error Handling | | | | |
| Performance | | | | |
| Browser Compatibility | | | | |

### Critical Issues Found

1. _____________________________________________
2. _____________________________________________
3. _____________________________________________

### Minor Issues Found

1. _____________________________________________
2. _____________________________________________
3. _____________________________________________

### Recommendations

1. _____________________________________________
2. _____________________________________________
3. _____________________________________________

---

## Sign-Off

**Tester Signature:** _____________  
**Date:** _____________  
**Status:** ☐ Approved ☐ Approved with Issues ☐ Rejected

**Notes:**
_____________________________________________
_____________________________________________
_____________________________________________
