// Prompt templates for AWS Bedrock AI analysis

import { Language, ParsedCSV, ChatMessage } from './types';

/**
 * Format CSV data for inclusion in prompts
 */
function formatCSVData(data: ParsedCSV | undefined, label: string): string {
  if (!data || data.rows.length === 0) {
    return `**${label}:** Not provided\n`;
  }
  
  // Limit to first 50 rows for token efficiency
  const rowsToShow = data.rows.slice(0, 50);
  const rowCount = data.rows.length;
  
  let formatted = `**${label}:** (${rowCount} rows)\n`;
  formatted += `Columns: ${data.headers.join(', ')}\n`;
  formatted += 'Sample data:\n';
  
  rowsToShow.forEach((row, idx) => {
    const rowStr = data.headers.map(h => `${h}: ${row[h]}`).join(', ');
    formatted += `${idx + 1}. ${rowStr}\n`;
  });
  
  if (rowCount > 50) {
    formatted += `... and ${rowCount - 50} more rows\n`;
  }
  
  return formatted + '\n';
}

/**
 * Get language-specific instructions
 */
function getLanguageInstructions(language: Language): string {
  const instructions = {
    en: 'IMPORTANT: You MUST respond in English. All your responses must be in English language only. Provide insights in simple English. Use conversational tone appropriate for small shop owners. Avoid financial jargon.',
    hi: 'अत्यंत महत्वपूर्ण: आपको केवल हिंदी में जवाब देना है। आपके सभी उत्तर केवल हिंदी भाषा में होने चाहिए। अंग्रेजी का उपयोग बिल्कुल न करें। सरल हिंदी में जानकारी प्रदान करें। भारतीय दुकानदारों के लिए उपयुक्त सांस्कृतिक उदाहरण उपयोग करें। वित्तीय शब्दजाल से बचें।',
    mr: 'अत्यंत महत्त्वाचे: तुम्ही फक्त मराठीत उत्तर द्यावे. तुमची सर्व उत्तरे फक्त मराठी भाषेत असावीत. इंग्रजीचा वापर अजिबात करू नका. सोप्या मराठीत माहिती द्या. भारतीय दुकानदारांसाठी योग्य सांस्कृतिक उदाहरणे वापरा. आर्थिक शब्दजाल टाळा।',
  };
  
  return instructions[language];
}

/**
 * Build analysis prompt for business health insights
 * HYBRID MODEL: Accepts pre-calculated metrics
 *
 * Uses fixed ASCII section markers [SECTION_1]–[SECTION_5] so that the parser
 * can reliably extract sections regardless of the AI response language.
 * The AI is told to keep the markers in English but write content in the
 * requested language.
 */
export function buildAnalysisPrompt(
  salesData: ParsedCSV | undefined,
  expensesData: ParsedCSV | undefined,
  inventoryData: ParsedCSV | undefined,
  language: Language,
  calculatedMetrics?: {
    profit?: number;
    expenseRatio?: number;
    blockedInventory?: number;
  }
): string {
  // Build pre-calculated metrics section if provided
  let metricsSection = '';
  if (calculatedMetrics) {
    metricsSection = `
**IMPORTANT - Pre-Calculated Metrics:**
These numbers have already been calculated deterministically. Your job is to EXPLAIN what they mean and provide actionable recommendations. DO NOT recalculate these numbers.

${calculatedMetrics.profit !== undefined ? `- Estimated Profit: \u20b9${calculatedMetrics.profit.toFixed(2)}` : ''}
${calculatedMetrics.expenseRatio !== undefined ? `- Expense Ratio: ${(calculatedMetrics.expenseRatio * 100).toFixed(1)}%` : ''}
${calculatedMetrics.blockedInventory !== undefined ? `- Blocked Inventory Cash: \u20b9${calculatedMetrics.blockedInventory.toFixed(2)}` : ''}

`;
  }

  const section1Task = calculatedMetrics?.profit !== undefined
    ? `Explain what the profit of \u20b9${calculatedMetrics.profit.toFixed(2)} means for this shop. Is it good? Compare it to the cash flow.`
    : 'Calculate actual profit considering inventory. Explain the difference between money in hand (cash flow) and real profit in simple terms.';

  const section2Task = calculatedMetrics
    ? 'Based on the sales and inventory data, which products are causing losses? Be specific with product names and numbers from the data.'
    : 'Identify products where selling price is below cost price or where inventory holding costs exceed margins. List specific product names.';

  const section3Task = calculatedMetrics?.blockedInventory !== undefined
    ? `The shop has \u20b9${calculatedMetrics.blockedInventory.toFixed(2)} stuck in inventory. Which products are slow-moving? What should the owner do?`
    : 'Calculate total cash tied up in unsold inventory. Identify slow-moving items that are blocking money.';

  const prompt = `You are a business health advisor for small retail shops in India. ${calculatedMetrics ? 'You are explaining pre-calculated business metrics.' : 'Analyze the following data and provide insights.'}

${metricsSection}

${formatCSVData(salesData, 'Sales Data')}
${formatCSVData(expensesData, 'Expenses Data')}
${formatCSVData(inventoryData, 'Inventory Data')}

**Language Instructions:**
${getLanguageInstructions(language)}

**CRITICAL OUTPUT FORMAT — You MUST follow this exactly:**
Output exactly 5 sections. Each section MUST begin with its marker on its own line.
IMPORTANT: Copy the markers [SECTION_1] through [SECTION_5] literally — do NOT translate or modify them.
Write the content after each marker in the language specified above.

[SECTION_1]
${section1Task}

[SECTION_2]
${section2Task}

[SECTION_3]
${section3Task}

[SECTION_4]
Look at the expense data. List any unusual or abnormal expenses. Be specific about amounts and why they seem high for a shop of this size.

[SECTION_5]
Based on recent patterns, will the shop face a cash shortage in the next 7 days? Why or why not? Give actionable steps.

**Rules:**
- The markers [SECTION_1] through [SECTION_5] MUST appear exactly as shown above — do NOT translate them
- Write the content AFTER each marker in the language specified in the Language Instructions
- Use simple conversational language, no financial jargon
- Reference actual numbers and product names from the data
- Be specific and actionable
${calculatedMetrics ? '- Reference the pre-calculated metrics above; do NOT recalculate them' : ''}

Please provide the analysis now.`;

  return prompt;
}

/**
 * Build Q&A prompt with conversation context
 */
export function buildQAPrompt(
  question: string,
  salesData: ParsedCSV | undefined,
  expensesData: ParsedCSV | undefined,
  inventoryData: ParsedCSV | undefined,
  conversationHistory: ChatMessage[],
  language: Language
): string {
  // Format conversation history
  let historyStr = '';
  if (conversationHistory.length > 0) {
    historyStr = '**Previous Conversation:**\n';
    conversationHistory.slice(-5).forEach(msg => {
      historyStr += `${msg.role === 'user' ? 'Question' : 'Answer'}: ${msg.content}\n`;
    });
    historyStr += '\n';
  }
  
  // Create data summary
  const dataSummary = `
**Available Business Data:**
- Sales: ${salesData?.rows.length || 0} records
- Expenses: ${expensesData?.rows.length || 0} records
- Inventory: ${inventoryData?.rows.length || 0} records

${salesData ? formatCSVData(salesData, 'Sales Data') : ''}
${expensesData ? formatCSVData(expensesData, 'Expenses Data') : ''}
${inventoryData ? formatCSVData(inventoryData, 'Inventory Data') : ''}
`;

  const prompt = `You are answering questions for a small shop owner about their business data. Use only the provided data to answer.

${dataSummary}

${historyStr}

**Current Question:**
${question}

**Instructions:**
${getLanguageInstructions(language)}
- Base answers only on the provided data
- If data is insufficient, say so clearly
- Provide specific numbers and examples
- Be helpful and encouraging

**CRITICAL - Anti-Template Instructions:**
DO NOT use generic templates, placeholder headings, or section markers like:
- "### Understanding Your HealthScore"
- "#### Identify"
- "#### Highlight"
- "### Explanation of"
- Any other generic headings or templates

Instead, start DIRECTLY with specific, personalized answers based on the actual data and business context.

Please answer the question now.`;

  return prompt;
}
