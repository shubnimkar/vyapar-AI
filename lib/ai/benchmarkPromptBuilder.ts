// Benchmark Explanation Prompt Builder
// Builds persona-aware prompts for explaining segment benchmark comparisons
// CRITICAL: AI must ONLY explain pre-calculated values, NEVER recalculate

import { PersonaContext, PromptStructure } from './types';
import {
  PERSONA_IDENTITIES,
  BUSINESS_CONTEXTS,
  CITY_TIER_CONTEXTS,
  EXPLANATION_MODE_INSTRUCTIONS,
  AI_INTERPRETATION_INSTRUCTIONS,
  LANGUAGE_INSTRUCTIONS,
} from './templates';
import { logger } from '@/lib/logger';
import type { BenchmarkComparison } from '@/lib/types';

/**
 * Build AI prompt for benchmark explanation
 * 
 * CRITICAL RULES:
 * - AI receives pre-calculated comparison values
 * - AI must NEVER recalculate percentiles or categories
 * - AI provides interpretation and actionable advice only
 * - Prompt includes persona context (business_type, city_tier)
 * - Respects explanation_mode (simple/detailed)
 * - Supports multi-language (English, Hindi, Marathi)
 * 
 * @param comparison - Pre-calculated benchmark comparison results
 * @param context - Persona context (business type, city tier, explanation mode, language)
 * @returns Structured prompt with system and user messages
 */
export function buildBenchmarkExplanationPrompt(
  comparison: BenchmarkComparison,
  context: PersonaContext
): PromptStructure {
  // Log benchmark explanation request
  logger.info('Building benchmark explanation prompt', {
    persona_context: {
      business_type: context.business_type,
      city_tier: context.city_tier,
      explanation_mode: context.explanation_mode,
      language: context.language,
    },
    comparison_data: {
      health_category: comparison.healthScoreComparison.category,
      margin_category: comparison.marginComparison.category,
      sample_size: comparison.segmentInfo.sampleSize,
    },
  });

  // Build system prompt with persona context
  let systemPrompt = '';

  // 0. LANGUAGE INSTRUCTION (MUST BE FIRST AND MOST PROMINENT)
  systemPrompt += LANGUAGE_INSTRUCTIONS[context.language] + '\n\n';

  // 1. Persona identity
  systemPrompt += PERSONA_IDENTITIES[context.business_type][context.language] + '\n\n';

  // 2. Business context
  systemPrompt += BUSINESS_CONTEXTS[context.business_type][context.language] + '\n\n';

  // 3. Location context (if provided)
  if (context.city_tier && CITY_TIER_CONTEXTS[context.city_tier]) {
    systemPrompt += CITY_TIER_CONTEXTS[context.city_tier][context.language] + '\n\n';
  }

  // 4. AI interpretation layer instructions (CRITICAL)
  systemPrompt += AI_INTERPRETATION_INSTRUCTIONS[context.language] + '\n\n';

  // 5. Explanation mode instructions
  systemPrompt += EXPLANATION_MODE_INSTRUCTIONS[context.explanation_mode][context.language] + '\n\n';

  // Build user prompt with benchmark comparison data
  const userPrompt = buildBenchmarkUserPrompt(comparison, context);

  return {
    system: systemPrompt,
    user: userPrompt,
    metadata: {
      business_type: context.business_type,
      city_tier: context.city_tier || undefined,
      explanation_mode: context.explanation_mode,
      prompt_type: 'benchmark_explanation',
    },
  };
}

/**
 * Build user prompt with benchmark comparison data
 */
function buildBenchmarkUserPrompt(
  comparison: BenchmarkComparison,
  context: PersonaContext
): string {
  const { language } = context;
  const { healthScoreComparison, marginComparison, segmentInfo } = comparison;

  let prompt = '';

  // Introduction
  if (language === 'hi') {
    prompt += 'कृपया निम्नलिखित बेंचमार्क तुलना की व्याख्या करें:\n\n';
  } else if (language === 'mr') {
    prompt += 'कृपया खालील बेंचमार्क तुलनेचे स्पष्टीकरण द्या:\n\n';
  } else {
    prompt += 'Please explain the following benchmark comparison:\n\n';
  }

  // Health Score Comparison
  if (language === 'hi') {
    prompt += `**स्वास्थ्य स्कोर (Health Score)**\n`;
    prompt += `- आपका स्कोर: ${healthScoreComparison.userValue}/100\n`;
    prompt += `- समान व्यापारों का औसत: ${healthScoreComparison.segmentMedian}/100\n`;
    prompt += `- आपकी स्थिति: ${getCategoryLabel(healthScoreComparison.category, language)}\n`;
    prompt += `- प्रतिशतक रैंक: ${healthScoreComparison.percentile.toFixed(0)}वां\n\n`;
  } else if (language === 'mr') {
    prompt += `**आरोग्य स्कोअर (Health Score)**\n`;
    prompt += `- तुमचा स्कोअर: ${healthScoreComparison.userValue}/100\n`;
    prompt += `- समान व्यवसायांची सरासरी: ${healthScoreComparison.segmentMedian}/100\n`;
    prompt += `- तुमची स्थिती: ${getCategoryLabel(healthScoreComparison.category, language)}\n`;
    prompt += `- टक्केवारी रँक: ${healthScoreComparison.percentile.toFixed(0)}वा\n\n`;
  } else {
    prompt += `**Health Score**\n`;
    prompt += `- Your Score: ${healthScoreComparison.userValue}/100\n`;
    prompt += `- Similar Businesses Average: ${healthScoreComparison.segmentMedian}/100\n`;
    prompt += `- Your Position: ${getCategoryLabel(healthScoreComparison.category, language)}\n`;
    prompt += `- Percentile Rank: ${healthScoreComparison.percentile.toFixed(0)}th\n\n`;
  }

  // Profit Margin Comparison
  if (language === 'hi') {
    prompt += `**लाभ मार्जिन (Profit Margin)**\n`;
    prompt += `- आपका मार्जिन: ${(marginComparison.userValue * 100).toFixed(1)}%\n`;
    prompt += `- समान व्यापारों का औसत: ${(marginComparison.segmentMedian * 100).toFixed(1)}%\n`;
    prompt += `- आपकी स्थिति: ${getCategoryLabel(marginComparison.category, language)}\n`;
    prompt += `- प्रतिशतक रैंक: ${marginComparison.percentile.toFixed(0)}वां\n\n`;
  } else if (language === 'mr') {
    prompt += `**नफा मार्जिन (Profit Margin)**\n`;
    prompt += `- तुमचा मार्जिन: ${(marginComparison.userValue * 100).toFixed(1)}%\n`;
    prompt += `- समान व्यवसायांची सरासरी: ${(marginComparison.segmentMedian * 100).toFixed(1)}%\n`;
    prompt += `- तुमची स्थिती: ${getCategoryLabel(marginComparison.category, language)}\n`;
    prompt += `- टक्केवारी रँक: ${marginComparison.percentile.toFixed(0)}वा\n\n`;
  } else {
    prompt += `**Profit Margin**\n`;
    prompt += `- Your Margin: ${(marginComparison.userValue * 100).toFixed(1)}%\n`;
    prompt += `- Similar Businesses Average: ${(marginComparison.segmentMedian * 100).toFixed(1)}%\n`;
    prompt += `- Your Position: ${getCategoryLabel(marginComparison.category, language)}\n`;
    prompt += `- Percentile Rank: ${marginComparison.percentile.toFixed(0)}th\n\n`;
  }

  // Sample Size Context
  if (language === 'hi') {
    prompt += `यह तुलना ${segmentInfo.sampleSize} समान व्यापारों के आधार पर है।\n\n`;
  } else if (language === 'mr') {
    prompt += `ही तुलना ${segmentInfo.sampleSize} समान व्यवसायांवर आधारित आहे।\n\n`;
  } else {
    prompt += `This comparison is based on ${segmentInfo.sampleSize} similar businesses.\n\n`;
  }

  // Add guidance based on performance categories
  prompt += buildGuidancePrompt(
    healthScoreComparison.category,
    marginComparison.category,
    language,
    context.city_tier,
    healthScoreComparison.percentile
  );

  return prompt;
}

/**
 * Build guidance prompt based on performance categories
 */
function buildGuidancePrompt(
  healthCategory: string,
  marginCategory: string,
  language: string,
  cityTier?: string,
  healthPercentile?: number
): string {
  let guidance = '';

  // Determine overall performance
  const isBelowAverage = healthCategory === 'below_average' || marginCategory === 'below_average';
  const isAboveAverage = healthCategory === 'above_average' && marginCategory === 'above_average';

  if (language === 'hi') {
    guidance += '**आपके लिए सुझाव:**\n\n';
    
    // Add city tier context if available
    if (cityTier) {
      guidance += `आप ${getCityTierLabel(cityTier, language)} में काम कर रहे हैं। `;
    }
    
    // Add percentile explanation for very low scores
    if (healthPercentile !== undefined && healthPercentile < 25) {
      guidance += `आपका प्रतिशतक रैंक ${healthPercentile.toFixed(0)} का मतलब है कि ${(100 - healthPercentile).toFixed(0)}% समान व्यवसाय आपसे बेहतर प्रदर्शन कर रहे हैं। `;
    }
    
    if (isBelowAverage) {
      guidance += 'कृपया 2-3 व्यावहारिक सुझाव दें जो मेरे प्रदर्शन को बेहतर बनाने में मदद करें। ';
      guidance += 'सुझाव सरल और तुरंत लागू करने योग्य होने चाहिए।\n\n';
      guidance += 'महत्वपूर्ण: सामान्य टेम्पलेट या शीर्षक का उपयोग न करें। सीधे सुझावों से शुरू करें।';
    } else if (isAboveAverage) {
      guidance += 'कृपया प्रोत्साहन दें और बताएं कि मैं इस अच्छे प्रदर्शन को कैसे बनाए रख सकता हूं। ';
      guidance += '2-3 टिप्स दें जो मुझे इस स्तर पर बनाए रखने में मदद करें।\n\n';
      guidance += 'महत्वपूर्ण: सामान्य टेम्पलेट या शीर्षक का उपयोग न करें। सीधे सलाह से शुरू करें।';
    } else {
      guidance += 'कृपया 2-3 अनुकूलन अवसर सुझाएं जो मुझे औसत से ऊपर जाने में मदद कर सकें।\n\n';
      guidance += 'महत्वपूर्ण: सामान्य टेम्पलेट या शीर्षक का उपयोग न करें। सीधे सुझावों से शुरू करें।';
    }
  } else if (language === 'mr') {
    guidance += '**तुमच्यासाठी सूचना:**\n\n';
    
    // Add city tier context if available
    if (cityTier) {
      guidance += `तुम्ही ${getCityTierLabel(cityTier, language)} मध्ये काम करत आहात. `;
    }
    
    // Add percentile explanation for very low scores
    if (healthPercentile !== undefined && healthPercentile < 25) {
      guidance += `तुमची टक्केवारी रँक ${healthPercentile.toFixed(0)} याचा अर्थ ${(100 - healthPercentile).toFixed(0)}% समान व्यवसाय तुमच्यापेक्षा चांगले काम करत आहेत. `;
    }
    
    if (isBelowAverage) {
      guidance += 'कृपया 2-3 व्यावहारिक सूचना द्या ज्या माझ्या कामगिरीत सुधारणा करण्यास मदत करतील। ';
      guidance += 'सूचना सोप्या आणि लगेच लागू करण्यायोग्य असाव्यात।\n\n';
      guidance += 'महत्त्वाचे: सामान्य टेम्पलेट किंवा शीर्षक वापरू नका. थेट सूचनांपासून सुरुवात करा.';
    } else if (isAboveAverage) {
      guidance += 'कृपया प्रोत्साहन द्या आणि सांगा की मी ही चांगली कामगिरी कशी टिकवू शकतो। ';
      guidance += '2-3 टिप्स द्या ज्या मला या पातळीवर राहण्यास मदत करतील।\n\n';
      guidance += 'महत्त्वाचे: सामान्य टेम्पलेट किंवा शीर्षक वापरू नका. थेट सल्ल्यापासून सुरुवात करा.';
    } else {
      guidance += 'कृपया 2-3 अनुकूलन संधी सुचवा ज्या मला सरासरीपेक्षा वर जाण्यास मदत करू शकतात।\n\n';
      guidance += 'महत्त्वाचे: सामान्य टेम्पलेट किंवा शीर्षक वापरू नका. थेट सूचनांपासून सुरुवात करा.';
    }
  } else {
    guidance += '**Guidance for You:**\n\n';
    
    // Add city tier context if available
    if (cityTier) {
      guidance += `You're operating in a ${getCityTierLabel(cityTier, language)} area. `;
    }
    
    // Add percentile explanation for very low scores
    if (healthPercentile !== undefined && healthPercentile < 25) {
      guidance += `Your percentile rank of ${healthPercentile.toFixed(0)} means ${(100 - healthPercentile).toFixed(0)}% of similar businesses are performing better than you. `;
    }
    
    if (isBelowAverage) {
      guidance += 'Please provide 2-3 actionable suggestions to help improve my performance. ';
      guidance += 'Suggestions should be simple and immediately implementable.\n\n';
      guidance += 'Important: Do not use generic templates or headings. Start directly with suggestions.';
    } else if (isAboveAverage) {
      guidance += 'Please provide encouragement and explain how I can sustain this good performance. ';
      guidance += 'Give 2-3 tips to help me maintain this level.\n\n';
      guidance += 'Important: Do not use generic templates or headings. Start directly with advice.';
    } else {
      guidance += 'Please suggest 2-3 optimization opportunities that could help me move above average.\n\n';
      guidance += 'Important: Do not use generic templates or headings. Start directly with suggestions.';
    }
  }

  return guidance;
}

/**
 * Get localized category label
 */
function getCategoryLabel(category: string, language: string): string {
  const labels: Record<string, Record<string, string>> = {
    above_average: {
      en: 'Above Average',
      hi: 'औसत से ऊपर',
      mr: 'सरासरीपेक्षा जास्त',
    },
    at_average: {
      en: 'At Average',
      hi: 'औसत पर',
      mr: 'सरासरी',
    },
    below_average: {
      en: 'Below Average',
      hi: 'औसत से नीचे',
      mr: 'सरासरीपेक्षा कमी',
    },
  };

  return labels[category]?.[language] || labels[category]?.['en'] || category;
}

/**
 * Get localized city tier label
 */
function getCityTierLabel(cityTier: string, language: string): string {
  const labels: Record<string, Record<string, string>> = {
    'tier-1': {
      en: 'tier-1 city',
      hi: 'टियर-1 शहर',
      mr: 'टियर-1 शहर',
    },
    'tier-2': {
      en: 'tier-2 city',
      hi: 'टियर-2 शहर',
      mr: 'टियर-2 शहर',
    },
    'tier-3': {
      en: 'tier-3 city',
      hi: 'टियर-3 शहर',
      mr: 'टियर-3 शहर',
    },
    'rural': {
      en: 'rural area',
      hi: 'ग्रामीण क्षेत्र',
      mr: 'ग्रामीण भाग',
    },
  };

  return labels[cityTier]?.[language] || labels[cityTier]?.['en'] || cityTier;
}
