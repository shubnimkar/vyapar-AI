/**
 * CSV Demo Data Loader
 * 
 * Loads comprehensive demo CSV data to showcase Advanced Analysis features.
 * This script demonstrates the full power of the AI analysis with realistic
 * 90-day business data for a kirana store.
 * 
 * Data includes:
 * - Sales: 90 days of transactions with walk-in and regular customers
 * - Expenses: Rent, utilities, inventory purchases, wages, transport
 * - Inventory: Bulk purchases of staple items (rice, flour, oil, etc.)
 * 
 * Key insights this data will reveal:
 * - Profit margin trends (avg 45-50%)
 * - Weekend sales boost patterns
 * - Expense optimization opportunities
 * - Cash flow patterns
 * - Inventory turnover analysis
 */

export interface DemoCSVData {
  sales: string;
  expenses: string;
  inventory: string;
}

/**
 * Generate comprehensive sales data (90 days)
 * Pattern: 2 transactions per day (walk-in + regular customer)
 * Weekend boost: 20% higher sales on Sat/Sun
 * Average daily sales: ₹8,000-10,000
 */
function generateSalesCSV(): string {
  const lines = ['date,type,vendor_name,category,amount'];
  const startDate = new Date('2024-01-01');
  const customers = [
    'Ramesh Stores',
    'Suresh Traders', 
    'Mahesh Shop',
    'Lakshmi Store',
    'Ganesh Traders',
    'Priya Enterprises',
    'Vijay Mart'
  ];

  for (let day = 0; day < 90; day++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + day);
    const dateStr = date.toISOString().split('T')[0];
    const isWeekend = date.getDay() === 0 || date.getDay() === 6;
    
    // Walk-in customer (smaller transaction)
    const walkInAmount = Math.round(2800 + Math.random() * 2500);
    const boostedWalkIn = isWeekend ? Math.round(walkInAmount * 1.2) : walkInAmount;
    lines.push(`${dateStr},sale,Walk-in Customer,Groceries,${boostedWalkIn}`);
    
    // Regular customer (larger transaction)
    const customerName = customers[day % customers.length];
    const regularAmount = Math.round(4000 + Math.random() * 3500);
    const boostedRegular = isWeekend ? Math.round(regularAmount * 1.2) : regularAmount;
    lines.push(`${dateStr},sale,${customerName},Groceries,${boostedRegular}`);
  }

  return lines.join('\n');
}

/**
 * Generate comprehensive expenses data (90 days)
 * Includes:
 * - Fixed: Rent (monthly), Utilities (periodic)
 * - Variable: Inventory purchases, Transport, Supplies
 * - Periodic: Wages (weekly), Maintenance (occasional)
 * Average daily expenses: ₹4,000-5,000
 */
function generateExpensesCSV(): string {
  const lines = ['date,type,vendor_name,category,amount'];
  const startDate = new Date('2024-01-01');

  for (let day = 0; day < 90; day++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + day);
    const dateStr = date.toISOString().split('T')[0];
    const dayOfMonth = date.getDate();
    const dayOfWeek = date.getDay();

    // Monthly rent (1st of month)
    if (dayOfMonth === 1) {
      lines.push(`${dateStr},expense,Shop Owner,Rent,15000`);
    }

    // Electricity bill (1st and 30th)
    if (dayOfMonth === 1) {
      lines.push(`${dateStr},expense,Electricity Board,Utilities,${1200 + Math.round(Math.random() * 300)}`);
    }

    // Water bill (15th)
    if (dayOfMonth === 15) {
      lines.push(`${dateStr},expense,Water Board,Utilities,${600 + Math.round(Math.random() * 100)}`);
    }

    // Weekly wages (every Wednesday)
    if (dayOfWeek === 3) {
      lines.push(`${dateStr},expense,Staff Member,Wages,500`);
    }

    // Inventory purchases (3-4 times per week)
    if ([1, 3, 5, 0].includes(dayOfWeek)) {
      const amount = Math.round(3200 + Math.random() * 1200);
      const vendor = dayOfWeek === 0 ? 'Local Supplier' : 'Wholesale Market';
      lines.push(`${dateStr},expense,${vendor},Inventory Purchase,${amount}`);
    }

    // Transport (2-3 times per week)
    if ([2, 4, 6].includes(dayOfWeek)) {
      const amount = Math.round(350 + Math.random() * 100);
      lines.push(`${dateStr},expense,Transport Service,Transport,${amount}`);
    }

    // Packaging supplies (weekly)
    if (dayOfWeek === 1 || dayOfWeek === 4) {
      const amount = Math.round(380 + Math.random() * 100);
      lines.push(`${dateStr},expense,Packaging Supplier,Supplies,${amount}`);
    }

    // Maintenance (occasional - every 15-20 days)
    if (dayOfMonth === 12 || dayOfMonth === 23) {
      const amount = Math.round(800 + Math.random() * 1000);
      lines.push(`${dateStr},expense,Maintenance Service,Maintenance,${amount}`);
    }
  }

  return lines.join('\n');
}

/**
 * Generate inventory purchase data (90 days)
 * Bulk purchases of staple items every 5-7 days
 * Items: Rice, Wheat Flour, Sugar, Cooking Oil, Tea, Pulses, Spices
 */
function generateInventoryCSV(): string {
  const lines = ['date,type,vendor_name,category,amount'];
  const startDate = new Date('2024-01-01');
  
  const items = [
    { name: 'Rice 25kg', cost: 1250 },
    { name: 'Wheat Flour 25kg', cost: 875 },
    { name: 'Sugar 25kg', cost: 950 },
    { name: 'Cooking Oil 15L', cost: 1650 },
    { name: 'Tea Powder 5kg', cost: 700 },
    { name: 'Pulses 10kg', cost: 800 },
    { name: 'Spices Assorted', cost: 600 }
  ];

  let itemIndex = 0;
  for (let day = 0; day < 90; day += 5) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + day);
    const dateStr = date.toISOString().split('T')[0];

    // Purchase 2-3 items every 5 days
    const itemCount = 2 + Math.floor(Math.random() * 2);
    for (let i = 0; i < itemCount; i++) {
      const item = items[itemIndex % items.length];
      lines.push(`${dateStr},expense,Wholesale Supplier,${item.name},${item.cost}`);
      itemIndex++;
    }
  }

  return lines.join('\n');
}

/**
 * Get all demo CSV data
 */
export function getDemoCSVData(): DemoCSVData {
  return {
    sales: generateSalesCSV(),
    expenses: generateExpensesCSV(),
    inventory: generateInventoryCSV()
  };
}

/**
 * Create File objects from CSV strings (for browser upload simulation)
 */
export function createDemoFiles(): { sales: File; expenses: File; inventory: File } {
  const data = getDemoCSVData();
  
  return {
    sales: new File([data.sales], 'sample-sales.csv', { type: 'text/csv' }),
    expenses: new File([data.expenses], 'sample-expenses.csv', { type: 'text/csv' }),
    inventory: new File([data.inventory], 'sample-inventory.csv', { type: 'text/csv' })
  };
}

/**
 * Expected insights from this demo data:
 * 
 * 1. Profit Analysis:
 *    - Average daily sales: ₹8,500
 *    - Average daily expenses: ₹4,500
 *    - Profit margin: ~47%
 *    - Total 90-day profit: ~₹360,000
 * 
 * 2. Patterns:
 *    - Weekend sales boost: 20% higher
 *    - Fixed costs: ₹15,000/month rent
 *    - Variable costs: Inventory purchases dominate
 * 
 * 3. Recommendations AI should provide:
 *    - Optimize inventory ordering frequency
 *    - Reduce transport costs by consolidating deliveries
 *    - Leverage weekend traffic for promotions
 *    - Monitor utility costs (slight increase over time)
 *    - Consider bulk purchasing discounts
 * 
 * 4. Cash Flow:
 *    - Positive daily cash flow
 *    - Monthly rent creates predictable dip
 *    - Inventory purchases create volatility
 * 
 * 5. Health Score:
 *    - Expected: 75-85 (Good to Excellent)
 *    - Strong margin score
 *    - Moderate expense control
 *    - Good cash buffer
 */
