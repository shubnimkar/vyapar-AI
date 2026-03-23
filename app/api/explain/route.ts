// Explain API Route
// Gets AI explanation for deterministic results
// AI explains, does NOT calculate

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

  // Clean up extra whitespace
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n').trim();

  return cleaned;
}

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
    const { sessionId, userId, metric, value, context, predictions, language: requestLanguage } = body;

    // Set language from request
    if (requestLanguage) {
      language = requestLanguage;
    }

    // Validate inputs - cashflowPrediction doesn't need sessionId or value
    const isCashflowPrediction = metric === 'cashflowPrediction';

    if (!metric) {
      logger.warn('Missing metric in explain request');
      return NextResponse.json(
        createErrorResponse(ErrorCode.INVALID_INPUT, 'errors.invalidInput', language),
        { status: 400 }
      );
    }

    if (!isCashflowPrediction && (!sessionId || value === undefined)) {
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

    if (isCashflowPrediction && !predictions) {
      logger.warn('Missing predictions for cashflow explanation');
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

    // Get session (not required for cashflow predictions)
    if (!isCashflowPrediction) {
      const session = await getSession(sessionId);
      if (!session) {
        logger.warn('Session not found', { sessionId });
        return NextResponse.json(
          createErrorResponse(ErrorCode.NOT_FOUND, 'errors.notFound', language),
          { status: 404 }
        );
      }
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
    // IMPORTANT: use the language from the request body (current UI language),
    // NOT profile.language which may be stale or different from the user's selected language
    const personaContext: PersonaContext = {
      business_type: profile.business_type as 'kirana' | 'salon' | 'pharmacy' | 'restaurant' | 'other',
      city_tier: profile.city_tier as 'tier-1' | 'tier-2' | 'tier-3' | 'rural' | undefined,
      explanation_mode: profile.explanation_mode as 'simple' | 'detailed',
      language: (language || profile.language) as Language,
    };

    // Build persona-aware prompt
    const promptData = isCashflowPrediction
      ? {
        metric,
        predictions,
        historicalDays: predictions?.length || 0,
      }
      : {
        metric,
        value,
        calculatedMetrics: context?.breakdown ?? context ?? {},
      };

    const promptStructure = buildPersonaPrompt(personaContext, 'explain', promptData);

    // Log persona context
    logger.info('Building persona-aware explanation', {
      userId,
      sessionId: sessionId || 'N/A',
      metric,
      persona_context: {
        business_type: personaContext.business_type,
        city_tier: personaContext.city_tier,
        explanation_mode: personaContext.explanation_mode,
      },
    });

    // Call AI for explanation only (graceful degradation if AI unavailable)
    const orchestrator = getFallbackOrchestrator('explain');
    const aiResponse = await orchestrator.generateResponse(
      `${promptStructure.system}\n\n${promptStructure.user}`,
      { language },
      { endpoint: '/api/explain', userId }
    );

    if (!aiResponse.success) {
      // Graceful degradation: return deterministic value without AI explanation
      logger.warn('AI unavailable, returning deterministic value only', {
        userId,
        sessionId: sessionId || 'N/A',
        metric,
        error: aiResponse.error,
      });
      return NextResponse.json({
        success: true,
        explanation: 'AI explanation temporarily unavailable.', // Flat string
        metric,
        value: value || null,
      });
    }

    logger.info('Explanation completed successfully', { userId, sessionId: sessionId || 'N/A', metric });

    // Strip markdown formatting from AI response
    const cleanedExplanation = stripMarkdownFormatting(aiResponse.content || '');

    // Return flat structure for consistency with other endpoints
    return NextResponse.json({
      success: true,
      explanation: cleanedExplanation, // Flat string, not nested object
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
