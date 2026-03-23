import { BedrockRuntimeClient } from "@aws-sdk/client-bedrock-runtime";
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { generateWithModelChain, getLambdaModelChain } from '../shared/bedrock-chain.mjs';

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
const CASHFLOW_MODEL_CHAIN = getLambdaModelChain('cashflow');

export const handler = async (event) => {
  console.log("MILESTONE: Starting cash flow prediction");

  try {
    const { userId } = JSON.parse(event.body);

    if (!userId) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: 'ValidationError',
          message: 'userId is required',
          timestamp: new Date().toISOString(),
        }),
      };
    }

    console.log(`MILESTONE: Querying historical data for user ${userId}`);

    // Query last 30 days of daily entries from DynamoDB
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const startDate = thirtyDaysAgo.toISOString().split('T')[0];

    const queryParams = {
      TableName: TABLE_NAME,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      FilterExpression: '#date >= :startDate',
      ExpressionAttributeNames: {
        '#date': 'date',
      },
      ExpressionAttributeValues: {
        ':pk': `USER#${userId}`,
        ':sk': 'ENTRY#',
        ':startDate': startDate,
      },
    };

    const result = await docClient.send(new QueryCommand(queryParams));
    const historicalData = result.Items || [];

    console.log(`Retrieved ${historicalData.length} days of historical data`);

    // Check if sufficient data
    if (historicalData.length < 7) {
      return {
        statusCode: 200,
        body: JSON.stringify({
          success: true,
          insufficientData: true,
          historicalDays: historicalData.length,
          message: 'Need at least 7 days of data for prediction',
        }),
      };
    }

    console.log("MILESTONE: Calling Bedrock for prediction");

    // Prepare data for Bedrock - entries already have totalSales and totalExpense
    const dataForPrediction = historicalData
      .map(entry => ({
        date: entry.date,
        sales: entry.totalSales || 0,
        expenses: entry.totalExpense || 0,
        balance: (entry.totalSales || 0) - (entry.totalExpense || 0),
        cashInHand: entry.cashInHand || null,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const prompt = `You are a financial forecasting assistant for small businesses.
Analyze the following ${dataForPrediction.length} days of historical cash flow data and predict the next 7 days.

Historical data (JSON array):
${JSON.stringify(dataForPrediction, null, 2)}

For each of the next 7 days, provide:
- date (YYYY-MM-DD format, starting from tomorrow)
- predictedBalance (number, estimated daily balance)
- trend ('up', 'down', or 'stable')
- confidence (0-1, where 1 is highest confidence)

Consider patterns like:
- Weekly cycles (weekends vs weekdays)
- Recent trends
- Average daily performance

Return ONLY a JSON array of exactly 7 predictions. No other text.`;

    console.log(`🌍 Bedrock Region: ${AWS_REGION}`);
    console.log(`🤖 Bedrock Model Chain: ${CASHFLOW_MODEL_CHAIN.join(' -> ')}`);
    
    const aiResponse = await generateWithModelChain({
      client: bedrockClient,
      modelIds: CASHFLOW_MODEL_CHAIN,
      prompt,
      maxTokens: 1000,
      feature: 'cashflow-predictor',
    });

    if (!aiResponse.success || !aiResponse.content) {
      throw new Error(aiResponse.error || 'Cashflow prediction failed');
    }

    const extractedText = aiResponse.content;

    // Parse predictions
    let predictions;
    try {
      const jsonMatch = extractedText.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        predictions = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON array found in response");
      }
    } catch (parseError) {
      console.error("Failed to parse Bedrock response:", extractedText);
      throw new Error("Failed to parse prediction data");
    }

    // Flag negative predictions
    const predictionsWithAlerts = predictions.map(p => ({
      ...p,
      isNegative: p.predictedBalance < 0,
    }));

    console.log("MILESTONE: Prediction complete");

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        predictions: predictionsWithAlerts,
        historicalDays: dataForPrediction.length,
      }),
    };
  } catch (error) {
    console.error("Error in cash flow prediction:", error);

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
