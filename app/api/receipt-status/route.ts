import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { NextRequest, NextResponse } from "next/server";

const s3Client = new S3Client({
  region: process.env.AWS_S3_REGION || process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

const RESULTS_BUCKET = process.env.S3_BUCKET_VOICE || "vyapar-ai-voice-975678946412";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const filename = searchParams.get("filename");

    if (!filename) {
      return NextResponse.json(
        { success: false, error: "Filename is required" },
        { status: 400 }
      );
    }

    // Lambda saves results as: filename.json (replacing image extension)
    const resultKey = filename.replace(/\.[^.]+$/, '.json');

    console.log(`Checking for results: ${resultKey} in ${RESULTS_BUCKET}`);

    try {
      const command = new GetObjectCommand({
        Bucket: RESULTS_BUCKET,
        Key: resultKey,
      });

      const response = await s3Client.send(command);
      const resultData = await response.Body?.transformToString();

      if (!resultData) {
        return NextResponse.json({
          status: "processing",
          message: "Still processing...",
        });
      }

      const parsedResult = JSON.parse(resultData);

      // Check if processing was successful
      if (parsedResult.success && parsedResult.extractedData) {
        return NextResponse.json({
          status: "completed",
          extractedData: parsedResult.extractedData,
          processedAt: parsedResult.processedAt,
          processingTimeMs: parsedResult.processingTimeMs,
        });
      } else {
        return NextResponse.json({
          status: "error",
          error: parsedResult.extractedData?.error || "Processing failed",
        });
      }
    } catch (s3Error) {
      // If file doesn't exist yet, Lambda is still processing
      if (s3Error && typeof s3Error === 'object' && 'name' in s3Error && s3Error.name === "NoSuchKey") {
        return NextResponse.json({
          status: "processing",
          message: "Lambda is processing your receipt...",
        });
      }
      throw s3Error;
    }
  } catch (error) {
    console.error("Receipt status check error:", error);
    return NextResponse.json(
      {
        status: "error",
        error: error.message || "Failed to check receipt status",
      },
      { status: 500 }
    );
  }
}
