// Persona-Aware AI Prompt Builder
// Centralized prompt construction with business-specific personalization

import { PersonaContext, PromptStructure, PromptType } from './types';
import {
  PERSONA_IDENTITIES,
  BUSINESS_CONTEXTS,
  CITY_TIER_CONTEXTS,
  EXPLANATION_MODE_INSTRUCTIONS,
  AI_INTERPRETATION_INSTRUCTIONS,
  LANGUAGE_INSTRUCTIONS,
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
  const { metric, value, calculatedMetrics, predictions } = data;

  // Handle cashflow prediction explanation
  if (metric === 'cashflowPrediction' && predictions) {
    return buildCashflowPredictionPrompt(predictions, language);
  }

  let prompt = '';

  if (language === 'hi') {
    prompt = `कृपया निम्नलिखित मेट्रिक की व्याख्या करें:\n\n`;
    if (metric && value !== undefined) {
      prompt += `${metric}: ${value}\n\n`;
    }
    if (calculatedMetrics) {
      prompt += formatMetricsForPrompt(calculatedMetrics);
    }
    prompt += `\nकृपया विशिष्ट, व्यक्तिगत अंतर्दृष्टि प्रदान करें। सामान्य टेम्पलेट या शीर्षक का उपयोग न करें। सीधे व्यावसायिक सलाह से शुरू करें।`;
  } else if (language === 'mr') {
    prompt = `कृपया खालील मेट्रिकचे स्पष्टीकरण द्या:\n\n`;
    if (metric && value !== undefined) {
      prompt += `${metric}: ${value}\n\n`;
    }
    if (calculatedMetrics) {
      prompt += formatMetricsForPrompt(calculatedMetrics);
    }
    prompt += `\nकृपया विशिष्ट, वैयक्तिकृत अंतर्दृष्टी प्रदान करा. सामान्य टेम्पलेट किंवा शीर्षक वापरू नका. थेट व्यावसायिक सल्ल्यापासून सुरुवात करा.`;
  } else {
    prompt = `Please explain the following metric:\n\n`;
    if (metric && value !== undefined) {
      prompt += `${metric}: ${value}\n\n`;
    }
    if (calculatedMetrics) {
      prompt += formatMetricsForPrompt(calculatedMetrics);
    }
    prompt += `\nProvide specific, personalized insights. Do not use generic templates or headings. Start directly with business advice.`;
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
    prompt += `\nकृपया विशिष्ट, व्यक्तिगत अंतर्दृष्टि प्रदान करें। सामान्य टेम्पलेट या शीर्षक का उपयोग न करें। सीधे व्यावसायिक विश्लेषण से शुरू करें।`;
  } else if (language === 'mr') {
    prompt = `कृपया खालील व्यवसाय मेट्रिक्सचे विश्लेषण करा:\n\n`;
    if (calculatedMetrics) {
      prompt += formatMetricsForPrompt(calculatedMetrics);
    }
    prompt += `\nकृपया विशिष्ट, वैयक्तिकृत अंतर्दृष्टी प्रदान करा. सामान्य टेम्पलेट किंवा शीर्षक वापरू नका. थेट व्यावसायिक विश्लेषणापासून सुरुवात करा.`;
  } else {
    prompt = `Please analyze the following business metrics:\n\n`;
    if (calculatedMetrics) {
      prompt += formatMetricsForPrompt(calculatedMetrics);
    }
    prompt += `\nProvide specific, personalized insights. Do not use generic templates or headings. Start directly with business analysis.`;
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
    prompt += `\nकृपया विशिष्ट, व्यक्तिगत उत्तर प्रदान करें। सामान्य टेम्पलेट या शीर्षक का उपयोग न करें। सीधे उत्तर से शुरू करें।`;
  } else if (language === 'mr') {
    prompt = `प्रश्न: ${question}\n\n`;
    if (calculatedMetrics) {
      prompt += `संदर्भ मेट्रिक्स:\n`;
      prompt += formatMetricsForPrompt(calculatedMetrics);
    }
    prompt += `\nकृपया विशिष्ट, वैयक्तिकृत उत्तर द्या. सामान्य टेम्पलेट किंवा शीर्षक वापरू नका. थेट उत्तरापासून सुरुवात करा.`;
  } else {
    prompt = `Question: ${question}\n\n`;
    if (calculatedMetrics) {
      prompt += `Context metrics:\n`;
      prompt += formatMetricsForPrompt(calculatedMetrics);
    }
    prompt += `\nProvide specific, personalized answers. Do not use generic templates or headings. Start directly with the answer.`;
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
 * Build prompt for explaining cashflow predictions
 * CRITICAL: AI must ONLY explain the predictions, NEVER recalculate
 */
export function buildCashflowPredictionPrompt(predictions: any[], language: string): string {
  let prompt = '';

  if (language === 'hi') {
    prompt = `कृपया निम्नलिखित 7-दिवसीय कैश फ्लो पूर्वानुमान की व्याख्या करें:\n\n`;
    prompt += `**पूर्वानुमान विवरण:**\n`;
    predictions.forEach((pred, idx) => {
      const date = new Date(pred.date).toLocaleDateString('hi-IN', { weekday: 'short', month: 'short', day: 'numeric' });
      const balance = new Intl.NumberFormat('hi-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(pred.predictedBalance);
      const trend = pred.trend === 'up' ? '📈 बढ़ रहा' : pred.trend === 'down' ? '📉 घट रहा' : '➡️ स्थिर';
      const confidence = Math.round(pred.confidence * 100);
      const warning = pred.isNegative ? ' ⚠️ नकारात्मक शेष' : '';
      prompt += `${idx + 1}. ${date}: ${balance} (${trend}, ${confidence}% विश्वास)${warning}\n`;
    });
    prompt += `\n**कृपया समझाएं:**\n`;
    prompt += `- कुछ दिनों में शेष राशि अधिक/कम क्यों है?\n`;
    prompt += `- ऐतिहासिक डेटा में कौन से पैटर्न पाए गए?\n`;
    prompt += `- नकारात्मक शेष राशि के लिए जोखिम कारक क्या हैं?\n`;
    prompt += `- साप्ताहिक या मौसमी चक्र क्या हैं?\n`;
    prompt += `- मुझे अपने कैश फ्लो को बेहतर बनाने के लिए क्या कदम उठाने चाहिए?\n`;
    prompt += `\nमहत्वपूर्ण: सामान्य टेम्पलेट या शीर्षक का उपयोग न करें। सीधे विश्लेषण से शुरू करें।`;
  } else if (language === 'mr') {
    prompt = `कृपया खालील 7-दिवसीय रोख प्रवाह अंदाजाचे स्पष्टीकरण द्या:\n\n`;
    prompt += `**अंदाज तपशील:**\n`;
    predictions.forEach((pred, idx) => {
      const date = new Date(pred.date).toLocaleDateString('mr-IN', { weekday: 'short', month: 'short', day: 'numeric' });
      const balance = new Intl.NumberFormat('mr-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(pred.predictedBalance);
      const trend = pred.trend === 'up' ? '📈 वाढत आहे' : pred.trend === 'down' ? '📉 कमी होत आहे' : '➡️ स्थिर';
      const confidence = Math.round(pred.confidence * 100);
      const warning = pred.isNegative ? ' ⚠️ नकारात्मक शिल्लक' : '';
      prompt += `${idx + 1}. ${date}: ${balance} (${trend}, ${confidence}% विश्वास)${warning}\n`;
    });
    prompt += `\n**कृपया समजावून सांगा:**\n`;
    prompt += `- काही दिवसांमध्ये शिल्लक जास्त/कमी का आहे?\n`;
    prompt += `- ऐतिहासिक डेटामध्ये कोणते पॅटर्न आढळले?\n`;
    prompt += `- नकारात्मक शिल्लकसाठी जोखीम घटक काय आहेत?\n`;
    prompt += `- साप्ताहिक किंवा हंगामी चक्र काय आहेत?\n`;
    prompt += `- माझा रोख प्रवाह सुधारण्यासाठी मी कोणती पावले उचलावीत?\n`;
    prompt += `\nमहत्त्वाचे: सामान्य टेम्पलेट किंवा शीर्षक वापरू नका. थेट विश्लेषणापासून सुरुवात करा.`;
  } else {
    prompt = `Please explain the following 7-day cash flow prediction:\n\n`;
    prompt += `**Prediction Details:**\n`;
    predictions.forEach((pred, idx) => {
      const date = new Date(pred.date).toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' });
      const balance = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(pred.predictedBalance);
      const trend = pred.trend === 'up' ? '📈 Rising' : pred.trend === 'down' ? '📉 Falling' : '➡️ Stable';
      const confidence = Math.round(pred.confidence * 100);
      const warning = pred.isNegative ? ' ⚠️ Negative balance' : '';
      prompt += `${idx + 1}. ${date}: ${balance} (${trend}, ${confidence}% confidence)${warning}\n`;
    });
    prompt += `\n**Please explain:**\n`;
    prompt += `- Why are certain days predicted higher/lower?\n`;
    prompt += `- What historical patterns were identified?\n`;
    prompt += `- What are the risk factors for negative predictions?\n`;
    prompt += `- What weekly or seasonal cycles exist?\n`;
    prompt += `- What steps should I take to improve my cash flow?\n`;
    prompt += `\nImportant: Do not use generic templates or headings. Start directly with the analysis.`;
  }

  return prompt;
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

  // Build user prompt with index data
  let userPrompt = '';

  if (context.language === 'hi') {
    userPrompt = 'कृपया निम्नलिखित वित्तीय स्वास्थ्य संकेतकों की व्याख्या करें:\n\n';
  } else if (context.language === 'mr') {
    userPrompt = 'कृपया खालील आर्थिक आरोग्य निर्देशकांचे स्पष्टीकरण द्या:\n\n';
  } else {
    userPrompt = 'Please explain the following financial health indicators:\n\n';
  }

  // Add stress index data (Financial Health Meter)
  if (data.stressIndex) {
    const { score, breakdown, inputParameters } = data.stressIndex;
    
    if (context.language === 'hi') {
      userPrompt += `**आर्थिक सेहत (Financial Health Meter)**: ${score}/100\n`;
      userPrompt += `घटक विवरण:\n`;
      userPrompt += `- क्रेडिट अनुपात स्कोर: ${breakdown.creditRatioScore}/40 (क्रेडिट अनुपात: ${inputParameters.creditRatio.toFixed(2)})\n`;
      userPrompt += `- नकद बफर स्कोर: ${breakdown.cashBufferScore}/35 (नकद बफर: ${inputParameters.cashBuffer.toFixed(2)})\n`;
      userPrompt += `- व्यय अस्थिरता स्कोर: ${breakdown.expenseVolatilityScore}/25 (अस्थिरता: ${inputParameters.expenseVolatility.toFixed(2)})\n\n`;
    } else if (context.language === 'mr') {
      userPrompt += `**आर्थिक आरोग्य (Financial Health Meter)**: ${score}/100\n`;
      userPrompt += `घटक तपशील:\n`;
      userPrompt += `- क्रेडिट गुणोत्तर स्कोअर: ${breakdown.creditRatioScore}/40 (क्रेडिट गुणोत्तर: ${inputParameters.creditRatio.toFixed(2)})\n`;
      userPrompt += `- रोख बफर स्कोअर: ${breakdown.cashBufferScore}/35 (रोख बफर: ${inputParameters.cashBuffer.toFixed(2)})\n`;
      userPrompt += `- खर्च अस्थिरता स्कोअर: ${breakdown.expenseVolatilityScore}/25 (अस्थिरता: ${inputParameters.expenseVolatility.toFixed(2)})\n\n`;
    } else {
      userPrompt += `**Financial Health Meter**: ${score}/100\n`;
      userPrompt += `Component Breakdown:\n`;
      userPrompt += `- Credit Ratio Score: ${breakdown.creditRatioScore}/40 (Credit Ratio: ${inputParameters.creditRatio.toFixed(2)})\n`;
      userPrompt += `- Cash Buffer Score: ${breakdown.cashBufferScore}/35 (Cash Buffer: ${inputParameters.cashBuffer.toFixed(2)})\n`;
      userPrompt += `- Expense Volatility Score: ${breakdown.expenseVolatilityScore}/25 (Volatility: ${inputParameters.expenseVolatility.toFixed(2)})\n\n`;
    }
  }

  // Add affordability index data (Purchase Planner)
  if (data.affordabilityIndex) {
    const { score, breakdown, inputParameters } = data.affordabilityIndex;
    
    if (context.language === 'hi') {
      userPrompt += `**खरीदारी योजना (Purchase Planner)**: ${score}/100\n`;
      userPrompt += `श्रेणी: ${breakdown.affordabilityCategory}\n`;
      userPrompt += `लागत-से-लाभ अनुपात: ${breakdown.costToProfitRatio.toFixed(2)}\n`;
      userPrompt += `योजनाबद्ध लागत: ₹${inputParameters.plannedCost}\n`;
      userPrompt += `औसत मासिक लाभ: ₹${inputParameters.avgMonthlyProfit}\n\n`;
    } else if (context.language === 'mr') {
      userPrompt += `**खरेदी योजना (Purchase Planner)**: ${score}/100\n`;
      userPrompt += `श्रेणी: ${breakdown.affordabilityCategory}\n`;
      userPrompt += `खर्च-ते-नफा गुणोत्तर: ${breakdown.costToProfitRatio.toFixed(2)}\n`;
      userPrompt += `नियोजित खर्च: ₹${inputParameters.plannedCost}\n`;
      userPrompt += `सरासरी मासिक नफा: ₹${inputParameters.avgMonthlyProfit}\n\n`;
    } else {
      userPrompt += `**Purchase Planner**: ${score}/100\n`;
      userPrompt += `Category: ${breakdown.affordabilityCategory}\n`;
      userPrompt += `Cost-to-Profit Ratio: ${breakdown.costToProfitRatio.toFixed(2)}\n`;
      userPrompt += `Planned Cost: ₹${inputParameters.plannedCost}\n`;
      userPrompt += `Average Monthly Profit: ₹${inputParameters.avgMonthlyProfit}\n\n`;
    }
  }

  // Add instruction to explain implications
  if (context.language === 'hi') {
    userPrompt += 'इन संकेतकों का मेरे व्यवसाय के लिए क्या मतलब है और मुझे क्या कार्रवाई करनी चाहिए?\n\n';
    userPrompt += 'महत्वपूर्ण: सामान्य टेम्पलेट या शीर्षक का उपयोग न करें। सीधे विश्लेषण से शुरू करें।';
  } else if (context.language === 'mr') {
    userPrompt += 'या निर्देशकांचा माझ्या व्यवसायासाठी काय अर्थ आहे आणि मी कोणती कृती करावी?\n\n';
    userPrompt += 'महत्त्वाचे: सामान्य टेम्पलेट किंवा शीर्षक वापरू नका. थेट विश्लेषणापासून सुरुवात करा.';
  } else {
    userPrompt += 'What do these indicators mean for my business and what actions should I take?\n\n';
    userPrompt += 'Important: Do not use generic templates or headings. Start directly with the analysis.';
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
