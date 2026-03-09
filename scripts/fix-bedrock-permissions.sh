#!/bin/bash

# Fix Bedrock Permissions for Lambda Functions
# This script updates the IAM policy to allow access to all Bedrock models

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Fixing Bedrock Permissions${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Get AWS Account ID
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
PROJECT_NAME="vyapar-ai"
LAMBDA_POLICY_NAME="${PROJECT_NAME}-lambda-policy"
LAMBDA_POLICY_ARN="arn:aws:iam::${ACCOUNT_ID}:policy/${LAMBDA_POLICY_NAME}"

echo -e "${GREEN}AWS Account ID: ${ACCOUNT_ID}${NC}"
echo -e "${GREEN}Policy ARN: ${LAMBDA_POLICY_ARN}${NC}"
echo ""

# Get current policy version
echo -e "${YELLOW}Getting current policy version...${NC}"
CURRENT_VERSION=$(aws iam get-policy --policy-arn "$LAMBDA_POLICY_ARN" --query 'Policy.DefaultVersionId' --output text)
echo -e "${GREEN}Current version: ${CURRENT_VERSION}${NC}"

# Create updated policy document with correct Bedrock permissions
echo -e "${YELLOW}Creating updated policy document...${NC}"
cat > /tmp/lambda-policy-updated.json <<EOF
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "CloudWatchLogs",
            "Effect": "Allow",
            "Action": [
                "logs:CreateLogGroup",
                "logs:CreateLogStream",
                "logs:PutLogEvents"
            ],
            "Resource": "arn:aws:logs:*:${ACCOUNT_ID}:*"
        },
        {
            "Sid": "DynamoDBAccess",
            "Effect": "Allow",
            "Action": [
                "dynamodb:GetItem",
                "dynamodb:PutItem",
                "dynamodb:UpdateItem",
                "dynamodb:DeleteItem",
                "dynamodb:Query",
                "dynamodb:Scan"
            ],
            "Resource": "arn:aws:dynamodb:*:${ACCOUNT_ID}:table/${PROJECT_NAME}"
        },
        {
            "Sid": "S3ObjectAccess",
            "Effect": "Allow",
            "Action": [
                "s3:GetObject",
                "s3:PutObject",
                "s3:DeleteObject"
            ],
            "Resource": [
                "arn:aws:s3:::${PROJECT_NAME}-*/*"
            ]
        },
        {
            "Sid": "S3BucketAccess",
            "Effect": "Allow",
            "Action": [
                "s3:ListBucket"
            ],
            "Resource": [
                "arn:aws:s3:::${PROJECT_NAME}-*"
            ]
        },
        {
            "Sid": "BedrockModelInvoke",
            "Effect": "Allow",
            "Action": [
                "bedrock:InvokeModel",
                "bedrock:InvokeModelWithResponseStream"
            ],
            "Resource": "*"
        },
        {
            "Sid": "TranscribeAccess",
            "Effect": "Allow",
            "Action": [
                "transcribe:StartTranscriptionJob",
                "transcribe:GetTranscriptionJob"
            ],
            "Resource": "*"
        }
    ]
}
EOF

# Create new policy version
echo -e "${YELLOW}Creating new policy version...${NC}"
aws iam create-policy-version \
    --policy-arn "$LAMBDA_POLICY_ARN" \
    --policy-document file:///tmp/lambda-policy-updated.json \
    --set-as-default \
    > /dev/null

echo -e "${GREEN}✓ Policy updated successfully${NC}"

# Delete old non-default versions (keep only 5 versions max)
echo -e "${YELLOW}Cleaning up old policy versions...${NC}"
VERSIONS=$(aws iam list-policy-versions --policy-arn "$LAMBDA_POLICY_ARN" --query 'Versions[?!IsDefaultVersion].VersionId' --output text)

for version in $VERSIONS; do
    if [ "$version" != "$CURRENT_VERSION" ]; then
        echo -e "${YELLOW}Deleting old version: ${version}${NC}"
        aws iam delete-policy-version \
            --policy-arn "$LAMBDA_POLICY_ARN" \
            --version-id "$version" \
            > /dev/null 2>&1 || echo -e "${YELLOW}Could not delete version ${version}${NC}"
    fi
done

echo -e "${GREEN}✓ Old versions cleaned up${NC}"
echo ""

# Wait for IAM changes to propagate
echo -e "${YELLOW}Waiting for IAM changes to propagate (10 seconds)...${NC}"
sleep 10

echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}Bedrock Permissions Fixed! 🎉${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "${YELLOW}The Lambda functions now have permission to invoke all Bedrock models.${NC}"
echo -e "${YELLOW}You can now test the cashflow predictor feature.${NC}"
echo ""

# Cleanup
rm -f /tmp/lambda-policy-updated.json

exit 0
