// API Route: Explain Stress & Affordability Indices
// Provides AI-powered explanations of pre-calculated index values
// CRITICAL: AI only explains, never calculates

import { NextRequest, NextResponse } from 'next/server';
import { buildIndexExplanationPrompt } from '@/lib/ai/prompt-builder';
import { invokeBedrockModel } from '@/lib/bedrock-client';
import { PersonaContext } from '@/lib/ai/types';
import { logger } from '@/lib/logger';
import { getErrorMessage } from '@/lib/translations';

/**
 * POST /api/indices/explain
 * 
 * Request body:
 * {
 *   stressIndex?: { score, breakdown, inputParameters },
 *   affordabilityIndex?: { score, breakdown, inputParameters },
 *   userProfile: { business_type, city_tier, explanation_mode },
 *   language: 'en' | 'hi' | 'mr'
 * }
 * 
 * Response:
 * {
 *   success: true,
 *   explanation: string,
 *   stressIndex?: { ... },
 *   affordabilityIndex?: { ... }
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { stressIndex, affordabilityIndex, userProfile, language = 'en' } = body;

    // Validate required fields
    if (!stressIndex && !affordabilityIndex) {
      logger.warn('Index explanation request missing both indices');
      return NextResponse.json(
        {
          success: false,
          code: 'MISSING_INDEX_DATA',
          message: getErrorMessage('MISSING_INDEX_DATA', language),
        },
        { status: 400 }
      );
    }

    if (!userProfile) {
      logger.warn('Index explanation request missing user profile');
      return NextResponse.json(
        {
          success: false,
          code: 'MISSING_USER_PROFILE',
          message: getErrorMessage('MISSING_USER_PROFILE', language),
        },
        { status: 400 }
      );
    }

    // Build persona context
    const personaContext: PersonaContext = {
      business_type: userProfile.business_type || 'other',
      city_tier: userProfile.city_tier || null,
      explanation_mode: userProfile.explanation_mode || 'simple',
      language: language as 'en' | 'hi' | 'mr',
    };

    // Build prompt with index data
    const prompt = buildIndexExplanationPrompt(personaContext, {
      stressIndex,
      affordabilityIndex,
    });

    // Combine system and user prompts
    const fullPrompt = `${prompt.system}\n\n${prompt.user}`;

    logger.info('Invoking AI for index explanation', {
      has_stress_index: !!stressIndex,
      has_affordability_index: !!affordabilityIndex,
      business_type: personaContext.business_type,
      language,
    });

    // Invoke Bedrock model
    const aiResponse = await invokeBedrockModel(fullPrompt, 2, language);

    if (!aiResponse.success) {
      logger.error('AI invocation failed for index explanation', {
        error: aiResponse.error,
        error_type: aiResponse.errorType,
      });

      // Return fallback explanation
      const fallbackMessage = getFallbackExplanation(language, stressIndex, affordabilityIndex);

      return NextResponse.json({
        success: true,
        explanation: fallbackMessage,
        stressIndex,
        affordabilityIndex,
        fallback: true,
      });
    }

    logger.info('AI explanation generated successfully');

    // Return successful response with original index data
    return NextResponse.json({
      success: true,
      explanation: aiResponse.content,
      stressIndex,
      affordabilityIndex,
    });

  } catch (error: any) {
    logger.error('Error in index explanation endpoint', {
      error: error.message,
      stack: error.stack,
    });

    return NextResponse.json(
      {
        success: false,
        code: 'INTERNAL_ERROR',
        message: getErrorMessage('INTERNAL_ERROR', 'en'),
      },
      { status: 500 }
    );
  }
}

/**
 * Generate fallback explanation when AI service is unavailable
 * Uses deterministic rules based on index scores
 */
function getFallbackExplanation(
  language: string,
  stressIndex?: any,
  affordabilityIndex?: any
): string {
  let explanation = '';

  if (language === 'hi') {
    if (stressIndex) {
      const score = stressIndex.score;
      if (score >= 67) {
        explanation += '⚠️ आपका तनाव सूचकांक उच्च है। अपने उधार को कम करने और नकद भंडार बढ़ाने पर ध्यान दें।\n\n';
      } else if (score >= 34) {
        explanation += '⚡ आपका तनाव सूचकांक मध्यम है। अपने खर्चों की निगरानी करें और नकदी प्रवाह में सुधार करें।\n\n';
      } else {
        explanation += '✅ आपका तनाव सूचकांक स्वस्थ है। अच्छा काम जारी रखें!\n\n';
      }
    }

    if (affordabilityIndex) {
      const score = affordabilityIndex.score;
      if (score >= 70) {
        explanation += '✅ यह खर्च आपके लिए सस्ती है।';
      } else if (score >= 50) {
        explanation += '⚡ यह खर्च संभव है लेकिन सावधानी से योजना बनाएं।';
      } else {
        explanation += '⚠️ यह खर्च जोखिम भरा है। विकल्पों पर विचार करें।';
      }
    }
  } else if (language === 'mr') {
    if (stressIndex) {
      const score = stressIndex.score;
      if (score >= 67) {
        explanation += '⚠️ तुमचा तणाव निर्देशांक उच्च आहे. तुमचे कर्ज कमी करा आणि रोख साठा वाढवा.\n\n';
      } else if (score >= 34) {
        explanation += '⚡ तुमचा तणाव निर्देशांक मध्यम आहे. तुमच्या खर्चाचे निरीक्षण करा आणि रोख प्रवाह सुधारा.\n\n';
      } else {
        explanation += '✅ तुमचा तणाव निर्देशांक निरोगी आहे. चांगले काम चालू ठेवा!\n\n';
      }
    }

    if (affordabilityIndex) {
      const score = affordabilityIndex.score;
      if (score >= 70) {
        explanation += '✅ हा खर्च तुमच्यासाठी परवडणारा आहे.';
      } else if (score >= 50) {
        explanation += '⚡ हा खर्च शक्य आहे पण काळजीपूर्वक योजना करा.';
      } else {
        explanation += '⚠️ हा खर्च जोखमीचा आहे. पर्यायांचा विचार करा.';
      }
    }
  } else {
    if (stressIndex) {
      const score = stressIndex.score;
      if (score >= 67) {
        explanation += '⚠️ Your stress index is high. Focus on reducing credit exposure and building cash reserves.\n\n';
      } else if (score >= 34) {
        explanation += '⚡ Your stress index is moderate. Monitor your expenses and improve cash flow.\n\n';
      } else {
        explanation += '✅ Your stress index is healthy. Keep up the good work!\n\n';
      }
    }

    if (affordabilityIndex) {
      const score = affordabilityIndex.score;
      if (score >= 70) {
        explanation += '✅ This expense is affordable for you.';
      } else if (score >= 50) {
        explanation += '⚡ This expense is possible but plan carefully.';
      } else {
        explanation += '⚠️ This expense is risky. Consider alternatives.';
      }
    }
  }

  return explanation || 'Unable to generate explanation at this time.';
}
