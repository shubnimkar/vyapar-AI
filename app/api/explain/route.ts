// Explain API Route
// Gets AI explanation for deterministic results
// AI explains, does NOT calculate

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session-store';
import { invokeBedrockModel } from '@/lib/bedrock-client';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, metric, value, context, language } = body;
    
    // Validate inputs
    if (!sessionId || !metric || value === undefined) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: sessionId, metric, value',
      }, { status: 400 });
    }
    
    // Get session
    const session = getSession(sessionId);
    if (!session) {
      return NextResponse.json({
        success: false,
        error: language === 'hi'
          ? 'सत्र समाप्त हो गया। कृपया डेटा फिर से दर्ज करें।'
          : language === 'mr'
          ? 'सत्र संपले. कृपया डेटा पुन्हा प्रविष्ट करा.'
          : 'Session expired. Please enter data again.',
      }, { status: 404 });
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
    const explanation = await invokeBedrockModel(prompt, language);
    
    return NextResponse.json({
      success: true,
      explanation,
      metric,
      value,
    });
    
  } catch (error) {
    console.error('Explain API error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to get explanation. AI service may be unavailable.',
    }, { status: 500 });
  }
}
