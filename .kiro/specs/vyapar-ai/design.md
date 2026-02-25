# Design Document: Vyapar AI

## Overview

Vyapar AI is a Next.js 14 web application that provides a daily business health companion for small shop owners in India. The system uses a **Hybrid Intelligence Model** combining deterministic calculations with AI-enhanced explanations, built on a stateless, session-based architecture where all data remains in memory during user interaction, with no persistent storage.

**Product Positioning**: Daily Business Health Companion (not just CSV analyzer)

The application provides instant deterministic calculations for daily business metrics (profit, health score, credit tracking) and uses AWS Bedrock (Claude/Titan models) to enhance these calculations with simple, actionable explanations in Hindi, Marathi, or English.

Key architectural decisions:
- **Server Components for Static Content**: Next.js App Router with server components for initial page loads
- **API Routes for Dynamic Operations**: All data processing, AI calls, and CSV parsing happen in API routes
- **In-Memory Session Storage**: No database—data lives only in memory during the session
- **Client-Side Language Preference**: localStorage stores language selection for persistence across visits
- **Hybrid Intelligence Model**: Deterministic core calculations + AI enhancement layer (NOT AI-first)
- **Daily Entry Primary**: Quick daily entry is the main interface; CSV upload is advanced mode
- **Trust-First Design**: Prominent privacy messaging about government non-connection

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Browser (Client)                      │
│  ┌────────────────┐  ┌──────────────┐  ┌─────────────────┐ │
│  │  Daily Entry   │  │  Language    │  │  Voice Synthesis│ │
│  │  Form          │  │  (localStorage)│ │  (Web Speech)  │ │
│  └────────────────┘  └──────────────┘  └─────────────────┘ │
│  ┌────────────────┐  ┌──────────────┐  ┌─────────────────┐ │
│  │  Health Score  │  │  Credit      │  │  File Upload    │ │
│  │  Display       │  │  Module      │  │  (PapaParse)    │ │
│  └────────────────┘  └──────────────┘  └─────────────────┘ │
│           │                   │                   │          │
└───────────┼───────────────────┼───────────────────┼──────────┘
            │                   │                   │
            ▼                   ▼                   ▼
┌─────────────────────────────────────────────────────────────┐
│                    Next.js App Router                        │
│  ┌────────────────────────────────────────────────────────┐ │
│  │              Server Components (Static)                 │ │
│  │  - Landing page with trust banner                       │ │
│  │  - Daily entry interface (primary)                      │ │
│  │  - Health score display                                 │ │
│  │  - Credit tracking interface                            │ │
│  │  - Advanced mode: CSV upload interface                  │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │                   API Routes                            │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌─────────────┐  │ │
│  │  │/api/daily    │  │ /api/upload  │  │/api/analyze │  │ │
│  │  │              │  │              │  │             │  │ │
│  │  │- Calculate   │  │ - Parse CSV  │  │- AI Analysis│  │ │
│  │  │  profit      │  │ - Validate   │  │- Insights   │  │ │
│  │  │- Calculate   │  │ - Store in   │  │  Generation │  │ │
│  │  │  health score│  │   memory     │  │             │  │ │
│  │  │- NO AI       │  │              │  │             │  │ │
│  │  └──────────────┘  └──────────────┘  └─────────────┘  │ │
│  │  ┌──────────────┐  ┌──────────────┐                    │ │
│  │  │  /api/ask    │  │/api/explain  │                    │ │
│  │  │              │  │              │                    │ │
│  │  │ - Q&A AI     │  │- AI explains │                    │ │
│  │  │ - Context    │  │  deterministic│                   │ │
│  │  │   Aware      │  │  results     │                    │ │
│  │  └──────────────┘  └──────────────┘                    │ │
│  │         │                  │                  │         │ │
│  └─────────┼──────────────────┼──────────────────┼─────────┘ │
│            │                  │                  │           │
│            ▼                  ▼                  ▼           │
│  ┌────────────────────────────────────────────────────────┐ │
│  │            In-Memory Session Store                      │ │
│  │  - Daily entries (date, sales, expenses, cash)          │ │
│  │  - Credit entries (customer, amount, dueDate, isPaid)   │ │
│  │  - Uploaded CSV data (sales, expenses, inventory)       │ │
│  │  - Parsed data structures                               │ │
│  │  - Conversation history                                 │ │
│  │  - Session ID mapping                                   │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │         Deterministic Calculation Engine                │ │
│  │  - Profit = Sales - Expenses                            │ │
│  │  - Expense Ratio = Expenses / Sales                     │ │
│  │  - Health Score (0-100 formula)                         │ │
│  │  - Credit Outstanding (sum unpaid)                      │ │
│  │  - Overdue Amount (sum past due date)                   │ │
│  │  - Blocked Inventory Cash (qty × cost)                  │ │
│  │  → ALL calculations < 1 second, NO AI                   │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │   AWS Bedrock    │
                    │  (Claude/Titan)  │
                    │                  │
                    │ - Explanations   │
                    │ - Q&A            │
                    │ - Recommendations│
                    │ - Translation    │
                    │   refinement     │
                    │                  │
                    │ NOT for numeric  │
                    │ calculations!    │
                    └──────────────────┘
```

### Technology Stack

- **Frontend**: Next.js 14 App Router, React Server Components, Tailwind CSS
- **CSV Parsing**: PapaParse (client-side for preview, server-side for processing)
- **AI Engine**: AWS Bedrock (Claude 3 or Titan models)
- **Voice**: Web Speech API (browser native)
- **Storage**: In-memory JavaScript objects (no database)
- **Language Persistence**: Browser localStorage
- **Deployment**: Vercel or AWS Lambda (serverless)

## Components and Interfaces

### 1. Trust Banner Component (Client) **[NEW]**

**Purpose**: Display persistent privacy messaging

**Interface**:
```typescript
interface TrustBannerProps {
  language: Language;
}
```

**Behavior**:
- Display at top of all pages
- Show message: "Your data is private. Not connected to GST or any government system."
- Translate message based on language
- Non-dismissible, always visible
- Styled with trust-building colors (blue/green)

### 2. Daily Entry Form Component (Client) **[NEW - PRIMARY INTERFACE]**

**Purpose**: Enable quick daily business data entry

**Interface**:
```typescript
interface DailyEntryFormProps {
  sessionId: string | null;
  language: Language;
  onEntryComplete: (entry: DailyEntry, calculations: DailyCalculations) => void;
}

interface DailyEntry {
  date: string; // ISO date string
  totalSales: number;
  totalExpense: number;
  cashInHand?: number;
}

interface DailyCalculations {
  estimatedProfit: number; // totalSales - totalExpense
  expenseRatio: number; // totalExpense / totalSales
  profitMargin: number; // estimatedProfit / totalSales
}
```

**Behavior**:
- Display three input fields: Sales (₹), Expenses (₹), Cash in Hand (₹, optional)
- On submit, calculate profit and expense ratio deterministically (NO AI)
- Display results instantly (< 1 second)
- Store entry in session store
- Show visual feedback (profit in green if positive, red if negative)
- Works offline/without AWS Bedrock
- Large, touch-friendly inputs for mobile

### 3. Health Score Display Component (Client) **[NEW]**

**Purpose**: Show deterministic business health score

**Interface**:
```typescript
interface HealthScoreProps {
  score: number; // 0-100
  breakdown: HealthScoreBreakdown;
  language: Language;
  onExplainClick?: () => void; // Optional AI explanation
}

interface HealthScoreBreakdown {
  marginScore: number; // 0-30
  expenseScore: number; // 0-30
  cashScore: number; // 0-20
  creditScore: number; // 0-20
}
```

**Behavior**:
- Display score as "Business Health Score: X/100"
- Color-code: < 50 red, 50-75 yellow, > 75 green
- Show visual progress bar
- Display breakdown of score components
- Optional "Explain Score" button triggers AI explanation
- Calculate score deterministically without AI
- Update immediately when data changes

### 4. Credit Tracking Component (Client) **[NEW]**

**Purpose**: Track customer credit (udhaar) and overdue payments

**Interface**:
```typescript
interface CreditTrackingProps {
  sessionId: string;
  language: Language;
}

interface CreditEntry {
  id: string;
  customerName: string;
  amount: number;
  dueDate: string; // ISO date string
  isPaid: boolean;
  createdAt: string;
}

interface CreditSummary {
  totalOutstanding: number; // sum of unpaid
  totalOverdue: number; // sum of unpaid past due date
  overdueCount: number; // count of overdue customers
}
```

**Behavior**:
- Form to add credit entry (customer name, amount, due date)
- List of credit entries with paid/unpaid status
- Calculate and display summary deterministically (NO AI)
- Mark entries as paid
- Highlight overdue entries in red
- Feed into health score calculation
- Store in session memory only

### 5. File Upload Component (Client) **[EXISTING - NOW ADVANCED MODE]**

**Purpose**: Handle CSV file selection and client-side preview

**Interface**:
```typescript
interface UploadComponentProps {
  onUploadComplete: (fileType: 'sales' | 'expenses' | 'inventory', sessionId: string) => void;
  language: Language;
}

interface CSVPreview {
  headers: string[];
  rows: string[][];
  rowCount: number;
}
```

**Behavior**:
- User selects CSV file via file input
- PapaParse parses file client-side for preview (first 5 rows)
- Display preview table with headers and sample rows
- On confirmation, send file to `/api/upload` endpoint
- Handle upload errors and display in selected language
- **Now positioned as "Advanced Mode" in UI, not primary interface**

### 6. Language Selector Component (Client) **[EXISTING]**

**Purpose**: Allow language selection and persist preference

**Interface**:
```typescript
interface LanguageSelectorProps {
  currentLanguage: Language;
  onLanguageChange: (lang: Language) => void;
}

type Language = 'en' | 'hi' | 'mr';
```

**Behavior**:
- Display language options (English, हिंदी, मराठी)
- On selection, update localStorage: `localStorage.setItem('vyapar-lang', language)`
- Trigger re-render of all text content
- Show visual indicator for selected language

### 7. Insights Display Component (Client) **[EXISTING]**

**Purpose**: Render AI-generated insights with optional voice synthesis

**Interface**:
```typescript
interface InsightsDisplayProps {
  insights: BusinessInsights;
  language: Language;
}

interface BusinessInsights {
  trueProfitAnalysis: string;
  lossMakingProducts: string[];
  blockedInventoryCash: string;
  abnormalExpenses: string[];
  cashflowForecast: string;
}
```

**Behavior**:
- Display insights in categorized sections with icons
- Each section has a "🔊 Listen" button for voice synthesis
- Use Web Speech API: `speechSynthesis.speak(utterance)`
- Format currency values with ₹ symbol
- Mobile-responsive card layout

### 8. Q&A Chat Component (Client) **[EXISTING]**

**Purpose**: Enable conversational questions about business data

**Interface**:
```typescript
interface QAChatProps {
  sessionId: string;
  language: Language;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}
```

**Behavior**:
- Text input for typing questions
- Optional voice input button (Web Speech API recognition)
- Display conversation history
- Send questions to `/api/ask` with session context
- Show loading indicator during AI response

### 9. Daily Entry API Route (`/api/daily`) **[NEW]**

**Purpose**: Process daily entry and calculate deterministic metrics

**Interface**:
```typescript
export async function POST(request: Request): Promise<Response>

interface DailyEntryRequest {
  sessionId?: string;
  date: string;
  totalSales: number;
  totalExpense: number;
  cashInHand?: number;
  language: Language;
}

interface DailyEntryResponse {
  success: boolean;
  sessionId: string;
  calculations: DailyCalculations;
  healthScore: number;
  healthBreakdown: HealthScoreBreakdown;
  error?: string;
}
```

**Behavior**:
1. Generate or retrieve session ID
2. Validate input (positive numbers, valid date)
3. Calculate deterministically (NO AI):
   - estimatedProfit = totalSales - totalExpense
   - expenseRatio = totalExpense / totalSales
   - profitMargin = estimatedProfit / totalSales
4. Store entry in session: `sessionStore[sessionId].dailyEntries.push(entry)`
5. Calculate health score using deterministic formula
6. Return calculations and health score immediately (< 1 second)
7. NO AWS Bedrock calls in this route

**Health Score Calculation**:
```typescript
function calculateHealthScore(
  profitMargin: number,
  expenseRatio: number,
  cashInHand: number | undefined,
  creditData: CreditSummary
): number {
  let score = 0;
  
  // Margin score (0-30)
  if (profitMargin > 0.20) score += 30;
  else if (profitMargin > 0.10) score += 20;
  else if (profitMargin > 0) score += 10;
  
  // Expense score (0-30)
  if (expenseRatio < 0.60) score += 30;
  else if (expenseRatio < 0.75) score += 20;
  else if (expenseRatio < 0.90) score += 10;
  
  // Cash score (0-20)
  if (cashInHand !== undefined && cashInHand > 0) score += 20;
  else if (cashInHand !== undefined && cashInHand >= 0) score += 10;
  
  // Credit score (0-20)
  if (creditData.overdueCount === 0) score += 20;
  else if (creditData.overdueCount <= 2) score += 10;
  
  return Math.min(100, Math.max(0, score));
}
```

### 10. Upload API Route (`/api/upload`) **[EXISTING]**

**Purpose**: Parse, validate, and store CSV data in memory

**Interface**:
```typescript
export async function POST(request: Request): Promise<Response>

interface UploadRequest {
  file: File;
  fileType: 'sales' | 'expenses' | 'inventory';
  sessionId?: string;
}

interface UploadResponse {
  success: boolean;
  sessionId: string;
  preview: CSVPreview;
  error?: string;
}
```

**Behavior**:
1. Generate or retrieve session ID
2. Parse CSV using PapaParse server-side
3. Validate required columns based on file type:
   - Sales: date, product, quantity, amount
   - Expenses: date, category, amount, description
   - Inventory: product, quantity, cost_price, selling_price
4. Store parsed data in memory: `sessionStore[sessionId][fileType] = parsedData`
5. Return preview and session ID

### 11. Analyze API Route (`/api/analyze`) **[EXISTING - MODIFIED]**

**Purpose**: Send data to AWS Bedrock for AI explanations (NOT calculations)

**Interface**:
```typescript
export async function POST(request: Request): Promise<Response>

interface AnalyzeRequest {
  sessionId: string;
  language: Language;
  deterministicResults?: {
    profit: number;
    expenseRatio: number;
    healthScore: number;
    blockedInventory: number;
  };
}

interface AnalyzeResponse {
  success: boolean;
  insights: BusinessInsights;
  error?: string;
}
```

**Behavior**:
1. Retrieve uploaded data from memory using session ID
2. **Calculate deterministic metrics first (if not provided)**:
   - True profit from sales/expenses
   - Blocked inventory cash from inventory data
   - Expense patterns
3. Construct analysis prompt with data context AND deterministic results
4. Call AWS Bedrock for **explanations and recommendations** (NOT calculations)
5. Parse AI response into insight categories
6. Return insights in requested language

**Modified Prompt Strategy**:
```
You are explaining business metrics to a small shop owner in {language}.

**Calculated Metrics** (already computed):
- Profit: ₹{profit}
- Expense Ratio: {expenseRatio}%
- Health Score: {healthScore}/100
- Blocked Inventory: ₹{blockedInventory}

**Your Task**:
Explain what these numbers mean in simple language. Provide actionable recommendations.
DO NOT recalculate these numbers. Focus on interpretation and advice.

**Data Context**:
{formatted_data}

Provide insights in simple {language} without jargon.
```

### 12. Explain API Route (`/api/explain`) **[NEW]**

**Purpose**: Get AI explanation for deterministic results

**Interface**:
```typescript
export async function POST(request: Request): Promise<Response>

interface ExplainRequest {
  sessionId: string;
  metric: 'healthScore' | 'profit' | 'credit' | 'expenses';
  value: number;
  context: Record<string, any>;
  language: Language;
}

interface ExplainResponse {
  success: boolean;
  explanation: string;
  recommendations: string[];
  error?: string;
}
```

**Behavior**:
1. Retrieve session context
2. Construct focused prompt for specific metric
3. Call AWS Bedrock for explanation only
4. Return simple language explanation
5. Provide 2-3 actionable recommendations

### 13. Ask API Route (`/api/ask`) **[EXISTING]**

**Purpose**: Handle conversational Q&A with data context

**Interface**:
```typescript
export async function POST(request: Request): Promise<Response>

interface AskRequest {
  sessionId: string;
  question: string;
  language: Language;
}

interface AskResponse {
  success: boolean;
  answer: string;
  error?: string;
}
```

**Behavior**:
1. Retrieve session data and conversation history
2. Construct prompt with question + data context + history
3. Call AWS Bedrock for answer
4. Store question and answer in conversation history
5. Return answer in requested language

## Data Models

### Session Store (In-Memory) **[UPDATED]**

```typescript
interface SessionData {
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
  
  // EXISTING: Conversation history
  conversationHistory: ChatMessage[];
}

interface DailyEntry {
  date: string; // ISO date string
  totalSales: number;
  totalExpense: number;
  cashInHand?: number;
  // Calculated fields (stored for history)
  estimatedProfit: number;
  expenseRatio: number;
  profitMargin: number;
}

interface CreditEntry {
  id: string;
  customerName: string;
  amount: number;
  dueDate: string; // ISO date string
  isPaid: boolean;
  createdAt: string;
  paidAt?: string;
}

interface ParsedCSV {
  headers: string[];
  rows: Record<string, string | number>[];
}

// Global in-memory store
const sessionStore: Map<string, SessionData> = new Map();

// Cleanup function (run periodically)
function cleanupExpiredSessions() {
  const now = Date.now();
  const EXPIRY_TIME = 2 * 60 * 60 * 1000; // 2 hours
  
  for (const [sessionId, data] of sessionStore.entries()) {
    if (now - data.lastAccessedAt.getTime() > EXPIRY_TIME) {
      sessionStore.delete(sessionId);
    }
  }
}
```

### Deterministic Calculation Utilities **[NEW]**

```typescript
// lib/calculations.ts

export function calculateProfit(sales: number, expenses: number): number {
  return sales - expenses;
}

export function calculateExpenseRatio(expenses: number, sales: number): number {
  if (sales === 0) return 0;
  return expenses / sales;
}

export function calculateProfitMargin(profit: number, sales: number): number {
  if (sales === 0) return 0;
  return profit / sales;
}

export function calculateHealthScore(
  profitMargin: number,
  expenseRatio: number,
  cashInHand: number | undefined,
  creditSummary: CreditSummary
): { score: number; breakdown: HealthScoreBreakdown } {
  const breakdown: HealthScoreBreakdown = {
    marginScore: 0,
    expenseScore: 0,
    cashScore: 0,
    creditScore: 0,
  };
  
  // Margin score (0-30)
  if (profitMargin > 0.20) breakdown.marginScore = 30;
  else if (profitMargin > 0.10) breakdown.marginScore = 20;
  else if (profitMargin > 0) breakdown.marginScore = 10;
  
  // Expense score (0-30)
  if (expenseRatio < 0.60) breakdown.expenseScore = 30;
  else if (expenseRatio < 0.75) breakdown.expenseScore = 20;
  else if (expenseRatio < 0.90) breakdown.expenseScore = 10;
  
  // Cash score (0-20)
  if (cashInHand !== undefined) {
    if (cashInHand > 0) breakdown.cashScore = 20;
    else if (cashInHand >= 0) breakdown.cashScore = 10;
  }
  
  // Credit score (0-20)
  if (creditSummary.overdueCount === 0) breakdown.creditScore = 20;
  else if (creditSummary.overdueCount <= 2) breakdown.creditScore = 10;
  
  const score = breakdown.marginScore + breakdown.expenseScore + 
                breakdown.cashScore + breakdown.creditScore;
  
  return { score: Math.min(100, Math.max(0, score)), breakdown };
}

export function calculateCreditSummary(entries: CreditEntry[]): CreditSummary {
  const now = new Date();
  const unpaidEntries = entries.filter(e => !e.isPaid);
  
  const totalOutstanding = unpaidEntries.reduce((sum, e) => sum + e.amount, 0);
  
  const overdueEntries = unpaidEntries.filter(e => new Date(e.dueDate) < now);
  const totalOverdue = overdueEntries.reduce((sum, e) => sum + e.amount, 0);
  const overdueCount = overdueEntries.length;
  
  return { totalOutstanding, totalOverdue, overdueCount };
}

export function calculateBlockedInventory(inventory: ParsedCSV): number {
  return inventory.rows.reduce((sum, row) => {
    const quantity = Number(row.quantity) || 0;
    const costPrice = Number(row.cost_price) || 0;
    return sum + (quantity * costPrice);
  }, 0);
}

// All calculations are pure functions with no side effects
// All calculations complete in < 1ms
// No AI or external API calls
```

### Language Translations **[UPDATED]**

```typescript
interface Translations {
  [key: string]: {
    en: string;
    hi: string;
    mr: string;
  };
}

const translations: Translations = {
  // NEW: Trust banner
  trustBanner: {
    en: "Your data is private. Not connected to GST or any government system.",
    hi: "आपका डेटा निजी है। GST या किसी सरकारी सिस्टम से जुड़ा नहीं है।",
    mr: "तुमचा डेटा खाजगी आहे। GST किंवा कोणत्याही सरकारी प्रणालीशी जोडलेला नाही."
  },
  
  // NEW: Daily entry
  dailyEntry: {
    en: "Daily Entry",
    hi: "दैनिक प्रविष्टि",
    mr: "दैनिक नोंद"
  },
  totalSales: {
    en: "Total Sales Today (₹)",
    hi: "आज की कुल बिक्री (₹)",
    mr: "आजची एकूण विक्री (₹)"
  },
  totalExpenses: {
    en: "Total Expenses Today (₹)",
    hi: "आज का कुल खर्च (₹)",
    mr: "आजचा एकूण खर्च (₹)"
  },
  cashInHand: {
    en: "Cash in Hand (₹)",
    hi: "हाथ में नकद (₹)",
    mr: "हातातील रोकड (₹)"
  },
  submitEntry: {
    en: "Submit",
    hi: "जमा करें",
    mr: "सबमिट करा"
  },
  
  // NEW: Health score
  healthScore: {
    en: "Business Health Score",
    hi: "व्यापार स्वास्थ्य स्कोर",
    mr: "व्यवसाय आरोग्य स्कोअर"
  },
  explainScore: {
    en: "Explain Score",
    hi: "स्कोर समझाएं",
    mr: "स्कोअर समजावून सांगा"
  },
  
  // NEW: Credit tracking
  creditTracking: {
    en: "Credit Tracking (Udhaar)",
    hi: "उधार ट्रैकिंग",
    mr: "उधार ट्रॅकिंग"
  },
  customerName: {
    en: "Customer Name",
    hi: "ग्राहक का नाम",
    mr: "ग्राहकाचे नाव"
  },
  amount: {
    en: "Amount (₹)",
    hi: "राशि (₹)",
    mr: "रक्कम (₹)"
  },
  dueDate: {
    en: "Due Date",
    hi: "देय तिथि",
    mr: "देय तारीख"
  },
  totalOutstanding: {
    en: "Total Outstanding",
    hi: "कुल बकाया",
    mr: "एकूण थकबाकी"
  },
  totalOverdue: {
    en: "Total Overdue",
    hi: "कुल अतिदेय",
    mr: "एकूण थकीत"
  },
  overdueCustomers: {
    en: "Overdue Customers",
    hi: "अतिदेय ग्राहक",
    mr: "थकीत ग्राहक"
  },
  
  // NEW: Results
  estimatedProfit: {
    en: "Estimated Profit",
    hi: "अनुमानित लाभ",
    mr: "अंदाजे नफा"
  },
  expenseRatio: {
    en: "Expense Ratio",
    hi: "खर्च अनुपात",
    mr: "खर्च प्रमाण"
  },
  
  // EXISTING: CSV upload (now advanced mode)
  advancedMode: {
    en: "Advanced Analysis (CSV Upload)",
    hi: "उन्नत विश्लेषण (CSV अपलोड)",
    mr: "प्रगत विश्लेषण (CSV अपलोड)"
  },
  uploadCSV: {
    en: "Upload CSV File",
    hi: "CSV फ़ाइल अपलोड करें",
    mr: "CSV फाइल अपलोड करा"
  },
  analyze: {
    en: "Analyze My Business",
    hi: "मेरे व्यापार का विश्लेषण करें",
    mr: "माझ्या व्यवसायाचे विश्लेषण करा"
  },
  // ... more translations
};
```

## Prompt Engineering Strategy **[UPDATED FOR HYBRID MODEL]**

### Analysis Prompt Template **[MODIFIED]**

The analysis prompt now receives pre-calculated deterministic results and focuses on explanation rather than calculation:

```
You are a business health advisor for small retail shops in India. You are explaining pre-calculated business metrics in {language}.

**IMPORTANT**: The numbers below have already been calculated deterministically. Your job is to EXPLAIN what they mean and provide actionable recommendations. DO NOT recalculate these numbers.

**Pre-Calculated Metrics:**
- Estimated Profit: ₹{profit}
- Expense Ratio: {expenseRatio}%
- Profit Margin: {profitMargin}%
- Health Score: {healthScore}/100
- Blocked Inventory Cash: ₹{blockedInventory}
- Total Credit Outstanding: ₹{creditOutstanding}
- Overdue Credit: ₹{overdueCredit}

**Data Context:**
{formatted_sales_data}
{formatted_expenses_data}
{formatted_inventory_data}

**Your Task:**

1. **Explain True Profit**: Explain what the profit of ₹{profit} means. Is it good for this type of shop? How does it compare to the cash flow?

2. **Identify Loss-Making Products**: Based on the sales and inventory data, which products are causing losses? Be specific with product names.

3. **Explain Blocked Inventory**: The shop has ₹{blockedInventory} stuck in inventory. Which products are slow-moving? What should the owner do?

4. **Highlight Abnormal Expenses**: Look at the expense data. Are there any unusual or concerning expenses? Be specific.

5. **Cashflow Forecast**: Based on recent patterns, will the shop face cash shortage in the next 7 days? Why or why not?

**Output Format:**
Provide insights in simple language without financial jargon. Use examples from the actual data. Format in {language}. Be specific with numbers and product names.

**Language Guidelines:**
- Use conversational tone appropriate for small shop owners
- Avoid terms like "EBITDA", "working capital", "liquidity"
- Use simple terms: "real profit", "money stuck", "cash in hand"
- Provide actionable suggestions, not just analysis
- Reference the pre-calculated numbers, don't recalculate them
```

### Health Score Explanation Prompt **[NEW]**

```
You are explaining a business health score to a small shop owner in {language}.

**Health Score: {score}/100**

**Score Breakdown:**
- Margin Score: {marginScore}/30 (based on {profitMargin}% profit margin)
- Expense Score: {expenseScore}/30 (based on {expenseRatio}% expense ratio)
- Cash Score: {cashScore}/20 (cash in hand: ₹{cashInHand})
- Credit Score: {creditScore}/20 ({overdueCount} overdue customers)

**Your Task:**
Explain in simple {language} what this score means:
1. Is this score good, average, or concerning?
2. Which area needs the most improvement?
3. What are 2-3 specific actions the owner can take to improve the score?

**Guidelines:**
- Use simple language, no jargon
- Be encouraging but honest
- Provide specific, actionable advice
- Keep explanation under 150 words
```

### Daily Entry Explanation Prompt **[NEW]**

```
You are explaining today's business results to a shop owner in {language}.

**Today's Results:**
- Sales: ₹{sales}
- Expenses: ₹{expenses}
- Profit: ₹{profit}
- Expense Ratio: {expenseRatio}%

**Your Task:**
In 2-3 sentences, explain:
1. Is today's profit good or concerning?
2. Is the expense ratio healthy?
3. One specific suggestion for tomorrow

Use simple {language}. Be brief and actionable.
```

### Q&A Prompt Template

```
You are answering questions for a small shop owner about their business data. Use only the provided data to answer.

**Available Data:**
{data_summary}

**Conversation History:**
{conversation_history}

**Current Question ({language}):**
{user_question}

**Instructions:**
- Answer in {language} using simple language
- Base answers only on the provided data
- If data is insufficient, say so clearly
- Provide specific numbers and examples
- Be helpful and encouraging

**Answer:**
```

### Language-Specific Prompt Adjustments

For Hindi/Marathi responses, add:
```
Use natural {language} expressions. Avoid direct English translations. Use culturally appropriate examples and metaphors familiar to Indian shop owners.
```

## UI Design **[UPDATED LAYOUT]**

### Layout Structure **[NEW HIERARCHY]**

```
┌─────────────────────────────────────────┐
│  Trust Banner (Persistent)              │
│  🔒 Your data is private. Not connected │
│  to GST or any government system.       │
├─────────────────────────────────────────┤
│  Header                                  │
│  [Logo] Vyapar AI    [🌐 Language ▼]   │
├─────────────────────────────────────────┤
│                                          │
│  ┌────────────────────────────────────┐ │
│  │  📊 Daily Entry (PRIMARY)           │ │
│  │                                     │ │
│  │  Today's Business:                  │ │
│  │  [₹ Total Sales    ]                │ │
│  │  [₹ Total Expenses ]                │ │
│  │  [₹ Cash in Hand   ] (optional)     │ │
│  │                                     │ │
│  │  [Submit Entry]                     │ │
│  │                                     │ │
│  │  Results (instant, < 1 sec):        │ │
│  │  ✅ Profit: ₹X                      │ │
│  │  📊 Expense Ratio: Y%               │ │
│  └────────────────────────────────────┘ │
│                                          │
│  ┌────────────────────────────────────┐ │
│  │  💯 Business Health Score           │ │
│  │                                     │ │
│  │  Score: 72/100 🟡                   │ │
│  │  [████████░░] 72%                   │ │
│  │                                     │ │
│  │  Breakdown:                         │ │
│  │  • Margin: 20/30                    │ │
│  │  • Expenses: 30/30                  │ │
│  │  • Cash: 10/20                      │ │
│  │  • Credit: 12/20                    │ │
│  │                                     │ │
│  │  [🤖 Explain Score]                 │ │
│  └────────────────────────────────────┘ │
│                                          │
│  ┌────────────────────────────────────┐ │
│  │  📝 Quick Summary                   │ │
│  │                                     │ │
│  │  Today:                             │ │
│  │  Sales: ₹X | Expenses: ₹Y          │ │
│  │  Profit: ₹Z                         │ │
│  │                                     │ │
│  │  This Week:                         │ │
│  │  Total Profit: ₹A                   │ │
│  │  Avg Daily: ₹B                      │ │
│  └────────────────────────────────────┘ │
│                                          │
│  ┌────────────────────────────────────┐ │
│  │  💰 Credit Summary (Udhaar)         │ │
│  │                                     │ │
│  │  Total Outstanding: ₹X              │ │
│  │  Overdue: ₹Y (Z customers) 🔴      │ │
│  │                                     │ │
│  │  [+ Add Credit Entry]               │ │
│  │  [View All Credits]                 │ │
│  └────────────────────────────────────┘ │
│                                          │
│  ┌────────────────────────────────────┐ │
│  │  🔬 Advanced Analysis               │ │
│  │  (CSV Upload Mode)                  │ │
│  │                                     │ │
│  │  [▼ Expand Advanced Mode]           │ │
│  │                                     │ │
│  │  When expanded:                     │ │
│  │  📊 Sales CSV     [Upload]          │ │
│  │  💰 Expenses CSV  [Upload]          │ │
│  │  📦 Inventory CSV [Upload]          │ │
│  │                                     │ │
│  │  [🔍 Analyze with AI]               │ │
│  └────────────────────────────────────┘ │
│                                          │
│  ┌────────────────────────────────────┐ │
│  │  AI Insights (after CSV analysis)   │ │
│  │                                     │ │
│  │  💵 True Profit                     │ │
│  │  Your real profit is ₹X             │ │
│  │  [🔊 Listen]                        │ │
│  │                                     │ │
│  │  ⚠️ Loss-Making Products            │ │
│  │  Product A, Product B               │ │
│  │  [🔊 Listen]                        │ │
│  │                                     │ │
│  │  ... more insights ...              │ │
│  └────────────────────────────────────┘ │
│                                          │
│  ┌────────────────────────────────────┐ │
│  │  💬 Ask Questions                   │ │
│  │  ┌──────────────────────────────┐  │ │
│  │  │ Type your question...        │  │ │
│  │  └──────────────────────────────┘  │ │
│  │  [🎤 Voice] [Send]                 │ │
│  │                                     │ │
│  │  Conversation:                      │ │
│  │  Q: मेरा सबसे अच्छा प्रोडक्ट?      │ │
│  │  A: Product X sells best...         │ │
│  └────────────────────────────────────┘ │
│                                          │
└─────────────────────────────────────────┘
```

### Key UI Changes

1. **Trust Banner**: Always visible at top, non-dismissible
2. **Daily Entry First**: Primary interface, large and prominent
3. **Instant Results**: Show profit/expense ratio immediately without AI
4. **Health Score Prominent**: Visual score with color coding
5. **Credit Summary**: Quick view of outstanding/overdue
6. **CSV Upload Collapsed**: "Advanced Mode" section, expandable
7. **AI Insights Below**: Only after CSV analysis or on-demand explanation

### Color Coding

**Health Score**:
- 0-49: Red (#EF4444) - Critical
- 50-74: Yellow (#F59E0B) - Warning  
- 75-100: Green (#10B981) - Good

**Credit Status**:
- No overdue: Green
- 1-2 overdue: Yellow
- 3+ overdue: Red

**Profit Display**:
- Positive: Green
- Zero: Gray
- Negative: Red

### Tailwind CSS Styling Approach

- **Mobile-First**: Base styles for mobile, `md:` breakpoints for desktop
- **Large Touch Targets**: Buttons minimum 44px height
- **Icon-Driven**: Use emoji or icon libraries to minimize text
- **Color Scheme**: 
  - Primary: Blue (#3B82F6) for trust
  - Success: Green (#10B981) for positive insights
  - Warning: Orange (#F59E0B) for alerts
  - Error: Red (#EF4444) for critical issues
- **Typography**: 
  - Large, readable fonts (16px base)
  - Support for Devanagari script (Hindi/Marathi)
  - Font family: system fonts with Devanagari support

### Responsive Breakpoints

- **Mobile** (default): Single column, stacked cards
- **Tablet** (md: 768px): Two-column grid for insights
- **Desktop** (lg: 1024px): Three-column layout with sidebar for Q&A

## Error Handling

### Client-Side Error Handling

1. **File Upload Errors**:
   - Invalid file format → "Please upload a CSV file"
   - File too large → "File size must be under 5MB"
   - Missing columns → "CSV must contain: {required_columns}"

2. **Network Errors**:
   - API timeout → "Taking longer than expected. Please retry."
   - Connection failed → "Check your internet connection"

3. **Voice Synthesis Errors**:
   - Not supported → Hide voice buttons
   - Permission denied → "Enable microphone access to use voice"

### Server-Side Error Handling

1. **CSV Parsing Errors**:
   ```typescript
   try {
     const parsed = Papa.parse(csvContent);
     if (parsed.errors.length > 0) {
       return Response.json({
         success: false,
         error: translateError('invalid_csv', language)
       }, { status: 400 });
     }
   } catch (error) {
     return Response.json({
       success: false,
       error: translateError('parse_failed', language)
     }, { status: 500 });
   }
   ```

2. **AWS Bedrock Errors**:
   ```typescript
   try {
     const response = await client.send(command);
     // Process response
   } catch (error) {
     if (error.name === 'ThrottlingException') {
       return Response.json({
         success: false,
         error: translateError('too_many_requests', language)
       }, { status: 429 });
     }
     return Response.json({
       success: false,
       error: translateError('ai_unavailable', language)
       }, { status: 503 });
   }
   ```

3. **Session Errors**:
   - Session not found → "Please upload data first"
   - Session expired → "Session expired. Please upload data again"

### Error Message Translations

All error messages must be available in all three languages:

```typescript
const errorMessages = {
  invalid_csv: {
    en: "The CSV file format is incorrect. Please check and try again.",
    hi: "CSV फ़ाइल का प्रारूप गलत है। कृपया जांचें और पुनः प्रयास करें।",
    mr: "CSV फाइल फॉरमॅट चुकीचे आहे. कृपया तपासा आणि पुन्हा प्रयत्न करा."
  },
  // ... more error messages
};
```


## Correctness Properties

A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.

### Property Reflection

After analyzing all acceptance criteria, I identified several areas of redundancy:

1. **Language consistency properties** (2.4, 4.2, 6.4, 10.1) all test that content is displayed in the selected language. These can be combined into a single comprehensive property.

2. **Round-trip properties** (1.3, 2.2) both test data persistence - upload/store/retrieve cycles. These are distinct enough to keep separate as they test different storage mechanisms.

3. **Error handling properties** (1.2, 3.8, 8.5, 10.3, 10.4) all test error scenarios but for different subsystems. These should remain separate as they validate different error paths.

4. **Voice synthesis properties** (5.1-5.5) test different aspects of the same feature but each validates unique behavior (availability, activation, language selection, controls, graceful degradation).

After reflection, the following properties provide comprehensive, non-redundant coverage:

### Property 1: CSV Parsing Consistency

*For any* valid CSV file with proper structure, parsing the file should produce a data structure where the number of rows matches the original file row count and all column headers are preserved.

**Validates: Requirements 1.1**

### Property 2: CSV Validation Rejects Invalid Input

*For any* CSV file missing required columns for its type (sales/expenses/inventory), the validation should reject the file and return an error message.

**Validates: Requirements 1.2**

### Property 3: Session Data Round-Trip

*For any* valid CSV data uploaded to a session, retrieving the data from the session store should return data equivalent to what was uploaded.

**Validates: Requirements 1.3**

### Property 4: Multi-Type File Acceptance

*For any* valid CSV file of type sales, expenses, or inventory, the system should successfully accept and parse the file when it contains the required columns for that type.

**Validates: Requirements 1.4**

### Property 5: Preview Row Limiting

*For any* CSV file with N rows where N > 5, the preview should contain exactly 5 data rows plus the header row.

**Validates: Requirements 1.5**

### Property 6: Language Preference Persistence

*For any* language selection (en, hi, mr), storing the preference should result in localStorage containing that exact language code, retrievable on subsequent page loads.

**Validates: Requirements 2.2, 2.3**

### Property 7: Universal Language Consistency

*For any* selected language and any UI element (text, error messages, insights), all displayed content should be in the selected language with no mixed-language text.

**Validates: Requirements 2.4, 4.2, 6.4, 10.1**

### Property 8: Language Change Reactivity

*For any* language change from language A to language B, all visible text content should update to language B immediately without requiring page reload.

**Validates: Requirements 2.5**

### Property 9: Analysis Request Data Inclusion

*For any* analysis request with uploaded session data, the request to AWS Bedrock should include all uploaded CSV data (sales, expenses, inventory) in the prompt context.

**Validates: Requirements 3.1, 8.4**

### Property 10: Blocked Inventory Calculation

*For any* inventory dataset, the blocked cash calculation should equal the sum of (quantity × cost_price) for all inventory items.

**Validates: Requirements 3.4**

### Property 11: AI Error Recovery

*For any* AWS Bedrock API failure (timeout, throttling, service error), the system should display an error message in the user's language and provide a retry option.

**Validates: Requirements 3.8, 8.5, 10.4**

### Property 12: Insight Structure Completeness

*For any* successful analysis response, the insights object should contain all five required categories: trueProfitAnalysis, lossMakingProducts, blockedInventoryCash, abnormalExpenses, and cashflowForecast.

**Validates: Requirements 4.3**

### Property 13: Currency Formatting

*For any* monetary value displayed in insights, the formatted string should include the ₹ symbol and proper number formatting (e.g., ₹1,234.56).

**Validates: Requirements 4.4**

### Property 14: Insight Category Icons

*For any* insight category rendered in the UI, the rendered HTML should contain an icon element (emoji or icon component) associated with that category.

**Validates: Requirements 4.5**

### Property 15: Voice Button Conditional Rendering

*For any* browser environment, if Web Speech API is supported (speechSynthesis exists), voice buttons should be visible; if not supported, voice buttons should be hidden.

**Validates: Requirements 5.1, 5.5**

### Property 16: Voice Synthesis API Usage

*For any* insight text when voice synthesis is activated, the system should call speechSynthesis.speak() with an utterance containing that text.

**Validates: Requirements 5.2**

### Property 17: Hindi Voice Selection

*For any* voice synthesis request when the selected language is Hindi, the utterance should have its lang property set to 'hi-IN' or use a Hindi voice.

**Validates: Requirements 5.3**

### Property 18: Voice Playback Controls

*For any* active voice synthesis playback, the UI should display a stop button that, when clicked, calls speechSynthesis.cancel().

**Validates: Requirements 5.4**

### Property 19: Q&A Context Inclusion

*For any* question submitted through the Q&A interface, the API request to AWS Bedrock should include both the question and the current session's uploaded data as context.

**Validates: Requirements 6.1**

### Property 20: Voice Input Processing

*For any* voice input activation, the system should initialize Web Speech API recognition and convert the recognized speech to text before sending to the Q&A endpoint.

**Validates: Requirements 6.2**

### Property 21: Conversation History Persistence

*For any* sequence of Q&A exchanges within a session, retrieving the conversation history should return all questions and answers in chronological order.

**Validates: Requirements 6.6**

### Property 22: In-Memory Storage Only

*For any* uploaded CSV data, the data should exist only in the in-memory sessionStore Map and should not be written to any file system or database.

**Validates: Requirements 7.1**

### Property 23: Session Isolation

*For any* new session ID, the initial session data should be empty with no data from other sessions.

**Validates: Requirements 7.5**

### Property 24: Bedrock Model Selection

*For any* API call to AWS Bedrock, the modelId parameter should be either a Claude model ID (starting with "anthropic.claude") or a Titan model ID (starting with "amazon.titan").

**Validates: Requirements 8.3**

### Property 25: CSV Error Explanation

*For any* CSV validation failure, the error response should include a specific explanation of what was wrong (e.g., "missing required column: date") rather than a generic error message.

**Validates: Requirements 10.3**

### Property 26: Loading State Visibility

*For any* asynchronous operation (file upload, analysis, Q&A), while the operation is in progress, a loading indicator should be visible in the UI.

**Validates: Requirements 10.5**

### Property 27: Daily Entry Profit Calculation **[NEW]**

*For any* daily entry with totalSales S and totalExpense E, the calculated estimatedProfit should equal exactly S - E, computed without AI involvement.

**Validates: Requirements 11.3**

### Property 28: Daily Entry Expense Ratio Calculation **[NEW]**

*For any* daily entry with totalSales S > 0 and totalExpense E, the calculated expenseRatio should equal exactly E / S, computed without AI involvement.

**Validates: Requirements 11.4**

### Property 29: Daily Entry Instant Response **[NEW]**

*For any* valid daily entry submission, the system should return calculation results in under 1 second without making AWS Bedrock API calls.

**Validates: Requirements 11.5, 15.6**

### Property 30: Daily Entry Storage **[NEW]**

*For any* daily entry submitted with date D, sales S, expenses E, and optional cash C, the session store should contain an entry with those exact values retrievable by session ID.

**Validates: Requirements 11.6**

### Property 31: Health Score Range **[NEW]**

*For any* calculated health score, the value should be between 0 and 100 inclusive, computed deterministically without AI.

**Validates: Requirements 12.1**

### Property 32: Health Score Deterministic Calculation **[NEW]**

*For any* given profitMargin, expenseRatio, cashInHand, and creditSummary, calculating the health score multiple times should always produce the same result without AI involvement.

**Validates: Requirements 12.4, 15.1**

### Property 33: Health Score Color Coding **[NEW]**

*For any* health score value, if score < 50 it should display in red, if 50 ≤ score ≤ 75 in yellow, if score > 75 in green.

**Validates: Requirements 12.7**

### Property 34: Credit Outstanding Calculation **[NEW]**

*For any* set of credit entries, the total outstanding should equal the sum of amounts for all entries where isPaid is false, computed deterministically.

**Validates: Requirements 13.4**

### Property 35: Credit Overdue Calculation **[NEW]**

*For any* set of credit entries and current date D, the total overdue should equal the sum of amounts for unpaid entries where dueDate < D, computed deterministically.

**Validates: Requirements 13.5**

### Property 36: Credit Overdue Count **[NEW]**

*For any* set of credit entries and current date D, the overdue count should equal the number of unpaid entries where dueDate < D, computed deterministically.

**Validates: Requirements 13.6**

### Property 37: Credit Impact on Health Score **[NEW]**

*For any* health score calculation, if overdue credit exists (overdueCount > 0), the credit score component should be reduced compared to when no overdue credit exists.

**Validates: Requirements 13.7**

### Property 38: Trust Banner Visibility **[NEW]**

*For any* page load in any language, the trust banner should be visible and display the privacy message in the selected language.

**Validates: Requirements 14.1, 14.2, 14.3, 14.4**

### Property 39: Deterministic Layer Independence **[NEW]**

*For any* deterministic calculation (profit, expense ratio, health score, credit totals, blocked inventory), the calculation should complete successfully even when AWS Bedrock is unavailable or returns an error.

**Validates: Requirements 15.4, 15.5**

### Property 40: Deterministic Calculation Performance **[NEW]**

*For any* deterministic calculation, the computation should complete in under 1 second.

**Validates: Requirements 15.6**

### Property 41: AI Non-Calculation Constraint **[NEW]**

*For any* numeric output (profit, health score, credit amounts, blocked inventory), the value should be calculated by deterministic code and not by parsing AI responses.

**Validates: Requirements 15.3**

## Testing Strategy

### Dual Testing Approach

Vyapar AI requires both unit tests and property-based tests for comprehensive coverage:

**Unit Tests** focus on:
- Specific examples with known inputs/outputs (e.g., parsing a specific CSV format)
- Edge cases (empty files, single-row CSVs, special characters)
- Integration points (API route handlers, Bedrock client initialization)
- Error conditions (network failures, invalid credentials)

**Property-Based Tests** focus on:
- Universal properties across all inputs (e.g., any valid CSV should parse successfully)
- Randomized input generation to catch unexpected edge cases
- Invariants that must hold regardless of data (e.g., language consistency)

Both approaches are complementary and necessary. Unit tests catch concrete bugs with specific scenarios, while property tests verify general correctness across a wide input space.

### Property-Based Testing Configuration

**Library Selection**: 
- **JavaScript/TypeScript**: Use `fast-check` library
- Installation: `npm install --save-dev fast-check`

**Test Configuration**:
- Minimum 100 iterations per property test (due to randomization)
- Each test must reference its design document property number
- Tag format: `// Feature: vyapar-ai, Property {number}: {property_text}`

**Example Property Test Structure**:

```typescript
import fc from 'fast-check';

// Feature: vyapar-ai, Property 1: CSV Parsing Consistency
test('CSV parsing preserves row count and headers', () => {
  fc.assert(
    fc.property(
      fc.array(fc.record({
        date: fc.date(),
        product: fc.string(),
        quantity: fc.integer({ min: 1 }),
        amount: fc.float({ min: 0 })
      }), { minLength: 1, maxLength: 100 }),
      (rows) => {
        const csv = convertToCSV(rows);
        const parsed = parseCSV(csv);
        
        expect(parsed.rows.length).toBe(rows.length);
        expect(parsed.headers).toEqual(['date', 'product', 'quantity', 'amount']);
      }
    ),
    { numRuns: 100 }
  );
});
```

### Unit Testing Strategy

**Framework**: Jest with React Testing Library for component tests

**Coverage Areas**:

1. **API Routes** (`/api/upload`, `/api/analyze`, `/api/ask`):
   - Test with specific example data
   - Test error responses (400, 500, 503)
   - Test session management
   - Mock AWS Bedrock calls

2. **Components**:
   - File upload component with valid/invalid files
   - Language selector state changes
   - Insights display rendering
   - Q&A chat message flow

3. **Utilities**:
   - CSV validation logic
   - Language translation lookups
   - Currency formatting
   - Session cleanup

**Example Unit Test**:

```typescript
describe('/api/upload', () => {
  it('should reject CSV with missing required columns', async () => {
    const invalidCSV = 'product,quantity\nItem A,5';
    const response = await POST({
      file: new File([invalidCSV], 'sales.csv'),
      fileType: 'sales',
      language: 'en'
    });
    
    expect(response.success).toBe(false);
    expect(response.error).toContain('missing required column');
  });
});
```

### Integration Testing

**Scope**: End-to-end flows without external dependencies

1. **Upload → Analyze Flow**:
   - Upload sales, expenses, inventory CSVs
   - Trigger analysis
   - Verify insights structure
   - Mock Bedrock responses

2. **Language Switching Flow**:
   - Set language to Hindi
   - Upload data
   - Verify all UI text in Hindi
   - Switch to English
   - Verify all text updates

3. **Q&A Flow**:
   - Upload data
   - Ask question
   - Verify context inclusion
   - Check conversation history

### Mocking Strategy

**AWS Bedrock**: Always mock in tests to avoid costs and ensure deterministic results

```typescript
jest.mock('@aws-sdk/client-bedrock-runtime', () => ({
  BedrockRuntimeClient: jest.fn(() => ({
    send: jest.fn().mockResolvedValue({
      body: JSON.stringify({
        content: [{ text: 'Mocked AI response' }]
      })
    })
  }))
}));
```

**Web Speech API**: Mock for voice synthesis tests

```typescript
global.speechSynthesis = {
  speak: jest.fn(),
  cancel: jest.fn(),
  getVoices: jest.fn(() => [{ lang: 'hi-IN', name: 'Hindi Voice' }])
};
```

### Test Data Generation

**CSV Generators** for property tests:

```typescript
const salesRowArbitrary = fc.record({
  date: fc.date().map(d => d.toISOString().split('T')[0]),
  product: fc.string({ minLength: 1, maxLength: 50 }),
  quantity: fc.integer({ min: 1, max: 1000 }),
  amount: fc.float({ min: 0.01, max: 100000, noNaN: true })
});

const expensesRowArbitrary = fc.record({
  date: fc.date().map(d => d.toISOString().split('T')[0]),
  category: fc.constantFrom('rent', 'utilities', 'supplies', 'wages'),
  amount: fc.float({ min: 0.01, max: 50000, noNaN: true }),
  description: fc.string({ maxLength: 100 })
});

const inventoryRowArbitrary = fc.record({
  product: fc.string({ minLength: 1, maxLength: 50 }),
  quantity: fc.integer({ min: 0, max: 1000 }),
  cost_price: fc.float({ min: 0.01, max: 10000, noNaN: true }),
  selling_price: fc.float({ min: 0.01, max: 15000, noNaN: true })
});
```

### Performance Testing

**Benchmarks**:
- CSV parsing: < 3 seconds for 10,000 rows
- Bedrock API calls: < 15 seconds (with timeout at 30 seconds)
- Page load: < 2 seconds on 3G

**Load Testing**: Not required for MVP (single-user sessions, no shared state)

### Manual Testing Checklist

Some requirements require manual verification:

- [ ] Mobile responsiveness on actual devices (320px to 768px)
- [ ] Hindi/Marathi text rendering with proper fonts
- [ ] Voice synthesis quality in Hindi
- [ ] UI simplicity for users with low digital literacy
- [ ] Touch target sizes on mobile devices
- [ ] Accessibility with screen readers

## AI-Assisted Development

This project was designed with AI-assisted development in mind, specifically using Kiro as the development partner.

### How Kiro Should Be Used

1. **Component Implementation**:
   - Kiro can implement individual components based on the interface specifications
   - Each component has clear input/output contracts defined in this document
   - Kiro should reference the design document for implementation details

2. **API Route Development**:
   - API routes have explicit request/response interfaces
   - Kiro can implement the route handlers following the behavior specifications
   - Error handling patterns are documented for consistency

3. **Test Generation**:
   - Kiro can generate property-based tests using the correctness properties
   - Each property has a clear "for any" statement that translates to test generators
   - Unit tests can be generated for specific examples and edge cases

4. **Prompt Engineering**:
   - The prompt templates in this document serve as starting points
   - Kiro can help refine prompts based on actual AI responses
   - Iterative improvement of prompts for better insight quality

5. **Translation Management**:
   - Kiro can help generate translation dictionaries
   - Verify translation completeness across all UI strings
   - Ensure cultural appropriateness of Hindi/Marathi translations

### Development Workflow with Kiro

1. **Phase 1: Core Infrastructure**
   - Set up Next.js project structure
   - Implement session store
   - Create API route skeletons
   - Set up AWS Bedrock client

2. **Phase 2: Data Layer**
   - Implement CSV parsing and validation
   - Create data models
   - Build session management
   - Write property tests for data handling

3. **Phase 3: AI Integration**
   - Implement Bedrock API calls
   - Develop prompt templates
   - Create analysis endpoint
   - Test with mock data

4. **Phase 4: UI Components**
   - Build upload interface
   - Create insights display
   - Implement Q&A chat
   - Add language selector

5. **Phase 5: Polish**
   - Add voice synthesis
   - Implement error handling
   - Refine translations
   - Mobile optimization

### Kiro-Specific Guidance

When implementing this project with Kiro:

- **Reference this document frequently**: All interfaces and behaviors are specified
- **Implement incrementally**: Build one component at a time, test, then move on
- **Use property tests early**: Catch issues before they compound
- **Ask for clarification**: If requirements are ambiguous, ask before implementing
- **Iterate on prompts**: AI quality depends on prompt engineering—refine as needed

## Responsible AI Design

### Ethical Considerations

1. **Data Privacy**:
   - No data persistence ensures user privacy
   - No tracking or analytics on business data
   - Clear communication that data is temporary

2. **AI Transparency**:
   - Insights clearly labeled as AI-generated
   - Limitations communicated (e.g., "based on uploaded data only")
   - No false promises about accuracy

3. **Accessibility**:
   - Multi-language support for linguistic inclusion
   - Voice synthesis for users with reading difficulties
   - Simple language for users with limited financial literacy

4. **Bias Mitigation**:
   - Prompts designed to avoid cultural bias
   - Testing with diverse shop types and sizes
   - Avoid assumptions about "normal" business patterns

### Limitations and Disclaimers

The system should clearly communicate:

- **Not Financial Advice**: Insights are analytical, not prescriptive
- **Data Quality Dependent**: Analysis quality depends on uploaded data accuracy
- **AI Limitations**: AI may misinterpret unusual business patterns
- **No Guarantees**: No guarantee of profit improvement

### User Education

The UI should include:

- Brief explanation of how AI analysis works
- Tips for uploading accurate data
- Guidance on interpreting insights
- Encouragement to verify findings with actual business records

## Deployment Considerations

### Environment Variables

Required environment variables:

```bash
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=<your-access-key>
AWS_SECRET_ACCESS_KEY=<your-secret-key>
BEDROCK_MODEL_ID=anthropic.claude-3-sonnet-20240229-v1:0
```

### Vercel Deployment

Recommended configuration:

```json
{
  "framework": "nextjs",
  "buildCommand": "npm run build",
  "devCommand": "npm run dev",
  "installCommand": "npm install",
  "env": {
    "AWS_REGION": "@aws-region",
    "AWS_ACCESS_KEY_ID": "@aws-access-key-id",
    "AWS_SECRET_ACCESS_KEY": "@aws-secret-access-key"
  }
}
```

### Memory Management

Since data is in-memory:

- Implement session cleanup (2-hour expiry)
- Monitor memory usage in production
- Set reasonable file size limits (5MB per CSV)
- Consider serverless function memory limits (1GB recommended)

### Cost Optimization

AWS Bedrock costs:

- Claude 3 Sonnet: ~$0.003 per 1K input tokens, ~$0.015 per 1K output tokens
- Typical analysis: ~2K input + 1K output = ~$0.021 per analysis
- Target: < ₹10 per user session in AI costs

### Monitoring

Key metrics to track:

- API response times (upload, analyze, ask)
- Bedrock API success/failure rates
- Session count and duration
- Memory usage per session
- Error rates by type

## Hackathon Judging Criteria Alignment

### Ideation & Creativity (30%)

**Novel Concept**: "Doctor for shop financial health" metaphor makes complex financial analysis accessible

**Track Alignment**: Directly serves "AI for Retail, Commerce & Market Intelligence" by democratizing business intelligence

**Innovation**: Combines local language support, voice interaction, and AI-powered insights in a way not available to small shops

**Differentiation**: Unlike accounting software (complex) or spreadsheets (manual), this provides instant AI insights in the user's language

### Impact (20%)

**Market Size**: 60+ million small retail shops in India (MSME data)

**Problem Severity**: Most small shops confuse cash flow with profit, leading to poor decisions

**Measurable Impact**: Potential 5-15% profit improvement through:
- Identifying loss-making products (stop selling them)
- Reducing blocked inventory cash (improve cash flow)
- Detecting abnormal expenses (reduce waste)

**Accessibility**: Hindi/Marathi support + voice + simple language reaches users excluded by English-only tools

### Technical Aptness & Feasibility (30%)

**AI Necessity**: AI is core, not optional:
- Pattern recognition for abnormal expenses
- Natural language understanding for Q&A
- Complex profit calculations
- Cashflow predictions

**Technology Choices**:
- Next.js 14 App Router: Modern, performant, serverless-ready
- AWS Bedrock: Production-grade AI without training overhead
- In-memory storage: Simple, fast, privacy-preserving
- PapaParse: Robust CSV handling

**Feasibility**: Can be built in hackathon timeframe:
- No database setup required
- No authentication complexity
- Leverages existing AI models
- Clear component boundaries

**Scalability**: Stateless design scales horizontally on serverless

### Business Feasibility (20%)

**Go-to-Market**: WhatsApp pilot strategy:
- Low barrier to entry (familiar platform)
- Viral potential (shop owners share with peers)
- Easy to demonstrate value

**Pricing**: ₹199/month (~$2.40):
- Affordable for small shops (< 1% of typical monthly revenue)
- Covers AI costs (~₹50/month) + margin
- Comparable to mobile recharge (familiar price point)

**Value Proposition**: "Know your real profit" resonates because:
- Addresses known pain point (cash vs profit confusion)
- Quantifiable benefit (identify loss-making products)
- Immediate actionability (stop selling X, reduce Y expense)

**Revenue Potential**: 
- 1% market penetration = 600K shops
- ₹199/month × 600K = ₹11.94 crore/month (~$1.4M/month)
- Realistic given low competition in this niche

## Future Enhancements (Post-Hackathon)

1. **WhatsApp Integration**: Bot interface for CSV upload and insights delivery
2. **Historical Tracking**: Optional data persistence for trend analysis
3. **Benchmarking**: Compare shop performance to similar businesses
4. **Automated Recommendations**: AI-generated action plans
5. **Multi-Shop Support**: For owners with multiple locations
6. **Supplier Integration**: Connect with inventory suppliers for automated data
7. **Tax Assistance**: GST calculation and filing support
8. **Credit Scoring**: Help shops access formal credit based on health metrics
