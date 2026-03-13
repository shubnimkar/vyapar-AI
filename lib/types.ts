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
  shopName?: string;
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
  email?: string;
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

  // Persona fields for AI personalization and segment benchmark
  business_type: BusinessType;
  city_tier?: CityTier;
  explanation_mode: 'simple' | 'detailed';
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
  email?: string;
  language: Language;
  businessType?: BusinessType;
  city?: CityTier;
  business_type?: BusinessType;
  city_tier?: CityTier | null;
  explanation_mode?: 'simple' | 'detailed';
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
  title: string;                     // Localized title (for backward compatibility)
  description: string;               // Localized description (for backward compatibility)
  dismissed_at?: string;             // ISO timestamp when dismissed (optional)

  // Translation keys for real-time language switching
  title_key: string;                 // Translation key for title (e.g., 'suggestions.high_credit.title')
  description_key: string;           // Translation key for description
  description_params?: Record<string, string>;  // Parameters for description interpolation

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

// ============================================
// Click-to-Add Transactions Types
// ============================================

export type TransactionSource = 'receipt' | 'csv' | 'voice';
export type TransactionType = 'expense' | 'sale';

export interface InferredTransaction {
  id: string;                        // Deterministic hash
  date: string;                      // ISO date string (YYYY-MM-DD)
  type: TransactionType;
  vendor_name?: string;
  category?: string;
  amount: number;
  source: TransactionSource;
  created_at: string;                // ISO timestamp
  deferred_at?: string;              // ISO timestamp (if user clicked Later)
  raw_data?: any;                    // Original OCR/CSV data for debugging
}


// ============================================
// Stress & Affordability Index Types
// ============================================

/**
 * Stress index component breakdown
 */
export interface StressComponentBreakdown {
  creditRatioScore: number;      // 0-40 points (40% weight)
  cashBufferScore: number;        // 0-35 points (35% weight)
  expenseVolatilityScore: number; // 0-25 points (25% weight)
}

/**
 * Stress index calculation result
 */
export interface StressIndexResult {
  score: number;                  // 0-100 (higher = more stress)
  breakdown: StressComponentBreakdown;
  calculatedAt: string;           // ISO timestamp
  inputParameters: {
    creditRatio: number;
    cashBuffer: number;
    expenseVolatility: number;
  };
}

/**
 * Affordability index component breakdown
 */
export interface AffordabilityComponentBreakdown {
  costToProfitRatio: number;
  affordabilityCategory: 'Easily Affordable' | 'Affordable' | 'Stretch' | 'Risky' | 'Not Recommended';
}

/**
 * Affordability index calculation result
 */
export interface AffordabilityIndexResult {
  score: number;                  // 0-100 (higher = more affordable)
  breakdown: AffordabilityComponentBreakdown;
  calculatedAt: string;           // ISO timestamp
  inputParameters: {
    plannedCost: number;
    avgMonthlyProfit: number;
  };
}

/**
 * Combined index data for storage and display
 */
export interface IndexData {
  userId: string;
  date: string;                   // ISO date (YYYY-MM-DD)
  stressIndex: StressIndexResult | null;
  affordabilityIndex: AffordabilityIndexResult | null;
  dataPoints: number;             // Number of historical days used
  calculationPeriod: {
    startDate: string;
    endDate: string;
  };
  createdAt: string;              // ISO timestamp
  syncedAt?: string;              // ISO timestamp (when synced to DynamoDB)
}

/**
 * Planned expense with affordability assessment
 */
export interface PlannedExpense {
  id: string;
  userId: string;
  description: string;
  amount: number;
  affordabilityIndex: AffordabilityIndexResult;
  createdAt: string;
  isPurchased: boolean;
  purchasedAt?: string;
}

/**
 * Color coding for visual indicators
 */
export type StressColor = 'green' | 'yellow' | 'red';
export type AffordabilityColor = 'green' | 'yellow' | 'red';

/**
 * Visual indicator configuration
 */
export interface IndexVisualConfig {
  score: number;
  color: StressColor | AffordabilityColor;
  label: string;
  severity: 'low' | 'medium' | 'high';
}

// ============================================
// Segment Benchmark Types
// ============================================

/**
 * City tier classification
 */
export type CityTier = 'tier1' | 'tier2' | 'tier3' | 'rural';

/**
 * Business type classification
 */
export type BusinessType = 'kirana' | 'salon' | 'pharmacy' | 'restaurant' | 'other';

/**
 * Performance comparison category
 */
export type ComparisonCategory = 'above_average' | 'at_average' | 'below_average';

/**
 * Segment aggregate statistics
 */
export interface SegmentData {
  segmentKey: string;           // Format: SEGMENT#{tier}#{type}
  medianHealthScore: number;    // 0-100
  medianMargin: number;         // 0-1 (e.g., 0.25 = 25%)
  sampleSize: number;           // Number of businesses in segment
  lastUpdated: string;          // ISO timestamp
}

/**
 * Cached segment data with cache metadata
 */
export interface CachedSegmentData extends SegmentData {
  cachedAt: string;             // ISO timestamp
}

/**
 * User metrics for comparison
 */
export interface UserMetrics {
  healthScore: number;          // 0-100
  profitMargin: number;         // 0-1
}

/**
 * Comparison result for a single metric
 */
export interface MetricComparison {
  userValue: number;
  segmentMedian: number;
  percentile: number;           // 0-100
  category: ComparisonCategory;
}

/**
 * Complete benchmark comparison result
 */
export interface BenchmarkComparison {
  healthScoreComparison: MetricComparison;
  marginComparison: MetricComparison;
  segmentInfo: {
    segmentKey: string;
    sampleSize: number;
    lastUpdated: string;
  };
  calculatedAt: string;
}

/**
 * Visual indicator configuration for segment benchmark
 */
export interface VisualIndicator {
  color: 'green' | 'yellow' | 'red';
  icon: string;
  bgColor: string;
  borderColor: string;
}
