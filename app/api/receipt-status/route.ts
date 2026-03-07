import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import {
  createErrorResponse,
  logAndReturnError,
  ErrorCode,
} from "@/lib/error-utils";
import { parseOCRResult, OCRLambdaResult } from "@/lib/parsers/ocr-result-parser";
import crypto from "crypto";

const s3Client = new S3Client({
  region: process.env.AWS_S3_REGION || process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

const OUTPUT_BUCKET = process.env.AWS_S3_BUCKET_RECEIPTS_OUTPUT || process.env.S3_BUCKET_RECEIPTS || "vyapar-ai-receipts-975678946412";

/**
 * GET /api/receipt-status?filename={filename}
 * 
 * Poll for receipt OCR processing status
 * Returns: processing | completed | failed
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const filename = searchParams.get("filename");

    if (!filename) {
      logger.warn('No filename provided in receipt status request');
      return NextResponse.json(
        createErrorResponse(ErrorCode.INVALID_INPUT, 'errors.invalidInput'),
        { status: 400 }
      );
    }

    logger.info('Receipt status check', { filename });

    // Convert image filename to JSON result filename
    const resultKey = filename.replace(/\.[^.]+$/, '.json');

    try {
      // Try to fetch the result from S3 output bucket
      const getCommand = new GetObjectCommand({
        Bucket: OUTPUT_BUCKET,
        Key: resultKey,
      });

      const s3Response = await s3Client.send(getCommand);
      const resultBody = await streamToString(s3Response.Body);
      const ocrResult: OCRLambdaResult = JSON.parse(resultBody);

      logger.info('OCR result found', { filename, success: ocrResult.success });

      // Check if OCR processing was successful
      if (!ocrResult.success) {
        logger.warn('OCR processing failed', { filename });
        return NextResponse.json({
          status: 'failed',
          error: 'OCR processing failed',
          code: ErrorCode.OCR_SERVICE_ERROR,
        });
      }

      // Validate extracted data
      const { extractedData } = ocrResult;
      if (!extractedData || !extractedData.amount || extractedData.amount <= 0) {
        logger.warn('OCR result missing required data', { filename, extractedData });
        return NextResponse.json({
          status: 'failed',
          error: 'No transaction data found in receipt',
          code: ErrorCode.OCR_NO_DATA,
        });
      }

      // Generate file hash for deterministic ID
      const fileHash = crypto.createHash('sha256').update(filename).digest('hex').substring(0, 16);

      // Parse OCR result to InferredTransaction
      const inferredTransaction = parseOCRResult(ocrResult, fileHash);

      logger.info('Parsed inferred transaction', { 
        id: inferredTransaction.id,
        amount: inferredTransaction.amount,
        vendor: inferredTransaction.vendor_name
      });

      // Note: Duplicate detection happens client-side in localStorage
      // Server-side duplicate detection is not possible since pending transactions
      // are stored in browser localStorage (offline-first architecture)
      
      logger.info('OCR processing completed successfully', { 
        filename,
        transactionId: inferredTransaction.id
      });

      return NextResponse.json({
        status: 'completed',
        extractedData: ocrResult.extractedData,
        inferredTransaction,
      });

    } catch (s3Error: any) {
      // Check if file not found (still processing)
      if (s3Error.name === 'NoSuchKey' || s3Error.$metadata?.httpStatusCode === 404) {
        logger.info('OCR result not yet available', { filename });
        return NextResponse.json({
          status: 'processing',
          message: 'Receipt is being processed',
        });
      }

      // Check for timeout or service errors
      if (s3Error.name === 'TimeoutError' || s3Error.$metadata?.httpStatusCode === 504) {
        logger.warn('OCR processing timeout', { filename });
        return NextResponse.json({
          status: 'failed',
          error: 'Receipt processing took too long. Please try again.',
          code: ErrorCode.OCR_TIMEOUT,
        });
      }

      // Other S3 errors
      logger.error('S3 error checking receipt status', { 
        filename, 
        error: s3Error.message,
        code: s3Error.name
      });

      return NextResponse.json({
        status: 'failed',
        error: 'Receipt processing service temporarily unavailable',
        code: ErrorCode.OCR_SERVICE_ERROR,
      });
    }

  } catch (error) {
    return NextResponse.json(
      logAndReturnError(
        error as Error,
        ErrorCode.SERVER_ERROR,
        'errors.serverError',
        'en',
        { path: '/api/receipt-status' }
      ),
      { status: 500 }
    );
  }
}

/**
 * Convert readable stream to string
 */
async function streamToString(stream: any): Promise<string> {
  const chunks: Uint8Array[] = [];
  for await (const chunk of stream) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString('utf-8');
}
