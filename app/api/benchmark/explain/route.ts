// Benchmark Explanation API Route
// Gets AI explanation for benchmark comparison results
// CRITICAL: AI explains pre-calculated values, does NOT recalculate

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
import { getFallbackOrchestrator } from '@/lib/ai/fallback-orchestrator';
import { Language, BenchmarkComparison } from '@/lib/types';
import { logger } from '@/lib/logger';
import { ProfileService } from '@/lib/dynamodb-client';
import { buildBenchmarkExplanationPrompt } from '@/lib/ai/benchmarkPromptBuilder';
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
    logger.info('Benchmark explanation request received', {
      path: '/api/benchmark/explain'
    });

    // Validate body size (1MB limit for AI endpoints)
    const bodyCheck = await checkBodySize(request, BODY_SIZE_LIMITS.AI);
    if ('error' in bodyCheck) {
      return NextResponse.json(bodyCheck.error, { status: 413 });
    }

    const body = JSON.parse(bodyCheck.bodyText);
    const { userId, comparison, language: requestLanguage } = body;
    
    // Set language from request
    if (requestLanguage) {
      language = requestLanguage;
    }
    
    // Validate inputs
    if (!userId || !comparison) {
      logger.warn('Missing required fields in benchmark explanation request', { 
        userId: !!userId, 
        comparison: !!comparison
      });
      return NextResponse.json(
        createErrorResponse(ErrorCode.INVALID_INPUT, 'errors.invalidInput', language),
        { status: 400 }
      );
    }
    
    // Validate comparison structure
    if (!comparison.healthScoreComparison || !comparison.marginComparison || !comparison.segmentInfo) {
      logger.warn('Invalid comparison structure', { userId });
      return NextResponse.json(
        createErrorResponse(ErrorCode.INVALID_INPUT, 'errors.invalidInput', language),
        { status: 400 }
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
    // Use language from request (current UI language) instead of profile language
    const personaContext: PersonaContext = {
      business_type: profile.business_type as 'kirana' | 'salon' | 'pharmacy' | 'restaurant' | 'other',
      city_tier: profile.city_tier as 'tier-1' | 'tier-2' | 'tier-3' | 'rural' | undefined,
      explanation_mode: profile.explanation_mode as 'simple' | 'detailed',
      language: language, // Use current request language, not profile language
    };
    
    // Build benchmark explanation prompt
    const promptStructure = buildBenchmarkExplanationPrompt(
      comparison as BenchmarkComparison,
      personaContext
    );
    
    // Log persona context
    logger.info('Building benchmark explanation', {
      userId,
      persona_context: {
        business_type: personaContext.business_type,
        city_tier: personaContext.city_tier,
        explanation_mode: personaContext.explanation_mode,
      },
      comparison_summary: {
        health_category: comparison.healthScoreComparison.category,
        margin_category: comparison.marginComparison.category,
      },
    });
    
    // Call AI for explanation only (graceful degradation if AI unavailable)
    const orchestrator = getFallbackOrchestrator();
    const aiResponse = await orchestrator.generateResponse(
      `${promptStructure.system}\n\n${promptStructure.user}`,
      { language },
      { endpoint: '/api/benchmark/explain', userId }
    );
    
    if (!aiResponse.success) {
      // Graceful degradation: return success but indicate AI unavailable
      logger.warn('AI unavailable for benchmark explanation', {
        userId,
        error: aiResponse.error,
      });
      return NextResponse.json({
        success: true,
        explanation: null,
        message: 'AI explanation temporarily unavailable. Your comparison results are accurate.',
      });
    }
    
    logger.info('Benchmark explanation completed successfully', { userId });
    
    // Strip markdown formatting from AI response
    const cleanedExplanation = stripMarkdownFormatting(aiResponse.content || '');
    
    return NextResponse.json({
      success: true,
      explanation: cleanedExplanation,
    });
    
  } catch (error) {
    return NextResponse.json(
      logAndReturnError(
        error as Error,
        ErrorCode.SERVER_ERROR,
        'errors.serverError',
        language,
        { path: '/api/benchmark/explain' }
      ),
      { status: 500 }
    );
  }
}
