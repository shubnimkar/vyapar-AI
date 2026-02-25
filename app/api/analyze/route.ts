// API route for AI-powered business analysis

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session-store';
import { invokeBedrockModel } from '@/lib/bedrock-client';
import { buildAnalysisPrompt } from '@/lib/prompts';
import { Language, BusinessInsights } from '@/lib/types';
import { t } from '@/lib/translations';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, language = 'en' } = body as {
      sessionId: string;
      language: Language;
    };
    
    // Validate session ID
    if (!sessionId) {
      return NextResponse.json(
        {
          success: false,
          error: t('uploadDataFirst', language),
        },
        { status: 400 }
      );
    }
    
    // Get session data
    const session = getSession(sessionId);
    if (!session) {
      return NextResponse.json(
        {
          success: false,
          error: t('sessionExpired', language),
        },
        { status: 404 }
      );
    }
    
    // Check if at least one dataset is uploaded
    if (!session.salesData && !session.expensesData && !session.inventoryData) {
      return NextResponse.json(
        {
          success: false,
          error: t('uploadDataFirst', language),
        },
        { status: 400 }
      );
    }
    
    // Build analysis prompt
    const prompt = buildAnalysisPrompt(
      session.salesData,
      session.expensesData,
      session.inventoryData,
      language
    );
    
    // Call AWS Bedrock
    const bedrockResponse = await invokeBedrockModel(prompt, 2, language);
    
    if (!bedrockResponse.success) {
      return NextResponse.json(
        {
          success: false,
          error: bedrockResponse.error || t('analysisFailed', language),
        },
        { status: 503 }
      );
    }
    
    // Parse AI response into structured insights
    const aiContent = bedrockResponse.content || '';
    const insights = parseInsights(aiContent);
    
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
    
    return NextResponse.json({
      success: true,
      insights,
      benchmark,
    });
    
  } catch (error: any) {
    console.error('Analysis error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Analysis failed. Please try again.',
      },
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
