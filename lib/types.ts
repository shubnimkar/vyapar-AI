// Type definitions for Vyapar AI

export type Language = 'en' | 'hi' | 'mr';

export type FileType = 'sales' | 'expenses' | 'inventory';

export interface ParsedCSV {
  headers: string[];
  rows: Record<string, string | number>[];
}

// NEW: Daily entry interface
export interface DailyEntry {
  date: string;                // ISO date string
  totalSales: number;
  totalExpense: number;
  cashInHand?: number;
  // Calculated fields (stored for history)
  estimatedProfit: number;
  expenseRatio: number;
  profitMargin: number;
  // NEW: Daily suggestions
  suggestions?: DailySuggestion[];
}

// NEW: Credit entry interface (extended for Udhaar Follow-up Helper)
export interface CreditEntry {
  id: string;
  userId: string;
  customerName: string;
  phoneNumber?: string;       // Optional, for WhatsApp reminders
  amount: number;
  dateGiven: string;          // ISO date string
  dueDate: string;            // ISO date string
  isPaid: boolean;
  paidDate?: string;          // ISO date string (optional)
  lastReminderAt?: string;    // ISO date string (optional) - when last reminder was sent
  createdAt: string;          // ISO date string
  updatedAt: string;          // ISO date string
}

// NEW: Credit summary interface
export interface CreditSummary {
  totalOutstanding: number;
  totalOverdue: number;
  overdueCount: number;
}

// NEW: Overdue credit with calculated fields (Udhaar Follow-up Helper)
export interface OverdueCredit extends CreditEntry {
  daysOverdue: number;
  daysSinceReminder: number | null;
}

// NEW: Overdue status calculation result (Udhaar Follow-up Helper)
export interface OverdueStatus {
  isOverdue: boolean;
  daysOverdue: number;
  meetsThreshold: boolean; // >= threshold days
}

// NEW: WhatsApp reminder configuration (Udhaar Follow-up Helper)
export interface ReminderConfig {
  phoneNumber: string;
  customerName: string;
  amount: number;
  dueDate: string;
  language: Language;
}

// NEW: Follow-up panel summary (Udhaar Follow-up Helper)
export interface FollowUpSummary {
  totalOverdue: number; // Count
  totalAmount: number;  // Sum of amounts
  oldestOverdue: number; // Max days overdue
}

// NEW: Health score breakdown interface
export interface HealthScoreBreakdown {
  marginScore: number;        // 0-30
  expenseScore: number;       // 0-30
  cashScore: number;          // 0-20
  creditScore: number;        // 0-20
}

// NEW: Daily calculations interface
export interface DailyCalculations {
  estimatedProfit: number;
  expenseRatio: number;
  profitMargin: number;
}

export interface SessionData {
  sessionId: string;
  createdAt: Date;
  lastAccessedAt: Date;
  
  // NEW: Daily entries (primary data source)
  dailyEntries: DailyEntry[];
  
  // NEW: Credit tracking
  creditEntries: CreditEntry[];
  
  // EXISTING: CSV data (advanced mode)
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
  // NEW: Deterministic calculations (Hybrid Intelligence Model)
  calculatedProfit?: number;
  calculatedBlockedInventory?: number;
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

// AWS Hackathon Features Types

// Voice Entry Types
export interface VoiceUpload {
  id: string;
  userId: string;
  s3Key: string;
  status: 'processing' | 'completed' | 'failed';
  extractedData: ExtractedVoiceData | null;
  errorMessage: string | null;
  createdAt: string;
  processedAt: string | null;
}

export interface ExtractedVoiceData {
  sales: number | null;
  expenses: number | null;
  expenseCategory: string | null;
  inventoryChanges: string | null;
  date: string;
  confidence: number;
}

// Cash Flow Prediction Types
export interface DailyPrediction {
  date: string;
  predictedBalance: number;
  trend: 'up' | 'down' | 'stable';
  confidence: number;
  isNegative: boolean;
}

export interface CashFlowPredictionResult {
  predictions: DailyPrediction[];
  insufficientData: boolean;
  historicalDays: number;
}

// Report Types
export interface DailyReport {
  id: string;
  userId: string;
  date: string;
  generatedAt: string;
  totalSales: number;
  totalExpenses: number;
  netProfit: number;
  topExpenseCategories: ExpenseCategory[];
  insights: string;
}

export interface ExpenseCategory {
  category: string;
  amount: number;
}

// Alert Types
export interface ExpenseAlert {
  type: 'high_amount' | 'unusual_category' | 'unusual_timing';
  explanation: string;
  severity: 'warning' | 'critical';
  expenseAmount: number;
  category: string;
}

export interface AnomalyDetectionResult {
  isAnomaly: boolean;
  type?: string;
  explanation?: string;
  severity?: string;
}

// User Preferences
export interface UserPreferences {
  userId: string;
  automationEnabled: boolean;
  reportTime: string;
  language: 'en' | 'hi';
  updatedAt: string;
}

// API Request/Response Types
export interface VoiceEntryRequest {
  audioFile: File;
  userId: string;
  language: 'hi-IN';
}

export interface VoiceEntryResponse {
  success: boolean;
  data?: ExtractedVoiceData;
  error?: string;
}

export interface PredictCashflowRequest {
  userId: string;
}

export interface PredictCashflowResponse {
  success: boolean;
  predictions?: DailyPrediction[];
  error?: string;
  insufficientData?: boolean;
}

export interface ExpenseAlertRequest {
  userId: string;
  expense: {
    amount: number;
    category: string;
    date: string;
  };
}

export interface ExpenseAlertResponse {
  success: boolean;
  alert?: ExpenseAlert;
  error?: string;
}

export interface ReportsListResponse {
  success: boolean;
  reports?: DailyReport[];
  automationEnabled?: boolean;
  error?: string;
}

export interface ToggleAutomationRequest {
  userId: string;
  enabled: boolean;
}

// ============================================
// User Profile & Data Management Types
// ============================================

export interface UserProfile {
  id: string;
  phoneNumber: string;
  deviceId?: string;
  shopName: string;
  userName: string;
  language: Language;
  businessType?: string;
  city?: string;
  createdAt: string;
  lastActiveAt: string;
  isActive: boolean;
  subscriptionTier: 'free' | 'premium';
  preferences: UserProfilePreferences;
  deletionRequestedAt?: string;
  deletionScheduledAt?: string;
}

export interface UserProfilePreferences {
  dataRetentionDays: number; // 30-365
  autoArchive: boolean;
  notificationsEnabled: boolean;
  currency: string; // ISO 4217 code
}

export interface ProfileSetupData {
  shopName: string;
  userName: string;
  language: Language;
  businessType?: string;
  city?: string;
}

export interface DeletionInfo {
  requestedAt: string;
  scheduledAt: string;
  daysRemaining: number;
}

export interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  errors?: ValidationError[];
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

// Report interface for automated daily reports
export interface Report {
  id: string;
  userId: string;
  deviceId: string;
  reportType: 'daily' | 'weekly' | 'monthly' | 'custom';
  startDate: string;
  endDate: string;
  reportData: ReportData;
  createdAt: string;
  isArchived: boolean;
}

export interface ReportData {
  totalSales: number;
  totalExpenses: number;
  netProfit: number;
  profitMargin: number;
  topExpenseCategories: ExpenseCategory[];
  insights: string;
  summary: string;
}

// ============================================
// Daily Health Coach Types
// ============================================

export type SeverityType = 'critical' | 'warning' | 'info';
export type RuleType = 'high_credit' | 'margin_drop' | 'low_cash' | 'healthy_state';

export interface DailySuggestion {
  id: string;                        // Unique ID (format: "suggestion_{rule}_{date}")
  created_at: string;                // ISO timestamp
  severity: SeverityType;
  title: string;                     // Localized title
  description: string;               // Localized description
  dismissed_at?: string;             // ISO timestamp when dismissed (optional)

  // Metadata for tracking
  rule_type: RuleType;
  context_data?: Record<string, any>;  // Additional context (e.g., credit_ratio, margin_values)
}

export interface SuggestionContext {
  // Core metrics
  health_score: number;              // 0-100
  total_sales: number;               // Total sales for the day
  total_expenses: number;            // Total expenses for the day
  total_credit_outstanding: number;  // Total unpaid credit

  // Calculated metrics
  current_margin: number;            // Current profit margin (0-1)
  avg_margin_last_30_days: number | null;  // Average margin over 30 days
  cash_buffer_days: number | null;   // Days of operation with current cash

  // User context
  language: Language;                // 'en' | 'hi' | 'mr'
  date: string;                      // ISO date string for the entry
}

