// Deterministic calculation engine for Vyapar AI
// All calculations are pure functions with no side effects
// NO AI involvement - all calculations are reproducible

/**
 * Calculate profit from sales and expenses
 * Formula: Profit = Sales - Expenses
 */
export function calculateProfit(sales: number, expenses: number): number {
  return sales - expenses;
}

/**
 * Calculate expense ratio
 * Formula: Expense Ratio = Expenses / Sales
 * Returns 0 if sales is 0 to avoid division by zero
 */
export function calculateExpenseRatio(expenses: number, sales: number): number {
  if (sales === 0) return 0;
  return expenses / sales;
}

/**
 * Calculate profit margin
 * Formula: Profit Margin = Profit / Sales
 * Returns 0 if sales is 0 to avoid division by zero
 */
export function calculateProfitMargin(profit: number, sales: number): number {
  if (sales === 0) return 0;
  return profit / sales;
}

/**
 * Health score breakdown interface
 */
export interface HealthScoreBreakdown {
  marginScore: number;    // 0-30 points
  expenseScore: number;   // 0-30 points
  cashScore: number;      // 0-20 points
  creditScore: number;    // 0-20 points
}

/**
 * Health score result interface
 */
export interface HealthScoreResult {
  score: number;                    // 0-100
  breakdown: HealthScoreBreakdown;
}

/**
 * Calculate business health score (0-100)
 * 
 * Scoring breakdown:
 * - Margin score (0-30): Based on profit margin
 * - Expense score (0-30): Based on expense ratio
 * - Cash score (0-20): Based on cash in hand
 * - Credit score (0-20): Based on overdue credit
 * 
 * @param profitMargin - Profit margin (0-1 range, e.g., 0.20 = 20%)
 * @param expenseRatio - Expense ratio (0-1 range, e.g., 0.60 = 60%)
 * @param cashInHand - Cash in hand (optional, undefined if not provided)
 * @param creditSummary - Credit summary with overdue count
 * @returns Health score (0-100) with breakdown
 */
export function calculateHealthScore(
  profitMargin: number,
  expenseRatio: number,
  cashInHand: number | undefined,
  creditSummary: { overdueCount: number; totalOutstanding: number; totalOverdue: number }
): HealthScoreResult {
  const breakdown: HealthScoreBreakdown = {
    marginScore: 0,
    expenseScore: 0,
    cashScore: 0,
    creditScore: 0,
  };

  // Margin score (0-30 points)
  // >20% margin = excellent (30 points)
  // >10% margin = good (20 points)
  // >0% margin = acceptable (10 points)
  if (profitMargin > 0.20) {
    breakdown.marginScore = 30;
  } else if (profitMargin > 0.10) {
    breakdown.marginScore = 20;
  } else if (profitMargin > 0) {
    breakdown.marginScore = 10;
  }

  // Expense score (0-30 points)
  // <60% expenses = excellent (30 points)
  // <75% expenses = good (20 points)
  // <90% expenses = acceptable (10 points)
  if (expenseRatio < 0.60) {
    breakdown.expenseScore = 30;
  } else if (expenseRatio < 0.75) {
    breakdown.expenseScore = 20;
  } else if (expenseRatio < 0.90) {
    breakdown.expenseScore = 10;
  }

  // Cash score (0-20 points)
  // If cashInHand is tracked and > 0: full 20 points (healthy cash balance)
  // If cashInHand is tracked and = 0: 5 points (tracked but depleted)
  // If cashInHand is not tracked (undefined): 10 points neutral default
  //   (don't penalize users for not filling in an optional field)
  if (cashInHand === undefined) {
    breakdown.cashScore = 10; // Neutral default: data not available
  } else if (cashInHand > 0) {
    breakdown.cashScore = 20;
  } else {
    // cashInHand === 0: tracked but zero balance
    breakdown.cashScore = 5;
  }

  // Credit score (0-20 points)
  // Based on the % of total outstanding credit that is overdue (by amount, not count)
  // This is fair when a business has many customers — a few overdue shouldn't tank the score
  //   0% overdue amount   → 20 points (excellent)
  //   1-20% overdue       → 15 points (good)
  //   21-50% overdue      → 10 points (acceptable)
  //   51-80% overdue      → 5 points  (concerning)
  //   >80% overdue (or no data) → 0 points (poor)
  if (creditSummary.totalOutstanding === 0) {
    // No credit given at all → full marks (no overdue risk)
    breakdown.creditScore = 20;
  } else {
    const overdueRatio = creditSummary.totalOverdue / creditSummary.totalOutstanding;
    if (overdueRatio === 0) {
      breakdown.creditScore = 20;
    } else if (overdueRatio <= 0.20) {
      breakdown.creditScore = 15;
    } else if (overdueRatio <= 0.50) {
      breakdown.creditScore = 10;
    } else if (overdueRatio <= 0.80) {
      breakdown.creditScore = 5;
    }
    // > 80% overdue → 0 points
  }

  // Calculate total score
  const totalScore =
    breakdown.marginScore +
    breakdown.expenseScore +
    breakdown.cashScore +
    breakdown.creditScore;

  // Ensure score is between 0 and 100
  const score = Math.min(100, Math.max(0, totalScore));

  return { score, breakdown };
}

/**
 * Credit summary interface
 */
export interface CreditSummary {
  totalOutstanding: number;  // Total unpaid credit
  totalOverdue: number;      // Total overdue credit
  overdueCount: number;      // Number of overdue customers
}

/**
 * Credit entry interface (minimal for calculation)
 */
export interface CreditEntryForCalculation {
  amount: number;
  dueDate: string;  // ISO date string
  isPaid: boolean;
}

/**
 * Calculate credit summary from credit entries
 * 
 * @param entries - Array of credit entries
 * @returns Credit summary with outstanding, overdue, and count
 */
export function calculateCreditSummary(
  entries: CreditEntryForCalculation[]
): CreditSummary {
  const now = new Date();

  // Filter unpaid entries
  const unpaidEntries = entries.filter(e => !e.isPaid);

  // Calculate total outstanding (all unpaid)
  const totalOutstanding = unpaidEntries.reduce((sum, e) => sum + e.amount, 0);

  // Filter overdue entries (unpaid and past due date)
  const overdueEntries = unpaidEntries.filter(e => {
    const dueDate = new Date(e.dueDate);
    return dueDate < now;
  });

  // Calculate total overdue
  const totalOverdue = overdueEntries.reduce((sum, e) => sum + e.amount, 0);

  // Count overdue customers
  const overdueCount = overdueEntries.length;

  return {
    totalOutstanding,
    totalOverdue,
    overdueCount,
  };
}

/**
 * Inventory item interface (minimal for calculation)
 */
export interface InventoryItemForCalculation {
  quantity: number;
  cost_price: number;
}

/**
 * Calculate blocked inventory cash
 * Formula: Sum of (quantity × cost_price) for all items
 * 
 * @param inventory - Array of inventory items
 * @returns Total cash blocked in inventory
 */
export function calculateBlockedInventory(
  inventory: InventoryItemForCalculation[]
): number {
  return inventory.reduce((sum, item) => {
    const quantity = Number(item.quantity) || 0;
    const costPrice = Number(item.cost_price) || 0;
    return sum + (quantity * costPrice);
  }, 0);
}

/**
 * Daily calculations interface
 */
export interface DailyCalculations {
  estimatedProfit: number;
  expenseRatio: number;
  profitMargin: number;
}

/**
 * Calculate all daily metrics at once
 * Convenience function for daily entry processing
 * 
 * @param totalSales - Total sales for the day
 * @param totalExpense - Total expenses for the day
 * @returns All calculated metrics
 */
export function calculateDailyMetrics(
  totalSales: number,
  totalExpense: number
): DailyCalculations {
  const estimatedProfit = calculateProfit(totalSales, totalExpense);
  const expenseRatio = calculateExpenseRatio(totalExpense, totalSales);
  const profitMargin = calculateProfitMargin(estimatedProfit, totalSales);

  return {
    estimatedProfit,
    expenseRatio,
    profitMargin,
  };
}
