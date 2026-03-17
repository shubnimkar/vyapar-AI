#!/bin/bash

# Manually trigger report generation Lambda for testing

set -e

REGION="ap-south-1"
LAMBDA_FUNCTION="report-generator"

echo "Manually triggering report generation..."
echo "Lambda: $LAMBDA_FUNCTION"
echo "Region: $REGION"
echo ""

# Invoke Lambda asynchronously and force processing for due users
cat > /tmp/report-generator-event.json <<EOF
{
  "forceAll": true
}
EOF

aws lambda invoke \
    --function-name "$LAMBDA_FUNCTION" \
    --invocation-type Event \
    --payload fileb:///tmp/report-generator-event.json \
    --region "$REGION" \
    /tmp/report-response.json \
    > /dev/null

echo "✓ Report generation triggered"
echo ""
echo "The Lambda is running in the background."
echo "Check CloudWatch Logs for execution details:"
echo "  aws logs tail /aws/lambda/$LAMBDA_FUNCTION --region $REGION --follow"
echo ""
echo "Reports will appear in the Reports page once processing completes."
echo ""

rm -f /tmp/report-generator-event.json
