#!/bin/bash

# Quick script to seed credit data for any user
# Usage: bash scripts/seed-for-current-user.sh [userId]

set -e

USER_ID="${1}"

if [ -z "$USER_ID" ]; then
  echo "❌ Error: Please provide a userId"
  echo ""
  echo "Usage:"
  echo "  bash scripts/seed-for-current-user.sh YOUR_USER_ID"
  echo ""
  echo "Example:"
  echo "  bash scripts/seed-for-current-user.sh demo-user-001"
  exit 1
fi

echo "🌱 Seeding credit data for user: $USER_ID"
echo ""

# Check if data file exists
if [ ! -f "/tmp/credit-data.json" ]; then
  echo "📝 Generating credit data first..."
  bash scripts/seed-credit-data.sh "$USER_ID" <<< "n"
  echo ""
fi

# Seed to DynamoDB
echo "📤 Seeding to DynamoDB..."
node scripts/seed-credit-dynamodb.js "$USER_ID"

echo ""
echo "✅ Done! Credit data seeded for user: $USER_ID"
echo ""
echo "🔄 Next steps:"
echo "  1. Refresh your browser"
echo "  2. The app will auto-sync from DynamoDB"
echo "  3. You should see 60 credit entries"
