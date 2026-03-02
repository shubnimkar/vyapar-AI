# DynamoDB Setup Guide for Vyapar AI

**Date:** March 2, 2026  
**Status:** Migration Complete - Supabase Removed

---

## 🎯 Overview

Vyapar AI now uses AWS DynamoDB as the primary database, replacing Supabase PostgreSQL. This change was required for the AWS Hackathon to use 100% AWS services.

---

## 📋 DynamoDB Table Configuration

### Table Details

- **Table Name:** `vyapar-ai`
- **Billing Mode:** On-Demand (pay per request)
- **Region:** ap-south-1 (Mumbai)

### Primary Key Structure

- **Partition Key (PK):** String
- **Sort Key (SK):** String

### Global Secondary Index (GSI1) - Optional

- **GSI1PK:** String (Partition Key)
- **GSI1SK:** String (Sort Key)

### Time-to-Live (TTL)

- **Attribute Name:** `ttl`
- **Type:** Number (Unix timestamp in seconds)
- **Purpose:** Automatic data expiration

---

## 🗄️ Entity Types and Key Patterns

### 1. USER Entity
```
PK: USER#<userId>
SK: METADATA

Attributes:
- userId: String
- phoneNumber: String
- deviceId: String
- createdAt: String (ISO 8601)
- lastLogin: String (ISO 8601)
- preferences: Map
```

### 2. PROFILE Entity
```
PK: PROFILE#<userId>
SK: METADATA

Attributes:
- userId: String
- shopName: String
- userName: String
- businessType: String
- city: String
- language: String
- createdAt: String
- updatedAt: String
- isActive: Boolean
- subscriptionTier: String
- deletionRequestedAt: String (optional)
- deletionScheduledAt: String (optional)
```

### 3. DAILY_ENTRY Entity
```
PK: USER#<userId>
SK: ENTRY#<date>#<entryId>

Attributes:
- userId: String
- entryId: String (UUID)
- date: String (YYYY-MM-DD)
- type: String ('sale' | 'expense' | 'credit_given' | 'credit_received')
- amount: Number
- description: String
- category: String
- createdAt: String
- updatedAt: String
- ttl: Number (90 days from creation)
```

### 4. CREDIT Entity
```
PK: USER#<userId>
SK: CREDIT#<creditId>

Attributes:
- userId: String
- creditId: String (UUID)
- type: String ('given' | 'received')
- amount: Number
- partyName: String
- date: String
- dueDate: String
- status: String ('pending' | 'paid' | 'overdue')
- notes: String
- createdAt: String
- updatedAt: String
- ttl: Number (30 days after paid)
```

### 5. REPORT Entity
```
PK: USER#<userId>
SK: REPORT#<reportType>#<date>

Attributes:
- userId: String
- reportId: String (UUID)
- reportType: String ('daily' | 'weekly' | 'monthly')
- date: String
- reportData: Map
  - totalSales: Number
  - totalExpenses: Number
  - netProfit: Number
  - topExpenseCategories: List
  - insights: String
- createdAt: String
- ttl: Number (30 days from creation)
```

### 6. USER_PREFERENCES Entity
```
PK: USER#<userId>
SK: PREFERENCES

Attributes:
- userId: String
- automationEnabled: Boolean
- reportFrequency: String ('daily' | 'weekly' | 'monthly')
- notificationChannels: List
- updatedAt: String
```

---

## 🚀 AWS Console Setup Steps

### Step 1: Create DynamoDB Table

1. Go to AWS Console → DynamoDB → Tables
2. Click "Create table"
3. Configure:
   - **Table name:** `vyapar-ai`
   - **Partition key:** `PK` (String)
   - **Sort key:** `SK` (String)
   - **Table settings:** Default settings
   - **Capacity mode:** On-demand
4. Click "Create table"

### Step 2: Enable Time-to-Live (TTL)

1. Select the `vyapar-ai` table
2. Go to "Additional settings" tab
3. Click "Edit" in TTL section
4. Enable TTL
5. Set attribute name: `ttl`
6. Click "Save changes"

### Step 3: Enable Point-in-Time Recovery (Recommended)

1. Select the `vyapar-ai` table
2. Go to "Backups" tab
3. Click "Edit" in Point-in-time recovery section
4. Enable PITR
5. Click "Save changes"

### Step 4: Configure CloudWatch Alarms (Optional)

1. Go to CloudWatch → Alarms
2. Create alarms for:
   - Read capacity exceeded
   - Write capacity exceeded
   - User errors
   - System errors

---

## 🔧 Lambda Function Updates

All Lambda functions have been updated to use DynamoDB:

### 1. cashflow-predictor
- **Query:** Last 30 days of daily entries
- **Pattern:** `PK = USER#<userId>`, `SK begins_with ENTRY#`
- **Filter:** Date >= 30 days ago

### 2. expense-alert
- **Query:** Last 90 days of expense entries
- **Pattern:** `PK = USER#<userId>`, `SK begins_with ENTRY#`
- **Filter:** Type = 'expense', Date >= 90 days ago

### 3. report-generator
- **Scan:** Users with automation enabled
- **Pattern:** `SK begins_with PREFERENCES`, `automationEnabled = true`
- **Query:** Today's entries per user
- **Put:** Store generated reports with TTL

---

## 📦 Lambda Deployment

### Update Dependencies

For each Lambda function, run:

```bash
cd lambda/cashflow-predictor
npm install
zip -r function.zip .

cd ../expense-alert
npm install
zip -r function.zip .

cd ../report-generator
npm install
zip -r function.zip .
```

### Upload to AWS Lambda

1. Go to AWS Console → Lambda
2. Select each function
3. Upload the new `function.zip`
4. Update environment variables:
   - `DYNAMODB_TABLE_NAME=vyapar-ai`
   - `AWS_REGION=ap-south-1`
5. Ensure Lambda execution role has DynamoDB permissions

### Required IAM Permissions

Lambda execution role needs:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "dynamodb:GetItem",
        "dynamodb:PutItem",
        "dynamodb:UpdateItem",
        "dynamodb:Query",
        "dynamodb:Scan"
      ],
      "Resource": "arn:aws:dynamodb:ap-south-1:*:table/vyapar-ai"
    }
  ]
}
```

---

## 🧪 Testing

### Test DynamoDB Connection

```bash
# Install AWS CLI
aws configure

# Test table access
aws dynamodb describe-table --table-name vyapar-ai --region ap-south-1

# Put test item
aws dynamodb put-item \
  --table-name vyapar-ai \
  --item '{"PK":{"S":"TEST#123"},"SK":{"S":"METADATA"},"testData":{"S":"Hello"}}' \
  --region ap-south-1

# Get test item
aws dynamodb get-item \
  --table-name vyapar-ai \
  --key '{"PK":{"S":"TEST#123"},"SK":{"S":"METADATA"}}' \
  --region ap-south-1

# Delete test item
aws dynamodb delete-item \
  --table-name vyapar-ai \
  --key '{"PK":{"S":"TEST#123"},"SK":{"S":"METADATA"}}' \
  --region ap-south-1
```

### Test Lambda Functions

```bash
# Test cashflow-predictor
aws lambda invoke \
  --function-name cashflow-predictor \
  --payload '{"body":"{\"userId\":\"test-user-123\"}"}' \
  --region ap-south-1 \
  response.json

# Test expense-alert
aws lambda invoke \
  --function-name expense-alert \
  --payload '{"body":"{\"userId\":\"test-user-123\",\"expense\":{\"amount\":5000,\"category\":\"General\",\"date\":\"2026-03-02\"}}"}' \
  --region ap-south-1 \
  response.json

# Test report-generator
aws lambda invoke \
  --function-name report-generator \
  --payload '{}' \
  --region ap-south-1 \
  response.json
```

---

## 📊 Monitoring

### CloudWatch Metrics

Monitor these metrics:

- **ConsumedReadCapacityUnits:** Read throughput
- **ConsumedWriteCapacityUnits:** Write throughput
- **UserErrors:** Client-side errors (4xx)
- **SystemErrors:** Server-side errors (5xx)
- **ThrottledRequests:** Rate limiting

### CloudWatch Logs

Lambda function logs are in:
- `/aws/lambda/cashflow-predictor`
- `/aws/lambda/expense-alert`
- `/aws/lambda/report-generator`

---

## 💰 Cost Optimization

### DynamoDB Pricing (On-Demand)

- **Write:** $1.25 per million write request units
- **Read:** $0.25 per million read request units
- **Storage:** $0.25 per GB-month
- **Free Tier:** 25 GB storage, 25 WCU, 25 RCU

### Estimated Monthly Cost

For 1000 active users:
- Daily entries: ~30,000 writes/month = $0.04
- Daily reads: ~100,000 reads/month = $0.03
- Storage: ~1 GB = $0.25
- **Total:** ~$0.32/month (well within free tier)

### TTL Benefits

- Automatic deletion of expired data
- No manual cleanup required
- Reduces storage costs
- Free operation (no charge for TTL deletes)

---

## 🔒 Security Best Practices

1. **IAM Roles:** Use least privilege principle
2. **Encryption:** Enable encryption at rest (default)
3. **VPC Endpoints:** Use VPC endpoints for Lambda → DynamoDB
4. **Access Logging:** Enable CloudTrail for audit logs
5. **Backup:** Enable Point-in-Time Recovery

---

## 📝 Migration Checklist

- [x] Create DynamoDB table with proper schema
- [x] Enable TTL on `ttl` attribute
- [x] Update Lambda functions to use DynamoDB
- [x] Update Lambda package.json files
- [x] Remove Supabase dependencies
- [x] Update API routes to use DynamoDB
- [x] Archive SQL migration files
- [x] Update environment variables
- [x] Test Lambda functions
- [x] Test API routes
- [x] Verify TTL is working
- [ ] Deploy Lambda functions to AWS
- [ ] Test end-to-end user flows
- [ ] Monitor CloudWatch metrics
- [ ] Set up CloudWatch alarms

---

## 🆘 Troubleshooting

### Issue: Lambda can't access DynamoDB

**Solution:** Check IAM role permissions, ensure Lambda execution role has DynamoDB access.

### Issue: TTL not deleting items

**Solution:** TTL can take up to 48 hours to process. Check TTL is enabled and attribute name is correct.

### Issue: Query returns no items

**Solution:** Verify PK/SK format matches exactly. Check FilterExpression syntax.

### Issue: Throttling errors

**Solution:** Switch to provisioned capacity or increase on-demand limits.

---

**End of Setup Guide**
