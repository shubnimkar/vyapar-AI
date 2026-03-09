# Bugfix Requirements Document

## Introduction

The voice entry feature in Vyapar AI currently times out after 60+ seconds when users upload voice recordings. The root cause is an S3 path prefix mismatch: voice files are uploaded to the S3 bucket root (e.g., `voice-1772984927305-voice-1772984924744.webm`), but the Lambda function (`voice-processor`) is configured to only trigger on files with the `uploads/` prefix. This mismatch prevents the Lambda from being invoked, causing the API endpoint to poll indefinitely until timeout.

This bug affects the core voice-to-entry workflow, preventing users from adding daily entries via voice input—a critical feature for the target audience of small shop owners who prefer voice over typing.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN a user uploads a voice recording via `/api/voice-entry` THEN the system uploads the file to the S3 bucket root without the `uploads/` prefix (e.g., `voice-1772984927305-voice-1772984924744.webm`)

1.2 WHEN the voice file is uploaded to the S3 bucket root THEN the `voice-processor` Lambda function is not triggered because the S3 event notification is configured to watch only the `uploads/` prefix

1.3 WHEN the Lambda is not triggered THEN the API endpoint polls S3 for results that never arrive, eventually timing out after 60+ seconds with a 408 status code

1.4 WHEN the timeout occurs THEN the user receives an error and their voice entry is lost, requiring them to re-record and retry

### Expected Behavior (Correct)

2.1 WHEN a user uploads a voice recording via `/api/voice-entry` THEN the system SHALL upload the file to S3 with the `uploads/` prefix (e.g., `uploads/voice-1772984927305-voice-1772984924744.webm`)

2.2 WHEN the voice file is uploaded to S3 with the `uploads/` prefix THEN the `voice-processor` Lambda function SHALL be automatically triggered by the S3 event notification

2.3 WHEN the Lambda is triggered THEN it SHALL process the voice file (transcription + AI extraction), save results back to S3, and complete within a reasonable time (< 30 seconds for typical voice recordings)

2.4 WHEN the Lambda completes processing THEN the API endpoint SHALL successfully retrieve and return the results to the user without timeout

### Unchanged Behavior (Regression Prevention)

3.1 WHEN the receipt OCR feature uploads files to S3 THEN the system SHALL CONTINUE TO use the correct S3 prefix configuration for receipt files

3.2 WHEN the voice file is successfully processed THEN the system SHALL CONTINUE TO apply the S3 lifecycle policy (1-day retention for voice files)

3.3 WHEN the Lambda processes voice files THEN it SHALL CONTINUE TO use pre-signed URLs for secure S3 access

3.4 WHEN voice processing completes THEN the system SHALL CONTINUE TO return the same response format (transcription + extracted transaction data) to maintain API contract compatibility

3.5 WHEN the API endpoint polls for results THEN it SHALL CONTINUE TO implement the existing timeout and retry logic, only with successful Lambda invocation

3.6 WHEN voice files are uploaded THEN the system SHALL CONTINUE TO validate file type (audio/webm) and size limits before upload
