# Quick Start Guide - Vyapar AI

## 🚀 Get Started in 5 Minutes

### Step 1: Install Dependencies
```bash
npm install
```

### Step 2: Configure AWS Credentials

**Option A: Use Environment Variables (Recommended for Development)**
```bash
cp .env.local.example .env.local
```

Edit `.env.local` and add your AWS credentials:
```env
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=AKIAXXXXXXXXXXXXXXXX
AWS_SECRET_ACCESS_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
BEDROCK_MODEL_ID=anthropic.claude-3-sonnet-20240229-v1:0
```

**Option B: Use AWS CLI Credentials**
If you have AWS CLI configured, the app will use those credentials automatically.

### Step 3: Start Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Step 4: Test with Sample Data

Use the sample CSV files in the `sample-data/` folder:
- `sales.csv` - Sample sales transactions
- `expenses.csv` - Sample business expenses
- `inventory.csv` - Sample inventory data

### Step 5: Try the Features

1. **Select Language**: Choose English, हिंदी, or मराठी
2. **Upload Files**: Upload the sample CSV files
3. **Analyze**: Click "Analyze My Business"
4. **Ask Questions**: Try asking:
   - "Which product is most profitable?"
   - "How much cash is blocked in inventory?"
   - "What are my biggest expenses?"

## 🔧 Troubleshooting

### AWS Bedrock Access Denied
- Ensure your AWS account has Bedrock access enabled
- Check IAM permissions include `bedrock:InvokeModel`
- Verify Claude 3 Sonnet is available in your region

### CSV Upload Fails
- Check CSV has correct column names (case-sensitive)
- Ensure file is valid CSV format
- Verify no special characters in data

### Build Errors
- Run `npm install` again
- Clear `.next` folder: `rm -rf .next`
- Check Node.js version: `node --version` (18+ required)

## 📝 CSV Format Requirements

### Sales CSV
Required columns: `date`, `product`, `quantity`, `amount`

### Expenses CSV
Required columns: `date`, `category`, `amount`, `description`

### Inventory CSV
Required columns: `product`, `quantity`, `cost_price`, `selling_price`

## 🎯 Next Steps

- Customize translations in `lib/translations.ts`
- Adjust AI prompts in `lib/prompts.ts`
- Add more insight categories in `app/api/analyze/route.ts`
- Deploy to Vercel for production use

## 💡 Tips

- Upload at least one CSV file to enable analysis
- More data = better AI insights
- Language preference is saved in browser
- Data is cleared when you close the browser
- Voice synthesis works best in Chrome/Edge

## 🆘 Need Help?

Check the main README.md for detailed documentation or open an issue on GitHub.
