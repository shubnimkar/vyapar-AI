// API route for Q&A with AI

import { NextRequest, NextResponse } from 'next/server';
import { getSession, updateSession } from '@/lib/session-store';
import { getFallbackOrchestrator } from '@/lib/ai/fallback-orchestrator';
import { buildQAPrompt } from '@/lib/prompts';
import { Language, ChatMessage, DailyEntry, CreditEntry, DailyReport, InferredTransaction } from '@/lib/types';
import { logger } from '@/lib/logger';
import {
  checkBodySize,
  logAndReturnError,
  createErrorResponse,
  ErrorCode,
  BODY_SIZE_LIMITS
} from '@/lib/error-utils';

/**
 * Strip markdown formatting from AI responses
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

function inferRelevantSources(
  question: string,
  availableSources: string[],
  activeSection?: string
): string[] {
  const normalized = question.toLowerCase();
  const keywordMap: Array<{ pattern: RegExp; sources: string[] }> = [
    { pattern: /\b(credit|overdue|reminder|customer|udhaar|उधार|थकबाकी|उधारी)\b/i, sources: ['credit_entries'] },
    { pattern: /\b(report|summary|weekly|monthly|daily report|रिपोर्ट|सारांश)\b/i, sources: ['reports'] },
    { pattern: /\b(pending|review|receipt|csv upload|प्रलंबित|लंबित|समीक्षा)\b/i, sources: ['pending_transactions'] },
    { pattern: /\b(profit|margin|cash|sales|expense|business|health|cashflow|लाभ|मार्जिन|कैश|बिक्री|खर्च|आरोग्य|नफा)\b/i, sources: ['daily_entries'] },
    { pattern: /\b(product|inventory|stock|item|इन्वेंटरी|स्टॉक|उत्पादन)\b/i, sources: ['inventory_csv', 'sales_csv'] },
    { pattern: /\b(expense|spend|cost|खर्च)\b/i, sources: ['expenses_csv', 'daily_entries'] },
    { pattern: /\b(sales|revenue|sale|बिक्री|विक्री)\b/i, sources: ['sales_csv', 'daily_entries'] },
  ];

  const matches = new Set<string>();
  keywordMap.forEach(({ pattern, sources }) => {
    if (pattern.test(normalized)) {
      sources.forEach((source) => {
        if (availableSources.includes(source)) {
          matches.add(source);
        }
      });
    }
  });

  const activeSectionDefaults: Record<string, string[]> = {
    credit: ['credit_entries'],
    pending: ['pending_transactions'],
    reports: ['reports'],
    health: ['daily_entries'],
    analysis: ['sales_csv', 'expenses_csv', 'inventory_csv'],
  };

  (activeSectionDefaults[activeSection || ''] || []).forEach((source) => {
    if (availableSources.includes(source)) {
      matches.add(source);
    }
  });

  if (matches.size > 0) {
    return Array.from(matches);
  }

  return availableSources.slice(0, 4);
}

export async function POST(request: NextRequest) {
  try {
    logger.info('Q&A request received', {
      path: '/api/ask'
    });

    // Validate body size (1MB limit for AI endpoints)
    const bodyCheck = await checkBodySize(request, BODY_SIZE_LIMITS.AI);
    if ('error' in bodyCheck) {
      return NextResponse.json(bodyCheck.error, { status: 413 });
    }

    const body = JSON.parse(bodyCheck.bodyText);
    const { sessionId, question, language = 'en', dailyEntries = [], creditEntries = [], appContext } = body as {
      sessionId: string;
      question: string;
      language: Language;
      dailyEntries?: DailyEntry[];
      creditEntries?: CreditEntry[];
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
      };
    };

    // Validate inputs
    if (!sessionId || !question) {
      logger.warn('Missing required fields in Q&A request', { sessionId: !!sessionId, question: !!question });
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
        createErrorResponse(ErrorCode.NOT_FOUND, 'errors.sessionNotFound', language),
        { status: 404 }
      );
    }

    // Check if data is uploaded
    const mergedDailyEntries = dailyEntries.length > 0 ? dailyEntries : (session.dailyEntries || []);
    const mergedCreditEntries = creditEntries.length > 0 ? creditEntries : (session.creditEntries || []);
    const hasCsvData = Boolean(session.salesData || session.expensesData || session.inventoryData);
    const hasOperationalData = mergedDailyEntries.length > 0 || mergedCreditEntries.length > 0;
    const hasAppContextData = Boolean(
      (appContext?.pendingTransactions && appContext.pendingTransactions.length > 0) ||
      (appContext?.reports && appContext.reports.length > 0)
    );

    if (!hasCsvData && !hasOperationalData && !hasAppContextData) {
      logger.warn('No data uploaded for Q&A', { sessionId });
      return NextResponse.json(
        createErrorResponse(ErrorCode.INVALID_INPUT, 'errors.qaNoData', language),
        { status: 400 }
      );
    }

    // Call AI for Q&A
    // Build Q&A prompt with context
    const prompt = buildQAPrompt(
      question,
      session.salesData,
      session.expensesData,
      session.inventoryData,
      mergedDailyEntries,
      mergedCreditEntries,
      session.conversationHistory,
      language,
      appContext
    );

    const availableSources: string[] = [];
    if (mergedDailyEntries.length > 0) availableSources.push('daily_entries');
    if (mergedCreditEntries.length > 0) availableSources.push('credit_entries');
    if (appContext?.pendingTransactions?.length) availableSources.push('pending_transactions');
    if (appContext?.reports?.length) availableSources.push('reports');
    if (session.salesData) availableSources.push('sales_csv');
    if (session.expensesData) availableSources.push('expenses_csv');
    if (session.inventoryData) availableSources.push('inventory_csv');
    const sourcesUsed = inferRelevantSources(question, availableSources, appContext?.activeSection);

    const orchestrator = getFallbackOrchestrator();
    const sessionUserId = (session as unknown as { userId?: string }).userId;
    const aiResponse = await orchestrator.generateResponse(
      prompt,
      { language },
      {
        endpoint: '/api/ask',
        ...(typeof sessionUserId === 'string' ? { userId: sessionUserId } : {}),
      }
    );

    if (!aiResponse.success) {
      return NextResponse.json(
        logAndReturnError(
          new Error(aiResponse.error || 'AI invocation failed'),
          ErrorCode.BEDROCK_ERROR,
          'errors.bedrockError',
          language,
          { path: '/api/ask', sessionId }
        ),
        { status: 503 }
      );
    }

    const answer = aiResponse.content || '';

    // Strip markdown formatting from AI response
    const cleanedAnswer = stripMarkdownFormatting(answer);

    // Store question and answer in conversation history
    const userMessage: ChatMessage = {
      role: 'user',
      content: question,
      timestamp: new Date(),
    };

    const assistantMessage: ChatMessage = {
      role: 'assistant',
      content: cleanedAnswer,
      timestamp: new Date(),
      sourcesUsed,
    };

    const updatedHistory = [
      ...session.conversationHistory,
      userMessage,
      assistantMessage,
    ];

    // Update session with new conversation history
    await updateSession(sessionId, {
      conversationHistory: updatedHistory,
    });

    logger.info('Q&A completed successfully', { sessionId });

    return NextResponse.json({
      success: true,
      answer: cleanedAnswer,
      sourcesUsed,
    });
  } catch (error) {
    return NextResponse.json(
      logAndReturnError(
        error as Error,
        ErrorCode.SERVER_ERROR,
        'errors.serverError',
        'en',
        { path: '/api/ask' }
      ),
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId } = body as { sessionId?: string };

    if (!sessionId) {
      return NextResponse.json(
        createErrorResponse(ErrorCode.INVALID_INPUT, 'errors.invalidInput', 'en'),
        { status: 400 }
      );
    }

    const updatedSession = await updateSession(sessionId, {
      conversationHistory: [],
    });

    if (!updatedSession) {
      return NextResponse.json(
        createErrorResponse(ErrorCode.NOT_FOUND, 'errors.sessionNotFound', 'en'),
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      logAndReturnError(
        error as Error,
        ErrorCode.SERVER_ERROR,
        'errors.serverError',
        'en',
        { path: '/api/ask', method: 'DELETE' }
      ),
      { status: 500 }
    );
  }
}
