# Receipt OCR Nova Model Fix

## Issue
The Lambda function was failing with error:
```
Malformed input request: #/messages/0/content/1: extraneous key [type] is not permitted
```

## Root Cause
The Lambda function was using Claude's message format for Amazon Nova models. Nova uses a different API structure.

## Fix Applied

### Claude Format (Old - Incorrect for Nova)
```javascript
{
  anthropic_version: "bedrock-2023-05-31",
  max_tokens: 1000,
  messages: [{
    role: "user",
    content: [
      {
        type: "image",  // ❌ Nova doesn't use "type" key
        source: {
          type: "base64",
          media_type: contentType,
          data: base64Image
        }
      },
      {
        type: "text",
        text: prompt
      }
    ]
  }]
}
```

### Nova Format (New - Correct)
```javascript
{
  messages: [{
    role: "user",
    content: [
      {
        image: {  // ✅ Nova uses "image" key directly
          format: "jpeg",
          source: {
            bytes: base64Image
          }
        }
      },
      {
        text: prompt  // ✅ Nova uses "text" key directly
      }
    ]
  }],
  inferenceConfig: {
    max_new_tokens: 1000,
    temperature: 0.1
  }
}
```

## Changes Made

1. **Dynamic Payload Generation**: Added model-type detection to build correct payload
2. **Response Parsing**: Updated to handle Nova's response structure
3. **Deployment Script**: Created `scripts/update-receipt-ocr-lambda.sh`

## Testing

Upload a receipt to test:
```bash
# Via AWS Console
https://s3.console.aws.amazon.com/s3/buckets/vyapar-receipts-input

# Via AWS CLI
aws s3 cp receipt.jpg s3://vyapar-receipts-input/
```

Check CloudWatch logs:
```bash
aws logs tail /aws/lambda/receipt-ocr-processor --follow
```

## Model Support

The Lambda now supports:
- ✅ Amazon Nova models (`global.amazon.nova-2-lite-v1:0`)
- ✅ Claude models (`anthropic.claude-3-*`)

## References
- [Amazon Nova API Documentation](https://docs.aws.amazon.com/bedrock/latest/userguide/model-parameters-nova.html)
- [Claude API Documentation](https://docs.aws.amazon.com/bedrock/latest/userguide/model-parameters-anthropic-claude-messages.html)
