// Explain API Route
// Gets AI explanation for deterministic results
// AI explains, does NOT calculate

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session-store';
import { getFallbackOrchestrator } from '@/lib/ai/fallback-orchestrator';
import { Language } from '@/lib/types';
import { logger } from '@/lib/logger';
import { ProfileService } from '@/lib/dynamodb-client';
import { buildPersonaPrompt } from '@/lib/ai/prompt-builder';
import { PersonaContext } from '@/lib/ai/types';
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
    const { sessionId, userId, metric, value, context, language: requestLanguage } = body;
    
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
    
    // Require userId for persona-aware prompts
    if (!userId) {
      logger.warn('Missing userId in explain request', { sessionId });
      return NextResponse.json(
        createErrorResponse(ErrorCode.AUTH_REQUIRED, 'errors.authRequired', language),
        { status: 401 }
      );
    }
    
    // Get session
    const session = await getSession(sessionId);
    if (!session) {
      logger.warn('Session not found', { sessionId });
      return NextResponse.json(
        createErrorResponse(ErrorCode.NOT_FOUND, 'errors.notFound', language),
        { status: 404 }
      );
    }
    
    // Retrieve profile for persona context
    const profile = await ProfileService.getProfile(userId);
    if (!profile || !profile.business_type || !profile.explanation_mode) {
      logger.warn('Profile incomplete or missing persona fields', { userId });
      return NextResponse.json(
        createErrorResponse('PROFILE_INCOMPLETE' as ErrorCode, 'errors.profileIncomplete', language),
        { status: 400 }
      );
    }
    
    // Build persona context
    const personaContext: PersonaContext = {
      business_type: profile.business_type,
      city_tier: profile.city_tier,
      explanation_mode: profile.explanation_mode,
      language: profile.language as Language,
    };
    
    // Build persona-aware prompt
    const promptData = {
      metric,
      value,
      calculatedMetrics: context?.breakdown || {},
    };
    
    const promptStructure = buildPersonaPrompt(personaContext, 'explain', promptData);
    
    // Log persona context
    logger.info('Building persona-aware explanation', {
      userId,
      sessionId,
      metric,
      persona_context: {
        business_type: personaContext.business_type,
        city_tier: personaContext.city_tier,
        explanation_mode: personaContext.explanation_mode,
      },
    });
    
    // Call AI for explanation only (graceful degradation if AI unavailable)
    const orchestrator = getFallbackOrchestrator();
    const aiResponse = await orchestrator.generateResponse(
      `${promptStructure.system}\n\n${promptStructure.user}`,
      { language },
      { endpoint: '/api/explain', userId }
    );
    
    if (!aiResponse.success) {
      // Graceful degradation: return deterministic value without AI explanation
      logger.warn('AI unavailable, returning deterministic value only', {
        userId,
        sessionId,
        metric,
        error: aiResponse.error,
      });
      return NextResponse.json({
        success: true,
        explanation: {
          success: false,
          content: 'AI explanation temporarily unavailable. Your calculated metrics are accurate.',
        },
        metric,
        value,
      });
    }
    
    logger.info('Explanation completed successfully', { userId, sessionId, metric });
    
    return NextResponse.json({
      success: true,
      explanation: {
        success: true,
        content: aiResponse.content,
      },
      metric,
      value,
    });
    
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
