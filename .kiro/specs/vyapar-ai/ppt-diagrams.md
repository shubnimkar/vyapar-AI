# Vyapar AI - PPT Presentation Diagrams

## 1. High-Level System Overview (For Opening Slide)

```mermaid
graph LR
    subgraph "Shop Owner"
        User[👤 Small Business Owner<br/>Kirana/Salon/Pharmacy]
    end
    
    subgraph "Vyapar AI Platform"
        Upload[📊 Upload Business Data<br/>Sales • Expenses • Inventory]
        AI[🤖 AI Analysis<br/>AWS Bedrock]
        Insights[💡 Actionable Insights<br/>Hindi • Marathi • English]
    end
    
    User -->|CSV Files| Upload
    Upload -->|Data| AI
    AI -->|Insights| Insights
    Insights -->|Voice + Text| User
    
    style User fill:#e1f5e1
    style AI fill:#e1e5ff
    style Insights fill:#ffe1e1
```

---

## 2. User Journey Flow (For Demo Walkthrough)

```mermaid
flowchart LR
    A[🌐 Open App] --> B[🗣️ Select Language<br/>Hindi/Marathi/English]
    B --> C[📤 Upload CSVs<br/>Sales • Expenses • Inventory]
    C --> D[🔍 Click Analyze]
    D --> E[💡 View Insights<br/>Profit • Losses • Cashflow]
    E --> F[❓ Ask Questions<br/>Voice or Text]
    F --> G[🎯 Take Action<br/>Informed Decisions]
    
    style A fill:#e1f5e1
    style D fill:#ffe1e1
    style E fill:#e1e5ff
    style G fill:#ccffcc
```

---

## 3. Core Features Overview (For Features Slide)

```mermaid
mindmap
  root((Vyapar AI))
    Multilingual
      Hindi
      Marathi
      English
      Real-time Switching
    Data Upload
      CSV Sales
      CSV Expenses
      CSV Inventory
      Instant Preview
    AI Analysis
      True Profit
      Loss Products
      Blocked Cash
      Expense Alerts
      7-Day Forecast
    Q&A Chat
      Context-Aware
      Voice Input
      Voice Output
      Conversation History
    Offline-First
      PWA Support
      Local Storage
      No Data Loss
```

---

## 4. AWS Architecture (For Technical Slide)

```mermaid
graph TB
    subgraph "Frontend"
        PWA[📱 Progressive Web App<br/>Next.js 14 • React 18<br/>Tailwind CSS]
    end
    
    subgraph "AWS Services"
        Bedrock[🤖 AWS Bedrock<br/>Claude 3 Sonnet<br/>Titan Models]
        S3[📦 S3<br/>Receipt Storage<br/>Voice Files]
        Lambda[⚡ Lambda<br/>OCR Processing<br/>Voice Processing<br/>Report Generation]
        DynamoDB[💾 DynamoDB<br/>User Data<br/>Sessions<br/>Transactions]
    end
    
    subgraph "Deployment"
        Vercel[🚀 Vercel<br/>Edge Network<br/>Serverless Functions]
    end
    
    PWA <-->|API Calls| Vercel
    Vercel <-->|AI Requests| Bedrock
    Vercel <-->|File Storage| S3
    S3 -->|Triggers| Lambda
    Lambda <-->|Data Access| DynamoDB
    Vercel <-->|Data Access| DynamoDB
    
    style Bedrock fill:#e1e5ff
    style PWA fill:#e1f5e1
    style DynamoDB fill:#fff4e1
```

---

## 5. Hybrid Intelligence Model (For Architecture Philosophy)

```mermaid
graph TB
    subgraph "Deterministic Core"
        direction TB
        HC[Health Score<br/>Pure TypeScript]
        MC[Margin Calculation<br/>Pure TypeScript]
        SI[Stress Index<br/>Pure TypeScript]
        AI_calc[Affordability Index<br/>Pure TypeScript]
        DS[Daily Suggestions<br/>Rule-Based Engine]
        CF[Credit Follow-up<br/>Deterministic Logic]
        
        HC -.->|Always Accurate| Results
        MC -.->|Always Accurate| Results
        SI -.->|Always Accurate| Results
        AI_calc -.->|Always Accurate| Results
        DS -.->|Always Accurate| Results
        CF -.->|Always Accurate| Results
    end
    
    subgraph "AI Interpretation Layer"
        direction TB
        Explain[Explain Metrics<br/>AWS Bedrock]
        Advice[Persona-Aware Advice<br/>AWS Bedrock]
        Simplify[Adjust Complexity<br/>AWS Bedrock]
        Summarize[Summarize State<br/>AWS Bedrock]
        
        Results -->|Computed Values| Explain
        Results -->|Computed Values| Advice
        Results -->|Computed Values| Simplify
        Results -->|Computed Values| Summarize
    end
    
    subgraph "User Experience"
        UI[📱 Shop Owner Interface<br/>Numbers + Explanations]
    end
    
    Explain --> UI
    Advice --> UI
    Simplify --> UI
    Summarize --> UI
    
    style HC fill:#ccffcc
    style MC fill:#ccffcc
    style SI fill:#ccffcc
    style AI_calc fill:#ccffcc
    style DS fill:#ccffcc
    style CF fill:#ccffcc
    style Explain fill:#e1e5ff
    style Advice fill:#e1e5ff
    style Simplify fill:#e1e5ff
    style Summarize fill:#e1e5ff
    style UI fill:#ffe1e1
    
    Note1[Deterministic First:<br/>Financial calculations are<br/>pure, testable, offline-capable]
    Note2[AI Interprets:<br/>Explains numbers in<br/>user's language & context]
    
    style Note1 fill:#f0fff0
    style Note2 fill:#f0f0ff
```

---

## 6. Key Use Cases (For Problem-Solution Slide)

```mermaid
graph TB
    subgraph "Shop Owner Problems"
        P1[❌ Don't know true profit<br/>after all expenses]
        P2[❌ Can't identify which<br/>products lose money]
        P3[❌ Cash stuck in<br/>unsold inventory]
        P4[❌ Forget to follow up<br/>on credit payments]
        P5[❌ Can't predict<br/>cashflow issues]
    end
    
    subgraph "Vyapar AI Solutions"
        S1[✅ True Profit Analysis<br/>Sales - Expenses - Inventory Cost]
        S2[✅ Loss Product Detection<br/>Selling Price < Cost Price]
        S3[✅ Blocked Cash Calculator<br/>Inventory Value × Days Unsold]
        S4[✅ Udhaar Follow-Up Panel<br/>Overdue Credits + WhatsApp Links]
        S5[✅ 7-Day Cashflow Forecast<br/>AI-Powered Predictions]
    end
    
    P1 -.->|Solves| S1
    P2 -.->|Solves| S2
    P3 -.->|Solves| S3
    P4 -.->|Solves| S4
    P5 -.->|Solves| S5
    
    style P1 fill:#ffcccc
    style P2 fill:#ffcccc
    style P3 fill:#ffcccc
    style P4 fill:#ffcccc
    style P5 fill:#ffcccc
    style S1 fill:#ccffcc
    style S2 fill:#ccffcc
    style S3 fill:#ccffcc
    style S4 fill:#ccffcc
    style S5 fill:#ccffcc
```

---

## 7. Data Flow - Simple Version (For Technical Overview)

```mermaid
sequenceDiagram
    participant 👤 as Shop Owner
    participant 📱 as Vyapar AI
    participant 🤖 as AWS Bedrock
    participant 💾 as DynamoDB
    
    👤->>📱: Upload Sales/Expenses CSV
    📱->>💾: Store Transaction Data
    
    👤->>📱: Click "Analyze"
    📱->>💾: Retrieve All Data
    📱->>📱: Calculate Metrics<br/>(Deterministic)
    📱->>🤖: Request AI Explanation
    🤖-->>📱: Persona-Aware Insights
    📱-->>👤: Display in Hindi/Marathi
    
    👤->>📱: Ask Question (Voice/Text)
    📱->>💾: Get Context
    📱->>🤖: Send Question + Context
    🤖-->>📱: AI Answer
    📱-->>👤: Display Answer
    
    Note over 📱,💾: Offline-First:<br/>Works without internet
    Note over 📱,🤖: AI Layer:<br/>Explains, doesn't calculate
```

---

## 8. Persona-Aware AI (For AI Features Slide)

```mermaid
graph TB
    subgraph "User Profile"
        Profile[Business Type<br/>Kirana • Salon • Pharmacy<br/>Restaurant • Other]
        Mode[Explanation Mode<br/>Simple • Detailed]
        Lang[Language<br/>Hindi • Marathi • English]
    end
    
    subgraph "AI Prompt Builder"
        Builder[Dynamic Prompt<br/>Construction]
    end
    
    subgraph "AI Response"
        Response[Personalized Advice<br/>Context-Aware<br/>Complexity-Adjusted]
    end
    
    Profile --> Builder
    Mode --> Builder
    Lang --> Builder
    
    Builder -->|Kirana Owner| Ex1[Example: Focus on<br/>inventory turnover,<br/>seasonal demand]
    Builder -->|Salon Owner| Ex2[Example: Focus on<br/>service margins,<br/>repeat customers]
    Builder -->|Simple Mode| Ex3[Example: 2-3 bullets,<br/>no jargon,<br/>short sentences]
    Builder -->|Detailed Mode| Ex4[Example: 5-7 bullets,<br/>explain concepts,<br/>deeper analysis]
    
    Ex1 --> Response
    Ex2 --> Response
    Ex3 --> Response
    Ex4 --> Response
    
    style Profile fill:#e1f5e1
    style Builder fill:#ffe1e1
    style Response fill:#e1e5ff
```

---

## 9. Offline-First Architecture (For PWA Features)

```mermaid
graph TB
    subgraph "Browser"
        UI[User Interface]
        LS[localStorage<br/>Daily Entries<br/>Credits<br/>Pending Transactions<br/>Language Preference]
        SW[Service Worker<br/>Cache Assets<br/>Offline Page]
    end
    
    subgraph "Network"
        API[API Routes]
        DB[(DynamoDB)]
    end
    
    UI -->|Write| LS
    UI -->|Read| LS
    UI -->|Online?| Check{Internet<br/>Available?}
    
    Check -->|Yes| Sync[Sync to Server]
    Check -->|No| Offline[Continue Offline]
    
    Sync --> API
    API --> DB
    DB -.->|Sync Back| LS
    
    Offline --> LS
    
    SW -.->|Cache| UI
    
    Note1[Works without internet<br/>Syncs when online<br/>No data loss]
    
    style LS fill:#fff4e1
    style SW fill:#e1ffe1
    style Note1 fill:#f0fff0
```

---

## 10. Security & Privacy (For Trust Slide)

```mermaid
graph TB
    subgraph "Data Security"
        NoAuth[No Authentication Required<br/>Privacy-First Design]
        InMemory[In-Memory Sessions<br/>2-Hour Auto-Cleanup]
        NoLogs[No Data Logging<br/>No Persistence]
        LocalOnly[Sensitive Data<br/>Stays in Browser]
    end
    
    subgraph "Transport Security"
        HTTPS[HTTPS Only<br/>TLS 1.3 Encryption]
        AWS_Enc[AWS Bedrock<br/>Encrypted Transit]
    end
    
    subgraph "Input Security"
        Validation[CSV Schema Validation<br/>Type Guards]
        Sanitization[Input Sanitization<br/>XSS Protection]
        RateLimit[Rate Limiting<br/>DDoS Protection]
    end
    
    User[👤 Shop Owner] -->|Uploads| Validation
    Validation --> Sanitization
    Sanitization --> HTTPS
    HTTPS --> InMemory
    InMemory --> AWS_Enc
    
    InMemory -.->|Auto-Delete| NoLogs
    LocalOnly -.->|Never Sent| NoAuth
    
    style NoAuth fill:#ccffcc
    style InMemory fill:#fff4e1
    style NoLogs fill:#ccffcc
    style LocalOnly fill:#ccffcc
    style HTTPS fill:#e1ffe1
```

---

## 11. Technology Stack Summary (For Tech Stack Slide)

```mermaid
graph TB
    subgraph "Frontend"
        F1[Next.js 14<br/>App Router]
        F2[React 18<br/>Server Components]
        F3[Tailwind CSS<br/>Responsive Design]
        F4[TypeScript<br/>Type Safety]
    end
    
    subgraph "Backend"
        B1[Node.js<br/>Serverless Functions]
        B2[AWS SDK v3<br/>Bedrock Client]
        B3[PapaParse<br/>CSV Processing]
    end
    
    subgraph "AI & Cloud"
        C1[AWS Bedrock<br/>Claude 3 Sonnet]
        C2[AWS DynamoDB<br/>NoSQL Database]
        C3[AWS S3<br/>File Storage]
        C4[AWS Lambda<br/>Event Processing]
    end
    
    subgraph "Testing"
        T1[Jest<br/>Unit Tests]
        T2[React Testing Library<br/>Component Tests]
        T3[fast-check<br/>Property-Based Tests]
    end
    
    subgraph "Deployment"
        D1[Vercel<br/>Edge Network]
        D2[PWA<br/>Offline Support]
    end
    
    F1 --> B1
    F2 --> B1
    B1 --> C1
    B1 --> C2
    B1 --> C3
    C3 --> C4
    
    F1 --> D1
    F1 --> D2
    
    B1 --> T1
    F2 --> T2
    B1 --> T3
    
    style C1 fill:#e1e5ff
    style C2 fill:#fff4e1
    style D1 fill:#ffe1e1
```

---

## 12. Demo Flow (For Live Demo Slide)

```mermaid
flowchart TD
    Start([Start Demo]) --> Step1[1️⃣ Show Landing Page<br/>Select Hindi Language]
    Step1 --> Step2[2️⃣ Upload Sample CSVs<br/>Sales • Expenses • Inventory]
    Step2 --> Step3[3️⃣ Preview Data<br/>Show First 5 Rows]
    Step3 --> Step4[4️⃣ Click Analyze Button<br/>Show Loading State]
    Step4 --> Step5[5️⃣ Display AI Insights<br/>💵 Profit • ⚠️ Losses • 📦 Inventory]
    Step5 --> Step6[6️⃣ Click Voice Button<br/>Listen in Hindi]
    Step6 --> Step7[7️⃣ Ask Question<br/>Type or Voice Input]
    Step7 --> Step8[8️⃣ Show AI Answer<br/>Context-Aware Response]
    Step8 --> Step9[9️⃣ Switch to Marathi<br/>Real-Time UI Update]
    Step9 --> Step10[🔟 Show Udhaar Panel<br/>Overdue Credits + WhatsApp]
    Step10 --> End([Demo Complete])
    
    style Start fill:#e1f5e1
    style Step5 fill:#e1e5ff
    style Step10 fill:#ffe1e1
    style End fill:#ccffcc
```

---

## 13. Impact Metrics (For Results Slide)

```mermaid
graph LR
    subgraph "Before Vyapar AI"
        B1[❌ Manual Calculations<br/>Hours of Work]
        B2[❌ Missed Loss Products<br/>Continued Losses]
        B3[❌ Forgotten Credits<br/>Cash Flow Issues]
        B4[❌ Language Barrier<br/>Complex Tools]
    end
    
    subgraph "After Vyapar AI"
        A1[✅ Instant Analysis<br/>Seconds]
        A2[✅ Automated Detection<br/>Stop Losses Early]
        A3[✅ Smart Reminders<br/>Recover Payments]
        A4[✅ Native Language<br/>Easy to Use]
    end
    
    B1 -.->|Transform| A1
    B2 -.->|Transform| A2
    B3 -.->|Transform| A3
    B4 -.->|Transform| A4
    
    A1 --> Impact[📈 Business Impact<br/>Better Decisions<br/>Higher Profits<br/>Improved Cashflow]
    A2 --> Impact
    A3 --> Impact
    A4 --> Impact
    
    style B1 fill:#ffcccc
    style B2 fill:#ffcccc
    style B3 fill:#ffcccc
    style B4 fill:#ffcccc
    style A1 fill:#ccffcc
    style A2 fill:#ccffcc
    style A3 fill:#ccffcc
    style A4 fill:#ccffcc
    style Impact fill:#e1e5ff
```

---

## 14. Roadmap (For Future Vision Slide)

```mermaid
timeline
    title Vyapar AI Development Roadmap
    
    section Phase 1 - MVP
        Core Features : CSV Upload
                      : AI Analysis
                      : Multilingual UI
                      : Q&A Chat
    
    section Phase 2 - Current
        AWS Integration : Bedrock AI
                        : DynamoDB Storage
                        : S3 + Lambda
                        : PWA Support
    
    section Phase 3 - Enhancements
        Advanced Features : Receipt OCR
                          : Voice Entry
                          : Stress Index
                          : Affordability Planner
                          : Segment Benchmarks
    
    section Phase 4 - Future
        Scale & Growth : Mobile Apps
                       : WhatsApp Bot
                       : Predictive Analytics
                       : Multi-User Support
                       : Payment Integration
```

---

## Presentation Tips

### Slide 1: Opening
- Use Diagram #1 (High-Level System Overview)
- Keep it simple, show the value proposition

### Slide 2: Problem Statement
- Use Diagram #6 (Key Use Cases)
- Show real pain points of shop owners

### Slide 3: Solution Overview
- Use Diagram #2 (User Journey Flow)
- Walk through the user experience

### Slide 4: Core Features
- Use Diagram #3 (Core Features Overview)
- Highlight multilingual, AI, and offline capabilities

### Slide 5: Technical Architecture
- Use Diagram #4 (AWS Architecture)
- Show AWS services integration

### Slide 6: Hybrid Intelligence
- Use Diagram #5 (Hybrid Intelligence Model)
- Explain deterministic-first approach

### Slide 7: Persona-Aware AI
- Use Diagram #8 (Persona-Aware AI)
- Show how AI adapts to user context

### Slide 8: Offline-First
- Use Diagram #9 (Offline-First Architecture)
- Demonstrate PWA capabilities

### Slide 9: Security & Privacy
- Use Diagram #10 (Security & Privacy)
- Build trust with judges

### Slide 10: Technology Stack
- Use Diagram #11 (Technology Stack Summary)
- Show comprehensive tech choices

### Slide 11: Live Demo
- Use Diagram #12 (Demo Flow)
- Follow this exact sequence

### Slide 12: Impact
- Use Diagram #13 (Impact Metrics)
- Show before/after transformation

### Slide 13: Roadmap
- Use Diagram #14 (Roadmap)
- Show vision for future

### Slide 14: Closing
- Use Diagram #7 (Data Flow - Simple Version)
- Recap the technical flow

---

## Export Instructions

### For PowerPoint:
1. Copy each mermaid diagram
2. Use online tool: https://mermaid.live/
3. Export as PNG or SVG
4. Insert into PowerPoint slides

### For Google Slides:
1. Same process as PowerPoint
2. Or use Mermaid Chrome extension

### For PDF:
1. Export diagrams as SVG for best quality
2. Use high resolution (300 DPI minimum)

---

## Color Scheme Reference

- **Green (#e1f5e1, #ccffcc)**: User-facing, positive outcomes
- **Blue (#e1e5ff, #cce5ff)**: AI/AWS services, technical components
- **Yellow (#fff4e1, #ffffcc)**: Data storage, sessions
- **Red (#ffe1e1, #ffcccc)**: Problems, errors, warnings
- **Light Green (#e1ffe1, #f0fff0)**: Security, trust, success

Use these consistently across all slides for visual coherence.
