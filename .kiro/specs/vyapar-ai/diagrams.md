# Vyapar AI - Architecture & Process Flow Diagrams

## System Architecture Diagram

```mermaid
graph TB
    subgraph "Client Layer - Browser"
        subgraph "React Components"
            LP[Landing Page<br/>Server Component]
            LS[Language Selector<br/>Client Component]
            FU[File Upload<br/>Client Component]
            ID[Insights Display<br/>Client Component]
            QA[Q&A Chat<br/>Client Component]
            ER[Error Display<br/>Client Component]
        end
        
        subgraph "Client-Side Services"
            Papa1[PapaParse<br/>CSV Preview]
            WS1[Web Speech API<br/>Synthesis]
            WS2[Web Speech API<br/>Recognition]
            LS_Store[localStorage<br/>Language Preference]
        end
    end
    
    subgraph "Next.js 14 App Router - Server"
        subgraph "API Routes - app/api/"
            API1[POST /api/upload<br/>CSV Processing]
            API2[POST /api/analyze<br/>AI Analysis]
            API3[POST /api/ask<br/>Q&A Handler]
        end
        
        subgraph "Server-Side Utilities"
            Papa2[PapaParse<br/>Server Parser]
            Validator[CSV Validator<br/>Type Guards]
            Translator[Translation Service<br/>en/hi/mr]
            Formatter[Currency Formatter<br/>₹ Symbol]
            PromptBuilder[Prompt Builder<br/>Analysis & Q&A]
        end
        
        subgraph "In-Memory Data Store"
            SessionStore[(Session Store<br/>Map<string, SessionData>)]
            CleanupJob[Cleanup Job<br/>2-hour expiry]
        end
        
        subgraph "AWS Integration"
            BedrockClient[Bedrock Runtime Client<br/>AWS SDK v3]
            RetryLogic[Retry Logic<br/>Exponential Backoff]
        end
    end
    
    subgraph "External Services"
        Bedrock[AWS Bedrock<br/>Claude 3 Sonnet<br/>or Titan Models]
        ENV[Environment Variables<br/>AWS_ACCESS_KEY_ID<br/>AWS_SECRET_ACCESS_KEY<br/>AWS_REGION]
    end
    
    %% Client to Server Connections
    FU -->|1. Upload CSV| API1
    LP -->|2. Request Analysis| API2
    QA -->|3. Ask Question| API3
    
    %% Client-Side Interactions
    FU -.->|Preview| Papa1
    LS -.->|Save/Load| LS_Store
    ID -.->|Speak| WS1
    QA -.->|Listen| WS2
    
    %% API Route Processing
    API1 --> Papa2
    API1 --> Validator
    API1 --> SessionStore
    
    API2 --> SessionStore
    API2 --> PromptBuilder
    API2 --> BedrockClient
    API2 --> Translator
    
    API3 --> SessionStore
    API3 --> PromptBuilder
    API3 --> BedrockClient
    API3 --> Translator
    
    %% Utilities
    Validator --> Translator
    PromptBuilder --> Translator
    ID --> Formatter
    
    %% AWS Integration
    BedrockClient --> RetryLogic
    BedrockClient -.->|API Call| Bedrock
    BedrockClient -.->|Load Credentials| ENV
    Bedrock -.->|AI Response| BedrockClient
    
    %% Session Management
    CleanupJob -.->|Periodic Cleanup| SessionStore
    
    %% Response Flow
    API1 -->|Response| FU
    API2 -->|Insights| ID
    API3 -->|Answer| QA
    
    API1 -.->|Error| ER
    API2 -.->|Error| ER
    API3 -.->|Error| ER
    
    style LP fill:#e1f5e1
    style SessionStore fill:#fff4e1
    style Bedrock fill:#e1e5ff
    style ENV fill:#ffe1e1
    style BedrockClient fill:#cce5ff
    style CleanupJob fill:#ffcccc
```

## Component Architecture Diagram

```mermaid
graph LR
    subgraph "Frontend Components"
        direction TB
        A[app/page.tsx<br/>Main Layout]
        B[LanguageSelector]
        C[FileUpload<br/>Sales]
        D[FileUpload<br/>Expenses]
        E[FileUpload<br/>Inventory]
        F[InsightsDisplay]
        G[QAChat]
        H[ErrorDisplay]
        I[LoadingSpinner]
        
        A --> B
        A --> C
        A --> D
        A --> E
        A --> F
        A --> G
        A --> H
        A --> I
    end
    
    subgraph "API Layer"
        direction TB
        J[/api/upload/route.ts]
        K[/api/analyze/route.ts]
        L[/api/ask/route.ts]
    end
    
    subgraph "Business Logic"
        direction TB
        M[lib/session.ts<br/>Session Management]
        N[lib/csv.ts<br/>CSV Validation]
        O[lib/bedrock.ts<br/>AI Client]
        P[lib/prompts.ts<br/>Prompt Templates]
        Q[lib/translations.ts<br/>i18n]
        R[lib/formatters.ts<br/>Currency/Date]
    end
    
    subgraph "Type Definitions"
        direction TB
        S[types/session.ts]
        T[types/csv.ts]
        U[types/insights.ts]
        V[types/language.ts]
    end
    
    C --> J
    D --> J
    E --> J
    A --> K
    G --> L
    
    J --> M
    J --> N
    K --> M
    K --> O
    K --> P
    K --> Q
    L --> M
    L --> O
    L --> P
    L --> Q
    
    F --> R
    H --> Q
    
    M --> S
    N --> T
    O --> U
    Q --> V
    
    style A fill:#e1f5e1
    style J fill:#ffe1e1
    style K fill:#ffe1e1
    style L fill:#ffe1e1
    style O fill:#e1e5ff
```

## Data Flow Architecture

```mermaid
sequenceDiagram
    participant User as 👤 Shop Owner
    participant Browser as 🌐 Browser
    participant Upload as API: /upload
    participant Analyze as API: /analyze
    participant Ask as API: /ask
    participant Session as 💾 Session Store
    participant Bedrock as 🤖 AWS Bedrock
    
    Note over User,Bedrock: 1. Language Selection
    User->>Browser: Select Language (Hindi)
    Browser->>Browser: Save to localStorage
    
    Note over User,Bedrock: 2. CSV Upload Flow
    User->>Browser: Upload Sales CSV
    Browser->>Browser: PapaParse Preview
    Browser->>Upload: POST /api/upload
    Upload->>Upload: Validate CSV
    Upload->>Session: Store Parsed Data
    Session-->>Upload: Session ID
    Upload-->>Browser: Preview + Session ID
    Browser-->>User: Show Preview
    
    User->>Browser: Upload Expenses CSV
    Browser->>Upload: POST /api/upload
    Upload->>Session: Store Parsed Data
    Upload-->>Browser: Preview + Session ID
    
    User->>Browser: Upload Inventory CSV
    Browser->>Upload: POST /api/upload
    Upload->>Session: Store Parsed Data
    Upload-->>Browser: Preview + Session ID
    
    Note over User,Bedrock: 3. Analysis Flow
    User->>Browser: Click "Analyze"
    Browser->>Analyze: POST /api/analyze
    Analyze->>Session: Retrieve All Data
    Session-->>Analyze: Sales + Expenses + Inventory
    Analyze->>Analyze: Build Analysis Prompt
    Analyze->>Bedrock: InvokeModel (Claude)
    Bedrock-->>Analyze: AI Insights (JSON)
    Analyze->>Analyze: Parse & Translate
    Analyze-->>Browser: Structured Insights
    Browser-->>User: Display Insights (Hindi)
    
    Note over User,Bedrock: 4. Voice Synthesis
    User->>Browser: Click 🔊 Listen
    Browser->>Browser: Web Speech API
    Browser-->>User: Speak Insight (Hindi)
    
    Note over User,Bedrock: 5. Q&A Flow
    User->>Browser: Type Question (Hindi)
    Browser->>Ask: POST /api/ask
    Ask->>Session: Retrieve Data + History
    Session-->>Ask: Context Data
    Ask->>Ask: Build Q&A Prompt
    Ask->>Bedrock: InvokeModel (Claude)
    Bedrock-->>Ask: AI Answer
    Ask->>Session: Store Q&A in History
    Ask-->>Browser: Answer (Hindi)
    Browser-->>User: Display Answer
    
    Note over User,Bedrock: 6. Session Cleanup
    User->>Browser: Close Tab
    Browser->>Browser: Clear Client State
    Session->>Session: Auto-cleanup after 2 hours
```

## Deployment Architecture

```mermaid
graph TB
    subgraph "User Devices"
        Mobile[📱 Mobile Browser<br/>Android/iOS]
        Desktop[💻 Desktop Browser<br/>Chrome/Firefox/Safari]
    end
    
    subgraph "CDN Layer"
        CDN[Vercel Edge Network<br/>Static Assets<br/>CSS, JS, Images]
    end
    
    subgraph "Vercel Serverless Platform"
        subgraph "Next.js Application"
            SSR[Server Components<br/>Static Pages]
            API[API Routes<br/>Serverless Functions]
            Memory[In-Memory Store<br/>Per-Instance]
        end
        
        subgraph "Environment"
            ENV_VARS[Environment Variables<br/>AWS Credentials<br/>Region Config]
        end
    end
    
    subgraph "AWS Cloud"
        Bedrock_Service[AWS Bedrock<br/>us-east-1<br/>Claude 3 Sonnet]
        IAM[IAM Credentials<br/>Access Keys]
    end
    
    Mobile -->|HTTPS| CDN
    Desktop -->|HTTPS| CDN
    CDN -->|Cache Miss| SSR
    
    Mobile -->|API Calls| API
    Desktop -->|API Calls| API
    
    API --> Memory
    API --> ENV_VARS
    API -->|AWS SDK v3| Bedrock_Service
    
    ENV_VARS -.->|Credentials| IAM
    IAM -.->|Authorize| Bedrock_Service
    
    style Mobile fill:#e1f5e1
    style Desktop fill:#e1f5e1
    style CDN fill:#ffe1e1
    style Bedrock_Service fill:#e1e5ff
    style Memory fill:#fff4e1
```

## Technology Stack Diagram

```mermaid
graph TB
    subgraph "Frontend Stack"
        React[React 18<br/>Server & Client Components]
        Next[Next.js 14<br/>App Router]
        Tailwind[Tailwind CSS<br/>Responsive Design]
        Papa_Client[PapaParse<br/>CSV Preview]
        WebSpeech[Web Speech API<br/>Voice I/O]
    end
    
    subgraph "Backend Stack"
        Node[Node.js Runtime<br/>Serverless Functions]
        Papa_Server[PapaParse<br/>CSV Parsing]
        AWS_SDK[AWS SDK v3<br/>@aws-sdk/client-bedrock-runtime]
        TypeScript[TypeScript<br/>Type Safety]
    end
    
    subgraph "AI & Cloud"
        Bedrock_AI[AWS Bedrock<br/>Claude 3 Sonnet<br/>Titan Models]
        Vercel_Deploy[Vercel<br/>Deployment Platform]
    end
    
    subgraph "Testing Stack"
        Jest[Jest<br/>Unit Tests]
        RTL[React Testing Library<br/>Component Tests]
        FastCheck[fast-check<br/>Property-Based Tests]
    end
    
    subgraph "Data & Storage"
        InMemory[JavaScript Map<br/>Session Store]
        LocalStorage[Browser localStorage<br/>Language Preference]
    end
    
    Next --> React
    Next --> Node
    React --> Tailwind
    React --> Papa_Client
    React --> WebSpeech
    Node --> Papa_Server
    Node --> AWS_SDK
    Node --> TypeScript
    AWS_SDK --> Bedrock_AI
    Next --> Vercel_Deploy
    
    React -.->|Test| RTL
    Node -.->|Test| Jest
    Node -.->|Test| FastCheck
    
    Node --> InMemory
    React --> LocalStorage
    
    style Bedrock_AI fill:#e1e5ff
    style Vercel_Deploy fill:#ffe1e1
    style InMemory fill:#fff4e1
    style LocalStorage fill:#fff4e1
```

## Security Architecture

```mermaid
graph TB
    subgraph "Client Security"
        HTTPS[HTTPS Only<br/>TLS 1.3]
        CSP[Content Security Policy<br/>XSS Protection]
        LocalStore[localStorage<br/>Language Only<br/>No Sensitive Data]
    end
    
    subgraph "API Security"
        EnvVars[Environment Variables<br/>Server-Side Only]
        NoAuth[No Authentication<br/>Stateless Sessions]
        Validation[Input Validation<br/>CSV Schema Checks]
        RateLimit[Rate Limiting<br/>Vercel Default]
    end
    
    subgraph "Data Security"
        InMemoryOnly[In-Memory Only<br/>No Persistence]
        SessionIsolation[Session Isolation<br/>UUID-based]
        AutoCleanup[Auto Cleanup<br/>2-hour Expiry]
        NoLogs[No Data Logging<br/>Privacy First]
    end
    
    subgraph "AWS Security"
        IAM_Keys[IAM Access Keys<br/>Least Privilege]
        Bedrock_Endpoint[Bedrock HTTPS<br/>Encrypted Transit]
        NoDataRetention[No Data Retention<br/>by AWS Bedrock]
    end
    
    Client[Client Browser] -->|1| HTTPS
    HTTPS --> CSP
    CSP --> LocalStore
    
    Client -->|2| RateLimit
    RateLimit --> Validation
    Validation --> EnvVars
    
    EnvVars --> IAM_Keys
    IAM_Keys --> Bedrock_Endpoint
    Bedrock_Endpoint --> NoDataRetention
    
    Validation --> InMemoryOnly
    InMemoryOnly --> SessionIsolation
    SessionIsolation --> AutoCleanup
    AutoCleanup --> NoLogs
    
    style HTTPS fill:#e1ffe1
    style EnvVars fill:#ffe1e1
    style InMemoryOnly fill:#fff4e1
    style IAM_Keys fill:#e1e5ff
```

## Process Flow Diagram

```mermaid
flowchart TD
    Start([Shop Owner Opens App]) --> LangCheck{Language<br/>Preference<br/>Exists?}
    
    LangCheck -->|No| SelectLang[Select Language<br/>English/Hindi/Marathi]
    LangCheck -->|Yes| LoadLang[Load Language<br/>from localStorage]
    SelectLang --> SaveLang[Save to localStorage]
    SaveLang --> Dashboard
    LoadLang --> Dashboard
    
    Dashboard[Dashboard View] --> Upload{Upload CSV Files}
    
    Upload --> UploadSales[📊 Upload Sales CSV]
    Upload --> UploadExpenses[💰 Upload Expenses CSV]
    Upload --> UploadInventory[📦 Upload Inventory CSV]
    
    UploadSales --> ParseSales[Parse & Validate<br/>PapaParse]
    UploadExpenses --> ParseExpenses[Parse & Validate<br/>PapaParse]
    UploadInventory --> ParseInventory[Parse & Validate<br/>PapaParse]
    
    ParseSales --> ValidateSales{Valid?}
    ParseExpenses --> ValidateExpenses{Valid?}
    ParseInventory --> ValidateInventory{Valid?}
    
    ValidateSales -->|No| ErrorSales[Show Error<br/>in Selected Language]
    ValidateExpenses -->|No| ErrorExpenses[Show Error<br/>in Selected Language]
    ValidateInventory -->|No| ErrorInventory[Show Error<br/>in Selected Language]
    
    ErrorSales --> Upload
    ErrorExpenses --> Upload
    ErrorInventory --> Upload
    
    ValidateSales -->|Yes| StoreSales[Store in Memory<br/>Session Store]
    ValidateExpenses -->|Yes| StoreExpenses[Store in Memory<br/>Session Store]
    ValidateInventory -->|Yes| StoreInventory[Store in Memory<br/>Session Store]
    
    StoreSales --> ShowPreview1[Show Preview<br/>First 5 Rows]
    StoreExpenses --> ShowPreview2[Show Preview<br/>First 5 Rows]
    StoreInventory --> ShowPreview3[Show Preview<br/>First 5 Rows]
    
    ShowPreview1 --> CheckData{All Data<br/>Uploaded?}
    ShowPreview2 --> CheckData
    ShowPreview3 --> CheckData
    
    CheckData -->|No| Upload
    CheckData -->|Yes| AnalyzeBtn[🔍 Analyze My Business<br/>Button Enabled]
    
    AnalyzeBtn --> ClickAnalyze{User Clicks<br/>Analyze?}
    
    ClickAnalyze -->|Yes| RetrieveData[Retrieve Session Data<br/>from Memory]
    RetrieveData --> BuildPrompt[Build Analysis Prompt<br/>with Data Context]
    BuildPrompt --> CallBedrock[Call AWS Bedrock<br/>Claude/Titan Model]
    
    CallBedrock --> BedrockSuccess{API<br/>Success?}
    
    BedrockSuccess -->|No| BedrockError[Show Error + Retry<br/>in Selected Language]
    BedrockError --> ClickAnalyze
    
    BedrockSuccess -->|Yes| ParseInsights[Parse AI Response<br/>into Categories]
    ParseInsights --> DisplayInsights[Display Insights<br/>💵 True Profit<br/>⚠️ Loss Products<br/>📦 Blocked Cash<br/>💰 Expenses<br/>📊 Cashflow]
    
    DisplayInsights --> InsightActions{User Action?}
    
    InsightActions -->|🔊 Listen| VoiceCheck{Web Speech<br/>Supported?}
    VoiceCheck -->|Yes| SpeakInsight[Speak Insight<br/>in Selected Language]
    VoiceCheck -->|No| HideVoice[Hide Voice Button]
    SpeakInsight --> InsightActions
    
    InsightActions -->|Ask Question| QAInterface[Q&A Interface]
    
    QAInterface --> InputMethod{Input Method?}
    InputMethod -->|Type| TypeQuestion[Type Question<br/>in Text Box]
    InputMethod -->|🎤 Voice| VoiceInput[Voice Input<br/>Speech Recognition]
    
    VoiceInput --> ConvertSpeech[Convert Speech<br/>to Text]
    ConvertSpeech --> SendQuestion
    TypeQuestion --> SendQuestion[Send Question<br/>to /api/ask]
    
    SendQuestion --> RetrieveContext[Retrieve Session Data<br/>+ Conversation History]
    RetrieveContext --> BuildQAPrompt[Build Q&A Prompt<br/>with Context]
    BuildQAPrompt --> CallBedrockQA[Call AWS Bedrock<br/>for Answer]
    
    CallBedrockQA --> QASuccess{API<br/>Success?}
    
    QASuccess -->|No| QAError[Show Error<br/>in Selected Language]
    QAError --> QAInterface
    
    QASuccess -->|Yes| StoreConversation[Store Q&A in<br/>Conversation History]
    StoreConversation --> DisplayAnswer[Display Answer<br/>in Selected Language]
    DisplayAnswer --> QAInterface
    
    InsightActions -->|Change Language| ChangeLang[Select New Language]
    ChangeLang --> UpdateUI[Update All UI Text<br/>Immediately]
    UpdateUI --> SaveLang
    
    InsightActions -->|Close/Navigate Away| Cleanup[Clear Session Data<br/>from Memory]
    Cleanup --> End([Session Ends])
    
    ClickAnalyze -->|No| QAInterface

    style Start fill:#e1f5e1
    style End fill:#ffe1e1
    style CallBedrock fill:#e1e5ff
    style CallBedrockQA fill:#e1e5ff
    style StoreSales fill:#fff4e1
    style StoreExpenses fill:#fff4e1
    style StoreInventory fill:#fff4e1
    style DisplayInsights fill:#e1ffe1
    style Cleanup fill:#ffe1e1
```

## Use Case Diagram

```mermaid
graph TB
    subgraph "Vyapar AI System"
        UC1[Upload CSV Files]
        UC2[Select Language]
        UC3[Analyze Business Health]
        UC4[View Insights]
        UC5[Listen to Insights]
        UC6[Ask Questions]
        UC7[Voice Input Questions]
        UC8[Change Language]
        UC9[View Conversation History]
        UC10[Retry Failed Operations]
    end
    
    subgraph "External Systems"
        AWS[AWS Bedrock<br/>Claude/Titan]
        WebSpeech[Web Speech API<br/>Browser]
        LocalStorage[Browser<br/>localStorage]
    end
    
    ShopOwner((Shop Owner<br/>Primary Actor))
    
    ShopOwner -->|uploads sales data| UC1
    ShopOwner -->|uploads expenses data| UC1
    ShopOwner -->|uploads inventory data| UC1
    ShopOwner -->|selects preferred language| UC2
    ShopOwner -->|requests analysis| UC3
    ShopOwner -->|views results| UC4
    ShopOwner -->|activates voice| UC5
    ShopOwner -->|types question| UC6
    ShopOwner -->|speaks question| UC7
    ShopOwner -->|switches language| UC8
    ShopOwner -->|reviews past Q&A| UC9
    ShopOwner -->|retries on error| UC10
    
    UC1 -.->|validates & stores| SessionStore[In-Memory<br/>Session Store]
    UC2 -.->|persists preference| LocalStorage
    UC3 -.->|sends data for analysis| AWS
    UC4 -.->|displays AI insights| ShopOwner
    UC5 -.->|uses text-to-speech| WebSpeech
    UC6 -.->|sends question| AWS
    UC7 -.->|uses speech-to-text| WebSpeech
    UC7 -.->|converts to text| UC6
    UC8 -.->|updates all content| UC4
    UC8 -.->|saves preference| LocalStorage
    UC9 -.->|retrieves from| SessionStore
    UC10 -.->|re-attempts| UC3
    UC10 -.->|re-attempts| UC6
    
    AWS -.->|returns insights| UC3
    AWS -.->|returns answer| UC6
    
    style ShopOwner fill:#ffcccc
    style AWS fill:#cce5ff
    style WebSpeech fill:#ccffcc
    style LocalStorage fill:#ffffcc
    style SessionStore fill:#ffebcc
    
    classDef usecase fill:#e1e5ff,stroke:#333,stroke-width:2px
    class UC1,UC2,UC3,UC4,UC5,UC6,UC7,UC8,UC9,UC10 usecase
```

## Detailed Use Case Descriptions

### UC1: Upload CSV Files
**Actor:** Shop Owner  
**Precondition:** User has CSV files with business data  
**Main Flow:**
1. User selects file type (sales/expenses/inventory)
2. User chooses CSV file from device
3. System parses and validates file
4. System displays preview (first 5 rows)
5. System stores data in memory for session

**Alternative Flow:**
- 3a. If validation fails, show error in selected language
- 3b. User corrects file and re-uploads

---

### UC2: Select Language
**Actor:** Shop Owner  
**Precondition:** None  
**Main Flow:**
1. User opens application
2. System checks for saved language preference
3. If none exists, display language selector
4. User selects English/Hindi/Marathi
5. System saves preference to localStorage
6. System displays all content in selected language

---

### UC3: Analyze Business Health
**Actor:** Shop Owner  
**Precondition:** At least one CSV file uploaded  
**Main Flow:**
1. User clicks "Analyze My Business" button
2. System retrieves uploaded data from session
3. System builds analysis prompt with data
4. System calls AWS Bedrock API
5. System receives AI-generated insights
6. System parses insights into categories
7. System displays insights in selected language

**Alternative Flow:**
- 4a. If API fails, show error with retry option
- 4b. User clicks retry to re-attempt analysis

---

### UC4: View Insights
**Actor:** Shop Owner  
**Precondition:** Analysis completed successfully  
**Main Flow:**
1. System displays insights in categorized sections:
   - 💵 True Profit Analysis
   - ⚠️ Loss-Making Products
   - 📦 Blocked Inventory Cash
   - 💰 Abnormal Expenses
   - 📊 7-Day Cashflow Forecast
2. Each section shows icon + text explanation
3. Monetary values formatted with ₹ symbol
4. Mobile-responsive card layout

---

### UC5: Listen to Insights
**Actor:** Shop Owner  
**Precondition:** Insights displayed, Web Speech API supported  
**Main Flow:**
1. User clicks 🔊 Listen button on insight section
2. System checks browser support for speech synthesis
3. System creates speech utterance in selected language
4. System speaks insight text aloud
5. User can click stop button to cancel playback

**Alternative Flow:**
- 2a. If not supported, hide voice buttons

---

### UC6: Ask Questions
**Actor:** Shop Owner  
**Precondition:** Data uploaded to session  
**Main Flow:**
1. User types question in text input
2. User clicks send button
3. System retrieves session data + conversation history
4. System builds Q&A prompt with context
5. System calls AWS Bedrock API
6. System receives AI answer
7. System stores Q&A in conversation history
8. System displays answer in selected language

**Alternative Flow:**
- 1a. If no data uploaded, show "upload data first" message
- 5a. If API fails, show error message

---

### UC7: Voice Input Questions
**Actor:** Shop Owner  
**Precondition:** Web Speech API supported, microphone access granted  
**Main Flow:**
1. User clicks 🎤 Voice button
2. System activates speech recognition
3. User speaks question in their language
4. System converts speech to text
5. System processes as text question (UC6)

---

### UC8: Change Language
**Actor:** Shop Owner  
**Precondition:** None  
**Main Flow:**
1. User clicks language selector
2. User selects new language
3. System updates localStorage
4. System re-renders all UI text immediately
5. System updates insights (if displayed)
6. System updates conversation history display

---

### UC9: View Conversation History
**Actor:** Shop Owner  
**Precondition:** At least one Q&A exchange completed  
**Main Flow:**
1. System displays all questions and answers chronologically
2. Each message shows role (user/assistant) and content
3. Auto-scrolls to latest message
4. History persists during session only

---

### UC10: Retry Failed Operations
**Actor:** Shop Owner  
**Precondition:** API call failed (analysis or Q&A)  
**Main Flow:**
1. System displays error message in selected language
2. System shows retry button
3. User clicks retry
4. System re-attempts the failed operation
5. On success, continues normal flow

---

## Actor Descriptions

### Primary Actor: Shop Owner
**Characteristics:**
- Small retail business owner in India
- Limited financial literacy
- Primarily uses mobile phone
- Prefers local language (Hindi/Marathi)
- May have limited digital literacy
- Needs simple, actionable insights

**Goals:**
- Understand true profitability
- Identify loss-making products
- Optimize inventory and expenses
- Improve cashflow management
- Get answers in native language

---

## System Boundary

**Inside System:**
- Next.js web application
- API routes (/api/upload, /api/analyze, /api/ask)
- In-memory session store
- CSV parsing and validation
- Prompt engineering
- UI components (React)

**Outside System:**
- AWS Bedrock (AI service)
- Web Speech API (browser)
- Browser localStorage
- User's CSV files
- User's device (mobile/desktop)

---

## Key Interactions

### Shop Owner ↔ System
- Uploads business data files
- Selects language preference
- Requests analysis
- Views insights
- Asks questions
- Listens to voice output

### System ↔ AWS Bedrock
- Sends analysis prompts with data
- Receives AI-generated insights
- Sends Q&A prompts with context
- Receives AI-generated answers

### System ↔ Browser APIs
- Stores language preference (localStorage)
- Synthesizes speech (Web Speech API)
- Recognizes speech (Web Speech API)

### System ↔ In-Memory Store
- Stores uploaded CSV data
- Retrieves data for analysis
- Stores conversation history
- Cleans up expired sessions
