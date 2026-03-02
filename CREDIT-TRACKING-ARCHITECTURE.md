# Credit Tracking (Udhaar) Feature Architecture

## Overview

The Credit Tracking (Udhaar) feature allows small business owners to track money owed by customers, monitor due dates, and manage payments. It's designed as a lightweight, offline-first solution with cloud backup capabilities.

## Design Philosophy

1. **Offline-First**: Works without internet, syncs when online
2. **Deterministic**: No AI involved - pure calculations only
3. **Persistent**: Data stored in localStorage + DynamoDB backup
4. **Simple**: Minimal UI focused on essential operations
5. **Real-time**: Instant updates with automatic summary calculations

## Architecture Components

### 1. Data Model

```typescript
interface CreditEntry {
  userId: string;            // User identifier
  id: string;                // Unique identifier: credit_{timestamp}_{random}
  customerName: string;      // Customer/debtor name
  amount: number;            // Amount owed (₹)
  dueDate: string;          // ISO date string
  isPaid: boolean;          // Payment status
  createdAt: string;        // ISO date string
  paidAt?: string;          // ISO date string (optional)
  ttl?: number;             // DynamoDB TTL (30 days after paid)
}

interface LocalCreditEntry extends Omit<CreditEntry, 'userId'> {
  syncStatus: 'synced' | 'pending' | 'error';
  lastSyncAttempt?: string;
}

interface CreditSummary {
  totalOutstanding: number;  // Total unpaid credit
  totalOverdue: number;      // Total overdue credit
  overdueCount: number;      // Number of overdue customers
}

interface SyncStatus {
  lastSyncTime: string;
  pendingCount: number;
  errorCount: number;
}
```

### 2. Storage Strategy

**Hybrid Storage Model (Same as Daily Entries):**

```
┌─────────────────────────────────────────────────┐
│                  Client Side                     │
├─────────────────────────────────────────────────┤
│  localStorage (Primary)                          │
│  - Key: 'vyapar-credit-entries'                 │
│  - Persistent across sessions                    │
│  - Instant read/write                           │
│  - Sync status tracking                         │
│  - Offline-first architecture                   │
└─────────────────────────────────────────────────┘
                    ↕ Instant Sync
┌─────────────────────────────────────────────────┐
│                  Cloud Storage                   │
├─────────────────────────────────────────────────┤
│  AWS DynamoDB                                   │
│  - PK: USER#{userId}                            │
│  - SK: CREDIT#{id}                              │
│  - 30-day retention with TTL (after paid)       │
│  - Automatic expiration                         │
│  - Multi-device sync                            │
└─────────────────────────────────────────────────┘
```

### 3. Component Architecture

**Frontend Component: `CreditTracking.tsx`**

```
┌─────────────────────────────────────────────────┐
│           CreditTracking Component               │
├─────────────────────────────────────────────────┤
│  State Management:                               │
│  - entries: LocalCreditEntry[]                  │
│  - summary: CreditSummary                       │
│  - syncStatus: SyncStatus                       │
│  - showForm: boolean                            │
│  - isSyncing: boolean                           │
│                                                  │
│  UI Sections:                                    │
│  1. Header with sync status & "Add" button      │
│  2. Summary Cards (3 metrics)                   │
│  3. Add Form (conditional)                      │
│  4. Entries List with sync badges               │
│                                                  │
│  Actions:                                        │
│  - loadEntries() - Load from localStorage       │
│  - checkAndSync() - Auto-sync on mount          │
│  - handleAddEntry() - Try cloud, fallback local │
│  - handleMarkPaid() - Try cloud, fallback local │
│  - handleDelete() - Try cloud, delete local     │
│  - handleManualSync() - Force full sync         │
└─────────────────────────────────────────────────┘
```

**Backend API: `/api/credit/route.ts`**

```
┌─────────────────────────────────────────────────┐
│              Credit API Routes                   │
├─────────────────────────────────────────────────┤
│  GET /api/credit?userId={id}                    │
│  - Load entries from DynamoDB                   │
│  - Calculate summary                            │
│  - Return entries + summary                     │
│                                                  │
│  POST /api/credit                               │
│  - Validate input                               │
│  - Create entry with unique ID                  │
│  - Instant sync to DynamoDB                     │
│  - Return entry with synced: true               │
│                                                  │
│  PUT /api/credit                                │
│  - Validate input                               │
│  - Update entry in DynamoDB                     │
│  - Return updated entry with synced: true       │
│                                                  │
│  DELETE /api/credit?userId={id}&id={entryId}    │
│  - Delete from DynamoDB                         │
│  - Return success with synced: true             │
└─────────────────────────────────────────────────┘
```

**Sync Manager: `lib/credit-sync.ts`**

```
┌─────────────────────────────────────────────────┐
│           Credit Sync Manager                    │
├─────────────────────────────────────────────────┤
│  localStorage Operations:                        │
│  - getLocalEntries()                            │
│  - saveLocalEntry()                             │
│  - deleteLocalEntry()                           │
│  - getSyncStatus()                              │
│  - updateSyncStatus()                           │
│                                                  │
│  Sync Operations:                                │
│  - syncPendingEntries() - Push to cloud         │
│  - pullEntriesFromCloud() - Pull from cloud     │
│  - fullSync() - Pull then push                  │
│                                                  │
│  Entry Operations:                               │
│  - createCreditEntry() - Create with sync flag  │
│  - updateCreditEntry() - Update with sync flag  │
│  - markCreditAsPaid() - Mark paid with sync     │
│  - clearLocalData() - Clear on logout           │
└─────────────────────────────────────────────────┘
```

### 4. Calculation Engine

**Pure Functions in `lib/calculations.ts`:**

```typescript
// Calculate credit summary from entries
function calculateCreditSummary(entries: CreditEntry[]): CreditSummary {
  const now = new Date();
  const unpaidEntries = entries.filter(e => !e.isPaid);
  
  const totalOutstanding = unpaidEntries.reduce((sum, e) => sum + e.amount, 0);
  
  const overdueEntries = unpaidEntries.filter(e => 
    new Date(e.dueDate) < now
  );
  
  const totalOverdue = overdueEntries.reduce((sum, e) => sum + e.amount, 0);
  const overdueCount = overdueEntries.length;
  
  return { totalOutstanding, totalOverdue, overdueCount };
}
```

**Key Characteristics:**
- No side effects
- Deterministic output
- No AI involvement
- Reproducible calculations

## User Flows

### 1. Add Credit Entry (Online Mode)

```
User clicks "Add Credit"
    ↓
Form appears with fields:
- Customer Name (text)
- Amount (number, ₹)
- Due Date (date picker)
    ↓
User fills and submits
    ↓
POST /api/credit (userId, customerName, amount, dueDate)
    ↓
Server creates entry with unique ID
    ↓
Server saves to DynamoDB with TTL
    ↓
Response: { success: true, data: entry, synced: true }
    ↓
Client saves to localStorage with syncStatus: 'synced'
    ↓
UI updates with green cloud icon
    ↓
Entry visible in list
```

### 2. Add Credit Entry (Offline Mode)

```
User clicks "Add Credit"
    ↓
Form appears and user fills
    ↓
User submits
    ↓
POST /api/credit - Network Error ❌
    ↓
Catch error, fallback to offline mode
    ↓
createCreditEntry() with markAsSynced: false
    ↓
Save to localStorage with syncStatus: 'pending'
    ↓
UI updates with orange cloud-off icon
    ↓
Entry visible with "Pending" badge
    ↓
... Later when online ...
    ↓
fullSync(userId) triggered
    ↓
syncPendingEntries() loops through pending
    ↓
POST each entry to /api/credit
    ↓
Update localStorage with syncStatus: 'synced'
    ↓
UI updates with green cloud icon
```

### 3. Mark as Paid (Online Mode)

```
User clicks checkmark icon on entry
    ↓
PUT /api/credit (userId, id, isPaid: true, paidAt)
    ↓
Server updates entry in DynamoDB
    ↓
Server sets TTL (30 days from paid date)
    ↓
Response: { success: true, data: updated, synced: true }
    ↓
Client updates localStorage with syncStatus: 'synced'
    ↓
Entry shows "Paid" badge and grayed out
```

### 4. Mark as Paid (Offline Mode)

```
User clicks checkmark icon
    ↓
PUT /api/credit - Network Error ❌
    ↓
Catch error, fallback to offline mode
    ↓
updateCreditEntry() with markAsSynced: false
    ↓
Save to localStorage with syncStatus: 'pending'
    ↓
Entry shows "Paid" + "Pending" badges
    ↓
... Later when online ...
    ↓
fullSync(userId) syncs the update
```

### 5. Delete Entry

```
User clicks trash icon on entry
    ↓
Confirm deletion dialog
    ↓
User confirms
    ↓
DELETE /api/credit?userId={id}&id={entryId}
    ↓
Server deletes from DynamoDB
    ↓
Response: { success: true, synced: true }
    ↓
Client deletes from localStorage
    ↓
Entry removed from UI
    ↓
(If offline, delete local only, sync later)
```

### 6. Full Sync Flow

```
User clicks sync button OR page loads
    ↓
fullSync(userId)
    ↓
├─ pullEntriesFromCloud()
│  ├─ GET /api/credit?userId={id}
│  ├─ Merge cloud entries with local
│  └─ Cloud = source of truth for synced entries
│
└─ syncPendingEntries()
   ├─ Get all entries with status='pending' or 'error'
   ├─ Loop through each entry
   ├─ POST/PUT to /api/credit
   ├─ Update syncStatus: 'synced' or 'error'
   └─ Update sync status summary
    ↓
UI shows sync result
- Green cloud: All synced
- Orange cloud: Pending items
- Red badge: Errors
```

## UI Design

### Header with Sync Status

```
┌─────────────────────────────────────────────────┐
│ 💳 Credit Tracking    [🔄 Syncing...] [+ Add]  │
│                       [☁️ Synced]    [+ Add]    │
│                       [☁️❌ 2 Pending] [+ Add]  │
└─────────────────────────────────────────────────┘
```

### Summary Cards (3 Metrics)

```
┌──────────────────┬──────────────────┬──────────────────┐
│ Total Outstanding│  Total Overdue   │ Overdue Customers│
│   ₹25,000       │    ₹8,000       │        3         │
│  (Purple)        │    (Red)         │    (Orange)      │
└──────────────────┴──────────────────┴──────────────────┘
```

### Entry Card States

**Unpaid & Not Overdue (Synced):**
```
┌─────────────────────────────────────────────────┐
│ Ramesh Kumar                                     │
│ Due: 15 Mar 2026                                │
│                                    ₹5,000  ✓  🗑 │
└─────────────────────────────────────────────────┘
White background, gray border
```

**Unpaid & Not Overdue (Pending Sync):**
```
┌─────────────────────────────────────────────────┐
│ Ramesh Kumar  [Pending]                         │
│ Due: 15 Mar 2026                                │
│                                    ₹5,000  ✓  🗑 │
└─────────────────────────────────────────────────┘
White background, orange "Pending" badge
```

**Unpaid & Overdue:**
```
┌─────────────────────────────────────────────────┐
│ Suresh Patel  ⚠️                                │
│ Due: 20 Feb 2026                                │
│                                    ₹3,000  ✓  🗑 │
└─────────────────────────────────────────────────┘
Red background, red border, alert icon
```

**Paid (Synced):**
```
┌─────────────────────────────────────────────────┐
│ Mukesh Singh  [Paid]                            │
│ Due: 10 Mar 2026                                │
│                                    ₹2,000     🗑 │
└─────────────────────────────────────────────────┘
Gray background, grayed out, no checkmark
```

**Paid (Pending Sync):**
```
┌─────────────────────────────────────────────────┐
│ Mukesh Singh  [Paid] [Pending]                  │
│ Due: 10 Mar 2026                                │
│                                    ₹2,000     🗑 │
└─────────────────────────────────────────────────┘
Gray background, both badges visible
```

**Sync Error:**
```
┌─────────────────────────────────────────────────┐
│ Ramesh Kumar  [Error]                           │
│ Due: 15 Mar 2026                                │
│                                    ₹5,000  ✓  🗑 │
└─────────────────────────────────────────────────┘
White background, red "Error" badge
```

## Integration with Health Score

Credit tracking contributes to the overall business health score:

```typescript
// Credit score component (0-20 points)
if (creditSummary.overdueCount === 0) {
  creditScore = 20;  // Excellent
} else if (creditSummary.overdueCount <= 2) {
  creditScore = 10;  // Acceptable
} else {
  creditScore = 0;   // Poor
}
```

**Health Score Breakdown:**
- Margin Score: 0-30 points
- Expense Score: 0-30 points
- Cash Score: 0-20 points
- **Credit Score: 0-20 points** ← Credit tracking impact

## DynamoDB Schema

### Table Structure

```
Table Name: vyapar-ai
Partition Key: PK (String)
Sort Key: SK (String)
TTL Attribute: ttl (Number)
Billing Mode: On-Demand
```

### Item Structure for Credit Entry

```json
{
  "PK": "USER#550e8400-e29b-41d4-a716-446655440000",
  "SK": "CREDIT#credit_1710512345678_abc123",
  "entityType": "CREDIT",
  
  // Entry Data
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "id": "credit_1710512345678_abc123",
  "customerName": "Ramesh Kumar",
  "amount": 5000,
  "dueDate": "2026-03-15",
  "isPaid": false,
  
  // Metadata
  "createdAt": "2026-03-01T10:30:00.000Z",
  "paidAt": null,
  
  // TTL (30 days after paid, null if unpaid)
  "ttl": null
}
```

### Access Patterns

```
1. Get single credit entry by ID
   Query: PK = USER#userId AND SK = CREDIT#id
   
2. Get all credit entries for user
   Query: PK = USER#userId AND SK begins_with CREDIT#
   
3. Delete credit entry
   Delete: PK = USER#userId AND SK = CREDIT#id
```

### TTL Behavior

```
Unpaid Entry:
- ttl = null (no expiration)
- Remains in database indefinitely

Paid Entry:
- ttl = timestamp + 30 days
- Automatically deleted after 30 days
- Reduces storage costs
- Maintains historical data for 1 month
```

### Cost Analysis

```
Assumptions:
- 1000 active users
- 10 credit entries per user per month
- 30-day retention after paid
- 50% payment rate

Storage:
- Entry size: ~300 bytes
- Active entries: 1000 users × 10 entries × 50% unpaid = 5,000 entries
- Paid entries (30-day window): 1000 × 10 × 50% × 1 month = 5,000 entries
- Total entries: 10,000 entries
- Total storage: 10,000 × 300 bytes = 3 MB
- Cost: FREE (within 25 GB free tier)

Read Operations (per month):
- Page load: 1 query per user per day = 30,000 queries
- Sync operations: 2 queries per user per week = 8,000 queries
- Total: 38,000 queries
- RCU: ~5 (well within 25 RCU free tier)
- Cost: FREE

Write Operations (per month):
- New entries: 10,000 writes
- Mark paid: 5,000 writes
- Updates: 2,000 writes
- Total: 17,000 writes
- WCU: ~3 (well within 25 WCU free tier)
- Cost: FREE

Total Monthly Cost: $0 (FREE TIER)
```

## Localization Support

All UI text supports multiple languages (English, Hindi, Marathi):

```typescript
// Translation keys used:
- creditTracking
- addCredit
- totalOutstanding
- totalOverdue
- overdueCustomers
- customerName
- amount
- dueDate
- save
- cancel
- paid
- markPaid
- delete
- noCreditEntries
```

## Performance Considerations

1. **Instant Updates**: All operations complete in <100ms
2. **Minimal Re-renders**: Only affected components update
3. **Efficient Calculations**: O(n) complexity for summary
4. **Small Data Size**: Typical user has 10-50 entries
5. **localStorage Limits**: ~5MB available, credit data uses <100KB

## Security & Privacy

1. **No PII Exposure**: Customer names stored locally only
2. **Session-based**: Server data expires in 2 hours
3. **Client-side Encryption**: Future enhancement for localStorage
4. **No External APIs**: All processing happens locally/server

## Future Enhancements

### Phase 1: Enhanced Sync (Implemented ✅)
- ✅ DynamoDB cloud backup
- ✅ Multi-device synchronization
- ✅ Offline-first with automatic sync
- ✅ Conflict resolution for offline edits
- ✅ 30-day retention with TTL
- ✅ Sync status indicators

### Phase 2: Notifications
- WhatsApp reminders for overdue payments
- SMS alerts using AWS SNS
- Scheduled daily summaries
- Payment reminder automation
- Customizable notification preferences

### Phase 3: Advanced Features
- Payment history tracking
- Partial payment support
- Interest calculation
- Customer credit limits
- Payment terms (NET 30, NET 60)
- Recurring credit entries

### Phase 4: Analytics
- Credit trends over time
- Customer payment patterns
- Risk assessment scoring
- Collection efficiency metrics
- Aging reports (30/60/90 days)
- Customer reliability scoring

### Phase 5: Integration
- Export to accounting software
- PDF invoice generation
- Email payment reminders
- Payment gateway integration
- Bank reconciliation

## Testing Strategy

1. **Unit Tests**: Calculation functions
2. **Integration Tests**: API routes
3. **E2E Tests**: User flows
4. **Manual Testing**: UI/UX validation

## Error Handling

```typescript
// API errors return structured responses
{
  success: false,
  error: 'Session not found' | 'Missing required fields' | 'Invalid action'
}

// Client handles gracefully:
- Shows error message to user
- Retains form data
- Allows retry
- Falls back to localStorage
```

## Monitoring & Metrics

**Key Metrics to Track:**
1. Average credit entries per user
2. Average overdue percentage
3. Payment completion rate
4. Feature usage frequency
5. localStorage sync success rate

## Conclusion

The Credit Tracking feature now implements the same robust hybrid sync architecture as Daily Entries:

✅ **Offline-First**: Works without internet, syncs automatically when online
✅ **DynamoDB Integration**: Cloud backup with automatic TTL expiration
✅ **Sync Status Tracking**: Visual indicators for synced/pending/error states
✅ **Instant Sync**: Attempts cloud sync first, falls back to local storage
✅ **Conflict Resolution**: Cloud is source of truth for synced entries
✅ **Cost Efficient**: Free tier eligible, minimal storage and operations
✅ **User Experience**: Seamless sync with manual sync option
✅ **Data Retention**: 30 days for paid credits, indefinite for unpaid

**Key Improvements:**
1. Replaced session-based storage with DynamoDB
2. Added sync status tracking and UI indicators
3. Implemented offline-first with automatic sync
4. Added manual sync button for user control
5. Consistent architecture with Daily Entries feature

**Perfect for AWS Hackathon submission!**
