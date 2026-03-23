import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { logger } from '@/lib/logger';
import { extractBedrockContent, formatBedrockRequest, mapBedrockErrorType, shouldFallbackForError } from './bedrock-utils';
import { AIProviderResponse, GenerateOptions } from './provider-abstraction';

export type ModelChainMetadata = {
  endpoint?: string;
  userId?: string;
  feature?: string;
};

function getErrorMessage(errorType: AIProviderResponse['errorType'], error?: any): string {
  switch (errorType) {
    case 'rate_limit':
      return 'Too many requests. Please try again in a moment.';
    case 'timeout':
      return 'Request timed out. Please try again.';
    case 'service_error':
      return 'AI service is temporarily unavailable.';
    case 'authentication':
      return 'Authentication failed.';
    case 'validation':
      return 'Invalid AI request.';
    default:
      return error?.message || 'Failed to get AI response.';
  }
}

export async function invokeBedrockTextModel(params: {
  client: BedrockRuntimeClient;
  modelId: string;
  prompt: string;
  maxTokens?: number;
  maxRetries?: number;
}): Promise<AIProviderResponse> {
  const { client, modelId, prompt, maxTokens = 2000, maxRetries = 2 } = params;
  let lastError: any;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const command = new InvokeModelCommand({
        modelId,
        contentType: 'application/json',
        accept: 'application/json',
        body: JSON.stringify(formatBedrockRequest(prompt, modelId, maxTokens)),
      });

      const response = await client.send(command);
      const responseBody = JSON.parse(new TextDecoder().decode(response.body));

      return {
        success: true,
        content: extractBedrockContent(responseBody, modelId),
        provider: 'bedrock',
        modelId,
      };
    } catch (error: any) {
      lastError = error;
      const errorType = mapBedrockErrorType(error);

      if (errorType === 'rate_limit' && attempt < maxRetries) {
        const waitTime = Math.pow(2, attempt) * 1000;
        await new Promise((resolve) => setTimeout(resolve, waitTime));
        continue;
      }

      if (!shouldFallbackForError(errorType)) {
        break;
      }
      break;
    }
  }

  const errorType = mapBedrockErrorType(lastError);
  return {
    success: false,
    error: getErrorMessage(errorType, lastError),
    errorType,
    provider: 'bedrock',
    modelId,
  };
}

export async function generateWithModelChain(params: {
  client: BedrockRuntimeClient;
  modelIds: string[];
  prompt: string;
  options?: GenerateOptions;
  metadata?: ModelChainMetadata;
  maxTokens?: number;
}): Promise<AIProviderResponse> {
  const { client, modelIds, prompt, options, metadata, maxTokens } = params;
  const chain = Array.from(new Set(modelIds.filter(Boolean)));

  if (chain.length === 0) {
    return {
      success: false,
      error: 'No AI model configured.',
      errorType: 'service_error',
      provider: 'bedrock',
    };
  }

  let lastFailure: AIProviderResponse | null = null;

  for (const [index, modelId] of chain.entries()) {
    logger.info('AI model attempt started', {
      endpoint: metadata?.endpoint,
      userId: metadata?.userId,
      feature: metadata?.feature,
      model_id: modelId,
      attempt: index + 1,
      chain_length: chain.length,
    });

    const result = await invokeBedrockTextModel({
      client,
      modelId,
      prompt,
      maxTokens,
      maxRetries: options?.maxRetries,
    });

    if (result.success) {
      logger.info('AI request handled by Bedrock model', {
        endpoint: metadata?.endpoint,
        userId: metadata?.userId,
        feature: metadata?.feature,
        model_id: modelId,
        attempt: index + 1,
      });
      return result;
    }

    lastFailure = result;

    logger.warn('AI model attempt failed', {
      endpoint: metadata?.endpoint,
      userId: metadata?.userId,
      feature: metadata?.feature,
      model_id: modelId,
      attempt: index + 1,
      error: result.error,
      error_type: result.errorType,
    });

    if (!shouldFallbackForError(result.errorType || 'unknown')) {
      break;
    }
  }

  logger.error('AI request failed on all configured Bedrock models', {
    endpoint: metadata?.endpoint,
    userId: metadata?.userId,
    feature: metadata?.feature,
    model_chain: chain,
    final_error: lastFailure?.error,
    final_error_type: lastFailure?.errorType,
  });

  return lastFailure || {
    success: false,
    error: 'AI service is temporarily unavailable.',
    errorType: 'service_error',
    provider: 'bedrock',
  };
}
