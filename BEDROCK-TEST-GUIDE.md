# AWS Bedrock Test Guide

This guide explains how to use the Bedrock test suite to diagnose and solve model invocation issues.

## Quick Start

1. **Access the test page:**
   ```
   http://localhost:3000/bedrock-test
   ```

2. **Check configuration:**
   - Click "Check Configuration" to verify AWS credentials are loaded
   - Confirms region, model ID, and credential presence

3. **Run tests:**
   - Basic Test: Simple response verification
   - Math Test: Validates model reasoning
   - JSON Test: Checks structured output parsing

## What Each Test Does

### Basic Test
- Sends: "Say 'Hello from AWS Bedrock!' and nothing else."
- Verifies: Model responds correctly
- Purpose: Confirms basic connectivity

### Math Test
- Sends: "What is 25 + 17? Provide only the number."
- Verifies: Model can perform calculations
- Purpose: Tests reasoning capability

### JSON Test
- Sends: Request for structured JSON output
- Verifies: Response parsing works
- Purpose: Validates data extraction

## Understanding Results

### Success Response
```json
{
  "success": true,
  "testType": "basic",
  "prompt": "...",
  "response": "Hello from AWS Bedrock!",
  "metadata": {
    "modelId": "apac.anthropic.claude-3-haiku-20240307-v1:0",
    "region": "ap-south-1",
    "duration": "1234ms",
    "usage": {
      "input_tokens": 15,
      "output_tokens": 8
    }
  }
}
```

### Error Response
```json
{
  "success": false,
  "error": "AccessDeniedException",
  "details": {
    "message": "User is not authorized...",
    "statusCode": 403,
    "requestId": "..."
  }
}
```

## Common Issues & Solutions

### 1. AccessDeniedException
**Problem:** IAM user lacks Bedrock permissions

**Solution:**
```bash
# Add this policy to your IAM user
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "bedrock:InvokeModel",
        "bedrock:InvokeModelWithResponseStream"
      ],
      "Resource": "*"
    }
  ]
}
```

### 2. ResourceNotFoundException
**Problem:** Model not available or access not requested

**Solution:**
1. Go to AWS Bedrock Console
2. Navigate to "Model access"
3. Request access to Claude 3 Haiku
4. Wait for approval (usually instant)

### 3. ValidationException
**Problem:** Invalid model ID or request format

**Solution:**
- Verify model ID in `.env.local`
- For ap-south-1, use: `apac.anthropic.claude-3-haiku-20240307-v1:0`
- Check BEDROCK-APAC-INFERENCE-PROFILE-SETUP.md

### 4. ThrottlingException
**Problem:** Too many requests

**Solution:**
- Wait 30 seconds between tests
- Implement exponential backoff (already in bedrock-client.ts)
- Consider upgrading to higher quota

### 5. Region Mismatch
**Problem:** Model not available in selected region

**Solution:**
```bash
# In .env.local, ensure:
AWS_REGION=ap-south-1
BEDROCK_MODEL_ID=apac.anthropic.claude-3-haiku-20240307-v1:0
```

## API Endpoint Usage

### POST /api/bedrock-test
Test model invocation programmatically:

```javascript
const response = await fetch('/api/bedrock-test', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ testType: 'basic' })
});

const result = await response.json();
console.log(result);
```

### GET /api/bedrock-test
Health check endpoint:

```javascript
const response = await fetch('/api/bedrock-test');
const health = await response.json();
// Returns: { status, configured, region, modelId }
```

## Integration with Existing Code

Once tests pass, your existing Bedrock client (`lib/bedrock-client.ts`) will work correctly. The test suite uses the same:
- AWS SDK configuration
- Credential loading
- Model invocation pattern
- Error handling

## Troubleshooting Workflow

1. **Run health check** → Verify configuration loaded
2. **Run basic test** → Confirm connectivity
3. **Check error details** → Identify specific issue
4. **Apply solution** → Fix configuration/permissions
5. **Retest** → Verify fix worked

## Next Steps After Tests Pass

1. Test your actual features:
   - CSV analysis (`/api/analyze`)
   - Q&A chat (`/api/ask`)
   - Daily insights (`/api/explain`)
   - Receipt OCR (`/api/receipt-ocr`)

2. Monitor usage:
   - Check CloudWatch logs
   - Review token consumption
   - Track response times

3. Optimize:
   - Adjust max_tokens based on needs
   - Implement caching for repeated queries
   - Consider batch processing

## Cost Monitoring

Each test costs approximately:
- Input tokens: ~15-20
- Output tokens: ~5-50
- Total cost: < $0.001 per test

Monitor in AWS Cost Explorer under Bedrock service.

## Support

If tests continue to fail:
1. Check AWS Service Health Dashboard
2. Verify IAM permissions in AWS Console
3. Review CloudWatch logs for detailed errors
4. Consult TROUBLESHOOTING.md for app-specific issues
