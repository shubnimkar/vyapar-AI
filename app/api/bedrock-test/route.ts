// Test API route for AWS Bedrock model invocation
import { NextRequest, NextResponse } from 'next/server';
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    const { testType = 'basic' } = await request.json();
    
    // Configuration check
    const config = {
      region: process.env.AWS_REGION,
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      modelId: process.env.BEDROCK_MODEL_ID,
    };
    
    // Check if credentials are configured
    if (!config.region || !config.accessKeyId || !config.secretAccessKey) {
      return NextResponse.json({
        success: false,
        error: 'AWS credentials not configured',
        details: {
          hasRegion: !!config.region,
          hasAccessKey: !!config.accessKeyId,
          hasSecretKey: !!config.secretAccessKey,
        }
      }, { status: 500 });
    }
    
    // Initialize Bedrock client
    const client = new BedrockRuntimeClient({
      region: config.region,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    });
    
    const modelId = config.modelId || 'global.amazon.nova-2-lite-v1:0';
    
    // Test prompts
    const testPrompts: Record<string, string> = {
      basic: 'Say "Hello from AWS Bedrock!" and nothing else.',
      math: 'What is 25 + 17? Provide only the number.',
      json: 'Return a JSON object with keys "status" and "message" where status is "ok" and message is "test successful".',
    };
    
    const prompt = testPrompts[testType] || testPrompts.basic;
    
    // Prepare request
    const input = {
      modelId,
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify({
        anthropic_version: 'bedrock-2023-05-31',
        max_tokens: 500,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      }),
    };
    
    // Invoke model
    const startTime = Date.now();
    const command = new InvokeModelCommand(input);
    const response = await client.send(command);
    const duration = Date.now() - startTime;
    
    // Parse response
    const responseBody = JSON.parse(new TextDecoder().decode(response.body));
    const content = responseBody.content?.[0]?.text || '';
    
    return NextResponse.json({
      success: true,
      testType,
      prompt,
      response: content,
      metadata: {
        modelId,
        region: config.region,
        duration: `${duration}ms`,
        stopReason: responseBody.stop_reason,
        usage: responseBody.usage,
      }
    });
    
  } catch (error: any) {
    logger.error('Bedrock test error', { 
      path: '/api/bedrock-test',
      error: error.message || 'Unknown error',
      errorName: error.name,
      errorCode: error.code,
      stack: error.stack,
      metadata: error.$metadata
    });
    
    return NextResponse.json({
      success: false,
      error: error.message || 'Unknown error',
      errorName: error.name,
      errorCode: error.code,
      details: {
        message: error.message,
        name: error.name,
        code: error.code,
        statusCode: error.$metadata?.httpStatusCode,
        requestId: error.$metadata?.requestId,
      }
    }, { status: 500 });
  }
}

export async function GET() {
  // Health check endpoint
  return NextResponse.json({
    status: 'ready',
    configured: !!(
      process.env.AWS_REGION &&
      process.env.AWS_ACCESS_KEY_ID &&
      process.env.AWS_SECRET_ACCESS_KEY
    ),
    region: process.env.AWS_REGION,
    modelId: process.env.BEDROCK_MODEL_ID,
  });
}
