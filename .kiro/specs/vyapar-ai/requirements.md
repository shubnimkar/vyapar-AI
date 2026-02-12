# Requirements Document: Vyapar AI

## Introduction

Vyapar AI is an AI-powered business health assistant designed for small shop owners in India. The system acts as a "doctor for shop financial health," analyzing sales, expenses, and inventory data to provide actionable insights in local languages. It addresses the critical need for 60+ million small retail shops to understand their true profitability beyond simple cash flow, potentially improving profits by 5-15%.

The system serves the "AI for Retail, Commerce & Market Intelligence" track by leveraging AI to democratize financial intelligence for small businesses that lack formal accounting expertise.

## Glossary

- **System**: The Vyapar AI web application
- **Shop_Owner**: The small retail business owner using the system
- **CSV_File**: Comma-separated values file containing sales, expenses, or inventory data
- **AI_Engine**: AWS Bedrock service (Claude/Titan models) that analyzes business data
- **Insight**: AI-generated analysis result about business health
- **Session**: In-memory data storage duration while user interacts with the system
- **Language_Preference**: User's selected language (Hindi, Marathi, or English)
- **Voice_Synthesis**: Web Speech API text-to-speech functionality
- **True_Profit**: Actual profit after accounting for inventory costs and blocked cash
- **Cash_Flow**: Movement of money in and out of the business
- **Blocked_Inventory**: Products sitting unsold that tie up cash

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

## Why AI is Necessary

AI is not optional for Vyapar AI—it is the core value proposition. Here's why:

1. **Complex Pattern Recognition**: Identifying loss-making products requires analyzing relationships between sales volume, pricing, and inventory costs across potentially hundreds of SKUs. Traditional rule-based systems cannot adapt to the diverse business models of different shops.

2. **Natural Language Understanding**: Shop owners need to ask questions in Hindi/Marathi using colloquial business terms. AI enables understanding of varied phrasings like "मेरा सबसे ज्यादा नुकसान किस चीज़ में है?" (What's causing my biggest loss?) without rigid command structures.

3. **Contextual Analysis**: Determining "abnormal expenses" requires understanding normal patterns for each specific shop type and location. AI learns from the data context rather than requiring manual threshold configuration.

4. **Cashflow Prediction**: Forecasting 7-day cashflow risk involves analyzing seasonal patterns, payment cycles, and expense timing—a task requiring sophisticated time-series analysis that AI handles naturally.

5. **Accessible Insights**: AI translates complex financial concepts into simple, actionable language appropriate for users with limited financial literacy, adapting explanations based on the data context.

6. **True Profit Calculation**: Distinguishing true profit from cash flow requires understanding inventory valuation, cost of goods sold, and working capital—concepts AI can explain and calculate without requiring accounting expertise from the user.

Without AI, the system would be a simple calculator requiring extensive financial knowledge from users, defeating the purpose of democratizing business intelligence for small shops.

## Non-Functional Requirements

### Performance

1. THE System SHALL parse and preview CSV files with up to 10,000 rows within 3 seconds
2. THE System SHALL return AI analysis results within 15 seconds for typical datasets
3. THE System SHALL load the initial page within 2 seconds on 3G mobile connections

### Usability

1. THE System SHALL be usable by shop owners with minimal digital literacy
2. THE System SHALL require no more than 3 clicks to upload data and view insights
3. THE System SHALL use icons and visual cues to minimize reliance on text

### Reliability

1. THE System SHALL handle AWS Bedrock API failures gracefully with retry mechanisms
2. THE System SHALL validate all CSV data before processing to prevent crashes
3. THE System SHALL maintain session data integrity during the user's active session

### Security

1. THE System SHALL load AWS credentials only from environment variables, never from client-side code
2. THE System SHALL not log or persist any business data uploaded by users
3. THE System SHALL use HTTPS for all API communications

### Compatibility

1. THE System SHALL work on Chrome, Firefox, Safari, and Edge browsers (latest 2 versions)
2. THE System SHALL support Web Speech API where available, gracefully degrading when not supported
3. THE System SHALL function on Android and iOS mobile browsers

### Scalability

1. THE System SHALL handle concurrent sessions through stateless API design
2. THE System SHALL manage memory efficiently by clearing session data after user departure
3. THE System SHALL be deployable on serverless infrastructure (Vercel/AWS Lambda)
