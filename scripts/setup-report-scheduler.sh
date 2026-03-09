#!/bin/bash

# Setup EventBridge scheduler for automated daily reports
# Triggers report-generator Lambda every day at 11:59 PM IST

set -e

REGION="ap-south-1"
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
LAMBDA_FUNCTION="report-generator"
RULE_NAME="vyapar-ai-daily-reports"

echo "Setting up EventBridge scheduler for daily reports..."
echo "Region: $REGION"
echo "Account: $ACCOUNT_ID"
echo ""

# Create EventBridge rule (runs daily at 11:59 PM IST = 6:29 PM UTC)
echo "Creating EventBridge rule..."
aws events put-rule \
    --name "$RULE_NAME" \
    --description "Trigger daily report generation for Vyapar AI users" \
    --schedule-expression "cron(29 18 * * ? *)" \
    --state ENABLED \
    --region "$REGION" \
    > /dev/null

echo "✓ EventBridge rule created"

# Add permission for EventBridge to invoke Lambda
echo "Adding Lambda permission for EventBridge..."
aws lambda add-permission \
    --function-name "$LAMBDA_FUNCTION" \
    --statement-id "EventBridgeDailyReports" \
    --action "lambda:InvokeFunction" \
    --principal events.amazonaws.com \
    --source-arn "arn:aws:events:${REGION}:${ACCOUNT_ID}:rule/${RULE_NAME}" \
    --region "$REGION" \
    > /dev/null 2>&1 || echo "✓ Permission already exists"

# Add Lambda as target for the rule
echo "Configuring EventBridge target..."
aws events put-targets \
    --rule "$RULE_NAME" \
    --targets "Id=1,Arn=arn:aws:lambda:${REGION}:${ACCOUNT_ID}:function:${LAMBDA_FUNCTION}" \
    --region "$REGION" \
    > /dev/null

echo "✓ EventBridge target configured"
echo ""
echo "========================================="
echo "✓ Daily report scheduler configured!"
echo "========================================="
echo ""
echo "Schedule: Every day at 11:59 PM IST"
echo "Lambda: $LAMBDA_FUNCTION"
echo "Rule: $RULE_NAME"
echo ""
echo "To manually trigger a report now, run:"
echo "  ./scripts/trigger-report-generation.sh"
echo ""
