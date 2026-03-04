# Design Document: Udhaar Follow-up & Collections Helper

## Overview

The Udhaar Follow-up Helper is a deterministic credit collections management system that enables small shop owners to track unpaid credits (udhaar) and send WhatsApp reminders to customers. The system follows an offline-first architecture with DynamoDB cloud backup, ensuring reliability without network dependency.

### Key Design Principles

1. **Deterministic Core**: All credit calculations (overdue status, sorting, filtering) use pure TypeScript functions without AI or network dependencies
2. **Offline-First**: Primary data source is localStorage with background sync to DynamoDB
3. **Multi-Language Support**: UI and WhatsApp messages support English, Hindi, and Marathi
4. **WhatsApp Integration**: One-click reminder generation with properly encoded URLs
5. **Reminder Tracking**: Persistent timestamp recording for follow-up history

### System Boundaries

**In Scope:**
- Overdue credit detection and sorting
- WhatsApp reminder link generation
- Reminder history tracking
- Offline-first data access
- DynamoDB synchronization
- Multi-language UI and messages

**Out of Scope:**
- Actual WhatsApp message sending (uses WhatsApp web/app)
- Payment processing
- Credit scoring or risk assessment
- SMS notifications
- Email reminders
- AI-based collection strategies

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Follow-Up Panel (UI)                      │
│  - Display overdue credits                                   │
│  - WhatsApp reminder buttons                                 │
│  - Mark as paid functionality                                │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│              Credit Manager (Deterministic)                  │
│  - Calculate overdue status                                  │
│  - Sort by urgency (days overdue → amount)                   │
│  - Filter by threshold (≥3 days)                             │
└────────────────┬────────────────────────────────────────────┘
                 │
        ┌────────┴────────┐
        ▼                 ▼
┌──────────────┐   ┌──────────────────┐
│  localStorage│   │ WhatsApp Link    │
│  (Primary)   │   │ Generator        │
└──────┬───────┘   └──────────────────┘
       │
       ▼
┌──────────────────┐
│  Sync Service    │
│  (Background)    │
└──────┬───────────┘
       │
       ▼
┌──────────────────┐
│  DynamoDB        │
│  (Cloud Backup)  │
└──────────────────┘
```

### Component Architecture

#### 1. Credit Manager (lib/credit-manager.ts)

Pure TypeScript module responsible for all credit calculations:

```typescript
interface CreditManager {
  // Calculate overdue status for a credit entry
  calculateOverdueStatus(credit: CreditEntry, currentDate: Date): OverdueStatus;
  
  // Get all overdue credits filtered by threshold
  getOverdueCredits(credits: CreditEntry[], threshold: number): OverdueCredit[];
  
  // Sort credits by urgency (days overdue DESC, amount DESC)
  sortByUrgency(credits: OverdueCredit[]): OverdueCredit[];
  
  // Calculate days overdue
  calculateDaysOverdue(dueDate: string, currentDate: Date): number;
}
```

**Design Decisions:**
- Pure functions with no side effects for testability
- Date calculations use ISO 8601 strings for consistency
- All calculations are synchronous (no async operations)
- No external dependencies (network, AI, database)

#### 2. WhatsApp Link Generator (lib/whatsapp-link-generator.ts)

Generates properly encoded WhatsApp URLs with localized messages:

```typescript
interface WhatsAppLinkGenerator {
  // Generate WhatsApp URL with reminder message
  generateReminderLink(
    phoneNumber: string,
    customerName: string,
    amount: number,
    dueDate: string,
    language: Language
  ): string;
  
  // Get localized reminder message template
  getReminderMessage(
    customerName: string,
    amount: number,
    dueDate: string,
    language: Language
  ): string;
}
```

**Design Decisions:**
- URL encoding handles special characters and emojis
- Phone number format: +91XXXXXXXXXX (India)
- Message templates stored in translations.ts
- No actual message sending (opens WhatsApp app/web)

#### 3. Reminder Tracker (lib/reminder-tracker.ts)

Tracks when reminders were sent to customers:

```typescript
interface ReminderTracker {
  // Record reminder sent timestamp
  recordReminder(creditId: string, userId: string): Promise<void>;
  
  // Get last reminder timestamp
  getLastReminder(creditId: string): Date | null;
  
  // Calculate days since last reminder
  calculateDaysSinceReminder(lastReminderAt: string, currentDate: Date): number;
}
```

**Design Decisions:**
- Updates both localStorage and marks for DynamoDB sync
- Timestamps stored in ISO 8601 format
- Optimistic updates (UI updates immediately)

#### 4. Follow-Up Panel Component (components/FollowUpPanel.tsx)

React component displaying overdue credits and actions:

```typescript
interface FollowUpPanelProps {
  userId: string;
  language: Language;
  overdueThreshold?: number; // Default: 3 days
  onCreditPaid?: (creditId: string) => void;
}
```

**Design Decisions:**
- Renders on every mount (recalculates overdue status)
- Uses Credit Manager for all calculations
- Displays sync status indicator
- Responsive design for mobile-first usage

#### 5. Sync Service (lib/credit-sync.ts)

Existing service extended with reminder tracking:

```typescript
interface SyncService {
  // Existing methods...
  
  // Update credit entry with reminder timestamp
  updateCreditReminder(
    creditId: string,
    userId: string,
    reminderAt: string
  ): Promise<void>;
}
```

**Design Decisions:**
- Reuses existing sync infrastructure
- Last-write-wins conflict resolution
- Background sync on network availability
- Graceful degradation when offline

### Data Flow

#### Viewing Overdue Credits

```
User opens Follow-Up Panel
    ↓
Load credits from localStorage
    ↓
Credit Manager calculates overdue status
    ↓
Credit Manager filters by threshold (≥3 days)
    ↓
Credit Manager sorts by urgency
    ↓
Display in Follow-Up Panel
```

#### Sending WhatsApp Reminder

```
User clicks WhatsApp button
    ↓
WhatsApp Link Generator creates URL
    ↓
Reminder Tracker records timestamp
    ↓
Update localStorage (immediate)
    ↓
Mark for DynamoDB sync (background)
    ↓
Open WhatsApp app/web with pre-filled message
```

#### Marking Credit as Paid

```
User clicks "Mark as Paid"
    ↓
Update credit entry (isPaid = true, paidAt = now)
    ↓
Update localStorage (immediate)
    ↓
Mark for DynamoDB sync (background)
    ↓
Remove from overdue list (re-render)
```

## Components and Interfaces

### Core Data Types

```typescript
// Extended CreditEntry with reminder tracking
interface CreditEntry {
  id: string;
  userId: string;
  customerName: string;
  phoneNumber?: string; // Optional, for WhatsApp
  amount: number;
  dateGiven: string; // ISO 8601
  dueDate: string; // ISO 8601
  isPaid: boolean;
  paidDate?: string; // ISO 8601
  lastReminderAt?: string; // ISO 8601
  createdAt: string;
  updatedAt: string;
}

// Overdue credit with calculated fields
interface OverdueCredit extends CreditEntry {
  daysOverdue: number;
  daysSinceReminder: number | null;
}

// Overdue status calculation result
interface OverdueStatus {
  isOverdue: boolean;
  daysOverdue: number;
  meetsThreshold: boolean; // >= threshold days
}

// WhatsApp reminder configuration
interface ReminderConfig {
  phoneNumber: string;
  customerName: string;
  amount: number;
  dueDate: string;
  language: Language;
}

// Follow-up panel summary
interface FollowUpSummary {
  totalOverdue: number; // Count
  totalAmount: number; // Sum of amounts
  oldestOverdue: number; // Max days overdue
}
```

### API Endpoints

#### GET /api/credit/overdue

Get overdue credits for a user.

**Request:**
```typescript
{
  userId: string;
  threshold?: number; // Default: 3
}
```

**Response:**
```typescript
{
  success: boolean;
  data?: {
    credits: OverdueCredit[];
    summary: FollowUpSummary;
  };
  error?: string;
}
```

#### PUT /api/credit/reminder

Record reminder sent timestamp.

**Request:**
```typescript
{
  userId: string;
  creditId: string;
  reminderAt: string; // ISO 8601
}
```

**Response:**
```typescript
{
  success: boolean;
  data?: {
    creditId: string;
    lastReminderAt: string;
  };
  error?: string;
}
```

### Translation Keys

New translation keys for Follow-Up Panel:

```typescript
{
  'followUp.title': 'Follow-up & Collections',
  'followUp.noOverdue': 'No overdue credits. Great job!',
  'followUp.daysOverdue': 'days overdue',
  'followUp.sendReminder': 'Send WhatsApp Reminder',
  'followUp.lastReminder': 'Last reminder',
  'followUp.neverReminded': 'Never reminded',
  'followUp.markPaid': 'Mark as Paid',
  'followUp.threshold': 'Showing credits overdue by {days}+ days',
  'followUp.totalOverdue': 'Total Overdue',
  'followUp.oldestCredit': 'Oldest Credit',
  
  // WhatsApp message templates
  'whatsapp.reminder.en': 'Hello {name}, this is a friendly reminder that ₹{amount} is due since {date}. Please pay at your earliest convenience. Thank you!',
  'whatsapp.reminder.hi': 'नमस्ते {name}, यह एक अनुस्मारक है कि ₹{amount} {date} से बकाया है। कृपया जल्द से जल्द भुगतान करें। धन्यवाद!',
  'whatsapp.reminder.mr': 'नमस्कार {name}, हे एक स्मरणपत्र आहे की ₹{amount} {date} पासून थकित आहे. कृपया लवकरात लवकर पेमेंट करा. धन्यवाद!',
}
```

## Data Models

### DynamoDB Schema

Extends existing credit entry schema with reminder tracking:

```
PK: USER#{userId}
SK: CREDIT#{creditId}

Attributes:
- entityType: "CREDIT"
- userId: string
- id: string (creditId)
- customerName: string
- phoneNumber: string (optional)
- amount: number
- dateGiven: string (ISO 8601)
- dueDate: string (ISO 8601)
- isPaid: boolean
- paidDate: string (ISO 8601, optional)
- lastReminderAt: string (ISO 8601, optional) ← NEW
- createdAt: string (ISO 8601)
- updatedAt: string (ISO 8601)
- ttl: number (30 days after paid)
```

**Indexes:**
- Primary: PK + SK (existing)
- No additional GSI needed (queries by userId)

### localStorage Schema

```typescript
// Key: vyapar-credit-entries
interface LocalCreditEntry extends CreditEntry {
  syncStatus: 'synced' | 'pending' | 'error';
  lastSyncAttempt?: string;
}

// Key: vyapar-credit-sync-status
interface SyncStatus {
  lastSyncTime: string;
  pendingCount: number;
  errorCount: number;
}
```

### Calculation Formulas

#### Days Overdue

```typescript
function calculateDaysOverdue(dueDate: string, currentDate: Date): number {
  const due = new Date(dueDate);
  const current = new Date(currentDate);
  
  // Set time to midnight for date-only comparison
  due.setHours(0, 0, 0, 0);
  current.setHours(0, 0, 0, 0);
  
  const diffMs = current.getTime() - due.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  return Math.max(0, diffDays);
}
```

#### Urgency Sorting

```typescript
function sortByUrgency(credits: OverdueCredit[]): OverdueCredit[] {
  return credits.sort((a, b) => {
    // Primary: days overdue (descending)
    if (a.daysOverdue !== b.daysOverdue) {
      return b.daysOverdue - a.daysOverdue;
    }
    
    // Secondary: amount (descending)
    return b.amount - a.amount;
  });
}
```

#### Overdue Threshold Filter

```typescript
function filterByThreshold(
  credits: CreditEntry[],
  threshold: number,
  currentDate: Date
): OverdueCredit[] {
  return credits
    .filter(credit => !credit.isPaid)
    .map(credit => ({
      ...credit,
      daysOverdue: calculateDaysOverdue(credit.dueDate, currentDate),
      daysSinceReminder: credit.lastReminderAt
        ? calculateDaysOverdue(credit.lastReminderAt, currentDate)
        : null,
    }))
    .filter(credit => credit.daysOverdue >= threshold);
}
```


## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property Reflection

After analyzing all acceptance criteria, the following redundancies were identified and consolidated:

**Redundancy Group 1: Sorting**
- 2.1 and 2.2 both test sorting behavior. 2.2 is a specific case of 2.1's general sorting rule.
- **Resolution**: Combine into single comprehensive sorting property.

**Redundancy Group 2: WhatsApp Button Display**
- 3.3 and 3.4 test the same conditional rendering (button appears when phone exists, doesn't when missing).
- **Resolution**: Combine into single property about conditional button rendering.

**Redundancy Group 3: Language Selection**
- 3.6, 3.7, 3.8, and 7.3 all test language-specific message generation.
- **Resolution**: Combine into single property about language-based message selection.

**Redundancy Group 4: Reminder Display**
- 4.2 and 4.3 test the same conditional rendering (show date when exists, show "never" when missing).
- **Resolution**: Combine into single property about conditional reminder display.

**Redundancy Group 5: Dual Updates**
- 4.4 and 8.4 both test that updates happen in localStorage and sync queue.
- **Resolution**: Combine into single property about dual persistence.

**Redundancy Group 6: Threshold Filtering**
- 1.1 and 10.2 both test filtering by overdue threshold.
- **Resolution**: Keep 1.1 as the primary property.

**Redundancy Group 7: UI Translation**
- 7.1 and 7.4 both test that UI labels are translated.
- **Resolution**: Keep 7.1 as the comprehensive property.

### Property 1: Overdue Credit Filtering

*For any* list of credit entries, current date, and threshold value, the filtered overdue credits should include only unpaid credits where days overdue is greater than or equal to the threshold.

**Validates: Requirements 1.1, 10.2**

### Property 2: Days Overdue Calculation

*For any* credit entry with a due date and any current date, the calculated days overdue should equal the number of calendar days between the due date and current date (minimum 0).

**Validates: Requirements 1.2**

### Property 3: Overdue Credit Display Fields

*For any* overdue credit, the rendered display should contain the customer name, amount owed, date given, due date, and days overdue.

**Validates: Requirements 1.3**

### Property 4: Urgency-Based Sorting

*For any* list of overdue credits, the sorted list should be ordered first by days overdue in descending order, then by amount in descending order for credits with equal days overdue.

**Validates: Requirements 2.1, 2.2**

### Property 5: Display Order Preservation

*For any* ordered list of overdue credits from the Credit Manager, the Follow-Up Panel should display them in the same order.

**Validates: Requirements 2.3**

### Property 6: WhatsApp URL Structure

*For any* phone number, customer name, amount, due date, and language, the generated WhatsApp URL should contain the properly formatted phone number and URL-encoded message text.

**Validates: Requirements 3.1**

### Property 7: Conditional WhatsApp Button Rendering

*For any* overdue credit, a WhatsApp reminder button should be displayed if and only if the credit entry has a non-empty phone number.

**Validates: Requirements 3.3, 3.4**

### Property 8: Reminder Message Content

*For any* customer name, amount, and due date, the generated reminder message should include the customer name, the amount owed, and the due date.

**Validates: Requirements 3.5**

### Property 9: Language-Based Message Selection

*For any* language preference (English, Hindi, or Marathi), the WhatsApp reminder message should use the message template corresponding to that language.

**Validates: Requirements 3.6, 3.7, 3.8, 7.3**

### Property 10: Reminder Timestamp Recording

*For any* credit entry, when a reminder is sent, the last_reminder_at field should be updated to the current timestamp.

**Validates: Requirements 4.1**

### Property 11: Conditional Reminder Display

*For any* overdue credit, the display should show the last reminder date if last_reminder_at exists, or "Never reminded" (localized) if it doesn't exist.

**Validates: Requirements 4.2, 4.3**

### Property 12: Dual Persistence Updates

*For any* credit entry update (reminder or payment), the update should be written to both localStorage and marked for DynamoDB sync.

**Validates: Requirements 4.4, 8.4**

### Property 13: Days Since Reminder Calculation

*For any* credit entry with a last_reminder_at timestamp and any current date, the calculated days since reminder should equal the number of calendar days between the reminder timestamp and current date.

**Validates: Requirements 4.5**

### Property 14: Offline Reminder Persistence

*For any* reminder sent while offline, the update should be stored in localStorage with syncStatus marked as 'pending'.

**Validates: Requirements 5.5**

### Property 15: DynamoDB Key Format

*For any* credit entry saved to DynamoDB, the partition key should be "USER#{userId}" and the sort key should be "CREDIT#{creditId}".

**Validates: Requirements 6.1**

### Property 16: Sync Data Consistency

*For any* credit entry synced from localStorage to DynamoDB, the DynamoDB record should contain identical values for all fields present in the localStorage entry.

**Validates: Requirements 6.2**

### Property 17: Last-Write-Wins Conflict Resolution

*For any* two conflicting updates to the same credit entry, the sync service should persist the update with the later timestamp.

**Validates: Requirements 6.3**

### Property 18: Complete Field Persistence

*For any* credit entry saved to DynamoDB, the record should include all required fields: userId, customerName, amount, dateGiven, dueDate, isPaid, phoneNumber (if present), and lastReminderAt (if present).

**Validates: Requirements 6.5**

### Property 19: UI Language Translation

*For any* language preference (English, Hindi, or Marathi), all UI labels in the Follow-Up Panel should be displayed in the corresponding language.

**Validates: Requirements 7.1, 7.4**

### Property 20: Language Change Reactivity

*For any* language preference change, the Follow-Up Panel should re-render with all labels in the new language.

**Validates: Requirements 7.5**

### Property 21: Mark as Paid Button Display

*For any* overdue credit, the Follow-Up Panel should display a "Mark as Paid" button.

**Validates: Requirements 8.1**

### Property 22: Payment Status Update

*For any* credit entry marked as paid, the isPaid field should be set to true and the paidDate field should be set to the current date.

**Validates: Requirements 8.2**

### Property 23: Paid Credit Removal

*For any* credit entry marked as paid, it should not appear in the overdue credits list on the next render.

**Validates: Requirements 8.3**

### Property 24: Historical Data Preservation

*For any* credit entry marked as paid, all historical fields (dateGiven, dueDate, lastReminderAt) should remain unchanged.

**Validates: Requirements 8.5**

### Property 25: Deterministic Calculation

*For any* credit entry and current date, calling the overdue calculation function multiple times with the same inputs should produce identical results.

**Validates: Requirements 9.3**

## Error Handling

### Error Categories

#### 1. Network Errors

**Scenario**: DynamoDB sync fails due to network unavailability

**Handling**:
- Mark credit entry as 'pending' in localStorage
- Display sync status indicator to user
- Retry sync when network becomes available
- No data loss (localStorage is source of truth)

**User Experience**:
- Operations continue normally
- Sync status shows "Offline" or "Pending sync"
- No blocking or error messages

#### 2. Data Validation Errors

**Scenario**: Invalid phone number format for WhatsApp

**Handling**:
- Validate phone number format before generating URL
- Display error message if invalid
- Disable WhatsApp button for invalid numbers
- Allow user to edit and correct

**Validation Rules**:
- Must be 10 digits (India)
- Must be numeric only
- Optional: validate against known carrier prefixes

#### 3. Missing Data Errors

**Scenario**: Credit entry missing required fields

**Handling**:
- Validate required fields before save
- Display field-specific error messages
- Prevent save until all required fields are provided
- Preserve partial input (don't clear form)

**Required Fields**:
- customerName (non-empty string)
- amount (positive number)
- dueDate (valid date, not in future)

#### 4. Sync Conflict Errors

**Scenario**: Same credit updated on multiple devices

**Handling**:
- Apply last-write-wins strategy
- Use updatedAt timestamp for conflict resolution
- No user intervention required
- Log conflict for debugging

**Conflict Resolution**:
```typescript
function resolveConflict(local: CreditEntry, remote: CreditEntry): CreditEntry {
  const localTime = new Date(local.updatedAt).getTime();
  const remoteTime = new Date(remote.updatedAt).getTime();
  
  return remoteTime > localTime ? remote : local;
}
```

#### 5. localStorage Quota Errors

**Scenario**: localStorage full (rare, ~5-10MB limit)

**Handling**:
- Catch QuotaExceededError
- Display warning to user
- Suggest syncing and clearing old paid credits
- Provide manual cleanup option

**Prevention**:
- Auto-archive paid credits older than 30 days
- Compress data if possible
- Monitor storage usage

### Error Messages

All error messages must be localized:

```typescript
{
  'error.networkUnavailable': {
    en: 'Network unavailable. Changes will sync when online.',
    hi: 'नेटवर्क उपलब्ध नहीं है। ऑनलाइन होने पर परिवर्तन सिंक होंगे।',
    mr: 'नेटवर्क उपलब्ध नाही. ऑनलाइन असताना बदल सिंक होतील.',
  },
  'error.invalidPhoneNumber': {
    en: 'Invalid phone number. Please enter 10 digits.',
    hi: 'अमान्य फ़ोन नंबर। कृपया 10 अंक दर्ज करें।',
    mr: 'अवैध फोन नंबर. कृपया 10 अंक प्रविष्ट करा.',
  },
  'error.requiredField': {
    en: 'This field is required.',
    hi: 'यह फ़ील्ड आवश्यक है।',
    mr: 'हे फील्ड आवश्यक आहे.',
  },
  'error.storageQuotaExceeded': {
    en: 'Storage full. Please sync and clear old records.',
    hi: 'स्टोरेज भरा हुआ है। कृपया सिंक करें और पुराने रिकॉर्ड साफ़ करें।',
    mr: 'स्टोरेज भरले आहे. कृपया सिंक करा आणि जुने रेकॉर्ड साफ करा.',
  },
}
```

### Graceful Degradation

The system must degrade gracefully when services are unavailable:

| Service | Unavailable | Degraded Behavior |
|---------|-------------|-------------------|
| DynamoDB | Network down | Full offline mode, sync when online |
| WhatsApp | App not installed | Show error, suggest installing WhatsApp |
| localStorage | Quota exceeded | Warn user, suggest cleanup, block new entries |
| Translations | Missing key | Fall back to English, log missing key |

## Testing Strategy

### Dual Testing Approach

The Udhaar Follow-up Helper requires both unit testing and property-based testing for comprehensive coverage:

**Unit Tests**: Verify specific examples, edge cases, and error conditions
**Property Tests**: Verify universal properties across all inputs

Together, these approaches provide comprehensive coverage where unit tests catch concrete bugs and property tests verify general correctness.

### Property-Based Testing Configuration

**Library Selection**: fast-check (TypeScript/JavaScript)

**Configuration**:
- Minimum 100 iterations per property test
- Each test must reference its design document property
- Tag format: `Feature: udhaar-follow-up-helper, Property {number}: {property_text}`

**Example Property Test**:

```typescript
import fc from 'fast-check';

// Feature: udhaar-follow-up-helper, Property 2: Days Overdue Calculation
describe('Credit Manager - Days Overdue Calculation', () => {
  it('should calculate days overdue correctly for any credit and date', () => {
    fc.assert(
      fc.property(
        fc.date({ min: new Date('2020-01-01'), max: new Date('2025-12-31') }), // dueDate
        fc.date({ min: new Date('2020-01-01'), max: new Date('2025-12-31') }), // currentDate
        (dueDate, currentDate) => {
          const credit: CreditEntry = {
            id: 'test-credit',
            userId: 'test-user',
            customerName: 'Test Customer',
            amount: 1000,
            dateGiven: '2024-01-01',
            dueDate: dueDate.toISOString().split('T')[0],
            isPaid: false,
            createdAt: '2024-01-01T00:00:00Z',
            updatedAt: '2024-01-01T00:00:00Z',
          };

          const daysOverdue = calculateDaysOverdue(credit.dueDate, currentDate);

          // Property: days overdue should be >= 0
          expect(daysOverdue).toBeGreaterThanOrEqual(0);

          // Property: if current date is before due date, days overdue should be 0
          if (currentDate < dueDate) {
            expect(daysOverdue).toBe(0);
          }

          // Property: if current date is after due date, days overdue should be positive
          if (currentDate > dueDate) {
            expect(daysOverdue).toBeGreaterThan(0);
          }

          // Property: calculation should match manual calculation
          const expectedDays = Math.max(
            0,
            Math.floor((currentDate.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24))
          );
          expect(daysOverdue).toBe(expectedDays);
        }
      ),
      { numRuns: 100 }
    );
  });
});
```

### Unit Testing Focus Areas

Unit tests should focus on:

1. **Specific Examples**:
   - Credit 3 days overdue with ₹5000 amount
   - Credit 10 days overdue with ₹1000 amount
   - Credit due today (0 days overdue)

2. **Edge Cases**:
   - Empty credit list
   - Credit with missing phone number
   - Credit with special characters in name
   - Credit with very large amount
   - Credit with due date far in past

3. **Error Conditions**:
   - Invalid phone number format
   - Missing required fields
   - localStorage quota exceeded
   - Network unavailable during sync

4. **Integration Points**:
   - localStorage read/write operations
   - DynamoDB sync operations
   - WhatsApp URL opening
   - Language preference changes

### Test Coverage Requirements

**Minimum Coverage**:
- Line coverage: 80%
- Branch coverage: 75%
- Function coverage: 90%

**Critical Paths** (must have 100% coverage):
- Days overdue calculation
- Urgency sorting
- Overdue filtering
- WhatsApp URL generation
- Reminder timestamp recording
- Payment status update

### Testing Tools

**Unit Testing**:
- Jest (test runner)
- React Testing Library (component testing)
- MSW (API mocking)

**Property-Based Testing**:
- fast-check (property test generation)

**Integration Testing**:
- Playwright (E2E testing)
- localStorage mock
- DynamoDB local

### Test Data Generators

For property-based testing, create custom generators:

```typescript
// Generate random credit entry
const creditEntryArbitrary = fc.record({
  id: fc.string({ minLength: 10, maxLength: 30 }),
  userId: fc.string({ minLength: 10, maxLength: 30 }),
  customerName: fc.string({ minLength: 1, maxLength: 50 }),
  phoneNumber: fc.option(fc.string({ minLength: 10, maxLength: 10 })),
  amount: fc.integer({ min: 1, max: 1000000 }),
  dateGiven: fc.date().map(d => d.toISOString().split('T')[0]),
  dueDate: fc.date().map(d => d.toISOString().split('T')[0]),
  isPaid: fc.boolean(),
  createdAt: fc.date().map(d => d.toISOString()),
  updatedAt: fc.date().map(d => d.toISOString()),
});

// Generate random overdue credit (isPaid = false, dueDate in past)
const overdueCreditArbitrary = creditEntryArbitrary.map(credit => ({
  ...credit,
  isPaid: false,
  dueDate: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0],
}));
```

### Continuous Testing

**Pre-commit Hooks**:
- Run unit tests
- Run linter
- Check type safety

**CI/CD Pipeline**:
- Run all unit tests
- Run all property tests (100 iterations)
- Generate coverage report
- Run E2E tests
- Deploy only if all tests pass

### Manual Testing Checklist

Before release, manually verify:

- [ ] Overdue credits display correctly
- [ ] Sorting by urgency works
- [ ] WhatsApp button opens app with correct message
- [ ] Reminder timestamp updates
- [ ] Mark as paid removes from list
- [ ] Offline mode works (airplane mode)
- [ ] Sync works after coming online
- [ ] Language switching works
- [ ] All three languages display correctly
- [ ] Phone number validation works
- [ ] Error messages display correctly

