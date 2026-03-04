# Requirements Document

## Introduction

The Udhaar Follow-up Helper enables small shop owners to track unpaid credit (udhaar) given to customers and send follow-up reminders via WhatsApp. This feature provides a deterministic, offline-first solution for credit collections management without AI-based calculations.

## Glossary

- **Credit_Entry**: A record of money lent to a customer, including customer name, amount, date given, due date, and payment status
- **Overdue_Credit**: A Credit_Entry where the current date exceeds the due date and payment status is unpaid
- **Overdue_Threshold**: The minimum number of days past due date (3 days) before a credit is considered actionable
- **Follow_Up_Panel**: The UI component displaying unpaid credits sorted by urgency
- **Reminder_Tracker**: The system component that records when reminders were sent to customers
- **Credit_Manager**: The deterministic engine that calculates overdue status and sorts credits
- **Sync_Service**: The component that synchronizes credit data between localStorage and DynamoDB
- **WhatsApp_Link_Generator**: The component that creates properly encoded WhatsApp reminder URLs

## Requirements

### Requirement 1: Display Overdue Credits

**User Story:** As a shop owner, I want to see all unpaid credits that are overdue, so that I know which customers to follow up with.

#### Acceptance Criteria

1. THE Follow_Up_Panel SHALL display all Credit_Entries where payment status is unpaid and days overdue is greater than or equal to the Overdue_Threshold
2. WHEN a Credit_Entry becomes overdue, THE Credit_Manager SHALL calculate days overdue as the difference between current date and due date
3. THE Follow_Up_Panel SHALL display customer name, amount owed, original date, due date, and days overdue for each Overdue_Credit
4. WHEN no Overdue_Credits exist, THE Follow_Up_Panel SHALL display a message indicating no follow-ups are needed
5. THE Credit_Manager SHALL recalculate overdue status each time the Follow_Up_Panel is rendered

### Requirement 2: Sort Credits by Urgency

**User Story:** As a shop owner, I want to see the most urgent credits first, so that I can prioritize my collection efforts.

#### Acceptance Criteria

1. THE Credit_Manager SHALL sort Overdue_Credits first by days overdue in descending order, then by amount in descending order
2. WHEN two Credit_Entries have the same days overdue value, THE Credit_Manager SHALL place the higher amount first
3. THE Follow_Up_Panel SHALL display Overdue_Credits in the order provided by Credit_Manager
4. THE Credit_Manager SHALL perform sorting using deterministic comparison logic without AI assistance

### Requirement 3: Generate WhatsApp Reminder Links

**User Story:** As a shop owner, I want to send WhatsApp reminders to customers with one click, so that I can easily follow up on unpaid credits.

#### Acceptance Criteria

1. THE WhatsApp_Link_Generator SHALL create a WhatsApp URL with the customer's phone number and a pre-filled reminder message
2. THE WhatsApp_Link_Generator SHALL URL-encode the reminder message text to handle special characters and spaces
3. THE Follow_Up_Panel SHALL display a WhatsApp reminder button for each Overdue_Credit that has a customer phone number
4. WHEN a customer phone number is missing, THE Follow_Up_Panel SHALL display the customer name without a WhatsApp button
5. THE WhatsApp_Link_Generator SHALL include the amount owed and due date in the reminder message template
6. WHERE the user's language preference is Hindi, THE WhatsApp_Link_Generator SHALL use Hindi text in the reminder message
7. WHERE the user's language preference is Marathi, THE WhatsApp_Link_Generator SHALL use Marathi text in the reminder message
8. WHERE the user's language preference is English, THE WhatsApp_Link_Generator SHALL use English text in the reminder message

### Requirement 4: Track Reminder History

**User Story:** As a shop owner, I want to know when I last sent a reminder to a customer, so that I don't send reminders too frequently.

#### Acceptance Criteria

1. WHEN a user clicks a WhatsApp reminder button, THE Reminder_Tracker SHALL record the current timestamp in the Credit_Entry's last_reminder_at field
2. THE Follow_Up_Panel SHALL display the last reminder date for each Overdue_Credit that has a last_reminder_at value
3. WHEN a Credit_Entry has no last_reminder_at value, THE Follow_Up_Panel SHALL display "Never reminded" or equivalent localized text
4. THE Reminder_Tracker SHALL update the Credit_Entry in both localStorage and mark it for sync to DynamoDB
5. THE Follow_Up_Panel SHALL calculate days since last reminder as the difference between current date and last_reminder_at

### Requirement 5: Offline-First Credit Access

**User Story:** As a shop owner, I want to access my follow-up list without internet connection, so that I can manage collections even when offline.

#### Acceptance Criteria

1. THE Credit_Manager SHALL retrieve all Credit_Entries from localStorage as the primary data source
2. WHEN the application is online, THE Sync_Service SHALL synchronize Credit_Entries from localStorage to DynamoDB
3. WHEN the application comes online after being offline, THE Sync_Service SHALL upload all pending Credit_Entry updates to DynamoDB
4. THE Follow_Up_Panel SHALL function fully without network connectivity
5. WHEN a reminder is sent while offline, THE Reminder_Tracker SHALL store the update in localStorage and mark it for sync

### Requirement 6: Persist Credits in DynamoDB

**User Story:** As a shop owner, I want my credit data saved to the cloud, so that I don't lose my records if I change devices.

#### Acceptance Criteria

1. THE Sync_Service SHALL store Credit_Entries in DynamoDB using partition key format "USER#{user_id}" and sort key format "CREDIT_ENTRY#{credit_id}"
2. WHEN a Credit_Entry is created or updated in localStorage, THE Sync_Service SHALL write the same data to DynamoDB when online
3. THE Sync_Service SHALL implement last-write-wins conflict resolution when syncing Credit_Entries
4. WHEN a user logs in on a new device, THE Sync_Service SHALL load all Credit_Entries from DynamoDB to localStorage
5. THE Sync_Service SHALL include user_id, customer_name, amount, date_given, due_date, payment_status, phone_number, and last_reminder_at in each DynamoDB Credit_Entry record

### Requirement 7: Multi-Language Support

**User Story:** As a shop owner, I want to see the follow-up panel in my preferred language, so that I can understand the information easily.

#### Acceptance Criteria

1. THE Follow_Up_Panel SHALL display all UI labels in the user's selected language preference (English, Hindi, or Marathi)
2. THE Follow_Up_Panel SHALL retrieve language preference from localStorage
3. THE WhatsApp_Link_Generator SHALL use the same language preference for reminder message templates
4. THE Follow_Up_Panel SHALL display "days overdue", "amount owed", "last reminder", and other labels using translation keys
5. WHEN the user changes language preference, THE Follow_Up_Panel SHALL re-render with the new language immediately

### Requirement 8: Mark Credits as Paid

**User Story:** As a shop owner, I want to mark a credit as paid from the follow-up panel, so that it no longer appears in my overdue list.

#### Acceptance Criteria

1. THE Follow_Up_Panel SHALL display a "Mark as Paid" button for each Overdue_Credit
2. WHEN a user clicks "Mark as Paid", THE Credit_Manager SHALL update the Credit_Entry payment_status to "paid" and record the payment_date as the current date
3. WHEN a Credit_Entry is marked as paid, THE Credit_Manager SHALL remove it from the Overdue_Credits list immediately
4. THE Credit_Manager SHALL update the Credit_Entry in both localStorage and mark it for sync to DynamoDB
5. WHEN a Credit_Entry is marked as paid, THE Credit_Manager SHALL preserve all historical data including date_given, due_date, and last_reminder_at

### Requirement 9: Deterministic Calculation Engine

**User Story:** As a developer, I want all credit calculations to be deterministic, so that the system is reliable and testable.

#### Acceptance Criteria

1. THE Credit_Manager SHALL calculate all overdue status, days overdue, and sorting using pure TypeScript functions without AI dependencies
2. THE Credit_Manager SHALL calculate all values without network dependencies
3. THE Credit_Manager SHALL produce identical results for identical inputs regardless of execution time or environment
4. THE Credit_Manager SHALL be fully unit testable with predictable outputs
5. THE Credit_Manager SHALL not use any AI services for calculating overdue status, sorting, or filtering credits

### Requirement 10: Filter by Overdue Threshold

**User Story:** As a shop owner, I want to see only credits that are significantly overdue, so that I focus on the most important follow-ups.

#### Acceptance Criteria

1. THE Credit_Manager SHALL use an Overdue_Threshold value of 3 days as the minimum days overdue for display
2. THE Credit_Manager SHALL exclude Credit_Entries where days overdue is less than the Overdue_Threshold
3. WHERE the Overdue_Threshold is configurable, THE Credit_Manager SHALL retrieve the threshold value from user profile settings
4. THE Follow_Up_Panel SHALL display the current Overdue_Threshold value to inform users why some credits are not shown
5. WHEN a Credit_Entry reaches the Overdue_Threshold, THE Credit_Manager SHALL include it in the Overdue_Credits list on the next render
