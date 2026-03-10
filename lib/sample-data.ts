// Sample data for demo mode

export const sampleSalesData = `date,product,quantity,amount
2024-02-01,Rice 1kg,50,2500
2024-02-01,Wheat Flour 1kg,30,1200
2024-02-01,Sugar 1kg,20,800
2024-02-02,Rice 1kg,45,2250
2024-02-02,Cooking Oil 1L,25,3000
2024-02-03,Tea Powder 250g,40,1600
2024-02-03,Biscuits Pack,60,1800
2024-02-04,Rice 1kg,55,2750
2024-02-04,Wheat Flour 1kg,35,1400
2024-02-05,Sugar 1kg,15,600
2024-02-05,Cooking Oil 1L,20,2400
2024-02-06,Tea Powder 250g,50,2000
2024-02-06,Biscuits Pack,70,2100
2024-02-07,Rice 1kg,60,3000
2024-02-07,Detergent 1kg,10,500`;

export const sampleExpensesData = `date,category,amount,description
2024-02-01,rent,15000,Monthly shop rent
2024-02-01,utilities,2500,Electricity bill
2024-02-02,supplies,1200,Plastic bags and packaging
2024-02-03,wages,8000,Helper salary
2024-02-04,utilities,800,Water bill
2024-02-05,supplies,1500,Cleaning supplies
2024-02-06,maintenance,3000,Shop repairs
2024-02-07,transport,1000,Delivery charges`;

export const sampleInventoryData = `product,quantity,cost_price,selling_price
Rice 1kg,200,45,50
Wheat Flour 1kg,150,35,40
Sugar 1kg,100,38,40
Cooking Oil 1L,80,110,120
Tea Powder 250g,120,35,40
Biscuits Pack,200,25,30
Detergent 1kg,50,45,50
Salt 1kg,80,15,20
Soap Bar,100,20,25
Toothpaste,60,40,50`;

export function createSampleFile(data: string, filename: string): File {
  const blob = new Blob([data], { type: 'text/csv' });
  return new File([blob], filename, { type: 'text/csv' });
}

/**
 * Demo scenarios for Daily Health Coach feature
 * 
 * These scenarios demonstrate different suggestion types:
 * 1. High Credit Ratio (> 40% of sales)
 * 2. Margin Drop (< 70% of 30-day average)
 * 3. Low Cash Buffer (< 7 days)
 * 4. Healthy State (score >= 70, no issues)
 * 5. Multiple Issues (combination of problems)
 */

import type { DailyEntry, CreditEntry } from './types';

/**
 * Scenario 1: High Credit Ratio
 * 
 * Shop has extended too much credit to customers (50% of sales).
 * Should trigger critical "high_credit" suggestion.
 */
export const demoHighCreditScenario = {
  currentEntry: {
    id: 'demo-high-credit',
    date: '2024-03-01',
    totalSales: 10000,
    totalExpense: 6000,
    estimatedProfit: 4000,
    profitMargin: 0.4,
    expenseRatio: 0.6,
    cashInHand: 15000,
    notes: 'Demo: High credit scenario'
  } as DailyEntry,
  
  creditEntries: [
    { 
      id: 'c1', 
      userId: 'demo-user',
      customerName: 'Ramesh Store', 
      amount: 2000, 
      dateGiven: '2024-02-20',
      dueDate: '2024-03-15', 
      isPaid: false,
      createdAt: '2024-02-20T00:00:00Z',
      updatedAt: '2024-02-20T00:00:00Z'
    },
    { 
      id: 'c2', 
      userId: 'demo-user',
      customerName: 'Suresh Shop', 
      amount: 1500, 
      dateGiven: '2024-02-25',
      dueDate: '2024-03-10', 
      isPaid: false,
      createdAt: '2024-02-25T00:00:00Z',
      updatedAt: '2024-02-25T00:00:00Z'
    },
    { 
      id: 'c3', 
      userId: 'demo-user',
      customerName: 'Mahesh Traders', 
      amount: 1500, 
      dateGiven: '2024-02-28',
      dueDate: '2024-03-20', 
      isPaid: false,
      createdAt: '2024-02-28T00:00:00Z',
      updatedAt: '2024-02-28T00:00:00Z'
    }
  ] as CreditEntry[],
  
  historicalEntries: generateHistoricalEntries('2024-03-01', 30, {
    avgSales: 10000,
    avgExpenses: 6000,
    avgMargin: 0.4,
    avgCash: 15000
  })
};

/**
 * Scenario 2: Margin Drop
 * 
 * Current margin (20%) is significantly lower than 30-day average (35%).
 * Should trigger warning "margin_drop" suggestion.
 */
export const demoMarginDropScenario = {
  currentEntry: {
    id: 'demo-margin-drop',
    date: '2024-03-01',
    totalSales: 10000,
    totalExpense: 8000,
    estimatedProfit: 2000,
    profitMargin: 0.2,
    expenseRatio: 0.8,
    cashInHand: 12000,
    notes: 'Demo: Margin drop scenario'
  } as DailyEntry,
  
  creditEntries: [
    { 
      id: 'c1', 
      userId: 'demo-user',
      customerName: 'Regular Customer', 
      amount: 1000, 
      dateGiven: '2024-02-20',
      dueDate: '2024-03-15', 
      isPaid: false,
      createdAt: '2024-02-20T00:00:00Z',
      updatedAt: '2024-02-20T00:00:00Z'
    }
  ] as CreditEntry[],
  
  historicalEntries: generateHistoricalEntries('2024-03-01', 30, {
    avgSales: 10000,
    avgExpenses: 6500,
    avgMargin: 0.35,
    avgCash: 12000
  })
};

/**
 * Scenario 3: Low Cash Buffer
 * 
 * Only 5 days of cash buffer remaining (< 7 days threshold).
 * Should trigger critical "low_cash" suggestion.
 */
export const demoLowCashScenario = {
  currentEntry: {
    id: 'demo-low-cash',
    date: '2024-03-01',
    totalSales: 8000,
    totalExpense: 5000,
    estimatedProfit: 3000,
    profitMargin: 0.375,
    expenseRatio: 0.625,
    cashInHand: 25000, // Only 5 days buffer at 5000/day expenses
    notes: 'Demo: Low cash buffer scenario'
  } as DailyEntry,
  
  creditEntries: [
    { 
      id: 'c1', 
      userId: 'demo-user',
      customerName: 'Customer A', 
      amount: 1500, 
      dateGiven: '2024-02-20',
      dueDate: '2024-03-15', 
      isPaid: false,
      createdAt: '2024-02-20T00:00:00Z',
      updatedAt: '2024-02-20T00:00:00Z'
    }
  ] as CreditEntry[],
  
  historicalEntries: generateHistoricalEntries('2024-03-01', 30, {
    avgSales: 8000,
    avgExpenses: 5000,
    avgMargin: 0.375,
    avgCash: 25000
  })
};

/**
 * Scenario 4: Healthy State
 * 
 * Good health score (80), no issues detected.
 * Should trigger info "healthy_state" suggestion with optimization tip.
 */
export const demoHealthyStateScenario = {
  currentEntry: {
    id: 'demo-healthy',
    date: '2024-03-01',
    totalSales: 12000,
    totalExpense: 6000,
    estimatedProfit: 6000,
    profitMargin: 0.5,
    expenseRatio: 0.5,
    cashInHand: 50000, // 10 days buffer
    notes: 'Demo: Healthy state scenario'
  } as DailyEntry,
  
  creditEntries: [
    { 
      id: 'c1', 
      userId: 'demo-user',
      customerName: 'Customer A', 
      amount: 1000, 
      dateGiven: '2024-02-20',
      dueDate: '2024-03-15', 
      isPaid: false,
      createdAt: '2024-02-20T00:00:00Z',
      updatedAt: '2024-02-20T00:00:00Z'
    },
    { 
      id: 'c2', 
      userId: 'demo-user',
      customerName: 'Customer B', 
      amount: 500, 
      dateGiven: '2024-02-25',
      dueDate: '2024-03-10', 
      isPaid: true,
      paidDate: '2024-03-08',
      createdAt: '2024-02-25T00:00:00Z',
      updatedAt: '2024-03-08T00:00:00Z'
    }
  ] as CreditEntry[],
  
  historicalEntries: generateHistoricalEntries('2024-03-01', 30, {
    avgSales: 12000,
    avgExpenses: 6000,
    avgMargin: 0.48,
    avgCash: 50000
  })
};

/**
 * Scenario 5: Multiple Issues
 * 
 * Combination of high credit, margin drop, and low cash.
 * Should trigger multiple suggestions sorted by severity.
 */
export const demoMultipleIssuesScenario = {
  currentEntry: {
    id: 'demo-multiple',
    date: '2024-03-01',
    totalSales: 10000,
    totalExpense: 8000,
    estimatedProfit: 2000,
    profitMargin: 0.2,
    expenseRatio: 0.8,
    cashInHand: 20000, // Only 2.5 days buffer
    notes: 'Demo: Multiple issues scenario'
  } as DailyEntry,
  
  creditEntries: [
    { 
      id: 'c1', 
      userId: 'demo-user',
      customerName: 'Customer A', 
      amount: 2500, 
      dateGiven: '2024-02-20',
      dueDate: '2024-03-15', 
      isPaid: false,
      createdAt: '2024-02-20T00:00:00Z',
      updatedAt: '2024-02-20T00:00:00Z'
    },
    { 
      id: 'c2', 
      userId: 'demo-user',
      customerName: 'Customer B', 
      amount: 2000, 
      dateGiven: '2024-02-25',
      dueDate: '2024-03-10', 
      isPaid: false,
      createdAt: '2024-02-25T00:00:00Z',
      updatedAt: '2024-02-25T00:00:00Z'
    }
  ] as CreditEntry[],
  
  historicalEntries: generateHistoricalEntries('2024-03-01', 30, {
    avgSales: 10000,
    avgExpenses: 6500,
    avgMargin: 0.35,
    avgCash: 20000
  })
};

/**
 * Helper function to generate historical entries for demo scenarios
 */
function generateHistoricalEntries(
  currentDate: string,
  days: number,
  params: {
    avgSales: number;
    avgExpenses: number;
    avgMargin: number;
    avgCash: number;
  }
): DailyEntry[] {
  const entries: DailyEntry[] = [];
  const current = new Date(currentDate);
  
  for (let i = 1; i <= days; i++) {
    const date = new Date(current);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    
    // Add some variance to make it realistic
    const variance = 0.1;
    const salesVariance = 1 + (Math.random() - 0.5) * variance;
    const expenseVariance = 1 + (Math.random() - 0.5) * variance;
    
    const sales = Math.round(params.avgSales * salesVariance);
    const expenses = Math.round(params.avgExpenses * expenseVariance);
    const profit = sales - expenses;
    const margin = profit / sales;
    
    entries.push({
      id: `hist-${i}`,
      date: dateStr,
      totalSales: sales,
      totalExpense: expenses,
      estimatedProfit: profit,
      profitMargin: margin,
      expenseRatio: expenses / sales,
      cashInHand: params.avgCash,
      notes: `Historical entry ${i}`
    } as DailyEntry);
  }
  
  return entries;
}

/**
 * Load a demo scenario into localStorage for testing
 * 
 * @param scenario - One of the demo scenarios
 */
export function loadDemoScenario(scenario: {
  currentEntry: DailyEntry;
  creditEntries: CreditEntry[];
  historicalEntries: DailyEntry[];
}): void {
  if (typeof window === 'undefined') return;
  
  try {
    // Save historical entries
    const allEntries = [...scenario.historicalEntries, scenario.currentEntry];
    localStorage.setItem('vyapar-daily-entries', JSON.stringify(allEntries));
    
    // Save credit entries
    localStorage.setItem('vyapar-credits', JSON.stringify(scenario.creditEntries));
    
    console.log('Demo scenario loaded successfully');
  } catch (error) {
    console.error('Failed to load demo scenario:', error);
  }
}
