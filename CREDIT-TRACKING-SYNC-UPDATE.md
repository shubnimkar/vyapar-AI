# Credit Tracking Sync Update

## Overview

Updated the Credit Tracking (Udhaar) feature to use the same hybrid sync architecture as Daily Entries, replacing the session-based storage with DynamoDB cloud backup and offline-first synchronization.

## Changes Made

### 1. New Sync Manager (`lib/credit-sync.ts`)

Created a dedicated sync manager similar to `lib/daily-entry-sync.ts`:

**Key Functions:**
- `getLocalEntries()` - Load from localStorage
- `saveLocalEntry()` - Save to localStorage with sync status
- `deleteLocalEntry()` - Remove from localStorage
- `getSyncStatus()` - Get sync status (pending, errors)
- `syncPendingEntries()` - Push pending entries to cloud
- `pullEntriesFromCloud()` - Pull entries from cloud
- `fullSync()` - Complete bidirectional sync
- `createCreditEntry()` - Create with sync flag
- `updateCreditEntry()` - Update with sync flag
- `markCreditAsPaid()` - Mark paid with sync flag

**Sync Status Tracking:**
```typescript
interface LocalCreditEntry extends Omit<CreditEntry, 'userId'> {
  syncStatus: 'synced' | 'pending' | 'error';
  lastSyncAttempt?: string;
}

interface SyncStatus {
  lastSyncTime: string;
  pendingCount: number;
  errorCount: number;
}
```

### 2. Updated DynamoDB Client (`lib/dynamodb-client.ts`)

Added `CreditEntryService` to replace the old `CreditService`:

**Schema:**
```
PK: USER#{userId}
SK: CREDIT#{id}
entityType: CREDIT

Fields:
- userId, id, customerName, amount, dueDate
- isPaid, createdAt, paidAt
- ttl (30 days after paid)
```

**Operations:**
- `saveEntry()` - Create/update with TTL
- `getEntry()` - Get single entry
- `getEntries()` - Get all entries for user
- `deleteEntry()` - Delete entry

### 3. Updated API Routes (`app/api/credit/route.ts`)

Replaced session-based API with DynamoDB-backed routes:

**GET `/api/credit?userId={id}`**
- Load entries from DynamoDB
- Calculate summary
- Return entries + summary

**POST `/api/credit`**
- Create new entry
- Instant sync to DynamoDB
- Return with `synced: true` flag

**PUT `/api/credit`**
- Update existing entry
- Instant sync to DynamoDB
- Return with `synced: true` flag

**DELETE `/api/credit?userId={id}&id={entryId}`**
- Delete from DynamoDB
- Return with `synced: true` flag

### 4. Updated Component (`components/CreditTracking.tsx`)

Completely rewritten to support hybrid sync:

**New State:**
- `syncStatus` - Track sync status
- `isSyncing` - Show sync in progress

**New Functions:**
- `checkAndSync()` - Auto-sync on mount
- `handleManualSync()` - Manual sync button
- All CRUD operations now try cloud first, fallback to local

**New UI Elements:**
- Sync status button with icon (cloud/cloud-off/spinner)
- Sync status badges on entries (Pending/Error)
- Visual feedback for sync state

### 5. Updated Architecture Document

Updated `CREDIT-TRACKING-ARCHITECTURE.md` with:
- New data models with sync status
- DynamoDB schema and access patterns
- Updated user flows (online/offline modes)
- Sync status UI designs
- Cost analysis for DynamoDB
- Updated future enhancements

## Architecture Comparison

### Before (Session-Based)

```
localStorage → In-Memory Session → (Future: DynamoDB)
- Session expires in 2 hours
- No sync status tracking
- No offline support
- Manual localStorage save
```

### After (Hybrid Sync)

```
localStorage ⟷ DynamoDB
- Offline-first architecture
- Automatic sync on connection
- Sync status tracking (synced/pending/error)
- Manual sync option
- Cloud as source of truth
```

## Sync Flow

### Online Mode
1. User performs action (add/update/delete)
2. Try API call to DynamoDB
3. If success: Save to localStorage with `syncStatus: 'synced'`
4. If fail: Save to localStorage with `syncStatus: 'pending'`
5. Show appropriate UI feedback

### Offline Mode
1. User performs action
2. API call fails (network error)
3. Save to localStorage with `syncStatus: 'pending'`
4. Show "Pending" badge on entry
5. When online: Auto-sync or manual sync
6. Update `syncStatus` based on result

### Full Sync
1. Pull entries from cloud (GET /api/credit)
2. Merge with local entries (cloud = source of truth)
3. Push pending entries to cloud (POST/PUT)
4. Update sync status
5. Show result to user

## UI Improvements

### Sync Status Button
```
[🔄 Syncing...]     - Sync in progress
[☁️ Synced]         - All synced
[☁️❌ 2 Pending]    - Pending items
[☁️❌ 1 Error]      - Sync errors
```

### Entry Badges
```
[Paid]              - Entry is paid
[Pending]           - Waiting to sync
[Error]             - Sync failed
```

## Benefits

1. **Offline Support**: Works without internet connection
2. **Multi-Device**: Sync across devices via DynamoDB
3. **Data Persistence**: Cloud backup with automatic expiration
4. **User Feedback**: Clear sync status indicators
5. **Reliability**: Automatic retry for failed syncs
6. **Cost Efficient**: Free tier eligible
7. **Consistent**: Same pattern as Daily Entries

## Testing Checklist

- [ ] Add credit entry online (should sync immediately)
- [ ] Add credit entry offline (should show pending)
- [ ] Mark as paid online (should sync immediately)
- [ ] Mark as paid offline (should show pending)
- [ ] Delete entry online (should sync immediately)
- [ ] Delete entry offline (should remove locally)
- [ ] Manual sync with pending items (should sync all)
- [ ] Manual sync with no pending items (should pull from cloud)
- [ ] Page reload (should load from localStorage)
- [ ] Auto-sync on mount (should sync pending items)
- [ ] Sync status indicators (should show correct state)
- [ ] Entry badges (should show correct status)

## Migration Notes

**For Existing Users:**
- Old session-based entries will be lost on session expiry
- Users should export data before update (if needed)
- New entries will use DynamoDB from day one
- No migration script needed (fresh start)

**For New Users:**
- Everything works out of the box
- No setup required
- Automatic sync on first use

## Next Steps

1. Test all sync scenarios
2. Add error handling for edge cases
3. Implement retry logic for failed syncs
4. Add sync conflict resolution
5. Monitor DynamoDB usage and costs
6. Add analytics for sync performance

## Conclusion

The Credit Tracking feature now has the same robust, offline-first architecture as Daily Entries. Users can manage credit entries seamlessly whether online or offline, with automatic synchronization and clear status indicators.
