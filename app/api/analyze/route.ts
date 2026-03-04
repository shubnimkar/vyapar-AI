// API route for AI-powered business analysis
// HYBRID MODEL: Calculates deterministic metrics first, then AI explains

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session-store';
import { invokeBedrockModel } from '@/lib/bedrock-client';
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
    const session = getSession(sessionId);
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
    
    // STEP 3: Call AWS Bedrock for EXPLANATION only (not calculation)
    try {
      // STEP 2: Build analysis prompt with PRE-CALCULATED metrics
      const prompt = buildAnalysisPrompt(
        session.salesData,
        session.expensesData,
        session.inventoryData,
        language,
        calculatedMetrics // Pass pre-calculated metrics to prompt
      );
      
      const bedrockResponse = await invokeBedrockModel(prompt, 2, language);
      
      if (!bedrockResponse.success) {
        return NextResponse.json(
          logAndReturnError(
            new Error(bedrockResponse.error || 'Bedrock invocation failed'),
            ErrorCode.BEDROCK_ERROR,
            'errors.bedrockError',
            language,
            { path: '/api/analyze', sessionId }
          ),
          { status: 503 }
        );
      }
      
      // Parse AI response into structured insights
      const aiContent = bedrockResponse.content || '';
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
    } catch (bedrockError) {
      return NextResponse.json(
        logAndReturnError(
          bedrockError as Error,
          ErrorCode.BEDROCK_ERROR,
          'errors.bedrockError',
          language,
          { path: '/api/analyze', sessionId }
        ),
        { status: 503 }
      );
    }
    
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
 * Parse AI response into structured insights
 */
function parseInsights(content: string): BusinessInsights {
  const sections: BusinessInsights = {
    trueProfitAnalysis: '',
    lossMakingProducts: [] as string[],
    blockedInventoryCash: '',
    abnormalExpenses: [] as string[],
    cashflowForecast: '',
  };
  
  // Split by markdown headers (** or ##)
  const parts = content.split(/\*\*|\#{2,}/);
  
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i].trim();
    if (!part) continue;
    
    const lowerPart = part.toLowerCase();
    
    // Check which section this is
    if (lowerPart.includes('true profit') || lowerPart.includes('असली लाभ') || lowerPart.includes('खरा नफा')) {
      // Get content after the header (next part)
      if (i + 1 < parts.length) {
        sections.trueProfitAnalysis = parts[i + 1].trim();
      }
    } else if (lowerPart.includes('loss-making') || lowerPart.includes('नुकसान देने') || lowerPart.includes('तोटा देणारी')) {
      // Get content and parse as list
      if (i + 1 < parts.length) {
        const listContent = parts[i + 1].trim();
        sections.lossMakingProducts = listContent
          .split('\n')
          .filter(line => line.trim().match(/^[-•*\d.]/))
          .map(line => line.trim());
      }
    } else if (lowerPart.includes('blocked') || lowerPart.includes('फंसा हुआ') || lowerPart.includes('अडकलेली')) {
      if (i + 1 < parts.length) {
        sections.blockedInventoryCash = parts[i + 1].trim();
      }
    } else if (lowerPart.includes('abnormal') || lowerPart.includes('असामान्य') || lowerPart.includes('expense') || lowerPart.includes('खर्च')) {
      if (i + 1 < parts.length) {
        const listContent = parts[i + 1].trim();
        sections.abnormalExpenses = listContent
          .split('\n')
          .filter(line => line.trim().match(/^[-•*\d.]/))
          .map(line => line.trim());
      }
    } else if (lowerPart.includes('cashflow') || lowerPart.includes('forecast') || lowerPart.includes('7-day') || lowerPart.includes('कैशफ्लो') || lowerPart.includes('कॅशफ्लो')) {
      if (i + 1 < parts.length) {
        sections.cashflowForecast = parts[i + 1].trim();
      }
    }
  }
  
  // Fallback: if no sections parsed, return raw content
  if (!sections.trueProfitAnalysis && !sections.cashflowForecast && !sections.blockedInventoryCash) {
    sections.trueProfitAnalysis = content;
  }
  
  return sections;
}
