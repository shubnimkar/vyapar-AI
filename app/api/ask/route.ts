// API route for Q&A with AI

import { NextRequest, NextResponse } from 'next/server';
import { getSession, updateSession } from '@/lib/session-store';
import { invokeBedrockModel } from '@/lib/bedrock-client';
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
        createErrorResponse(ErrorCode.NOT_FOUND, 'errors.notFound', language),
        { status: 404 }
      );
    }
    
    // Check if data is uploaded
    if (!session.salesData && !session.expensesData && !session.inventoryData) {
      logger.warn('No data uploaded for Q&A', { sessionId });
      return NextResponse.json(
        createErrorResponse(ErrorCode.INVALID_INPUT, 'errors.invalidInput', language),
        { status: 400 }
      );
    }
    
    // Call AWS Bedrock
    try {
      // Build Q&A prompt with context
      const prompt = buildQAPrompt(
        question,
        session.salesData,
        session.expensesData,
        session.inventoryData,
        session.conversationHistory,
        language
      );
      
      const bedrockResponse = await invokeBedrockModel(prompt, 2, language);
      
      if (!bedrockResponse.success) {
        return NextResponse.json(
          logAndReturnError(
            new Error(bedrockResponse.error || 'Bedrock invocation failed'),
            ErrorCode.BEDROCK_ERROR,
            'errors.bedrockError',
            language,
            { path: '/api/ask', sessionId }
          ),
          { status: 503 }
        );
      }
      
      const answer = bedrockResponse.content || '';
      
      // Store question and answer in conversation history
      const userMessage: ChatMessage = {
        role: 'user',
        content: question,
        timestamp: new Date(),
      };
      
      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: answer,
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
        answer,
      });
    } catch (bedrockError) {
      return NextResponse.json(
        logAndReturnError(
          bedrockError as Error,
          ErrorCode.BEDROCK_ERROR,
          'errors.bedrockError',
          language,
          { path: '/api/ask', sessionId }
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
        { path: '/api/ask' }
      ),
      { status: 500 }
    );
  }
}
