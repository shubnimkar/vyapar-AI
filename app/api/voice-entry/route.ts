import { NextRequest, NextResponse } from 'next/server';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { s3Client, S3_BUCKETS } from '@/lib/aws-config';
import { logger } from '@/lib/logger';
import { 
  createErrorResponse, 
  logAndReturnError, 
  ErrorCode, 
  BODY_SIZE_LIMITS 
} from '@/lib/error-utils';

export async function POST(request: NextRequest) {
  try {
    logger.info('Voice entry request received', {
      path: '/api/voice-entry'
    });

    const formData = await request.formData();
    const audioFile = formData.get('audio') as File;
    const language = formData.get('language') as string || 'en';

    if (!audioFile) {
      logger.warn('Missing audio file in voice entry request');
      return NextResponse.json(
        createErrorResponse(ErrorCode.INVALID_INPUT, 'errors.invalidInput'),
        { status: 400 }
      );
    }

    // Validate file size (10MB limit for uploads)
    if (audioFile.size > BODY_SIZE_LIMITS.UPLOAD) {
      logger.warn('Audio file too large', {
        size: audioFile.size,
        limit: BODY_SIZE_LIMITS.UPLOAD
      });
      return NextResponse.json(
        createErrorResponse(ErrorCode.BODY_TOO_LARGE, 'errors.bodyTooLarge'),
        { status: 413 }
      );
    }

    // Validate file type
    const validTypes = ['audio/webm', 'audio/mp3', 'audio/wav', 'audio/m4a', 'audio/mpeg'];
    if (!validTypes.includes(audioFile.type)) {
      logger.warn('Invalid audio format in voice entry request', {
        providedType: audioFile.type
      });
      return NextResponse.json(
        createErrorResponse(ErrorCode.INVALID_INPUT, 'errors.invalidInput'),
        { status: 400 }
      );
    }

    // Generate unique filename
    const timestamp = Date.now();
    const filename = `voice-${language}-${timestamp}-${audioFile.name}`;

    // Convert File to Buffer
    const arrayBuffer = await audioFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    logger.info('Uploading voice file to S3', {
      filename,
      size: buffer.length,
      type: audioFile.type
    });

    // Upload to S3
    const uploadCommand = new PutObjectCommand({
      Bucket: S3_BUCKETS.VOICE,
      Key: `uploads/${filename}`,
      Body: buffer,
      ContentType: audioFile.type,
    });

    await s3Client.send(uploadCommand);

    logger.info('Voice file uploaded successfully', { filename });

    // Poll for Lambda result (Lambda will be triggered by S3)
    const result = await pollForResult(filename);

    if (result) {
      logger.info('Voice entry processed successfully', { filename });
      return NextResponse.json({
        success: true,
        data: result,
      });
    } else {
      logger.warn('Voice entry processing timeout', { filename });
      return NextResponse.json(
        createErrorResponse(ErrorCode.SERVER_ERROR, 'errors.serverError'),
        { status: 408 }
      );
    }
  } catch (error) {
    return NextResponse.json(
      logAndReturnError(
        error as Error,
        ErrorCode.SERVER_ERROR,
        'errors.serverError',
        'en',
        { path: '/api/voice-entry' }
      ),
      { status: 500 }
    );
  }
}

async function pollForResult(filename: string, maxAttempts = 30): Promise<any> {
  // filename is already "voice-1772986104733-voice-1772986104656.webm"
  // Lambda saves to: results/uploads/voice-1772986104733-voice-1772986104656.json
  const resultKey = `uploads/${filename.replace(/\.[^.]+$/, '.json')}`;

  for (let i = 0; i < maxAttempts; i++) {
    try {
      const { GetObjectCommand } = await import('@aws-sdk/client-s3');
      const command = new GetObjectCommand({
        Bucket: S3_BUCKETS.VOICE,
        Key: `results/${resultKey}`,
      });

      const response = await s3Client.send(command);
      const body = await response.Body?.transformToString();

      if (body) {
        const result = JSON.parse(body);
        return result.extractedData;
      }
    } catch (error) {
      if (error && typeof error === 'object' && 'name' in error && error.name !== 'NoSuchKey') {
        logger.error('Error polling for voice entry result', {
          error: error instanceof Error ? error.message : 'Unknown error',
          filename,
          attempt: i + 1
        });
      }
    }

    // Wait 2 seconds before next attempt
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  return null;
}
