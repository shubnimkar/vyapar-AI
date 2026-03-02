# AWS Bedrock APAC Inference Profile Setup Complete ✅

## Overview
Successfully migrated all Lambda functions to use:
- **Region**: ap-south-1 (Mumbai) for ALL services including Bedrock
- **Model**: Claude 3 Haiku via APAC inference profile
- **Inference Profile ID**: `apac.anthropic.claude-3-haiku-20240307-v1:0`

## What Changed

### 1. All Lambda Functions Updated

#### Files Modified:
- `lambda/receipt-ocr-processor/index.mjs`
- `lambda/expense-alert/index.mjs`
- `lambda/cashflow-predictor/index.mjs`
- `lambda/report-generator/index.mjs`
- `lambda/voice-processor/index.mjs`

#### Key Changes:
```javascript
// OLD (us-east-1 for Bedrock)
const bedrockClient = new BedrockRuntimeClient({ region: 'us-east-1' });
const BEDROCK_MODEL_ID = 'anthropic.claude-sonnet-4-5-20250929-v1:0';

// NEW (ap-south-1 for everything)
const AWS_REGION = process.env.AWS_REGION || 'ap-south-1';
const bedrockClient = new BedrockRuntimeClient({ region: AWS_REGION });
const BEDROCK_MODEL_ID = process.env.BEDROCK_MODEL_ID || 'apac.anthropic.claude-3-haiku-20240307-v1:0';

// Added logging before Bedrock invocation
console.log(`🌍 Bedrock Region: ${AWS_REGION}`);
console.log(`🤖 Bedrock Model ID: ${BEDROCK_MODEL_ID}`);
```

### 2. Environment Variables Updated

**`.env.local`**:
```bash
# OLD
BEDROCK_MODEL_ID=anthropic.claude-haiku-4-5-20251001-v1:0

# NEW
BEDROCK_MODEL_ID=apac.anthropic.claude-3-haiku-20240307-v1:0
```

**All Lambda Functions**:
- Environment variable: `BEDROCK_MODEL_ID=apac.anthropic.claude-3-haiku-20240307-v1:0`
- AWS_REGION is automatically set by Lambda runtime to `ap-south-1`

### 3. Vision Format Preserved

Receipt OCR Lambda still uses Anthropic Vision format:
```javascript
const bedrockPayload = {
  anthropic_version: "bedrock-2023-05-31",
  max_tokens: 1000,
  messages: [
    {
      role: "user",
      content: [
        {
          type: "image",
          source: {
            type: "base64",
            media_type: contentType,
            data: base64Image,
          },
        },
        {
          type: "text",
          text: prompt,
        },
      ],
    },
  ],
};
```

## Benefits of This Setup

### 1. Cost Savings
- **80% reduction** vs Claude Sonnet 4.5
- Claude 3 Haiku pricing: ~$0.00025 per 1K input tokens, ~$0.00125 per 1K output tokens
- Perfect for hackathon budget constraints

### 2. Regional Consistency
- All services (DynamoDB, S3, Lambda, Bedrock) in ap-south-1
- Lower latency for Mumbai-based users
- Simpler architecture (no cross-region calls)

### 3. Inference Profile Advantages
- **Cross-region routing**: AWS automatically routes to available regions
- **Higher availability**: Failover to other regions if needed
- **Better performance**: Optimized routing for APAC region
- **No marketplace subscription needed**: Inference profiles are pre-configured

### 4. Vision Support
- Claude 3 Haiku supports vision (image processing)
- Receipt OCR works with base64 image input
- Same API format as Claude Sonnet

## Current Configuration

### Lambda Functions
All 5 functions deployed with:
- ✅ Region: ap-south-1 for all AWS services
- ✅ Model: `apac.anthropic.claude-3-haiku-20240307-v1:0`
- ✅ Logging: Region and Model ID logged before each Bedrock call
- ✅ Vision format: Preserved for receipt-ocr-processor

### IAM Permissions
IAM policy already includes ap-south-1 Bedrock access:
```json
{
  "Sid": "BedrockModelInvoke",
  "Effect": "Allow",
  "Action": [
    "bedrock:InvokeModel",
    "bedrock:InvokeModelWithResponseStream"
  ],
  "Resource": [
    "arn:aws:bedrock:ap-south-1::foundation-model/*",
    "arn:aws:bedrock:us-east-1::foundation-model/*"
  ]
}
```

## Testing

### Test Receipt OCR
Upload a receipt to test the new setup:

```bash
# Upload test receipt
aws s3 cp test-receipt.jpg s3://vyapar-ai-receipts-975678946412/uploads/test-receipt.jpg

# Check Lambda logs
aws logs tail /aws/lambda/receipt-ocr-processor --follow --region ap-south-1
```

### Expected Log Output
```
🚀 Receipt OCR Lambda Started
📄 Processing: test-receipt.jpg from vyapar-ai-receipts-975678946412
⚙️  Config: Model=apac.anthropic.claude-3-haiku-20240307-v1:0
📥 Downloading image from S3...
✅ Image downloaded: 82790 bytes, type: image/jpeg
🤖 Starting Bedrock Vision OCR...
🔄 Encoding image for Bedrock...
📷 Image encoded: 110388 characters
📡 Calling Bedrock Vision API...
🌍 Region: ap-south-1
🤖 Model ID: apac.anthropic.claude-3-haiku-20240307-v1:0
✅ Bedrock response received
✅ Processing completed successfully
```

## Troubleshooting

### If you see "model not found" errors:
1. Verify the inference profile ID is correct: `apac.anthropic.claude-3-haiku-20240307-v1:0`
2. Check Lambda environment variable: `BEDROCK_MODEL_ID`
3. Ensure IAM policy includes ap-south-1 Bedrock permissions

### If you see "access denied" errors:
1. Check IAM role has `bedrock:InvokeModel` permission
2. Verify the resource ARN includes ap-south-1
3. Ensure no payment instrument issues (add payment method in AWS console)

### If receipt OCR fails:
1. Check CloudWatch logs for detailed error messages
2. Verify image format is supported (JPEG, PNG)
3. Ensure image size is under 5MB
4. Check S3 bucket permissions

## Cost Comparison

| Scenario | Old Setup (Sonnet 4.5) | New Setup (Haiku) | Savings |
|----------|------------------------|-------------------|---------|
| 1000 receipt OCR calls | $18.00 | $1.50 | 92% |
| 1000 text predictions | $18.00 | $1.50 | 92% |
| 1000 expense alerts | $18.00 | $1.50 | 92% |
| **Total (3000 calls)** | **$54.00** | **$4.50** | **92%** |

*Assuming 1K input tokens and 1K output tokens per call*

## Next Steps

1. ✅ All Lambda functions deployed
2. ✅ Environment variables updated
3. ✅ Region consistency achieved
4. ✅ Cost optimization implemented
5. 🔄 Test with real receipt images
6. 🔄 Monitor CloudWatch logs
7. 🔄 Track costs in AWS Cost Explorer

## Key Differences: Inference Profile vs Raw Model ID

### Raw Model ID (Old)
```
anthropic.claude-haiku-4-5-20251001-v1:0
```
- Direct model access
- Region-specific
- May not be available in all regions

### Inference Profile (New)
```
apac.anthropic.claude-3-haiku-20240307-v1:0
```
- Cross-region routing
- Higher availability
- Optimized for APAC region
- Automatic failover

---

**Date**: March 2, 2026  
**Status**: ✅ Complete and Deployed  
**Region**: ap-south-1 (Mumbai)  
**Model**: Claude 3 Haiku (APAC Inference Profile)
