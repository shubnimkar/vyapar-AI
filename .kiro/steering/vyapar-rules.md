# Vyapar AI Steering Rules

## Core Architecture
- Use Next.js App Router with server components only for static content.
- All API routes must be in `app/api/` and use `export async function POST`.
- Deploy on AWS EC2 for full control and cost optimization.

## AWS Services Integration
- **Bedrock**: Use AWS SDK for JavaScript v3, credentials from environment variables.
  - AI insights, explanations, predictions
  - OCR with Bedrock Vision for receipt processing
  - NLP for voice data extraction
- **Lambda**: Serverless functions for AI processing only
  - Node.js 20 runtime
  - Event-driven triggers (S3, API Gateway, EventBridge)
  - Keep functions focused (single responsibility)
- **S3**: Temporary storage only (use lifecycle policies)
  - Receipts: 7-day retention
  - Voice files: 1-day retention
  - Use pre-signed URLs for security
- **Transcribe**: Voice-to-text with Hindi language support
  - Audio format: MP3, WAV, or M4A
  - Language code: 'hi-IN' for Hindi

## Data Storage Strategy
- **AWS DynamoDB**: Primary database (free tier eligible)
  - User accounts, daily entries, credit tracking
  - NoSQL document-based storage for flexible schema
  - Single-table design with GSIs for efficient queries
- **AWS S3**: User-uploaded files (CSVs, PDFs, receipts)
- **localStorage**: Client-side cache (offline-first)
- **In-Memory**: Session data for CSV analysis and AI conversations

## Hybrid Sync Storage
- Daily entries and credit tracking: localStorage (primary) + DynamoDB (cloud backup)
- Offline-first: works without internet, syncs when online
- CSV data and AI conversations: session-only in memory
- Data retention: 90 days for daily entries, 30 days for paid credits
- DynamoDB TTL for automatic data expiration

## Development Guidelines
- CSV parsing: PapaParse in browser or in API route.
- Language detection: store user preference in localStorage.
- Voice: Web Speech API for synthesis (Hindi voice available).
- Error messages: show in user's selected language, with friendly tone.
- Cost optimization: Use DynamoDB free tier, AWS services for all capabilities.

## Lambda Function Guidelines
- **Naming**: Use kebab-case (e.g., `receipt-ocr-processor`)
- **Memory**: Start with 256MB, increase only if needed
- **Timeout**: Set based on operation (OCR: 30s, Voice: 60s)
- **Environment Variables**: Store in Lambda configuration, not in code
- **Error Handling**: Always return structured JSON with error details
- **Logging**: Use console.log for CloudWatch integration

## S3 Guidelines
- **Bucket Naming**: `vyapar-{purpose}` (e.g., `vyapar-receipts`)
- **Lifecycle Policies**: Always set retention period
- **Access**: Private by default, use pre-signed URLs
- **Triggers**: Configure Lambda triggers for processing
- **Cleanup**: Automatic deletion after retention period
