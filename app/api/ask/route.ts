// API route for Q&A with AI

import { NextRequest, NextResponse } from 'next/server';
import { getSession, updateSession } from '@/lib/session-store';
import { invokeBedrockModel } from '@/lib/bedrock-client';
import { buildQAPrompt } from '@/lib/prompts';
import { Language, ChatMessage } from '@/lib/types';
import { t } from '@/lib/translations';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, question, language = 'en' } = body as {
      sessionId: string;
      question: string;
      language: Language;
    };
    
    // Validate inputs
    if (!sessionId || !question) {
      return NextResponse.json(
        {
          success: false,
          error: 'Session ID and question are required',
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
    
    // Check if data is uploaded
    if (!session.salesData && !session.expensesData && !session.inventoryData) {
      return NextResponse.json(
        {
          success: false,
          error: t('uploadDataFirst', language),
        },
        { status: 400 }
      );
    }
    
    // Build Q&A prompt with context
    const prompt = buildQAPrompt(
      question,
      session.salesData,
      session.expensesData,
      session.inventoryData,
      session.conversationHistory,
      language
    );
    
    // Call AWS Bedrock
    const bedrockResponse = await invokeBedrockModel(prompt, 2, language);
    
    if (!bedrockResponse.success) {
      return NextResponse.json(
        {
          success: false,
          error: bedrockResponse.error || t('questionFailed', language),
        },
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
    updateSession(sessionId, {
      conversationHistory: updatedHistory,
    });
    
    return NextResponse.json({
      success: true,
      answer,
    });
    
  } catch (error) {
    console.error('Q&A error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get answer. Please try again.',
      },
      { status: 500 }
      );
  }
}
