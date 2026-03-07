import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand, QueryCommand, PutCommand } from '@aws-sdk/lib-dynamodb';

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
  console.log("MILESTONE: Starting automated report generation");

  const results = [];

  try {
    // Query all users with automation enabled from DynamoDB
    const scanParams = {
      TableName: TABLE_NAME,
      FilterExpression: 'begins_with(SK, :sk) AND automationEnabled = :enabled',
      ExpressionAttributeValues: {
        ':sk': 'PREFERENCES',
        ':enabled': true,
      },
    };

    const scanResult = await docClient.send(new ScanCommand(scanParams));
    const users = scanResult.Items || [];

    console.log(`Found ${users.length} users with automation enabled`);

    if (users.length === 0) {
      return {
        statusCode: 200,
        body: JSON.stringify({
          processed: 0,
          message: 'No users with automation enabled',
        }),
      };
    }

    // Process each user
    for (const user of users) {
      try {
        const userId = user.userId;
        console.log(`MILESTONE: Processing user ${userId}`);

        // Get today's date
        const today = new Date().toISOString().split('T')[0];

        // Query today's daily entries from DynamoDB
        const queryParams = {
          TableName: TABLE_NAME,
          KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
          FilterExpression: '#date = :today',
          ExpressionAttributeNames: {
            '#date': 'date',
          },
          ExpressionAttributeValues: {
            ':pk': `USER#${userId}`,
            ':sk': 'ENTRY#',
            ':today': today,
          },
        };

        const queryResult = await docClient.send(new QueryCommand(queryParams));
        const todayEntries = queryResult.Items || [];

        if (todayEntries.length === 0) {
          console.log(`No data for user ${userId} today, skipping`);
          results.push({ userId, success: true, skipped: true });
          continue;
        }

        // Calculate totals from entries
        let totalSales = 0;
        let totalExpenses = 0;
        const expensesByCategory = {};

        todayEntries.forEach(entry => {
          if (entry.type === 'sale') {
            totalSales += entry.amount || 0;
          } else if (entry.type === 'expense') {
            totalExpenses += entry.amount || 0;
            const category = entry.category || 'General';
            expensesByCategory[category] = (expensesByCategory[category] || 0) + entry.amount;
          }
        });

        const netProfit = totalSales - totalExpenses;

        console.log(`MILESTONE: Generating insights for user ${userId}`);

        // Generate insights with Bedrock
        const prompt = `You are a business insights assistant generating daily reports for small business owners.
Analyze today's business data and provide actionable insights.

Today's data:
- Total sales: ${totalSales}
- Total expenses: ${totalExpenses}
- Net profit/loss: ${netProfit}
- Expense breakdown: ${JSON.stringify(expensesByCategory)}

Generate a concise daily report including:
1. Summary of financial performance
2. Key observations
3. One actionable recommendation

Return JSON:
{
  "totalSales": ${totalSales},
  "totalExpenses": ${totalExpenses},
  "netProfit": ${netProfit},
  "topExpenseCategories": [{ "category": "string", "amount": number }],
  "insights": "Natural language summary"
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
            max_new_tokens: 500,
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

        // Parse report
        let reportData;
        try {
          const jsonMatch = extractedText.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            reportData = JSON.parse(jsonMatch[0]);
          } else {
            throw new Error("No JSON found in response");
          }
        } catch (parseError) {
          console.error("Failed to parse Bedrock response:", extractedText);
          reportData = {
            totalSales,
            totalExpenses,
            netProfit,
            topExpenseCategories: Object.entries(expensesByCategory).map(([category, amount]) => ({
              category,
              amount,
            })),
            insights: "Report generation failed",
          };
        }

        console.log(`MILESTONE: Storing report for user ${userId}`);

        // Store report in DynamoDB with TTL (30 days)
        const reportId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const ttl = Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60;

        const putParams = {
          TableName: TABLE_NAME,
          Item: {
            PK: `USER#${userId}`,
            SK: `REPORT#daily#${today}`,
            entityType: 'REPORT',
            userId,
            reportId,
            reportType: 'daily',
            date: today,
            reportData: {
              totalSales: reportData.totalSales,
              totalExpenses: reportData.totalExpenses,
              netProfit: reportData.netProfit,
              topExpenseCategories: reportData.topExpenseCategories,
              insights: reportData.insights,
            },
            createdAt: new Date().toISOString(),
            ttl,
          },
        };

        await docClient.send(new PutCommand(putParams));

        results.push({ userId, success: true });
      } catch (userError) {
        console.error(`Failed for user ${user.userId}:`, userError);
        results.push({ userId: user.userId, success: false, error: userError.message });
      }
    }

    console.log("MILESTONE: Report generation complete");

    return {
      statusCode: 200,
      body: JSON.stringify({
        processed: results.length,
        results,
      }),
    };
  } catch (error) {
    console.error("Error in report generation:", error);

    return {
      statusCode: 500,
      body: JSON.stringify({
        error: error.name,
        message: error.message,
        timestamp: new Date().toISOString(),
        results,
      }),
    };
  }
};
