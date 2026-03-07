# Bugfix Requirements Document

## Introduction

When users click "Add" on a pending transaction from the dashboard's pending section, the transaction disappears but is NOT added to daily entries, resulting in data loss. This occurs because the dashboard page (`app/page.tsx`) uses the `PendingTransactionConfirmation` component without passing the required `onAdd` callback handler. The component has the callback as optional, so it doesn't error, but clicking "Add" does nothing.

This is a HIGH impact bug as users are losing transaction data when using the dashboard's pending section. The `/pending-transactions` page has the correct implementation and serves as a working reference.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN a user clicks "Add" on a pending transaction from the dashboard's pending section THEN the transaction disappears from the pending list but is NOT added to daily entries

1.2 WHEN a user clicks "Add" on a pending transaction from the dashboard THEN no success toast notification is shown

1.3 WHEN a user clicks "Add" on a pending transaction from the dashboard THEN the dashboard totals do not refresh to reflect the added transaction

1.4 WHEN a user clicks "Add" on a pending transaction from the dashboard THEN the transaction data is permanently lost

### Expected Behavior (Correct)

2.1 WHEN a user clicks "Add" on a pending transaction from the dashboard's pending section THEN the system SHALL add the transaction to daily entries via `addTransactionToDailyEntry(transaction, userId)`

2.2 WHEN a user clicks "Add" on a pending transaction from the dashboard THEN the system SHALL show a success toast notification

2.3 WHEN a user clicks "Add" on a pending transaction from the dashboard THEN the system SHALL refresh the dashboard to show updated totals

2.4 WHEN a user clicks "Add" on a pending transaction from the dashboard THEN the system SHALL remove the transaction from the pending list only after successful addition

2.5 WHEN adding a pending transaction fails from the dashboard THEN the system SHALL show an error toast notification and keep the transaction in the pending list

### Unchanged Behavior (Regression Prevention)

3.1 WHEN a user clicks "Add" on a pending transaction from the `/pending-transactions` page THEN the system SHALL CONTINUE TO add the transaction to daily entries correctly

3.2 WHEN a user clicks "Later" on a pending transaction from the dashboard THEN the system SHALL CONTINUE TO keep the transaction in the pending list

3.3 WHEN a user clicks "Discard" on a pending transaction from the dashboard THEN the system SHALL CONTINUE TO remove the transaction from the pending list without adding it

3.4 WHEN a user uploads a receipt and OCR extracts a transaction THEN the system SHALL CONTINUE TO save it to the pending list correctly

3.5 WHEN a user navigates to the dashboard's "Pending" tab THEN the system SHALL CONTINUE TO display all pending transactions correctly

3.6 WHEN the `PendingTransactionConfirmation` component is used in other pages with the `onAdd` callback THEN the system SHALL CONTINUE TO function correctly
