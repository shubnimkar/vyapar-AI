#!/bin/bash

# Check DynamoDB Configuration
echo "=== DynamoDB Configuration Check ==="
echo ""

# Load environment variables
if [ -f .env.local ]; then
  source .env.local
fi

echo "Environment Variables:"
echo "  AWS_REGION: ${AWS_REGION}"
echo "  AWS_S3_REGION: ${AWS_S3_REGION}"
echo "  DYNAMODB_REGION: ${DYNAMODB_REGION}"
echo "  DYNAMODB_TABLE_NAME: ${DYNAMODB_TABLE_NAME}"
echo ""

echo "Checking DynamoDB table in ap-south-1..."
aws dynamodb describe-table \
  --table-name "${DYNAMODB_TABLE_NAME}" \
  --region ap-south-1 \
  --query 'Table.[TableName,TableStatus,ItemCount]' \
  --output text 2>&1

echo ""
echo "Testing DynamoDB connection..."
aws dynamodb scan \
  --table-name "${DYNAMODB_TABLE_NAME}" \
  --region ap-south-1 \
  --limit 1 \
  --query 'Items[0]' \
  --output json 2>&1

echo ""
echo "=== Configuration Check Complete ==="
