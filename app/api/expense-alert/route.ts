import { NextRequest, NextResponse } from 'next/server';
import { InvokeCommand } from '@aws-sdk/client-lambda';
import { lambdaClient, LAMBDA_FUNCTIONS, createErrorResponse, logError, logInfo } from '@/lib/aws-config';

export async function POST(request: NextRequest) {
  try {
    logInfo('expense-alert', 'Received expense alert request');

    const body = await request.json();
    const { userId, expense } = body;

    if (!userId || !expense) {
      return NextResponse.json(
        { success: false, error: 'userId and expense are required' },
        { status: 400 }
      );
    }

    logInfo('expense-alert', `Invoking Lambda for user ${userId}`);

    // Invoke Lambda function
    const command = new InvokeCommand({
      FunctionName: LAMBDA_FUNCTIONS.EXPENSE_ALERT,
      Payload: JSON.stringify({ body: JSON.stringify({ userId, expense }) }),
    });

    const response = await lambdaClient.send(command);
    const payload = JSON.parse(new TextDecoder().decode(response.Payload));
    const result = JSON.parse(payload.body);

    logInfo('expense-alert', 'Lambda invocation successful');

    return NextResponse.json(result);
  } catch (error: any) {
    logError('expense-alert', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Alert check failed' },
      { status: 500 }
    );
  }
}
