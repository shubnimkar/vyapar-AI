# Quick Start: Seed Credit Data for Demo

## One-Command Setup

```bash
bash scripts/seed-credit-data.sh
```

When prompted, press **`y`** to seed to DynamoDB.

That's it! 🎉

## What You Get

- 60 days of credit tracking data
- 15 unique customers
- ~12 overdue credits (perfect for demo)
- All data in DynamoDB (cloud-ready)

## Verify It Worked

1. Login to Vyapar AI with userId: `demo-user-001`
2. Go to Credit Tracking (Udhaar) section
3. See the Follow-Up Panel with overdue credits
4. Click WhatsApp reminder links to test

## Custom User ID

```bash
bash scripts/seed-credit-data.sh your-user-id
```

## Manual Seeding

```bash
# Generate data first
bash scripts/seed-credit-data.sh

# Press 'n' when prompted

# Seed later
node scripts/seed-credit-dynamodb.js your-user-id
```

## Troubleshooting

**Data not showing?**
- Check userId matches your login
- Refresh the page
- Check browser console for errors

**Seeding fails?**
- Verify AWS credentials in `.env.local`
- Check DynamoDB table exists: `vyapar-ai`
- Verify region: `ap-south-1`

## Demo Checklist

- [ ] Run seed script
- [ ] Login with `demo-user-001`
- [ ] Navigate to Credit Tracking
- [ ] Verify Follow-Up Panel shows overdue credits
- [ ] Test WhatsApp reminder link
- [ ] Check credit summary calculations
- [ ] Verify payment history

## Files

- `scripts/seed-credit-data.sh` - Main script
- `scripts/seed-credit-dynamodb.js` - DynamoDB seeder
- `scripts/CREDIT-DATA-README.md` - Full documentation
- `scripts/SEEDING-SUMMARY.md` - Implementation details

## Support

See `scripts/CREDIT-DATA-README.md` for detailed documentation.
