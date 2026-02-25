# Requirements Document: Vyapar AI

## Introduction

Vyapar AI is a daily business health companion designed for small shop owners in India. The system acts as a "doctor for shop financial health," providing instant deterministic calculations for daily business metrics and AI-enhanced explanations in local languages. It addresses the critical need for 60+ million small retail shops to understand their true profitability beyond simple cash flow, potentially improving profits by 5-15%.

**Product Positioning**: Daily Business Health Companion for Small Shop Owners

The system serves the "AI for Retail, Commerce & Market Intelligence" track by combining deterministic business calculations with AI-powered insights to democratize financial intelligence for small businesses that lack formal accounting expertise.

**Architecture Philosophy**: Hybrid Intelligence Model
- **Deterministic Core**: All numeric calculations (profit, expenses, health score) are computed locally without AI
- **AI Enhancement Layer**: AI provides explanations, recommendations, and conversational Q&A in simple language

## Glossary

- **System**: The Vyapar AI web application
- **Shop_Owner**: The small retail business owner using the system
- **Daily_Entry**: Manual input of daily business summary (sales, expenses, cash)
- **CSV_File**: Comma-separated values file containing sales, expenses, or inventory data (Advanced Mode)
- **AI_Engine**: AWS Bedrock service (Claude/Titan models) that provides explanations and recommendations
- **Insight**: Analysis result about business health (calculated deterministically, explained by AI)
- **Session**: In-memory data storage duration while user interacts with the system
- **Language_Preference**: User's selected language (Hindi, Marathi, or English)
- **Voice_Synthesis**: Web Speech API text-to-speech functionality
- **True_Profit**: Actual profit after accounting for inventory costs and blocked cash
- **Cash_Flow**: Movement of money in and out of the business
- **Blocked_Inventory**: Products sitting unsold that tie up cash
- **Health_Score**: Deterministic 0-100 score based on margin, expense ratio, cash buffer, and credit risk
- **Udhaar**: Credit given to customers (Hindi term for informal credit)
- **Deterministic_Calculation**: Numeric computation performed locally without AI involvement
- **Hybrid_Intelligence**: Architecture combining deterministic calculations with AI explanations

## Requirements

### Requirement 1: CSV Data Upload and Validation

**User Story:** As a shop owner, I want to upload my sales, expenses, and inventory data as CSV files, so that the AI can analyze my business health.

#### Acceptance Criteria

1. WHEN a shop owner selects a CSV file, THE System SHALL parse it using PapaParse and display a preview of the data
2. WHEN a CSV file contains invalid format or missing required columns, THE System SHALL display an error message in the user's selected language
3. WHEN a valid CSV file is uploaded, THE System SHALL store the parsed data in memory for the current session
4. THE System SHALL accept three types of CSV files: sales data, expenses data, and inventory data
5. WHEN displaying CSV preview, THE System SHALL show the first 5 rows with column headers

### Requirement 2: Language Selection and Persistence

**User Story:** As a shop owner, I want to select my preferred language (Hindi, Marathi, or English), so that I can understand the insights in my native language.

#### Acceptance Criteria

1. WHEN a shop owner first visits the application, THE System SHALL display a language selection interface
2. WHEN a shop owner selects a language, THE System SHALL store the preference in localStorage
3. WHEN a shop owner returns to the application, THE System SHALL load the language preference from localStorage
4. THE System SHALL display all UI text, error messages, and AI insights in the selected language
5. WHEN a shop owner changes language preference, THE System SHALL update all displayed content immediately

### Requirement 3: AI-Powered Business Health Analysis

**User Story:** As a shop owner, I want the AI to analyze my uploaded data and identify financial health issues, so that I can make informed business decisions.

#### Acceptance Criteria

1. WHEN a shop owner requests analysis after uploading data, THE System SHALL send the data to AWS Bedrock for AI analysis
2. THE AI_Engine SHALL calculate true profit by distinguishing it from cash flow
3. THE AI_Engine SHALL identify loss-making products from sales and inventory data
4. THE AI_Engine SHALL calculate blocked cash in unsold inventory
5. THE AI_Engine SHALL detect abnormal or unusual expenses
6. THE AI_Engine SHALL predict 7-day cashflow risk based on current patterns
7. WHEN analysis is complete, THE System SHALL return insights in simple, jargon-free language
8. IF the AI_Engine fails to respond, THEN THE System SHALL display a retry option with an error message in the user's language

### Requirement 4: Insight Delivery and Presentation

**User Story:** As a shop owner with limited financial literacy, I want insights presented in simple language without charts or jargon, so that I can easily understand my business health.

#### Acceptance Criteria

1. WHEN displaying insights, THE System SHALL use simple explanations without financial jargon
2. THE System SHALL present insights in the shop owner's selected language
3. THE System SHALL organize insights into clear categories: profit analysis, product performance, inventory health, expense alerts, and cashflow forecast
4. WHEN displaying monetary values, THE System SHALL use Indian Rupee (₹) formatting
5. THE System SHALL use icons to visually represent different insight categories
6. THE System SHALL be mobile-friendly and readable on small screens

### Requirement 5: Voice Synthesis for Insights

**User Story:** As a shop owner who prefers listening over reading, I want to hear insights spoken aloud in my language, so that I can understand them while working in my shop.

#### Acceptance Criteria

1. WHERE voice synthesis is enabled, THE System SHALL provide a button to read insights aloud
2. WHEN a shop owner activates voice synthesis, THE System SHALL use Web Speech API to speak the insight text
3. WHERE the selected language is Hindi, THE System SHALL use a Hindi voice for synthesis
4. WHEN voice synthesis is playing, THE System SHALL provide a button to stop playback
5. IF voice synthesis is not supported in the browser, THEN THE System SHALL hide the voice button

### Requirement 6: Conversational Q&A with AI

**User Story:** As a shop owner, I want to ask follow-up questions about my business data in my own language, so that I can get specific answers to my concerns.

#### Acceptance Criteria

1. WHEN a shop owner types a question, THE System SHALL send it to the AI_Engine with the uploaded data as context
2. WHEN a shop owner uses voice input, THE System SHALL convert speech to text and process the question
3. THE AI_Engine SHALL answer questions using only the uploaded data context
4. THE System SHALL display AI responses in the shop owner's selected language
5. WHEN no data has been uploaded, THE System SHALL inform the user that data upload is required before asking questions
6. THE System SHALL maintain conversation history during the current session

### Requirement 7: Session-Based Data Management

**User Story:** As a shop owner, I want my data to remain private and temporary, so that I don't worry about data security or storage.

#### Acceptance Criteria

1. THE System SHALL store all uploaded CSV data in memory only during the active session
2. WHEN a shop owner closes the browser or navigates away, THE System SHALL clear all uploaded data from memory
3. THE System SHALL NOT persist any business data to a database or file system
4. THE System SHALL NOT require user authentication or account creation
5. WHEN a new session starts, THE System SHALL begin with no previously uploaded data

### Requirement 8: AWS Bedrock Integration

**User Story:** As a system, I need to integrate with AWS Bedrock for AI analysis, so that I can provide intelligent insights to shop owners.

#### Acceptance Criteria

1. THE System SHALL use AWS SDK for JavaScript v3 to communicate with Bedrock
2. THE System SHALL load AWS credentials from environment variables
3. WHEN making Bedrock API calls, THE System SHALL use Claude or Titan models
4. THE System SHALL send structured prompts that include uploaded data and analysis instructions
5. THE System SHALL handle Bedrock API errors gracefully and display user-friendly messages
6. THE System SHALL implement appropriate timeout handling for Bedrock requests

### Requirement 9: Responsive Mobile-First UI

**User Story:** As a shop owner who primarily uses a mobile phone, I want the interface to work well on my device, so that I can use it conveniently.

#### Acceptance Criteria

1. THE System SHALL use Tailwind CSS for responsive styling
2. THE System SHALL be fully functional on mobile screens (320px width and above)
3. THE System SHALL use large, touch-friendly buttons and input areas
4. THE System SHALL minimize text input requirements through icons and visual elements
5. WHEN displaying on mobile, THE System SHALL stack content vertically for easy scrolling

### Requirement 10: Error Handling and User Feedback

**User Story:** As a shop owner, I want clear error messages in my language when something goes wrong, so that I know what to do next.

#### Acceptance Criteria

1. WHEN an error occurs, THE System SHALL display the error message in the user's selected language
2. THE System SHALL use friendly, non-technical language in error messages
3. WHEN a CSV upload fails, THE System SHALL explain what was wrong with the file format
4. WHEN an API call fails, THE System SHALL provide a retry option
5. WHEN the system is processing, THE System SHALL display a loading indicator with status text

### Requirement 11: Quick Daily Entry Mode (Primary Entry Point)

**User Story:** As a shop owner, I want to quickly enter my daily sales and expenses each day, so that I can track my business health without uploading CSV files.

#### Acceptance Criteria

1. WHEN a shop owner opens the application, THE System SHALL display the daily entry form prominently as the primary interface
2. THE daily entry form SHALL accept three fields: totalSalesToday (₹), totalExpenseToday (₹), and cashInHand (₹, optional)
3. WHEN a shop owner submits daily entry, THE System SHALL calculate EstimatedProfit = totalSalesToday - totalExpenseToday deterministically without AI
4. WHEN a shop owner submits daily entry, THE System SHALL calculate ExpenseRatio = totalExpenseToday / totalSalesToday deterministically without AI
5. THE System SHALL display calculation results instantly (< 1 second) without requiring AWS Bedrock calls
6. THE System SHALL store daily entries in the session store as an array with date, totalSales, totalExpense, and cashInHand fields
7. WHEN displaying daily entry results, THE System SHALL show profit, expense ratio, and cash position in the user's selected language
8. THE daily entry feature SHALL work even when AWS Bedrock is unavailable

### Requirement 12: Business Health Score (Deterministic)

**User Story:** As a shop owner, I want to see a simple health score for my business, so that I can quickly understand if my business is doing well.

#### Acceptance Criteria

1. THE System SHALL calculate a Business Health Score between 0 and 100 using deterministic logic without AI
2. THE health score calculation SHALL use the following factors:
   - Margin ratio: +30 points if > 20%
   - Expense ratio: +30 points if < 60%
   - Cash buffer: +20 points if positive cash in hand
   - Credit risk: +20 points if no overdue credit
3. WHEN displaying the health score, THE System SHALL show "Business Health Score: X/100" with a visual indicator (color-coded)
4. THE System SHALL calculate the health score locally without making AI API calls
5. THE AI MAY provide an explanation of the score in simple language, but SHALL NOT calculate the score itself
6. THE health score SHALL update immediately when daily entries or credit data changes
7. WHEN the health score is below 50, THE System SHALL display it in red; 50-75 in yellow; above 75 in green

### Requirement 13: Minimal Credit (Udhaar) Module

**User Story:** As a shop owner who gives credit to customers, I want to track outstanding credit and overdue payments, so that I can manage my cash flow better.

#### Acceptance Criteria

1. THE System SHALL provide a credit tracking interface to add customer credit entries
2. EACH credit entry SHALL contain: customerName (string), amount (number), dueDate (string), isPaid (boolean)
3. THE System SHALL store credit entries in the session store as an array
4. THE System SHALL calculate and display total credit outstanding deterministically (sum of unpaid entries)
5. THE System SHALL calculate and display total overdue amount deterministically (sum of unpaid entries past due date)
6. THE System SHALL calculate and display count of overdue customers deterministically
7. WHEN overdue credit exists, THE System SHALL flag this in the health score calculation (reduce score by 20 points)
8. THE AI MAY suggest actions like "Try collecting ₹X overdue payments" but SHALL NOT calculate credit amounts
9. THE credit calculations SHALL complete instantly without AI involvement

### Requirement 14: Trust and Privacy Layer

**User Story:** As a shop owner concerned about privacy, I want clear assurance that my data is not connected to government systems, so that I feel safe using the application.

#### Acceptance Criteria

1. THE System SHALL display a persistent trust banner at the top of the interface
2. THE trust banner SHALL state: "Your data is private. Not connected to GST or any government system."
3. THE trust banner SHALL be translated into Hindi and Marathi
4. THE trust banner SHALL be visible on all pages and SHALL NOT be dismissible
5. THE System SHALL maintain the existing session-based architecture with no persistent storage
6. THE System SHALL clearly communicate that no data is stored permanently

### Requirement 15: Hybrid Intelligence Model

**User Story:** As a system, I need to separate deterministic calculations from AI enhancements, so that core functionality works reliably even when AI is unavailable.

#### Acceptance Criteria

1. THE System SHALL implement a Deterministic Layer that calculates:
   - Profit (Sales - Expenses)
   - Expense ratio (Expenses / Sales)
   - Blocked inventory cash (sum of quantity × cost_price)
   - Health score (based on defined formula)
   - Credit outstanding and overdue amounts
   - Basic anomaly detection (values outside normal ranges)
2. THE System SHALL implement an AI Enhancement Layer that provides:
   - Explanations in simple language
   - Conversational Q&A
   - Translation refinement
   - Action recommendations
   - Context-aware insights
3. THE AI SHALL NEVER be the sole calculator of numeric outputs
4. ALL numeric calculations SHALL be reproducible without AI
5. WHEN AWS Bedrock is unavailable, THE System SHALL continue to provide deterministic calculations with a message that AI explanations are temporarily unavailable
6. THE System SHALL complete all deterministic calculations in under 1 second
7. THE AI explanations MAY take up to 15 seconds but SHALL NOT block deterministic results from displaying

## Why AI is Necessary (But Not Sufficient)

AI remains essential for Vyapar AI, but it serves as an enhancement layer rather than the sole computational engine. Here's the refined role of AI:

1. **Natural Language Understanding**: Shop owners need to ask questions in Hindi/Marathi using colloquial business terms. AI enables understanding of varied phrasings like "मेरा सबसे ज्यादा नुकसान किस चीज़ में है?" (What's causing my biggest loss?) without rigid command structures.

2. **Contextual Explanations**: While the system calculates profit deterministically (Sales - Expenses), AI translates this into simple, actionable language appropriate for users with limited financial literacy. For example, explaining why a 15% margin is concerning for a grocery shop but acceptable for a clothing shop.

3. **Pattern Recognition for Recommendations**: AI identifies patterns in expense categories and suggests specific actions like "Your electricity bill is 3x higher than last month - check for issues" based on contextual analysis rather than simple threshold rules.

4. **Conversational Interface**: AI enables natural Q&A where shop owners can ask follow-up questions and get contextual answers based on their specific data, making the tool accessible to users uncomfortable with traditional software interfaces.

5. **Cultural and Linguistic Adaptation**: AI adapts explanations to be culturally appropriate, using familiar metaphors and examples relevant to Indian small businesses, going beyond simple translation.

6. **Insight Synthesis**: While individual calculations are deterministic, AI synthesizes multiple data points into coherent narratives like "Your profit is good but cash is low because ₹X is stuck in inventory - consider selling Product Y at a discount."

**What AI Does NOT Do**:
- Calculate profit, expenses, or health scores (deterministic)
- Compute credit outstanding or overdue amounts (deterministic)
- Determine blocked inventory cash (deterministic)
- Generate the health score number (deterministic formula)

**What AI DOES Do**:
- Explain what the numbers mean in simple language
- Provide actionable recommendations based on patterns
- Answer conversational questions about the data
- Translate complex financial concepts into accessible insights
- Adapt communication style to user's language and context

This hybrid approach ensures reliability (deterministic core always works) while maintaining accessibility (AI makes it understandable).

## Non-Functional Requirements

### Performance

1. THE System SHALL parse and preview CSV files with up to 10,000 rows within 3 seconds
2. THE System SHALL return AI analysis results within 15 seconds for typical datasets
3. THE System SHALL load the initial page within 2 seconds on 3G mobile connections
4. **THE System SHALL display deterministic calculation results (profit, health score, credit totals) within 1 second**
5. **THE System SHALL NOT block user interface while waiting for AI responses**

### Usability

1. THE System SHALL be usable by shop owners with minimal digital literacy
2. **THE System SHALL require no more than 3 fields to enter daily business data**
3. THE System SHALL use icons and visual cues to minimize reliance on text
4. **THE daily entry mode SHALL be the primary interface, with CSV upload as advanced mode**

### Reliability

1. THE System SHALL handle AWS Bedrock API failures gracefully with retry mechanisms
2. THE System SHALL validate all CSV data before processing to prevent crashes
3. THE System SHALL maintain session data integrity during the user's active session
4. **THE System SHALL provide core functionality (daily entry, health score, credit tracking) even when AWS Bedrock is unavailable**
5. **ALL deterministic calculations SHALL be reproducible and testable without AI**

### Security

1. THE System SHALL load AWS credentials only from environment variables, never from client-side code
2. THE System SHALL not log or persist any business data uploaded by users
3. THE System SHALL use HTTPS for all API communications
4. **THE System SHALL display trust messaging about data privacy and government non-connection**

### Compatibility

1. THE System SHALL work on Chrome, Firefox, Safari, and Edge browsers (latest 2 versions)
2. THE System SHALL support Web Speech API where available, gracefully degrading when not supported
3. THE System SHALL function on Android and iOS mobile browsers

### Scalability

1. THE System SHALL handle concurrent sessions through stateless API design
2. THE System SHALL manage memory efficiently by clearing session data after user departure
3. THE System SHALL be deployable on serverless infrastructure (Vercel/AWS Lambda)
