#!/bin/bash

# Create DynamoDB Table for Vyapar AI
# This script creates the vyapar-ai table with proper configuration

set -e

TABLE_NAME="vyapar-ai"
REGION="ap-south-1"

echo "🚀 Creating DynamoDB table: $TABLE_NAME"

# Check if table already exists
if aws dynamodb describe-table --table-name "$TABLE_NAME" --region "$REGION" &>/dev/null; then
  echo "✅ Table $TABLE_NAME already exists"
  exit 0
fi

# Create table
echo "📦 Creating table with on-demand billing..."
aws dynamodb create-table \
  --table-name "$TABLE_NAME" \
  --attribute-definitions \
    AttributeName=PK,AttributeType=S \
    AttributeName=SK,AttributeType=S \
  --key-schema \
    AttributeName=PK,KeyType=HASH \
    AttributeName=SK,KeyType=RANGE \
  --billing-mode PAY_PER_REQUEST \
  --region "$REGION" \
  --no-cli-pager

echo "⏳ Waiting for table to be active..."
aws dynamodb wait table-exists --table-name "$TABLE_NAME" --region "$REGION"

echo "⚙️  Enabling Time-to-Live (TTL)..."
aws dynamodb update-time-to-live \
  --table-name "$TABLE_NAME" \
  --time-to-live-specification "Enabled=true, AttributeName=ttl" \
  --region "$REGION" \
  --no-cli-pager

echo "🔒 Enabling Point-in-Time Recovery..."
aws dynamodb update-continuous-backups \
  --table-name "$TABLE_NAME" \
  --point-in-time-recovery-specification PointInTimeRecoveryEnabled=true \
  --region "$REGION" \
  --no-cli-pager

echo ""
echo "✅ DynamoDB table created successfully!"
echo ""
echo "Table Details:"
echo "  Name: $TABLE_NAME"
echo "  Region: $REGION"
echo "  Billing: On-Demand"
echo "  TTL: Enabled (attribute: ttl)"
echo "  PITR: Enabled"
echo ""
echo "Next steps:"
echo "  1. Test the table: aws dynamodb describe-table --table-name $TABLE_NAME --region $REGION"
echo "  2. Start your Next.js app: npm run dev"
