#!/bin/bash

# Vyapar AI - Infrastructure Validation Script
# Validates all AWS resources are properly configured

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

REGION="ap-south-1"
PROJECT_NAME="vyapar-ai"
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Infrastructure Validation${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

PASSED=0
FAILED=0

# Function to check resource
check_resource() {
    local name=$1
    local command=$2
    
    echo -n "Checking $name... "
    if eval "$command" > /dev/null 2>&1; then
        echo -e "${GREEN}✓ PASS${NC}"
        ((PASSED++))
        return 0
    else
        echo -e "${RED}✗ FAIL${NC}"
        ((FAILED++))
        return 1
    fi
}

# 1. DynamoDB Table
echo -e "${YELLOW}[1] DynamoDB Resources${NC}"
check_resource "DynamoDB table exists" \
    "aws dynamodb describe-table --table-name $PROJECT_NAME --region $REGION"

check_resource "DynamoDB TTL enabled" \
    "aws dynamodb describe-time-to-live --table-name $PROJECT_NAME --region $REGION | grep -q 'ENABLED'"

check_resource "DynamoDB PITR enabled" \
    "aws dynamodb describe-continuous-backups --table-name $PROJECT_NAME --region $REGION | grep -q 'ENABLED'"
echo ""

# 2. S3 Buckets
echo -e "${YELLOW}[2] S3 Resources${NC}"
RECEIPTS_BUCKET="${PROJECT_NAME}-receipts-${ACCOUNT_ID}"
VOICE_BUCKET="${PROJECT_NAME}-voice-${ACCOUNT_ID}"

check_resource "Receipts bucket exists" \
    "aws s3api head-bucket --bucket $RECEIPTS_BUCKET"

check_resource "Voice bucket exists" \
    "aws s3api head-bucket --bucket $VOICE_BUCKET"

check_resource "Receipts bucket lifecycle policy" \
    "aws s3api get-bucket-lifecycle-configuration --bucket $RECEIPTS_BUCKET | grep -q 'Days'"

check_resource "Voice bucket lifecycle policy" \
    "aws s3api get-bucket-lifecycle-configuration --bucket $VOICE_BUCKET | grep -q 'Days'"
echo ""

# 3. IAM Resources
echo -e "${YELLOW}[3] IAM Resources${NC}"
LAMBDA_ROLE_NAME="${PROJECT_NAME}-lambda-role"
LAMBDA_POLICY_NAME="${PROJECT_NAME}-lambda-policy"

check_resource "Lambda execution role exists" \
    "aws iam get-role --role-name $LAMBDA_ROLE_NAME"

check_resource "Lambda policy exists" \
    "aws iam get-policy --policy-arn arn:aws:iam::${ACCOUNT_ID}:policy/${LAMBDA_POLICY_NAME}"

check_resource "Policy attached to role" \
    "aws iam list-attached-role-policies --role-name $LAMBDA_ROLE_NAME | grep -q $LAMBDA_POLICY_NAME"
echo ""

# 4. Lambda Functions
echo -e "${YELLOW}[4] Lambda Functions${NC}"
LAMBDA_FUNCTIONS=("cashflow-predictor" "expense-alert" "report-generator" "receipt-ocr-processor" "voice-processor")

for func in "${LAMBDA_FUNCTIONS[@]}"; do
    check_resource "$func exists" \
        "aws lambda get-function --function-name $func --region $REGION"
    
    check_resource "$func has correct runtime" \
        "aws lambda get-function-configuration --function-name $func --region $REGION | grep -q 'nodejs20.x'"
    
    check_resource "$func environment variables" \
        "aws lambda get-function-configuration --function-name $func --region $REGION | grep -q 'DYNAMODB_TABLE_NAME'"
done
echo ""

# 5. S3 Event Notifications
echo -e "${YELLOW}[5] S3 Event Triggers${NC}"
check_resource "Receipt OCR trigger configured" \
    "aws s3api get-bucket-notification-configuration --bucket $RECEIPTS_BUCKET | grep -q 'receipt-ocr-processor'"

check_resource "Voice processor trigger configured" \
    "aws s3api get-bucket-notification-configuration --bucket $VOICE_BUCKET | grep -q 'voice-processor'"
echo ""

# 6. Bedrock Access
echo -e "${YELLOW}[6] Bedrock Access${NC}"
check_resource "Bedrock model access" \
    "aws bedrock list-foundation-models --region $REGION | grep -q 'claude'"
echo ""

# Summary
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Validation Summary${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "${GREEN}Passed: $PASSED${NC}"
echo -e "${RED}Failed: $FAILED${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ All checks passed! Infrastructure is ready.${NC}"
    exit 0
else
    echo -e "${RED}✗ Some checks failed. Please review the errors above.${NC}"
    exit 1
fi
