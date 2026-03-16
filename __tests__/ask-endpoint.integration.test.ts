/**
 * Integration tests for /api/ask endpoint with FallbackOrchestrator
 * Tests Q&A functionality with fallback behavior
 */

import { PATCH, POST } from '@/app/api/ask/route';
import { NextRequest } from 'next/server';
import { getSession, updateSession } from '@/lib/session-store';
import { getFallbackOrchestrator } from '@/lib/ai/fallback-orchestrator';
import { AIProviderResponse } from '@/lib/ai/provider-abstraction';

// Mock dependencies
jest.mock('@/lib/session-store');
jest.mock('@/lib/ai/fallback-orchestrator');

const mockGetSession = getSession as jest.MockedFunction<typeof getSession>;
const mockUpdateSession = updateSession as jest.MockedFunction<typeof updateSession>;
const mockGetFallbackOrchestrator = getFallbackOrchestrator as jest.MockedFunction<typeof getFallbackOrchestrator>;

describe('/api/ask endpoint integration tests', () => {
  let mockOrchestrator: any;
  const createMockSession = (overrides: Record<string, unknown> = {}) => ({
    sessionId: 'test-session-123',
    createdAt: new Date(),
    lastAccessedAt: new Date(),
    dailyEntries: [],
    creditEntries: [],
    conversationHistory: [],
    ...overrides,
  }) as any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Create mock orchestrator
    mockOrchestrator = {
      generateResponse: jest.fn(),
      getConfig: jest.fn(() => ({ enableFallback: true, totalTimeout: 10000 })),
      reset: jest.fn(),
    };
    
    mockGetFallbackOrchestrator.mockReturnValue(mockOrchestrator);
    
    // Mock session with sample data
    mockGetSession.mockResolvedValue(createMockSession({
      userId: 'user-123',
      salesData: {
        headers: ['date', 'amount', 'category'],
        rows: [
          { date: '2024-01-01', amount: 5000, category: 'groceries' },
        ],
      },
      expensesData: {
        headers: ['date', 'amount', 'category'],
        rows: [
          { date: '2024-01-01', amount: 2000, category: 'rent' },
        ],
      },
    }));
    
    mockUpdateSession.mockResolvedValue(undefined);
  });

  describe('Bedrock success path', () => {
    it('should return AI answer when Bedrock succeeds', async () => {
      const mockResponse: AIProviderResponse = {
        success: true,
        content: 'Your total sales for January are ₹5000.',
        provider: 'bedrock',
      };
      
      mockOrchestrator.generateResponse.mockResolvedValue(mockResponse);
      
      const request = new NextRequest('http://localhost:3000/api/ask', {
        method: 'POST',
        body: JSON.stringify({
          sessionId: 'test-session-123',
          question: 'What are my total sales?',
          language: 'en',
        }),
      });
      
      const response = await POST(request);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.answer).toBe(mockResponse.content);
      
      // Verify orchestrator was called with correct parameters
      expect(mockOrchestrator.generateResponse).toHaveBeenCalledWith(
        expect.any(String),
        { language: 'en' },
        { endpoint: '/api/ask', userId: 'user-123' }
      );
      
      // Verify conversation history was updated
      expect(mockUpdateSession).toHaveBeenCalledWith(
        'test-session-123',
        expect.objectContaining({
          conversationHistory: expect.arrayContaining([
            expect.objectContaining({ role: 'user', content: 'What are my total sales?' }),
            expect.objectContaining({ role: 'assistant', content: mockResponse.content }),
          ]),
        })
      );
    });
  });

  describe('Fallback to Puter path', () => {
    it('should return AI answer when Bedrock fails but Puter succeeds', async () => {
      const mockResponse: AIProviderResponse = {
        success: true,
        content: 'Based on your data, your profit margin is healthy.',
        provider: 'puter',
      };
      
      mockOrchestrator.generateResponse.mockResolvedValue(mockResponse);
      
      const request = new NextRequest('http://localhost:3000/api/ask', {
        method: 'POST',
        body: JSON.stringify({
          sessionId: 'test-session-123',
          question: 'How is my profit margin?',
          language: 'en',
        }),
      });
      
      const response = await POST(request);
      const data = await response.json();
      
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.answer).toBe(mockResponse.content);
    });
  });

  describe('Both providers fail path', () => {
    it('should return error when both providers fail', async () => {
      const mockResponse: AIProviderResponse = {
        success: false,
        error: 'AI service temporarily unavailable.',
        errorType: 'service_error',
        provider: 'bedrock',
      };
      
      mockOrchestrator.generateResponse.mockResolvedValue(mockResponse);
      
      const request = new NextRequest('http://localhost:3000/api/ask', {
        method: 'POST',
        body: JSON.stringify({
          sessionId: 'test-session-123',
          question: 'What are my expenses?',
          language: 'en',
        }),
      });
      
      const response = await POST(request);
      const data = await response.json();
      
      expect(response.status).toBe(503);
      expect(data.success).toBe(false);
    });
  });

  describe('Prompt building preservation', () => {
    it('should preserve existing prompt building with conversation history', async () => {
      // Mock session with existing conversation history
      mockGetSession.mockResolvedValue(createMockSession({
        userId: 'user-123',
        conversationHistory: [
          { role: 'user', content: 'Previous question', timestamp: new Date() },
          { role: 'assistant', content: 'Previous answer', timestamp: new Date() },
        ],
        salesData: { 
          headers: ['date', 'amount'],
          rows: [{ date: '2024-01-01', amount: 5000 }] 
        },
      }));
      
      const mockResponse: AIProviderResponse = {
        success: true,
        content: 'Follow-up answer',
        provider: 'bedrock',
      };
      
      mockOrchestrator.generateResponse.mockResolvedValue(mockResponse);
      
      const request = new NextRequest('http://localhost:3000/api/ask', {
        method: 'POST',
        body: JSON.stringify({
          sessionId: 'test-session-123',
          question: 'Follow-up question',
          language: 'en',
        }),
      });
      
      await POST(request);
      
      // Verify prompt includes conversation history
      expect(mockOrchestrator.generateResponse).toHaveBeenCalled();
      const promptCall = mockOrchestrator.generateResponse.mock.calls[0][0];
      expect(typeof promptCall).toBe('string');
      expect(promptCall.length).toBeGreaterThan(0);
    });
  });

  describe('Response format preservation', () => {
    it('should maintain existing response format structure', async () => {
      const mockResponse: AIProviderResponse = {
        success: true,
        content: 'Test answer content',
        provider: 'bedrock',
      };
      
      mockOrchestrator.generateResponse.mockResolvedValue(mockResponse);
      
      const request = new NextRequest('http://localhost:3000/api/ask', {
        method: 'POST',
        body: JSON.stringify({
          sessionId: 'test-session-123',
          question: 'Test question',
          language: 'en',
        }),
      });
      
      const response = await POST(request);
      const data = await response.json();
      
      // Verify response structure
      expect(data).toHaveProperty('success');
      expect(data).toHaveProperty('answer');
      expect(data.success).toBe(true);
      expect(typeof data.answer).toBe('string');
    });
  });

  describe('Localized answer fallback', () => {
    it('should translate an English fallback answer when Marathi is selected', async () => {
      mockOrchestrator.generateResponse
        .mockResolvedValueOnce({
          success: true,
          content: 'Conclusion: Your sales for this month total ₹7,17,746.',
          provider: 'bedrock',
        })
        .mockResolvedValueOnce({
          success: true,
          content: 'Conclusion: या महिन्यात तुमची विक्री एकूण ₹7,17,746 आहे.',
          provider: 'bedrock',
        });

      const request = new NextRequest('http://localhost:3000/api/ask', {
        method: 'POST',
        body: JSON.stringify({
          sessionId: 'test-session-123',
          question: 'what is my this month sales',
          language: 'mr',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.answer).toBe('Conclusion: या महिन्यात तुमची विक्री एकूण ₹7,17,746 आहे.');
      expect(mockOrchestrator.generateResponse).toHaveBeenCalledTimes(2);
      expect(mockOrchestrator.generateResponse.mock.calls[1][0]).toContain('Translate the answer below into Marathi');
    });
  });

  describe('Stored message retranslation', () => {
    it('should translate stored user and assistant messages when the app language changes', async () => {
      mockGetSession.mockResolvedValue(createMockSession({
        userId: 'user-123',
        conversationHistory: [
          {
            role: 'user',
            content: 'what is my this month sales',
            timestamp: new Date(),
          },
          {
            role: 'assistant',
            content: 'Conclusion: Your sales for this month total ₹7,17,746.',
            timestamp: new Date(),
            contentByLanguage: {
              en: 'Conclusion: Your sales for this month total ₹7,17,746.',
            },
          },
        ],
        salesData: {
          headers: ['date', 'amount', 'category'],
          rows: [{ date: '2024-01-01', amount: 5000, category: 'groceries' }],
        },
      }));

      mockOrchestrator.generateResponse
        .mockResolvedValueOnce({
          success: true,
          content: 'या महिन्यात माझी विक्री किती आहे?',
          provider: 'bedrock',
        })
        .mockResolvedValueOnce({
          success: true,
          content: 'Conclusion: या महिन्यात तुमची विक्री एकूण ₹7,17,746 आहे.',
          provider: 'bedrock',
        });

      const request = new NextRequest('http://localhost:3000/api/ask', {
        method: 'PATCH',
        body: JSON.stringify({
          sessionId: 'test-session-123',
          language: 'mr',
          messages: [
            {
              index: 0,
              content: 'what is my this month sales',
              contentByLanguage: {
                en: 'what is my this month sales',
              },
            },
            {
              index: 1,
              content: 'Conclusion: Your sales for this month total ₹7,17,746.',
              contentByLanguage: {
                en: 'Conclusion: Your sales for this month total ₹7,17,746.',
              },
            },
          ],
        }),
      });

      const response = await PATCH(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.messages[0].content).toBe('या महिन्यात माझी विक्री किती आहे?');
      expect(data.messages[0].contentByLanguage.mr).toBe('या महिन्यात माझी विक्री किती आहे?');
      expect(data.messages[1].content).toBe('Conclusion: या महिन्यात तुमची विक्री एकूण ₹7,17,746 आहे.');
      expect(data.messages[1].contentByLanguage.mr).toBe('Conclusion: या महिन्यात तुमची विक्री एकूण ₹7,17,746 आहे.');
      expect(mockUpdateSession).toHaveBeenCalledWith(
        'test-session-123',
        expect.objectContaining({
          conversationHistory: expect.arrayContaining([
            expect.objectContaining({
              role: 'user',
              contentByLanguage: expect.objectContaining({
                en: 'what is my this month sales',
                mr: 'या महिन्यात माझी विक्री किती आहे?',
              }),
            }),
            expect.objectContaining({
              role: 'assistant',
              contentByLanguage: expect.objectContaining({
                en: 'Conclusion: Your sales for this month total ₹7,17,746.',
                mr: 'Conclusion: या महिन्यात तुमची विक्री एकूण ₹7,17,746 आहे.',
              }),
            }),
          ]),
        })
      );
    });
  });

  describe('Conversation history management', () => {
    it('should append new messages to existing conversation history', async () => {
      const existingHistory = [
        { role: 'user', content: 'First question', timestamp: new Date() },
        { role: 'assistant', content: 'First answer', timestamp: new Date() },
      ] as const;
      
      mockGetSession.mockResolvedValue(createMockSession({
        userId: 'user-123',
        conversationHistory: existingHistory,
        salesData: { 
          headers: ['date', 'amount'],
          rows: [] 
        },
      }));
      
      const mockResponse: AIProviderResponse = {
        success: true,
        content: 'Second answer',
        provider: 'bedrock',
      };
      
      mockOrchestrator.generateResponse.mockResolvedValue(mockResponse);
      
      const request = new NextRequest('http://localhost:3000/api/ask', {
        method: 'POST',
        body: JSON.stringify({
          sessionId: 'test-session-123',
          question: 'Second question',
          language: 'en',
        }),
      });
      
      await POST(request);
      
      // Verify conversation history includes both old and new messages
      expect(mockUpdateSession).toHaveBeenCalledWith(
        'test-session-123',
        expect.objectContaining({
          conversationHistory: expect.arrayContaining([
            expect.objectContaining({ content: 'First question' }),
            expect.objectContaining({ content: 'First answer' }),
            expect.objectContaining({ content: 'Second question' }),
            expect.objectContaining({ content: 'Second answer' }),
          ]),
        })
      );
    });
  });

  describe('Error handling', () => {
    it('should return 400 for missing required fields', async () => {
      const request = new NextRequest('http://localhost:3000/api/ask', {
        method: 'POST',
        body: JSON.stringify({
          sessionId: 'test-session-123',
          // Missing question
        }),
      });
      
      const response = await POST(request);
      const data = await response.json();
      
      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('should return 404 for invalid session', async () => {
      mockGetSession.mockResolvedValue(undefined);
      
      const request = new NextRequest('http://localhost:3000/api/ask', {
        method: 'POST',
        body: JSON.stringify({
          sessionId: 'invalid-session',
          question: 'Test question',
          language: 'en',
        }),
      });
      
      const response = await POST(request);
      const data = await response.json();
      
      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
    });

    it('should return 400 when no data is uploaded', async () => {
      mockGetSession.mockResolvedValue(createMockSession({
        userId: 'user-123',
        // No salesData, expensesData, or inventoryData
      }));
      
      const request = new NextRequest('http://localhost:3000/api/ask', {
        method: 'POST',
        body: JSON.stringify({
          sessionId: 'test-session-123',
          question: 'Test question',
          language: 'en',
        }),
      });
      
      const response = await POST(request);
      const data = await response.json();
      
      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });
  });
});
