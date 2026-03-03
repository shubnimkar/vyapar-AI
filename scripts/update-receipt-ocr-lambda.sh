#!/bin/bash

# Update Receipt OCR Lambda Function
# This script packages and deploys the updated Lambda function

set -e

echo "🚀 Updating Receipt OCR Lambda Function..."

# Configuration
FUNCTION_NAME="receipt-ocr-processor"
LAMBDA_DIR="lambda/receipt-ocr-processor"
ZIP_FILE="receipt-ocr-processor.zip"

# Check if Lambda directory exists
if [ ! -d "$LAMBDA_DIR" ]; then
  echo "❌ Error: Lambda directory not found: $LAMBDA_DIR"
  exit 1
fi

# Navigate to Lambda directory
cd "$LAMBDA_DIR"

# Create deployment package
echo "📦 Creating deployment package..."
zip -r "$ZIP_FILE" index.mjs

# Upload to Lambda
echo "☁️  Uploading to AWS Lambda..."
aws lambda update-function-code \
  --function-name "$FUNCTION_NAME" \
  --zip-file "fileb://$ZIP_FILE" \
  --region ap-south-1

# Clean up
rm "$ZIP_FILE"

echo "✅ Lambda function updated successfully!"
echo ""
echo "📊 Testing the function..."
echo "Upload a receipt image to test: https://s3.console.aws.amazon.com/s3/buckets/vyapar-receipts-input"
