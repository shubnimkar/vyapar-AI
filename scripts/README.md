# Vyapar AI - Deployment Scripts

Automated scripts for AWS infrastructure deployment and management.

---

## 📜 Available Scripts

### 1. `deploy-aws-infrastructure.sh`
**Purpose:** Automated deployment of all AWS resources

**What it does:**
- Creates DynamoDB table with TTL and PITR
- Creates S3 buckets with lifecycle policies
- Creates IAM roles and policies
- Packages and deploys 5 Lambda functions
- Configures S3 event triggers
- Updates .env.local with resource names

**Usage:**
```bash
./scripts/deploy-aws-infrastructure.sh
```

**Prerequisites:**
- AWS credentials in .env.local
- AWS CLI installed
- Node.js 20+ installed

**Duration:** 2-3 minutes

---

### 2. `validate-infrastructure.sh`
**Purpose:** Validates all AWS resources are properly configured

**What it checks:**
- DynamoDB table exists with TTL and PITR
- S3 buckets exist with lifecycle policies
- IAM roles and policies configured
- Lambda functions deployed with correct runtime
- S3 event triggers configured
- Bedrock model access enabled

**Usage:**
```bash
./scripts/validate-infrastructure.sh
```

**Output:** Pass/Fail for each check with summary

---

### 3. `test-lambdas.sh`
**Purpose:** Tests all Lambda functions with sample payloads

**What it tests:**
- cashflow-predictor - Cash flow predictions
- expense-alert - Expense anomaly detection
- report-generator - Automated report generation

**Usage:**
```bash
./scripts/test-lambdas.sh
```

**Note:** Some tests may show "insufficient data" for fresh deployments

---

### 4. `cleanup-infrastructure.sh`
**Purpose:** Deletes all AWS resources (USE WITH CAUTION!)

**What it deletes:**
- All Lambda functions
- All S3 buckets and their contents
- DynamoDB table and all data
- IAM roles and policies

**Usage:**
```bash
./scripts/cleanup-infrastructure.sh
```

**Confirmation:** Requires typing 'yes' to proceed

---

## 🚀 Quick Start

```bash
# 1. Configure environment
cp .env.local.example .env.local
nano .env.local  # Add AWS credentials

# 2. Deploy infrastructure
./scripts/deploy-aws-infrastructure.sh

# 3. Validate deployment
./scripts/validate-infrastructure.sh

# 4. Test Lambda functions
./scripts/test-lambdas.sh

# 5. Start application
npm run dev
```

---

## 🔧 Script Requirements

All scripts require:
- Bash shell
- AWS CLI configured
- Valid AWS credentials in .env.local

Additional requirements:
- `test-lambdas.sh` - Python 3 (for JSON formatting)
- `deploy-aws-infrastructure.sh` - Node.js 20+ (for npm install)

---

## 📊 Script Output

All scripts use color-coded output:
- 🔵 **Blue** - Section headers
- 🟡 **Yellow** - In-progress operations
- 🟢 **Green** - Success messages
- 🔴 **Red** - Error messages

---

## 🛠️ Troubleshooting

### Permission Denied
```bash
chmod +x scripts/*.sh
```

### AWS Credentials Not Found
```bash
# Check .env.local exists
ls -la .env.local

# Verify credentials
aws sts get-caller-identity
```

### Script Fails Midway
- Scripts are idempotent - safe to re-run
- Existing resources will be detected and skipped
- Check error message for specific issue

---

## 📝 Script Maintenance

### Adding New Lambda Functions

1. Add function to `LAMBDA_FUNCTIONS` array in deploy script
2. Add memory/timeout config to `LAMBDA_CONFIGS` array
3. Add function to validation script checks
4. Add test case to test script

### Modifying IAM Permissions

Edit the policy JSON in `deploy-aws-infrastructure.sh`:
```bash
cat > /tmp/lambda-policy.json <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    // Add new permissions here
  ]
}
EOF
```

---

## 🔐 Security Notes

- Scripts never log AWS credentials
- Temporary files are cleaned up automatically
- IAM policies follow least privilege principle
- S3 buckets have public access blocked by default

---

## 📚 Additional Resources

- [AWS Deployment Guide](../AWS-DEPLOYMENT-GUIDE.md)
- [DynamoDB Setup Guide](../DYNAMODB-SETUP-GUIDE.md)
- [Migration Summary](../MIGRATION-SUMMARY.md)

---

**End of Scripts README**
