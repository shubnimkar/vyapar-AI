import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand, QueryCommand, PutCommand, GetCommand } from '@aws-sdk/lib-dynamodb';

const AWS_REGION = process.env.AWS_REGION || 'ap-south-1';
const TABLE_NAME = process.env.DYNAMODB_TABLE_NAME || 'vyapar-ai';
const BEDROCK_MODEL_ID = process.env.BEDROCK_MODEL_ID || 'global.amazon.nova-2-lite-v1:0';
const REPORT_TIMEZONE = 'Asia/Kolkata';

const bedrockClient = new BedrockRuntimeClient({ region: AWS_REGION });
const dynamoClient = new DynamoDBClient({ region: AWS_REGION });
const docClient = DynamoDBDocumentClient.from(dynamoClient, {
  marshallOptions: {
    removeUndefinedValues: true,
    convertEmptyValues: false,
  },
});

function getCurrentIstParts(now = new Date()) {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: REPORT_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  const parts = Object.fromEntries(formatter.formatToParts(now).map((part) => [part.type, part.value]));
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    time: `${parts.hour}:${parts.minute}`,
  };
}

function getLanguageInstruction(language) {
  if (language === 'hi') return 'उत्तर केवल हिंदी में दें।';
  if (language === 'mr') return 'उत्तर फक्त मराठीत द्या.';
  return 'Respond only in English.';
}

function formatCurrency(amount) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

function calculateExpenseRatio(totalExpenses, totalSales) {
  if (!totalSales || totalSales <= 0) return 0;
  return totalExpenses / totalSales;
}

function calculateProfitMargin(netProfit, totalSales) {
  if (!totalSales || totalSales <= 0) return 0;
  return netProfit / totalSales;
}

function buildFallbackSummary(totalSales, totalExpenses, netProfit) {
  if (netProfit >= 0) {
    return `Today closed with sales of ${formatCurrency(totalSales)}, expenses of ${formatCurrency(totalExpenses)}, and a net profit of ${formatCurrency(netProfit)}.`;
  }

  return `Today closed with sales of ${formatCurrency(totalSales)}, expenses of ${formatCurrency(totalExpenses)}, and a net loss of ${formatCurrency(Math.abs(netProfit))}.`;
}

function parseReportInsights(rawInsights, fallbackSummary) {
  if (!rawInsights) {
    return {
      summary: fallbackSummary,
      wins: [],
      risks: [],
      nextSteps: [],
    };
  }

  try {
    const jsonMatch = rawInsights.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }

    const parsed = JSON.parse(jsonMatch[0]);
    return {
      summary: typeof parsed.summary === 'string' && parsed.summary.trim() ? parsed.summary.trim() : fallbackSummary,
      wins: Array.isArray(parsed.wins) ? parsed.wins.filter(Boolean).slice(0, 3) : [],
      risks: Array.isArray(parsed.risks) ? parsed.risks.filter(Boolean).slice(0, 3) : [],
      nextSteps: Array.isArray(parsed.nextSteps) ? parsed.nextSteps.filter(Boolean).slice(0, 3) : [],
    };
  } catch (error) {
    console.warn('Failed to parse report insights JSON', { error, rawInsights });
    return {
      summary: fallbackSummary,
      wins: [],
      risks: [],
      nextSteps: [],
    };
  }
}

async function generateInsightsWithBedrock(language, periodLabel, metrics) {
  const prompt = `You are generating a daily business report for a small shop owner in India.
${getLanguageInstruction(language)}

Period: ${periodLabel}
Sales: ${metrics.totalSales}
Expenses: ${metrics.totalExpenses}
Net profit: ${metrics.netProfit}
Average daily sales: ${metrics.averageDailySales}
Average daily expenses: ${metrics.averageDailyExpenses}
Average daily profit: ${metrics.averageDailyProfit}
Profit margin percent: ${(metrics.profitMargin * 100).toFixed(1)}
Expense ratio percent: ${(metrics.expenseRatio * 100).toFixed(1)}
Entry count: ${metrics.entryCount}
Closing cash: ${metrics.closingCash ?? 'not available'}
Best day: ${metrics.bestDay ? `${metrics.bestDay.date} sales ${metrics.bestDay.sales} profit ${metrics.bestDay.profit}` : 'not available'}
Worst day: ${metrics.worstDay ? `${metrics.worstDay.date} sales ${metrics.worstDay.sales} profit ${metrics.worstDay.profit}` : 'not available'}
Comparison: ${metrics.comparison ? `sales ${metrics.comparison.salesChangePct.toFixed(1)}%, expenses ${metrics.comparison.expenseChangePct.toFixed(1)}%, profit ${metrics.comparison.profitChangePct.toFixed(1)}% versus ${metrics.comparison.previousLabel}` : 'not available'}

Return ONLY valid JSON in this shape:
{
  "summary": "2-3 sentence overview",
  "wins": ["short bullet", "short bullet"],
  "risks": ["short bullet", "short bullet"],
  "nextSteps": ["short action", "short action"]
}`;

  const command = new InvokeModelCommand({
    modelId: BEDROCK_MODEL_ID,
    contentType: 'application/json',
    accept: 'application/json',
    body: JSON.stringify({
      messages: [
        {
          role: 'user',
          content: [{ text: prompt }],
        },
      ],
      inferenceConfig: {
        max_new_tokens: 500,
      },
    }),
  });

  const response = await bedrockClient.send(command);
  const responseBody = JSON.parse(new TextDecoder().decode(response.body));
  const extractedText = responseBody.output?.message?.content?.[0]?.text || '';

  return parseReportInsights(
    extractedText,
    buildFallbackSummary(metrics.totalSales, metrics.totalExpenses, metrics.netProfit)
  );
}

function createStructuredReport(userId, reportDate, entries, previousEntries, insights, language) {
  const totalSales = entries.reduce((sum, entry) => sum + (entry.totalSales || 0), 0);
  const totalExpenses = entries.reduce((sum, entry) => sum + (entry.totalExpense || 0), 0);
  const netProfit = totalSales - totalExpenses;
  const entryCount = entries.length;
  const averageDailySales = entryCount > 0 ? totalSales / entryCount : 0;
  const averageDailyExpenses = entryCount > 0 ? totalExpenses / entryCount : 0;
  const averageDailyProfit = entryCount > 0 ? netProfit / entryCount : 0;
  const expenseRatio = calculateExpenseRatio(totalExpenses, totalSales);
  const profitMargin = calculateProfitMargin(netProfit, totalSales);
  const closingCash = [...entries]
    .sort((a, b) => b.date.localeCompare(a.date))
    .find((entry) => typeof entry.cashInHand === 'number')?.cashInHand ?? null;

  const profitByDay = entries.map((entry) => ({
    date: entry.date,
    sales: entry.totalSales || 0,
    profit: (entry.totalSales || 0) - (entry.totalExpense || 0),
  }));

  const bestDay = profitByDay.length > 0
    ? [...profitByDay].sort((a, b) => b.profit - a.profit || b.sales - a.sales)[0]
    : null;

  const worstDay = profitByDay.length > 0
    ? [...profitByDay].sort((a, b) => a.profit - b.profit || a.sales - b.sales)[0]
    : null;

  const previousSales = previousEntries.reduce((sum, entry) => sum + (entry.totalSales || 0), 0);
  const previousExpenses = previousEntries.reduce((sum, entry) => sum + (entry.totalExpense || 0), 0);
  const previousProfit = previousSales - previousExpenses;

  const comparePct = (current, previous) => {
    if (previous === 0) return current === 0 ? 0 : 100;
    return ((current - previous) / Math.abs(previous)) * 100;
  };

  const comparison = previousEntries.length > 0
    ? {
        previousLabel: 'previous day',
        salesChangePct: comparePct(totalSales, previousSales),
        expenseChangePct: comparePct(totalExpenses, previousExpenses),
        profitChangePct: comparePct(netProfit, previousProfit),
      }
    : null;

  const localizedContent = {
    [language]: {
      summary: insights.summary,
      wins: insights.wins,
      risks: insights.risks,
      nextSteps: insights.nextSteps,
      insights: insights.summary,
    },
  };

  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
    userId,
    reportType: 'daily',
    date: reportDate,
    periodStart: reportDate,
    periodEnd: reportDate,
    generatedAt: new Date().toISOString(),
    entryCount,
    totalSales,
    totalExpenses,
    netProfit,
    averageDailySales,
    averageDailyExpenses,
    averageDailyProfit,
    closingCash,
    profitMargin,
    expenseRatio,
    bestDay,
    worstDay,
    comparison,
    generatedLanguage: language,
    localizedContent,
    summary: insights.summary,
    wins: insights.wins,
    risks: insights.risks,
    nextSteps: insights.nextSteps,
    topExpenseCategories: [],
    insights: insights.summary,
  };
}

async function getProfile(userId) {
  const result = await docClient.send(new GetCommand({
    TableName: TABLE_NAME,
    Key: {
      PK: `PROFILE#${userId}`,
      SK: 'METADATA',
    },
  }));

  return result.Item || null;
}

async function getEntriesForUser(userId) {
  const queryResult = await docClient.send(new QueryCommand({
    TableName: TABLE_NAME,
    KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
    ExpressionAttributeValues: {
      ':pk': `USER#${userId}`,
      ':sk': 'ENTRY#',
    },
  }));

  return queryResult.Items || [];
}

async function existingReportForDate(userId, reportDate) {
  const result = await docClient.send(new GetCommand({
    TableName: TABLE_NAME,
    Key: {
      PK: `USER#${userId}`,
      SK: `REPORT#daily#${reportDate}`,
    },
  }));

  return result.Item || null;
}

function isDueNow(reportTime, currentIstTime) {
  if (typeof reportTime !== 'string' || typeof currentIstTime !== 'string') return false;
  // Parse both times into minutes-since-midnight for window comparison
  const toMinutes = (t) => {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
  };
  const target = toMinutes(reportTime);
  const current = toMinutes(currentIstTime);
  // Match within a 5-minute window to handle EventBridge delivery gaps
  return Math.abs(current - target) <= 5;
}

function shouldProcessUser(user, options) {
  if (!user || !user.userId) return false;
  if (!user.automationEnabled) return false;
  if (options.forceAll) return true;
  if (options.userId && options.userId !== user.userId) return false;
  return isDueNow(user.reportTime || '20:00', options.currentIstTime);
}

export const handler = async (event = {}) => {
  console.log('MILESTONE: Starting automated report generation', { event });

  const results = [];
  const options = {
    forceAll: Boolean(event.forceAll),
    userId: typeof event.userId === 'string' ? event.userId : null,
    currentIstTime: event.currentIstTime || getCurrentIstParts().time,
    currentIstDate: event.currentIstDate || getCurrentIstParts().date,
  };

  try {
    const scanResult = await docClient.send(new ScanCommand({
      TableName: TABLE_NAME,
      FilterExpression: 'SK = :sk AND automationEnabled = :enabled',
      ExpressionAttributeValues: {
        ':sk': 'PREFERENCES',
        ':enabled': true,
      },
    }));

    const users = (scanResult.Items || []).filter((user) => shouldProcessUser(user, options));

    console.log(`Found ${users.length} users due for automated reports`, {
      currentIstTime: options.currentIstTime,
      currentIstDate: options.currentIstDate,
    });

    if (users.length === 0) {
      return {
        statusCode: 200,
        body: JSON.stringify({
          processed: 0,
          message: 'No users due for automated reports',
          currentIstTime: options.currentIstTime,
          currentIstDate: options.currentIstDate,
        }),
      };
    }

    for (const user of users) {
      try {
        const userId = user.userId;
        const reportDate = options.currentIstDate;
        console.log('MILESTONE: Processing automated report', {
          userId,
          reportTime: user.reportTime,
          reportDate,
        });

        const existingReport = await existingReportForDate(userId, reportDate);
        if (existingReport && !event.forceRegenerate) {
          console.log(`Report already exists for user ${userId} on ${reportDate}, skipping`);
          results.push({ userId, success: true, skipped: true, reason: 'already-generated' });
          continue;
        }

        const [entries, profile] = await Promise.all([
          getEntriesForUser(userId),
          getProfile(userId),
        ]);

        const currentEntries = entries
          .filter((entry) => entry.date === reportDate)
          .sort((a, b) => a.date.localeCompare(b.date));
        const previousDate = new Date(`${reportDate}T00:00:00+05:30`);
        previousDate.setDate(previousDate.getDate() - 1);
        const previousDateString = getCurrentIstParts(previousDate).date;
        const previousEntries = entries
          .filter((entry) => entry.date === previousDateString)
          .sort((a, b) => a.date.localeCompare(b.date));

        if (currentEntries.length === 0) {
          console.log(`No entries for user ${userId} on ${reportDate}, skipping`);
          results.push({ userId, success: true, skipped: true, reason: 'no-data' });
          continue;
        }

        const language = ['en', 'hi', 'mr'].includes(profile?.language) ? profile.language : 'en';
        const fallbackSummary = buildFallbackSummary(
          currentEntries.reduce((sum, entry) => sum + (entry.totalSales || 0), 0),
          currentEntries.reduce((sum, entry) => sum + (entry.totalExpense || 0), 0),
          currentEntries.reduce((sum, entry) => sum + (entry.totalSales || 0), 0) -
            currentEntries.reduce((sum, entry) => sum + (entry.totalExpense || 0), 0)
        );

        const provisionalReport = createStructuredReport(
          userId,
          reportDate,
          currentEntries,
          previousEntries,
          {
            summary: fallbackSummary,
            wins: [],
            risks: [],
            nextSteps: [],
          },
          language
        );

        let insights = {
          summary: provisionalReport.summary || '',
          wins: [],
          risks: [],
          nextSteps: [],
        };

        try {
          insights = await generateInsightsWithBedrock(language, reportDate, {
            totalSales: provisionalReport.totalSales,
            totalExpenses: provisionalReport.totalExpenses,
            netProfit: provisionalReport.netProfit,
            averageDailySales: provisionalReport.averageDailySales || 0,
            averageDailyExpenses: provisionalReport.averageDailyExpenses || 0,
            averageDailyProfit: provisionalReport.averageDailyProfit || 0,
            profitMargin: provisionalReport.profitMargin || 0,
            expenseRatio: provisionalReport.expenseRatio || 0,
            entryCount: provisionalReport.entryCount || 0,
            bestDay: provisionalReport.bestDay,
            worstDay: provisionalReport.worstDay,
            closingCash: provisionalReport.closingCash ?? null,
            comparison: provisionalReport.comparison,
          });
        } catch (insightError) {
          console.warn('Bedrock insights generation failed, using deterministic fallback', {
            userId,
            insightError: insightError?.message || insightError,
          });
        }

        const report = createStructuredReport(
          userId,
          reportDate,
          currentEntries,
          previousEntries,
          insights,
          language
        );

        const ttl = Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60;
        await docClient.send(new PutCommand({
          TableName: TABLE_NAME,
          Item: {
            PK: `USER#${userId}`,
            SK: `REPORT#daily#${reportDate}`,
            entityType: 'REPORT',
            userId,
            reportId: report.id,
            reportType: 'daily',
            date: reportDate,
            reportData: {
              periodStart: report.periodStart,
              periodEnd: report.periodEnd,
              entryCount: report.entryCount,
              totalSales: report.totalSales,
              totalExpenses: report.totalExpenses,
              netProfit: report.netProfit,
              averageDailySales: report.averageDailySales,
              averageDailyExpenses: report.averageDailyExpenses,
              averageDailyProfit: report.averageDailyProfit,
              closingCash: report.closingCash,
              profitMargin: report.profitMargin,
              expenseRatio: report.expenseRatio,
              bestDay: report.bestDay,
              worstDay: report.worstDay,
              comparison: report.comparison,
              generatedLanguage: report.generatedLanguage,
              localizedContent: report.localizedContent,
              summary: report.summary,
              wins: report.wins,
              risks: report.risks,
              nextSteps: report.nextSteps,
              topExpenseCategories: report.topExpenseCategories,
              insights: report.insights,
            },
            createdAt: report.generatedAt,
            ttl,
          },
        }));

        results.push({
          userId,
          success: true,
          reportId: report.id,
          reportDate,
          language,
        });
      } catch (userError) {
        console.error(`Failed for user ${user.userId}:`, userError);
        results.push({
          userId: user.userId,
          success: false,
          error: userError?.message || 'Unknown error',
        });
      }
    }

    console.log('MILESTONE: Report generation complete', { processed: results.length });
    return {
      statusCode: 200,
      body: JSON.stringify({
        processed: results.length,
        currentIstTime: options.currentIstTime,
        currentIstDate: options.currentIstDate,
        results,
      }),
    };
  } catch (error) {
    console.error('Error in report generation:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: error?.name || 'Error',
        message: error?.message || 'Unknown error',
        timestamp: new Date().toISOString(),
        results,
      }),
    };
  }
};
