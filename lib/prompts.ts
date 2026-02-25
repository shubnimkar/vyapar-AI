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
    en: 'Provide insights in simple English. Use conversational tone appropriate for small shop owners. Avoid financial jargon.',
    hi: 'Provide insights in simple Hindi (हिंदी). Use natural Hindi expressions, not direct English translations. Use culturally appropriate examples familiar to Indian shop owners. Avoid financial jargon.',
    mr: 'Provide insights in simple Marathi (मराठी). Use natural Marathi expressions, not direct English translations. Use culturally appropriate examples familiar to Indian shop owners. Avoid financial jargon.',
  };
  
  return instructions[language];
}

/**
 * Build analysis prompt for business health insights
 */
export function buildAnalysisPrompt(
  salesData: ParsedCSV | undefined,
  expensesData: ParsedCSV | undefined,
  inventoryData: ParsedCSV | undefined,
  language: Language
): string {
  const prompt = `You are a business health advisor for small retail shops in India. Analyze the following data and provide insights.

${formatCSVData(salesData, 'Sales Data')}
${formatCSVData(expensesData, 'Expenses Data')}
${formatCSVData(inventoryData, 'Inventory Data')}

**Analysis Required:**

1. **True Profit vs Cash Flow**: Calculate actual profit considering inventory costs and blocked capital. Explain the difference between money in hand (cash flow) and real profit in simple terms.

2. **Loss-Making Products**: Identify products where selling price is below cost price or where inventory holding costs exceed margins. List specific product names.

3. **Blocked Inventory Cash**: Calculate total cash tied up in unsold inventory. Identify slow-moving items that are blocking money.

4. **Abnormal Expenses**: Detect expenses that are unusually high compared to typical patterns or business size. Be specific about which expenses seem abnormal.

5. **7-Day Cashflow Forecast**: Based on recent patterns, predict if the shop will face cash shortage in the next 7 days. Provide reasoning.

**Output Format:**
Provide insights in simple language without financial jargon. Use examples from the actual data. Be specific with numbers and product names.

**Language Instructions:**
${getLanguageInstructions(language)}

**Important:**
- Use simple terms: "real profit", "money stuck", "cash in hand" instead of "EBITDA", "working capital", "liquidity"
- Provide actionable suggestions, not just analysis
- Be encouraging and helpful in tone
- Use specific numbers from the data

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

Please answer the question now.`;

  return prompt;
}
