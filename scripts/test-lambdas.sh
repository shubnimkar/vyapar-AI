#!/bin/bash

# Vyapar AI - Lambda Function Testing Script
# Tests all Lambda functions with sample payloads

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Load region from .env.local
if [ -f .env.local ]; then
    export $(cat .env.local | grep AWS_REGION | xargs)
fi
REGION="${AWS_REGION:-ap-south-1}"
TEST_USER_ID="test-user-$(date +%s)"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Lambda Function Testing${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "${YELLOW}Test User ID: $TEST_USER_ID${NC}"
echo ""

# Function to test Lambda
test_lambda() {
    local func_name=$1
    local payload=$2
    local description=$3
    
    echo -e "${YELLOW}Testing $func_name...${NC}"
    echo -e "Description: $description"
    
    # Create temp file for payload
    echo "$payload" > /tmp/lambda-payload.json
    
    # Invoke Lambda with CLI v2 format
    aws lambda invoke \
        --function-name "$func_name" \
        --cli-binary-format raw-in-base64-out \
        --payload file:///tmp/lambda-payload.json \
        --region "$REGION" \
        /tmp/lambda-response.json \
        > /dev/null 2>&1
    
    # Check response
    if grep -q '"statusCode": 200' /tmp/lambda-response.json || grep -q '"success": true' /tmp/lambda-response.json; then
        echo -e "${GREEN}✓ Test passed${NC}"
        echo -e "${BLUE}Response:${NC}"
        cat /tmp/lambda-response.json | python3 -m json.tool 2>/dev/null || cat /tmp/lambda-response.json
    else
        echo -e "${RED}✗ Test failed${NC}"
        echo -e "${RED}Response:${NC}"
        cat /tmp/lambda-response.json | python3 -m json.tool 2>/dev/null || cat /tmp/lambda-response.json
    fi
    
    echo ""
    rm -f /tmp/lambda-payload.json /tmp/lambda-response.json
}

# 1. Test cashflow-predictor
echo -e "${BLUE}[1/3] Testing Cashflow Predictor${NC}"
test_lambda "cashflow-predictor" \
    "{\"body\": \"{\\\"userId\\\": \\\"$TEST_USER_ID\\\"}\"}" \
    "Predicts cash flow for next 7 days (may return insufficient data)"

# 2. Test expense-alert
echo -e "${BLUE}[2/3] Testing Expense Alert${NC}"
test_lambda "expense-alert" \
    "{\"body\": \"{\\\"userId\\\": \\\"$TEST_USER_ID\\\", \\\"expense\\\": {\\\"amount\\\": 5000, \\\"category\\\": \\\"General\\\", \\\"date\\\": \\\"$(date +%Y-%m-%d)\\\"}}\"}" \
    "Detects expense anomalies"

# 3. Test report-generator
echo -e "${BLUE}[3/3] Testing Report Generator${NC}"
test_lambda "report-generator" \
    "{}" \
    "Generates daily reports for users with automation enabled"

# Summary
echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}Testing Complete!${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "${YELLOW}Note:${NC} Some tests may show 'insufficient data' or 'no users' - this is expected for a fresh deployment."
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo -e "1. Add test data to DynamoDB"
echo -e "2. Test receipt OCR by uploading to S3: ${BLUE}aws s3 cp test-receipt.jpg s3://\$S3_BUCKET_RECEIPTS/uploads/${NC}"
echo -e "3. Test voice processor by uploading to S3: ${BLUE}aws s3 cp test-voice.webm s3://\$S3_BUCKET_VOICE/uploads/${NC}"
echo ""
