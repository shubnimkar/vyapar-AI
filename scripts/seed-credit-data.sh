#!/bin/bash

# Seed 60 days of Credit Tracking (Udhaar) data for demo
# This script creates realistic credit entries showing various scenarios:
# - Some paid credits (to show history)
# - Some overdue credits (to trigger follow-up panel)
# - Some upcoming credits (not yet due)
# - Varied amounts and customer names

set -e

echo "🌱 Seeding 60 days of Credit Tracking (Udhaar) data..."

# Configuration
USER_ID="${1:-demo-user-001}"
STORAGE_KEY="vyapar-credit-entries"

# Customer names (realistic Indian shop customers)
CUSTOMERS=(
  "Ramesh Kirana Store"
  "Suresh Medical"
  "Mahesh Traders"
  "Rajesh Electronics"
  "Dinesh Textiles"
  "Ganesh Hardware"
  "Prakash Stationery"
  "Vijay Provisions"
  "Anil General Store"
  "Sanjay Bakery"
  "Ravi Tea Stall"
  "Mohan Restaurant"
  "Ashok Salon"
  "Deepak Pharmacy"
  "Rakesh Sweets"
)

# Phone numbers (for WhatsApp reminders)
PHONES=(
  "919876543210"
  "919876543211"
  "919876543212"
  "919876543213"
  "919876543214"
  "919876543215"
  "919876543216"
  "919876543217"
  "919876543218"
  "919876543219"
  "919876543220"
  "919876543221"
  "919876543222"
  "919876543223"
  "919876543224"
)

# Generate credit entries
ENTRIES="["

# Current date
CURRENT_DATE=$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")
CURRENT_TIMESTAMP=$(date +%s)

# Generate 60 days of credit data
for i in $(seq 0 59); do
  # Calculate date (going back from today)
  DAYS_AGO=$((60 - i))
  DATE_GIVEN_TS=$((CURRENT_TIMESTAMP - DAYS_AGO * 86400))
  DATE_GIVEN=$(date -u -r $DATE_GIVEN_TS +"%Y-%m-%dT%H:%M:%S.000Z")
  DATE_GIVEN_SHORT=$(date -u -r $DATE_GIVEN_TS +"%Y-%m-%d")
  
  # Random customer
  CUSTOMER_IDX=$((RANDOM % ${#CUSTOMERS[@]}))
  CUSTOMER="${CUSTOMERS[$CUSTOMER_IDX]}"
  PHONE="${PHONES[$CUSTOMER_IDX]}"
  
  # Random amount between 500 and 5000
  AMOUNT=$((500 + RANDOM % 4500))
  
  # Due date: 7-30 days after date given
  DUE_DAYS=$((7 + RANDOM % 24))
  DUE_DATE_TS=$((DATE_GIVEN_TS + DUE_DAYS * 86400))
  DUE_DATE=$(date -u -r $DUE_DATE_TS +"%Y-%m-%dT%H:%M:%S.000Z")
  DUE_DATE_SHORT=$(date -u -r $DUE_DATE_TS +"%Y-%m-%d")
  
  # Determine if paid (70% of old credits are paid, 30% are overdue)
  IS_PAID="false"
  PAID_DATE=""
  
  if [ $DAYS_AGO -gt 30 ]; then
    # Older credits: 70% paid
    if [ $((RANDOM % 10)) -lt 7 ]; then
      IS_PAID="true"
      # Paid 1-5 days after due date
      PAID_DAYS=$((1 + RANDOM % 5))
      PAID_DATE_TS=$((DUE_DATE_TS + PAID_DAYS * 86400))
      PAID_DATE=$(date -u -r $PAID_DATE_TS +"%Y-%m-%dT%H:%M:%S.000Z")
    fi
  elif [ $DAYS_AGO -gt 15 ]; then
    # Medium age: 50% paid
    if [ $((RANDOM % 10)) -lt 5 ]; then
      IS_PAID="true"
      PAID_DAYS=$((1 + RANDOM % 5))
      PAID_DATE_TS=$((DUE_DATE_TS + PAID_DAYS * 86400))
      PAID_DATE=$(date -u -r $PAID_DATE_TS +"%Y-%m-%dT%H:%M:%S.000Z")
    fi
  fi
  # Recent credits: mostly unpaid (realistic)
  
  # Last reminder (for some overdue credits)
  LAST_REMINDER=""
  if [ "$IS_PAID" = "false" ] && [ $DUE_DATE_TS -lt $CURRENT_TIMESTAMP ]; then
    # Overdue credit - maybe has reminder
    if [ $((RANDOM % 10)) -lt 6 ]; then
      # 60% have reminders
      REMINDER_DAYS_AGO=$((1 + RANDOM % 5))
      REMINDER_TS=$((CURRENT_TIMESTAMP - REMINDER_DAYS_AGO * 86400))
      LAST_REMINDER=$(date -u -r $REMINDER_TS +"%Y-%m-%dT%H:%M:%S.000Z")
    fi
  fi
  
  # Generate entry ID
  ENTRY_ID="credit_${DATE_GIVEN_TS}_$(openssl rand -hex 4)"
  
  # Build JSON entry
  ENTRY="{"
  ENTRY="$ENTRY\"id\":\"$ENTRY_ID\","
  ENTRY="$ENTRY\"customerName\":\"$CUSTOMER\","
  ENTRY="$ENTRY\"phoneNumber\":\"$PHONE\","
  ENTRY="$ENTRY\"amount\":$AMOUNT,"
  ENTRY="$ENTRY\"dateGiven\":\"$DATE_GIVEN\","
  ENTRY="$ENTRY\"dueDate\":\"$DUE_DATE\","
  ENTRY="$ENTRY\"isPaid\":$IS_PAID,"
  
  if [ -n "$PAID_DATE" ]; then
    ENTRY="$ENTRY\"paidDate\":\"$PAID_DATE\","
    ENTRY="$ENTRY\"paidAt\":\"$PAID_DATE\","
  fi
  
  if [ -n "$LAST_REMINDER" ]; then
    ENTRY="$ENTRY\"lastReminderAt\":\"$LAST_REMINDER\","
  fi
  
  ENTRY="$ENTRY\"createdAt\":\"$DATE_GIVEN\","
  ENTRY="$ENTRY\"updatedAt\":\"$DATE_GIVEN\","
  ENTRY="$ENTRY\"syncStatus\":\"synced\""
  ENTRY="$ENTRY}"
  
  # Add to entries array
  if [ $i -gt 0 ]; then
    ENTRIES="$ENTRIES,"
  fi
  ENTRIES="$ENTRIES$ENTRY"
  
  # Progress indicator
  if [ $((i % 10)) -eq 0 ]; then
    echo "  Generated $i/60 entries..."
  fi
done

ENTRIES="$ENTRIES]"

echo "✅ Generated 60 credit entries"

# Save to localStorage using Node.js
echo "💾 Saving to localStorage simulation..."

# Create a temporary Node.js script to format and display the data
cat > /tmp/credit-data.json << EOF
$ENTRIES
EOF

echo "📊 Credit Data Summary:"
echo "  Total entries: 60"
echo "  Date range: Last 60 days"
echo "  Customers: ${#CUSTOMERS[@]} unique customers"

# Count paid vs unpaid
PAID_COUNT=$(echo "$ENTRIES" | grep -o '"isPaid":true' | wc -l | tr -d ' ')
UNPAID_COUNT=$(echo "$ENTRIES" | grep -o '"isPaid":false' | wc -l | tr -d ' ')

echo "  Paid credits: $PAID_COUNT"
echo "  Unpaid credits: $UNPAID_COUNT"

# Count overdue (due date < current date and not paid)
echo ""
echo "📋 To load this data into your app:"
echo "  1. Open your browser console on the Vyapar AI app"
echo "  2. Run: localStorage.setItem('$STORAGE_KEY', JSON.stringify($(cat /tmp/credit-data.json)))"
echo "  3. Refresh the page"
echo ""
echo "Or use the Node.js loader script:"
echo "  node scripts/load-credit-data.js"

# Create Node.js loader script
cat > scripts/load-credit-data.js << 'NODESCRIPT'
#!/usr/bin/env node

// Load credit data into localStorage
const fs = require('fs');
const path = require('path');

const dataPath = '/tmp/credit-data.json';
const storageKey = 'vyapar-credit-entries';

if (!fs.existsSync(dataPath)) {
  console.error('❌ Credit data file not found. Run seed-credit-data.sh first.');
  process.exit(1);
}

const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

console.log('📊 Credit Data Loaded:');
console.log(`  Total entries: ${data.length}`);

const paid = data.filter(e => e.isPaid).length;
const unpaid = data.filter(e => !e.isPaid).length;

console.log(`  Paid: ${paid}`);
console.log(`  Unpaid: ${unpaid}`);

// Calculate overdue
const now = new Date();
const overdue = data.filter(e => !e.isPaid && new Date(e.dueDate) < now).length;
console.log(`  Overdue: ${overdue}`);

console.log('');
console.log('✅ Data ready to load');
console.log('');
console.log('To load into browser:');
console.log(`  localStorage.setItem('${storageKey}', JSON.stringify(${JSON.stringify(data)}))`);
console.log('');
console.log('Or copy this command:');
console.log(`  localStorage.setItem('${storageKey}', '${JSON.stringify(data).replace(/'/g, "\\'")}'); location.reload();`);

NODESCRIPT

chmod +x scripts/load-credit-data.js

echo "✅ Credit data generated!"
echo ""

# Ask user if they want to seed to DynamoDB
read -p "📤 Seed data to DynamoDB now? (y/n) " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
  echo "🚀 Seeding to DynamoDB..."
  node scripts/seed-credit-dynamodb.js "$USER_ID"
else
  echo ""
  echo "🚀 To seed later, run:"
  echo "  node scripts/seed-credit-dynamodb.js $USER_ID"
  echo ""
  echo "Or load into browser localStorage:"
  echo "  1. Open browser console on Vyapar AI"
  echo "  2. Run: node scripts/load-credit-data.js"
  echo "  3. Copy and paste the command shown"
fi
