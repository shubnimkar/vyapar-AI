#!/bin/bash

# Update Lambda Environment Variables for Bedrock Configuration
# This script updates all Lambda functions to use us-east-1 for Bedrock

set -e

echo "🔧 Updating Lambda function configurations..."

# Configuration
BEDROCK_REGION="us-east-1"
BEDROCK_MODEL_ID="global.amazon.nova-2-lite-v1:0"
S3_REGION="ap-south-1"

# Lambda functions to update
FUNCTIONS=(
  "receipt-ocr-processor"
  "cashflow-predictor"
  "expense-alert"
  "report-generator"
  "voice-processor"
)

for FUNCTION_NAME in "${FUNCTIONS[@]}"; do
  echo ""
  echo "📦 Updating $FUNCTION_NAME..."
  
  # Check if function exists
  if ! aws lambda get-function --function-name "$FUNCTION_NAME" --region "$S3_REGION" &>/dev/null; then
    echo "⚠️  Function $FUNCTION_NAME not found, skipping..."
    continue
  fi
  
  # Update environment variables
  aws lambda update-function-configuration \
    --function-name "$FUNCTION_NAME" \
    --region "$S3_REGION" \
    --environment "Variables={
      BEDROCK_REGION=$BEDROCK_REGION,
      BEDROCK_MODEL_ID=$BEDROCK_MODEL_ID,
      RESULTS_BUCKET=vyapar-ai-voice-975678946412
    }" \
    --no-cli-pager
  
  echo "✅ $FUNCTION_NAME updated successfully"
done

echo ""
echo "🎉 All Lambda functions updated!"
echo ""
echo "Configuration applied:"
echo "  - S3 Region: $S3_REGION"
echo "  - Bedrock Region: $BEDROCK_REGION"
echo "  - Model ID: $BEDROCK_MODEL_ID"
echo ""
echo "⏳ Wait 30 seconds for changes to propagate before testing..."
