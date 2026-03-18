// API route for AI-powered business analysis
// HYBRID MODEL: Calculates deterministic metrics first, then AI explains

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session-store';
import { getFallbackOrchestrator } from '@/lib/ai/fallback-orchestrator';
import { buildAnalysisPrompt } from '@/lib/prompts';
import { Language, BusinessInsights } from '@/lib/types';
import { 
  calculateProfit, 
  calculateBlockedInventory,
  calculateExpenseRatio 
} from '@/lib/calculations';
import { logger } from '@/lib/logger';
import {
  checkBodySize,
  logAndReturnError,
  createErrorResponse,
  ErrorCode,
  BODY_SIZE_LIMITS
} from '@/lib/error-utils';

export async function POST(request: NextRequest) {
  try {
    logger.info('Analysis request received', {
      path: '/api/analyze'
    });

    // Validate body size (1MB limit for AI endpoints)
    const bodyCheck = await checkBodySize(request, BODY_SIZE_LIMITS.AI);
    if ('error' in bodyCheck) {
      return NextResponse.json(bodyCheck.error, { status: 413 });
    }

    const body = JSON.parse(bodyCheck.bodyText);
    const { sessionId, language = 'en', deterministicResults } = body as {
      sessionId: string;
      language: Language;
      deterministicResults?: {
        profit?: number;
        expenseRatio?: number;
        blockedInventory?: number;
      };
    };
    
    // Validate session ID
    if (!sessionId) {
      logger.warn('Missing session ID in analysis request');
      return NextResponse.json(
        createErrorResponse(ErrorCode.INVALID_INPUT, 'errors.invalidInput', language),
        { status: 400 }
      );
    }
    
    // Get session data
    const session = await getSession(sessionId);
    if (!session) {
      logger.warn('Session not found', { sessionId });
      return NextResponse.json(
        createErrorResponse(ErrorCode.NOT_FOUND, 'errors.notFound', language),
        { status: 404 }
      );
    }
    
    // Check if at least one dataset is uploaded
    if (!session.salesData && !session.expensesData && !session.inventoryData) {
      logger.warn('No data uploaded for analysis', { sessionId });
      return NextResponse.json(
        createErrorResponse(ErrorCode.INVALID_INPUT, 'errors.invalidInput', language),
        { status: 400 }
      );
    }
    
    // STEP 1: Calculate deterministic metrics FIRST (if not provided)
    const calculatedMetrics = deterministicResults || {};
    
    if (!calculatedMetrics.profit && session.salesData && session.expensesData) {
      // Calculate total sales and expenses from CSV
      const totalSales = session.salesData.rows.reduce((sum, row) => {
        return sum + (Number(row.amount) || 0);
      }, 0);
      
      const totalExpenses = session.expensesData.rows.reduce((sum, row) => {
        return sum + (Number(row.amount) || 0);
      }, 0);
      
      calculatedMetrics.profit = calculateProfit(totalSales, totalExpenses);
      calculatedMetrics.expenseRatio = calculateExpenseRatio(totalExpenses, totalSales);
    }
    
    if (!calculatedMetrics.blockedInventory && session.inventoryData) {
      calculatedMetrics.blockedInventory = calculateBlockedInventory(
        session.inventoryData.rows.map(row => ({
          quantity: Number(row.quantity) || 0,
          cost_price: Number(row.cost_price) || 0,
        }))
      );
    }
    
    // STEP 2: Build analysis prompt with PRE-CALCULATED metrics
    // STEP 3: Call AI for EXPLANATION only (not calculation)
    const prompt = buildAnalysisPrompt(
      session.salesData,
      session.expensesData,
      session.inventoryData,
      language,
      calculatedMetrics // Pass pre-calculated metrics to prompt
    );
    
    const orchestrator = getFallbackOrchestrator();
    const aiResponse = await orchestrator.generateResponse(
      prompt,
      { language },
      { endpoint: '/api/analyze' }
    );
    
    if (!aiResponse.success) {
      return NextResponse.json(
        logAndReturnError(
          new Error(aiResponse.error || 'AI invocation failed'),
          ErrorCode.BEDROCK_ERROR,
          'errors.bedrockError',
          language,
          { path: '/api/analyze', sessionId }
        ),
        { status: 503 }
      );
    }
    
    // Parse AI response into structured insights
    const aiContent = aiResponse.content || '';
    const insights = parseInsights(aiContent);
    
    // Add calculated metrics to insights
    if (calculatedMetrics.profit !== undefined) {
      insights.calculatedProfit = calculatedMetrics.profit;
    }
    if (calculatedMetrics.blockedInventory !== undefined) {
      insights.calculatedBlockedInventory = calculatedMetrics.blockedInventory;
    }
    
    // Add enhanced features (recommendations, alerts, charts)
    insights.recommendations = buildRecommendationsFromSession(session, language);
    insights.alerts = buildAlertsFromSession(session, language);
    insights.chartData = buildChartDataFromSession(session);
    
    // Build benchmark from actual calculated metrics
    const benchmark = buildBenchmarkFromMetrics(calculatedMetrics, language);
    
    logger.info('Analysis completed successfully', { sessionId });
    
    return NextResponse.json({
      success: true,
      insights,
      benchmark,
      calculatedMetrics, // Return deterministic calculations
    });
    
  } catch (error) {
    return NextResponse.json(
      logAndReturnError(
        error as Error,
        ErrorCode.SERVER_ERROR,
        'errors.serverError',
        'en',
        { path: '/api/analyze' }
      ),
      { status: 500 }
    );
  }
}

/**
 * Build benchmark display data from actual calculated metrics.
 * yourMetric = actual profit margin from uploaded data.
 * industryAverage / topPerformers are segment-level constants by business context.
 */
function buildBenchmarkFromMetrics(
  metrics: { profit?: number; expenseRatio?: number; blockedInventory?: number },
  language: Language
): import('@/lib/types').BenchmarkData {
  const metricName = { en: 'Profit Margin', hi: 'लाभ मार्जिन', mr: 'नफा मार्जिन' };

  // Derive actual margin: if expenseRatio known, margin = (1 - expenseRatio) * 100
  let yourMetric = 0;
  if (metrics.expenseRatio !== undefined) {
    yourMetric = Math.max(0, Math.round((1 - metrics.expenseRatio) * 100));
  } else if (metrics.profit !== undefined && metrics.profit > 0) {
    // rough estimate — just show profit as a positive signal
    yourMetric = Math.min(50, Math.round(metrics.profit / 1000));
  }

  return {
    yourMetric,
    industryAverage: 22,   // reasonable Indian SMB average
    topPerformers: 35,
    metricName: metricName[language] || metricName.en,
    unit: '%',
  };
}

/**
 * Build actionable recommendations from actual uploaded session data.
 * Deterministic — no AI, no hardcoded product names.
 */
function buildRecommendationsFromSession(
  session: {
    salesData?: { rows: Record<string, string | number>[] } | null;
    expensesData?: { rows: Record<string, string | number>[] } | null;
    inventoryData?: { rows: Record<string, string | number>[] } | null;
  },
  language: Language
): import('@/lib/types').ActionableRecommendation[] {
  const recs: import('@/lib/types').ActionableRecommendation[] = [];

  const msg = {
    en: {
      highExpenseCat: (cat: string, pct: number) => ({
        action: `Review "${cat}" spending — it's ${pct}% of total expenses`,
        impact: `Reducing by 20% could free up significant cash monthly`,
      }),
      zeroMarginItem: (item: string) => ({
        action: `Stop stocking "${item}" — it has near-zero margin`,
        impact: `Free up blocked inventory cash`,
      }),
      lowStockReorder: (item: string, qty: number) => ({
        action: `Reorder "${item}" soon — only ${qty} units left`,
        impact: `Avoid stockout and lost sales`,
      }),
      highExpenseRatio: (pct: number) => ({
        action: `Expenses are ${pct}% of sales — look for cost cuts`,
        impact: `Bringing ratio below 70% improves cash flow`,
      }),
      topSellerBoost: (item: string) => ({
        action: `Increase stock of top seller "${item}"`,
        impact: `Capitalize on demand to grow revenue`,
      }),
    },
    hi: {
      highExpenseCat: (cat: string, pct: number) => ({
        action: `"${cat}" खर्च की समीक्षा करें — यह कुल खर्च का ${pct}% है`,
        impact: `20% कम करने से हर महीने नकदी बचेगी`,
      }),
      zeroMarginItem: (item: string) => ({
        action: `"${item}" का स्टॉक बंद करें — लगभग शून्य मार्जिन है`,
        impact: `फंसी हुई इन्वेंटरी नकदी मुक्त करें`,
      }),
      lowStockReorder: (item: string, qty: number) => ({
        action: `"${item}" जल्दी मंगाएं — केवल ${qty} यूनिट बचे हैं`,
        impact: `स्टॉकआउट और बिक्री हानि से बचें`,
      }),
      highExpenseRatio: (pct: number) => ({
        action: `खर्च बिक्री का ${pct}% है — लागत कम करने के तरीके खोजें`,
        impact: `अनुपात 70% से नीचे लाने पर नकदी प्रवाह बेहतर होगा`,
      }),
      topSellerBoost: (item: string) => ({
        action: `सबसे ज्यादा बिकने वाले "${item}" का स्टॉक बढ़ाएं`,
        impact: `मांग का फायदा उठाकर राजस्व बढ़ाएं`,
      }),
    },
    mr: {
      highExpenseCat: (cat: string, pct: number) => ({
        action: `"${cat}" खर्चाचा आढावा घ्या — एकूण खर्चाचा ${pct}% आहे`,
        impact: `20% कमी केल्यास दरमहा रोख वाचेल`,
      }),
      zeroMarginItem: (item: string) => ({
        action: `"${item}" चा साठा बंद करा — जवळजवळ शून्य मार्जिन आहे`,
        impact: `अडकलेली इन्व्हेंटरी रोख मुक्त करा`,
      }),
      lowStockReorder: (item: string, qty: number) => ({
        action: `"${item}" लवकर मागवा — फक्त ${qty} युनिट शिल्लक`,
        impact: `स्टॉकआउट आणि विक्री हानी टाळा`,
      }),
      highExpenseRatio: (pct: number) => ({
        action: `खर्च विक्रीच्या ${pct}% आहे — खर्च कपातीचे मार्ग शोधा`,
        impact: `प्रमाण 70% खाली आणल्यास रोख प्रवाह सुधारेल`,
      }),
      topSellerBoost: (item: string) => ({
        action: `सर्वाधिक विकल्या जाणाऱ्या "${item}" चा साठा वाढवा`,
        impact: `मागणीचा फायदा घेऊन महसूल वाढवा`,
      }),
    },
  };

  const l = msg[language] || msg.en;
  let priority = 1;

  // 1. High expense ratio
  if (session.salesData?.rows?.length && session.expensesData?.rows?.length) {
    const totalSales = session.salesData.rows.reduce((s, r) => s + (Number(r.amount) || 0), 0);
    const totalExpenses = session.expensesData.rows.reduce((s, r) => s + (Number(r.amount) || 0), 0);
    if (totalSales > 0) {
      const pct = Math.round((totalExpenses / totalSales) * 100);
      if (pct > 70) {
        const m = l.highExpenseRatio(pct);
        recs.push({ ...m, priority: priority++, severity: pct > 90 ? 'critical' : 'warning' });
      }
    }
  }

  // 2. Largest expense category
  if (session.expensesData?.rows?.length) {
    const catMap = new Map<string, number>();
    let total = 0;
    for (const row of session.expensesData.rows) {
      const cat = String(row.category || 'Other').trim();
      const amt = Number(row.amount) || 0;
      catMap.set(cat, (catMap.get(cat) || 0) + amt);
      total += amt;
    }
    if (total > 0 && catMap.size > 0) {
      const [topCat, topAmt] = [...catMap.entries()].sort((a, b) => b[1] - a[1])[0];
      const pct = Math.round((topAmt / total) * 100);
      if (pct > 30) {
        const m = l.highExpenseCat(topCat, pct);
        recs.push({ ...m, priority: priority++, severity: 'warning' });
      }
    }
  }

  // 3. Low stock items — reorder recommendation
  if (session.inventoryData?.rows?.length) {
    const lowItems = session.inventoryData.rows
      .filter(r => {
        const qty = Number(r.quantity) || 0;
        return qty > 0 && qty < 10 && String(r.item_name || r.product || '').trim();
      })
      .slice(0, 1);
    for (const row of lowItems) {
      const name = String(row.item_name || row.product || '').trim();
      const qty = Number(row.quantity);
      const m = l.lowStockReorder(name, qty);
      recs.push({ ...m, priority: priority++, severity: 'warning' });
    }

    // 4. Top seller — boost stock
    if (session.salesData?.rows?.length) {
      const salesMap = new Map<string, number>();
      for (const row of session.salesData.rows) {
        const name = String(row.item_name || row.product || '').trim();
        if (name) salesMap.set(name, (salesMap.get(name) || 0) + (Number(row.amount) || 0));
      }
      if (salesMap.size > 0) {
        const [topItem] = [...salesMap.entries()].sort((a, b) => b[1] - a[1])[0];
        const m = l.topSellerBoost(topItem);
        recs.push({ ...m, priority: priority++, severity: 'info' });
      }
    }
  }

  // Fallback: if no data to derive recs from, return empty (no hardcoded data)
  return recs;
}

/**
 * Build alerts from actual uploaded session data.
 * Deterministic — no AI, no hardcoded product names.
 */
function buildAlertsFromSession(
  session: {
    salesData?: { rows: Record<string, string | number>[] } | null;
    expensesData?: { rows: Record<string, string | number>[] } | null;
    inventoryData?: { rows: Record<string, string | number>[] } | null;
  },
  language: Language
): import('@/lib/types').Alert[] {
  const alerts: import('@/lib/types').Alert[] = [];

  const t = {
    en: {
      cashflowCritical: (exp: number, sal: number) =>
        `Expenses (₹${exp.toLocaleString('en-IN')}) are ${Math.round((exp / sal) * 100)}% of sales (₹${sal.toLocaleString('en-IN')}). Cash flow is tight.`,
      lowStock: (item: string, qty: number) =>
        `Low stock: "${item}" has only ${qty} units remaining.`,
      highExpense: (cat: string, amt: number, avg: number) =>
        `"${cat}" expense (₹${amt.toLocaleString('en-IN')}) is ${Math.round(amt / avg)}× the average category spend.`,
    },
    hi: {
      cashflowCritical: (exp: number, sal: number) =>
        `खर्च (₹${exp.toLocaleString('en-IN')}) बिक्री (₹${sal.toLocaleString('en-IN')}) का ${Math.round((exp / sal) * 100)}% है। नकदी प्रवाह तंग है।`,
      lowStock: (item: string, qty: number) =>
        `कम स्टॉक: "${item}" में केवल ${qty} यूनिट बचे हैं।`,
      highExpense: (cat: string, amt: number, avg: number) =>
        `"${cat}" खर्च (₹${amt.toLocaleString('en-IN')}) औसत से ${Math.round(amt / avg)}× अधिक है।`,
    },
    mr: {
      cashflowCritical: (exp: number, sal: number) =>
        `खर्च (₹${exp.toLocaleString('en-IN')}) विक्री (₹${sal.toLocaleString('en-IN')}) च्या ${Math.round((exp / sal) * 100)}% आहे. रोख प्रवाह कमी आहे.`,
      lowStock: (item: string, qty: number) =>
        `कमी साठा: "${item}" मध्ये फक्त ${qty} युनिट शिल्लक आहेत.`,
      highExpense: (cat: string, amt: number, avg: number) =>
        `"${cat}" खर्च (₹${amt.toLocaleString('en-IN')}) सरासरीपेक्षा ${Math.round(amt / avg)}× जास्त आहे.`,
    },
  };

  const lang = t[language] || t.en;

  // 1. Cashflow alert: expenses > 80% of sales
  if (session.salesData?.rows?.length && session.expensesData?.rows?.length) {
    const totalSales = session.salesData.rows.reduce((s, r) => s + (Number(r.amount) || 0), 0);
    const totalExpenses = session.expensesData.rows.reduce((s, r) => s + (Number(r.amount) || 0), 0);
    if (totalSales > 0 && totalExpenses / totalSales > 0.8) {
      alerts.push({
        type: 'cashflow',
        severity: totalExpenses > totalSales ? 'critical' : 'warning',
        message: lang.cashflowCritical(Math.round(totalExpenses), Math.round(totalSales)),
        icon: '💸',
      });
    }
  }

  // 2. Low inventory alert: quantity < 20
  if (session.inventoryData?.rows?.length) {
    for (const row of session.inventoryData.rows) {
      const qty = Number(row.quantity) || 0;
      const name = String(row.item_name || row.product || '').trim();
      if (name && qty > 0 && qty < 20) {
        alerts.push({
          type: 'inventory',
          severity: qty < 5 ? 'critical' : 'warning',
          message: lang.lowStock(name, qty),
          icon: '📦',
        });
        if (alerts.filter(a => a.type === 'inventory').length >= 3) break;
      }
    }
  }

  // 3. Abnormal expense: any category > 2× average category spend
  if (session.expensesData?.rows?.length) {
    const catMap = new Map<string, number>();
    for (const row of session.expensesData.rows) {
      const cat = String(row.category || 'Other').trim();
      catMap.set(cat, (catMap.get(cat) || 0) + (Number(row.amount) || 0));
    }
    if (catMap.size > 1) {
      const values = [...catMap.values()];
      const avg = values.reduce((a, b) => a + b, 0) / values.length;
      for (const [cat, amt] of catMap.entries()) {
        if (amt > avg * 2) {
          alerts.push({
            type: 'expense',
            severity: 'warning',
            message: lang.highExpense(cat, Math.round(amt), Math.round(avg)),
            icon: '⚠️',
          });
          break; // one alert is enough
        }
      }
    }
  }

  return alerts;
}

/**
 * Build chart data purely from actual uploaded session CSV rows.
 * Only includes charts for data that was actually uploaded.
 */
function buildChartDataFromSession(session: {
  salesData?: { rows: Record<string, string | number>[] } | null;
  expensesData?: { rows: Record<string, string | number>[] } | null;
  inventoryData?: { rows: Record<string, string | number>[] } | null;
}): import('@/lib/types').ChartData {
  const chartData: import('@/lib/types').ChartData = {};

  // Product Sales — group by item_name, sum amount
  if (session.salesData?.rows?.length) {
    const salesMap = new Map<string, number>();
    for (const row of session.salesData.rows) {
      const name = String(row.item_name || row.product || 'Unknown').trim();
      const amt = Number(row.amount) || 0;
      salesMap.set(name, (salesMap.get(name) || 0) + amt);
    }
    if (salesMap.size > 0) {
      const sorted = [...salesMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
      chartData.productSales = {
        labels: sorted.map(([k]) => k),
        values: sorted.map(([, v]) => v),
      };
    }

    // Profit Trend — group sales by date
    const dateMap = new Map<string, number>();
    for (const row of session.salesData.rows) {
      const date = String(row.date || '').trim();
      if (date) {
        dateMap.set(date, (dateMap.get(date) || 0) + (Number(row.amount) || 0));
      }
    }
    if (dateMap.size > 1) {
      const sorted = [...dateMap.entries()].sort(([a], [b]) => a.localeCompare(b));
      chartData.profitTrend = {
        labels: sorted.map(([k]) => k),
        values: sorted.map(([, v]) => v),
      };
    }
  }

  // Expense Breakdown — group by category, sum amount
  if (session.expensesData?.rows?.length) {
    const expMap = new Map<string, number>();
    for (const row of session.expensesData.rows) {
      const cat = String(row.category || 'Other').trim();
      expMap.set(cat, (expMap.get(cat) || 0) + (Number(row.amount) || 0));
    }
    if (expMap.size > 0) {
      const sorted = [...expMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
      chartData.expenseBreakdown = {
        labels: sorted.map(([k]) => k),
        values: sorted.map(([, v]) => v),
      };
    }
  }

  // Inventory Value — item_name × unit_price × quantity
  if (session.inventoryData?.rows?.length) {
    const invMap = new Map<string, number>();
    for (const row of session.inventoryData.rows) {
      const name = String(row.item_name || row.product || 'Unknown').trim();
      const qty = Number(row.quantity) || 0;
      const price = Number(row.unit_price || row.cost_price) || 0;
      invMap.set(name, (invMap.get(name) || 0) + qty * price);
    }
    if (invMap.size > 0) {
      const sorted = [...invMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
      chartData.inventoryValue = {
        labels: sorted.map(([k]) => k),
        values: sorted.map(([, v]) => v),
      };
    }
  }

  return chartData;
}

/**
 * Strip markdown formatting from text
 * Removes bold (**text**), bullet points, and other markdown syntax
 */
function stripMarkdownFormatting(text: string): string {
  if (!text) return text;
  
  let cleaned = text;
  
  // Remove bold formatting: **text** -> text
  cleaned = cleaned.replace(/\*\*([^*]+)\*\*/g, '$1');
  
  // Remove bullet points at start of lines: - text or * text -> text
  cleaned = cleaned.replace(/^[\s]*[-*]\s+/gm, '');
  
  // Remove numbered lists: 1. text -> text
  cleaned = cleaned.replace(/^[\s]*\d+\.\s+/gm, '');
  
  // Remove markdown headings: ### text -> text
  cleaned = cleaned.replace(/^[\s]*#{1,6}\s+/gm, '');
  
  // Remove any remaining stray ** markers (e.g. **Label: text where closing ** is missing)
  cleaned = cleaned.replace(/\*\*/g, '');
  
  // Remove italic/single asterisk markers: *text* -> text, or stray *
  cleaned = cleaned.replace(/\*([^*]+)\*/g, '$1');
  cleaned = cleaned.replace(/\*/g, '');
  
  // Clean up extra whitespace
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n').trim();
  
  return cleaned;
}

/**
 * Parse AI response into structured insights
 * Improved parsing to handle various AI response formats.
 * PRIMARY: delimiter-based parsing on [SECTION_1]-[SECTION_5]
 * FALLBACK: regex-based parsing for older responses without markers
 */
function parseInsights(content: string): BusinessInsights {
  const sections: BusinessInsights = {
    trueProfitAnalysis: '',
    lossMakingProducts: [] as string[],
    blockedInventoryCash: '',
    abnormalExpenses: [] as string[],
    cashflowForecast: '',
  };
  
  // If content is empty or too short, return it as-is in trueProfitAnalysis
  if (!content || content.trim().length < 20) {
    sections.trueProfitAnalysis = content || 'No analysis available';
    return sections;
  }

  // --- PRIMARY: delimiter-based parsing on [SECTION_N] markers ---
  const markerRegex = /\[SECTION_(\d)\]/gi;
  const markerMatches = [...content.matchAll(markerRegex)];

  if (markerMatches.length >= 2) {
    const slices: { num: number; text: string }[] = [];

    for (let i = 0; i < markerMatches.length; i++) {
      const match = markerMatches[i];
      const num = parseInt(match[1], 10);
      const contentStart = (match.index ?? 0) + match[0].length;
      const contentEnd =
        i + 1 < markerMatches.length
          ? markerMatches[i + 1].index ?? content.length
          : content.length;

      slices.push({
        num,
        text: content.slice(contentStart, contentEnd).trim(),
      });
    }

    const sectionMap: Record<number, string> = {};
    for (const { num, text } of slices) {
      sectionMap[num] = text;
    }

    if (sectionMap[1]) sections.trueProfitAnalysis = stripMarkdownFormatting(sectionMap[1]);
    if (sectionMap[3]) sections.blockedInventoryCash = stripMarkdownFormatting(sectionMap[3]);
    if (sectionMap[5]) sections.cashflowForecast = stripMarkdownFormatting(sectionMap[5]);

    for (const [num, key] of [[2, 'lossMakingProducts'], [4, 'abnormalExpenses']] as const) {
      const raw = sectionMap[num];
      if (raw) {
        const listItems = raw
          .split('\n')
          .map(line => line.trim())
          .filter(line => line && line.match(/^[-•*\d.]/))
          .map(line => line.replace(/^[-•*\d.]\s*/, '').trim())
          .filter(line => line.length > 0);

        (sections as any)[key] =
          listItems.length > 0
            ? listItems.map(stripMarkdownFormatting)
            : [stripMarkdownFormatting(raw)];
      }
    }

    return sections;
  }

  // --- FALLBACK: legacy keyword-regex parsing ---
  let cleanedContent = content;
  const placeholderHeadings = [
    /^#{1,4}\s*Understanding\s+Your\s+HealthScore.*$/gim,
    /^#{1,4}\s*Explanation\s+of.*$/gim,
    /^#{1,4}\s*Identify\s*$/gim,
    /^#{1,4}\s*Highlight\s*$/gim,
    /^#{1,4}\s*Analysis\s*$/gim,
  ];
  for (const pattern of placeholderHeadings) {
    cleanedContent = cleanedContent.replace(pattern, '');
  }
  cleanedContent = cleanedContent.replace(/\n{3,}/g, '\n\n').trim();
  content = cleanedContent;
  
  const sectionPatterns = [
    {
      key: 'trueProfitAnalysis',
      patterns: [
        /(?:\*\*|##)\s*(?:1\.\s*)?(?:true profit|असली लाभ|खरा नफा)(?:\s*vs\s*cash\s*flow)?(?:\*\*|:|\n)([\s\S]*?)(?=(?:\*\*|##)\s*(?:\d+\.|loss|blocked|abnormal|cashflow|$)|$)/i,
        /(?:true profit|असली लाभ|खरा नफा)[\s\S]*?:([\s\S]*?)(?=(?:loss-making|blocked|abnormal|cashflow|$))/i
      ]
    },
    {
      key: 'lossMakingProducts',
      patterns: [
        /(?:\*\*|##)\s*(?:2\.\s*)?(?:loss-making|नुकसान देने|तोटा देणारी)(?:\s*products)?(?:\*\*|:|\n)([\s\S]*?)(?=(?:\*\*|##)\s*(?:\d+\.|blocked|abnormal|cashflow|$)|$)/i,
        /(?:loss-making|नुकसान देने|तोटा देणारी)[\s\S]*?:([\s\S]*?)(?=(?:blocked|abnormal|cashflow|$))/i
      ],
      isList: true
    },
    {
      key: 'blockedInventoryCash',
      patterns: [
        /(?:\*\*|##)\s*(?:3\.\s*)?(?:blocked|फंसा हुआ|अडकलेली)(?:\s*inventory)?(?:\s*cash)?(?:\*\*|:|\n)([\s\S]*?)(?=(?:\*\*|##)\s*(?:\d+\.|abnormal|cashflow|$)|$)/i,
        /(?:blocked|फंसा हुआ|अडकलेली)[\s\S]*?:([\s\S]*?)(?=(?:abnormal|cashflow|$))/i
      ]
    },
    {
      key: 'abnormalExpenses',
      patterns: [
        /(?:\*\*|##)\s*(?:4\.\s*)?(?:abnormal|unusual|असामान्य)(?:\s*expenses)?(?:\*\*|:|\n)([\s\S]*?)(?=(?:\*\*|##)\s*(?:\d+\.|cashflow|$)|$)/i,
        /(?:abnormal|unusual|असामान्य)[\s\S]*?:([\s\S]*?)(?=(?:cashflow|$))/i
      ],
      isList: true
    },
    {
      key: 'cashflowForecast',
      patterns: [
        /(?:\*\*|##)\s*(?:5\.\s*)?(?:cashflow|कैशफ्लो|कॅशफ्लो)(?:\s*forecast)?(?:\s*7-day)?(?:\*\*|:|\n)([\s\S]*?)$/i,
        /(?:cashflow|कैशफ्लो|कॅशफ्लो)[\s\S]*?:([\s\S]*?)$/i
      ]
    }
  ];
  
  let parsedAnySection = false;
  
  for (const section of sectionPatterns) {
    for (const pattern of section.patterns) {
      const match = content.match(pattern);
      if (match && match[1]) {
        let extractedContent = match[1].trim();
        extractedContent = extractedContent.replace(/(?:\*\*|##)\s*(?:\d+\.|\w+)/g, '').trim();
        
        if ((section as any).isList) {
          const listItems = extractedContent
            .split('\n')
            .map(line => line.trim())
            .filter(line => line && line.match(/^[-•*\d.]/))
            .map(line => line.replace(/^[-•*\d.]\s*/, '').trim())
            .filter(line => line.length > 0);
          
          if (listItems.length > 0) {
            (sections as any)[section.key] = listItems;
            parsedAnySection = true;
            break;
          }
        } else {
          if (extractedContent.length > 0) {
            (sections as any)[section.key] = extractedContent;
            parsedAnySection = true;
            break;
          }
        }
      }
    }
  }
  
  if (!parsedAnySection) {
    sections.trueProfitAnalysis = content;
  }
  
  sections.trueProfitAnalysis = stripMarkdownFormatting(sections.trueProfitAnalysis);
  sections.blockedInventoryCash = stripMarkdownFormatting(sections.blockedInventoryCash);
  sections.cashflowForecast = stripMarkdownFormatting(sections.cashflowForecast);
  sections.lossMakingProducts = sections.lossMakingProducts.map(stripMarkdownFormatting);
  sections.abnormalExpenses = sections.abnormalExpenses.map(stripMarkdownFormatting);
  
  return sections;
}
