import { NextRequest } from 'next/server';

jest.mock('@/lib/dynamodb-client', () => ({
  DynamoDBService: {
    queryByPK: jest.fn(),
    getItem: jest.fn(),
    updateItem: jest.fn(),
  },
}));

jest.mock('@aws-sdk/client-bedrock-runtime', () => {
  return {
    BedrockRuntimeClient: jest.fn().mockImplementation(() => ({
      send: jest.fn().mockResolvedValue({
        body: new TextEncoder().encode(JSON.stringify({
          output: {
            message: {
              content: [{
                text: JSON.stringify({
                  summary: 'हा मराठी सारांश आहे.',
                  wins: ['मराठीत सकारात्मक मुद्दा'],
                  risks: ['मराठीत लक्ष द्यायचा मुद्दा'],
                  nextSteps: ['मराठीत पुढील पाऊल'],
                  insights: 'हा मराठी एआय सारांश आहे.',
                }),
              }],
            },
          },
        })),
      }),
    })),
    InvokeModelCommand: jest.fn(),
  };
});

jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

import { GET as getReports } from '@/app/api/reports/route';
import { DynamoDBService } from '@/lib/dynamodb-client';

describe('Reports route localization', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns localized report content and caches it when requested language variant is missing', async () => {
    (DynamoDBService.queryByPK as jest.Mock).mockResolvedValue([
      {
        PK: 'USER#u1',
        SK: 'REPORT#daily#2026-03-16',
        reportId: 'report-1',
        userId: 'u1',
        reportType: 'daily',
        date: '2026-03-16',
        createdAt: '2026-03-16T10:00:00.000Z',
        reportData: {
          generatedLanguage: 'en',
          periodStart: '2026-03-16',
          periodEnd: '2026-03-16',
          totalSales: 10000,
          totalExpenses: 7000,
          netProfit: 3000,
          summary: 'English summary.',
          wins: ['Positive point'],
          risks: ['Risk point'],
          nextSteps: ['Next step'],
          insights: 'English AI summary.',
        },
      },
    ]);
    (DynamoDBService.getItem as jest.Mock).mockResolvedValue({
      automationEnabled: true,
      reportTime: '20:00',
    });
    (DynamoDBService.updateItem as jest.Mock).mockResolvedValue(undefined);

    const request = new NextRequest('http://localhost:3000/api/reports?userId=u1&language=mr');
    const response = await getReports(request);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(payload.data[0]).toEqual(
      expect.objectContaining({
        summary: 'हा मराठी सारांश आहे.',
        wins: ['मराठीत सकारात्मक मुद्दा'],
        risks: ['मराठीत लक्ष द्यायचा मुद्दा'],
        nextSteps: ['मराठीत पुढील पाऊल'],
        insights: 'हा मराठी एआय सारांश आहे.',
      })
    );

    expect(DynamoDBService.updateItem).toHaveBeenCalledWith(
      'USER#u1',
      'REPORT#daily#2026-03-16',
      expect.objectContaining({
        reportData: expect.objectContaining({
          localizedContent: expect.objectContaining({
            mr: expect.objectContaining({
              summary: 'हा मराठी सारांश आहे.',
            }),
          }),
        }),
      })
    );
  });
});
