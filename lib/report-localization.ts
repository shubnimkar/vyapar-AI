import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { Language, ReportLocalizedContent } from '@/lib/types';
import { logger } from '@/lib/logger';

const AWS_REGION = process.env.AWS_REGION || 'ap-south-1';
const BEDROCK_MODEL_ID = process.env.BEDROCK_MODEL_ID || 'global.amazon.nova-2-lite-v1:0';
const bedrockClient = new BedrockRuntimeClient({ region: AWS_REGION });

function getLanguageName(language: Language): string {
  if (language === 'hi') return 'Hindi';
  if (language === 'mr') return 'Marathi';
  return 'English';
}

function fallbackNarrative(base: Partial<ReportLocalizedContent>): ReportLocalizedContent {
  return {
    summary: typeof base.summary === 'string' ? base.summary : '',
    wins: Array.isArray(base.wins) ? base.wins.filter(Boolean) : [],
    risks: Array.isArray(base.risks) ? base.risks.filter(Boolean) : [],
    nextSteps: Array.isArray(base.nextSteps) ? base.nextSteps.filter(Boolean) : [],
    insights: typeof base.insights === 'string' ? base.insights : (typeof base.summary === 'string' ? base.summary : ''),
  };
}

function parseLocalizedNarrative(rawText: string, base: ReportLocalizedContent): ReportLocalizedContent {
  try {
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in translation response');
    }

    const parsed = JSON.parse(jsonMatch[0]) as Partial<ReportLocalizedContent>;
    const normalized = fallbackNarrative(parsed);
    return {
      summary: normalized.summary || base.summary,
      wins: normalized.wins.length > 0 ? normalized.wins.slice(0, 3) : base.wins,
      risks: normalized.risks.length > 0 ? normalized.risks.slice(0, 3) : base.risks,
      nextSteps: normalized.nextSteps.length > 0 ? normalized.nextSteps.slice(0, 3) : base.nextSteps,
      insights: normalized.insights || normalized.summary || base.insights,
    };
  } catch (error) {
    logger.warn('Failed to parse translated report content', { error, rawText });
    return base;
  }
}

export function getReportLocalizedContent(
  reportData: Record<string, unknown> | undefined,
  language: Language
): ReportLocalizedContent {
  const localizedContent = reportData?.localizedContent as Partial<Record<Language, ReportLocalizedContent>> | undefined;
  const variant = localizedContent?.[language];
  if (variant) {
    return fallbackNarrative(variant);
  }

  return fallbackNarrative({
    summary: typeof reportData?.summary === 'string' ? reportData.summary : '',
    wins: Array.isArray(reportData?.wins) ? (reportData.wins as string[]) : [],
    risks: Array.isArray(reportData?.risks) ? (reportData.risks as string[]) : [],
    nextSteps: Array.isArray(reportData?.nextSteps) ? (reportData.nextSteps as string[]) : [],
    insights: typeof reportData?.insights === 'string' ? reportData.insights : '',
  });
}

export function withReportLocalizedContent(
  reportData: Record<string, unknown> | undefined,
  language: Language,
  content: ReportLocalizedContent
): Record<string, unknown> {
  const current = (reportData || {}) as Record<string, unknown>;
  const localizedContent = {
    ...((current.localizedContent as Partial<Record<Language, ReportLocalizedContent>> | undefined) || {}),
    [language]: content,
  };

  return {
    ...current,
    summary: content.summary,
    wins: content.wins,
    risks: content.risks,
    nextSteps: content.nextSteps,
    insights: content.insights,
    generatedLanguage: language,
    localizedContent,
  };
}

export async function translateReportLocalizedContent(params: {
  reportType: 'daily' | 'weekly' | 'monthly';
  periodLabel: string;
  targetLanguage: Language;
  base: ReportLocalizedContent;
}): Promise<ReportLocalizedContent> {
  const { reportType, periodLabel, targetLanguage, base } = params;

  if (targetLanguage === 'en' && !base.summary.trim()) {
    return base;
  }

  const prompt = `Translate this business report narrative into ${getLanguageName(targetLanguage)}.
Keep all numbers, rupee amounts, percentages, dates, names, and business facts unchanged.
Do not add new advice or remove meaning.
Return ONLY valid JSON in this exact shape:
{
  "summary": "translated summary",
  "wins": ["translated bullet"],
  "risks": ["translated bullet"],
  "nextSteps": ["translated bullet"],
  "insights": "translated ai summary"
}

Report type: ${reportType}
Period: ${periodLabel}

Content to translate:
${JSON.stringify(base)}`;

  const command = new InvokeModelCommand({
    modelId: BEDROCK_MODEL_ID,
    contentType: 'application/json',
    accept: 'application/json',
    body: JSON.stringify({
      messages: [
        {
          role: 'user',
          content: [{ text: prompt }],
        },
      ],
      inferenceConfig: {
        max_new_tokens: 500,
      },
    }),
  });

  const response = await bedrockClient.send(command);
  const responseBody = JSON.parse(new TextDecoder().decode(response.body));
  const extractedText = responseBody.output?.message?.content?.[0]?.text || '';

  return parseLocalizedNarrative(extractedText, base);
}
