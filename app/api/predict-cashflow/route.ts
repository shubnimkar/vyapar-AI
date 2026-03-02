import { NextRequest, NextResponse } from 'next/server';
import { InvokeCommand } from '@aws-sdk/client-lambda';
import { lambdaClient, LAMBDA_FUNCTIONS, createErrorResponse, logError, logInfo } from '@/lib/aws-config';

export async function POST(request: NextRequest) {
  try {
    logInfo('predict-cashflow', 'Received prediction request');

    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'userId is required' },
        { status: 400 }
      );
    }

    logInfo('predict-cashflow', `Invoking Lambda for user ${userId}`);

    // Invoke Lambda function
    const command = new InvokeCommand({
      FunctionName: LAMBDA_FUNCTIONS.CASHFLOW_PREDICTOR,
      Payload: JSON.stringify({ body: JSON.stringify({ userId }) }),
    });

    const response = await lambdaClient.send(command);
    const payload = JSON.parse(new TextDecoder().decode(response.Payload));
    const result = JSON.parse(payload.body);

    logInfo('predict-cashflow', 'Lambda invocation successful');

    return NextResponse.json(result);
  } catch (error: any) {
    logError('predict-cashflow', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Prediction failed' },
      { status: 500 }
    );
  }
}
