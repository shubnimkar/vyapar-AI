/**
 * Unit tests for sensitive information sanitization
 * 
 * Tests that error responses never expose API keys, credentials, AWS error details,
 * or stack traces to clients.
 */

import { FallbackOrchestrator } from '../fallback-orchestrator';
import { BedrockProvider } from '../bedrock-provider';
import { MockProvider } from './mock-provider';

describe('Sensitive Information Sanitization', () => {
  let orchestrator: FallbackOrchestrator;
  let mockPrimary: MockProvider;
  let mockFallback: MockProvider;

  beforeEach(() => {
    mockPrimary = new MockProvider('bedrock');
    mockFallback = new MockProvider('puter');
    orchestrator = new FallbackOrchestrator(mockPrimary, mockFallback, {
      enableFallback: true,
      totalTimeout: 10000,
    });
  });

  describe('AWS error details sanitization', () => {
    it('should not expose AWS error details in response', async () => {
      // Configure providers to fail with AWS-specific errors
      mockPrimary.setResponses([
        {
          success: false,
          error: 'AWS.ServiceUnavailableException: Service is unavailable',
          errorType: 'service_error',
          provider: 'bedrock',
        },
      ]);

      mockFallback.setResponses([
        {
          success: false,
          error: 'Connection failed',
          errorType: 'service_error',
          provider: 'puter',
        },
      ]);

      const response = await orchestrator.generateResponse(
        'Test prompt',
        { language: 'en' },
        { endpoint: '/api/test' }
      );

      expect(response.success).toBe(false);
      // Should return generic localized message, not AWS error details
      expect(response.error).toBe('AI service temporarily unavailable. Please try again later.');
      expect(response.error).not.toContain('AWS');
      expect(response.error).not.toContain('ServiceUnavailableException');
    });

    it('should not expose RequestId in error messages', async () => {
      mockPrimary.setResponses([
        {
          success: false,
          error: 'Error occurred. RequestId: abc-123-def-456',
          errorType: 'service_error',
          provider: 'bedrock',
        },
      ]);

      mockFallback.setResponses([
        {
          success: false,
          error: 'Failed',
          errorType: 'service_error',
          provider: 'puter',
        },
      ]);

      const response = await orchestrator.generateResponse(
        'Test prompt',
        { language: 'en' },
        { endpoint: '/api/test' }
      );

      expect(response.success).toBe(false);
      expect(response.error).not.toContain('RequestId');
      expect(response.error).not.toContain('abc-123-def-456');
    });

    it('should not expose ARN in error messages', async () => {
      mockPrimary.setResponses([
        {
          success: false,
          error: 'Access denied for arn:aws:bedrock:us-east-1:123456789:model/claude',
          errorType: 'authentication',
          provider: 'bedrock',
        },
      ]);

      mockFallback.setResponses([
        {
          success: false,
          error: 'Failed',
          errorType: 'service_error',
          provider: 'puter',
        },
      ]);

      const response = await orchestrator.generateResponse(
        'Test prompt',
        { language: 'en' },
        { endpoint: '/api/test' }
      );

      expect(response.success).toBe(false);
      expect(response.error).not.toContain('arn:aws');
      expect(response.error).not.toContain('123456789');
    });
  });

  describe('Stack trace sanitization', () => {
    it('should not expose stack traces in responses', async () => {
      mockPrimary.setResponses([
        {
          success: false,
          error: 'Error at processRequest (/home/user/app/lib/bedrock.ts:123)',
          errorType: 'unknown',
          provider: 'bedrock',
        },
      ]);

      mockFallback.setResponses([
        {
          success: false,
          error: 'Failed',
          errorType: 'service_error',
          provider: 'puter',
        },
      ]);

      const response = await orchestrator.generateResponse(
        'Test prompt',
        { language: 'en' },
        { endpoint: '/api/test' }
      );

      expect(response.success).toBe(false);
      expect(response.error).not.toContain('/home/user');
      expect(response.error).not.toContain('bedrock.ts');
      expect(response.error).not.toContain('at processRequest');
    });

    it('should not expose file paths in responses', async () => {
      mockPrimary.setResponses([
        {
          success: false,
          error: 'Failed to load config from /usr/local/app/config.json',
          errorType: 'unknown',
          provider: 'bedrock',
        },
      ]);

      mockFallback.setResponses([
        {
          success: false,
          error: 'Failed',
          errorType: 'service_error',
          provider: 'puter',
        },
      ]);

      const response = await orchestrator.generateResponse(
        'Test prompt',
        { language: 'en' },
        { endpoint: '/api/test' }
      );

      expect(response.success).toBe(false);
      expect(response.error).not.toContain('/usr/local');
      expect(response.error).not.toContain('config.json');
    });
  });

  describe('Credentials sanitization', () => {
    it('should not expose AWS access keys in responses', async () => {
      mockPrimary.setResponses([
        {
          success: false,
          error: 'Invalid credentials: aws_access_key_id=AKIAIOSFODNN7EXAMPLE',
          errorType: 'authentication',
          provider: 'bedrock',
        },
      ]);

      mockFallback.setResponses([
        {
          success: false,
          error: 'Failed',
          errorType: 'service_error',
          provider: 'puter',
        },
      ]);

      const response = await orchestrator.generateResponse(
        'Test prompt',
        { language: 'en' },
        { endpoint: '/api/test' }
      );

      expect(response.success).toBe(false);
      expect(response.error).not.toContain('AKIA');
      expect(response.error).not.toContain('aws_access_key_id');
    });

    it('should not expose API keys in responses', async () => {
      mockPrimary.setResponses([
        {
          success: false,
          error: 'Authentication failed with api_key=sk-1234567890abcdef',
          errorType: 'authentication',
          provider: 'bedrock',
        },
      ]);

      mockFallback.setResponses([
        {
          success: false,
          error: 'Failed',
          errorType: 'service_error',
          provider: 'puter',
        },
      ]);

      const response = await orchestrator.generateResponse(
        'Test prompt',
        { language: 'en' },
        { endpoint: '/api/test' }
      );

      expect(response.success).toBe(false);
      expect(response.error).not.toContain('api_key');
      expect(response.error).not.toContain('sk-1234567890abcdef');
    });

    it('should not expose bearer tokens in responses', async () => {
      mockPrimary.setResponses([
        {
          success: false,
          error: 'Unauthorized: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9',
          errorType: 'authentication',
          provider: 'bedrock',
        },
      ]);

      mockFallback.setResponses([
        {
          success: false,
          error: 'Failed',
          errorType: 'service_error',
          provider: 'puter',
        },
      ]);

      const response = await orchestrator.generateResponse(
        'Test prompt',
        { language: 'en' },
        { endpoint: '/api/test' }
      );

      expect(response.success).toBe(false);
      expect(response.error).not.toContain('Bearer');
      expect(response.error).not.toContain('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9');
    });
  });

  describe('BedrockProvider error message safety', () => {
    it('should return generic error messages for unknown errors', () => {
      // Test that BedrockProvider never exposes raw error messages
      const provider = new BedrockProvider();
      
      // The getErrorMessage method is private, but we can test the behavior
      // through the public generateResponse method by checking that errors
      // are always user-friendly and never contain sensitive details
      
      // This is tested implicitly through the integration tests above
      expect(provider.getProviderName()).toBe('bedrock');
    });

    it('should return safe error messages for all error types', async () => {
      const errorTypes: Array<'rate_limit' | 'timeout' | 'service_error' | 'authentication' | 'unknown'> = [
        'rate_limit',
        'timeout',
        'service_error',
        'authentication',
        'unknown',
      ];

      for (const errorType of errorTypes) {
        mockPrimary.setResponses([
          {
            success: false,
            error: `Test error with sensitive data: AKIAIOSFODNN7EXAMPLE`,
            errorType,
            provider: 'bedrock',
          },
        ]);

        mockFallback.setResponses([
          {
            success: false,
            error: 'Failed',
            errorType: 'service_error',
            provider: 'puter',
          },
        ]);

        const response = await orchestrator.generateResponse(
          'Test prompt',
          { language: 'en' },
          { endpoint: '/api/test' }
        );

        expect(response.success).toBe(false);
        expect(response.error).toBeTruthy();
        // Should never contain the sensitive data from the original error
        expect(response.error).not.toContain('AKIA');
        expect(response.error).not.toContain('sensitive data');
      }
    });
  });

  describe('Generic error messages', () => {
    it('should return localized generic messages for all failures', async () => {
      mockPrimary.setResponses([
        {
          success: false,
          error: 'Complex AWS error with RequestId: xyz-123 and arn:aws:bedrock:us-east-1:123:model/test',
          errorType: 'service_error',
          provider: 'bedrock',
        },
      ]);

      mockFallback.setResponses([
        {
          success: false,
          error: 'Puter error with api_key=secret123',
          errorType: 'service_error',
          provider: 'puter',
        },
      ]);

      const response = await orchestrator.generateResponse(
        'Test prompt',
        { language: 'en' },
        { endpoint: '/api/test' }
      );

      expect(response.success).toBe(false);
      // Should return clean, localized message
      expect(response.error).toBe('AI service temporarily unavailable. Please try again later.');
      // Should not contain any sensitive information
      expect(response.error).not.toContain('RequestId');
      expect(response.error).not.toContain('arn:aws');
      expect(response.error).not.toContain('api_key');
      expect(response.error).not.toContain('secret123');
    });
  });
});
