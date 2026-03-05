// Persona-Aware AI Prompt Builder
// Centralized prompt construction with business-specific personalization

import { PersonaContext, PromptStructure, PromptType } from './types';
import {
  PERSONA_IDENTITIES,
  BUSINESS_CONTEXTS,
  CITY_TIER_CONTEXTS,
  EXPLANATION_MODE_INSTRUCTIONS,
  AI_INTERPRETATION_INSTRUCTIONS,
} from './templates';
import { logger } from '@/lib/logger';

/**
 * Build persona-aware prompt for AI requests
 * @param context - Persona context (business type, city tier, explanation mode, language)
 * @param promptType - Type of prompt (explain, analyze, ask)
 * @param data - Data to include in the prompt (metrics, question, etc.)
 * @returns Structured prompt with system and user messages
 */
export function buildPersonaPrompt(
  context: PersonaContext,
  promptType: PromptType,
  data: {
    metric?: string;
    value?: number;
    calculatedMetrics?: Record<string, number>;
    question?: string;
    [key: string]: any;
  }
): PromptStructure {
  // Log persona context (structured)
  logger.info('Building persona-aware prompt', {
    persona_context: {
      business_type: context.business_type,
      city_tier: context.city_tier,
      explanation_mode: context.explanation_mode,
    },
    prompt_type: promptType,
  });

  // Build system prompt
  let systemPrompt = '';

  // 1. Persona identity
  systemPrompt += PERSONA_IDENTITIES[context.business_type][context.language] + '\n\n';

  // 2. Business context
  systemPrompt += BUSINESS_CONTEXTS[context.business_type][context.language] + '\n\n';

  // 3. Location context (if provided)
  if (context.city_tier) {
    systemPrompt += CITY_TIER_CONTEXTS[context.city_tier][context.language] + '\n\n';
  }

  // 4. AI interpretation layer instructions
  systemPrompt += AI_INTERPRETATION_INSTRUCTIONS[context.language] + '\n\n';

  // 5. Explanation mode instructions
  systemPrompt += EXPLANATION_MODE_INSTRUCTIONS[context.explanation_mode][context.language] + '\n\n';

  // Build user prompt based on type
  let userPrompt = '';

  switch (promptType) {
    case 'explain':
      userPrompt = buildExplainPrompt(data, context.language);
      break;
    case 'analyze':
      userPrompt = buildAnalyzePrompt(data, context.language);
      break;
    case 'ask':
      userPrompt = buildAskPrompt(data, context.language);
      break;
  }

  return {
    system: systemPrompt,
    user: userPrompt,
    metadata: {
      business_type: context.business_type,
      city_tier: context.city_tier,
      explanation_mode: context.explanation_mode,
      prompt_type: promptType,
    },
  };
}

/**
 * Build prompt for explaining a specific metric
 */
export function buildExplainPrompt(data: any, language: string): string {
  const { metric, value, calculatedMetrics } = data;

  let prompt = '';

  if (language === 'hi') {
    prompt = `कृपया निम्नलिखित मेट्रिक की व्याख्या करें:\n\n`;
    if (metric && value !== undefined) {
      prompt += `${metric}: ${value}\n\n`;
    }
    if (calculatedMetrics) {
      prompt += formatMetricsForPrompt(calculatedMetrics);
    }
  } else if (language === 'mr') {
    prompt = `कृपया खालील मेट्रिकचे स्पष्टीकरण द्या:\n\n`;
    if (metric && value !== undefined) {
      prompt += `${metric}: ${value}\n\n`;
    }
    if (calculatedMetrics) {
      prompt += formatMetricsForPrompt(calculatedMetrics);
    }
  } else {
    prompt = `Please explain the following metric:\n\n`;
    if (metric && value !== undefined) {
      prompt += `${metric}: ${value}\n\n`;
    }
    if (calculatedMetrics) {
      prompt += formatMetricsForPrompt(calculatedMetrics);
    }
  }

  return prompt;
}

/**
 * Build prompt for analyzing business data
 */
export function buildAnalyzePrompt(data: any, language: string): string {
  const { calculatedMetrics } = data;

  let prompt = '';

  if (language === 'hi') {
    prompt = `कृपया निम्नलिखित व्यवसाय मेट्रिक्स का विश्लेषण करें:\n\n`;
    if (calculatedMetrics) {
      prompt += formatMetricsForPrompt(calculatedMetrics);
    }
  } else if (language === 'mr') {
    prompt = `कृपया खालील व्यवसाय मेट्रिक्सचे विश्लेषण करा:\n\n`;
    if (calculatedMetrics) {
      prompt += formatMetricsForPrompt(calculatedMetrics);
    }
  } else {
    prompt = `Please analyze the following business metrics:\n\n`;
    if (calculatedMetrics) {
      prompt += formatMetricsForPrompt(calculatedMetrics);
    }
  }

  return prompt;
}

/**
 * Build prompt for answering a question
 */
export function buildAskPrompt(data: any, language: string): string {
  const { question, calculatedMetrics } = data;

  let prompt = '';

  if (language === 'hi') {
    prompt = `प्रश्न: ${question}\n\n`;
    if (calculatedMetrics) {
      prompt += `संदर्भ मेट्रिक्स:\n`;
      prompt += formatMetricsForPrompt(calculatedMetrics);
    }
  } else if (language === 'mr') {
    prompt = `प्रश्न: ${question}\n\n`;
    if (calculatedMetrics) {
      prompt += `संदर्भ मेट्रिक्स:\n`;
      prompt += formatMetricsForPrompt(calculatedMetrics);
    }
  } else {
    prompt = `Question: ${question}\n\n`;
    if (calculatedMetrics) {
      prompt += `Context metrics:\n`;
      prompt += formatMetricsForPrompt(calculatedMetrics);
    }
  }

  return prompt;
}

/**
 * Format calculated metrics as bullet list
 */
export function formatMetricsForPrompt(metrics: Record<string, number>): string {
  let formatted = '';
  for (const [key, value] of Object.entries(metrics)) {
    formatted += `- ${key}: ${value}\n`;
  }
  return formatted;
}
