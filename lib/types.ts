// Type definitions for Vyapar AI

export type Language = 'en' | 'hi' | 'mr';

export type FileType = 'sales' | 'expenses' | 'inventory';

export interface ParsedCSV {
  headers: string[];
  rows: Record<string, string | number>[];
}

export interface SessionData {
  sessionId: string;
  createdAt: Date;
  lastAccessedAt: Date;
  salesData?: ParsedCSV;
  expensesData?: ParsedCSV;
  inventoryData?: ParsedCSV;
  conversationHistory: ChatMessage[];
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export type SeverityLevel = 'critical' | 'warning' | 'good' | 'info';

export interface ActionableRecommendation {
  action: string;
  impact: string;
  priority: number;
  severity: SeverityLevel;
}

export interface BusinessInsights {
  trueProfitAnalysis: string;
  lossMakingProducts: string[];
  blockedInventoryCash: string;
  abnormalExpenses: string[];
  cashflowForecast: string;
  recommendations?: ActionableRecommendation[];
  severity?: SeverityLevel;
  alerts?: Alert[];
  chartData?: ChartData;
}

export interface Alert {
  type: 'inventory' | 'expense' | 'sales' | 'cashflow';
  severity: SeverityLevel;
  message: string;
  icon: string;
}

export interface ChartData {
  profitTrend?: {
    labels: string[];
    values: number[];
  };
  productSales?: {
    labels: string[];
    values: number[];
  };
  expenseBreakdown?: {
    labels: string[];
    values: number[];
  };
  inventoryValue?: {
    labels: string[];
    values: number[];
  };
}

export interface BenchmarkData {
  yourMetric: number;
  industryAverage: number;
  topPerformers: number;
  metricName: string;
  unit: string;
}
