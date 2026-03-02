# AWS Bedrock Model Options for Hackathon

## Current Setup
- **Model**: Claude Sonnet 4.5 (`anthropic.claude-sonnet-4-5-20250929-v1:0`)
- **Region**: us-east-1
- **Cost**: Premium pricing (highest quality, highest cost)

## Cost-Effective Alternatives

### 1. Amazon Titan Models (AWS Native - Lower Cost)

#### Amazon Titan Text Express
- **Model ID**: `amazon.titan-text-express-v1`
- **Best for**: Text generation, summaries, Q&A
- **Pricing**: ~$0.0002 per 1K input tokens, ~$0.0006 per 1K output tokens
- **Pros**: 
  - Lowest cost option
  - AWS native (no marketplace subscription needed)
  - Good for basic text tasks
- **Cons**: 
  - Lower quality than Claude
  - No vision capabilities (can't process images)

#### Amazon Titan Text Lite
- **Model ID**: `amazon.titan-text-lite-v1`
- **Best for**: Simple text tasks, classifications
- **Pricing**: ~$0.00015 per 1K input tokens, ~$0.0002 per 1K output tokens
- **Pros**: Cheapest option
- **Cons**: Basic capabilities only

#### Amazon Titan Multimodal Embeddings
- **Model ID**: `amazon.titan-embed-image-v1`
- **Best for**: Image search, similarity
- **Note**: Not suitable for OCR text extraction

### 2. Claude 3 Haiku (Anthropic - Fast & Affordable)

- **Model ID**: `anthropic.claude-3-haiku-20240307-v1:0`
- **Best for**: Fast responses, simple tasks
- **Pricing**: ~$0.00025 per 1K input tokens, ~$0.00125 per 1K output tokens
- **Pros**:
  - Much cheaper than Sonnet
  - Fast response times
  - Supports vision (can process images)
  - Good for receipt OCR
- **Cons**: Lower quality than Sonnet for complex reasoning

### 3. Claude 3.5 Haiku (Anthropic - Balanced)

- **Model ID**: `anthropic.claude-3-5-haiku-20241022-v2:0`
- **Best for**: Balance of cost and quality
- **Pricing**: ~$0.001 per 1K input tokens, ~$0.005 per 1K output tokens
- **Pros**:
  - Better quality than Claude 3 Haiku
  - Still much cheaper than Sonnet
  - Supports vision
- **Cons**: Requires marketplace subscription

## Recommended Strategy for Hackathon

### Option A: Hybrid Approach (Best Balance)
Use different models for different tasks:

1. **Receipt OCR** → Claude 3 Haiku (needs vision, simple extraction)
2. **Cash Flow Prediction** → Amazon Titan Text Express (text-only, pattern analysis)
3. **Expense Alerts** → Amazon Titan Text Express (simple anomaly detection)
4. **Report Generation** → Claude 3 Haiku (needs better quality)
5. **Voice Processing** → Amazon Titan Text Express (text extraction from transcript)

**Estimated Cost**: ~70% reduction vs Claude Sonnet 4.5

### Option B: All Titan (Lowest Cost)
Use Amazon Titan for all text-only tasks:

1. **Receipt OCR** → ⚠️ Problem: Titan doesn't support vision
   - Alternative: Use Amazon Textract (OCR service) + Titan for parsing
2. **All other tasks** → Amazon Titan Text Express

**Estimated Cost**: ~85% reduction vs Claude Sonnet 4.5

### Option C: All Claude 3 Haiku (Simplest)
Use Claude 3 Haiku for everything:

**Estimated Cost**: ~80% reduction vs Claude Sonnet 4.5
**Pros**: Single model, supports vision, good quality
**Cons**: Still requires marketplace subscription

## Hackathon-Specific Options

### AWS Credits
1. **Check AWS Activate**: https://aws.amazon.com/activate/
   - Startups can get $1,000-$100,000 in credits
2. **Hackathon Organizer Credits**: 
   - Contact hackathon organizers for AWS credit codes
   - Many hackathons provide $100-$500 per team
3. **AWS Educate**: If you're a student
   - Free credits for students

### Free Tier Considerations
- **DynamoDB**: 25 GB storage, 25 WCU, 25 RCU (free forever)
- **Lambda**: 1M requests/month, 400,000 GB-seconds (free forever)
- **S3**: 5 GB storage, 20,000 GET requests (first 12 months)
- **Bedrock**: No free tier, but pay-per-use

## Implementation Guide

### Switch to Claude 3 Haiku (Recommended)

```bash
# Update .env.local
BEDROCK_MODEL_ID=anthropic.claude-3-haiku-20240307-v1:0

# Update all Lambda functions
aws lambda update-function-configuration \
  --function-name receipt-ocr-processor \
  --environment "Variables={BEDROCK_MODEL_ID=anthropic.claude-3-haiku-20240307-v1:0,...}" \
  --region ap-south-1
```

### Switch to Amazon Titan (Text-only tasks)

For functions that don't need vision (cashflow-predictor, expense-alert, report-generator):

```bash
# Update Lambda environment
BEDROCK_MODEL_ID=amazon.titan-text-express-v1
```

**Note**: Titan uses different API format. You'll need to update the Lambda code:

```javascript
// Claude format (current)
const bedrockPayload = {
  anthropic_version: "bedrock-2023-05-31",
  max_tokens: 1000,
  messages: [{ role: "user", content: prompt }]
};

// Titan format (new)
const bedrockPayload = {
  inputText: prompt,
  textGenerationConfig: {
    maxTokenCount: 1000,
    temperature: 0.7,
    topP: 0.9
  }
};
```

## Cost Comparison (Estimated for 1000 API calls)

| Model | Input Cost | Output Cost | Total (Est.) |
|-------|-----------|-------------|--------------|
| Claude Sonnet 4.5 | $3.00 | $15.00 | $18.00 |
| Claude 3.5 Haiku | $1.00 | $5.00 | $6.00 |
| Claude 3 Haiku | $0.25 | $1.25 | $1.50 |
| Titan Text Express | $0.20 | $0.60 | $0.80 |
| Titan Text Lite | $0.15 | $0.20 | $0.35 |

*Assuming 1K input tokens and 1K output tokens per call*

## My Recommendation

For your hackathon, I recommend:

1. **Immediate**: Switch to **Claude 3 Haiku** for all tasks
   - 80% cost reduction
   - Still supports vision for receipt OCR
   - Good enough quality for demo
   - Simple to implement (just change model ID)

2. **If budget is tight**: Use **hybrid approach**
   - Claude 3 Haiku for receipt OCR only
   - Amazon Titan Text Express for everything else
   - Requires code changes but saves more money

3. **Check for credits first**:
   - Contact hackathon organizers
   - Apply for AWS Activate if eligible
   - Use AWS Educate if you're a student

## Next Steps

1. Decide which model strategy to use
2. Update `.env.local` with new model ID
3. Update Lambda environment variables
4. Test with sample data
5. Monitor costs in AWS Cost Explorer

Would you like me to switch to Claude 3 Haiku now?
