/**
 * Demo Data Generator for Vyapar AI
 * 
 * Generates comprehensive mock data for all features:
 * - User Profile
 * - 90 days of Daily Entries
 * - Credit Tracking (with overdue entries)
 * - Stress & Affordability Indices
 * - Segment Benchmark Data
 * - Pending Transactions
 * - Reports
 * - Cash Flow Predictions
 * 
 * Usage: npx ts-node scripts/generate-demo-data.ts
 */

import { v4 as uuidv4 } from 'uuid';

// ============================================
// Demo User Profile
// ============================================

export const DEMO_USER = {
  id: 'demo_user_12345',
  phoneNumber: '+919876543210',
  deviceId: 'demo_device_001',
  shopName: 'Sharma Kirana Store',
  userName: 'Rajesh Sharma',
  language: 'en' as const,
  businessType: 'kirana',
  city: 'Mumbai',
  createdAt: '2024-01-01T00:00:00.000Z',
  lastActiveAt: new Date().toISOString(),
  isActive: true,
  subscriptionTier: 'free' as const,
  preferences: {
    dataRetentionDays: 365,
    autoArchive: false,
    notificationsEnabled: true,
    currency: 'INR',
  },
  
  // Persona fields
  business_type: 'kirana' as const,
  city_tier: 'tier1' as const,
  explanation_mode: 'simple' as const,
};

// ============================================
// Generate 90 Days of Daily Entries
// ============================================

export function generateDailyEntries(days: number = 90) {
  const entries = [];
  const today = new Date();
  
  // Base values with realistic variance
  const baseSales = 12000;
  const baseExpenses = 7000;
  const baseCash = 50000;
  
  for (let i = 0; i < days; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    
    // Add realistic variance and trends
    const dayOfWeek = date.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const weekendMultiplier = isWeekend ? 1.3 : 1.0;
    
    // Seasonal trend (slight increase over time)
    const trendMultiplier = 1 + (i / days) * 0.1;
    
    // Random daily variance
    const salesVariance = 0.85 + Math.random() * 0.3; // ±15%
    const expenseVariance = 0.9 + Math.random() * 0.2; // ±10%
    
    const totalSales = Math.round(baseSales * weekendMultiplier * trendMultiplier * salesVariance);
    const totalExpense = Math.round(baseExpenses * expenseVariance);
    const estimatedProfit = totalSales - totalExpense;
    const expenseRatio = totalExpense / totalSales;
    const profitMargin = estimatedProfit / totalSales;
    
    // Cash accumulates over time
    const cashInHand = baseCash + (estimatedProfit * (days - i));
    
    entries.push({
      entryId: uuidv4(),
      date: dateStr,
      totalSales,
      totalExpense,
      cashInHand: Math.max(0, cashInHand),
      notes: i === 0 ? 'Today\'s entry' : i === 1 ? 'Yesterday\'s entry' : undefined,
      estimatedProfit,
      expenseRatio,
      profitMargin,
      createdAt: date.toISOString(),
      updatedAt: date.toISOString(),
      syncStatus: 'synced' as const,
    });
  }
  
  return entries.reverse(); // Oldest first
}

// ============================================
// Generate Credit Entries
// ============================================

export function generateCreditEntries() {
  const today = new Date();
  const credits = [];
  
  // Scenario 1: Overdue credits (for Follow-up Panel)
  credits.push({
    id: `credit_${Date.now()}_001`,
    userId: DEMO_USER.id,
    customerName: 'Ramesh Traders',
    phoneNumber: '+919876543211',
    amount: 3500,
    dateGiven: new Date(today.getTime() - 20 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    dueDate: new Date(today.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    isPaid: false,
    lastReminderAt: new Date(today.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(today.getTime() - 20 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(today.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString(),
  });
  
  credits.push({
    id: `credit_${Date.now()}_002`,
    userId: DEMO_USER.id,
    customerName: 'Suresh Store',
    phoneNumber: '+919876543212',
    amount: 2800,
    dateGiven: new Date(today.getTime() - 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    dueDate: new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    isPaid: false,
    createdAt: new Date(today.getTime() - 15 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(today.getTime() - 15 * 24 * 60 * 60 * 1000).toISOString(),
  });
  
  credits.push({
    id: `credit_${Date.now()}_003`,
    userId: DEMO_USER.id,
    customerName: 'Mahesh Enterprises',
    phoneNumber: '+919876543213',
    amount: 4200,
    dateGiven: new Date(today.getTime() - 25 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    dueDate: new Date(today.getTime() - 12 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    isPaid: false,
    lastReminderAt: new Date(today.getTime() - 8 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(today.getTime() - 25 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(today.getTime() - 8 * 24 * 60 * 60 * 1000).toISOString(),
  });
  
  // Scenario 2: Upcoming due credits
  credits.push({
    id: `credit_${Date.now()}_004`,
    userId: DEMO_USER.id,
    customerName: 'Dinesh Wholesale',
    phoneNumber: '+919876543214',
    amount: 5000,
    dateGiven: new Date(today.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    dueDate: new Date(today.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    isPaid: false,
    createdAt: new Date(today.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(today.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString(),
  });
  
  // Scenario 3: Paid credits (for history)
  credits.push({
    id: `credit_${Date.now()}_005`,
    userId: DEMO_USER.id,
    customerName: 'Anil Provisions',
    phoneNumber: '+919876543215',
    amount: 3000,
    dateGiven: new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    dueDate: new Date(today.getTime() - 20 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    isPaid: true,
    paidDate: new Date(today.getTime() - 18 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    createdAt: new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(today.getTime() - 18 * 24 * 60 * 60 * 1000).toISOString(),
  });
  
  credits.push({
    id: `credit_${Date.now()}_006`,
    userId: DEMO_USER.id,
    customerName: 'Vijay Store',
    phoneNumber: '+919876543216',
    amount: 2500,
    dateGiven: new Date(today.getTime() - 40 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    dueDate: new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    isPaid: true,
    paidDate: new Date(today.getTime() - 28 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    createdAt: new Date(today.getTime() - 40 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(today.getTime() - 28 * 24 * 60 * 60 * 1000).toISOString(),
  });
  
  return credits;
}

// ============================================
// Generate Stress & Affordability Indices
// ============================================

export function generateIndices() {
  const today = new Date();
  const indices = [];
  
  // Generate indices for last 30 days
  for (let i = 0; i < 30; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    
    // Stress index components (with trend)
    const creditRatio = 0.25 + (i / 30) * 0.1; // Increasing credit exposure
    const cashBuffer = 2.5 - (i / 30) * 0.5; // Decreasing cash buffer
    const expenseVolatility = 0.15 + Math.random() * 0.1;
    
    // Calculate stress score
    const creditRatioScore = creditRatio >= 0.3 ? 20 : creditRatio >= 0.1 ? 10 : 0;
    const cashBufferScore = cashBuffer < 1.0 ? 25 : cashBuffer < 2.0 ? 15 : cashBuffer < 3.0 ? 5 : 0;
    const expenseVolatilityScore = expenseVolatility >= 0.15 ? 8 : 0;
    const stressScore = creditRatioScore + cashBufferScore + expenseVolatilityScore;
    
    // Affordability index (for a planned purchase of ₹15,000)
    const plannedCost = 15000;
    const avgMonthlyProfit = 150000;
    const costToProfitRatio = plannedCost / avgMonthlyProfit;
    const affordabilityScore = costToProfitRatio < 0.1 ? 100 : 95;
    const affordabilityCategory = 'Easily Affordable';
    
    indices.push({
      userId: DEMO_USER.id,
      date: dateStr,
      stressIndex: {
        score: stressScore,
        breakdown: {
          creditRatioScore,
          cashBufferScore,
          expenseVolatilityScore,
        },
        calculatedAt: date.toISOString(),
        inputParameters: {
          creditRatio,
          cashBuffer,
          expenseVolatility,
        },
      },
      affordabilityIndex: {
        score: affordabilityScore,
        breakdown: {
          costToProfitRatio,
          affordabilityCategory,
        },
        calculatedAt: date.toISOString(),
        inputParameters: {
          plannedCost,
          avgMonthlyProfit,
        },
      },
      dataPoints: 30,
      calculationPeriod: {
        startDate: new Date(date.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        endDate: dateStr,
      },
      createdAt: date.toISOString(),
      syncedAt: date.toISOString(),
      syncStatus: 'synced' as const,
    });
  }
  
  return indices.reverse(); // Oldest first
}

// ============================================
// Generate Segment Benchmark Data
// ============================================

export function generateSegmentData() {
  return {
    segmentKey: 'SEGMENT#tier1#kirana',
    medianHealthScore: 72,
    medianMargin: 0.28,
    sampleSize: 1247,
    lastUpdated: new Date().toISOString(),
    cachedAt: new Date().toISOString(),
  };
}

// ============================================
// Generate Pending Transactions
// ============================================

export function generatePendingTransactions() {
  const today = new Date();
  
  return [
    {
      id: `txn_${Date.now()}_001`,
      date: today.toISOString().split('T')[0],
      type: 'expense' as const,
      vendor_name: 'Reliance Wholesale',
      category: 'supplies',
      amount: 2500,
      source: 'receipt' as const,
      created_at: today.toISOString(),
      raw_data: {
        confidence: 0.95,
        ocr_text: 'RELIANCE WHOLESALE\nTotal: Rs. 2500',
      },
    },
    {
      id: `txn_${Date.now()}_002`,
      date: today.toISOString().split('T')[0],
      type: 'sale' as const,
      vendor_name: 'Cash Sale',
      category: 'retail',
      amount: 1800,
      source: 'csv' as const,
      created_at: new Date(today.getTime() - 2 * 60 * 60 * 1000).toISOString(),
      raw_data: {
        row: 15,
        file: 'sales_export.csv',
      },
    },
    {
      id: `txn_${Date.now()}_003`,
      date: today.toISOString().split('T')[0],
      type: 'expense' as const,
      vendor_name: 'Electricity Bill',
      category: 'utilities',
      amount: 3200,
      source: 'voice' as const,
      created_at: new Date(today.getTime() - 4 * 60 * 60 * 1000).toISOString(),
      raw_data: {
        confidence: 0.88,
        transcript: 'bijli ka bill teen hazaar do sau rupaye',
      },
    },
  ];
}

// ============================================
// Generate Reports
// ============================================

export function generateReports() {
  const today = new Date();
  const reports = [];
  
  // Generate weekly reports for last 4 weeks
  for (let i = 0; i < 4; i++) {
    const reportDate = new Date(today);
    reportDate.setDate(reportDate.getDate() - (i * 7));
    const dateStr = reportDate.toISOString().split('T')[0];
    
    const totalSales = 80000 + Math.random() * 10000;
    const totalExpenses = 48000 + Math.random() * 5000;
    const netProfit = totalSales - totalExpenses;
    const profitMargin = netProfit / totalSales;
    
    reports.push({
      id: `report_${Date.now()}_${i}`,
      userId: DEMO_USER.id,
      deviceId: DEMO_USER.deviceId,
      reportType: 'weekly' as const,
      startDate: new Date(reportDate.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      endDate: dateStr,
      reportData: {
        totalSales: Math.round(totalSales),
        totalExpenses: Math.round(totalExpenses),
        netProfit: Math.round(netProfit),
        profitMargin: Math.round(profitMargin * 100) / 100,
        topExpenseCategories: [
          { category: 'supplies', amount: Math.round(totalExpenses * 0.4) },
          { category: 'rent', amount: Math.round(totalExpenses * 0.3) },
          { category: 'utilities', amount: Math.round(totalExpenses * 0.15) },
          { category: 'wages', amount: Math.round(totalExpenses * 0.15) },
        ],
        insights: `Week ${i + 1}: Strong performance with ${Math.round(profitMargin * 100)}% profit margin. Sales ${totalSales > 85000 ? 'exceeded' : 'met'} expectations.`,
        summary: `Total profit of ₹${Math.round(netProfit).toLocaleString('en-IN')} for the week.`,
      },
      createdAt: reportDate.toISOString(),
      isArchived: false,
    });
  }
  
  return reports.reverse(); // Oldest first
}

// ============================================
// Generate Cash Flow Predictions
// ============================================

export function generateCashFlowPredictions() {
  const today = new Date();
  const predictions = [];
  
  // Generate predictions for next 7 days
  let currentBalance = 50000;
  
  for (let i = 1; i <= 7; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() + i);
    const dateStr = date.toISOString().split('T')[0];
    
    // Simulate daily cash flow
    const dailySales = 12000 + Math.random() * 3000;
    const dailyExpenses = 7000 + Math.random() * 2000;
    const dailyChange = dailySales - dailyExpenses;
    
    currentBalance += dailyChange;
    
    const trend = dailyChange > 1000 ? 'up' : dailyChange < -1000 ? 'down' : 'stable';
    const confidence = 0.75 + Math.random() * 0.15;
    
    predictions.push({
      date: dateStr,
      predictedBalance: Math.round(currentBalance),
      trend: trend as 'up' | 'down' | 'stable',
      confidence: Math.round(confidence * 100) / 100,
      isNegative: currentBalance < 0,
    });
  }
  
  return predictions;
}

// ============================================
// Generate Expense Alerts
// ============================================

export function generateExpenseAlerts() {
  return [
    {
      type: 'high_amount' as const,
      explanation: 'This expense is 45% higher than your average daily expenses',
      severity: 'warning' as const,
      expenseAmount: 10500,
      category: 'supplies',
    },
    {
      type: 'unusual_category' as const,
      explanation: 'You rarely spend on this category - only 2 times in the last 30 days',
      severity: 'warning' as const,
      expenseAmount: 5000,
      category: 'maintenance',
    },
  ];
}

// ============================================
// Generate Voice Entry Data
// ============================================

export function generateVoiceEntries() {
  const today = new Date();
  
  return [
    {
      id: `voice_${Date.now()}_001`,
      userId: DEMO_USER.id,
      s3Key: `voice-uploads/${DEMO_USER.id}/demo_voice_001.mp3`,
      status: 'completed' as const,
      extractedData: {
        sales: 15000,
        expenses: 8500,
        expenseCategory: 'supplies',
        inventoryChanges: null,
        date: today.toISOString().split('T')[0],
        confidence: 0.92,
      },
      errorMessage: null,
      createdAt: new Date(today.getTime() - 2 * 60 * 60 * 1000).toISOString(),
      processedAt: new Date(today.getTime() - 2 * 60 * 60 * 1000 + 30000).toISOString(),
    },
    {
      id: `voice_${Date.now()}_002`,
      userId: DEMO_USER.id,
      s3Key: `voice-uploads/${DEMO_USER.id}/demo_voice_002.mp3`,
      status: 'processing' as const,
      extractedData: null,
      errorMessage: null,
      createdAt: new Date(today.getTime() - 10 * 60 * 1000).toISOString(),
      processedAt: null,
    },
  ];
}

// ============================================
// Main Export: Complete Demo Dataset
// ============================================

export const COMPLETE_DEMO_DATA = {
  user: DEMO_USER,
  dailyEntries: generateDailyEntries(90),
  creditEntries: generateCreditEntries(),
  indices: generateIndices(),
  segmentData: generateSegmentData(),
  pendingTransactions: generatePendingTransactions(),
  reports: generateReports(),
  cashFlowPredictions: generateCashFlowPredictions(),
  expenseAlerts: generateExpenseAlerts(),
  voiceEntries: generateVoiceEntries(),
};

// ============================================
// Summary Statistics
// ============================================

export function getDemoDataSummary() {
  const data = COMPLETE_DEMO_DATA;
  
  return {
    user: {
      name: data.user.userName,
      shopName: data.user.shopName,
      businessType: data.user.business_type,
      cityTier: data.user.city_tier,
    },
    counts: {
      dailyEntries: data.dailyEntries.length,
      creditEntries: data.creditEntries.length,
      overdueCredits: data.creditEntries.filter(c => !c.isPaid && new Date(c.dueDate) < new Date()).length,
      indices: data.indices.length,
      pendingTransactions: data.pendingTransactions.length,
      reports: data.reports.length,
      cashFlowPredictions: data.cashFlowPredictions.length,
      expenseAlerts: data.expenseAlerts.length,
      voiceEntries: data.voiceEntries.length,
    },
    latestMetrics: {
      latestEntry: data.dailyEntries[data.dailyEntries.length - 1],
      latestIndex: data.indices[data.indices.length - 1],
      totalOutstandingCredit: data.creditEntries
        .filter(c => !c.isPaid)
        .reduce((sum, c) => sum + c.amount, 0),
    },
  };
}

// ============================================
// CLI Execution
// ============================================

if (require.main === module) {
  console.log('='.repeat(60));
  console.log('VYAPAR AI - DEMO DATA GENERATOR');
  console.log('='.repeat(60));
  console.log();
  
  const summary = getDemoDataSummary();
  
  console.log('📊 Demo User Profile:');
  console.log(`   Name: ${summary.user.name}`);
  console.log(`   Shop: ${summary.user.shopName}`);
  console.log(`   Type: ${summary.user.businessType} (${summary.user.cityTier})`);
  console.log();
  
  console.log('📈 Generated Data Counts:');
  console.log(`   Daily Entries: ${summary.counts.dailyEntries}`);
  console.log(`   Credit Entries: ${summary.counts.creditEntries} (${summary.counts.overdueCredits} overdue)`);
  console.log(`   Indices: ${summary.counts.indices}`);
  console.log(`   Pending Transactions: ${summary.counts.pendingTransactions}`);
  console.log(`   Reports: ${summary.counts.reports}`);
  console.log(`   Cash Flow Predictions: ${summary.counts.cashFlowPredictions}`);
  console.log(`   Expense Alerts: ${summary.counts.expenseAlerts}`);
  console.log(`   Voice Entries: ${summary.counts.voiceEntries}`);
  console.log();
  
  console.log('💰 Latest Metrics:');
  console.log(`   Today's Sales: ₹${summary.latestMetrics.latestEntry.totalSales.toLocaleString('en-IN')}`);
  console.log(`   Today's Expenses: ₹${summary.latestMetrics.latestEntry.totalExpense.toLocaleString('en-IN')}`);
  console.log(`   Today's Profit: ₹${summary.latestMetrics.latestEntry.estimatedProfit.toLocaleString('en-IN')}`);
  console.log(`   Profit Margin: ${(summary.latestMetrics.latestEntry.profitMargin * 100).toFixed(1)}%`);
  console.log(`   Outstanding Credit: ₹${summary.latestMetrics.totalOutstandingCredit.toLocaleString('en-IN')}`);
  console.log(`   Stress Index: ${summary.latestMetrics.latestIndex.stressIndex.score}/100`);
  console.log(`   Affordability Index: ${summary.latestMetrics.latestIndex.affordabilityIndex.score}/100`);
  console.log();
  
  console.log('✅ Demo data generated successfully!');
  console.log('📝 Use load-demo-data.ts to load this data into localStorage');
  console.log();
}
