# DynamoDB UserId Partition Migration Plan

## Goal

Move all user-owned business data toward a single primary grouping:

- `PK = USER#<userId>`

This makes the common access pattern straightforward:

- "fetch everything for this userId"

## Current State

Today the schema is split across multiple key patterns:

- Auth user record:
  - `PK = USER#<username-lower>`
  - `SK = METADATA`
  - `GSI1PK = USER#<userId>`
  - `GSI1SK = METADATA`
- Profile:
  - `PK = PROFILE#<userId>`
  - `SK = METADATA`
- Daily entries:
  - `PK = USER#<userId>`
  - `SK = ENTRY#<date>`
- Credit entries:
  - `PK = USER#<userId>`
  - `SK = CREDIT#<id>`
- Reports:
  - `PK = USER#<userId>`
  - `SK = REPORT#<type>#<date>`
- Report preferences:
  - `PK = USER#<userId>`
  - `SK = PREFERENCES`
- Email lookup:
  - `PK = EMAIL#<email>`
  - `SK = METADATA`
- Reset tokens:
  - `PK = RESET#<tokenHash>`
  - `SK = METADATA`

## Recommended Target State

Keep alternate lookup tables where they are useful, but move all primary user-owned records under `USER#<userId>`.

Recommended target:

- Auth user canonical record:
  - `PK = USER#<userId>`
  - `SK = AUTH#METADATA`
- Profile:
  - `PK = USER#<userId>`
  - `SK = PROFILE#METADATA`
- Daily entries:
  - `PK = USER#<userId>`
  - `SK = ENTRY#<date>`
- Credit entries:
  - `PK = USER#<userId>`
  - `SK = CREDIT#<id>`
- Reports:
  - `PK = USER#<userId>`
  - `SK = REPORT#<type>#<date>`
- Report preferences:
  - `PK = USER#<userId>`
  - `SK = PREFERENCES`

Keep these as secondary lookup records:

- Username lookup:
  - `PK = USERNAME#<username-lower>`
  - `SK = METADATA`
  - contains `userId`
- Email lookup:
  - `PK = EMAIL#<email>`
  - `SK = METADATA`
  - contains `userId`
- Reset tokens:
  - unchanged

## Will This Affect Current Data?

Not if we do it with a compatibility-first migration.

Safe answer:

- Existing data does **not** need to be deleted.
- Existing data does **not** need to become unavailable.
- Existing users can continue working during migration.

What *will* happen:

- For a period of time, some records will exist in both old and new shapes.
- Application code must read old + new shapes during transition.
- Backfill scripts will copy existing records into the new shape.

What would be risky:

- Renaming keys in place without compatibility reads
- Switching reads to the new shape before backfill finishes
- Deleting old records before verification

## Migration Strategy

Use a 5-phase migration.

### Phase 1: Add Dual-Read Support

Update app code so reads support both:

- new shape first
- old shape fallback

Required changes:

- `ProfileService.getProfile(userId)`
  - first try `USER#<userId> / PROFILE#METADATA`
  - fallback to `PROFILE#<userId> / METADATA`
- `UserService.getUserById(userId)`
  - first try `USER#<userId> / AUTH#METADATA`
  - fallback to existing GSI/username-based lookup
- aggregate helpers should prefer new shape but tolerate old

This phase is safe and should happen before any data copy.

### Phase 2: Add Dual-Write Support

Update write paths so new updates are written to the new shape as well.

Required writes:

- profile writes:
  - write new record to `USER#<userId> / PROFILE#METADATA`
  - optionally keep writing old `PROFILE#<userId> / METADATA` temporarily
- auth user creation:
  - write canonical auth record to `USER#<userId> / AUTH#METADATA`
  - write username lookup separately under `USERNAME#<username-lower>`
- user updates:
  - update canonical auth record
  - maintain lookup records

Daily entries, credits, reports, and preferences already mostly align with the target grouping, so they need little or no migration.

### Phase 3: Backfill Existing Data

Run a one-time migration script that copies old records into the new shape.

Backfill scope:

- profile:
  - copy `PROFILE#<userId> / METADATA`
  - to `USER#<userId> / PROFILE#METADATA`
- auth user:
  - find all current auth records keyed by username
  - create canonical record at `USER#<userId> / AUTH#METADATA`
  - create username lookup record at `USERNAME#<username-lower> / METADATA`

Rules:

- backfill must be idempotent
- never delete source data during backfill
- write a migration marker field like:
  - `schemaVersion: 2`
  - `migratedAt`

### Phase 4: Verify

Verification checklist:

- sample users can load profile from new shape
- login works through username lookup + canonical auth record
- `/api/user/all` returns complete data
- no missing profiles after cutover
- counts match between old and new profile/auth records

Recommended checks:

- total old profiles count vs total new profiles count
- total old auth records count vs total canonical auth count
- spot-check random users
- verify newest updated records are present in new shape

### Phase 5: Cut Over and Retire Old Paths

After successful verification:

- stop writing old profile/auth shapes
- keep fallback reads for one release window
- later remove old reads
- only then consider deleting old records

Deletion should be the final step, not part of initial migration.

## Rollback Plan

Rollback is simple if we keep old records untouched:

- switch reads back to old shape
- disable dual-write to new shape
- leave copied records in place

Because the old records remain intact, rollback risk stays low.

## Recommended Service Refactor

### Profile

Current:

- old only

Target:

- `getProfile`: new-first, old-fallback
- `saveProfile`: dual-write during migration

### Auth User

Current:

- primary auth record keyed by username
- `userId` lookup via GSI

Target:

- canonical auth record keyed by `userId`
- username lookup as separate lookup item
- optional GSI no longer required for primary auth fetch

### Aggregate User Fetch

The route:

- `/api/user/all?userId=...`

should become the main debugging/admin fetch path for complete user data.

## Suggested New Record Examples

Canonical auth record:

```json
{
  "PK": "USER#u_123",
  "SK": "AUTH#METADATA",
  "entityType": "AUTH_USER",
  "userId": "u_123",
  "username": "shubham",
  "email": "a@example.com",
  "passwordHash": "...",
  "createdAt": "...",
  "updatedAt": "...",
  "schemaVersion": 2
}
```

Username lookup:

```json
{
  "PK": "USERNAME#shubham",
  "SK": "METADATA",
  "entityType": "USERNAME_LOOKUP",
  "userId": "u_123",
  "username": "shubham",
  "createdAt": "...",
  "updatedAt": "..."
}
```

Profile record:

```json
{
  "PK": "USER#u_123",
  "SK": "PROFILE#METADATA",
  "entityType": "PROFILE",
  "userId": "u_123",
  "shopName": "My Shop",
  "userName": "Owner Name",
  "language": "en",
  "createdAt": "...",
  "updatedAt": "...",
  "schemaVersion": 2
}
```

## Concrete Next Implementation Steps

1. Add dual-read in `ProfileService`.
2. Add canonical auth record support in `UserService`.
3. Add username lookup record support.
4. Update signup to write canonical auth + username lookup.
5. Update login to resolve username lookup, then fetch canonical auth.
6. Add migration script for old profile/auth records.
7. Add verification script/report.
8. After successful backfill, stop writing old profile/auth shapes.

## Recommendation

Proceed with migration only for:

- auth user record
- profile record

Do not migrate:

- daily entries
- credits
- reports
- preferences

Those are already close to the desired `USER#<userId>` grouping and should stay as they are.
