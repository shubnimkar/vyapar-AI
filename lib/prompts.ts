// Prompt templates for AWS Bedrock AI analysis

import { calculateCreditSummary, calculateExpenseRatio, calculateHealthScore, calculateProfit, calculateProfitMargin } from './calculations';
import { Language, ParsedCSV, ChatMessage, DailyEntry, CreditEntry, DailyReport, InferredTransaction } from './types';
import { buildAIDateContextBlock, getCurrentISTDateContext } from './ai/date-context';

function getRecentISTDateRange(days: number, now: Date = new Date()): string[] {
  const { today } = getCurrentISTDateContext(now);
  const cursor = new Date(`${today}T00:00:00.000Z`);
  const dates: string[] = [];

  for (let index = days - 1; index >= 0; index -= 1) {
    const next = new Date(cursor);
    next.setUTCDate(cursor.getUTCDate() - index);
    dates.push(next.toISOString().slice(0, 10));
  }

  return dates;
}

function formatCalendarWindowSummary(dailyEntries: DailyEntry[], days: number): string {
  const dates = getRecentISTDateRange(days);
  const startDate = dates[0];
  const endDate = dates[dates.length - 1];
  const entryByDate = new Map(dailyEntries.map((entry) => [entry.date, entry]));

  const rows = dates.map((date) => {
    const entry = entryByDate.get(date);
    return {
      date,
      sales: entry?.totalSales ?? 0,
      expense: entry?.totalExpense ?? 0,
      profit: entry?.estimatedProfit ?? ((entry?.totalSales ?? 0) - (entry?.totalExpense ?? 0)),
      hasEntry: Boolean(entry),
    };
  });

  const totalSales = rows.reduce((sum, row) => sum + row.sales, 0);
  const totalExpense = rows.reduce((sum, row) => sum + row.expense, 0);
  const totalProfit = rows.reduce((sum, row) => sum + row.profit, 0);
  const missingDates = rows.filter((row) => !row.hasEntry).map((row) => row.date);

  let formatted = `**Last ${days} Calendar Days (IST):** ${startDate} to ${endDate}\n`;
  formatted += `- Total sales in this calendar window: ${formatCurrency(totalSales)}\n`;
  formatted += `- Total expenses in this calendar window: ${formatCurrency(totalExpense)}\n`;
  formatted += `- Total estimated profit in this calendar window: ${formatCurrency(totalProfit)}\n`;
  formatted += `- Days with entries: ${rows.length - missingDates.length}/${rows.length}\n`;
  formatted += missingDates.length > 0
    ? `- Missing entry dates counted as zero: ${missingDates.join(', ')}\n`
    : '- Missing entry dates counted as zero: none\n';
  formatted += '- Daily breakdown for this calendar window:\n';

  rows.forEach((row) => {
    formatted += `  - ${row.date}: sales ${formatCurrency(row.sales)}, expenses ${formatCurrency(row.expense)}, profit ${formatCurrency(row.profit)}${row.hasEntry ? '' : ' (no entry, treated as zero)'}\n`;
  });

  return `${formatted}\n`;
}

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

function formatCurrency(amount: number): string {
  return `₹${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(amount)}`;
}

function formatDailyEntrySummary(dailyEntries: DailyEntry[]): string {
  if (dailyEntries.length === 0) {
    return '**Daily Entries:** Not provided\n';
  }

  const recentEntries = [...dailyEntries]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 30);

  const totalSales = recentEntries.reduce((sum, entry) => sum + entry.totalSales, 0);
  const totalExpense = recentEntries.reduce((sum, entry) => sum + entry.totalExpense, 0);
  const estimatedProfit = recentEntries.reduce((sum, entry) => sum + entry.estimatedProfit, 0);
  const latestEntry = recentEntries[0];
  const avgMargin = recentEntries.length > 0
    ? recentEntries.reduce((sum, entry) => sum + entry.profitMargin, 0) / recentEntries.length
    : 0;

  return `**Daily Entries:** (${dailyEntries.length} total, ${recentEntries.length} recent)\n` +
    `- Latest entry date: ${latestEntry.date}\n` +
    `- Recent sales total: ${formatCurrency(totalSales)}\n` +
    `- Recent expense total: ${formatCurrency(totalExpense)}\n` +
    `- Recent estimated profit: ${formatCurrency(estimatedProfit)}\n` +
    `- Average margin over recent entries: ${(avgMargin * 100).toFixed(1)}%\n` +
    `${latestEntry.cashInHand !== undefined ? `- Latest cash in hand: ${formatCurrency(latestEntry.cashInHand)}\n` : ''}\n` +
    `${formatCalendarWindowSummary(dailyEntries, 7)}`;
}

function formatCreditEntrySummary(creditEntries: CreditEntry[]): string {
  if (creditEntries.length === 0) {
    return '**Credit Entries:** Not provided\n';
  }

  const { today } = getCurrentISTDateContext();
  const creditSummary = calculateCreditSummary(creditEntries);
  const overdueEntries = creditEntries
    .filter((entry) => !entry.isPaid && entry.dueDate < today)
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
    .slice(0, 5);

  let formatted = `**Credit Entries:** (${creditEntries.length} total)\n`;
  formatted += `- Total outstanding: ${formatCurrency(creditSummary.totalOutstanding)}\n`;
  formatted += `- Total overdue: ${formatCurrency(creditSummary.totalOverdue)}\n`;
  formatted += `- Overdue customers: ${creditSummary.overdueCount}\n`;

  if (overdueEntries.length > 0) {
    formatted += '- Most urgent overdue accounts:\n';
    overdueEntries.forEach((entry, index) => {
      formatted += `  ${index + 1}. ${entry.customerName} - ${formatCurrency(entry.amount)} due on ${entry.dueDate}\n`;
    });
  }

  return `${formatted}\n`;
}

function formatBusinessSnapshot(dailyEntries: DailyEntry[], creditEntries: CreditEntry[]): string {
  if (dailyEntries.length === 0) {
    return '**Business Snapshot:** Not enough daily entry data yet\n\n';
  }

  const recentEntries = [...dailyEntries]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 30);
  const totalSales = recentEntries.reduce((sum, entry) => sum + entry.totalSales, 0);
  const totalExpense = recentEntries.reduce((sum, entry) => sum + entry.totalExpense, 0);
  const profit = calculateProfit(totalSales, totalExpense);
  const expenseRatio = calculateExpenseRatio(totalExpense, totalSales);
  const profitMargin = calculateProfitMargin(profit, totalSales);
  const latestCash = recentEntries.find((entry) => entry.cashInHand !== undefined)?.cashInHand;
  const creditSummary = calculateCreditSummary(creditEntries);
  const healthScore = calculateHealthScore(profitMargin, expenseRatio, latestCash, creditSummary);

  return `**Business Snapshot:**\n` +
    `- Recent net profit: ${formatCurrency(profit)}\n` +
    `- Expense ratio: ${(expenseRatio * 100).toFixed(1)}%\n` +
    `- Profit margin: ${(profitMargin * 100).toFixed(1)}%\n` +
    `${latestCash !== undefined ? `- Latest cash in hand: ${formatCurrency(latestCash)}\n` : ''}` +
    `- Business health score: ${healthScore.score}/100\n\n`;
}

function formatPendingTransactionSummary(transactions: InferredTransaction[]): string {
  if (transactions.length === 0) {
    return '**Pending Transactions:** None\n';
  }

  const deferredCount = transactions.filter((transaction) => Boolean(transaction.deferred_at)).length;
  const expenseCount = transactions.filter((transaction) => transaction.type === 'expense').length;
  const saleCount = transactions.filter((transaction) => transaction.type === 'sale').length;
  const totalAmount = transactions.reduce((sum, transaction) => sum + transaction.amount, 0);
  const recentTransactions = [...transactions]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);

  let formatted = `**Pending Transactions:** (${transactions.length} total)\n`;
  formatted += `- Total pending amount: ${formatCurrency(totalAmount)}\n`;
  formatted += `- Expense transactions: ${expenseCount}\n`;
  formatted += `- Sale transactions: ${saleCount}\n`;
  formatted += `- Deferred for later: ${deferredCount}\n`;
  formatted += '- Recent pending items:\n';

  recentTransactions.forEach((transaction, index) => {
    const label = transaction.vendor_name || transaction.category || transaction.type;
    formatted += `  ${index + 1}. ${label} - ${formatCurrency(transaction.amount)} on ${transaction.date} (${transaction.source})\n`;
  });

  return `${formatted}\n`;
}

function formatReportSummary(reports: DailyReport[]): string {
  if (reports.length === 0) {
    return '**Reports:** None\n';
  }

  const recentReports = [...reports]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 5);
  const latestReport = recentReports[0];

  let formatted = `**Reports:** (${reports.length} total)\n`;
  formatted += `- Latest report date: ${latestReport.date}\n`;
  formatted += `- Latest report sales: ${formatCurrency(latestReport.totalSales)}\n`;
  formatted += `- Latest report expenses: ${formatCurrency(latestReport.totalExpenses)}\n`;
  formatted += `- Latest report net profit: ${formatCurrency(latestReport.netProfit)}\n`;
  formatted += '- Recent reports:\n';

  recentReports.forEach((report, index) => {
    formatted += `  ${index + 1}. ${report.date} - sales ${formatCurrency(report.totalSales)}, expenses ${formatCurrency(report.totalExpenses)}, net ${formatCurrency(report.netProfit)}\n`;
  });

  if (latestReport.insights) {
    formatted += `- Latest report insights: ${latestReport.insights.slice(0, 240)}${latestReport.insights.length > 240 ? '...' : ''}\n`;
  }

  return `${formatted}\n`;
}

/**
 * Get language-specific instructions
 */
function getLanguageInstructions(language: Language): string {
  const instructions = {
    en: 'IMPORTANT: You MUST respond in English. All your responses must be in English language only. Provide insights in simple English. Use conversational tone appropriate for small shop owners. Avoid financial jargon.',
    hi: 'अत्यंत महत्वपूर्ण: आपको केवल हिंदी में जवाब देना है। आपके सभी उत्तर केवल हिंदी भाषा में होने चाहिए। अंग्रेजी का उपयोग बिल्कुल न करें, सिवाय नाम, ब्रांड, उत्पाद नाम या तकनीकी पहचान के। यदि उपयोगकर्ता अंग्रेजी में प्रश्न पूछे तब भी उत्तर हिंदी में ही दें। सरल हिंदी में जानकारी प्रदान करें। भारतीय दुकानदारों के लिए उपयुक्त उदाहरण उपयोग करें। वित्तीय शब्दजाल से बचें।',
    mr: 'अत्यंत महत्त्वाचे: तुम्ही फक्त मराठीत उत्तर द्यावे. तुमची सर्व उत्तरे फक्त मराठी भाषेत असावीत. नावे, ब्रँड, उत्पादनांची नावे किंवा तांत्रिक ओळख वगळता इंग्रजीचा वापर अजिबात करू नका. वापरकर्त्याने प्रश्न इंग्रजीत विचारला तरी उत्तर मराठीतच द्या. सोप्या मराठीत माहिती द्या. भारतीय दुकानदारांसाठी योग्य उदाहरणे वापरा. आर्थिक शब्दजाल टाळा.',
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

**Date Context (Use this for all relative dates):**
${buildAIDateContextBlock()}

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
  dailyEntries: DailyEntry[],
  creditEntries: CreditEntry[],
  conversationHistory: ChatMessage[],
  language: Language,
  appContext?: {
    activeSection?: string;
    pendingCount?: number;
    pendingTransactions?: InferredTransaction[];
    healthScore?: number | null;
    healthBreakdown?: {
      marginScore: number;
      expenseScore: number;
      cashScore: number;
      creditScore: number;
    } | null;
    benchmark?: {
      healthScore: number;
      marginPercent: number;
      benchmarkHealthScore: number;
      benchmarkMarginPercent: number;
        category: string;
        sampleSize: number;
      } | null;
    reports?: DailyReport[];
  }
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
- Daily entries: ${dailyEntries.length} records
- Credit entries: ${creditEntries.length} records
- Sales: ${salesData?.rows.length || 0} records
- Expenses: ${expensesData?.rows.length || 0} records
- Inventory: ${inventoryData?.rows.length || 0} records

${formatBusinessSnapshot(dailyEntries, creditEntries)}
${formatDailyEntrySummary(dailyEntries)}
${formatCreditEntrySummary(creditEntries)}
${formatPendingTransactionSummary(appContext?.pendingTransactions || [])}
${formatReportSummary(appContext?.reports || [])}
${salesData ? formatCSVData(salesData, 'Sales Data') : ''}
${expensesData ? formatCSVData(expensesData, 'Expenses Data') : ''}
${inventoryData ? formatCSVData(inventoryData, 'Inventory Data') : ''}
`;

  const appContextSummary = `
**Current App Context:**
- Active section: ${appContext?.activeSection || 'general'}
- Pending transactions: ${appContext?.pendingCount ?? 0}
${typeof appContext?.healthScore === 'number' ? `- Current health score: ${appContext.healthScore}/100\n` : ''}${appContext?.healthBreakdown ? `- Health breakdown: margin ${appContext.healthBreakdown.marginScore}/30, expense ${appContext.healthBreakdown.expenseScore}/30, cash ${appContext.healthBreakdown.cashScore}/20, credit ${appContext.healthBreakdown.creditScore}/20\n` : ''}${appContext?.benchmark ? `- Benchmark health score: ${appContext.benchmark.benchmarkHealthScore}/100 vs your ${appContext.benchmark.healthScore}/100\n- Benchmark margin: ${appContext.benchmark.benchmarkMarginPercent.toFixed(1)}% vs your ${appContext.benchmark.marginPercent.toFixed(1)}%\n- Benchmark category: ${appContext.benchmark.category} from ${appContext.benchmark.sampleSize} similar businesses\n` : ''}${appContext?.reports?.length ? `- Available reports: ${appContext.reports.length}\n` : ''}
`;

  const prompt = `You are answering questions for a small shop owner about their business data. Use only the provided data to answer.

**Date Context (Use this for all relative dates):**
${buildAIDateContextBlock()}

${dataSummary}
${appContextSummary}

${historyStr}

**Current Question:**
${question}

**Instructions:**
${getLanguageInstructions(language)}
- Base answers only on the provided data
- You can answer using daily entries, credit records, and uploaded CSV data together
- If data is insufficient, say so clearly
- Provide specific numbers and examples
- For phrases like "today", "yesterday", "last 7 days", or "this week", use the IST calendar window exactly as given in the Date Context and Last 7 Calendar Days section
- For daily-entry questions about the last 7 days, include dates with no entry as zero instead of shrinking the window to only recorded entry dates
- When useful, explain what happened, why it happened, and what the owner should do next
- If the question spans multiple data sources, combine them into one answer
- If only some data sources are available, answer from those and mention what is missing
- Prioritize the active section context when it is relevant to the question
- If the user is in Credit, focus on collections, overdue amounts, and cash recovery
- If the user is in Health or Analysis, connect answers to score, margin, and benchmark context when available
- If the user is in Pending, mention pending transactions when helpful
- The user's selected app language is "${language}". Respect it strictly even if the question is written in another language
- When possible, structure the answer using these exact labels on separate lines:
Conclusion:
Why:
Next step:
- Keep the content after those labels in the requested language
- For Hindi and Marathi responses, write the full answer body in that language. Do not default to English sentences

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

export function buildQAResponseTranslationPrompt(answer: string, language: Language): string {
  const languageName = language === 'hi' ? 'Hindi' : language === 'mr' ? 'Marathi' : 'English';

  return `You are translating a business assistant reply into ${languageName}.

${getLanguageInstructions(language)}

**Date Context:**
${buildAIDateContextBlock()}

**Task:**
- Translate the answer below into ${languageName}
- Preserve all numbers, currency amounts, dates, customer names, shop names, product names, and brand names exactly
- Keep the same meaning and business advice
- If the reply uses these structure labels, keep them exactly in English on their own lines so the UI parser can read them:
Conclusion:
Why:
Next step:
- Translate only the content after those labels into ${languageName}
- Do not add extra explanation or commentary
- Return only the translated answer text

**Answer to translate:**
${answer}`;
}
