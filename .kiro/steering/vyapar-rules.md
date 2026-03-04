# Vyapar AI -- Full Steering & Governance Document

(Architecture, Features, Security, AWS, Testing)

------------------------------------------------------------------------

# 1. Product Philosophy & Execution Model

## 1.1 Product Goals

Primary Goal: Make Vyapar AI a daily habit tool for small shop owners
--- not just analytics.

Secondary Goal: Clearly demonstrate AI value + AWS-native architecture.

Tertiary Goal: Remove obvious technical risks (sessions, state loss,
unstable AI flows).

------------------------------------------------------------------------

## 1.2 Hybrid Intelligence Principle (MANDATORY)

Vyapar AI follows a deterministic-first architecture.

### Deterministic Core (Authoritative Layer)

Must be pure TypeScript functions: - Health Score - Margin
Calculations - Stress Index - Affordability Index - Daily Suggestions -
Credit Follow-up logic

Rules: - No AI dependency - No network dependency - Fully offline
capable - Fully unit testable - No side effects

### AI Layer (Interpretation Layer Only)

AI is allowed to: - Explain computed metrics - Provide persona-aware
advice - Adjust explanation complexity - Summarize financial state

AI must NEVER: - Calculate financial metrics - Replace deterministic
logic - Store core business state

------------------------------------------------------------------------

# 2. Core Architecture

## 2.1 Next.js Rules

-   Use Next.js App Router.
-   API routes must be inside `app/api/`.
-   Use:

``` ts
export async function POST()
```

-   No business logic inside React components.
-   Use services/repositories for data access.
-   All financial logic in `/lib/finance/`.
-   All AI prompt building in `/lib/ai/`.

------------------------------------------------------------------------

# 3. AWS Architecture Rules

## 3.1 DynamoDB (Primary Database)

-   Single-table design required.

Partition key format:

    PK = USER#{user_id}
    SK = TYPE#{entity_type}#{timestamp_or_id}

Entity types:

-   DAILY_ENTRY
-   CREDIT_ENTRY
-   SESSION
-   PROFILE
-   SEGMENT_STATS

Use TTL for:

-   AI sessions (2 hours)
-   Expired credits
-   Temporary artifacts

------------------------------------------------------------------------

## 3.2 Session Store (CRITICAL)

In-memory session storage is NOT allowed.

All sessions must:

-   Be stored in DynamoDB
-   Use:

```{=html}
<!-- -->
```
    PK = SESSION#{session_id}

Include:

-   expires_at (TTL)
-   user_id
-   conversation state

Implement:

``` ts
saveSession()
getSession()
deleteSession()
```

No Map-based session storage in production.

------------------------------------------------------------------------

## 3.3 S3 Usage

-   Temporary storage only.
-   Lifecycle rules:
    -   Receipts: 7 days
    -   Voice: 1 day
-   Private buckets only.
-   Access via pre-signed URLs.
-   Lambda triggers for processing.

------------------------------------------------------------------------

## 3.4 Lambda Rules

-   Single responsibility per function.
-   256MB memory default.
-   Explicit timeout.
-   Structured JSON responses.
-   No session state.
-   Config via environment variables only.

------------------------------------------------------------------------

## 3.5 Bedrock Usage

-   Use AWS SDK v3.
-   Centralized client wrapper.
-   No direct model calls inside routes.
-   Prompts must be built via helper functions.

------------------------------------------------------------------------

# 4. Offline-First Strategy

Use localStorage for:

-   Daily entries
-   Credit tracking
-   Pending inferred transactions
-   Language preference
-   Business type
-   Explanation mode

Rules:

-   Sync when online.
-   Last-write-wins conflict resolution (hackathon scope).
-   UI must never block due to network issues.

------------------------------------------------------------------------

# 5. Feature Steering -- Track A

## A1. Daily Health Coach

Rules:

-   Rule-based engine only.
-   Severity: info \| warning \| critical.
-   Localized text via translation keys.
-   Store suggestions per day.
-   Allow dismissal (persist dismissed_at).

Engine must live in:

    /lib/finance/generateDailySuggestions.ts

------------------------------------------------------------------------

## A2. Udhaar Follow-Up Panel

Rules:

-   Only unpaid credits.
-   Overdue threshold (e.g., \>= 3 days).
-   Sort by days overdue → amount.
-   WhatsApp links properly encoded.
-   Update last_reminder_at when used.
-   Fully deterministic logic.

------------------------------------------------------------------------

## A3. Persona-Aware AI

Profile must include:

    business_type:
    - kirana
    - salon
    - pharmacy
    - restaurant
    - other

All prompts must include:

-   Persona identity
-   Business context
-   City tier if available

No hardcoded prompts in routes.

------------------------------------------------------------------------

## A4. Explanation Mode

Profile field:

    explanation_mode:
    - simple
    - detailed

Simple mode:

-   2--3 bullet points
-   No jargon
-   Short sentences

Detailed mode:

-   5--7 bullets
-   Explain margin, cash flow concepts

Prompt builder must inject this setting automatically.

------------------------------------------------------------------------

## A5. Click-to-Add (OCR / CSV)

OCR/CSV must return:

``` ts
InferredTransaction {
  id: string
  date: string
  type: 'expense' | 'sale'
  vendor_name?: string
  category?: string
  amount: number
  source: 'receipt' | 'csv'
}
```

Rules:

-   Store pending in localStorage.
-   Show Add / Later / Discard options.
-   No auto-insert without confirmation.
-   No duplicate prompting.

------------------------------------------------------------------------

## A6. Stress & Affordability Index

Stress Index:

-   Penalize:
    -   High credit ratio
    -   Low cash buffer
    -   High expense volatility
-   Output range: 0--100.

Affordability Index:

-   Based on planned_extra_cost / avg_monthly_profit.
-   Output range: 0--100.

Rules:

-   Deterministic.
-   Explainable.
-   No AI computation.

------------------------------------------------------------------------

## A7. Segment Benchmark (Optional)

Segment key:

    SEGMENT#{city_tier}#{business_type}

Store:

-   median_health_score
-   median_margin
-   sample_size

Frontend must show:

-   Above / At / Below average.

Pre-baked demo data allowed.

------------------------------------------------------------------------

# 6. Logging & Security -- Track B

## B1. Logging

Create `logger.ts`.

Allowed levels:

-   debug
-   info
-   warn
-   error

Rules:

-   No raw console.log in production.
-   Structured logs preferred.

------------------------------------------------------------------------

## B2. Error Format

All APIs must return:

``` json
{
  "success": false,
  "code": "ERROR_CODE",
  "message": "Localized friendly message"
}
```

No stack traces exposed to client.

------------------------------------------------------------------------

## B3. Security Headers

Add middleware for:

-   Content-Security-Policy
-   X-Frame-Options
-   X-Content-Type-Options
-   Referrer-Policy

Add body size limits to:

-   Upload endpoints
-   AI endpoints

------------------------------------------------------------------------

# 7. Testing Requirements

Mandatory unit tests for:

-   generateDailySuggestions
-   getOverdueCredits
-   calculateStressIndex
-   calculateAffordabilityIndex

Integration tests:

-   Login → create entry → fetch entry
-   AI analysis endpoint (mock Bedrock)

Lambda dry-run tests for:

-   receipt-ocr-processor
-   cashflow-predictor

------------------------------------------------------------------------

# 8. Demo Reliability Rules

You must rehearse:

1.  New user → profile → daily entry → health score → suggestion
    appears.
2.  Add credit → overdue → follow-up panel shows.
3.  Upload CSV → AI insights → click-to-add.
4.  Upload receipt → inferred expense prompt.

No demo without full rehearsal.

------------------------------------------------------------------------

# 9. Hard Non-Negotiable Rules

-   No in-memory business state in production.
-   No AI-computed financial metrics.
-   No business logic inside UI components.
-   No direct Bedrock calls without prompt builder.
-   No public S3 buckets.
-   No raw console.log in production.
-   Deterministic core always precedes AI explanation.

------------------------------------------------------------------------

# 10. Architecture Narrative (For Judges)

System must clearly demonstrate:

-   Offline-first PWA
-   Deterministic financial engine
-   AI explanation layer
-   DynamoDB single-table design
-   S3 + Lambda event-driven ingestion
-   Responsible AI usage

Core message:

"Deterministic numbers first → AI interprets → user takes action."
