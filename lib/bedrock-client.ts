// AWS Bedrock client for AI analysis

import {
  BedrockRuntimeClient,
  InvokeModelCommand,
  InvokeModelCommandInput,
} from '@aws-sdk/client-bedrock-runtime';
import { invokeMockBedrock } from './bedrock-client-mock';
import { Language } from './types';

// Check if mock mode is enabled
const USE_MOCK = process.env.USE_MOCK_AI === 'true';

// Initialize Bedrock client with credentials from environment variables
const client = new BedrockRuntimeClient({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    ...(process.env.AWS_SESSION_TOKEN ? { sessionToken: process.env.AWS_SESSION_TOKEN } : {}),
  },
});

const MODEL_ID = process.env.BEDROCK_MODEL_ID || 'anthropic.claude-3-sonnet-20240229-v1:0';

export interface BedrockResponse {
  success: boolean;
  content?: string;
  error?: string;
  errorType?: 'throttling' | 'timeout' | 'service_error' | 'unknown';
}

/**
 * Invoke AWS Bedrock model with retry logic
 * If USE_MOCK_AI is enabled, uses mock responses instead
 */
export async function invokeBedrockModel(
  prompt: string,
  maxRetries: number = 2,
  language: Language = 'en'
): Promise<BedrockResponse> {
  // Use mock mode if enabled
  if (USE_MOCK) {
    try {
      const content = await invokeMockBedrock(prompt, language);
      return {
        success: true,
        content,
      };
    } catch (error: any) {
      return {
        success: false,
        error: 'Mock AI failed. Please try again.',
        errorType: 'unknown',
      };
    }
  }
  
  let lastError: any;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const input: InvokeModelCommandInput = {
        modelId: MODEL_ID,
        contentType: 'application/json',
        accept: 'application/json',
        body: JSON.stringify({
          anthropic_version: 'bedrock-2023-05-31',
          max_tokens: 2000,
          messages: [
            {
              role: 'user',
              content: prompt,
            },
          ],
        }),
      };
      
      const command = new InvokeModelCommand(input);
      const response = await client.send(command);
      
      // Parse response body
      const responseBody = JSON.parse(new TextDecoder().decode(response.body));
      
      // Extract content from Claude response
      const content = responseBody.content?.[0]?.text || '';
      
      return {
        success: true,
        content,
      };
      
    } catch (error: any) {
      lastError = error;
      
      // Check error type
      if (error.name === 'ThrottlingException') {
        // Wait before retry with exponential backoff
        if (attempt < maxRetries) {
          const waitTime = Math.pow(2, attempt) * 1000; // 1s, 2s, 4s
          await new Promise(resolve => setTimeout(resolve, waitTime));
          continue;
        }
        
        return {
          success: false,
          error: 'Too many requests. Please try again in a moment.',
          errorType: 'throttling',
        };
      }
      
      if (error.name === 'TimeoutError' || error.code === 'ETIMEDOUT') {
        return {
          success: false,
          error: 'Request timed out. Please try again.',
          errorType: 'timeout',
        };
      }
      
      if (error.name === 'ServiceUnavailableException') {
        return {
          success: false,
          error: 'AI service is temporarily unavailable. Please try again later.',
          errorType: 'service_error',
        };
      }
      
      // Don't retry on other errors
      break;
    }
  }
  
  // Generic error
  return {
    success: false,
    error: lastError?.message || 'Failed to get AI response. Please try again.',
    errorType: 'unknown',
  };
}

/**
 * Check if Bedrock credentials are configured
 */
export function isBedrockConfigured(): boolean {
  return !!(
    process.env.AWS_REGION &&
    process.env.AWS_ACCESS_KEY_ID &&
    process.env.AWS_SECRET_ACCESS_KEY
  );
}
