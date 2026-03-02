#!/bin/bash

# Vyapar AI - Infrastructure Cleanup Script
# WARNING: This will DELETE all AWS resources created by the deployment script

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

echo -e "${RED}========================================${NC}"
echo -e "${RED}WARNING: Infrastructure Cleanup${NC}"
echo -e "${RED}========================================${NC}"
echo ""
echo -e "${RED}This will DELETE all Vyapar AI AWS resources!${NC}"
echo -e "${YELLOW}Resources to be deleted:${NC}"
echo -e "  - DynamoDB table: $PROJECT_NAME"
echo -e "  - S3 buckets: ${PROJECT_NAME}-receipts-${ACCOUNT_ID}, ${PROJECT_NAME}-voice-${ACCOUNT_ID}"
echo -e "  - Lambda functions: 5 functions"
echo -e "  - IAM role and policy"
echo ""
read -p "Are you sure you want to continue? (type 'yes' to confirm): " confirm

if [ "$confirm" != "yes" ]; then
    echo -e "${GREEN}Cleanup cancelled.${NC}"
    exit 0
fi

echo ""
echo -e "${YELLOW}Starting cleanup...${NC}"
echo ""

# 1. Delete Lambda functions
echo -e "${BLUE}[1/5] Deleting Lambda Functions...${NC}"
LAMBDA_FUNCTIONS=("cashflow-predictor" "expense-alert" "report-generator" "receipt-ocr-processor" "voice-processor")

for func in "${LAMBDA_FUNCTIONS[@]}"; do
    echo -n "Deleting $func... "
    aws lambda delete-function --function-name "$func" --region "$REGION" > /dev/null 2>&1 && echo -e "${GREEN}✓${NC}" || echo -e "${YELLOW}not found${NC}"
done
echo ""

# 2. Empty and delete S3 buckets
echo -e "${BLUE}[2/5] Deleting S3 Buckets...${NC}"
RECEIPTS_BUCKET="${PROJECT_NAME}-receipts-${ACCOUNT_ID}"
VOICE_BUCKET="${PROJECT_NAME}-voice-${ACCOUNT_ID}"

for bucket in "$RECEIPTS_BUCKET" "$VOICE_BUCKET"; do
    echo -n "Emptying $bucket... "
    aws s3 rm "s3://$bucket" --recursive > /dev/null 2>&1 && echo -e "${GREEN}✓${NC}" || echo -e "${YELLOW}not found${NC}"
    
    echo -n "Deleting $bucket... "
    aws s3api delete-bucket --bucket "$bucket" --region "$REGION" > /dev/null 2>&1 && echo -e "${GREEN}✓${NC}" || echo -e "${YELLOW}not found${NC}"
done
echo ""

# 3. Delete DynamoDB table
echo -e "${BLUE}[3/5] Deleting DynamoDB Table...${NC}"
echo -n "Deleting $PROJECT_NAME table... "
aws dynamodb delete-table --table-name "$PROJECT_NAME" --region "$REGION" > /dev/null 2>&1 && echo -e "${GREEN}✓${NC}" || echo -e "${YELLOW}not found${NC}"
echo ""

# 4. Detach and delete IAM policy
echo -e "${BLUE}[4/5] Deleting IAM Policy...${NC}"
LAMBDA_ROLE_NAME="${PROJECT_NAME}-lambda-role"
LAMBDA_POLICY_NAME="${PROJECT_NAME}-lambda-policy"
LAMBDA_POLICY_ARN="arn:aws:iam::${ACCOUNT_ID}:policy/${LAMBDA_POLICY_NAME}"

echo -n "Detaching policy from role... "
aws iam detach-role-policy --role-name "$LAMBDA_ROLE_NAME" --policy-arn "$LAMBDA_POLICY_ARN" > /dev/null 2>&1 && echo -e "${GREEN}✓${NC}" || echo -e "${YELLOW}not attached${NC}"

echo -n "Detaching AWS managed policy... "
aws iam detach-role-policy --role-name "$LAMBDA_ROLE_NAME" --policy-arn "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole" > /dev/null 2>&1 && echo -e "${GREEN}✓${NC}" || echo -e "${YELLOW}not attached${NC}"

echo -n "Deleting policy... "
aws iam delete-policy --policy-arn "$LAMBDA_POLICY_ARN" > /dev/null 2>&1 && echo -e "${GREEN}✓${NC}" || echo -e "${YELLOW}not found${NC}"
echo ""

# 5. Delete IAM role
echo -e "${BLUE}[5/5] Deleting IAM Role...${NC}"
echo -n "Deleting $LAMBDA_ROLE_NAME... "
aws iam delete-role --role-name "$LAMBDA_ROLE_NAME" > /dev/null 2>&1 && echo -e "${GREEN}✓${NC}" || echo -e "${YELLOW}not found${NC}"
echo ""

echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}Cleanup Complete!${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "${YELLOW}All Vyapar AI AWS resources have been deleted.${NC}"
echo ""
