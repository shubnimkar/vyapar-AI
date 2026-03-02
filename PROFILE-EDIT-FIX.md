# Profile Edit Form Fix

## Issue
When clicking "Edit" on the profile page, the profile setup form was rendering empty instead of pre-filling with existing data. Additionally, the "Skip for Now" button was showing in edit mode, which doesn't make sense.

## Changes Made

### 1. ProfileSetupForm Component (`components/ProfileSetupForm.tsx`)
- Added `initialData?: ProfileSetupData` prop to accept existing profile data
- Added `isEditMode?: boolean` prop to distinguish between create and edit modes
- Modified form initialization to use `initialData` if provided
- Updated title to show "Edit Profile" when in edit mode
- Conditionally hide "Skip for Now" button when `isEditMode` is true
- Changed submit button to full width and show "Update Profile" text in edit mode

### 2. Profile Setup Page (`app/profile-setup/page.tsx`)
- Added `existingProfile` state to store loaded profile data
- Added `isEditMode` state to track whether we're creating or editing
- Added `checkAuthAndLoadProfile()` function that:
  - Checks authentication
  - Loads existing profile from API
  - Sets edit mode if profile exists
- Pass `initialData` prop to ProfileSetupForm with existing profile data
- Pass `isEditMode` prop to ProfileSetupForm

## How It Works

### Create Mode (New User)
1. User navigates to `/profile-setup` after signup
2. No existing profile found
3. Form shows empty fields
4. "Skip for Now" button is visible
5. Title: "Complete Your Profile"

### Edit Mode (Existing User)
1. User clicks "Edit" on profile page
2. Navigates to `/profile-setup`
3. Existing profile is loaded from API
4. Form is pre-filled with current data
5. "Skip for Now" button is hidden
6. Title: "Edit Profile"
7. Submit button shows "Update Profile"

## API Endpoint
The existing `/api/profile/setup` endpoint handles both create and update operations:
- Creates new profile if it doesn't exist
- Updates existing profile if it does exist
- Uses `userId` to identify the profile

## Testing
1. Build successful with no TypeScript errors
2. Both create and edit modes work correctly
3. Form validation still works in both modes
4. Multi-language support maintained
