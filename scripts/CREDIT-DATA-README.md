# Credit Tracking (Udhaar) Demo Data Seeder

This script generates 60 days of realistic credit tracking data and seeds it directly into DynamoDB for demo purposes.

## What It Creates

- **60 credit entries** spanning the last 60 days
- **15 unique customers** with realistic Indian business names
- **31 paid credits** (showing payment history)
- **29 unpaid credits** (including 12 overdue)
- **Phone numbers** for WhatsApp reminder testing
- **Reminder timestamps** for some overdue credits

## Usage

### Quick Start (DynamoDB Seeding - Recommended)

```bash
# Generate and seed data to DynamoDB
bash scripts/seed-credit-data.sh

# When prompted, press 'y' to seed to DynamoDB
```

This will:
1. Generate 60 days of credit data
2. Save to `/tmp/credit-data.json`
3. Seed directly to DynamoDB table `vyapar-ai`
4. Use AWS credentials from `.env.local`

### Manual DynamoDB Seeding

```bash
# Generate data first
bash scripts/seed-credit-data.sh

# When prompted, press 'n' to skip auto-seeding

# Seed manually later with custom user ID
node scripts/seed-credit-dynamodb.js "your-user-id"
```

### Legacy Browser localStorage Method

For offline testing or when DynamoDB is not available:

```bash
# Generate data
bash scripts/seed-credit-data.sh

# Load into browser
node scripts/load-credit-data.js
# Copy the command shown and paste into browser console
```

## AWS Configuration

The DynamoDB seeder requires these environment variables in `.env.local`:

```env
AWS_REGION=ap-south-1
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
DYNAMODB_TABLE_NAME=vyapar-ai
```

## Data Characteristics

### Customer Distribution
- Ramesh Kirana Store
- Suresh Medical
- Mahesh Traders
- Rajesh Electronics
- Dinesh Textiles
- Ganesh Hardware
- Prakash Stationery
- Vijay Provisions
- Anil General Store
- Sanjay Bakery
- Ravi Tea Stall
- Mohan Restaurant
- Ashok Salon
- Deepak Pharmacy
- Rakesh Sweets

### Credit Amounts
- Range: ₹500 - ₹5000
- Randomly distributed

### Payment Status
- **Old credits (30+ days)**: 70% paid
- **Medium age (15-30 days)**: 50% paid
- **Recent credits (<15 days)**: Mostly unpaid

### Due Dates
- 7-30 days after credit given date
- Realistic payment delays (1-5 days after due)

### Reminders
- 60% of overdue credits have reminder timestamps
- Shows last 1-5 days

## Demo Scenarios

This data enables testing:

1. **Follow-Up Panel**: Shows overdue credits sorted by urgency
2. **WhatsApp Reminders**: All customers have phone numbers
3. **Payment Tracking**: Mix of paid/unpaid shows history
4. **Credit Analytics**: 60 days of data for trends
5. **Health Score Impact**: Outstanding credit affects business health

## Files Generated

- `/tmp/credit-data.json` - Raw JSON data (temporary)
- `scripts/seed-credit-dynamodb.js` - DynamoDB seeder script
- `scripts/load-credit-data.js` - Node.js loader script (legacy)

## DynamoDB Schema

Credit entries are stored with:
- **PK**: `USER#{userId}`
- **SK**: `CREDIT#{creditId}`
- **TTL**: 30 days after paid (auto-cleanup)

Each entry structure:
```json
{
  "userId": "demo-user-001",
  "id": "credit_1234567890_abc123",
  "customerName": "Ramesh Kirana Store",
  "phoneNumber": "919876543210",
  "amount": 2500,
  "dateGiven": "2024-01-15T10:30:00.000Z",
  "dueDate": "2024-01-29T10:30:00.000Z",
  "isPaid": false,
  "paidDate": null,
  "lastReminderAt": "2024-01-30T08:00:00.000Z",
  "createdAt": "2024-01-15T10:30:00.000Z",
  "updatedAt": "2024-01-15T10:30:00.000Z"
}
```

## Troubleshooting

### DynamoDB seeding fails?

1. Check AWS credentials in `.env.local`
2. Verify DynamoDB table exists: `vyapar-ai`
3. Check AWS region is correct: `ap-south-1`
4. Verify IAM permissions for DynamoDB PutItem

### Data not showing up in app?

1. Verify userId matches your logged-in user
2. Check browser console for API errors
3. Try refreshing the page
4. Check DynamoDB table directly in AWS Console

### Want to reset data?

Use AWS CLI to query and delete:
```bash
aws dynamodb query \
  --table-name vyapar-ai \
  --key-condition-expression "PK = :pk AND begins_with(SK, :sk)" \
  --expression-attribute-values '{":pk":{"S":"USER#demo-user-001"},":sk":{"S":"CREDIT#"}}'
```

Then re-run the seed script.

## Cleanup

### DynamoDB
Data will auto-expire via TTL (30 days after paid), or manually delete via AWS Console.

### localStorage (legacy)
```javascript
// In browser console
localStorage.removeItem('vyapar-credit-entries');
location.reload();
```

## Customization

Edit `scripts/seed-credit-data.sh` to modify:
- Number of days (default: 60)
- Customer names
- Amount ranges
- Payment probability
- Due date ranges

## Integration with Demo

This data works seamlessly with:
- Daily Health Coach (credit ratio warnings)
- Udhaar Follow-Up Helper (overdue tracking)
- Stress Index (credit burden calculation)
- Dashboard analytics

## Notes

- Data is seeded directly to DynamoDB (cloud-first)
- Dates are in ISO 8601 format (UTC)
- Phone numbers use Indian format (+91)
- TTL automatically cleans up paid credits after 30 days
- Default user ID: `demo-user-001`

