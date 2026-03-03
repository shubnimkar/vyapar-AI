#!/bin/bash

# Deploy updated Lambda function code
# This script packages and deploys the receipt-ocr-processor with updated Bedrock configuration

set -e

echo "📦 Deploying Lambda function code..."

FUNCTION_NAME="receipt-ocr-processor"
REGION="ap-south-1"
LAMBDA_DIR="lambda/receipt-ocr-processor"

cd "$LAMBDA_DIR"

echo "📥 Installing dependencies..."
npm install --production

echo "📦 Creating deployment package..."
zip -r function.zip index.mjs node_modules/ > /dev/null

echo "🚀 Deploying to AWS Lambda..."
aws lambda update-function-code \
  --function-name "$FUNCTION_NAME" \
  --region "$REGION" \
  --zip-file fileb://function.zip \
  --no-cli-pager

echo "🧹 Cleaning up..."
rm function.zip

echo "✅ Deployment complete!"
echo ""
echo "⏳ Wait 30 seconds for the function to be ready, then test by uploading a receipt."
