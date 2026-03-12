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
    
    // Add enhanced features (recommendations, alerts, charts, benchmark)
    const { 
      generateMockRecommendations, 
      generateMockAlerts, 
      generateMockChartData,
      generateMockBenchmark 
    } = await import('@/lib/bedrock-client-mock');
    
    insights.recommendations = generateMockRecommendations(language);
    insights.alerts = generateMockAlerts(language);
    insights.chartData = generateMockChartData();
    
    // Add benchmark data
    const benchmark = generateMockBenchmark(language);
    
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
