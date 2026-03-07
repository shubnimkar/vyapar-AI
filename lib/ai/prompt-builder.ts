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

/**
 * Build prompt for explaining stress and affordability indices
 * CRITICAL: AI must ONLY explain pre-calculated values, NEVER recalculate
 */
export function buildIndexExplanationPrompt(
  context: PersonaContext,
  data: {
    stressIndex?: {
      score: number;
      breakdown: {
        creditRatioScore: number;
        cashBufferScore: number;
        expenseVolatilityScore: number;
      };
      inputParameters: {
        creditRatio: number;
        cashBuffer: number;
        expenseVolatility: number;
      };
    };
    affordabilityIndex?: {
      score: number;
      breakdown: {
        costToProfitRatio: number;
        affordabilityCategory: string;
      };
      inputParameters: {
        plannedCost: number;
        avgMonthlyProfit: number;
      };
    };
  }
): PromptStructure {
  // Log index explanation request
  logger.info('Building index explanation prompt', {
    persona_context: {
      business_type: context.business_type,
      city_tier: context.city_tier,
      explanation_mode: context.explanation_mode,
    },
    has_stress_index: !!data.stressIndex,
    has_affordability_index: !!data.affordabilityIndex,
  });

  // Build system prompt with persona context
  let systemPrompt = '';

  // 1. Persona identity
  systemPrompt += PERSONA_IDENTITIES[context.business_type][context.language] + '\n\n';

  // 2. Business context
  systemPrompt += BUSINESS_CONTEXTS[context.business_type][context.language] + '\n\n';

  // 3. Location context (if provided)
  if (context.city_tier) {
    systemPrompt += CITY_TIER_CONTEXTS[context.city_tier][context.language] + '\n\n';
  }

  // 4. AI interpretation layer instructions (CRITICAL)
  systemPrompt += AI_INTERPRETATION_INSTRUCTIONS[context.language] + '\n\n';

  // 5. Explanation mode instructions
  systemPrompt += EXPLANATION_MODE_INSTRUCTIONS[context.explanation_mode][context.language] + '\n\n';

  // Build user prompt with index data
  let userPrompt = '';

  if (context.language === 'hi') {
    userPrompt = 'कृपया निम्नलिखित वित्तीय स्वास्थ्य संकेतकों की व्याख्या करें:\n\n';
  } else if (context.language === 'mr') {
    userPrompt = 'कृपया खालील आर्थिक आरोग्य निर्देशकांचे स्पष्टीकरण द्या:\n\n';
  } else {
    userPrompt = 'Please explain the following financial health indicators:\n\n';
  }

  // Add stress index data
  if (data.stressIndex) {
    const { score, breakdown, inputParameters } = data.stressIndex;
    
    if (context.language === 'hi') {
      userPrompt += `**तनाव सूचकांक (Stress Index)**: ${score}/100\n`;
      userPrompt += `घटक विवरण:\n`;
      userPrompt += `- क्रेडिट अनुपात स्कोर: ${breakdown.creditRatioScore}/40 (क्रेडिट अनुपात: ${inputParameters.creditRatio.toFixed(2)})\n`;
      userPrompt += `- नकद बफर स्कोर: ${breakdown.cashBufferScore}/35 (नकद बफर: ${inputParameters.cashBuffer.toFixed(2)})\n`;
      userPrompt += `- व्यय अस्थिरता स्कोर: ${breakdown.expenseVolatilityScore}/25 (अस्थिरता: ${inputParameters.expenseVolatility.toFixed(2)})\n\n`;
    } else if (context.language === 'mr') {
      userPrompt += `**तणाव निर्देशांक (Stress Index)**: ${score}/100\n`;
      userPrompt += `घटक तपशील:\n`;
      userPrompt += `- क्रेडिट गुणोत्तर स्कोअर: ${breakdown.creditRatioScore}/40 (क्रेडिट गुणोत्तर: ${inputParameters.creditRatio.toFixed(2)})\n`;
      userPrompt += `- रोख बफर स्कोअर: ${breakdown.cashBufferScore}/35 (रोख बफर: ${inputParameters.cashBuffer.toFixed(2)})\n`;
      userPrompt += `- खर्च अस्थिरता स्कोअर: ${breakdown.expenseVolatilityScore}/25 (अस्थिरता: ${inputParameters.expenseVolatility.toFixed(2)})\n\n`;
    } else {
      userPrompt += `**Stress Index**: ${score}/100\n`;
      userPrompt += `Component Breakdown:\n`;
      userPrompt += `- Credit Ratio Score: ${breakdown.creditRatioScore}/40 (Credit Ratio: ${inputParameters.creditRatio.toFixed(2)})\n`;
      userPrompt += `- Cash Buffer Score: ${breakdown.cashBufferScore}/35 (Cash Buffer: ${inputParameters.cashBuffer.toFixed(2)})\n`;
      userPrompt += `- Expense Volatility Score: ${breakdown.expenseVolatilityScore}/25 (Volatility: ${inputParameters.expenseVolatility.toFixed(2)})\n\n`;
    }
  }

  // Add affordability index data
  if (data.affordabilityIndex) {
    const { score, breakdown, inputParameters } = data.affordabilityIndex;
    
    if (context.language === 'hi') {
      userPrompt += `**सामर्थ्य सूचकांक (Affordability Index)**: ${score}/100\n`;
      userPrompt += `श्रेणी: ${breakdown.affordabilityCategory}\n`;
      userPrompt += `लागत-से-लाभ अनुपात: ${breakdown.costToProfitRatio.toFixed(2)}\n`;
      userPrompt += `योजनाबद्ध लागत: ₹${inputParameters.plannedCost}\n`;
      userPrompt += `औसत मासिक लाभ: ₹${inputParameters.avgMonthlyProfit}\n\n`;
    } else if (context.language === 'mr') {
      userPrompt += `**परवडणारा निर्देशांक (Affordability Index)**: ${score}/100\n`;
      userPrompt += `श्रेणी: ${breakdown.affordabilityCategory}\n`;
      userPrompt += `खर्च-ते-नफा गुणोत्तर: ${breakdown.costToProfitRatio.toFixed(2)}\n`;
      userPrompt += `नियोजित खर्च: ₹${inputParameters.plannedCost}\n`;
      userPrompt += `सरासरी मासिक नफा: ₹${inputParameters.avgMonthlyProfit}\n\n`;
    } else {
      userPrompt += `**Affordability Index**: ${score}/100\n`;
      userPrompt += `Category: ${breakdown.affordabilityCategory}\n`;
      userPrompt += `Cost-to-Profit Ratio: ${breakdown.costToProfitRatio.toFixed(2)}\n`;
      userPrompt += `Planned Cost: ₹${inputParameters.plannedCost}\n`;
      userPrompt += `Average Monthly Profit: ₹${inputParameters.avgMonthlyProfit}\n\n`;
    }
  }

  // Add instruction to explain implications
  if (context.language === 'hi') {
    userPrompt += 'इन संकेतकों का मेरे व्यवसाय के लिए क्या मतलब है और मुझे क्या कार्रवाई करनी चाहिए?';
  } else if (context.language === 'mr') {
    userPrompt += 'या निर्देशकांचा माझ्या व्यवसायासाठी काय अर्थ आहे आणि मी कोणती कृती करावी?';
  } else {
    userPrompt += 'What do these indicators mean for my business and what actions should I take?';
  }

  return {
    system: systemPrompt,
    user: userPrompt,
    metadata: {
      business_type: context.business_type,
      city_tier: context.city_tier,
      explanation_mode: context.explanation_mode,
      prompt_type: 'index_explanation',
    },
  };
}
