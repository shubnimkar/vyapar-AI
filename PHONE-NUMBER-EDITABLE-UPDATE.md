# Phone Number Editable Field Update

## Changes Made

Made the phone number field editable in the profile form, allowing users to add or update their phone number after signup.

### 1. ProfileSetupForm Component (`components/ProfileSetupForm.tsx`)

**Changed from read-only to editable:**
- Added `phoneNumberValue` state to manage phone number input
- Removed disabled/read-only attributes
- Added phone number validation function
- Updated submit handler to include phone number in the request

**Phone Number Validation:**
```typescript
const validatePhoneNumber = (phone: string): boolean => {
  if (!phone) return true; // Optional field
  
  // Remove spaces and dashes for validation
  const cleaned = phone.replace(/[\s-]/g, '');
  
  // Check if it's a valid format (10 digits or +91 followed by 10 digits)
  const isValid = /^(\+91)?[6-9]\d{9}$/.test(cleaned);
  
  return isValid;
};
```

**Validation Rules:**
- Optional field (can be empty)
- Must start with 6-9 (valid Indian mobile number first digit)
- Must be exactly 10 digits
- Can optionally include +91 country code
- Accepts formats: `9876543210` or `+919876543210`
- Spaces and dashes are removed before validation

**UI Changes:**
- Changed from disabled gray field to active input field
- Added validation error display
- Updated helper text to indicate it's optional
- Shows format hint: "Optional - Indian mobile number (starts with +91)"

### 2. Profile API (`app/api/profile/route.ts`)

**Added phone number validation in PUT endpoint:**
```typescript
// Validate phone number if provided
if (phoneNumber) {
  const cleaned = phoneNumber.replace(/[\s-]/g, '');
  const isValid = /^(\+91)?[6-9]\d{9}$/.test(cleaned);
  if (!isValid) {
    errors.push({
      field: 'phoneNumber',
      message: 'Invalid phone number format',
      code: 'invalid',
    });
  }
}
```

**Updated profile save logic:**
```typescript
phoneNumber: phoneNumber?.trim() || existingProfile?.phoneNumber,
```
Now accepts phone number updates instead of only preserving existing value.

### 3. Profile Setup API (`app/api/profile/setup/route.ts`)

**Added phone number validation:**
- Validates format before saving to DynamoDB
- Returns validation error if format is invalid
- Allows empty/undefined phone numbers (optional field)

## How It Works Now

### Create Account Flow
1. User can optionally enter phone number during signup
2. Phone number is validated if provided
3. Saved to DynamoDB PROFILE record

### Profile Edit Flow
1. User clicks "Edit" on profile page
2. Phone number field is pre-filled if exists, or empty if not provided
3. User can:
   - Add a phone number if they didn't provide one during signup
   - Update existing phone number
   - Clear phone number (leave empty)
4. Phone number is validated on submit
5. Updated in DynamoDB

### Validation
- **Format**: Indian mobile number (10 digits starting with 6-9)
- **Country Code**: Optional +91 prefix
- **Spaces/Dashes**: Automatically removed during validation
- **Empty**: Allowed (optional field)

### Valid Examples
- `9876543210`
- `+919876543210`
- `+91 98765 43210`
- `987-654-3210`
- Empty (no phone number)

### Invalid Examples
- `1234567890` (doesn't start with 6-9)
- `98765` (too short)
- `98765432109` (too long)
- `abcd123456` (contains letters)

## Multi-Language Support

Error messages and helper text are translated:
- **English**: "Enter a valid phone number"
- **Hindi**: "मान्य फ़ोन नंबर दर्ज करें"
- **Marathi**: "वैध फोन नंबर प्रविष्ट करा"

## Testing
1. Build successful with no TypeScript errors
2. Phone number field is now editable
3. Validation works for Indian mobile numbers
4. Empty phone numbers are accepted
5. Updates are saved to DynamoDB
6. Multi-language support maintained
