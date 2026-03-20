import { S3Client } from "@aws-sdk/client-s3";
import { LambdaClient } from "@aws-sdk/client-lambda";
import { BedrockRuntimeClient } from "@aws-sdk/client-bedrock-runtime";
import { TranscribeClient } from "@aws-sdk/client-transcribe";
import { logger } from './logger';

// AWS SDK v3 Configuration
const AWS_REGION = process.env.AWS_REGION || 'ap-south-1';
const AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID;
const AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY;
const AWS_SESSION_TOKEN = process.env.AWS_SESSION_TOKEN;

if (!AWS_ACCESS_KEY_ID || !AWS_SECRET_ACCESS_KEY) {
  logger.warn('AWS credentials not configured. Some features may not work.');
}

const awsConfig = {
  region: AWS_REGION,
  credentials: {
    accessKeyId: AWS_ACCESS_KEY_ID || '',
    secretAccessKey: AWS_SECRET_ACCESS_KEY || '',
    ...(AWS_SESSION_TOKEN ? { sessionToken: AWS_SESSION_TOKEN } : {}),
  },
};

// Initialize AWS clients
export const s3Client = new S3Client(awsConfig);
export const lambdaClient = new LambdaClient(awsConfig);
export const bedrockClient = new BedrockRuntimeClient(awsConfig);
export const transcribeClient = new TranscribeClient(awsConfig);

// S3 Bucket names
export const S3_BUCKETS = {
  VOICE: process.env.AWS_S3_BUCKET_VOICE || 'vyapar-voice',
  RECEIPTS: process.env.AWS_S3_BUCKET_RECEIPTS || 'vyapar-receipts-input',
  RESULTS: process.env.AWS_S3_BUCKET_RESULTS || 'vyapar-receipts-output',
};

// Lambda function names
export const LAMBDA_FUNCTIONS = {
  VOICE_PROCESSOR: 'voice-processor',
  CASHFLOW_PREDICTOR: 'cashflow-predictor',
  EXPENSE_ALERT: 'expense-alert',
  REPORT_GENERATOR: 'report-generator',
};

// Bedrock model ID
export const BEDROCK_MODEL_ID = process.env.BEDROCK_MODEL_ID || 'global.amazon.nova-2-lite-v1:0';

// Error handling utilities
export interface LambdaErrorResponse {
  error: string;
  message: string;
  timestamp: string;
  details?: any;
}

export function createErrorResponse(error: Error, details?: any): LambdaErrorResponse {
  return {
    error: error.name,
    message: error.message,
    timestamp: new Date().toISOString(),
    details,
  };
}

export function logError(context: string, error: Error, additionalInfo?: any): void {
  logger.error(`[${context}] Error`, {
    name: error.name,
    message: error.message,
    stack: error.stack,
    ...additionalInfo,
  });
}

export function logInfo(context: string, message: string, data?: any): void {
  logger.info(`[${context}] ${message}`, data || undefined);
}

export function logMilestone(context: string, milestone: string, data?: any): void {
  logger.info(`[${context}] MILESTONE: ${milestone}`, data || undefined);
}
