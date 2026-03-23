import { InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";

function getModelType(modelId) {
  if (modelId.includes('anthropic') || modelId.includes('claude')) {
    return 'claude';
  }
  if (modelId.includes('nova')) {
    return 'nova';
  }
  return 'nova';
}

function formatRequest(prompt, modelId, maxTokens = 1000) {
  const modelType = getModelType(modelId);

  if (modelType === 'nova') {
    return {
      messages: [
        {
          role: 'user',
          content: [{ text: prompt }],
        },
      ],
      inferenceConfig: {
        max_new_tokens: maxTokens,
      },
    };
  }

  return {
    anthropic_version: 'bedrock-2023-05-31',
    max_tokens: maxTokens,
    messages: [
      {
        role: 'user',
        content: [{ type: 'text', text: prompt }],
      },
    ],
  };
}

function extractText(responseBody, modelId) {
  return getModelType(modelId) === 'nova'
    ? (responseBody.output?.message?.content?.[0]?.text || '')
    : (responseBody.content?.[0]?.text || '');
}

function mapErrorType(error) {
  if (error?.name === 'ThrottlingException') return 'rate_limit';
  if (error?.name === 'TimeoutError' || error?.code === 'ETIMEDOUT') return 'timeout';
  if (error?.name === 'ServiceUnavailableException') return 'service_error';
  if (error?.name === 'ValidationException') return 'validation';
  if (error?.name === 'UnauthorizedException' || error?.name === 'AccessDeniedException') return 'authentication';
  return 'unknown';
}

function shouldFallback(errorType) {
  return errorType !== 'validation';
}

function getEnvChain(config) {
  return Array.from(
    new Set(
      [
        process.env[config.primaryEnv],
        config.fallbackEnv ? process.env[config.fallbackEnv] : undefined,
        config.finalEnv ? process.env[config.finalEnv] : undefined,
        ...config.defaults,
      ].filter(Boolean)
    )
  );
}

export function getLambdaModelChain(route) {
  const NOVA_PRO = 'apac.amazon.nova-pro-v1:0';
  const NOVA_LITE = 'apac.amazon.nova-lite-v1:0';
  const NOVA_MICRO = 'apac.amazon.nova-micro-v1:0';

  const configs = {
    report: {
      primaryEnv: 'BEDROCK_MODEL_REPORT_PRIMARY',
      fallbackEnv: 'BEDROCK_MODEL_REPORT_FALLBACK',
      finalEnv: 'BEDROCK_MODEL_REPORT_FINAL',
      defaults: [NOVA_LITE, NOVA_PRO, NOVA_MICRO],
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

  return getEnvChain(configs[route]);
}

export async function generateWithModelChain({
  client,
  modelIds,
  prompt,
  maxTokens = 1000,
  feature,
}) {
  let lastFailure = null;

  for (const [index, modelId] of modelIds.entries()) {
    console.log(`🤖 ${feature}: attempting model ${modelId} (${index + 1}/${modelIds.length})`);

    try {
      const command = new InvokeModelCommand({
        modelId,
        contentType: "application/json",
        accept: "application/json",
        body: JSON.stringify(formatRequest(prompt, modelId, maxTokens)),
      });

      const response = await client.send(command);
      const responseBody = JSON.parse(new TextDecoder().decode(response.body));

      return {
        success: true,
        content: extractText(responseBody, modelId),
        modelId,
      };
    } catch (error) {
      const errorType = mapErrorType(error);
      lastFailure = {
        success: false,
        error: error.message,
        errorType,
        modelId,
      };

      console.warn(`⚠️ ${feature}: model ${modelId} failed`, {
        error: error.message,
        errorType,
      });

      if (!shouldFallback(errorType)) {
        break;
      }
    }
  }

  return lastFailure || {
    success: false,
    error: 'AI model chain failed',
    errorType: 'unknown',
  };
}
