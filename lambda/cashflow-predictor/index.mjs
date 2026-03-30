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
const IST_TIME_ZONE = 'Asia/Kolkata';

function getModelType(modelId) {
  if (modelId.includes('anthropic') || modelId.includes('claude')) {
    return 'claude';
  }
  if (modelId.includes('nova')) {
    return 'nova';
  }
  return 'nova';
}

function formatRequest(prompt, modelId, maxTokens = 1000) {
  const modelType = getModelType(modelId);

  if (modelType === 'nova') {
    return {
      messages: [
        {
          role: 'user',
          content: [{ text: prompt }],
        },
      ],
      inferenceConfig: {
        max_new_tokens: maxTokens,
      },
    };
  }

  return {
    anthropic_version: 'bedrock-2023-05-31',
    max_tokens: maxTokens,
    messages: [
      {
        role: 'user',
        content: [{ type: 'text', text: prompt }],
      },
    ],
  };
}

function extractText(responseBody, modelId) {
  return getModelType(modelId) === 'nova'
    ? (responseBody.output?.message?.content?.[0]?.text || '')
    : (responseBody.content?.[0]?.text || '');
}

function mapErrorType(error) {
  if (error?.name === 'ThrottlingException') return 'rate_limit';
  if (error?.name === 'TimeoutError' || error?.code === 'ETIMEDOUT') return 'timeout';
  if (error?.name === 'ServiceUnavailableException') return 'service_error';
  if (error?.name === 'ValidationException') return 'validation';
  if (error?.name === 'UnauthorizedException' || error?.name === 'AccessDeniedException') return 'authentication';
  return 'unknown';
}

function shouldFallback(errorType) {
  return errorType !== 'validation';
}

function getEnvChain(primaryEnv, fallbackEnv, finalEnv, defaults) {
  return Array.from(
    new Set(
      [
        process.env[primaryEnv],
        fallbackEnv ? process.env[fallbackEnv] : undefined,
        finalEnv ? process.env[finalEnv] : undefined,
        ...defaults,
      ].filter(Boolean)
    )
  );
}

function getCashflowModelChain() {
  const NOVA_PRO = 'apac.amazon.nova-pro-v1:0';
  const NOVA_LITE = 'apac.amazon.nova-lite-v1:0';
  const NOVA_MICRO = 'apac.amazon.nova-micro-v1:0';

  return getEnvChain(
    'BEDROCK_MODEL_REPORT_PRIMARY',
    undefined,
    'BEDROCK_MODEL_REPORT_FINAL',
    [NOVA_LITE, NOVA_MICRO, NOVA_PRO]
  );
}

async function generateWithModelChain({
  client,
  modelIds,
  prompt,
  maxTokens = 1000,
  feature,
}) {
  let lastFailure = null;

  for (const [index, modelId] of modelIds.entries()) {
    console.log(`🤖 ${feature}: attempting model ${modelId} (${index + 1}/${modelIds.length})`);

    try {
      const command = new InvokeModelCommand({
        modelId,
        contentType: "application/json",
        accept: "application/json",
        body: JSON.stringify(formatRequest(prompt, modelId, maxTokens)),
      });

      const response = await client.send(command);
      const responseBody = JSON.parse(new TextDecoder().decode(response.body));

      return {
        success: true,
        content: extractText(responseBody, modelId),
        modelId,
      };
    } catch (error) {
      const errorType = mapErrorType(error);
      lastFailure = {
        success: false,
        error: error.message,
        errorType,
        modelId,
      };

      console.warn(`⚠️ ${feature}: model ${modelId} failed`, {
        error: error.message,
        errorType,
      });

      if (!shouldFallback(errorType)) {
        break;
      }
    }
  }

  return lastFailure || {
    success: false,
    error: 'AI model chain failed',
    errorType: 'unknown',
  };
}

const CASHFLOW_MODEL_CHAIN = getCashflowModelChain();

function getCurrentISTDateContext(now = new Date()) {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: IST_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const parts = formatter.formatToParts(now);
  const get = (type) => parts.find((part) => part.type === type)?.value || '';
  const today = `${get('year')}-${get('month')}-${get('day')}`;

  return {
    today,
    now: `${today} ${get('hour')}:${get('minute')}:${get('second')} IST`,
  };
}

function getFutureISTDates(days, now = new Date()) {
  const { today } = getCurrentISTDateContext(now);
  const start = new Date(`${today}T00:00:00.000Z`);
  const dates = [];

  for (let offset = 1; offset <= days; offset += 1) {
    const next = new Date(start);
    next.setUTCDate(start.getUTCDate() + offset);
    dates.push(next.toISOString().slice(0, 10));
  }

  return dates;
}

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
    const todayContext = getCurrentISTDateContext();
    const currentDate = new Date(`${todayContext.today}T00:00:00.000Z`);
    const thirtyDaysAgo = new Date(currentDate);
    thirtyDaysAgo.setUTCDate(currentDate.getUTCDate() - 30);
    const startDate = thirtyDaysAgo.toISOString().slice(0, 10);

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

    const futureDates = getFutureISTDates(7);

    const prompt = `You are a financial forecasting assistant for small businesses in India.
Current date/time: ${todayContext.now}
Time zone: ${IST_TIME_ZONE}
Today's date in IST: ${todayContext.today}
The next 7 calendar dates in IST are: ${futureDates.join(', ')}.
Analyze the following ${dataForPrediction.length} days of historical cash flow data and predict those exact next 7 calendar dates.

Historical data (JSON array):
${JSON.stringify(dataForPrediction, null, 2)}

For each of those exact next 7 IST calendar dates, provide:
- predictedBalance (number, estimated daily balance)
- trend ('up', 'down', or 'stable')
- confidence (0-1, where 1 is highest confidence)

Consider patterns like:
- Weekly cycles (weekends vs weekdays)
- Recent trends
- Average daily performance

Return ONLY a JSON array of exactly 7 predictions, in the same order as the 7 dates above. No other text.`;

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
    const predictionsWithAlerts = predictions.slice(0, futureDates.length).map((prediction, index) => ({
      ...prediction,
      date: futureDates[index],
      isNegative: prediction.predictedBalance < 0,
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
