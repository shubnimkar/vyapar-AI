# Design Document: AWS Hackathon Features

## Overview

This design document outlines the technical architecture for four AWS-powered features: Voice-to-Entry, Predictive Cash Flow, Automated Daily Reports, and Smart Expense Alerts. The implementation leverages AWS services (Bedrock, Lambda, S3, Transcribe, EventBridge) integrated with a Next.js frontend and Supabase backend.

The design follows a serverless architecture pattern where Lambda functions handle compute-intensive AI operations, S3 provides temporary storage, and Next.js API routes serve as the integration layer between the frontend and AWS services.

## Architecture

### High-Level Architecture

```mermaid
graph TB
    subgraph "Client Layer"
        UI[Next.js UI Components]
        MediaRec[MediaRecorder API]
        LocalStore[localStorage Queue]
    end
    
    subgraph "API Layer"
        VoiceAPI[/api/voice-entry]
        PredictAPI[/api/predict-cashflow]
        AlertAPI[/api/expense-alert]
        ReportAPI[/api/reports]
    end
    
    subgraph "AWS Services"
        S3Voice[S3: vyapar-voice]
        S3Receipt[S3: vyapar-receipts]
        LambdaVoice[Lambda: voice-processor]
        LambdaPrediction[Lambda: cashflow-predictor]
        LambdaAlert[Lambda: expense-alert]
        LambdaReport[Lambda: report-generator]
        Transcribe[AWS Transcribe]
        Bedrock[AWS Bedrock]
        EventBridge[EventBridge Scheduler]
    end
    
    subgraph "Data Layer"
        Supabase[(Supabase PostgreSQL)]
    end
    
    UI --> MediaRec
    MediaRec --> LocalStore
    LocalStore --> VoiceAPI
    VoiceAPI --> S3Voice
    S3Voice --> LambdaVoice
    LambdaVoice --> Transcribe
    LambdaVoice --> Bedrock
    LambdaVoice --> VoiceAPI
    
    UI --> PredictAPI
    PredictAPI --> LambdaPrediction
    LambdaPrediction --> Supabase
    LambdaPrediction --> Bedrock
    
    UI --> AlertAPI
    AlertAPI --> LambdaAlert
    LambdaAlert --> Supabase
    LambdaAlert --> Bedrock
    
    EventBridge --> LambdaReport
    LambdaReport --> Supabase
    LambdaReport --> Bedrock
    UI --> ReportAPI
    ReportAPI --> Supabase
```

### Data Flow Patterns

**Voice-to-Entry Flow:**
1. User records audio → MediaRecorder API captures audio
2. Audio saved locally → Uploaded to S3 (with offline queue support)
3. S3 trigger → Lambda function invoked
4. Lambda → Transcribe (Hindi audio to text)
5. Lambda → Bedrock NLP (extract structured data)
6. Lambda → Returns JSON to API route
7. API route → Frontend auto-fills form

**Predictive Cash Flow:**
1. User requests prediction → API route invoked
2. API → Lambda function
3. Lambda → Query Supabase (last 30 days)
4. Lambda → Bedrock analysis (predict next 7 days)
5. Lambda → Returns predictions with confidence
6. Frontend → Renders chart with alerts

**Automated Reports:**
1. EventBridge cron (8 PM IST) → Lambda trigger
2. Lambda → Query all users from Supabase
3. For each user → Query daily entries
4. Lambda → Bedrock generates insights
5. Lambda → Store report in Supabase
6. User views → API fetches from Supabase

**Smart Expense Alerts:**
1. User submits expense → API route invoked
2. API → Lambda function
3. Lambda → Query historical expenses from Supabase
4. Lambda → Bedrock anomaly detection
5. Lambda → Returns alert if anomaly detected
6. Frontend → Displays alert banner

## Components and Interfaces

### Frontend Components

#### VoiceRecorder Component

**Purpose:** Handles audio recording, visualization, and upload management.

**Props:**
```typescript
interface VoiceRecorderProps {
  onDataExtracted: (data: ExtractedVoiceData) => void;
  language: 'en' | 'hi';
}
```

**State:**
```typescript
interface VoiceRecorderState {
  isRecording: boolean;
  recordingDuration: number;
  audioBlob: Blob | null;
  uploadStatus: 'idle' | 'uploading' | 'processing' | 'success' | 'error';
  errorMessage: string | null;
  waveformData: number[];
}
```

**Key Methods:**
- `startRecording()`: Initialize MediaRecorder, start capture
- `stopRecording()`: Stop capture, create Blob
- `uploadAudio()`: Upload to S3 via API route
- `processOfflineQueue()`: Upload queued files when online
- `visualizeWaveform()`: Update waveform visualization

#### CashFlowPredictor Component

**Purpose:** Displays predicted cash flow with historical comparison.

**Props:**
```typescript
interface CashFlowPredictorProps {
  userId: string;
  language: 'en' | 'hi';
}
```

**State:**
```typescript
interface CashFlowPredictorState {
  predictions: DailyPrediction[];
  isLoading: boolean;
  error: string | null;
  hasAlert: boolean;
}

interface DailyPrediction {
  date: string;
  predictedBalance: number;
  trend: 'up' | 'down' | 'stable';
  confidence: number; // 0-1
  isNegative: boolean;
}
```

**Key Methods:**
- `fetchPredictions()`: Call API to get predictions
- `renderChart()`: Render historical + predicted data
- `showAlertBadge()`: Display warning for negative predictions

#### ReportViewer Component

**Purpose:** Displays automated daily reports and manages automation settings.

**Props:**
```typescript
interface ReportViewerProps {
  userId: string;
  language: 'en' | 'hi';
}
```

**State:**
```typescript
interface ReportViewerState {
  reports: DailyReport[];
  isAutomationEnabled: boolean;
  isLoading: boolean;
  selectedReport: DailyReport | null;
}

interface DailyReport {
  id: string;
  userId: string;
  date: string;
  generatedAt: string;
  summary: {
    totalSales: number;
    totalExpenses: number;
    netProfit: number;
    topExpenseCategories: { category: string; amount: number }[];
    insights: string;
  };
}
```

**Key Methods:**
- `fetchReports()`: Load past reports from API
- `toggleAutomation()`: Enable/disable scheduled reports
- `viewReport()`: Display full report details

#### ExpenseAlertBanner Component

**Purpose:** Displays real-time expense anomaly alerts.

**Props:**
```typescript
interface ExpenseAlertBannerProps {
  alert: ExpenseAlert | null;
  onDismiss: () => void;
  language: 'en' | 'hi';
}

interface ExpenseAlert {
  type: 'high_amount' | 'unusual_category' | 'unusual_timing';
  explanation: string;
  severity: 'warning' | 'critical';
  expenseAmount: number;
  category: string;
}
```

**Key Methods:**
- `renderAlert()`: Display alert with appropriate styling
- `dismiss()`: Hide alert banner

### API Routes

#### /api/voice-entry

**Method:** POST

**Request Body:**
```typescript
interface VoiceEntryRequest {
  audioFile: File;
  userId: string;
  language: 'hi-IN';
}
```

**Response:**
```typescript
interface VoiceEntryResponse {
  success: boolean;
  data?: ExtractedVoiceData;
  error?: string;
}

interface ExtractedVoiceData {
  sales: number | null;
  expenses: number | null;
  expenseCategory: string | null;
  inventoryChanges: string | null;
  date: string;
  confidence: number;
}
```

**Implementation:**
1. Validate request (file type, size, user auth)
2. Generate pre-signed S3 URL
3. Upload file to S3
4. Wait for Lambda processing (polling or webhook)
5. Return extracted data

#### /api/predict-cashflow

**Method:** POST

**Request Body:**
```typescript
interface PredictCashflowRequest {
  userId: string;
}
```

**Response:**
```typescript
interface PredictCashflowResponse {
  success: boolean;
  predictions?: DailyPrediction[];
  error?: string;
  insufficientData?: boolean;
}
```

**Implementation:**
1. Validate user authentication
2. Invoke Lambda function with userId
3. Lambda queries Supabase for last 30 days
4. Lambda calls Bedrock for predictions
5. Return predictions array

#### /api/expense-alert

**Method:** POST

**Request Body:**
```typescript
interface ExpenseAlertRequest {
  userId: string;
  expense: {
    amount: number;
    category: string;
    date: string;
  };
}
```

**Response:**
```typescript
interface ExpenseAlertResponse {
  success: boolean;
  alert?: ExpenseAlert;
  error?: string;
}
```

**Implementation:**
1. Validate user authentication
2. Invoke Lambda function with expense data
3. Lambda queries historical expenses
4. Lambda calls Bedrock for anomaly detection
5. Return alert if anomaly detected

#### /api/reports

**Method:** GET (list reports), POST (toggle automation)

**GET Response:**
```typescript
interface ReportsListResponse {
  success: boolean;
  reports?: DailyReport[];
  automationEnabled?: boolean;
  error?: string;
}
```

**POST Request Body:**
```typescript
interface ToggleAutomationRequest {
  userId: string;
  enabled: boolean;
}
```

**Implementation:**
- GET: Query Supabase for user's reports
- POST: Update user's automation preference in Supabase

### Lambda Functions

#### voice-processor Lambda

**Runtime:** Node.js 20
**Memory:** 512MB
**Timeout:** 60 seconds

**Environment Variables:**
- `TRANSCRIBE_BUCKET`: S3 bucket for Transcribe output
- `BEDROCK_MODEL_ID`: Bedrock model identifier
- `SUPABASE_URL`: Supabase project URL
- `SUPABASE_KEY`: Supabase service key

**Handler Logic:**
```javascript
export const handler = async (event) => {
  // 1. Extract S3 object key from event
  const bucket = event.Records[0].s3.bucket.name;
  const key = event.Records[0].s3.object.key;
  
  // 2. Start Transcribe job
  const transcribeJob = await startTranscriptionJob({
    bucket,
    key,
    languageCode: 'hi-IN'
  });
  
  // 3. Wait for transcription completion (polling)
  const transcript = await waitForTranscription(transcribeJob.id);
  
  // 4. Extract structured data using Bedrock
  const extractedData = await extractDataWithBedrock(transcript);
  
  // 5. Store result in temporary cache or return via callback
  return {
    statusCode: 200,
    body: JSON.stringify(extractedData)
  };
};
```

**Bedrock Prompt for Data Extraction:**
```
You are a data extraction assistant for a business accounting system.
Extract the following information from this Hindi transcript:
- Sales amount (number)
- Expense amount (number)
- Expense category (string)
- Inventory changes (string description)
- Date mentioned (YYYY-MM-DD format, or "today" if not specified)

Transcript: {transcript}

Return JSON format:
{
  "sales": number or null,
  "expenses": number or null,
  "expenseCategory": string or null,
  "inventoryChanges": string or null,
  "date": string,
  "confidence": number (0-1)
}
```

#### cashflow-predictor Lambda

**Runtime:** Node.js 20
**Memory:** 256MB
**Timeout:** 30 seconds

**Environment Variables:**
- `BEDROCK_MODEL_ID`: Bedrock model identifier
- `SUPABASE_URL`: Supabase project URL
- `SUPABASE_KEY`: Supabase service key

**Handler Logic:**
```javascript
export const handler = async (event) => {
  const { userId } = JSON.parse(event.body);
  
  // 1. Query last 30 days from Supabase
  const historicalData = await queryHistoricalData(userId, 30);
  
  // 2. Check if sufficient data
  if (historicalData.length < 7) {
    return {
      statusCode: 200,
      body: JSON.stringify({
        insufficientData: true,
        message: 'Need at least 7 days of data'
      })
    };
  }
  
  // 3. Call Bedrock for predictions
  const predictions = await predictWithBedrock(historicalData);
  
  // 4. Flag negative predictions
  const predictionsWithAlerts = predictions.map(p => ({
    ...p,
    isNegative: p.predictedBalance < 0
  }));
  
  return {
    statusCode: 200,
    body: JSON.stringify({
      success: true,
      predictions: predictionsWithAlerts
    })
  };
};
```

**Bedrock Prompt for Prediction:**
```
You are a financial forecasting assistant for small businesses.
Analyze the following 30 days of historical cash flow data and predict the next 7 days.

Historical data (JSON array):
{historicalData}

For each of the next 7 days, provide:
- date (YYYY-MM-DD)
- predictedBalance (number)
- trend ('up', 'down', or 'stable')
- confidence (0-1, where 1 is highest confidence)

Consider patterns like:
- Weekly cycles (weekends vs weekdays)
- Recent trends
- Seasonal patterns if visible

Return JSON array of 7 predictions.
```

#### expense-alert Lambda

**Runtime:** Node.js 20
**Memory:** 256MB
**Timeout:** 20 seconds

**Environment Variables:**
- `BEDROCK_MODEL_ID`: Bedrock model identifier
- `SUPABASE_URL`: Supabase project URL
- `SUPABASE_KEY`: Supabase service key

**Handler Logic:**
```javascript
export const handler = async (event) => {
  const { userId, expense } = JSON.parse(event.body);
  
  // 1. Query historical expenses for same category
  const historicalExpenses = await queryExpenseHistory(
    userId,
    expense.category,
    90 // last 90 days
  );
  
  // 2. Call Bedrock for anomaly detection
  const anomalyResult = await detectAnomalyWithBedrock(
    expense,
    historicalExpenses
  );
  
  // 3. Return alert if anomaly detected
  if (anomalyResult.isAnomaly) {
    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        alert: {
          type: anomalyResult.type,
          explanation: anomalyResult.explanation,
          severity: anomalyResult.severity,
          expenseAmount: expense.amount,
          category: expense.category
        }
      })
    };
  }
  
  return {
    statusCode: 200,
    body: JSON.stringify({
      success: true,
      alert: null
    })
  };
};
```

**Bedrock Prompt for Anomaly Detection:**
```
You are an expense anomaly detection assistant for small businesses.
Analyze if this expense is unusual compared to historical patterns.

Current expense:
- Amount: {expense.amount}
- Category: {expense.category}
- Date: {expense.date}

Historical expenses in same category (last 90 days):
{historicalExpenses}

Determine if this is anomalous based on:
1. Amount significantly higher than average
2. Category rarely used by this user
3. Unusual timing (e.g., duplicate on same day)

If anomalous, return:
{
  "isAnomaly": true,
  "type": "high_amount" | "unusual_category" | "unusual_timing",
  "explanation": "Natural language explanation in user's language",
  "severity": "warning" | "critical"
}

If normal, return:
{
  "isAnomaly": false
}
```

#### report-generator Lambda

**Runtime:** Node.js 20
**Memory:** 512MB
**Timeout:** 60 seconds

**Environment Variables:**
- `BEDROCK_MODEL_ID`: Bedrock model identifier
- `SUPABASE_URL`: Supabase project URL
- `SUPABASE_KEY`: Supabase service key

**Trigger:** EventBridge cron expression: `cron(30 14 * * ? *)` (8 PM IST = 2:30 PM UTC)

**Handler Logic:**
```javascript
export const handler = async (event) => {
  // 1. Query all users with automation enabled
  const users = await queryUsersWithAutomation();
  
  const results = [];
  
  // 2. Process each user
  for (const user of users) {
    try {
      // 3. Get today's daily entries
      const todayData = await queryTodayData(user.id);
      
      // 4. Generate insights with Bedrock
      const insights = await generateInsightsWithBedrock(todayData);
      
      // 5. Store report in Supabase
      await storeReport(user.id, insights);
      
      results.push({ userId: user.id, success: true });
    } catch (error) {
      console.error(`Failed for user ${user.id}:`, error);
      results.push({ userId: user.id, success: false, error: error.message });
    }
  }
  
  return {
    statusCode: 200,
    body: JSON.stringify({
      processed: results.length,
      results
    })
  };
};
```

**Bedrock Prompt for Report Generation:**
```
You are a business insights assistant generating daily reports for small business owners.
Analyze today's business data and provide actionable insights.

Today's data:
- Total sales: {totalSales}
- Total expenses: {totalExpenses}
- Net profit/loss: {netProfit}
- Expense breakdown: {expenseBreakdown}
- Inventory changes: {inventoryChanges}

Generate a concise daily report including:
1. Summary of financial performance
2. Top 3 expense categories
3. Key observations (trends, anomalies, achievements)
4. One actionable recommendation

Return JSON:
{
  "totalSales": number,
  "totalExpenses": number,
  "netProfit": number,
  "topExpenseCategories": [{ "category": string, "amount": number }],
  "insights": "Natural language summary in user's language"
}
```

## Data Models

### Supabase Schema Extensions

#### reports table

```sql
CREATE TABLE reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  date DATE NOT NULL,
  generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  total_sales DECIMAL(10, 2),
  total_expenses DECIMAL(10, 2),
  net_profit DECIMAL(10, 2),
  top_expense_categories JSONB,
  insights TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_reports_user_date ON reports(user_id, date DESC);
```

#### user_preferences table (extend existing or create)

```sql
CREATE TABLE user_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id),
  automation_enabled BOOLEAN DEFAULT true,
  report_time TIME DEFAULT '20:00:00',
  language VARCHAR(5) DEFAULT 'hi',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### voice_uploads table (for tracking)

```sql
CREATE TABLE voice_uploads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  s3_key VARCHAR(255) NOT NULL,
  status VARCHAR(50) DEFAULT 'processing',
  extracted_data JSONB,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  processed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_voice_uploads_user ON voice_uploads(user_id, created_at DESC);
```

### TypeScript Type Definitions

```typescript
// Voice Entry Types
interface VoiceUpload {
  id: string;
  userId: string;
  s3Key: string;
  status: 'processing' | 'completed' | 'failed';
  extractedData: ExtractedVoiceData | null;
  errorMessage: string | null;
  createdAt: string;
  processedAt: string | null;
}

interface ExtractedVoiceData {
  sales: number | null;
  expenses: number | null;
  expenseCategory: string | null;
  inventoryChanges: string | null;
  date: string;
  confidence: number;
}

// Cash Flow Types
interface DailyPrediction {
  date: string;
  predictedBalance: number;
  trend: 'up' | 'down' | 'stable';
  confidence: number;
  isNegative: boolean;
}

interface CashFlowPredictionResult {
  predictions: DailyPrediction[];
  insufficientData: boolean;
  historicalDays: number;
}

// Report Types
interface DailyReport {
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

interface ExpenseCategory {
  category: string;
  amount: number;
}

// Alert Types
interface ExpenseAlert {
  type: 'high_amount' | 'unusual_category' | 'unusual_timing';
  explanation: string;
  severity: 'warning' | 'critical';
  expenseAmount: number;
  category: string;
}

interface AnomalyDetectionResult {
  isAnomaly: boolean;
  type?: string;
  explanation?: string;
  severity?: string;
}

// User Preferences
interface UserPreferences {
  userId: string;
  automationEnabled: boolean;
  reportTime: string;
  language: 'en' | 'hi';
  updatedAt: string;
}
```


## Correctness Properties

A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.

### Property Reflection

After analyzing all acceptance criteria, I identified the following redundancies and consolidations:

- Properties 1.1 and 1.3 (recording start and stop) can be combined into a single recording lifecycle property
- Properties 2.2, 2.3, and 2.4 (Transcribe call, Bedrock extraction, response format) can be combined into a single voice processing pipeline property
- Properties 4.1, 4.2, and 4.3 (query data, call Bedrock, generate predictions) can be combined into a single prediction generation property
- Properties 8.2 and 8.3 (query historical data, call Bedrock) can be combined into a single anomaly detection property
- Properties 9.2, 9.4, and 9.5 (alert display, dismiss, persistence) can be combined into a single alert lifecycle property
- Properties 11.2, 11.3, 11.4, and 11.5 (validation, invocation, forwarding, error handling) represent the standard API route pattern and can be consolidated

### Voice-to-Entry Properties

**Property 1: Recording lifecycle completeness**
*For any* recording session, starting recording should initialize MediaRecorder with active state, and stopping recording should produce a valid audio Blob in MP3, WAV, or M4A format.
**Validates: Requirements 1.1, 1.3**

**Property 2: Waveform visualization during recording**
*For any* active recording session, the waveform data array should be continuously updated and the duration should increment.
**Validates: Requirements 1.2**

**Property 3: S3 upload with correct bucket**
*For any* audio file ready for upload, the upload request should target the "vyapar-voice" S3 bucket.
**Validates: Requirements 1.4**

**Property 4: Offline queue and retry**
*For any* audio file created while offline, it should be added to the upload queue, and when connectivity is restored, all queued files should be uploaded in order.
**Validates: Requirements 1.6, 12.1, 12.2, 12.3**

**Property 5: Error message localization**
*For any* recording error, the displayed error message should be in the user's selected language.
**Validates: Requirements 1.7**

**Property 6: Voice processing pipeline**
*For any* audio file uploaded to S3, the Lambda function should call Transcribe with language code 'hi-IN', then call Bedrock to extract structured data (sales, expenses, expenseCategory, inventoryChanges, date, confidence), and return a JSON response with all required fields.
**Validates: Requirements 2.2, 2.3, 2.4**

**Property 7: Transcription error handling**
*For any* transcription failure, the Lambda function should return an error response with details and log the error to CloudWatch.
**Validates: Requirements 2.5**

**Property 8: Form auto-fill from extracted data**
*For any* extracted voice data received by the UI, all non-null fields should populate the corresponding form inputs.
**Validates: Requirements 2.6**

**Property 9: Pre-signed URL generation**
*For any* S3 file access request, a pre-signed URL should be generated with appropriate expiration time.
**Validates: Requirements 3.3**

**Property 10: Upload queue status display**
*For any* non-empty upload queue, the UI should display the number of pending uploads and current upload progress.
**Validates: Requirements 12.4**

**Property 11: Queue completion notification**
*For any* upload queue that completes all uploads, the queue should be cleared and a success notification should be shown to the user.
**Validates: Requirements 12.5**

### Predictive Cash Flow Properties

**Property 12: Historical data query range**
*For any* cash flow prediction request, the system should query exactly the last 30 days of daily entries from Supabase.
**Validates: Requirements 4.1**

**Property 13: Prediction generation completeness**
*For any* historical data set with at least 7 days, the Bedrock analysis should return exactly 7 daily predictions, each containing date, predictedBalance, trend, and confidence fields.
**Validates: Requirements 4.2, 4.3, 4.5**

**Property 14: Negative balance alert flagging**
*For any* prediction with predictedBalance < 0, the isNegative flag should be set to true.
**Validates: Requirements 4.4**

**Property 15: Chart data visualization**
*For any* prediction data received, the chart component should render both historical and predicted data points with visual distinction.
**Validates: Requirements 5.1**

**Property 16: Alert badge display on negative prediction**
*For any* prediction set containing at least one negative balance, an alert badge should be displayed.
**Validates: Requirements 5.3**

**Property 17: Tooltip on hover**
*For any* data point in the chart, hovering should display a tooltip with detailed information for that day.
**Validates: Requirements 5.5**

### Automated Daily Reports Properties

**Property 18: User query for report generation**
*For any* scheduled report generation trigger, the system should query all users with automation enabled from Supabase.
**Validates: Requirements 6.2**

**Property 19: Per-user daily data retrieval**
*For any* user being processed, the system should retrieve that user's daily entries for the current date only.
**Validates: Requirements 6.3**

**Property 20: Report insights completeness**
*For any* daily data set, the Bedrock-generated report should include totalSales, totalExpenses, netProfit, topExpenseCategories array, and insights text.
**Validates: Requirements 6.4**

**Property 21: Report storage with metadata**
*For any* generated report, it should be stored in Supabase with user_id, date, generated_at timestamp, and all insight fields.
**Validates: Requirements 6.5**

**Property 22: Error isolation in batch processing**
*For any* user whose report generation fails, the error should be logged and processing should continue for remaining users.
**Validates: Requirements 6.7**

**Property 23: Report list sorting**
*For any* reports list displayed, reports should be sorted by date in descending order (newest first).
**Validates: Requirements 7.1**

**Property 24: Report detail display**
*For any* report clicked, the full report content should be displayed including all summary fields and insights.
**Validates: Requirements 7.2**

**Property 25: Automation toggle persistence**
*For any* automation toggle change, the user's preference should be updated in Supabase and reflected in subsequent scheduled runs.
**Validates: Requirements 7.3, 7.4**

**Property 26: Last generation timestamp display**
*For any* user with at least one report, the timestamp of the most recent report should be displayed.
**Validates: Requirements 7.5**

### Smart Expense Alerts Properties

**Property 27: Lambda invocation on expense submission**
*For any* daily entry submission containing an expense, the expense alert Lambda function should be invoked.
**Validates: Requirements 8.1**

**Property 28: Historical expense query by category**
*For any* expense being analyzed, the system should query historical expenses from Supabase filtered by the same category.
**Validates: Requirements 8.2, 8.3**

**Property 29: Alert response format**
*For any* detected anomaly, the response should include type, explanation, severity, expenseAmount, and category fields.
**Validates: Requirements 8.5**

**Property 30: Alert banner display with content**
*For any* alert received, an alert banner should be displayed containing the AI-generated explanation and a dismiss button.
**Validates: Requirements 8.6, 8.7**

**Property 31: Alert lifecycle management**
*For any* displayed alert, it should remain visible until the user explicitly clicks dismiss, at which point the banner should be hidden.
**Validates: Requirements 9.2, 9.4, 9.5**

### Lambda Function Error Handling Properties

**Property 32: Structured error responses**
*For any* Lambda function error, the response should be a JSON object containing error type, message, and timestamp fields.
**Validates: Requirements 10.2**

**Property 33: Error logging to CloudWatch**
*For any* Lambda function error, console.error should be called with sufficient context including error message, stack trace, and relevant input data.
**Validates: Requirements 10.3**

**Property 34: Execution milestone logging**
*For any* Lambda function execution, logs should be written for execution start, key processing milestones, and completion.
**Validates: Requirements 10.4**

### API Route Properties

**Property 35: Request payload validation**
*For any* API route request, invalid payloads should be rejected with a 400 status code before Lambda invocation.
**Validates: Requirements 11.2**

**Property 36: Lambda invocation via AWS SDK**
*For any* validated API request, the corresponding Lambda function should be invoked using AWS SDK with correct function name and payload.
**Validates: Requirements 11.3**

**Property 37: Response forwarding**
*For any* successful Lambda response, the API route should forward the response body to the client with appropriate status code.
**Validates: Requirements 11.4**

**Property 38: Lambda failure error handling**
*For any* Lambda invocation failure, the API route should return an HTTP error status (500 or appropriate) with error details in the response body.
**Validates: Requirements 11.5**

**Property 39: POST method enforcement**
*For any* API route in /api/voice-entry, /api/predict-cashflow, /api/expense-alert, only POST requests should be accepted.
**Validates: Requirements 11.6**

**Property 40: Authentication requirement**
*For any* API route request without valid authentication, the request should be rejected with a 401 status code.
**Validates: Requirements 11.7**

### Integration Properties

**Property 41: Component integration with existing features**
*For any* new component (VoiceRecorder, CashFlowPredictor, ReportViewer, ExpenseAlertBanner), it should successfully integrate with existing daily entry and credit tracking components without breaking existing functionality.
**Validates: Requirements 13.4**

## Error Handling

### Frontend Error Handling

**Voice Recording Errors:**
- MediaRecorder not supported: Display browser compatibility message
- Microphone permission denied: Display permission request with instructions
- Recording failure: Display error message and allow retry
- Upload failure: Queue for retry, display status

**API Call Errors:**
- Network timeout: Display timeout message, allow retry
- 401 Unauthorized: Redirect to login
- 500 Server error: Display error message with details
- Lambda timeout: Display processing timeout message

**Offline Handling:**
- Detect offline state using navigator.onLine
- Queue operations for later sync
- Display offline indicator
- Auto-retry when online

### Lambda Error Handling

**Transcribe Errors:**
- Invalid audio format: Return error with supported formats
- Transcription timeout: Return timeout error
- Service unavailable: Return retry-able error

**Bedrock Errors:**
- Rate limit exceeded: Implement exponential backoff
- Invalid prompt: Log error, return generic error to client
- Service unavailable: Return retry-able error

**Supabase Errors:**
- Connection timeout: Retry with exponential backoff
- Query error: Log error, return error response
- Authentication error: Return 401 error

**General Lambda Errors:**
- All errors wrapped in try-catch
- Structured error responses with type, message, timestamp
- CloudWatch logging with context
- Graceful degradation where possible

### Error Response Format

```typescript
interface ErrorResponse {
  success: false;
  error: {
    type: string; // 'validation', 'transcription', 'bedrock', 'database', 'timeout', 'unknown'
    message: string; // User-friendly message
    details?: string; // Technical details for debugging
    timestamp: string; // ISO 8601 timestamp
    retryable: boolean; // Whether client should retry
  };
}
```

## Testing Strategy

### Dual Testing Approach

This feature requires both unit tests and property-based tests for comprehensive coverage:

**Unit Tests** focus on:
- Specific examples of voice data extraction
- Edge cases (empty audio, malformed data, missing fields)
- Error conditions (network failures, service unavailable)
- Integration points between components
- Specific prediction scenarios
- Report generation with known data

**Property-Based Tests** focus on:
- Universal properties that hold for all inputs
- Recording lifecycle across random audio inputs
- Prediction generation for any valid historical data set
- Alert detection for any expense pattern
- API route behavior for any valid/invalid payload
- Offline queue behavior for any number of queued files

### Property-Based Testing Configuration

**Testing Library:** fast-check (for TypeScript/JavaScript)

**Configuration:**
- Minimum 100 iterations per property test
- Each test tagged with feature name and property number
- Tag format: `// Feature: aws-hackathon-features, Property N: [property text]`

**Example Property Test:**

```typescript
import fc from 'fast-check';

// Feature: aws-hackathon-features, Property 4: Offline queue and retry
test('offline queue uploads all files when connectivity restored', () => {
  fc.assert(
    fc.property(
      fc.array(fc.record({
        blob: fc.constant(new Blob(['test'], { type: 'audio/mp3' })),
        userId: fc.uuid(),
      }), { minLength: 1, maxLength: 10 }),
      async (audioFiles) => {
        // Simulate offline state
        mockOffline();
        
        // Queue all files
        for (const file of audioFiles) {
          await queueAudioUpload(file.blob, file.userId);
        }
        
        // Verify queue size
        expect(getQueueSize()).toBe(audioFiles.length);
        
        // Simulate online state
        mockOnline();
        await processQueue();
        
        // Verify all uploaded
        expect(getQueueSize()).toBe(0);
        expect(getUploadedCount()).toBe(audioFiles.length);
      }
    ),
    { numRuns: 100 }
  );
});
```

### Unit Test Coverage

**Voice-to-Entry:**
- Recording start/stop with valid audio
- Upload to correct S3 bucket
- Offline queue management
- Form auto-fill with extracted data
- Error handling for each failure mode

**Predictive Cash Flow:**
- Prediction with 30 days of data
- Insufficient data handling (< 7 days)
- Negative balance flagging
- Chart rendering with predictions
- Alert badge display

**Automated Reports:**
- Report generation for single user
- Batch processing multiple users
- Error isolation (one user fails, others succeed)
- Report storage and retrieval
- Automation toggle

**Smart Expense Alerts:**
- Anomaly detection for high amount
- Anomaly detection for unusual category
- No alert for normal expenses
- Alert banner display and dismiss
- Historical data query

### Integration Testing

**End-to-End Flows:**
1. Voice recording → Upload → Transcribe → Extract → Form fill
2. Request prediction → Query data → Bedrock analysis → Display chart
3. Scheduled trigger → Generate reports → Store in DB → Display in UI
4. Submit expense → Query history → Detect anomaly → Display alert

**AWS Service Mocking:**
- Use AWS SDK mocks for local testing
- Mock S3 uploads and triggers
- Mock Transcribe responses
- Mock Bedrock responses
- Mock EventBridge triggers

### Testing Tools

- **Jest**: Unit and integration testing framework
- **fast-check**: Property-based testing library
- **React Testing Library**: Component testing
- **AWS SDK Mock**: Mock AWS service calls
- **MSW (Mock Service Worker)**: Mock API routes

### Test Data Generators

```typescript
// Generator for daily entries
const dailyEntryArbitrary = fc.record({
  date: fc.date(),
  sales: fc.float({ min: 0, max: 100000 }),
  expenses: fc.float({ min: 0, max: 50000 }),
  category: fc.constantFrom('food', 'transport', 'utilities', 'supplies', 'other'),
});

// Generator for audio blobs
const audioBlob Arbitrary = fc.record({
  blob: fc.constant(new Blob(['test audio'], { type: 'audio/mp3' })),
  duration: fc.integer({ min: 1, max: 300 }), // 1-300 seconds
});

// Generator for expense data
const expenseArbitrary = fc.record({
  amount: fc.float({ min: 1, max: 100000 }),
  category: fc.constantFrom('food', 'transport', 'utilities', 'supplies', 'rent', 'salary', 'other'),
  date: fc.date(),
});
```

### Deployment Testing

**Pre-Deployment Checklist:**
- All unit tests pass
- All property tests pass (100+ iterations each)
- Lambda functions deployed to AWS
- S3 buckets configured with lifecycle policies
- EventBridge scheduler configured
- Environment variables set
- IAM roles and permissions configured

**Post-Deployment Verification:**
- Test voice recording and upload in production
- Verify S3 trigger invokes Lambda
- Test cash flow prediction with real data
- Verify scheduled report generation
- Test expense alert with real submission
- Monitor CloudWatch logs for errors
- Verify S3 lifecycle policies delete old files
