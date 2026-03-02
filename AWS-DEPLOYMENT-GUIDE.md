# AWS Deployment Guide - Vyapar AI

**Date:** March 2, 2026  
**Status:** Automated Deployment Ready

---

## 🎯 Overview

This guide provides step-by-step instructions for deploying Vyapar AI infrastructure to AWS using automated scripts.

---

## 📋 Prerequisites

### 1. AWS Account
- Active AWS account with admin permissions
- AWS CLI installed and configured
- Bedrock model access enabled (Claude 3 Sonnet)

### 2. Local Environment
- macOS, Linux, or WSL on Windows
- Node.js 20+ installed
- npm 10+ installed
- Bash shell
- Python 3 (for JSON formatting in test scripts)

### 3. AWS CLI Installation

```bash
# macOS
brew install awscli

# Linux
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install

# Verify installation
aws --version
```

---

## 🚀 Quick Start (5 Minutes)

### Step 1: Get AWS Credentials

1. Log in to AWS Console
2. Go to IAM → Users → Your User
3. Click "Security credentials" tab
4. Click "Create access key"
5. Choose "CLI" as use case
6. Copy Access Key ID and Secret Access Key

### Step 2: Configure Environment

```bash
# Copy environment template
cp .env.local.example .env.local

# Edit .env.local and add your credentials
nano .env.local
```

Add your credentials:
```bash
AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
AWS_REGION=ap-south-1
BEDROCK_MODEL_ID=anthropic.claude-3-sonnet-20240229-v1:0
```

### Step 3: Run Deployment Script

```bash
# Make scripts executable
chmod +x scripts/*.sh

# Run deployment (takes 2-3 minutes)
./scripts/deploy-aws-infrastructure.sh
```

### Step 4: Validate Deployment

```bash
# Validate all resources
./scripts/validate-infrastructure.sh

# Test Lambda functions
./scripts/test-lambdas.sh
```

### Step 5: Start Application

```bash
# Install dependencies
npm install

# Start Next.js development server
npm run dev
```

Visit http://localhost:3000

---

## 📦 What Gets Created

### AWS Resources

| Resource Type | Name | Purpose | Cost |
|--------------|------|---------|------|
| DynamoDB Table | vyapar-ai | Primary database | Free tier |
| S3 Bucket | vyapar-ai-receipts-{account-id} | Receipt storage (7-day retention) | ~$0.01/month |
| S3 Bucket | vyapar-ai-voice-{account-id} | Voice file storage (1-day retention) | ~$0.01/month |
| Lambda Function | cashflow-predictor | Cash flow predictions | Free tier |
| Lambda Function | expense-alert | Expense anomaly detection | Free tier |
| Lambda Function | report-generator | Automated daily reports | Free tier |
| Lambda Function | receipt-ocr-processor | Receipt OCR processing | Free tier |
| Lambda Function | voice-processor | Voice transcription & extraction | Free tier |
| IAM Role | vyapar-ai-lambda-role | Lambda execution role | Free |
| IAM Policy | vyapar-ai-lambda-policy | Lambda permissions | Free |

**Estimated Monthly Cost:** $0.02 - $0.50 (mostly free tier)

---

## 🔧 Deployment Script Details

### What the Script Does

1. **Validates AWS credentials** - Ensures you have proper access
2. **Creates DynamoDB table** - Single-table design with TTL and PITR
3. **Creates S3 buckets** - With lifecycle policies for automatic cleanup
4. **Creates IAM roles and policies** - Least privilege access for Lambda
5. **Packages Lambda functions** - Installs dependencies and creates ZIP files
6. **Deploys Lambda functions** - Uploads code and configures environment
7. **Configures S3 triggers** - Automatic Lambda invocation on file upload
8. **Updates .env.local** - Adds actual resource names

### Script Features

- **Idempotent** - Safe to run multiple times
- **Resource detection** - Skips existing resources
- **Error handling** - Exits on errors with clear messages
- **Color-coded output** - Easy to read progress
- **Automatic cleanup** - Removes temporary files

---

## 🧪 Testing

### Automated Tests

```bash
# Run all validation checks
./scripts/validate-infrastructure.sh

# Test Lambda functions with sample data
./scripts/test-lambdas.sh
```

### Manual Testing

#### Test Receipt OCR
```bash
# Upload a test receipt image
aws s3 cp test-receipt.jpg s3://$S3_BUCKET_RECEIPTS/uploads/test-receipt.jpg

# Check Lambda logs
aws logs tail /aws/lambda/receipt-ocr-processor --follow
```

#### Test Voice Processing
```bash
# Upload a test voice file
aws s3 cp test-voice.webm s3://$S3_BUCKET_VOICE/uploads/test-voice.webm

# Check Lambda logs
aws logs tail /aws/lambda/voice-processor --follow
```

#### Test Cashflow Prediction
```bash
# Invoke Lambda directly
aws lambda invoke \
  --function-name cashflow-predictor \
  --payload '{"body":"{\"userId\":\"test-user-123\"}"}' \
  --region ap-south-1 \
  response.json

# View response
cat response.json | python3 -m json.tool
```

---

## 🔍 Validation Checks

The validation script checks:

### DynamoDB
- ✓ Table exists
- ✓ TTL enabled on `ttl` attribute
- ✓ Point-in-Time Recovery enabled

### S3 Buckets
- ✓ Receipts bucket exists
- ✓ Voice bucket exists
- ✓ Lifecycle policies configured
- ✓ Public access blocked

### IAM
- ✓ Lambda execution role exists
- ✓ Lambda policy exists
- ✓ Policy attached to role

### Lambda Functions
- ✓ All 5 functions deployed
- ✓ Node.js 20 runtime
- ✓ Environment variables configured
- ✓ Correct memory and timeout settings

### S3 Triggers
- ✓ Receipt OCR trigger configured
- ✓ Voice processor trigger configured

### Bedrock
- ✓ Model access enabled

---

## 🛠️ Troubleshooting

### Issue: "Invalid AWS credentials"

**Solution:**
```bash
# Verify credentials
aws sts get-caller-identity

# Reconfigure AWS CLI
aws configure
```

### Issue: "Bedrock model not accessible"

**Solution:**
1. Go to AWS Console → Bedrock → Model access
2. Request access to Claude 3 Sonnet
3. Wait for approval (usually instant)

### Issue: "Lambda function failed to create"

**Solution:**
```bash
# Check IAM role propagation (wait 10 seconds)
sleep 10

# Re-run deployment
./scripts/deploy-aws-infrastructure.sh
```

### Issue: "S3 bucket already exists"

**Solution:**
- Bucket names are globally unique
- Script uses account ID suffix to avoid conflicts
- If still fails, manually delete the bucket and re-run

### Issue: "Permission denied on scripts"

**Solution:**
```bash
# Make scripts executable
chmod +x scripts/*.sh
```

---

## 🔄 Updating Infrastructure

### Update Lambda Functions

```bash
# Make changes to lambda/*/index.mjs
# Re-run deployment (only updates changed functions)
./scripts/deploy-aws-infrastructure.sh
```

### Update Environment Variables

```bash
# Edit .env.local
nano .env.local

# Update Lambda environment variables
aws lambda update-function-configuration \
  --function-name cashflow-predictor \
  --environment "Variables={AWS_REGION=ap-south-1,DYNAMODB_TABLE_NAME=vyapar-ai,...}"
```

---

## 🗑️ Cleanup (Delete All Resources)

**WARNING:** This will delete all data and resources!

```bash
# Run cleanup script
./scripts/cleanup-infrastructure.sh

# Confirm by typing 'yes'
```

This will delete:
- All Lambda functions
- All S3 buckets (and their contents)
- DynamoDB table (and all data)
- IAM role and policy

---

## 💰 Cost Optimization

### Free Tier Limits

- **DynamoDB:** 25 GB storage, 25 WCU, 25 RCU
- **Lambda:** 1M requests/month, 400,000 GB-seconds compute
- **S3:** 5 GB storage, 20,000 GET requests, 2,000 PUT requests
- **Bedrock:** Pay per token (no free tier)

### Cost Estimates

For 1000 active users:
- **DynamoDB:** $0 (within free tier)
- **Lambda:** $0 (within free tier)
- **S3:** $0.02/month (minimal storage with lifecycle policies)
- **Bedrock:** $5-10/month (depends on usage)
- **Total:** ~$5-10/month

### Cost Reduction Tips

1. **Use lifecycle policies** - Automatic deletion of old files
2. **Enable TTL** - Automatic deletion of expired DynamoDB items
3. **Monitor usage** - Set up CloudWatch alarms for unexpected spikes
4. **Use on-demand billing** - Pay only for what you use

---

## 📊 Monitoring

### CloudWatch Dashboards

```bash
# View Lambda logs
aws logs tail /aws/lambda/cashflow-predictor --follow

# View DynamoDB metrics
aws cloudwatch get-metric-statistics \
  --namespace AWS/DynamoDB \
  --metric-name ConsumedReadCapacityUnits \
  --dimensions Name=TableName,Value=vyapar-ai \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --statistics Sum
```

### Set Up Alarms

```bash
# Create alarm for Lambda errors
aws cloudwatch put-metric-alarm \
  --alarm-name vyapar-lambda-errors \
  --alarm-description "Alert on Lambda errors" \
  --metric-name Errors \
  --namespace AWS/Lambda \
  --statistic Sum \
  --period 300 \
  --threshold 10 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 1
```

---

## 🔐 Security Best Practices

### 1. Rotate Access Keys Regularly

```bash
# Create new access key
aws iam create-access-key --user-name your-username

# Update .env.local with new keys

# Delete old access key
aws iam delete-access-key --access-key-id OLD_KEY_ID --user-name your-username
```

### 2. Use IAM Roles for EC2

If deploying on EC2, use IAM roles instead of access keys:

```bash
# Attach role to EC2 instance
aws ec2 associate-iam-instance-profile \
  --instance-id i-1234567890abcdef0 \
  --iam-instance-profile Name=vyapar-ai-ec2-role
```

### 3. Enable CloudTrail

```bash
# Enable CloudTrail for audit logging
aws cloudtrail create-trail \
  --name vyapar-ai-trail \
  --s3-bucket-name my-cloudtrail-bucket
```

### 4. Restrict S3 Access

All buckets are private by default with public access blocked.

---

## 📝 Next Steps

After successful deployment:

1. **Test the application** - Visit http://localhost:3000
2. **Add test data** - Create sample entries in DynamoDB
3. **Test AWS features** - Upload receipts, record voice entries
4. **Set up monitoring** - Configure CloudWatch alarms
5. **Deploy to production** - Deploy Next.js app to EC2 or Vercel

---

## 🆘 Support

### Common Commands

```bash
# Check AWS account
aws sts get-caller-identity

# List all Lambda functions
aws lambda list-functions --region ap-south-1

# List all S3 buckets
aws s3 ls

# Describe DynamoDB table
aws dynamodb describe-table --table-name vyapar-ai --region ap-south-1

# View Lambda logs
aws logs tail /aws/lambda/cashflow-predictor --follow
```

### Resources

- [AWS CLI Documentation](https://docs.aws.amazon.com/cli/)
- [DynamoDB Documentation](https://docs.aws.amazon.com/dynamodb/)
- [Lambda Documentation](https://docs.aws.amazon.com/lambda/)
- [Bedrock Documentation](https://docs.aws.amazon.com/bedrock/)

---

## ✅ Deployment Checklist

- [ ] AWS account created with admin permissions
- [ ] AWS CLI installed and configured
- [ ] Bedrock model access enabled
- [ ] .env.local created with credentials
- [ ] Deployment script executed successfully
- [ ] Validation script passed all checks
- [ ] Lambda functions tested
- [ ] Application running locally
- [ ] CloudWatch alarms configured
- [ ] Cost monitoring set up

---

**Deployment Complete! 🎉**

Your Vyapar AI infrastructure is now fully deployed and ready to use.

---

**End of Deployment Guide**
