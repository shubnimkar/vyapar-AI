import { S3Client, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { TranscribeClient, StartTranscriptionJobCommand, GetTranscriptionJobCommand } from "@aws-sdk/client-transcribe";
import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";

const AWS_REGION = process.env.AWS_REGION || 'ap-south-1';
const s3Client = new S3Client({ region: AWS_REGION });
const transcribeClient = new TranscribeClient({ region: AWS_REGION });
const bedrockClient = new BedrockRuntimeClient({ region: AWS_REGION });

const BEDROCK_MODEL_ID = process.env.BEDROCK_MODEL_ID || 'global.amazon.nova-2-lite-v1:0';
const RESULTS_BUCKET = process.env.RESULTS_BUCKET || 'vyapar-voice';

export const handler = async (event) => {
  console.log("Event:", JSON.stringify(event, null, 2));

  try {
    // Get the uploaded file info from S3 event
    const record = event.Records[0];
    const bucket = record.s3.bucket.name;
    const key = decodeURIComponent(record.s3.object.key.replace(/\+/g, ' '));

    console.log(`Processing file: ${key} from bucket: ${bucket}`);

    // Start transcription job
    const jobName = `transcribe-${Date.now()}`;
    const transcribeCommand = new StartTranscriptionJobCommand({
      TranscriptionJobName: jobName,
      LanguageCode: 'hi-IN',
      MediaFormat: 'webm',
      Media: {
        MediaFileUri: `s3://${bucket}/${key}`,
      },
      OutputBucketName: bucket,
    });

    console.log("Starting transcription job...");
    await transcribeClient.send(transcribeCommand);

    // Poll for transcription completion
    let transcript = null;
    for (let i = 0; i < 30; i++) {
      await new Promise(resolve => setTimeout(resolve, 2000));

      const getJobCommand = new GetTranscriptionJobCommand({
        TranscriptionJobName: jobName,
      });

      const jobResult = await transcribeClient.send(getJobCommand);
      const status = jobResult.TranscriptionJob.TranscriptionJobStatus;

      console.log(`Transcription status: ${status}`);

      if (status === 'COMPLETED') {
        // Get transcript from S3 using AWS SDK (has proper permissions)
        const transcriptUri = jobResult.TranscriptionJob.Transcript.TranscriptFileUri;
        console.log(`Transcript URI: ${transcriptUri}`);
        
        // Parse S3 URL: https://s3.region.amazonaws.com/bucket-name/key
        // or https://bucket-name.s3.region.amazonaws.com/key
        const url = new URL(transcriptUri);
        let transcriptBucket, transcriptKey;
        
        if (url.hostname.startsWith('s3.')) {
          // Path-style URL: https://s3.region.amazonaws.com/bucket/key
          const pathParts = url.pathname.substring(1).split('/');
          transcriptBucket = pathParts[0];
          transcriptKey = pathParts.slice(1).join('/');
        } else {
          // Virtual-hosted-style URL: https://bucket.s3.region.amazonaws.com/key
          transcriptBucket = url.hostname.split('.')[0];
          transcriptKey = url.pathname.substring(1);
        }
        
        console.log(`Fetching transcript from bucket: ${transcriptBucket}, key: ${transcriptKey}`);
        
        const getTranscriptCommand = new GetObjectCommand({
          Bucket: transcriptBucket,
          Key: transcriptKey,
        });
        
        const transcriptObject = await s3Client.send(getTranscriptCommand);
        const transcriptText = await transcriptObject.Body.transformToString();
        const transcriptData = JSON.parse(transcriptText);
        transcript = transcriptData.results.transcripts[0].transcript;
        console.log(`Transcript: ${transcript}`);
        break;
      } else if (status === 'FAILED') {
        throw new Error('Transcription failed');
      }
    }

    if (!transcript) {
      throw new Error('Transcription timeout');
    }

    // Extract structured data using Bedrock
    const todayDate = new Date().toISOString().split('T')[0]; // Get today's date in YYYY-MM-DD format
    
    const prompt = `You are a data extraction assistant for a business accounting system.
Extract the following information from this Hindi transcript:
- Sales amount (number)
- Expense amount (number)
- Expense category (string)
- Inventory changes (string description)
- Date mentioned (YYYY-MM-DD format)

IMPORTANT: If no specific date is mentioned in the transcript, you MUST use today's date: ${todayDate}

Transcript: ${transcript}

Return ONLY valid JSON format:
{
  "sales": number or null,
  "expenses": number or null,
  "expenseCategory": string or null,
  "inventoryChanges": string or null,
  "date": "YYYY-MM-DD",
  "confidence": number (0-1)
}`;

    // Amazon Nova format
    const bedrockPayload = {
      messages: [
        {
          role: "user",
          content: [
            {
              text: prompt,
            },
          ],
        },
      ],
      inferenceConfig: {
        max_new_tokens: 500,
      },
    };

    console.log("Calling Bedrock for data extraction...");
    console.log(`🌍 Bedrock Region: ${AWS_REGION}`);
    console.log(`🤖 Bedrock Model ID: ${BEDROCK_MODEL_ID}`);

    const bedrockCommand = new InvokeModelCommand({
      modelId: BEDROCK_MODEL_ID,
      contentType: "application/json",
      accept: "application/json",
      body: JSON.stringify(bedrockPayload),
    });

    const bedrockResponse = await bedrockClient.send(bedrockCommand);
    const responseBody = JSON.parse(new TextDecoder().decode(bedrockResponse.body));

    console.log("Bedrock response:", JSON.stringify(responseBody, null, 2));

    // Nova response format: output.message.content[0].text
    const extractedText = responseBody.output.message.content[0].text;

    // Parse the JSON from the response
    let extractedData;
    try {
      const jsonMatch = extractedText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        extractedData = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON found in response");
      }
    } catch (parseError) {
      console.error("Failed to parse Bedrock response:", extractedText);
      extractedData = {
        sales: null,
        expenses: null,
        expenseCategory: null,
        inventoryChanges: null,
        date: new Date().toISOString().split("T")[0],
        confidence: 0,
      };
    }

    console.log("Extracted data:", JSON.stringify(extractedData, null, 2));

    // Save results to S3
    const resultKey = `results/${key.replace(/\.[^.]+$/, '.json')}`;
    const putCommand = new PutObjectCommand({
      Bucket: RESULTS_BUCKET,
      Key: resultKey,
      Body: JSON.stringify({
        success: true,
        filename: key,
        transcript: transcript,
        extractedData: extractedData,
        processedAt: new Date().toISOString(),
      }),
      ContentType: "application/json",
    });

    await s3Client.send(putCommand);

    console.log(`Results saved to: ${RESULTS_BUCKET}/${resultKey}`);

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Voice processed successfully",
        resultKey: resultKey,
      }),
    };
  } catch (error) {
    console.error("Error processing voice:", error);

    return {
      statusCode: 500,
      body: JSON.stringify({
        message: "Failed to process voice",
        error: error.message,
        timestamp: new Date().toISOString(),
      }),
    };
  }
};
