import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import {
  createErrorResponse,
  logAndReturnError,
  ErrorCode,
  BODY_SIZE_LIMITS
} from "@/lib/error-utils";

// App Router route segment config
// NOTE: body size limit for App Router is set in next.config.mjs under
// experimental.serverActions / serverComponentsExternalPackages — NOT here.
// The 'export const config' block only works in Pages Router and is ignored here.
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 30;

const s3Client = new S3Client({
  region: process.env.AWS_S3_REGION || process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

const BUCKET_NAME = process.env.AWS_S3_BUCKET_RECEIPTS || "vyapar-receipts-input";

export async function POST(request: NextRequest) {
  try {
    logger.info('Receipt OCR request received', {
      path: '/api/receipt-ocr'
    });

    const formData = await request.formData();
    const file = formData.get("file") as File;
    
    if (!file) {
      logger.warn('No file provided in receipt OCR request');
      return NextResponse.json(
        createErrorResponse(ErrorCode.INVALID_INPUT, 'errors.invalidInput'),
        { status: 400 }
      );
    }

    // Validate body size (10MB limit for uploads)
    if (file.size > BODY_SIZE_LIMITS.UPLOAD) {
      logger.warn('File size exceeds upload limit', {
        size: file.size,
        limit: BODY_SIZE_LIMITS.UPLOAD
      });
      return NextResponse.json(
        createErrorResponse(ErrorCode.BODY_TOO_LARGE, 'errors.bodyTooLarge'),
        { status: 413 }
      );
    }

    // Validate file type
    if (!file.type.startsWith("image/")) {
      logger.warn('Invalid file type in receipt OCR request', { fileType: file.type });
      return NextResponse.json(
        createErrorResponse(ErrorCode.INVALID_INPUT, 'errors.invalidInput'),
        { status: 400 }
      );
    }

    // Generate unique filename
    const timestamp = Date.now();
    const filename = `receipt-${timestamp}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    
    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Upload to S3 - Lambda will be triggered automatically
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: filename,
      Body: buffer,
      ContentType: file.type,
      Metadata: {
        uploadedAt: new Date().toISOString(),
      },
    });

    await s3Client.send(command);

    logger.info('Receipt uploaded successfully', { filename });

    // Return success - Lambda will process asynchronously
    return NextResponse.json({
      success: true,
      message: "Receipt uploaded successfully",
      filename: filename,
      timestamp: timestamp,
    });
  } catch (error) {
    // PayloadTooLargeError — image exceeded Next.js body limit
    // Return JSON 413 so the client never sees a raw HTML error page
    const err = error as Error;
    if (
      err.message?.includes('Body exceeded') ||
      err.message?.includes('too large') ||
      (err as any).statusCode === 413
    ) {
      logger.warn('Upload body too large (caught in handler)', {
        message: err.message,
        path: '/api/receipt-ocr'
      });
      return NextResponse.json(
        createErrorResponse(ErrorCode.BODY_TOO_LARGE, 'errors.bodyTooLarge'),
        { status: 413 }
      );
    }

    return NextResponse.json(
      logAndReturnError(
        err,
        ErrorCode.SERVER_ERROR,
        'errors.serverError',
        'en',
        { path: '/api/receipt-ocr' }
      ),
      { status: 500 }
    );
  }
}
