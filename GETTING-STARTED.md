# Getting Started with Vyapar AI

**Quick setup guide - 5 minutes to deployment**

---

## Prerequisites

- AWS account with admin permissions
- AWS CLI installed
- Node.js 20+ installed

---

## Step 1: Get AWS Credentials (2 minutes)

1. Log in to [AWS Console](https://console.aws.amazon.com)
2. Go to **IAM** → **Users** → **Your User**
3. Click **Security credentials** tab
4. Click **Create access key**
5. Choose **CLI** as use case
6. Copy **Access Key ID** and **Secret Access Key**

---

## Step 2: Configure Environment (1 minute)

```bash
# Copy environment template
cp .env.local.example .env.local

# Edit and add your credentials
nano .env.local
```

Add your credentials:
```bash
AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
```

Save and exit (Ctrl+X, then Y, then Enter)

---

## Step 3: Deploy Infrastructure (2 minutes)

```bash
# Make scripts executable
chmod +x scripts/*.sh

# Run automated deployment
./scripts/deploy-aws-infrastructure.sh
```

Wait for completion. You'll see:
- ✓ DynamoDB table created
- ✓ S3 buckets created
- ✓ IAM roles created
- ✓ Lambda functions deployed
- ✓ Triggers configured

---

## Step 4: Validate & Start (1 minute)

```bash
# Validate deployment
./scripts/validate-infrastructure.sh

# Install dependencies
npm install

# Start application
npm run dev
```

Visit **http://localhost:3000**

---

## What Was Created?

- **DynamoDB table** - vyapar-ai (your database)
- **S3 buckets** - For receipts and voice files
- **5 Lambda functions** - AI processing
- **IAM role & policy** - Permissions

**Cost:** ~$5-10/month (mostly free tier)

---

## Test It Works

### Test Lambda Functions
```bash
./scripts/test-lambdas.sh
```

### Test Receipt Upload
```bash
# Upload a test receipt
aws s3 cp test-receipt.jpg s3://$S3_BUCKET_RECEIPTS/uploads/
```

### Test Voice Upload
```bash
# Upload a test voice file
aws s3 cp test-voice.webm s3://$S3_BUCKET_VOICE/uploads/
```

---

## Troubleshooting

### "Permission denied"
```bash
chmod +x scripts/*.sh
```

### "Invalid credentials"
```bash
# Verify credentials
aws sts get-caller-identity
```

### "Bedrock not accessible"
1. Go to AWS Console → Bedrock → Model access
2. Request access to Claude 3 Sonnet
3. Wait for approval (instant)

---

## Next Steps

1. ✅ Create your first daily entry
2. ✅ Upload a receipt
3. ✅ Record a voice entry
4. ✅ Generate a report
5. ✅ Test cash flow predictions

---

## Need Help?

- **Full Guide:** [AWS-DEPLOYMENT-GUIDE.md](AWS-DEPLOYMENT-GUIDE.md)
- **Scripts Docs:** [scripts/README.md](scripts/README.md)
- **DynamoDB Setup:** [DYNAMODB-SETUP-GUIDE.md](DYNAMODB-SETUP-GUIDE.md)

---

## Cleanup (Delete Everything)

```bash
./scripts/cleanup-infrastructure.sh
```

Type 'yes' to confirm. This deletes all AWS resources.

---

**That's it! You're ready to use Vyapar AI. 🎉**
