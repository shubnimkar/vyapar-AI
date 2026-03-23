import {
  FallbackOrchestrator,
  getFallbackOrchestrator,
  resetFallbackOrchestrator,
} from '../fallback-orchestrator';
import { AIProvider, AIProviderResponse } from '../provider-abstraction';
import { logger } from '../../logger';

jest.mock('../../logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

class MockProvider implements AIProvider {
  private responses: AIProviderResponse[] = [];
  private callCount = 0;

  constructor(private readonly name: 'bedrock' | 'puter' = 'bedrock') {}

  async generateResponse(): Promise<AIProviderResponse> {
    const response = this.responses[this.callCount] || {
      success: false,
      error: 'No response configured',
      errorType: 'unknown' as const,
      provider: this.name,
    };
    this.callCount += 1;
    return response;
  }

  getProviderName(): 'bedrock' | 'puter' {
    return this.name;
  }

  isConfigured(): boolean {
    return true;
  }

  setResponses(responses: AIProviderResponse[]): void {
    this.responses = responses;
    this.callCount = 0;
  }

  getCallCount(): number {
    return this.callCount;
  }
}

describe('FallbackOrchestrator', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetFallbackOrchestrator();
  });

  it('returns the primary Bedrock response when the first model succeeds', async () => {
    const primaryProvider = new MockProvider('bedrock');
    const fallbackProvider = new MockProvider('bedrock');

    primaryProvider.setResponses([
      {
        success: true,
        content: 'Primary model answer',
        provider: 'bedrock',
        modelId: 'apac.amazon.nova-pro-v1:0',
      },
    ]);

    const orchestrator = new FallbackOrchestrator(primaryProvider, fallbackProvider, {
      feature: 'qa',
      modelIds: ['apac.amazon.nova-pro-v1:0', 'apac.amazon.nova-lite-v1:0'],
    });

    const result = await orchestrator.generateResponse('hello', undefined, {
      endpoint: '/api/ask',
      userId: 'user-1',
    });

    expect(result.success).toBe(true);
    expect(result.provider).toBe('bedrock');
    expect(result.modelId).toBe('apac.amazon.nova-pro-v1:0');
    expect(primaryProvider.getCallCount()).toBe(1);
    expect(fallbackProvider.getCallCount()).toBe(0);
  });

  it('falls through to the next Bedrock model when the primary model fails with a retryable error', async () => {
    const primaryProvider = new MockProvider('bedrock');
    const fallbackProvider = new MockProvider('bedrock');

    primaryProvider.setResponses([
      {
        success: false,
        error: 'Primary model unavailable',
        errorType: 'service_error',
        provider: 'bedrock',
        modelId: 'apac.amazon.nova-pro-v1:0',
      },
    ]);
    fallbackProvider.setResponses([
      {
        success: true,
        content: 'Fallback model answer',
        provider: 'bedrock',
        modelId: 'apac.amazon.nova-lite-v1:0',
      },
    ]);

    const orchestrator = new FallbackOrchestrator(primaryProvider, fallbackProvider, {
      feature: 'qa',
      modelIds: ['apac.amazon.nova-pro-v1:0', 'apac.amazon.nova-lite-v1:0'],
    });

    const result = await orchestrator.generateResponse('hello');

    expect(result.success).toBe(true);
    expect(result.content).toBe('Fallback model answer');
    expect(result.modelId).toBe('apac.amazon.nova-lite-v1:0');
    expect(primaryProvider.getCallCount()).toBe(1);
    expect(fallbackProvider.getCallCount()).toBe(1);
    expect(logger.warn).toHaveBeenCalledWith(
      'AI request failed on Bedrock model, attempting next model',
      expect.objectContaining({
        model_id: 'apac.amazon.nova-pro-v1:0',
        feature: 'qa',
      })
    );
  });

  it('does not continue through the chain for validation errors', async () => {
    const primaryProvider = new MockProvider('bedrock');
    const fallbackProvider = new MockProvider('bedrock');

    primaryProvider.setResponses([
      {
        success: false,
        error: 'Invalid prompt',
        errorType: 'validation',
        provider: 'bedrock',
        modelId: 'apac.amazon.nova-pro-v1:0',
      },
    ]);

    const orchestrator = new FallbackOrchestrator(primaryProvider, fallbackProvider, {
      feature: 'analysis',
      modelIds: ['apac.amazon.nova-pro-v1:0', 'apac.amazon.nova-lite-v1:0'],
    });

    const result = await orchestrator.generateResponse('bad prompt', { language: 'en' });

    expect(result.success).toBe(false);
    expect(result.errorType).toBe('service_error');
    expect(primaryProvider.getCallCount()).toBe(1);
    expect(fallbackProvider.getCallCount()).toBe(0);
  });

  it('returns a localized unavailable error when all configured Bedrock models fail', async () => {
    const primaryProvider = new MockProvider('bedrock');
    const fallbackProvider = new MockProvider('bedrock');

    primaryProvider.setResponses([
      {
        success: false,
        error: 'Primary failure',
        errorType: 'service_error',
        provider: 'bedrock',
        modelId: 'apac.amazon.nova-pro-v1:0',
      },
    ]);
    fallbackProvider.setResponses([
      {
        success: false,
        error: 'Fallback failure',
        errorType: 'timeout',
        provider: 'bedrock',
        modelId: 'apac.amazon.nova-lite-v1:0',
      },
    ]);

    const orchestrator = new FallbackOrchestrator(primaryProvider, fallbackProvider, {
      feature: 'explain',
      modelIds: ['apac.amazon.nova-pro-v1:0', 'apac.amazon.nova-lite-v1:0'],
    });

    const result = await orchestrator.generateResponse('hello', { language: 'en' });

    expect(result.success).toBe(false);
    expect(result.errorType).toBe('service_error');
    expect(result.provider).toBe('bedrock');
    expect(result.error).toBe('AI service temporarily unavailable. Please try again later.');
  });

  it('memoizes orchestrators per feature and resets them cleanly', () => {
    const qaA = getFallbackOrchestrator('qa');
    const qaB = getFallbackOrchestrator('qa');
    const analysis = getFallbackOrchestrator('analysis');

    expect(qaA).toBe(qaB);
    expect(qaA).not.toBe(analysis);

    resetFallbackOrchestrator();

    const qaC = getFallbackOrchestrator('qa');
    expect(qaC).not.toBe(qaA);
  });
});
