import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand } from '@aws-sdk/lib-dynamodb';

const AWS_REGION = process.env.AWS_REGION || 'ap-south-1';
const bedrockClient = new BedrockRuntimeClient({ region: AWS_REGION });

// DynamoDB setup - uses Lambda execution role automatically
const dynamoClient = new DynamoDBClient({ region: AWS_REGION });

const docClient = DynamoDBDocumentClient.from(dynamoClient, {
  marshallOptions: {
    removeUndefinedValues: true,
    convertEmptyValues: false,
  },
});

const TABLE_NAME = process.env.DYNAMODB_TABLE_NAME || 'vyapar-ai';
const BEDROCK_MODEL_ID = process.env.BEDROCK_MODEL_ID || 'global.amazon.nova-2-lite-v1:0';

export const handler = async (event) => {
  console.log("MILESTONE: Starting expense anomaly detection");

  try {
    const { userId, expense } = JSON.parse(event.body);

    if (!userId || !expense) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: 'ValidationError',
          message: 'userId and expense are required',
          timestamp: new Date().toISOString(),
        }),
      };
    }

    console.log(`MILESTONE: Querying historical expenses for user ${userId}, category: ${expense.category}`);

    // Query historical expenses (last 90 days) from DynamoDB
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    const startDate = ninetyDaysAgo.toISOString().split('T')[0];

    const queryParams = {
      TableName: TABLE_NAME,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      FilterExpression: '#date >= :startDate AND #type = :expenseType',
      ExpressionAttributeNames: {
        '#date': 'date',
        '#type': 'type',
      },
      ExpressionAttributeValues: {
        ':pk': `USER#${userId}`,
        ':sk': 'ENTRY#',
        ':startDate': startDate,
        ':expenseType': 'expense',
      },
    };

    const result = await docClient.send(new QueryCommand(queryParams));
    const historicalExpenses = result.Items || [];

    console.log(`Retrieved ${historicalExpenses.length} historical expense entries`);

    // Prepare historical data
    const expenseHistory = historicalExpenses
      .map(entry => ({
        date: entry.date,
        amount: entry.amount || 0,
        category: entry.category || 'General',
      }))
      .sort((a, b) => b.date.localeCompare(a.date));

    console.log("MILESTONE: Calling Bedrock for anomaly detection");

    const prompt = `You are an expense anomaly detection assistant for small businesses.
Analyze if this expense is unusual compared to historical patterns.

Current expense:
- Amount: ${expense.amount}
- Category: ${expense.category}
- Date: ${expense.date}

Historical expenses (last 90 days, showing most recent 30):
${JSON.stringify(expenseHistory.slice(0, 30), null, 2)}

Determine if this is anomalous based on:
1. Amount significantly higher than average (more than 2x average)
2. Unusual timing (e.g., duplicate on same day)
3. Unusually high for this time period

If anomalous, return:
{
  "isAnomaly": true,
  "type": "high_amount" | "unusual_timing",
  "explanation": "Natural language explanation",
  "severity": "warning" | "critical"
}

If normal, return:
{
  "isAnomaly": false
}

Return ONLY valid JSON. No other text.`;

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
        max_new_tokens: 300,
      },
    };

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

    // Nova response format: output.message.content[0].text
    const extractedText = responseBody.output.message.content[0].text;

    // Parse anomaly result
    let anomalyResult;
    try {
      const jsonMatch = extractedText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        anomalyResult = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON found in response");
      }
    } catch (parseError) {
      console.error("Failed to parse Bedrock response:", extractedText);
      anomalyResult = { isAnomaly: false };
    }

    console.log("MILESTONE: Anomaly detection complete");

    if (anomalyResult.isAnomaly) {
      return {
        statusCode: 200,
        body: JSON.stringify({
          success: true,
          alert: {
            type: anomalyResult.type,
            explanation: anomalyResult.explanation,
            severity: anomalyResult.severity,
            expenseAmount: expense.amount,
            category: expense.category,
          },
        }),
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        alert: null,
      }),
    };
  } catch (error) {
    console.error("Error in expense anomaly detection:", error);

    return {
      statusCode: 500,
      body: JSON.stringify({
        error: error.name,
        message: error.message,
        timestamp: new Date().toISOString(),
      }),
    };
  }
};
