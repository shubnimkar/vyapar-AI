# Voice Entry S3 Prefix Fix - Bugfix Design

## Overview

The voice entry feature currently fails due to an S3 path prefix mismatch. Voice files are uploaded to the S3 bucket root (e.g., `voice-1772984927305.webm`), but the `voice-processor` Lambda function is configured to trigger only on files with the `uploads/` prefix. This prevents Lambda invocation, causing the API to poll indefinitely until timeout (60+ seconds).

The fix is minimal and surgical: prepend `uploads/` to the S3 key when uploading voice files in `/api/voice-entry/route.ts`. This aligns the upload path with the Lambda's S3 event notification configuration, enabling automatic processing.

## Glossary

- **Bug_Condition (C)**: The condition that triggers the bug - when voice files are uploaded without the `uploads/` prefix
- **Property (P)**: The desired behavior - Lambda should be triggered automatically when voice files are uploaded
- **Preservation**: Existing receipt OCR behavior, S3 lifecycle policies, and API response format that must remain unchanged
- **S3 Key**: The full path of an object in S3 (e.g., `uploads/voice-123.webm`)
- **S3 Event Notification**: AWS S3 feature that triggers Lambda functions when objects are created with specific prefixes
- **pollForResult**: Function in `/api/voice-entry/route.ts` that checks S3 for Lambda processing results

## Bug Details

### Fault Condition

The bug manifests when a user uploads a voice recording through the `/api/voice-entry` endpoint. The `POST` handler uploads the file to S3 without the `uploads/` prefix, causing the Lambda function to never be triggered because the S3 event notification filter doesn't match.

**Formal Specification:**
```
FUNCTION isBugCondition(input)
  INPUT: input of type { filename: string, s3Key: string }
  OUTPUT: boolean
  
  RETURN input.s3Key.startsWith('uploads/') == false
         AND input.filename.startsWith('voice-')
         AND lambdaNotTriggered(input.s3Key)
END FUNCTION
```

### Examples

- **Example 1**: User uploads `audio.webm` → S3 key is `voice-1772984927305-audio.webm` → Lambda not triggered → API times out after 60 seconds
- **Example 2**: User uploads `recording.m4a` → S3 key is `voice-1772985000000-recording.m4a` → Lambda not triggered → User sees error, must retry
- **Example 3**: User uploads `voice-memo.wav` → S3 key is `voice-1772985100000-voice-memo.wav` → Lambda not triggered → Voice entry lost
- **Edge Case**: If Lambda were manually triggered with correct prefix `uploads/voice-123.webm`, processing would complete successfully in < 30 seconds

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- Receipt OCR uploads must continue to work with their current S3 key format (no prefix, just `receipt-{timestamp}-{filename}`)
- S3 lifecycle policies (1-day retention for voice files, 7-day for receipts) must remain unchanged
- Lambda processing logic (transcription + AI extraction) must remain unchanged
- API response format must remain unchanged (same JSON structure with `success`, `data` fields)
- File validation (type, size limits) must remain unchanged
- Polling mechanism and timeout logic must remain unchanged

**Scope:**
All inputs that do NOT involve voice file uploads should be completely unaffected by this fix. This includes:
- Receipt OCR file uploads (`/api/receipt-ocr`)
- CSV file uploads
- All other S3 operations in the application
- Lambda function code itself (no changes needed)

## Hypothesized Root Cause

Based on the bug description and code analysis, the root cause is clear:

1. **Missing S3 Prefix in Upload**: The `/api/voice-entry/route.ts` file uploads voice files with `Key: filename` instead of `Key: uploads/${filename}`
   - Line 60: `Key: filename,` should be `Key: \`uploads/${filename}\`,`
   - This is the ONLY change required

2. **Lambda S3 Event Configuration**: The `voice-processor` Lambda is correctly configured to trigger on `uploads/` prefix
   - This configuration is in AWS infrastructure (not in code)
   - No Lambda code changes needed

3. **Polling Path Mismatch**: The `pollForResult` function correctly looks for results in `results/` prefix
   - This is correct and doesn't need changes
   - Lambda saves results to `results/{filename}.json`

4. **Receipt OCR Works Correctly**: The receipt OCR feature doesn't use a prefix, which is correct for its Lambda configuration
   - Receipt Lambda triggers on root-level files
   - Voice Lambda triggers on `uploads/` prefix files
   - This is intentional separation of concerns

## Correctness Properties

Property 1: Fault Condition - Lambda Triggered on Voice Upload

_For any_ voice file upload where the filename starts with "voice-" and is uploaded to S3, the fixed upload function SHALL prepend the `uploads/` prefix to the S3 key, causing the voice-processor Lambda to be automatically triggered by the S3 event notification, and processing SHALL complete within 30 seconds for typical recordings.

**Validates: Requirements 2.1, 2.2, 2.3, 2.4**

Property 2: Preservation - Non-Voice Upload Behavior

_For any_ file upload that is NOT a voice file (receipt OCR, CSV, etc.), the fixed code SHALL produce exactly the same S3 key format as the original code, preserving all existing upload behavior, Lambda triggers, and lifecycle policies for non-voice files.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6**

## Fix Implementation

### Changes Required

The fix requires a single-line change in one file.

**File**: `app/api/voice-entry/route.ts`

**Function**: `POST` handler

**Specific Changes**:
1. **Line 60 - Add `uploads/` prefix to S3 key**:
   - Current: `Key: filename,`
   - Fixed: `Key: \`uploads/${filename}\`,`

**No other changes required**:
- Lambda function code remains unchanged
- Polling logic remains unchanged (already looks in `results/` prefix)
- File validation remains unchanged
- Error handling remains unchanged
- Receipt OCR remains unchanged

### Why This Fix Works

1. **Aligns with Lambda Configuration**: The voice-processor Lambda's S3 event notification is configured to trigger on `uploads/` prefix
2. **Minimal Change**: Only one line modified, reducing regression risk
3. **Preserves Existing Behavior**: Receipt OCR and other features unaffected
4. **No Infrastructure Changes**: No AWS configuration changes needed

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that demonstrate the bug on unfixed code (Lambda not triggered), then verify the fix works correctly (Lambda triggered) and preserves existing behavior (receipt OCR unchanged).

### Exploratory Fault Condition Checking

**Goal**: Surface counterexamples that demonstrate the bug BEFORE implementing the fix. Confirm that Lambda is not triggered when voice files are uploaded without the `uploads/` prefix.

**Test Plan**: Write tests that upload voice files to S3 and verify whether the Lambda is triggered. Run these tests on the UNFIXED code to observe failures and confirm the root cause.

**Test Cases**:
1. **Voice Upload Without Prefix Test**: Upload voice file with key `voice-123.webm` → Lambda should NOT be triggered (will fail on unfixed code, demonstrating the bug)
2. **Voice Upload With Prefix Test**: Upload voice file with key `uploads/voice-123.webm` → Lambda SHOULD be triggered (will pass, confirming our hypothesis)
3. **API Timeout Test**: Call `/api/voice-entry` endpoint → Should timeout after 60 seconds (will fail on unfixed code)
4. **S3 Event Log Test**: Check CloudWatch logs for Lambda invocations → Should show no invocations for root-level voice files (will confirm bug)

**Expected Counterexamples**:
- Lambda is not invoked when voice files are uploaded to S3 root
- API endpoint times out after 60+ seconds of polling
- CloudWatch logs show no Lambda executions for voice uploads
- Possible causes: S3 key missing `uploads/` prefix, Lambda event filter configured for `uploads/` prefix only

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds (voice file uploads), the fixed function produces the expected behavior (Lambda triggered, processing completes).

**Pseudocode:**
```
FOR ALL input WHERE isBugCondition(input) DO
  result := uploadVoiceFile_fixed(input)
  ASSERT result.s3Key.startsWith('uploads/')
  ASSERT lambdaTriggered(result.s3Key)
  ASSERT processingCompleted(result.s3Key) WITHIN 30 seconds
END FOR
```

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold (non-voice uploads), the fixed function produces the same result as the original function.

**Pseudocode:**
```
FOR ALL input WHERE NOT isBugCondition(input) DO
  ASSERT uploadFile_original(input).s3Key = uploadFile_fixed(input).s3Key
  ASSERT lambdaBehavior_original(input) = lambdaBehavior_fixed(input)
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking because:
- It generates many test cases automatically across the input domain
- It catches edge cases that manual unit tests might miss
- It provides strong guarantees that behavior is unchanged for all non-voice uploads

**Test Plan**: Observe behavior on UNFIXED code first for receipt OCR uploads, then write property-based tests capturing that behavior.

**Test Cases**:
1. **Receipt OCR Preservation**: Observe that receipt uploads use key `receipt-{timestamp}-{filename}` on unfixed code, then write test to verify this continues after fix
2. **CSV Upload Preservation**: Observe that CSV uploads work correctly on unfixed code, then write test to verify this continues after fix
3. **S3 Lifecycle Preservation**: Verify that lifecycle policies (1-day for voice, 7-day for receipts) continue to work after fix
4. **API Response Format Preservation**: Verify that API response structure remains unchanged after fix

### Unit Tests

- Test that voice file uploads generate S3 keys with `uploads/` prefix
- Test that receipt file uploads continue to generate S3 keys without prefix
- Test that file validation (type, size) continues to work
- Test that polling logic continues to look in `results/` prefix
- Test edge cases (special characters in filenames, very long filenames)

### Property-Based Tests

- Generate random voice filenames and verify all get `uploads/` prefix
- Generate random receipt filenames and verify none get `uploads/` prefix
- Generate random file types and verify validation logic is preserved
- Test that S3 key format is consistent across many uploads

### Integration Tests

- Test full voice-to-entry flow: upload → Lambda trigger → transcription → AI extraction → result retrieval
- Test that receipt OCR flow continues to work unchanged
- Test that voice processing completes within timeout (< 30 seconds)
- Test that API returns correct response format after successful processing
- Test error handling when Lambda fails (should still work as before)
