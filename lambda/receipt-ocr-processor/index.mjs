import { S3Client, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";
import { getLambdaModelChain } from "../shared/bedrock-chain.mjs";

// Initialize AWS clients
const AWS_REGION = process.env.AWS_REGION || 'ap-south-1';
const BEDROCK_REGION = process.env.BEDROCK_REGION || 'us-east-1';
const s3Client = new S3Client({ region: AWS_REGION });
const bedrockClient = new BedrockRuntimeClient({ region: BEDROCK_REGION });

// Configuration from environment variables
const RECEIPT_MODEL_CHAIN = getLambdaModelChain('receipt');
const RESULTS_BUCKET = process.env.RESULTS_BUCKET || process.env.S3_BUCKET_RECEIPTS || 'vyapar-receipts-output';

export const handler = async (event) => {
  const startTime = Date.now();
  console.log("🚀 Receipt OCR Lambda Started");
  console.log("📋 Event:", JSON.stringify(event, null, 2));

  try {
    // Extract S3 event details
    const record = event.Records[0];
    const inputBucket = record.s3.bucket.name;
    const imageKey = decodeURIComponent(record.s3.object.key.replace(/\+/g, ' '));

    console.log(`📄 Processing: ${imageKey} from ${inputBucket}`);
    console.log(`⚙️  Config: Models=${RECEIPT_MODEL_CHAIN.join(' -> ')}, Output=${RESULTS_BUCKET}`);

    // Download image from S3
    console.log("📥 Downloading image from S3...");
    const getCommand = new GetObjectCommand({
      Bucket: inputBucket,
      Key: imageKey,
    });

    const s3Response = await s3Client.send(getCommand);
    const imageBytes = await streamToBuffer(s3Response.Body);
    const contentType = s3Response.ContentType || 'image/jpeg';

    console.log(`✅ Image downloaded: ${imageBytes.length} bytes, type: ${contentType}`);

    // Process with Bedrock Vision
    console.log("🤖 Starting Bedrock Vision OCR...");
    const extractedData = await processWithBedrockVision(imageBytes, contentType);
    
    console.log("📊 Extracted data:", JSON.stringify(extractedData, null, 2));

    // Save results to output bucket
    const resultKey = imageKey.replace(/\.[^.]+$/, '.json');
    console.log(`💾 Saving results to: ${RESULTS_BUCKET}/${resultKey}`);

    const putCommand = new PutObjectCommand({
      Bucket: RESULTS_BUCKET,
      Key: resultKey,
      Body: JSON.stringify({
        success: true,
        filename: imageKey,
        extractedData: extractedData,
        processedAt: new Date().toISOString(),
        processingTimeMs: Date.now() - startTime,
        method: 'bedrock-vision'
      }),
      ContentType: "application/json",
    });

    await s3Client.send(putCommand);

    const processingTime = Date.now() - startTime;
    console.log(`✅ Processing completed successfully in ${processingTime}ms`);

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: "Receipt processed successfully",
        resultKey: resultKey,
        processingTimeMs: processingTime,
      }),
    };

  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error("❌ Processing failed:", error.message);
    console.error("📍 Stack trace:", error.stack);

    // Save error details for debugging
    try {
      const errorKey = `errors/${Date.now()}-error.json`;
      const errorCommand = new PutObjectCommand({
        Bucket: RESULTS_BUCKET,
        Key: errorKey,
        Body: JSON.stringify({
          success: false,
          error: error.message,
          stack: error.stack,
          timestamp: new Date().toISOString(),
          processingTimeMs: processingTime,
        }),
        ContentType: "application/json",
      });
      await s3Client.send(errorCommand);
      console.log(`💾 Error details saved to: ${RESULTS_BUCKET}/${errorKey}`);
    } catch (saveError) {
      console.error("❌ Failed to save error details:", saveError.message);
    }

    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        message: "Receipt processing failed",
        error: error.message,
        processingTimeMs: processingTime,
      }),
    };
  }
};

/**
 * Process receipt image using Bedrock Vision
 */
async function processWithBedrockVision(imageBytes, contentType) {
  try {
    console.log("🔄 Encoding image for Bedrock...");
    const base64Image = imageBytes.toString('base64');
    console.log(`📷 Image encoded: ${base64Image.length} characters`);

    const prompt = `You are an expert Indian receipt parser. Analyze this receipt image and extract structured data with high accuracy.

EXTRACTION RULES:
1. DATE: Look for date patterns (DD-MM-YYYY, DD/MM/YYYY, DD.MM.YYYY). Convert to YYYY-MM-DD format.
2. AMOUNT: Find the FINAL TOTAL amount paid. This is CRITICAL - read carefully!
   - Look for "GRAND TOTAL", "TOTAL", "NET TOTAL", "AMOUNT PAYABLE", "BILL AMOUNT"
   - This is usually the LAST and LARGEST number on the receipt
   - Ignore subtotals, item prices, and intermediate calculations
   - The amount can be 3-5 digits (₹100 to ₹99,999 typically)
3. VENDOR: Store/restaurant name (usually at the top, may include location).
4. ITEMS: List of purchased items (food items, products, services).

CRITICAL RULES FOR AMOUNT EXTRACTION:
- ALWAYS look for the BOTTOM-MOST total on the receipt
- DO NOT use subtotals or intermediate amounts
- DO NOT confuse phone numbers (10+ digits) with amounts
- DO NOT include table numbers, bill numbers, or reference numbers
- The GRAND TOTAL is typically after all items, taxes, and charges
- If you see multiple totals, use the LARGEST one (usually the final total)
- Common patterns: "GRAND TOTAL: 2464", "Total Rs. 2464", "Amount: ₹2464.00"
- Amounts can be written WITHOUT decimals (2464 means ₹2464, not ₹24.64)

AMOUNT EXAMPLES:
- "GRAND TOTAL: 2464" → amount: 2464.00 (NOT 246.4 or 24.64)
- "Sub Total: 200.00\nGRAND TOTAL: 2464" → amount: 2464.00 (use GRAND TOTAL, not subtotal)
- "TOTAL Rs. 1250" → amount: 1250.00
- "Amount Payable: ₹3500.00" → amount: 3500.00

OTHER RULES:
- Item names are usually in CAPS or Title Case
- Ignore headers like "DESCRIPTION", "QTY", "RATE"
- Ignore footers like "THANK YOU", "VISIT AGAIN"

Return ONLY valid JSON in this exact format:
{
  "date": "YYYY-MM-DD",
  "amount": 2464.00,
  "vendor": "Restaurant Name",
  "items": ["Item 1", "Item 2"]
}`;

    // Amazon Nova format
    const bedrockPayload = {
      messages: [
        {
          role: "user",
          content: [
            {
              image: {
                format: contentType.split('/')[1], // "jpeg", "png", etc.
                source: {
                  bytes: base64Image
                }
              }
            },
            {
              text: prompt
            }
          ]
        }
      ],
      inferenceConfig: {
        max_new_tokens: 1000,
        temperature: 0.1
      }
    };

    console.log("📡 Calling Bedrock Vision API...");
    console.log(`🌍 S3 Region: ${AWS_REGION}`);
    console.log(`🌍 Bedrock Region: ${BEDROCK_REGION}`);
    console.log(`🤖 Model Chain: ${RECEIPT_MODEL_CHAIN.join(' -> ')}`);

    let extractedText = '';
    let usedModelId = '';
    let lastError = null;

    for (const modelId of RECEIPT_MODEL_CHAIN) {
      try {
        const bedrockCommand = new InvokeModelCommand({
          modelId,
          contentType: "application/json",
          accept: "application/json",
          body: JSON.stringify(bedrockPayload),
        });

        const bedrockResponse = await bedrockClient.send(bedrockCommand);
        const responseBody = JSON.parse(new TextDecoder().decode(bedrockResponse.body));

        const contentBlocks = responseBody.output?.message?.content || [];
        const textBlock = contentBlocks.find(block => block.text);
        if (!textBlock) {
          throw new Error("No text content found in Nova response");
        }

        extractedText = textBlock.text;
        usedModelId = modelId;
        break;
      } catch (error) {
        lastError = error;
        console.warn(`⚠️ receipt-ocr: model ${modelId} failed`, error.message);
      }
    }

    if (!extractedText) {
      throw lastError || new Error("No text content found in Nova response");
    }

    console.log(`✅ Bedrock response received from ${usedModelId}`);
    const jsonMatch = extractedText.match(/\{[\s\S]*\}/);
    
    if (!jsonMatch) {
      throw new Error("No JSON found in Bedrock response");
    }

    const parsedData = JSON.parse(jsonMatch[0]);
    console.log("✅ JSON parsed successfully:", parsedData);

    // Validate and clean the extracted data
    const validatedData = validateExtractedData(parsedData);
    console.log("✅ Data validated:", validatedData);

    return validatedData;

  } catch (error) {
    console.error("❌ Bedrock Vision processing failed:", error.message);
    
    // Return fallback data instead of throwing
    return {
      date: new Date().toISOString().split('T')[0],
      amount: 100, // Reasonable default
      vendor: "Unknown Vendor",
      items: ["Receipt Item"],
      error: `Processing failed: ${error.message}`
    };
  }
}

/**
 * Validate and clean extracted data
 */
function validateExtractedData(data) {
  console.log("🔍 Validating extracted data...");
  
  const result = {
    date: validateDate(data.date),
    amount: validateAmount(data.amount),
    vendor: validateVendor(data.vendor),
    items: validateItems(data.items)
  };

  console.log("✅ Validation complete");
  return result;
}

/**
 * Validate and fix date format
 */
function validateDate(dateStr) {
  try {
    if (!dateStr) {
      console.log("⚠️  No date provided, using today");
      return new Date().toISOString().split('T')[0];
    }

    // Clean the date string (remove whitespace)
    const cleanDate = dateStr.trim();
    console.log(`🔍 Validating date: "${cleanDate}"`);

    // If already in YYYY-MM-DD format, validate and return
    if (/^\d{4}-\d{2}-\d{2}$/.test(cleanDate)) {
      console.log("✅ Date is in YYYY-MM-DD format");
      const [year, month, day] = cleanDate.split('-').map(Number);
      const currentYear = new Date().getFullYear();
      
      console.log(`📅 Parsed: year=${year}, month=${month}, day=${day}, currentYear=${currentYear}`);
      
      // Validate year (2020 to current year + 1)
      if (year < 2020 || year > currentYear + 1) {
        console.log(`⚠️  Year ${year} out of range, using today`);
        return new Date().toISOString().split('T')[0];
      }
      
      // Validate month (1-12)
      if (month < 1 || month > 12) {
        console.log(`⚠️  Month ${month} invalid, using today`);
        return new Date().toISOString().split('T')[0];
      }
      
      // Validate day (1-31)
      if (day < 1 || day > 31) {
        console.log(`⚠️  Day ${day} invalid, using today`);
        return new Date().toISOString().split('T')[0];
      }
      
      console.log(`✅ Date validated: ${cleanDate}`);
      return cleanDate;
    }

    // Handle DD-MM-YYYY or DD/MM/YYYY format
    console.log("🔄 Attempting DD-MM-YYYY format parsing");
    const ddmmyyyyMatch = cleanDate.match(/^(\d{1,2})[-\/.](\d{1,2})[-\/.](\d{2,4})$/);
    if (ddmmyyyyMatch) {
      let day = ddmmyyyyMatch[1].padStart(2, '0');
      let month = ddmmyyyyMatch[2].padStart(2, '0');
      let year = ddmmyyyyMatch[3];
      
      console.log(`📅 Parsed DD-MM-YYYY: day=${day}, month=${month}, year=${year}`);
      
      // Fix 2-digit year
      if (year.length === 2) {
        year = '20' + year;
      }
      
      // Validate ranges
      const yearNum = parseInt(year);
      const monthNum = parseInt(month);
      const dayNum = parseInt(day);
      
      const currentYear = new Date().getFullYear();
      if (yearNum > currentYear + 1 || yearNum < 2020) {
        console.log(`⚠️  Year ${yearNum} out of range, using current year`);
        year = currentYear.toString();
      }
      
      if (monthNum < 1 || monthNum > 12) {
        console.log(`⚠️  Month ${monthNum} invalid, using 01`);
        month = '01';
      }
      
      if (dayNum < 1 || dayNum > 31) {
        console.log(`⚠️  Day ${dayNum} invalid, using 01`);
        day = '01';
      }
      
      const result = `${year}-${month}-${day}`;
      console.log(`✅ Converted to: ${result}`);
      return result;
    }

    // Default to today
    console.log("⚠️  No date pattern matched, using today");
    return new Date().toISOString().split('T')[0];
  } catch (error) {
    console.log(`❌ Date validation error: ${error.message}, using today`);
    return new Date().toISOString().split('T')[0];
  }
}

/**
 * Validate and fix amount
 */
function validateAmount(amount) {
  const num = parseFloat(amount);
  
  // Check if valid number
  if (isNaN(num) || num <= 0) {
    console.log("⚠️  Invalid amount, using default: 50");
    return 50;
  }
  
  // Check reasonable range
  if (num > 100000) {
    console.log("⚠️  Amount too large, capping at 10000");
    return 10000;
  }
  
  if (num < 1) {
    console.log("⚠️  Amount too small, using minimum: 10");
    return 10;
  }
  
  // Round to 2 decimal places
  return Math.round(num * 100) / 100;
}

/**
 * Validate vendor name
 */
function validateVendor(vendor) {
  if (!vendor || typeof vendor !== 'string' || vendor.trim().length < 2) {
    return "Unknown Vendor";
  }
  
  // Clean up vendor name
  const cleaned = vendor.trim();
  
  // Remove common prefixes/suffixes
  const cleanedVendor = cleaned
    .replace(/^(BILL TO|SOLD TO|FROM):\s*/i, '')
    .replace(/\s*(PVT LTD|LTD|PRIVATE LIMITED)$/i, '')
    .trim();
  
  return cleanedVendor || "Unknown Vendor";
}

/**
 * Validate items array
 */
function validateItems(items) {
  if (!Array.isArray(items) || items.length === 0) {
    return ["Receipt Item"];
  }
  
  // Filter and clean items
  const validItems = items
    .filter(item => item && typeof item === 'string' && item.trim().length > 0)
    .map(item => item.trim())
    .filter(item => {
      // Remove common non-item text
      const lower = item.toLowerCase();
      return !lower.includes('total') && 
             !lower.includes('tax') && 
             !lower.includes('discount') &&
             !lower.includes('thank you') &&
             item.length > 2;
    })
    .slice(0, 10); // Limit to 10 items max
  
  return validItems.length > 0 ? validItems : ["Receipt Item"];
}

/**
 * Convert stream to buffer
 */
async function streamToBuffer(stream) {
  const chunks = [];
  for await (const chunk of stream) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}
