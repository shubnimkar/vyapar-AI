#!/bin/bash

# Seed Benchmark Data to DynamoDB
# This script populates DynamoDB with demo segment benchmark data
# for all 20 segment combinations (4 city tiers × 5 business types)

set -e

# Load environment variables
if [ -f .env.local ]; then
  export $(cat .env.local | grep -v '^#' | xargs)
fi

TABLE_NAME="${DYNAMODB_TABLE_NAME:-vyapar-ai}"
REGION="${AWS_REGION:-ap-south-1}"

echo "🌱 Starting benchmark data seeding..."
echo "Table: $TABLE_NAME"
echo "Region: $REGION"
echo ""

# Timestamp for lastUpdated
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")

# Function to seed a segment
seed_segment() {
  local TIER=$1
  local TYPE=$2
  local HEALTH=$3
  local MARGIN=$4
  local SAMPLE=$5
  
  local SEGMENT_KEY="SEGMENT#${TIER}#${TYPE}"
  
  echo "Seeding: $SEGMENT_KEY"
  
  aws dynamodb put-item \
    --table-name "$TABLE_NAME" \
    --region "$REGION" \
    --item "{
      \"PK\": {\"S\": \"$SEGMENT_KEY\"},
      \"SK\": {\"S\": \"METADATA\"},
      \"entityType\": {\"S\": \"SEGMENT\"},
      \"medianHealthScore\": {\"N\": \"$HEALTH\"},
      \"medianMargin\": {\"N\": \"$MARGIN\"},
      \"sampleSize\": {\"N\": \"$SAMPLE\"},
      \"lastUpdated\": {\"S\": \"$TIMESTAMP\"},
      \"updatedAt\": {\"S\": \"$TIMESTAMP\"}
    }" \
    --no-cli-pager > /dev/null
  
  echo "✓ Seeded $SEGMENT_KEY"
}

# Tier 1 (Metro cities) - Health scores: 60-80
echo "Seeding Tier 1 segments..."
seed_segment "tier1" "kirana" "70" "0.200" "340"
seed_segment "tier1" "salon" "70" "0.250" "340"
seed_segment "tier1" "pharmacy" "70" "0.150" "340"
seed_segment "tier1" "restaurant" "70" "0.100" "340"
seed_segment "tier1" "other" "70" "0.175" "340"

# Tier 2 (Tier-2 cities) - Health scores: 50-70
echo ""
echo "Seeding Tier 2 segments..."
seed_segment "tier2" "kirana" "60" "0.200" "220"
seed_segment "tier2" "salon" "60" "0.250" "220"
seed_segment "tier2" "pharmacy" "60" "0.150" "220"
seed_segment "tier2" "restaurant" "60" "0.100" "220"
seed_segment "tier2" "other" "60" "0.175" "220"

# Tier 3 (Small towns) - Health scores: 40-60
echo ""
echo "Seeding Tier 3 segments..."
seed_segment "tier3" "kirana" "50" "0.200" "110"
seed_segment "tier3" "salon" "50" "0.250" "110"
seed_segment "tier3" "pharmacy" "50" "0.150" "110"
seed_segment "tier3" "restaurant" "50" "0.100" "110"
seed_segment "tier3" "other" "50" "0.175" "110"

# Rural (Village/rural markets) - Health scores: 35-55
echo ""
echo "Seeding Rural segments..."
seed_segment "rural" "kirana" "45" "0.200" "70"
seed_segment "rural" "salon" "45" "0.250" "70"
seed_segment "rural" "pharmacy" "45" "0.150" "70"
seed_segment "rural" "restaurant" "45" "0.100" "70"
seed_segment "rural" "other" "45" "0.175" "70"

echo ""
echo "✅ Benchmark data seeded successfully!"
echo ""
echo "You can now:"
echo "  1. Complete your profile (city tier + business type)"
echo "  2. Add daily entries"
echo "  3. View benchmark comparison on dashboard"
echo ""
