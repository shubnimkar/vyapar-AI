# Demo Data Seeding Guide

This guide explains how to seed demo data for the Vyapar AI application.

## Quick Start

To seed ALL demo data for the `vyapar_demo` user:

```bash
bash scripts/seed-all-demo-data.sh
```

This will seed:
- 60 days of daily business entries
- 60 credit tracking (Udhaar) entries

## Individual Seeding Scripts

### 1. Seed Daily Entries Only

```bash
node scripts/seed-daily-entries.js cfca655b-410f-454c-8169-574ce37415da
```

This generates 60 days of realistic daily business data including:
- Daily sales (₹15,000 - ₹25,000 range)
- Daily expenses (₹8,000 - ₹13,000 range)
- Cash in hand
- Calculated profit margins
- Weekend sales boost (30% higher)

### 2. Seed Credit Data Only

```bash
# Generate credit data JSON
bash scripts/seed-credit-data.sh

# Seed to DynamoDB
node scripts/seed-credit-dynamodb.js cfca655b-410f-454c-8169-574ce37415da
```

This generates 60 credit entries with:
- Mix of paid (35%) and unpaid (65%) credits
- Realistic Indian business names
- Phone numbers for WhatsApp reminders
- Overdue credits for follow-up demo

## Important: User ID vs Username

**CRITICAL**: All seeding scripts MUST use the **userId**, NOT the username.

- ✅ Correct: `cfca655b-410f-454c-8169-574ce37415da` (userId)
- ❌ Wrong: `vyapar_demo` (username)

### Why This Matters

The DynamoDB schema uses:
```
PK = USER#{userId}
SK = ENTRY#{date} or CREDIT#{id}
```

If you seed with the username instead of userId, the data won't be accessible via the API.

## Verifying Seeded Data

### Check Daily Entries

```bash
aws dynamodb query \
  --table-name vyapar-ai \
  --key-condition-expression "PK = :pk AND begins_with(SK, :skPrefix)" \
  --expression-attribute-values '{":pk":{"S":"USER#cfca655b-410f-454c-8169-574ce37415da"},":skPrefix":{"S":"ENTRY#"}}' \
  --region ap-south-1 \
  --output json | jq '.Count'
```

Expected: 60

### Check Credit Entries

```bash
aws dynamodb query \
  --table-name vyapar-ai \
  --key-condition-expression "PK = :pk AND begins_with(SK, :skPrefix)" \
  --expression-attribute-values '{":pk":{"S":"USER#cfca655b-410f-454c-8169-574ce37415da"},":skPrefix":{"S":"CREDIT#"}}' \
  --region ap-south-1 \
  --output json | jq '.Count'
```

Expected: 60

### Test API Endpoints

```bash
# Test daily entries API
curl "http://localhost:3000/api/daily?userId=cfca655b-410f-454c-8169-574ce37415da" | jq '.count'

# Test credit API
curl "http://localhost:3000/api/credit?userId=cfca655b-410f-454c-8169-574ce37415da" | jq '.count'

# Test report generation
curl -X POST "http://localhost:3000/api/reports/generate" \
  -H "Content-Type: application/json" \
  -d '{"userId":"cfca655b-410f-454c-8169-574ce37415da","date":"2026-03-09"}' | jq '.success'
```

## Demo User Details

- **Username**: `vyapar_demo`
- **User ID**: `cfca655b-410f-454c-8169-574ce37415da`
- **Password**: (set during signup)

## Troubleshooting

### Data Not Appearing in Browser

1. **Check userId in browser session**:
   ```javascript
   const session = JSON.parse(localStorage.getItem('vyapar-user-session'));
   console.log('Current userId:', session?.userId);
   console.log('Expected userId:', 'cfca655b-410f-454c-8169-574ce37415da');
   ```

2. **Force sync from DynamoDB**:
   - Go to Credit Tracking page
   - Click "🔄 Force Pull" button
   - Refresh the page

3. **Clear and re-seed**:
   ```bash
   # Delete old data (if needed)
   # Then re-seed with correct userId
   bash scripts/seed-all-demo-data.sh
   ```

### AWS Credentials Issues

Make sure your `.env.local` has:
```
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_secret
AWS_SESSION_TOKEN=your_token (if using temporary credentials)
DYNAMODB_TABLE_NAME=vyapar-ai
AWS_REGION=ap-south-1
```

## Data Summary

After running `seed-all-demo-data.sh`, you'll have:

### Daily Entries (60 days)
- Total sales: ~₹12,90,000
- Total expenses: ~₹7,00,000
- Total profit: ~₹5,90,000
- Avg daily sales: ~₹21,500
- Avg daily profit: ~₹9,800

### Credit Entries (60 entries)
- Total outstanding: ~₹1,12,000
- Total overdue: ~₹67,000
- Overdue count: ~24 entries
- Paid credits: ~21 entries
- Unpaid credits: ~39 entries

## Architecture Notes

All data follows the DynamoDB single-table design:

```
PK                                          SK                      EntityType
USER#cfca655b-410f-454c-8169-574ce37415da  METADATA                USER
USER#cfca655b-410f-454c-8169-574ce37415da  ENTRY#2026-03-09        ENTRY
USER#cfca655b-410f-454c-8169-574ce37415da  CREDIT#credit_123       CREDIT
PROFILE#cfca655b-410f-454c-8169-574ce37415da METADATA              PROFILE
```

This ensures efficient queries and follows AWS best practices for DynamoDB.
