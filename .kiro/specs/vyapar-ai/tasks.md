# Implementation Plan: Vyapar AI

## Overview

This implementation plan breaks down the Vyapar AI project into discrete, incremental coding tasks. The approach follows a bottom-up strategy: build core infrastructure first, then data handling, then AI integration, and finally UI components. Each task builds on previous work, with property-based tests integrated early to catch issues before they compound.

The implementation uses Next.js 14 App Router with TypeScript, AWS Bedrock for AI, and in-memory session storage. All tasks assume the developer has access to the requirements and design documents for context.

## Tasks

- [x] 1. Initialize Next.js project and core dependencies
  - Create Next.js 14 app with TypeScript and Tailwind CSS
  - Install dependencies: `@aws-sdk/client-bedrock-runtime`, `papaparse`, `@types/papaparse`, `fast-check`
  - Configure `tsconfig.json` for strict type checking
  - Set up Tailwind with Devanagari font support
  - Create `.env.local` template with AWS credential placeholders
  - _Requirements: 8.1, 9.1_

- [ ] 2. Implement in-memory session store
  - [x] 2.1 Create session store module with TypeScript interfaces
    - Define `SessionData`, `ParsedCSV`, `ChatMessage` interfaces
    - Implement `Map<string, SessionData>` as global store
    - Create session ID generator (UUID or nanoid)
    - Add session creation, retrieval, and update functions
    - _Requirements: 7.1, 7.5_
  
  - [ ]* 2.2 Write property test for session isolation
    - **Property 23: Session Isolation**
    - **Validates: Requirements 7.5**
  
  - [x] 2.3 Implement session cleanup mechanism
    - Create cleanup function to remove expired sessions (2-hour expiry)
    - Add periodic cleanup trigger (every 30 minutes)
    - _Requirements: 7.1_
  
  - [ ]* 2.4 Write property test for in-memory storage
    - **Property 22: In-Memory Storage Only**
    - **Validates: Requirements 7.1**

- [ ] 3. Build CSV parsing and validation
  - [x] 3.1 Create CSV validation utilities
    - Implement column validation for sales, expenses, inventory types
    - Create type guards for each CSV type
    - Add error message generation with reason codes
    - _Requirements: 1.2, 1.4_
  
  - [ ]* 3.2 Write property test for CSV parsing consistency
    - **Property 1: CSV Parsing Consistency**
    - **Validates: Requirements 1.1**
  
  - [ ]* 3.3 Write property test for CSV validation
    - **Property 2: CSV Validation Rejects Invalid Input**
    - **Validates: Requirements 1.2**
  
  - [ ]* 3.4 Write property test for multi-type file acceptance
    - **Property 4: Multi-Type File Acceptance**
    - **Validates: Requirements 1.4**

- [ ] 4. Implement language translation system
  - [x] 4.1 Create translation dictionary
    - Define `Translations` interface with en/hi/mr keys
    - Create translation objects for all UI strings
    - Add error message translations
    - Create translation lookup function
    - _Requirements: 2.4, 10.1_
  
  - [x] 4.2 Create currency formatting utility
    - Implement Indian Rupee formatter with ₹ symbol
    - Handle number formatting with commas (₹1,23,456.78)
    - _Requirements: 4.4_
  
  - [ ]* 4.3 Write property test for currency formatting
    - **Property 13: Currency Formatting**
    - **Validates: Requirements 4.4**

- [ ] 5. Create AWS Bedrock client and prompt templates
  - [x] 5.1 Set up Bedrock client
    - Initialize `BedrockRuntimeClient` with credentials from env vars
    - Create wrapper function for invoking models
    - Add error handling for throttling, timeouts, service errors
    - Implement retry logic with exponential backoff
    - _Requirements: 8.1, 8.2, 8.5, 8.6_
  
  - [x] 5.2 Create prompt template functions
    - Implement analysis prompt builder with data formatting
    - Create Q&A prompt builder with context and history
    - Add language-specific prompt adjustments
    - _Requirements: 8.4_
  
  - [ ]* 5.3 Write property test for Bedrock model selection
    - **Property 24: Bedrock Model Selection**
    - **Validates: Requirements 8.3**
  
  - [ ]* 5.4 Write unit tests for error handling
    - Test throttling error response
    - Test timeout error response
    - Test service unavailable response
    - _Requirements: 8.5_

- [ ] 6. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 7. Implement `/api/upload` endpoint
  - [x] 7.1 Create upload API route handler
    - Parse multipart form data to extract CSV file
    - Use PapaParse to parse CSV server-side
    - Validate CSV based on file type
    - Generate or retrieve session ID from request
    - Store parsed data in session store
    - Return preview (first 5 rows) and session ID
    - _Requirements: 1.1, 1.2, 1.3, 1.4_
  
  - [ ]* 7.2 Write property test for session data round-trip
    - **Property 3: Session Data Round-Trip**
    - **Validates: Requirements 1.3**
  
  - [ ]* 7.3 Write property test for preview row limiting
    - **Property 5: Preview Row Limiting**
    - **Validates: Requirements 1.5**
  
  - [ ]* 7.4 Write property test for CSV error explanation
    - **Property 25: CSV Error Explanation**
    - **Validates: Requirements 10.3**

- [ ] 8. Implement `/api/analyze` endpoint
  - [x] 8.1 Create analyze API route handler
    - Retrieve session data using session ID
    - Format data for analysis prompt
    - Call Bedrock with analysis prompt
    - Parse AI response into insight categories
    - Return structured insights object
    - Handle missing data error (no uploads)
    - _Requirements: 3.1, 3.4, 4.3_
  
  - [ ]* 8.2 Write property test for analysis request data inclusion
    - **Property 9: Analysis Request Data Inclusion**
    - **Validates: Requirements 3.1, 8.4**
  
  - [ ]* 8.3 Write property test for blocked inventory calculation
    - **Property 10: Blocked Inventory Calculation**
    - **Validates: Requirements 3.4**
  
  - [ ]* 8.4 Write property test for insight structure completeness
    - **Property 12: Insight Structure Completeness**
    - **Validates: Requirements 4.3**
  
  - [ ]* 8.5 Write property test for AI error recovery
    - **Property 11: AI Error Recovery**
    - **Validates: Requirements 3.8, 8.5, 10.4**

- [ ] 9. Implement `/api/ask` endpoint
  - [x] 9.1 Create Q&A API route handler
    - Retrieve session data and conversation history
    - Build Q&A prompt with question, data context, and history
    - Call Bedrock with Q&A prompt
    - Store question and answer in conversation history
    - Return answer in requested language
    - Handle no-data-uploaded error
    - _Requirements: 6.1, 6.4, 6.5, 6.6_
  
  - [ ]* 9.2 Write property test for Q&A context inclusion
    - **Property 19: Q&A Context Inclusion**
    - **Validates: Requirements 6.1**
  
  - [ ]* 9.3 Write property test for conversation history persistence
    - **Property 21: Conversation History Persistence**
    - **Validates: Requirements 6.6**

- [ ] 10. Checkpoint - Ensure all API tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 11. Build language selector component
  - [x] 11.1 Create LanguageSelector component
    - Display language options (English, हिंदी, मराठी)
    - Handle language selection with onClick
    - Store selection in localStorage
    - Load preference from localStorage on mount
    - Emit language change event to parent
    - Style with Tailwind (mobile-friendly buttons)
    - _Requirements: 2.1, 2.2, 2.3_
  
  - [ ]* 11.2 Write property test for language preference persistence
    - **Property 6: Language Preference Persistence**
    - **Validates: Requirements 2.2, 2.3**
  
  - [ ]* 11.3 Write property test for language change reactivity
    - **Property 8: Language Change Reactivity**
    - **Validates: Requirements 2.5**

- [ ] 12. Build file upload component
  - [x] 12.1 Create FileUpload component
    - File input for CSV selection
    - Client-side PapaParse preview (first 5 rows)
    - Display preview table with headers and rows
    - Upload button to send to `/api/upload`
    - Handle upload errors and display in selected language
    - Show loading state during upload
    - Accept file type prop (sales/expenses/inventory)
    - _Requirements: 1.1, 1.2, 1.5, 10.5_
  
  - [ ]* 12.2 Write unit tests for upload component
    - Test file selection triggers preview
    - Test error display for invalid files
    - Test loading state visibility
    - _Requirements: 1.1, 1.2, 10.5_

- [ ] 13. Build insights display component
  - [x] 13.1 Create InsightsDisplay component
    - Accept `BusinessInsights` object as prop
    - Render categorized sections with icons (💵, ⚠️, 📦, 💰, 📊)
    - Format monetary values with currency utility
    - Add "🔊 Listen" button for each section
    - Implement voice synthesis using Web Speech API
    - Handle voice synthesis availability (show/hide buttons)
    - Add stop button when synthesis is playing
    - Use Hindi voice when language is Hindi
    - Mobile-responsive card layout with Tailwind
    - _Requirements: 4.3, 4.4, 4.5, 5.1, 5.2, 5.3, 5.4, 5.5_
  
  - [ ]* 13.2 Write property test for insight category icons
    - **Property 14: Insight Category Icons**
    - **Validates: Requirements 4.5**
  
  - [ ]* 13.3 Write property test for voice button conditional rendering
    - **Property 15: Voice Button Conditional Rendering**
    - **Validates: Requirements 5.1, 5.5**
  
  - [ ]* 13.4 Write property test for voice synthesis API usage
    - **Property 16: Voice Synthesis API Usage**
    - **Validates: Requirements 5.2**
  
  - [ ]* 13.5 Write property test for Hindi voice selection
    - **Property 17: Hindi Voice Selection**
    - **Validates: Requirements 5.3**
  
  - [ ]* 13.6 Write property test for voice playback controls
    - **Property 18: Voice Playback Controls**
    - **Validates: Requirements 5.4**

- [ ] 14. Build Q&A chat component
  - [x] 14.1 Create QAChat component
    - Text input for typing questions
    - Optional voice input button (Web Speech API recognition)
    - Send button to submit question to `/api/ask`
    - Display conversation history (user questions + AI answers)
    - Show loading indicator during AI response
    - Handle no-data-uploaded error
    - Auto-scroll to latest message
    - Mobile-friendly layout
    - _Requirements: 6.1, 6.2, 6.4, 6.5, 6.6, 10.5_
  
  - [ ]* 14.2 Write property test for voice input processing
    - **Property 20: Voice Input Processing**
    - **Validates: Requirements 6.2**
  
  - [ ]* 14.3 Write unit tests for Q&A component
    - Test question submission
    - Test conversation history display
    - Test no-data error handling
    - _Requirements: 6.1, 6.5, 6.6_

- [ ] 15. Create main page layout and integration
  - [x] 15.1 Build main page component
    - Create app/page.tsx with server component for static content
    - Integrate LanguageSelector at top
    - Add three FileUpload components (sales, expenses, inventory)
    - Add "Analyze My Business" button
    - Conditionally render InsightsDisplay after analysis
    - Conditionally render QAChat after data upload
    - Manage session ID state across components
    - Handle analyze button click (call `/api/analyze`)
    - Display loading states appropriately
    - Apply mobile-first Tailwind styling
    - _Requirements: 1.1, 2.1, 4.6, 9.2, 9.3, 9.5_
  
  - [ ]* 15.2 Write property test for universal language consistency
    - **Property 7: Universal Language Consistency**
    - **Validates: Requirements 2.4, 4.2, 6.4, 10.1**
  
  - [ ]* 15.3 Write property test for loading state visibility
    - **Property 26: Loading State Visibility**
    - **Validates: Requirements 10.5**

- [ ] 16. Implement error handling and user feedback
  - [x] 16.1 Create error display component
    - Accept error message and language props
    - Display friendly error messages with icons
    - Add retry button where applicable
    - Style with Tailwind (red/orange color scheme)
    - _Requirements: 10.1, 10.2, 10.4_
  
  - [ ]* 16.2 Write property test for error message localization
    - **Property 7: Universal Language Consistency** (covers error messages)
    - **Validates: Requirements 10.1**

- [ ] 17. Add responsive styling and mobile optimization
  - [x] 17.1 Refine Tailwind styles for mobile
    - Ensure all buttons are touch-friendly (min 44px height)
    - Test layout on 320px width screens
    - Verify vertical stacking on mobile
    - Add proper spacing and padding
    - Test Devanagari font rendering
    - _Requirements: 9.2, 9.3, 9.5_

- [ ] 18. Final checkpoint - Integration testing
  - [x] 18.1 Test complete upload → analyze → Q&A flow
    - Upload all three CSV types
    - Trigger analysis
    - Verify insights display
    - Ask questions and verify answers
    - _Requirements: 1.1, 3.1, 6.1_
  
  - [x] 18.2 Test language switching across all components
    - Switch language
    - Verify all UI text updates
    - Upload data and analyze in Hindi
    - Verify insights in Hindi
    - _Requirements: 2.4, 2.5, 4.2_
  
  - [x] 18.3 Test error scenarios
    - Upload invalid CSV
    - Trigger analysis with no data
    - Ask question with no data
    - Simulate Bedrock API failure
    - _Requirements: 1.2, 3.8, 6.5, 8.5_

- [ ] 19. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional property-based tests that can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation at key milestones
- Property tests validate universal correctness properties across randomized inputs
- Unit tests validate specific examples, edge cases, and integration points
- The implementation assumes AWS credentials are available in environment variables
- All monetary calculations should use proper decimal handling (avoid floating-point errors)
- Voice synthesis and recognition are progressive enhancements (graceful degradation required)
- Session cleanup should run periodically to prevent memory leaks in production
