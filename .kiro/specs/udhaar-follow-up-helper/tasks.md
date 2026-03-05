# Implementation Plan: Udhaar Follow-up & Collections Helper

## Overview

This implementation plan converts the Udhaar Follow-up Helper design into actionable coding tasks. The feature provides deterministic credit collections management with WhatsApp reminders, offline-first architecture, and multi-language support. All financial calculations are deterministic (no AI), with localStorage as the primary data source and DynamoDB for cloud backup.

## Tasks

- [x] 1. Set up core data types and translation keys
  - Create TypeScript interfaces for CreditEntry, OverdueCredit, OverdueStatus, ReminderConfig, and FollowUpSummary in lib/types.ts
  - Add translation keys for Follow-Up Panel UI labels (followUp.title, followUp.noOverdue, followUp.daysOverdue, etc.)
  - Add WhatsApp message templates for English, Hindi, and Marathi (whatsapp.reminder.en, whatsapp.reminder.hi, whatsapp.reminder.mr)
  - _Requirements: 1.3, 3.5, 7.1, 7.4_

- [x] 2. Implement Credit Manager (deterministic core)
  - [x] 2.1 Create lib/credit-manager.ts with pure calculation functions
    - Implement calculateDaysOverdue(dueDate: string, currentDate: Date): number
    - Implement calculateOverdueStatus(credit: CreditEntry, currentDate: Date): OverdueStatus
    - Implement filterByThreshold(credits: CreditEntry[], threshold: number, currentDate: Date): OverdueCredit[]
    - Implement sortByUrgency(credits: OverdueCredit[]): OverdueCredit[]
    - Implement getOverdueCredits(credits: CreditEntry[], threshold: number): OverdueCredit[]
    - _Requirements: 1.1, 1.2, 2.1, 2.2, 9.1, 9.3, 10.1, 10.2_

  - [x] 2.2 Write property test for days overdue calculation
    - **Property 2: Days Overdue Calculation**
    - **Validates: Requirements 1.2**
    - Test that days overdue equals calendar days between due date and current date (minimum 0)
    - Use fast-check with date generators (100 iterations)

  - [x] 2.3 Write property test for overdue credit filtering
    - **Property 1: Overdue Credit Filtering**
    - **Validates: Requirements 1.1, 10.2**
    - Test that filtered credits include only unpaid credits where days overdue >= threshold
    - Use fast-check with credit entry generators (100 iterations)

  - [x] 2.4 Write property test for urgency-based sorting
    - **Property 4: Urgency-Based Sorting**
    - **Validates: Requirements 2.1, 2.2**
    - Test that sorted list is ordered by days overdue DESC, then amount DESC
    - Use fast-check with overdue credit list generators (100 iterations)

  - [x] 2.5 Write property test for deterministic calculation
    - **Property 25: Deterministic Calculation**
    - **Validates: Requirements 9.3**
    - Test that calling overdue calculation multiple times with same inputs produces identical results
    - Use fast-check with credit entry and date generators (100 iterations)

  - [x] 2.6 Write unit tests for Credit Manager edge cases
    - Test empty credit list
    - Test credit due today (0 days overdue)
    - Test credit with due date in future
    - Test credits with equal days overdue (amount sorting)
    - Test threshold boundary conditions (exactly 3 days, 2 days, 4 days)
    - _Requirements: 1.1, 1.2, 2.1, 2.2, 10.1_

- [x] 3. Checkpoint - Ensure Credit Manager tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Implement WhatsApp Link Generator
  - [x] 4.1 Create lib/whatsapp-link-generator.ts
    - Implement getReminderMessage(customerName: string, amount: number, dueDate: string, language: Language): string
    - Implement generateReminderLink(phoneNumber: string, customerName: string, amount: number, dueDate: string, language: Language): string
    - Handle URL encoding for special characters and emojis
    - Format phone numbers as +91XXXXXXXXXX (India)
    - _Requirements: 3.1, 3.2, 3.5, 3.6, 3.7, 3.8_

  - [x] 4.2 Write property test for WhatsApp URL structure
    - **Property 6: WhatsApp URL Structure**
    - **Validates: Requirements 3.1**
    - Test that generated URL contains properly formatted phone number and URL-encoded message
    - Use fast-check with phone number, name, amount, date, and language generators (100 iterations)

  - [x] 4.3 Write property test for reminder message content
    - **Property 8: Reminder Message Content**
    - **Validates: Requirements 3.5**
    - Test that message includes customer name, amount, and due date
    - Use fast-check with string and number generators (100 iterations)

  - [x] 4.4 Write property test for language-based message selection
    - **Property 9: Language-Based Message Selection**
    - **Validates: Requirements 3.6, 3.7, 3.8, 7.3**
    - Test that message uses correct template for each language (en, hi, mr)
    - Use fast-check with language enum generator (100 iterations)

  - [x] 4.5 Write unit tests for WhatsApp Link Generator
    - Test phone number validation (10 digits, numeric only)
    - Test special characters in customer name (encoding)
    - Test large amounts (formatting)
    - Test all three language templates
    - Test missing phone number handling
    - _Requirements: 3.1, 3.2, 3.5, 3.6, 3.7, 3.8_

- [x] 5. Implement Reminder Tracker
  - [x] 5.1 Create lib/reminder-tracker.ts
    - Implement recordReminder(creditId: string, userId: string): Promise<void>
    - Implement getLastReminder(creditId: string): Date | null
    - Implement calculateDaysSinceReminder(lastReminderAt: string, currentDate: Date): number
    - Update localStorage immediately (optimistic update)
    - Mark credit for DynamoDB sync
    - _Requirements: 4.1, 4.4, 4.5_

  - [x] 5.2 Write property test for reminder timestamp recording
    - **Property 10: Reminder Timestamp Recording**
    - **Validates: Requirements 4.1**
    - Test that last_reminder_at is updated to current timestamp when reminder sent
    - Use fast-check with credit entry generators (100 iterations)

  - [x] 5.3 Write property test for days since reminder calculation
    - **Property 13: Days Since Reminder Calculation**
    - **Validates: Requirements 4.5**
    - Test that days since reminder equals calendar days between reminder timestamp and current date
    - Use fast-check with date generators (100 iterations)

  - [x] 5.4 Write property test for dual persistence updates
    - **Property 12: Dual Persistence Updates**
    - **Validates: Requirements 4.4, 8.4**
    - Test that updates are written to both localStorage and marked for DynamoDB sync
    - Use fast-check with credit entry generators (100 iterations)

  - [x] 5.5 Write unit tests for Reminder Tracker
    - Test reminder recording with valid credit
    - Test reminder recording while offline
    - Test getLastReminder with missing timestamp
    - Test calculateDaysSinceReminder with various dates
    - _Requirements: 4.1, 4.4, 4.5, 5.5_

- [x] 6. Checkpoint - Ensure core libraries tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Extend Credit Sync Service
  - [x] 7.1 Update lib/credit-sync.ts with reminder tracking support
    - Add updateCreditReminder(creditId: string, userId: string, reminderAt: string): Promise<void>
    - Implement last-write-wins conflict resolution using updatedAt timestamp
    - Handle offline mode (store in localStorage, sync when online)
    - Ensure DynamoDB key format: PK="USER#{userId}", SK="CREDIT#{creditId}"
    - _Requirements: 4.4, 5.2, 5.3, 6.1, 6.2, 6.3, 6.5_

  - [x] 7.2 Write property test for sync data consistency
    - **Property 16: Sync Data Consistency**
    - **Validates: Requirements 6.2**
    - Test that DynamoDB record contains identical values to localStorage entry
    - Use fast-check with credit entry generators (100 iterations)

  - [x] 7.3 Write property test for last-write-wins conflict resolution
    - **Property 17: Last-Write-Wins Conflict Resolution**
    - **Validates: Requirements 6.3**
    - Test that sync service persists update with later timestamp
    - Use fast-check with conflicting credit entry generators (100 iterations)

  - [x] 7.4 Write property test for DynamoDB key format
    - **Property 15: DynamoDB Key Format**
    - **Validates: Requirements 6.1**
    - Test that PK="USER#{userId}" and SK="CREDIT#{creditId}"
    - Use fast-check with userId and creditId generators (100 iterations)

  - [x] 7.5 Write property test for complete field persistence
    - **Property 18: Complete Field Persistence**
    - **Validates: Requirements 6.5**
    - Test that all required fields are saved to DynamoDB
    - Use fast-check with credit entry generators (100 iterations)

  - [x] 7.6 Write unit tests for Credit Sync Service
    - Test sync with network available
    - Test sync with network unavailable (offline mode)
    - Test conflict resolution with different timestamps
    - Test DynamoDB key format validation
    - Test field completeness validation
    - _Requirements: 5.2, 5.3, 6.1, 6.2, 6.3, 6.5_

- [x] 8. Create API endpoints
  - [x] 8.1 Create app/api/credit/overdue/route.ts
    - Implement GET handler to retrieve overdue credits
    - Accept userId and optional threshold query parameters
    - Use Credit Manager to calculate overdue status and sort
    - Return OverdueCredit[] and FollowUpSummary
    - Handle errors gracefully (network, validation)
    - _Requirements: 1.1, 1.2, 2.1, 2.3, 10.1_

  - [x] 8.2 Create app/api/credit/reminder/route.ts
    - Implement PUT handler to record reminder timestamp
    - Accept userId, creditId, and reminderAt in request body
    - Use Reminder Tracker to update credit entry
    - Return updated credit with lastReminderAt
    - Handle errors gracefully (validation, sync)
    - _Requirements: 4.1, 4.4_

  - [x] 8.3 Write integration tests for API endpoints
    - Test GET /api/credit/overdue with valid userId
    - Test GET /api/credit/overdue with invalid userId
    - Test PUT /api/credit/reminder with valid data
    - Test PUT /api/credit/reminder with missing fields
    - Mock DynamoDB and localStorage
    - _Requirements: 1.1, 4.1_

- [x] 9. Checkpoint - Ensure API tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 10. Implement Follow-Up Panel UI component
  - [x] 10.1 Create components/FollowUpPanel.tsx
    - Accept userId, language, and optional overdueThreshold props
    - Load credits from localStorage on mount
    - Use Credit Manager to calculate and sort overdue credits
    - Display customer name, amount, date given, due date, days overdue for each credit
    - Show "No overdue credits" message when list is empty
    - Display sync status indicator
    - Implement responsive design for mobile-first usage
    - _Requirements: 1.1, 1.3, 1.4, 2.3, 5.1, 7.1, 10.4_

  - [x] 10.2 Write property test for overdue credit display fields
    - **Property 3: Overdue Credit Display Fields**
    - **Validates: Requirements 1.3**
    - Test that rendered display contains all required fields
    - Use React Testing Library with fast-check (100 iterations)

  - [x] 10.3 Write property test for display order preservation
    - **Property 5: Display Order Preservation**
    - **Validates: Requirements 2.3**
    - Test that Follow-Up Panel displays credits in same order as Credit Manager
    - Use React Testing Library with fast-check (100 iterations)

  - [x] 10.4 Write unit tests for Follow-Up Panel
    - Test rendering with empty credit list
    - Test rendering with multiple overdue credits
    - Test sync status indicator display
    - Test responsive layout on mobile
    - _Requirements: 1.1, 1.3, 1.4, 2.3_

- [x] 11. Add WhatsApp reminder functionality to Follow-Up Panel
  - [x] 11.1 Add WhatsApp reminder button to each credit item
    - Display button only when credit has phoneNumber
    - Use WhatsApp Link Generator to create URL
    - Open WhatsApp app/web when clicked
    - Call Reminder Tracker to record timestamp
    - Update UI immediately (optimistic update)
    - _Requirements: 3.1, 3.3, 3.4, 4.1_

  - [x] 11.2 Write property test for conditional WhatsApp button rendering
    - **Property 7: Conditional WhatsApp Button Rendering**
    - **Validates: Requirements 3.3, 3.4**
    - Test that button appears if and only if phoneNumber exists
    - Use React Testing Library with fast-check (100 iterations)

  - [x] 11.3 Write unit tests for WhatsApp reminder functionality
    - Test button click opens WhatsApp URL
    - Test reminder timestamp is recorded
    - Test button is hidden when phoneNumber is missing
    - Test error handling for invalid phone numbers
    - _Requirements: 3.1, 3.3, 3.4, 4.1_

- [x] 12. Add reminder history display to Follow-Up Panel
  - [x] 12.1 Display last reminder date for each credit
    - Show formatted date when lastReminderAt exists
    - Show "Never reminded" (localized) when lastReminderAt is null
    - Calculate and display days since last reminder
    - Use translation keys for all labels
    - _Requirements: 4.2, 4.3, 4.5, 7.1_

  - [x] 12.2 Write property test for conditional reminder display
    - **Property 11: Conditional Reminder Display**
    - **Validates: Requirements 4.2, 4.3**
    - Test that display shows date when exists, "Never reminded" when missing
    - Use React Testing Library with fast-check (100 iterations)

  - [x] 12.3 Write unit tests for reminder history display
    - Test display with lastReminderAt present
    - Test display with lastReminderAt missing
    - Test days since reminder calculation
    - Test localized "Never reminded" text
    - _Requirements: 4.2, 4.3, 4.5, 7.1_

- [x] 13. Add mark as paid functionality to Follow-Up Panel
  - [x] 13.1 Add "Mark as Paid" button to each credit item
    - Display button for all overdue credits
    - Update credit entry (isPaid=true, paidDate=now) when clicked
    - Update localStorage immediately
    - Mark for DynamoDB sync
    - Remove from overdue list (re-render)
    - Preserve historical data (dateGiven, dueDate, lastReminderAt)
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

  - [x] 13.2 Write property test for mark as paid button display
    - **Property 21: Mark as Paid Button Display**
    - **Validates: Requirements 8.1**
    - Test that button is displayed for all overdue credits
    - Use React Testing Library with fast-check (100 iterations)

  - [x] 13.3 Write property test for payment status update
    - **Property 22: Payment Status Update**
    - **Validates: Requirements 8.2**
    - Test that isPaid=true and paidDate=current date when marked
    - Use fast-check with credit entry generators (100 iterations)

  - [x] 13.4 Write property test for paid credit removal
    - **Property 23: Paid Credit Removal**
    - **Validates: Requirements 8.3**
    - Test that paid credit doesn't appear in overdue list on next render
    - Use React Testing Library with fast-check (100 iterations)

  - [x] 13.5 Write property test for historical data preservation
    - **Property 24: Historical Data Preservation**
    - **Validates: Requirements 8.5**
    - Test that historical fields remain unchanged when marked as paid
    - Use fast-check with credit entry generators (100 iterations)

  - [x] 13.6 Write unit tests for mark as paid functionality
    - Test button click updates credit entry
    - Test localStorage update
    - Test DynamoDB sync marking
    - Test credit removal from UI
    - Test historical data preservation
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

- [x] 14. Checkpoint - Ensure Follow-Up Panel tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 15. Implement multi-language support
  - [x] 15.1 Add language preference handling to Follow-Up Panel
    - Retrieve language preference from localStorage
    - Pass language to WhatsApp Link Generator
    - Use translation keys for all UI labels
    - Support English, Hindi, and Marathi
    - _Requirements: 7.1, 7.2, 7.3, 7.4_

  - [x] 15.2 Write property test for UI language translation
    - **Property 19: UI Language Translation**
    - **Validates: Requirements 7.1, 7.4**
    - Test that all UI labels are displayed in corresponding language
    - Use React Testing Library with language enum generator (100 iterations)

  - [x] 15.3 Write property test for language change reactivity
    - **Property 20: Language Change Reactivity**
    - **Validates: Requirements 7.5**
    - Test that Follow-Up Panel re-renders with new language immediately
    - Use React Testing Library with language change simulation (100 iterations)

  - [x] 15.4 Write unit tests for multi-language support
    - Test English UI labels
    - Test Hindi UI labels
    - Test Marathi UI labels
    - Test language preference change
    - Test WhatsApp message language matching
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [x] 16. Implement offline-first functionality
  - [x] 16.1 Add offline mode handling to Follow-Up Panel
    - Display sync status indicator (online/offline/syncing)
    - Allow all operations while offline
    - Queue updates for sync when online
    - Show pending sync count
    - Handle localStorage quota exceeded error
    - _Requirements: 5.1, 5.4, 5.5_

  - [x] 16.2 Write property test for offline reminder persistence
    - **Property 14: Offline Reminder Persistence**
    - **Validates: Requirements 5.5**
    - Test that reminder sent while offline is stored with syncStatus='pending'
    - Use fast-check with credit entry generators (100 iterations)

  - [x] 16.3 Write unit tests for offline functionality
    - Test operations while offline (airplane mode simulation)
    - Test sync queue population
    - Test sync when coming online
    - Test localStorage quota exceeded handling
    - Test sync status indicator display
    - _Requirements: 5.1, 5.4, 5.5_

- [x] 17. Add error handling and validation
  - [x] 17.1 Implement error handling in Follow-Up Panel
    - Validate phone number format (10 digits, numeric)
    - Display localized error messages
    - Handle network errors gracefully
    - Handle localStorage quota exceeded
    - Handle sync conflicts
    - Log errors for debugging
    - _Requirements: 3.1, 5.2, 6.3_

  - [x] 17.2 Write unit tests for error handling
    - Test invalid phone number validation
    - Test network error handling
    - Test localStorage quota exceeded
    - Test sync conflict resolution
    - Test error message localization
    - _Requirements: 3.1, 5.2, 6.3_

- [x] 18. Add Follow-Up Panel summary section
  - [x] 18.1 Implement FollowUpSummary display
    - Calculate total overdue count
    - Calculate total overdue amount
    - Calculate oldest overdue days
    - Display summary at top of panel
    - Use localized labels
    - _Requirements: 1.1, 2.1, 10.4_

  - [x] 18.2 Write unit tests for summary section
    - Test summary calculation with multiple credits
    - Test summary with empty list
    - Test summary with single credit
    - Test localized labels
    - _Requirements: 1.1, 2.1_

- [x] 19. Checkpoint - Ensure all component tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 20. Integration and wiring
  - [x] 20.1 Integrate Follow-Up Panel into main application
    - Add Follow-Up Panel to dashboard or dedicated page
    - Pass userId from session/auth context
    - Pass language preference from user profile
    - Connect to existing credit tracking system
    - Ensure sync service is initialized
    - _Requirements: 1.1, 5.1, 7.2_

  - [x] 20.2 Update existing credit entry form to include phone number field
    - Add optional phoneNumber field to CreditTracking component
    - Validate phone number format (10 digits)
    - Store phone number in localStorage and DynamoDB
    - _Requirements: 3.3, 6.5_

  - [x] 20.3 Update DynamoDB schema to include lastReminderAt field
    - Ensure credit entry records include lastReminderAt (optional)
    - Update sync service to handle new field
    - Test backward compatibility with existing records
    - _Requirements: 4.1, 6.5_

  - [x] 20.4 Write end-to-end integration tests
    - Test complete flow: create credit → becomes overdue → send reminder → mark as paid
    - Test offline mode: create credit offline → sync when online
    - Test language switching: change language → UI updates
    - Test multi-device sync: update on device A → sync to device B
    - Use Playwright for E2E testing
    - _Requirements: 1.1, 3.1, 4.1, 5.3, 7.5, 8.2_

- [x] 21. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties (25 properties total)
- Unit tests validate specific examples and edge cases
- All financial calculations are deterministic (no AI dependencies)
- localStorage is the primary data source (offline-first)
- DynamoDB is used for cloud backup and multi-device sync
- Multi-language support for English, Hindi, and Marathi
- WhatsApp integration uses URL scheme (no actual message sending)
