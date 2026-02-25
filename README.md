# Vyapar AI - Business Health Assistant

An AI-powered business health assistant for small shop owners in India. Analyzes sales, expenses, and inventory data to provide actionable insights in Hindi, Marathi, or English.

## Features

- 📊 **CSV Data Upload**: Upload sales, expenses, and inventory data
- 🤖 **AI Analysis**: AWS Bedrock-powered insights about true profit, loss-making products, blocked inventory cash, and cashflow forecasts
- 🌐 **Multi-Language Support**: English, Hindi (हिंदी), and Marathi (मराठी)
- 💬 **Q&A Chat**: Ask questions about your business data
- 🔊 **Voice Synthesis**: Listen to insights in your language (optional)
- 📱 **Mobile-Responsive**: Works on all devices
- 🔒 **Privacy-First**: No data persistence - everything stays in memory

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **AI**: AWS Bedrock (Claude 3 Sonnet)
- **CSV Parsing**: PapaParse
- **Voice**: Web Speech API

## Setup Instructions

### Prerequisites

- Node.js 18+ (Note: Node.js 20+ recommended for AWS SDK v3)
- AWS Account with Bedrock access
- AWS credentials with Bedrock permissions

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd vyapar-ai
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure AWS Credentials**
   
   Copy `.env.local.example` to `.env.local`:
   ```bash
   cp .env.local.example .env.local
   ```
   
   Edit `.env.local` and add your AWS credentials:
   ```env
   AWS_REGION=us-east-1
   AWS_ACCESS_KEY_ID=your-access-key-here
   AWS_SECRET_ACCESS_KEY=your-secret-key-here
   BEDROCK_MODEL_ID=anthropic.claude-3-sonnet-20240229-v1:0
   ```

4. **Run the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   
   Navigate to [http://localhost:3000](http://localhost:3000)

## Usage

### 1. Select Language
Choose your preferred language (English, हिंदी, or मराठी) from the top-right corner.

### 2. Upload CSV Files
Upload one or more CSV files:

- **Sales Data**: Columns: `date`, `product`, `quantity`, `amount`
- **Expenses Data**: Columns: `date`, `category`, `amount`, `description`
- **Inventory Data**: Columns: `product`, `quantity`, `cost_price`, `selling_price`

### 3. Analyze Business
Click "Analyze My Business" to get AI-powered insights about:
- True profit vs cash flow
- Loss-making products
- Blocked inventory cash
- Abnormal expenses
- 7-day cashflow forecast

### 4. Ask Questions
Use the Q&A section to ask specific questions about your business data.

## CSV Format Examples

### Sales Data (sales.csv)
```csv
date,product,quantity,amount
2024-01-01,Product A,10,5000
2024-01-02,Product B,5,2500
```

### Expenses Data (expenses.csv)
```csv
date,category,amount,description
2024-01-01,rent,10000,Monthly rent
2024-01-02,utilities,2000,Electricity bill
```

### Inventory Data (inventory.csv)
```csv
product,quantity,cost_price,selling_price
Product A,50,400,500
Product B,30,450,550
```

## Architecture

- **Frontend**: React components with client-side state management
- **API Routes**: Next.js API routes for upload, analysis, and Q&A
- **Session Store**: In-memory Map for temporary data storage
- **AI Integration**: AWS Bedrock with Claude 3 Sonnet model
- **No Database**: All data lives in memory during the session

## Development

### Build for Production
```bash
npm run build
```

### Start Production Server
```bash
npm start
```

### Type Checking
```bash
npx tsc --noEmit
```

## Deployment

### Vercel (Recommended)
1. Push code to GitHub
2. Import project in Vercel
3. Add environment variables in Vercel dashboard
4. Deploy

### Environment Variables for Production
- `AWS_REGION`
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `BEDROCK_MODEL_ID`

## Security Notes

- AWS credentials are only used server-side (API routes)
- No data is persisted to disk or database
- Sessions expire after 2 hours of inactivity
- All data is cleared when the browser is closed

## Limitations

- Session-based only (no user accounts)
- Data is temporary (not saved)
- Requires AWS Bedrock access
- AI analysis quality depends on data quality
- Voice synthesis availability varies by browser

## Troubleshooting

### AWS Bedrock Errors
- Ensure your AWS credentials have Bedrock permissions
- Check that Claude 3 Sonnet is available in your region
- Verify the model ID is correct

### CSV Upload Errors
- Ensure CSV has the required columns
- Check that the file is valid CSV format
- Verify data types are correct

### Voice Synthesis Not Working
- Voice synthesis requires HTTPS in production
- Not all browsers support all languages
- Check browser compatibility

## License

MIT

## Support

For issues and questions, please open an issue on GitHub.

---

Built for the AI for Retail, Commerce & Market Intelligence track.
