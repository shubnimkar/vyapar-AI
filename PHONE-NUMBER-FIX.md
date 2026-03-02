# Phone Number Field Fix

## Issues Found
1. Phone number was being saved during signup but not retrieved from database
2. Phone number field was missing from the profile edit form
3. Profile API was returning empty string for phone number instead of actual value
4. Phone number was not being preserved during profile updates

## What We Save in DynamoDB

### During Signup (`/api/auth/signup`)
We create TWO records in DynamoDB:

1. **USER Record** (for authentication):
   - `userId` (UUID)
   - `username` (unique, case-insensitive)
   - `passwordHash` (bcrypt)
   - `createdAt`, `updatedAt`
   - `loginCount`, `lastLoginAt`

2. **PROFILE Record** (for user information):
   - `userId` (links to USER)
   - `shopName`
   - `userName` (owner name)
   - `businessType`
   - `city`
   - `phoneNumber` ✅ (optional, saved here)
   - `language`
   - `createdAt`, `updatedAt`

## Changes Made

### 1. Fixed Profile GET API (`app/api/profile/route.ts`)
**Before:**
```typescript
phoneNumber: '', // Always empty
```

**After:**
```typescript
phoneNumber: profile.phoneNumber || '', // Retrieve from DB
```

### 2. Fixed DynamoDB ProfileService (`lib/dynamodb-client.ts`)
**Before:**
```typescript
return {
  userId: item.userId,
  shopName: item.shopName,
  userName: item.userName,
  businessType: item.businessType,
  city: item.city,
  language: item.language, // phoneNumber missing
  createdAt: item.createdAt,
  updatedAt: item.updatedAt,
};
```

**After:**
```typescript
return {
  userId: item.userId,
  shopName: item.shopName,
  userName: item.userName,
  businessType: item.businessType,
  city: item.city,
  phoneNumber: item.phoneNumber, // ✅ Added
  language: item.language,
  createdAt: item.createdAt,
  updatedAt: item.updatedAt,
};
```

### 3. Fixed Profile PUT API (`app/api/profile/route.ts`)
**Before:**
```typescript
const dynamoProfile: DynamoProfile = {
  userId,
  shopName: shopName?.trim() || existingProfile?.shopName || '',
  userName: userName?.trim() || existingProfile?.userName || '',
  language: language || existingProfile?.language || 'en',
  businessType: businessType?.trim() || existingProfile?.businessType,
  city: city?.trim() || existingProfile?.city,
  // phoneNumber not preserved
  createdAt: existingProfile?.createdAt || new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};
```

**After:**
```typescript
const dynamoProfile: DynamoProfile = {
  userId,
  shopName: shopName?.trim() || existingProfile?.shopName || '',
  userName: userName?.trim() || existingProfile?.userName || '',
  language: language || existingProfile?.language || 'en',
  businessType: businessType?.trim() || existingProfile?.businessType,
  city: city?.trim() || existingProfile?.city,
  phoneNumber: existingProfile?.phoneNumber, // ✅ Preserve phone number
  createdAt: existingProfile?.createdAt || new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};
```

### 4. Added Phone Number Field to ProfileSetupForm (`components/ProfileSetupForm.tsx`)
Added read-only phone number field between "User Name" and "Language" fields:

```typescript
{/* Phone Number (Read-only) */}
<div>
  <label className="block text-sm font-medium text-gray-700 mb-1">
    {t('phoneNumber', language)}
  </label>
  <input
    type="text"
    value={phoneNumber}
    readOnly
    disabled
    className="w-full px-4 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-600 cursor-not-allowed"
  />
  <p className="mt-1 text-xs text-gray-500">
    {language === 'hi' 
      ? 'फ़ोन नंबर साइनअप के दौरान सेट किया गया था'
      : language === 'mr'
      ? 'फोन नंबर साइनअप दरम्यान सेट केला गेला'
      : 'Phone number was set during signup'}
  </p>
</div>
```

### 5. Updated Profile Setup Page (`app/profile-setup/page.tsx`)
Ensured phone number is passed from existing profile or user session:

```typescript
phoneNumber={existingProfile?.phoneNumber || user.phoneNumber || user.username || ''}
```

### 6. Updated Profile Setup API (`app/api/profile/setup/route.ts`)
Ensured phone number is saved when creating/updating profile:

```typescript
const dynamoProfile: DynamoProfile = {
  userId,
  shopName: shopName.trim(),
  userName: userName.trim(),
  language,
  businessType: businessType?.trim(),
  city: city?.trim(),
  phoneNumber: phoneNumber?.trim(), // ✅ Save phone number
  createdAt: now,
  updatedAt: now,
};
```

## How It Works Now

### Create Account Flow
1. User enters phone number during signup
2. Phone number is saved in PROFILE record in DynamoDB
3. Phone number is stored in session

### Profile View Flow
1. Profile page fetches profile from `/api/profile?userId=xxx`
2. API retrieves PROFILE record from DynamoDB
3. Phone number is included in response
4. Profile page displays phone number correctly

### Profile Edit Flow
1. User clicks "Edit" on profile page
2. Navigates to `/profile-setup`
3. Existing profile is loaded (including phone number)
4. Phone number field is displayed as read-only
5. User can edit other fields
6. On save, phone number is preserved in database

## Why Phone Number is Read-Only
- Phone number is set during account creation
- It's used as a unique identifier
- Changing it would require additional verification (OTP)
- For security, we keep it immutable after signup

## Testing
1. Build successful with no TypeScript errors
2. Phone number is now retrieved from database
3. Phone number appears in profile view
4. Phone number appears in profile edit form (read-only)
5. Phone number is preserved during profile updates
