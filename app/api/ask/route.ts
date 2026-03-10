// API route for Q&A with AI

import { NextRequest, NextResponse } from 'next/server';
import { getSession, updateSession } from '@/lib/session-store';
import { getFallbackOrchestrator } from '@/lib/ai/fallback-orchestrator';
import { buildQAPrompt } from '@/lib/prompts';
import { Language, ChatMessage } from '@/lib/types';
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
    const { sessionId, question, language = 'en' } = body as {
      sessionId: string;
      question: string;
      language: Language;
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
    if (!session.salesData && !session.expensesData && !session.inventoryData) {
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
      session.conversationHistory,
      language
    );

    const orchestrator = getFallbackOrchestrator();
    const aiResponse = await orchestrator.generateResponse(
      prompt,
      { language },
      { endpoint: '/api/ask' }
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
