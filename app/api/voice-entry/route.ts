import { NextRequest, NextResponse } from 'next/server';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { s3Client, S3_BUCKETS, createErrorResponse, logError, logInfo } from '@/lib/aws-config';

export async function POST(request: NextRequest) {
  try {
    logInfo('voice-entry', 'Received voice upload request');

    const formData = await request.formData();
    const audioFile = formData.get('audio') as File;

    if (!audioFile) {
      return NextResponse.json(
        { success: false, error: 'No audio file provided' },
        { status: 400 }
      );
    }

    // Validate file type
    const validTypes = ['audio/webm', 'audio/mp3', 'audio/wav', 'audio/m4a', 'audio/mpeg'];
    if (!validTypes.includes(audioFile.type)) {
      return NextResponse.json(
        { success: false, error: 'Invalid audio format' },
        { status: 400 }
      );
    }

    // Generate unique filename
    const timestamp = Date.now();
    const filename = `voice-${timestamp}-${audioFile.name}`;

    // Convert File to Buffer
    const arrayBuffer = await audioFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    logInfo('voice-entry', `Uploading to S3: ${filename}`, {
      size: buffer.length,
      type: audioFile.type,
    });

    // Upload to S3
    const uploadCommand = new PutObjectCommand({
      Bucket: S3_BUCKETS.VOICE,
      Key: filename,
      Body: buffer,
      ContentType: audioFile.type,
    });

    await s3Client.send(uploadCommand);

    logInfo('voice-entry', `Successfully uploaded: ${filename}`);

    // Poll for Lambda result (Lambda will be triggered by S3)
    const result = await pollForResult(filename);

    if (result) {
      return NextResponse.json({
        success: true,
        data: result,
      });
    } else {
      return NextResponse.json({
        success: false,
        error: 'Processing timeout - please try again',
      }, { status: 408 });
    }
  } catch (error: any) {
    logError('voice-entry', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Upload failed' },
      { status: 500 }
    );
  }
}

async function pollForResult(filename: string, maxAttempts = 30): Promise<any> {
  const resultKey = filename.replace(/\.[^.]+$/, '.json');

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
    } catch (error: any) {
      if (error.name !== 'NoSuchKey') {
        logError('voice-entry-poll', error);
      }
    }

    // Wait 2 seconds before next attempt
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  return null;
}
