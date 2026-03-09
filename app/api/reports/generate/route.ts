// Manual Report Generation API
// Allows users to generate reports on-demand

import { NextRequest, NextResponse } from 'next/server';
import { DynamoDBService } from '@/lib/dynamodb-client';
import { logger } from '@/lib/logger';
import { createErrorResponse, logAndReturnError, ErrorCode } from '@/lib/error-utils';
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { DailyEntry } from '@/lib/types';

const AWS_REGION = process.env.AWS_REGION || 'ap-south-1';
const bedrockClient = new BedrockRuntimeClient({ region: AWS_REGION });
const BEDROCK_MODEL_ID = process.env.BEDROCK_MODEL_ID || 'global.amazon.nova-2-lite-v1:0';

export async function POST(request: NextRequest) {
  try {
    logger.info('Manual report generation request received', { path: '/api/reports/generate' });
    
    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      logger.warn('Report generation missing userId', { path: '/api/reports/generate' });
      return NextResponse.json(
        createErrorResponse(ErrorCode.AUTH_REQUIRED, 'errors.authRequired'),
        { status: 400 }
      );
    }

    try {
      logger.info('Generating report for user', { userId });

      // Get today's date
      const today = new Date().toISOString().split('T')[0];

      let filteredEntries: DailyEntry[] = [];

      // For demo users, use the most recent entry from the last 7 days instead of today
      if (userId.startsWith('demo_user_') || userId.startsWith('demo-user-')) {
        logger.debug('Demo user detected, using recent entries', { userId });
        
        // Query all entries from DynamoDB
        const allEntries = await DynamoDBService.queryByPK(
          `USER#${userId}`,
          'ENTRY#'
        );

        if (allEntries.length === 0) {
          // No entries in DynamoDB, return success with message
          logger.info('No DynamoDB entries for demo user (using localStorage)', { userId });
          return NextResponse.json({
            success: true,
            message: 'Demo data is in localStorage. Reports feature requires DynamoDB sync.',
            data: null,
          });
        }

        // Get entries from last 7 days
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0];

        filteredEntries = allEntries.filter(entry => 
          entry.date >= sevenDaysAgoStr && entry.date <= today
        ) as DailyEntry[];
      } else {
        // Regular users: query today's entries from DynamoDB
        const todayEntries = await DynamoDBService.queryByPK(
          `USER#${userId}`,
          'ENTRY#'
        );

        // Filter for today's entries with proper typing
        filteredEntries = todayEntries.filter(entry => entry.date === today) as DailyEntry[];
      }

      if (filteredEntries.length === 0) {
        logger.warn('No data for user', { userId, date: today });
        return NextResponse.json(
          createErrorResponse(ErrorCode.INVALID_INPUT, 'No daily entries found'),
          { status: 400 }
        );
      }

      // Calculate totals from DailyEntry fields (not transaction fields)
      let totalSales = 0;
      let totalExpenses = 0;

      filteredEntries.forEach(entry => {
        totalSales += entry.totalSales || 0;
        totalExpenses += entry.totalExpense || 0;
      });

      const netProfit = totalSales - totalExpenses;

      logger.info('Generating insights with Bedrock', { userId });

      // Generate insights with Bedrock
      const prompt = `You are a business insights assistant generating daily reports for small business owners.
Analyze today's business data and provide actionable insights.

Today's data:
- Total sales: ${totalSales}
- Total expenses: ${totalExpenses}
- Net profit/loss: ${netProfit}

Note: Category-level expense breakdown is not available (daily summary only).

Generate a concise daily report including:
1. Summary of financial performance
2. Key observations
3. One actionable recommendation

Return JSON:
{
  "totalSales": ${totalSales},
  "totalExpenses": ${totalExpenses},
  "netProfit": ${netProfit},
  "topExpenseCategories": [],
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
      let insights = "Report generated successfully";
      try {
        const jsonMatch = extractedText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const bedrockData = JSON.parse(jsonMatch[0]);
          // Only use insights from Bedrock - financial metrics are deterministic
          insights = bedrockData.insights || insights;
        } else {
          throw new Error("No JSON found in response");
        }
      } catch (parseError) {
        logger.error("Failed to parse Bedrock response", { extractedText });
        insights = "Report generation failed";
      }

      // Use deterministic calculations (not AI-generated values)
      const reportData = {
        totalSales,
        totalExpenses,
        netProfit,
        topExpenseCategories: [],
        insights,
      };

      logger.info('Storing report in DynamoDB', { userId });

      // Store report in DynamoDB with TTL (30 days)
      const reportId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const ttl = Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60;

      await DynamoDBService.putItem({
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
      });

      logger.info('Report generated successfully', { userId, reportId });
      return NextResponse.json({
        success: true,
        data: {
          reportId,
          date: today,
          reportData,
        },
      });
    } catch (error) {
      return NextResponse.json(
        logAndReturnError(
          error as Error,
          ErrorCode.SERVER_ERROR,
          'errors.serverError',
          'en',
          { path: '/api/reports/generate', operation: 'generateReport', userId }
        ),
        { status: 500 }
      );
    }
  } catch (error) {
    return NextResponse.json(
      logAndReturnError(
        error as Error,
        ErrorCode.SERVER_ERROR,
        'errors.serverError',
        'en',
        { path: '/api/reports/generate', method: 'POST' }
      ),
      { status: 500 }
    );
  }
}
