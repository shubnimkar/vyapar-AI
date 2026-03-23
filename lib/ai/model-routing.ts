export type AIModelRoute =
  | 'qa'
  | 'analysis'
  | 'explain'
  | 'benchmark'
  | 'indices'
  | 'report'
  | 'localization'
  | 'voice'
  | 'expense_alert'
  | 'receipt'
  | 'cashflow';

const NOVA_PRO = 'apac.amazon.nova-pro-v1:0';
const NOVA_LITE = 'apac.amazon.nova-lite-v1:0';
const NOVA_MICRO = 'apac.amazon.nova-micro-v1:0';

type ModelChainSpec = {
  primaryEnv: string;
  fallbackEnv?: string;
  finalEnv?: string;
  defaults: [string, string?, string?];
};

const MODEL_CHAIN_CONFIG: Record<AIModelRoute, ModelChainSpec> = {
  qa: {
    primaryEnv: 'BEDROCK_MODEL_QA_PRIMARY',
    fallbackEnv: 'BEDROCK_MODEL_QA_FALLBACK',
    finalEnv: 'BEDROCK_MODEL_QA_FINAL',
    defaults: [NOVA_PRO, NOVA_LITE, NOVA_MICRO],
  },
  analysis: {
    primaryEnv: 'BEDROCK_MODEL_ANALYSIS_PRIMARY',
    fallbackEnv: 'BEDROCK_MODEL_ANALYSIS_FALLBACK',
    finalEnv: 'BEDROCK_MODEL_ANALYSIS_FINAL',
    defaults: [NOVA_PRO, NOVA_LITE, NOVA_MICRO],
  },
  explain: {
    primaryEnv: 'BEDROCK_MODEL_EXPLAIN_PRIMARY',
    fallbackEnv: 'BEDROCK_MODEL_EXPLAIN_FALLBACK',
    finalEnv: 'BEDROCK_MODEL_EXPLAIN_FINAL',
    defaults: [NOVA_PRO, NOVA_LITE, NOVA_MICRO],
  },
  benchmark: {
    primaryEnv: 'BEDROCK_MODEL_EXPLAIN_PRIMARY',
    fallbackEnv: 'BEDROCK_MODEL_EXPLAIN_FALLBACK',
    finalEnv: 'BEDROCK_MODEL_EXPLAIN_FINAL',
    defaults: [NOVA_PRO, NOVA_LITE, NOVA_MICRO],
  },
  indices: {
    primaryEnv: 'BEDROCK_MODEL_EXPLAIN_PRIMARY',
    fallbackEnv: 'BEDROCK_MODEL_EXPLAIN_FALLBACK',
    finalEnv: 'BEDROCK_MODEL_EXPLAIN_FINAL',
    defaults: [NOVA_PRO, NOVA_LITE, NOVA_MICRO],
  },
  report: {
    primaryEnv: 'BEDROCK_MODEL_REPORT_PRIMARY',
    fallbackEnv: 'BEDROCK_MODEL_REPORT_FALLBACK',
    finalEnv: 'BEDROCK_MODEL_REPORT_FINAL',
    defaults: [NOVA_LITE, NOVA_PRO, NOVA_MICRO],
  },
  localization: {
    primaryEnv: 'BEDROCK_MODEL_LOCALIZATION_PRIMARY',
    finalEnv: 'BEDROCK_MODEL_LOCALIZATION_FINAL',
    defaults: [NOVA_LITE, NOVA_MICRO],
  },
  voice: {
    primaryEnv: 'BEDROCK_MODEL_VOICE_PRIMARY',
    finalEnv: 'BEDROCK_MODEL_VOICE_FINAL',
    defaults: [NOVA_LITE, NOVA_MICRO],
  },
  expense_alert: {
    primaryEnv: 'BEDROCK_MODEL_EXPENSE_ALERT_PRIMARY',
    fallbackEnv: 'BEDROCK_MODEL_EXPENSE_ALERT_FALLBACK',
    defaults: [NOVA_MICRO, NOVA_LITE],
  },
  receipt: {
    primaryEnv: 'BEDROCK_MODEL_VOICE_PRIMARY',
    finalEnv: 'BEDROCK_MODEL_VOICE_FINAL',
    defaults: [NOVA_LITE, NOVA_MICRO],
  },
  cashflow: {
    primaryEnv: 'BEDROCK_MODEL_REPORT_PRIMARY',
    finalEnv: 'BEDROCK_MODEL_REPORT_FINAL',
    defaults: [NOVA_LITE, NOVA_MICRO],
  },
};

function compactChain(values: Array<string | undefined>): string[] {
  return Array.from(new Set(values.filter((value): value is string => Boolean(value && value.trim()))));
}

export function getModelChain(route: AIModelRoute): string[] {
  const config = MODEL_CHAIN_CONFIG[route];
  return compactChain([
    process.env[config.primaryEnv],
    config.fallbackEnv ? process.env[config.fallbackEnv] : undefined,
    config.finalEnv ? process.env[config.finalEnv] : undefined,
    ...config.defaults,
  ]);
}

export function getPrimaryModel(route: AIModelRoute): string {
  return getModelChain(route)[0];
}

