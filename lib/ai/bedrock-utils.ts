import { AIErrorType } from './provider-abstraction';

export function getBedrockModelType(modelId: string): 'claude' | 'nova' {
  if (modelId.includes('anthropic') || modelId.includes('claude')) {
    return 'claude';
  }
  if (modelId.includes('nova')) {
    return 'nova';
  }
  return 'nova';
}

export function formatBedrockRequest(prompt: string, modelId: string, maxTokens: number = 2000): Record<string, unknown> {
  const modelType = getBedrockModelType(modelId);

  if (modelType === 'nova') {
    return {
      messages: [{ role: 'user', content: [{ text: prompt }] }],
      inferenceConfig: { max_new_tokens: maxTokens },
    };
  }

  return {
    anthropic_version: 'bedrock-2023-05-31',
    max_tokens: maxTokens,
    messages: [{ role: 'user', content: [{ type: 'text', text: prompt }] }],
  };
}

export function extractBedrockContent(responseBody: any, modelId: string): string {
  const modelType = getBedrockModelType(modelId);

  if (modelType === 'nova') {
    return responseBody.output?.message?.content?.[0]?.text || '';
  }

  return responseBody.content?.[0]?.text || '';
}

export function mapBedrockErrorType(error: any): AIErrorType {
  if (error?.name === 'ThrottlingException') return 'rate_limit';
  if (error?.name === 'TimeoutError' || error?.code === 'ETIMEDOUT') return 'timeout';
  if (error?.name === 'ServiceUnavailableException') return 'service_error';
  if (error?.name === 'ValidationException') return 'validation';
  if (error?.name === 'UnauthorizedException' || error?.name === 'AccessDeniedException') return 'authentication';
  return 'unknown';
}

export function shouldFallbackForError(errorType: AIErrorType): boolean {
  return errorType !== 'validation';
}

