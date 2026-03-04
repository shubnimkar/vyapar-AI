// Explain API Route
// Gets AI explanation for deterministic results
// AI explains, does NOT calculate

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session-store';
import { invokeBedrockModel } from '@/lib/bedrock-client';
import { Language } from '@/lib/types';
import { logger } from '@/lib/logger';
import {
  checkBodySize,
  logAndReturnError,
  createErrorResponse,
  ErrorCode,
  BODY_SIZE_LIMITS
} from '@/lib/error-utils';

export async function POST(request: NextRequest) {
  let language: Language = 'en'; // Default language for error handling
  
  try {
    logger.info('Explain request received', {
      path: '/api/explain'
    });

    // Validate body size (1MB limit for AI endpoints)
    const bodyCheck = await checkBodySize(request, BODY_SIZE_LIMITS.AI);
    if ('error' in bodyCheck) {
      return NextResponse.json(bodyCheck.error, { status: 413 });
    }

    const body = JSON.parse(bodyCheck.bodyText);
    const { sessionId, metric, value, context, language: requestLanguage } = body;
    
    // Set language from request
    if (requestLanguage) {
      language = requestLanguage;
    }
    
    // Validate inputs
    if (!sessionId || !metric || value === undefined) {
      logger.warn('Missing required fields in explain request', { 
        sessionId: !!sessionId, 
        metric: !!metric, 
        value: value !== undefined 
      });
      return NextResponse.json(
        createErrorResponse(ErrorCode.INVALID_INPUT, 'errors.invalidInput', language),
        { status: 400 }
      );
    }
    
    // Get session
    const session = getSession(sessionId);
    if (!session) {
      logger.warn('Session not found', { sessionId });
      return NextResponse.json(
        createErrorResponse(ErrorCode.NOT_FOUND, 'errors.notFound', language),
        { status: 404 }
      );
    }
    
    // Construct focused prompt for specific metric
    let prompt = '';
    
    if (metric === 'healthScore') {
      const langName = language === 'hi' ? 'Hindi' : language === 'mr' ? 'Marathi' : 'English';
      prompt = `You are explaining a business health score to a small shop owner in ${langName}.

**Health Score: ${value}/100**

${context?.breakdown ? `
**Score Breakdown:**
- Margin Score: ${context.breakdown.marginScore}/30
- Expense Score: ${context.breakdown.expenseScore}/30
- Cash Score: ${context.breakdown.cashScore}/20
- Credit Score: ${context.breakdown.creditScore}/20
` : ''}

**Your Task:**
Explain in simple ${langName} what this score means:
1. Is this score good, average, or concerning?
2. Which area needs the most improvement?
3. What are 2-3 specific actions the owner can take to improve the score?

**Guidelines:**
- Use simple language, no jargon
- Be encouraging but honest
- Provide specific, actionable advice
- Keep explanation under 150 words
- Use natural ${langName} expressions`;
    } else if (metric === 'dailyProfit') {
      const langName = language === 'hi' ? 'Hindi' : language === 'mr' ? 'Marathi' : 'English';
      prompt = `You are explaining today's business results to a shop owner in ${langName}.

**Today's Results:**
- Sales: ₹${context?.sales || 0}
- Expenses: ₹${context?.expenses || 0}
- Profit: ₹${value}
- Expense Ratio: ${context?.expenseRatio ? (context.expenseRatio * 100).toFixed(1) : 0}%

**Your Task:**
In 2-3 sentences, explain in ${langName}:
1. Is today's profit good or concerning?
2. Is the expense ratio healthy?
3. One specific suggestion for tomorrow

Use simple ${langName}. Be brief and actionable.`;
    } else {
      // Generic explanation
      const langName = language === 'hi' ? 'Hindi' : language === 'mr' ? 'Marathi' : 'English';
      prompt = `Explain the metric "${metric}" with value ${value} to a small shop owner in simple ${langName}. Be brief and actionable.`;
    }
    
    // Call AI for explanation only
    try {
      const bedrockResponse = await invokeBedrockModel(prompt, 2, language);
      
      if (!bedrockResponse.success) {
        return NextResponse.json(
          logAndReturnError(
            new Error(bedrockResponse.error || 'Bedrock invocation failed'),
            ErrorCode.BEDROCK_ERROR,
            'errors.bedrockError',
            language,
            { path: '/api/explain', sessionId, metric }
          ),
          { status: 503 }
        );
      }
      
      logger.info('Explanation completed successfully', { sessionId, metric });
      
      return NextResponse.json({
        success: true,
        explanation: bedrockResponse,
        metric,
        value,
      });
    } catch (bedrockError) {
      return NextResponse.json(
        logAndReturnError(
          bedrockError as Error,
          ErrorCode.BEDROCK_ERROR,
          'errors.bedrockError',
          language,
          { path: '/api/explain', sessionId, metric }
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
        language,
        { path: '/api/explain' }
      ),
      { status: 500 }
    );
  }
}
