# Design Document: User Profile & Data Management System

## Overview

The User Profile & Data Management System extends Vyapar AI's existing phone-based authentication with comprehensive profile management, user preferences, and automated data retention policies. The system follows an offline-first architecture with Supabase PostgreSQL as the cloud backup, ensuring users maintain full control over their data while complying with GDPR requirements.

The design integrates seamlessly with the existing hybrid sync architecture, extending the current users table schema and adding automated database functions for data lifecycle management.

## Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                     Client Layer (Next.js)                   │
├─────────────────────────────────────────────────────────────┤
│  ProfileSetupForm  │  UserSettings  │  AccountDeletion      │
│  DataRetentionSettings  │  SyncStatus                        │
└─────────────────────────────────────────────────────────────┘
                            │
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                      API Layer (Next.js)                     │
├─────────────────────────────────────────────────────────────┤
│  /api/profile/setup     │  /api/profile (GET/PUT)           │
│  /api/profile/delete    │  /api/profile/cancel-deletion     │
└─────────────────────────────────────────────────────────────┘
                            │
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                   Data Layer (Supabase)                      │
├─────────────────────────────────────────────────────────────┤
│  users table (extended)  │  daily_entries (with is_archived)│
│  credit_entries (with is_archived)  │  reports (new)        │
└─────────────────────────────────────────────────────────────┘
                            │
                            ↓
┌─────────────────────────────────────────────────────────────┐
│              Automated Functions (PostgreSQL)                │
├─────────────────────────────────────────────────────────────┤
│  archive_old_entries()  │  cleanup_inactive_users()         │
│  process_account_deletions()                                 │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

1. **Profile Setup Flow**: OTP Verification → Profile Setup Screen → Create User Profile → Dashboard
2. **Preferences Update Flow**: Settings Page → Validate Changes → Update Database → Sync to Cloud
3. **Data Archival Flow**: Scheduled Function → Check Retention Policy → Soft Delete (is_archived=true)
4. **Account Deletion Flow**: User Request → Grace Period (30 days) → Hard Delete All Data

### Integration Points

- **Existing Auth System**: Extends `lib/auth-manager.ts` and `lib/supabase-auth.ts`
- **Existing Sync Engine**: Uses `lib/sync-engine.ts` for offline-first data management
- **Existing Database**: Extends `supabase/schema.sql` with new columns and functions
- **Existing UI**: Integrates with current Next.js App Router structure

## Components and Interfaces

### 1. ProfileSetupForm Component

**Purpose**: Onboarding screen shown after OTP verification for profile completion.

**Props**:
```typescript
interface ProfileSetupFormProps {
  phoneNumber: string; // Pre-filled from auth
  onComplete: (profile: UserProfile) => void;
  onSkip: () => void;
  language: Language;
}
```

**State**:
```typescript
interface ProfileSetupState {
  shopName: string;
  userName: string;
  language: Language;
  businessType?: string;
  city?: string;
  isSubmitting: boolean;
  errors: Record<string, string>;
}
```

**Behavior**:
- Validates required fields (shop name, user name, language)
- Shows business type dropdown with common options (Retail, Wholesale, Services, Manufacturing, Other)
- "Skip for Now" creates profile with only required fields
- "Complete Profile" validates all fields before submission
- Displays validation errors inline with field-specific messages
- Auto-focuses first empty required field

### 2. UserSettings Component

**Purpose**: Settings page for viewing and updating profile and preferences.

**Props**:
```typescript
interface UserSettingsProps {
  userId: string;
  language: Language;
  onLanguageChange: (lang: Language) => void;
}
```

**State**:
```typescript
interface UserSettingsState {
  profile: UserProfile;
  isEditing: boolean;
  isSaving: boolean;
  hasChanges: boolean;
  errors: Record<string, string>;
}
```

**Sections**:
1. **Profile Information**: Editable fields (name, shop name, language, business type, city)
2. **Account Information**: Read-only fields (phone, created date, last active)
3. **Data Preferences**: Retention days slider (30-365), auto-archive toggle, notifications toggle
4. **Account Actions**: Delete account button (opens AccountDeletion component)

### 3. AccountDeletion Component

**Purpose**: Handles account deletion request with grace period confirmation.

**Props**:
```typescript
interface AccountDeletionProps {
  userId: string;
  language: Language;
  onCancel: () => void;
  onConfirm: () => void;
}
```

**State**:
```typescript
interface AccountDeletionState {
  step: 'confirm' | 'grace-period' | 'cancelled';
  deletionScheduledAt?: string;
  isProcessing: boolean;
}
```

**Flow**:
1. **Confirmation Step**: Explains consequences, requires typing "DELETE" to confirm
2. **Grace Period Step**: Shows scheduled deletion date, option to cancel
3. **Cancelled Step**: Confirms cancellation, restores data access

### 4. DataRetentionSettings Component

**Purpose**: Manage data retention preferences with visual feedback.

**Props**:
```typescript
interface DataRetentionSettingsProps {
  currentRetentionDays: number;
  autoArchiveEnabled: boolean;
  onChange: (days: number, autoArchive: boolean) => void;
  language: Language;
}
```

**Features**:
- Slider for retention days (30-365) with visual markers at 30, 90, 180, 365
- Shows estimated data size impact
- Toggle for auto-archive with explanation
- Preview of what will be archived based on current settings

### 5. Profile API Client

**Purpose**: Client-side API wrapper for profile operations.

```typescript
export interface ProfileAPIClient {
  setupProfile(data: ProfileSetupData): Promise<APIResponse<UserProfile>>;
  getProfile(): Promise<APIResponse<UserProfile>>;
  updateProfile(data: Partial<UserProfile>): Promise<APIResponse<UserProfile>>;
  requestDeletion(): Promise<APIResponse<DeletionInfo>>;
  cancelDeletion(): Promise<APIResponse<void>>;
}

interface ProfileSetupData {
  shopName: string;
  userName: string;
  language: Language;
  businessType?: string;
  city?: string;
}

interface DeletionInfo {
  requestedAt: string;
  scheduledAt: string;
  daysRemaining: number;
}

interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}
```

## Data Models

### Extended Users Table Schema

```sql
CREATE TABLE users (
  -- Existing columns
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  phone_number TEXT UNIQUE NOT NULL,
  device_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_login TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- New profile columns
  shop_name TEXT NOT NULL,
  user_name TEXT NOT NULL,
  language TEXT NOT NULL DEFAULT 'en' CHECK (language IN ('en', 'hi', 'mr')),
  business_type TEXT,
  city TEXT,
  
  -- Account status columns
  last_active_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE,
  subscription_tier TEXT DEFAULT 'free' CHECK (subscription_tier IN ('free', 'premium')),
  
  -- Preferences (JSONB for flexibility)
  preferences JSONB DEFAULT '{
    "data_retention_days": 90,
    "auto_archive": true,
    "notifications_enabled": true,
    "currency": "INR"
  }'::jsonb,
  
  -- Deletion tracking
  deletion_requested_at TIMESTAMP WITH TIME ZONE,
  deletion_scheduled_at TIMESTAMP WITH TIME ZONE,
  
  -- Constraints
  CONSTRAINT valid_retention_days CHECK (
    (preferences->>'data_retention_days')::int BETWEEN 30 AND 365
  )
);
```

### TypeScript Interface

```typescript
export interface UserProfile {
  id: string;
  phoneNumber: string;
  deviceId?: string;
  shopName: string;
  userName: string;
  language: Language;
  businessType?: string;
  city?: string;
  createdAt: string;
  lastActiveAt: string;
  isActive: boolean;
  subscriptionTier: 'free' | 'premium';
  preferences: UserPreferences;
  deletionRequestedAt?: string;
  deletionScheduledAt?: string;
}

export interface UserPreferences {
  dataRetentionDays: number; // 30-365
  autoArchive: boolean;
  notificationsEnabled: boolean;
  currency: string; // ISO 4217 code
}
```

### Reports Table (New)

```sql
CREATE TABLE reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  device_id TEXT NOT NULL,
  report_type TEXT NOT NULL CHECK (report_type IN ('daily', 'weekly', 'monthly', 'custom')),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  report_data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_archived BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_reports_user_date ON reports(user_id, created_at DESC) WHERE user_id IS NOT NULL;
CREATE INDEX idx_reports_archived ON reports(is_archived, created_at DESC);
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*


### Property Reflection

After analyzing all acceptance criteria, I've identified the following consolidation opportunities:

**Redundancy Analysis**:
- Properties 2.2, 2.3, 2.4, 2.5 all test default values on profile creation → Can combine into one comprehensive "Profile Creation Defaults" property
- Properties 6.1, 6.2, 6.3 all test deletion request behavior → Can combine into one "Deletion Request Initialization" property
- Properties 6.5, 6.6 both test cancellation behavior → Can combine into one "Deletion Cancellation" property
- Properties 6.8, 6.9 both test permanent deletion → Can combine into one "Permanent Deletion" property
- Properties 4.2, 4.3, 4.5 all test archival based on age → Can combine into one "Age-Based Archival" property
- Properties 5.3, 5.6 both test data archival/restoration for inactive users → Keep separate as they test opposite operations
- Properties 9.2, 9.3, 9.4, 9.5 all test API endpoints → Can combine into one "Profile API Operations" property
- Properties 8.2, 8.3 both test language preference → Can combine into one "Language Preference Persistence" property

**Final Property Set** (after consolidation):
1. Profile creation with skip functionality (1.4)
2. Required field validation (1.5)
3. Auto-populated fields (1.6)
4. Profile creation defaults (2.2, 2.3, 2.4, 2.5 combined)
5. Profile creation atomicity (2.1, 2.6 combined)
6. Settings display accuracy (3.1)
7. Preferences validation (3.5)
8. Profile update persistence (3.6)
9. Language UI reactivity (3.7)
10. Age-based archival (4.2, 4.3, 4.5 combined)
11. Archived data preservation (4.6)
12. Auto-archive preference respected (4.7)
13. Inactive user marking (5.2)
14. Inactive user data archival (5.3)
15. Inactive user reactivation (5.5, 5.6 combined)
16. Deletion request initialization (6.1, 6.2, 6.3 combined)
17. Deletion cancellation (6.5, 6.6 combined)
18. Permanent deletion (6.8, 6.9 combined)
19. Translation completeness (8.1)
20. Language preference persistence (8.2, 8.3 combined)
21. Notification language (8.5)
22. Profile API operations (9.2, 9.3, 9.4, 9.5 combined)
23. API authentication enforcement (9.6)
24. API validation errors (9.7)

### Correctness Properties

Property 1: Profile Creation with Skip
*For any* valid phone number and device ID, when a user skips profile setup, the system should create a User_Profile with only required fields (shop name defaults to "My Shop", user name defaults to phone number) and all auto-set values populated.
**Validates: Requirements 1.4**

Property 2: Required Field Validation
*For any* combination of profile setup form inputs, the system should only allow submission when all required fields (shop name, user name, language) are non-empty.
**Validates: Requirements 1.5**

Property 3: Auto-Populated Fields
*For any* profile creation, the system should automatically populate phone number, created_at timestamp, device_id, and default preferences without requiring user input.
**Validates: Requirements 1.6**

Property 4: Profile Creation Defaults
*For any* new user profile, the system should set default values: data_retention_days=90, auto_archive=true, notifications_enabled=true, currency="INR", is_active=true, subscription_tier="free", and timestamps (created_at, last_active_at) within 1 second of current time.
**Validates: Requirements 2.2, 2.3, 2.4**

Property 5: Profile Creation Atomicity
*For any* profile creation attempt, either all data is successfully saved to the database with a unique user_id, or the entire operation fails and no partial data remains.
**Validates: Requirements 2.1, 2.6**

Property 6: Settings Display Accuracy
*For any* user profile, when the settings page loads, all displayed profile information and preferences should exactly match the values stored in the database.
**Validates: Requirements 3.1**

Property 7: Preferences Validation
*For any* data_retention_days value submitted, the system should accept values between 30 and 365 (inclusive) and reject all other values with a validation error.
**Validates: Requirements 3.5**

Property 8: Profile Update Persistence
*For any* valid profile update, the changes should be persisted to Supabase and a subsequent GET request should return the updated values.
**Validates: Requirements 3.6**

Property 9: Language UI Reactivity
*For any* language preference change, the UI should immediately re-render all text elements in the newly selected language without requiring a page refresh.
**Validates: Requirements 3.7**

Property 10: Age-Based Archival
*For any* data entry (daily entry, paid credit, or report) and user retention settings, if the entry age exceeds the retention threshold (user's data_retention_days for daily entries, 30 days for paid credits, 30 days for reports), the archive function should set is_archived=true.
**Validates: Requirements 4.2, 4.3, 4.5**

Property 11: Archived Data Preservation
*For any* data marked as archived (is_archived=true), the complete record should remain in the database and be retrievable through queries that include archived data.
**Validates: Requirements 4.6**

Property 12: Auto-Archive Preference Respected
*For any* user with auto_archive=false, the archive_old_entries function should skip archiving that user's daily entries regardless of their age.
**Validates: Requirements 4.7**

Property 13: Inactive User Marking
*For any* user whose last_active_at timestamp is more than 180 days in the past, the cleanup_inactive_users function should set is_active=false.
**Validates: Requirements 5.2**

Property 14: Inactive User Data Archival
*For any* user marked as inactive (is_active=false), all their daily entries, credit entries, and reports should have is_archived=true.
**Validates: Requirements 5.3**

Property 15: Inactive User Reactivation
*For any* inactive user (is_active=false) who logs in, the system should set is_active=true, update last_active_at to current time, and restore (set is_archived=false) all data from the most recent 90 days.
**Validates: Requirements 5.5, 5.6**

Property 16: Deletion Request Initialization
*For any* account deletion request, the system should set deletion_requested_at to current timestamp, calculate deletion_scheduled_at as exactly 30 days later, and set is_archived=true for all user data.
**Validates: Requirements 6.1, 6.2, 6.3**

Property 17: Deletion Cancellation
*For any* deletion cancellation during the grace period, the system should clear both deletion_requested_at and deletion_scheduled_at fields and restore (set is_archived=false) all user data.
**Validates: Requirements 6.5, 6.6**

Property 18: Permanent Deletion
*For any* user whose deletion_scheduled_at timestamp has passed, the process_account_deletions function should permanently delete all associated data (profile, daily entries, credit entries, reports, S3 files) and remove the User_Profile record from the database.
**Validates: Requirements 6.8, 6.9**

Property 19: Translation Completeness
*For any* UI text key used in the application, translation strings should exist for all three supported languages (en, hi, mr).
**Validates: Requirements 8.1**

Property 20: Language Preference Persistence
*For any* language selection, the system should store the preference in the User_Profile and all subsequent UI renders should display text in that language.
**Validates: Requirements 8.2, 8.3**

Property 21: Notification Language
*For any* notification sent to a user, the message content should be in the user's preferred language as stored in their profile.
**Validates: Requirements 8.5**

Property 22: Profile API Operations
*For any* authenticated user, the profile API endpoints should correctly perform their operations: GET /api/profile returns current profile, PUT /api/profile updates and returns updated profile, POST /api/profile/delete initiates deletion with grace period, POST /api/profile/cancel-deletion cancels pending deletion.
**Validates: Requirements 9.2, 9.3, 9.4, 9.5**

Property 23: API Authentication Enforcement
*For any* profile API endpoint request without valid authentication, the system should return HTTP 401 Unauthorized status.
**Validates: Requirements 9.6**

Property 24: API Validation Errors
*For any* profile API request with invalid data, the system should return HTTP 400 Bad Request status with a JSON response containing field-specific error messages.
**Validates: Requirements 9.7**

## Error Handling

### Validation Errors

**Client-Side Validation**:
- Required field validation with inline error messages
- Phone number format validation (10 digits, starts with 6/7/8/9)
- Data retention days range validation (30-365)
- Business type selection from predefined list

**Server-Side Validation**:
- Duplicate phone number detection (unique constraint)
- JSONB preferences schema validation
- Date range validation for deletion_scheduled_at
- Foreign key constraint validation

**Error Response Format**:
```typescript
interface ValidationError {
  field: string;
  message: string;
  code: string;
}

interface APIErrorResponse {
  success: false;
  error: string;
  errors?: ValidationError[];
}
```

### Database Errors

**Constraint Violations**:
- Unique phone number: Return user-friendly "Phone number already registered" message
- Check constraints: Return specific field validation error
- Foreign key violations: Return "Invalid reference" error

**Transaction Failures**:
- Profile creation: Rollback all changes, return error to client
- Profile update: Retry once, then return error
- Deletion operations: Log error, mark for manual review

**Connection Errors**:
- Offline mode: Queue operations for sync when online
- Timeout errors: Retry with exponential backoff (3 attempts)
- Network errors: Show user-friendly "Connection lost" message

### Sync Errors

**Conflict Resolution**:
- Last-write-wins strategy for profile updates
- Merge strategy for preferences (client preference wins)
- Timestamp-based resolution for data entries

**Sync Failure Handling**:
- Queue failed operations in localStorage
- Retry on next sync cycle (every 30 seconds)
- Show sync status indicator to user
- Manual sync trigger available in settings

### Grace Period Errors

**Cancellation Failures**:
- If cancellation fails, retry automatically
- Log error for manual intervention
- Notify user of cancellation status

**Deletion Failures**:
- If permanent deletion fails, mark for retry
- Log detailed error for debugging
- Ensure no partial deletions (atomic operation)

## Testing Strategy

### Dual Testing Approach

This feature requires both unit tests and property-based tests for comprehensive coverage:

**Unit Tests**: Focus on specific examples, edge cases, and integration points
- Profile setup form validation with specific invalid inputs
- API endpoint responses for specific scenarios
- Database function behavior with known test data
- UI component rendering with specific props
- Error handling for specific failure modes

**Property-Based Tests**: Verify universal properties across all inputs
- Profile creation with randomly generated valid/invalid data
- Data archival with random dates and retention settings
- API operations with random authenticated/unauthenticated requests
- Language preference with random language selections
- Deletion flow with random grace period scenarios

**Property Test Configuration**:
- Use `fast-check` library for TypeScript/JavaScript property-based testing
- Minimum 100 iterations per property test
- Each test tagged with: **Feature: user-profile-management, Property {number}: {property_text}**
- Generators for: phone numbers, user profiles, dates, preferences, API requests

**Example Property Test Structure**:
```typescript
import fc from 'fast-check';

// Feature: user-profile-management, Property 4: Profile Creation Defaults
test('Profile creation sets correct default values', () => {
  fc.assert(
    fc.property(
      fc.record({
        phoneNumber: phoneNumberArbitrary(),
        shopName: fc.string({ minLength: 1 }),
        userName: fc.string({ minLength: 1 }),
        language: fc.constantFrom('en', 'hi', 'mr'),
      }),
      async (input) => {
        const profile = await createProfile(input);
        
        expect(profile.preferences.dataRetentionDays).toBe(90);
        expect(profile.preferences.autoArchive).toBe(true);
        expect(profile.preferences.notificationsEnabled).toBe(true);
        expect(profile.preferences.currency).toBe('INR');
        expect(profile.isActive).toBe(true);
        expect(profile.subscriptionTier).toBe('free');
        
        const now = Date.now();
        const createdAt = new Date(profile.createdAt).getTime();
        expect(Math.abs(now - createdAt)).toBeLessThan(1000);
      }
    ),
    { numRuns: 100 }
  );
});
```

### Test Coverage Requirements

**Component Tests**:
- ProfileSetupForm: Rendering, validation, submission
- UserSettings: Display, editing, saving
- AccountDeletion: Confirmation flow, grace period display
- DataRetentionSettings: Slider interaction, toggle behavior

**API Tests**:
- POST /api/profile/setup: Success, validation errors, duplicate phone
- GET /api/profile: Authenticated, unauthenticated, missing profile
- PUT /api/profile: Valid updates, validation errors, concurrent updates
- POST /api/profile/delete: Initiation, already pending, invalid user
- POST /api/profile/cancel-deletion: Success, no pending deletion, expired grace period

**Database Function Tests**:
- archive_old_entries(): Various retention settings, edge dates, disabled auto-archive
- cleanup_inactive_users(): Various inactivity periods, notification sending
- process_account_deletions(): Grace period expiry, partial deletion handling

**Integration Tests**:
- End-to-end profile setup flow
- Settings update with sync to cloud
- Deletion request through grace period to permanent deletion
- Inactive user reactivation with data restoration

### Mock and Test Data

**Test User Profiles**:
```typescript
const testProfiles = {
  minimal: { phoneNumber: '+919876543210', shopName: 'Test Shop', userName: 'Test User', language: 'en' },
  complete: { ...minimal, businessType: 'Retail', city: 'Mumbai' },
  withCustomPreferences: { ...minimal, preferences: { dataRetentionDays: 180, autoArchive: false } },
};
```

**Test Scenarios**:
- New user signup with profile completion
- Existing user updating preferences
- User requesting and canceling deletion
- Inactive user becoming active again
- Data archival at various retention thresholds

## Implementation Notes

### Database Migration

The implementation requires a database migration to extend the existing users table:

```sql
-- Migration: Add profile and data management columns to users table

-- Add new columns
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS shop_name TEXT,
  ADD COLUMN IF NOT EXISTS user_name TEXT,
  ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'en',
  ADD COLUMN IF NOT EXISTS business_type TEXT,
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS subscription_tier TEXT DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS deletion_requested_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS deletion_scheduled_at TIMESTAMP WITH TIME ZONE;

-- Update existing preferences JSONB to include new defaults
UPDATE users
SET preferences = preferences || '{
  "data_retention_days": 90,
  "auto_archive": true,
  "notifications_enabled": true,
  "currency": "INR"
}'::jsonb
WHERE preferences IS NULL OR NOT preferences ? 'data_retention_days';

-- Add constraints
ALTER TABLE users
  ADD CONSTRAINT valid_language CHECK (language IN ('en', 'hi', 'mr')),
  ADD CONSTRAINT valid_subscription_tier CHECK (subscription_tier IN ('free', 'premium')),
  ADD CONSTRAINT valid_retention_days CHECK (
    (preferences->>'data_retention_days')::int BETWEEN 30 AND 365
  );

-- Make phone_number NOT NULL (should already be, but ensure it)
ALTER TABLE users
  ALTER COLUMN phone_number SET NOT NULL;

-- Create reports table
CREATE TABLE IF NOT EXISTS reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  device_id TEXT NOT NULL,
  report_type TEXT NOT NULL CHECK (report_type IN ('daily', 'weekly', 'monthly', 'custom')),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  report_data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_archived BOOLEAN DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_reports_user_date ON reports(user_id, created_at DESC) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_reports_archived ON reports(is_archived, created_at DESC);

-- Add is_archived column to existing tables if not present
ALTER TABLE daily_entries
  ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT FALSE;

ALTER TABLE credit_entries
  ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT FALSE;

-- Create indexes for archived data queries
CREATE INDEX IF NOT EXISTS idx_daily_entries_archived ON daily_entries(is_archived, entry_date DESC);
CREATE INDEX IF NOT EXISTS idx_credit_entries_archived ON credit_entries(is_archived, created_at DESC);

-- Create automated functions
CREATE OR REPLACE FUNCTION archive_old_entries()
RETURNS void AS $$
BEGIN
  -- Archive daily entries based on user's retention settings
  UPDATE daily_entries de
  SET is_archived = true
  FROM users u
  WHERE de.user_id = u.id
    AND u.preferences->>'auto_archive' = 'true'
    AND de.entry_date < CURRENT_DATE - (u.preferences->>'data_retention_days')::int
    AND de.is_archived = false;
  
  -- Archive paid credit entries older than 30 days
  UPDATE credit_entries
  SET is_archived = true
  WHERE is_paid = true
    AND paid_at < NOW() - INTERVAL '30 days'
    AND is_archived = false;
  
  -- Archive reports older than 30 days
  UPDATE reports
  SET is_archived = true
  WHERE created_at < NOW() - INTERVAL '30 days'
    AND is_archived = false;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION cleanup_inactive_users()
RETURNS void AS $$
BEGIN
  -- Mark users inactive if not logged in for 180 days
  UPDATE users
  SET is_active = false
  WHERE last_active_at < NOW() - INTERVAL '180 days'
    AND is_active = true;
  
  -- Archive data for inactive users
  UPDATE daily_entries de
  SET is_archived = true
  FROM users u
  WHERE de.user_id = u.id
    AND u.is_active = false
    AND de.is_archived = false;
  
  UPDATE credit_entries ce
  SET is_archived = true
  FROM users u
  WHERE ce.user_id = u.id
    AND u.is_active = false
    AND ce.is_archived = false;
  
  UPDATE reports r
  SET is_archived = true
  FROM users u
  WHERE r.user_id = u.id
    AND u.is_active = false
    AND r.is_archived = false;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION process_account_deletions()
RETURNS void AS $$
DECLARE
  user_record RECORD;
BEGIN
  -- Find users past their deletion grace period
  FOR user_record IN
    SELECT id FROM users
    WHERE deletion_scheduled_at IS NOT NULL
      AND deletion_scheduled_at <= NOW()
  LOOP
    -- Delete all user data (CASCADE will handle related records)
    DELETE FROM users WHERE id = user_record.id;
    
    -- Note: S3 file deletion should be handled by application code
    -- triggered by this deletion
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION archive_old_entries() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION cleanup_inactive_users() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION process_account_deletions() TO authenticated, service_role;
```

### Scheduled Jobs

Use Supabase's pg_cron extension or external cron service:

```sql
-- Schedule archive_old_entries to run daily at midnight UTC
SELECT cron.schedule(
  'archive-old-entries',
  '0 0 * * *',
  'SELECT archive_old_entries()'
);

-- Schedule cleanup_inactive_users to run weekly on Sunday at midnight UTC
SELECT cron.schedule(
  'cleanup-inactive-users',
  '0 0 * * 0',
  'SELECT cleanup_inactive_users()'
);

-- Schedule process_account_deletions to run daily at midnight UTC
SELECT cron.schedule(
  'process-account-deletions',
  '0 0 * * *',
  'SELECT process_account_deletions()'
);
```

### Translation Keys

Add to `lib/translations.ts`:

```typescript
export const profileTranslations = {
  // Profile Setup
  'profile.setup.title': {
    en: 'Complete Your Profile',
    hi: 'अपनी प्रोफ़ाइल पूरी करें',
    mr: 'तुमची प्रोफाइल पूर्ण करा',
  },
  'profile.setup.shopName': {
    en: 'Shop/Business Name',
    hi: 'दुकान/व्यवसाय का नाम',
    mr: 'दुकान/व्यवसायाचे नाव',
  },
  'profile.setup.userName': {
    en: 'Your Name',
    hi: 'आपका नाम',
    mr: 'तुमचे नाव',
  },
  'profile.setup.language': {
    en: 'Preferred Language',
    hi: 'पसंदीदा भाषा',
    mr: 'पसंतीची भाषा',
  },
  'profile.setup.businessType': {
    en: 'Business Type (Optional)',
    hi: 'व्यवसाय का प्रकार (वैकल्पिक)',
    mr: 'व्यवसायाचा प्रकार (ऐच्छिक)',
  },
  'profile.setup.city': {
    en: 'City (Optional)',
    hi: 'शहर (वैकल्पिक)',
    mr: 'शहर (ऐच्छिक)',
  },
  'profile.setup.skip': {
    en: 'Skip for Now',
    hi: 'अभी छोड़ें',
    mr: 'आत्ता वगळा',
  },
  'profile.setup.complete': {
    en: 'Complete Profile',
    hi: 'प्रोफ़ाइल पूरी करें',
    mr: 'प्रोफाइल पूर्ण करा',
  },
  
  // Settings
  'settings.title': {
    en: 'Settings',
    hi: 'सेटिंग्स',
    mr: 'सेटिंग्ज',
  },
  'settings.profile': {
    en: 'Profile Information',
    hi: 'प्रोफ़ाइल जानकारी',
    mr: 'प्रोफाइल माहिती',
  },
  'settings.preferences': {
    en: 'Data Preferences',
    hi: 'डेटा प्राथमिकताएं',
    mr: 'डेटा प्राधान्ये',
  },
  'settings.retentionDays': {
    en: 'Keep data for (days)',
    hi: 'डेटा रखें (दिन)',
    mr: 'डेटा ठेवा (दिवस)',
  },
  'settings.autoArchive': {
    en: 'Auto-archive old data',
    hi: 'पुराना डेटा स्वचालित संग्रहित करें',
    mr: 'जुना डेटा स्वयंचलितपणे संग्रहित करा',
  },
  'settings.notifications': {
    en: 'Enable notifications',
    hi: 'सूचनाएं सक्षम करें',
    mr: 'सूचना सक्षम करा',
  },
  'settings.save': {
    en: 'Save Changes',
    hi: 'परिवर्तन सहेजें',
    mr: 'बदल जतन करा',
  },
  'settings.deleteAccount': {
    en: 'Delete Account',
    hi: 'खाता हटाएं',
    mr: 'खाते हटवा',
  },
  
  // Account Deletion
  'deletion.title': {
    en: 'Delete Account',
    hi: 'खाता हटाएं',
    mr: 'खाते हटवा',
  },
  'deletion.warning': {
    en: 'This will permanently delete all your data after 30 days. You can cancel within this period.',
    hi: 'यह 30 दिनों के बाद आपका सभी डेटा स्थायी रूप से हटा देगा। आप इस अवधि के भीतर रद्द कर सकते हैं।',
    mr: 'हे 30 दिवसांनंतर तुमचा सर्व डेटा कायमचा हटवेल. तुम्ही या कालावधीत रद्द करू शकता.',
  },
  'deletion.confirm': {
    en: 'Type DELETE to confirm',
    hi: 'पुष्टि करने के लिए DELETE टाइप करें',
    mr: 'पुष्टी करण्यासाठी DELETE टाइप करा',
  },
  'deletion.scheduledFor': {
    en: 'Deletion scheduled for',
    hi: 'हटाने की तारीख',
    mr: 'हटवण्याची तारीख',
  },
  'deletion.cancel': {
    en: 'Cancel Deletion',
    hi: 'हटाना रद्द करें',
    mr: 'हटवणे रद्द करा',
  },
  
  // Validation Errors
  'error.required': {
    en: 'This field is required',
    hi: 'यह फ़ील्ड आवश्यक है',
    mr: 'हे फील्ड आवश्यक आहे',
  },
  'error.invalidRetentionDays': {
    en: 'Retention days must be between 30 and 365',
    hi: 'रिटेंशन दिन 30 और 365 के बीच होने चाहिए',
    mr: 'रिटेन्शन दिवस 30 आणि 365 दरम्यान असणे आवश्यक आहे',
  },
  'error.phoneAlreadyRegistered': {
    en: 'This phone number is already registered',
    hi: 'यह फ़ोन नंबर पहले से पंजीकृत है',
    mr: 'हा फोन नंबर आधीच नोंदणीकृत आहे',
  },
};
```

### S3 File Deletion

For permanent account deletion, implement S3 file cleanup:

```typescript
// lib/s3-cleanup.ts
import { S3Client, ListObjectsV2Command, DeleteObjectsCommand } from '@aws-sdk/client-s3';

export async function deleteUserS3Files(userId: string): Promise<void> {
  const s3Client = new S3Client({ region: process.env.AWS_REGION });
  
  const buckets = ['vyapar-receipts', 'vyapar-voice-uploads'];
  
  for (const bucket of buckets) {
    try {
      // List all objects for this user
      const listCommand = new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: `${userId}/`,
      });
      
      const listResponse = await s3Client.send(listCommand);
      
      if (!listResponse.Contents || listResponse.Contents.length === 0) {
        continue;
      }
      
      // Delete all objects
      const deleteCommand = new DeleteObjectsCommand({
        Bucket: bucket,
        Delete: {
          Objects: listResponse.Contents.map(obj => ({ Key: obj.Key })),
        },
      });
      
      await s3Client.send(deleteCommand);
      
      console.log(`[S3 Cleanup] Deleted ${listResponse.Contents.length} files from ${bucket} for user ${userId}`);
    } catch (error) {
      console.error(`[S3 Cleanup] Error deleting files from ${bucket}:`, error);
      throw error;
    }
  }
}
```

### Sync Engine Integration

Update `lib/sync-engine.ts` to handle profile sync:

```typescript
// Add to sync-engine.ts

export async function syncUserProfile(profile: UserProfile): Promise<boolean> {
  if (!isSupabaseConfigured() || !isOnline()) {
    return false;
  }
  
  try {
    const { error } = await supabase
      .from('users')
      .update({
        shop_name: profile.shopName,
        user_name: profile.userName,
        language: profile.language,
        business_type: profile.businessType,
        city: profile.city,
        last_active_at: profile.lastActiveAt,
        preferences: profile.preferences,
      })
      .eq('id', profile.id);
    
    if (error) {
      console.error('[Sync] Failed to sync user profile:', error);
      return false;
    }
    
    console.log('[Sync] Successfully synced user profile');
    return true;
  } catch (error) {
    console.error('[Sync] Error syncing user profile:', error);
    return false;
  }
}
```
