#!/bin/bash

# Seed All Demo Data for vyapar_demo User
# This script seeds both daily entries and credit data with the correct userId

set -e

USER_ID="cfca655b-410f-454c-8169-574ce37415da"
USERNAME="vyapar_demo"

echo "🌱 Seeding ALL demo data for user: $USERNAME"
echo "   User ID: $USER_ID"
echo ""

# Step 1: Seed Daily Entries (60 days)
echo "📅 Step 1: Generating 60 days of daily entries..."
node scripts/seed-daily-entries.js "$USER_ID"

# Step 2: Seed Credit Data (60 entries)
echo ""
echo "💳 Step 2: Generating credit tracking data..."
bash scripts/seed-credit-data.sh
node scripts/seed-credit-dynamodb.js "$USER_ID"

echo ""
echo "✅ All demo data seeded successfully!"
echo ""
echo "📊 Summary:"
echo "   - 60 days of daily business entries"
echo "   - 60 credit tracking entries (Udhaar)"
echo "   - All data linked to userId: $USER_ID"
echo ""
echo "🚀 Ready for demo!"
