# CSV Demo Data for Advanced Analysis

This directory contains comprehensive demo CSV files that showcase the full power of Vyapar AI's Advanced Analysis feature.

## Coverage

The demo CSV set now includes:

- **5 business types**: kirana, salon, pharmacy, restaurant, other
- **4 city tiers**: tier1, tier2, tier3, rural
- **3 file types per combination**: sales, expenses, inventory

That gives a total of **60 business/tier-specific demo CSV files**, plus the generic
`sample-sales.csv`, `sample-expenses.csv`, and `sample-inventory.csv` starter files.

## Files

### 1. sample-sales.csv
**90 days of sales transactions** (Jan 1 - Mar 9, 2024)

- **Pattern**: 2 transactions per day
  - Walk-in customers (smaller transactions: ₹2,800-5,300)
  - Regular customers (larger transactions: ₹4,000-7,500)
- **Weekend boost**: 20% higher sales on Saturdays and Sundays
- **Total transactions**: 180
- **Average daily sales**: ₹8,500
- **Total 90-day sales**: ~₹765,000

**Customer rotation**: 7 regular customers (Ramesh Stores, Suresh Traders, Mahesh Shop, Lakshmi Store, Ganesh Traders, Priya Enterprises, Vijay Mart)

### 2. sample-expenses.csv
**90 days of business expenses** (Jan 1 - Mar 9, 2024)

**Fixed Expenses**:
- Rent: ₹15,000/month (1st of each month)
- Electricity: ₹1,200-1,500/month (1st of month)
- Water: ₹600-700/month (15th of month)

**Variable Expenses**:
- Inventory purchases: ₹3,200-4,400 (3-4 times/week)
- Staff wages: ₹500/week (every Wednesday)
- Transport: ₹350-450 (2-3 times/week)
- Packaging supplies: ₹380-480 (twice/week)
- Maintenance: ₹800-1,800 (every 15-20 days)

- **Total transactions**: ~250
- **Average daily expenses**: ₹4,500
- **Total 90-day expenses**: ~₹405,000

### 3. sample-inventory.csv
**Bulk inventory purchases** (Jan 1 - Mar 9, 2024)

**Items tracked**:
- Rice 25kg: ₹1,250
- Wheat Flour 25kg: ₹875
- Sugar 25kg: ₹950
- Cooking Oil 15L: ₹1,650
- Tea Powder 5kg: ₹700
- Pulses 10kg: ₹800
- Spices Assorted: ₹600

**Purchase pattern**: Every 5 days, 2-3 items purchased in bulk

- **Total transactions**: ~60
- **Total inventory investment**: ~₹60,000

## Expected AI Insights

When this data is uploaded and analyzed, the AI should provide insights like:

### 1. Profit Analysis
- **Profit margin**: ~47% (excellent for kirana stores)
- **Total 90-day profit**: ~₹360,000
- **Average daily profit**: ₹4,000
- **Trend**: Stable with weekend peaks

### 2. Sales Patterns
- **Weekend boost**: Consistent 20% increase on Sat/Sun
- **Customer loyalty**: 7 regular customers provide 60% of revenue
- **Walk-in traffic**: Steady base of ₹3,000-4,000/day

### 3. Expense Optimization
- **Fixed costs**: ₹15,000 rent + ₹2,000 utilities = ₹17,000/month
- **Variable costs**: Inventory purchases dominate (70% of expenses)
- **Opportunity**: Consolidate transport deliveries to reduce costs
- **Opportunity**: Negotiate bulk discounts with wholesale suppliers

### 4. Cash Flow
- **Daily positive flow**: ₹4,000 average
- **Monthly dip**: 1st of month (rent payment)
- **Volatility**: Inventory purchases create predictable spikes
- **Buffer**: Strong cash position maintained

### 5. Inventory Management
- **Turnover**: Good rotation of staple items
- **Bulk buying**: Effective use of wholesale pricing
- **Opportunity**: Optimize reorder frequency (currently every 5 days)

### 6. Health Score
- **Expected score**: 75-85 (Good to Excellent)
- **Margin score**: 30/30 (excellent)
- **Expense control**: 25/30 (good)
- **Cash buffer**: 18/20 (strong)
- **Credit management**: 15/20 (moderate)

### 7. Recommendations
The AI should suggest:
1. **Leverage weekend traffic**: Run promotions on Fri-Sun
2. **Optimize transport**: Consolidate deliveries to 2x/week
3. **Bulk purchasing**: Negotiate better rates with suppliers
4. **Customer retention**: Loyalty program for regular customers
5. **Expense monitoring**: Track utility costs (slight increase trend)
6. **Inventory optimization**: Consider 7-day reorder cycle
7. **Cash flow planning**: Build buffer for rent payment days

## Usage

### Option 1: Try Sample Data Button
Click the "Try Sample Data" button in the CSV Upload component. This will automatically load the
matching sales, expenses, and inventory files for the selected business type and city tier,
including `rural` profiles.

### Option 2: Manual Upload
1. Download the CSV files from this directory
2. Upload them one by one using the CSV Upload interface
3. Or drag and drop all three files at once

### Option 3: Direct API Call
```bash
# Upload sales data
curl -X POST http://localhost:3000/api/csv-upload \
  -F "file=@public/demo-data/sample-sales.csv"

# Upload expenses data
curl -X POST http://localhost:3000/api/csv-upload \
  -F "file=@public/demo-data/sample-expenses.csv"

# Upload inventory data
curl -X POST http://localhost:3000/api/csv-upload \
  -F "file=@public/demo-data/sample-inventory.csv"
```

## Data Quality

This demo data is designed to be:
- **Realistic**: Based on actual kirana store patterns
- **Comprehensive**: 90 days provides sufficient history for trends
- **Varied**: Multiple transaction types and patterns
- **Insightful**: Reveals optimization opportunities
- **Demo-ready**: Shows the full power of AI analysis

## Business Context

This data represents a **successful kirana store** in a tier-2 Indian city:
- **Location**: Residential area with good foot traffic
- **Size**: Small to medium (single employee)
- **Customer base**: Mix of walk-in and regular customers
- **Product range**: Staple groceries (rice, flour, oil, spices)
- **Operating model**: Daily operations with weekly bulk purchases

## CSV Format

All files follow the standard format expected by the CSV parser:

```csv
date,type,vendor_name,category,amount
2024-01-01,sale,Walk-in Customer,Groceries,2850
2024-01-01,expense,Shop Owner,Rent,15000
```

**Required columns**:
- `date`: ISO format (YYYY-MM-DD)
- `type`: "sale" or "expense"
- `amount`: Numeric value (no currency symbols)

**Optional columns**:
- `vendor_name`: Customer or supplier name
- `category`: Transaction category

## Testing Scenarios

Use this data to test:
1. **CSV parsing**: Multiple formats and edge cases
2. **AI analysis**: Comprehensive insights generation
3. **Visualization**: Charts and graphs with real patterns
4. **Performance**: 400+ transactions across 90 days
5. **User experience**: Full demo flow from upload to insights

## Maintenance

To update the demo data:
1. Edit the CSV files directly
2. Or regenerate the business/tier CSV set using `scripts/generate-demo-data.js`
3. Use `scripts/load-csv-demo-data.ts` if you want the generic sample CSV pack
3. Ensure patterns remain realistic and insightful
4. Update this README with any changes

---

**Last Updated**: March 2024  
**Data Period**: January 1 - March 9, 2024 (90 days)  
**Total Transactions**: ~490  
**Business Type**: Kirana Store (Indian Grocery)
